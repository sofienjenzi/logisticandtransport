import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme() {
  const attr = document.documentElement.dataset.theme;
  return attr === 'dark' || attr === 'light' ? attr : systemTheme();
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event('themechange'));
}

/** Re-renders the calling component whenever the theme changes (manual toggle or OS preference). */
export function useTheme() {
  const [theme, setThemeState] = useState(resolveTheme);

  useEffect(() => {
    const update = () => setThemeState(resolveTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener('themechange', update);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('themechange', update);
      mq.removeEventListener('change', update);
    };
  }, []);

  return theme;
}
