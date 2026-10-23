import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive the httpOnly refresh cookie
  timeout: 30000,
});

const RETRY_DELAYS_MS = [1000, 2500, 5000];
const isTransient = (error) =>
  !error.response || [502, 503, 504].includes(error.response.status);
const canRetry = (config) =>
  config && (config.method === 'get' || config.url?.endsWith('/auth/refresh'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // A sleeping or restarting server returns 502/503/504 or drops the connection. Retry safe requests quietly.
    if (original && isTransient(error) && canRetry(original)) {
      original._attempt = (original._attempt || 0) + 1;
      if (original._attempt <= RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[original._attempt - 1]);
        return client(original);
      }
    }

    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = client.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch (refreshError) {
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
