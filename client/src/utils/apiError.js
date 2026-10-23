/** Turns any failed API call into a short, human message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (error?.response?.status >= 500) return 'Medora had a problem on our side. Please try again shortly.';
  if (error?.request && !error.response) return "Can't reach Medora right now. Check your connection and try again.";
  return fallback;
}
