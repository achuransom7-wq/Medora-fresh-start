import { useCallback, useEffect, useState } from 'react';

const KEY = 'medora-theme';

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(mode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0e1f' : '#3d4fe0');
}

/** Light, dark or follow-the-device. Persisted per browser. */
export default function useTheme() {
  const [mode, setModeState] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private browsing can block storage. The theme still applies for this visit.
    }
    apply(next);
  }, []);

  useEffect(() => {
    if (mode !== 'system') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);

  return { mode, setMode };
}
