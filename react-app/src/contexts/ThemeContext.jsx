import { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

const STORAGE_KEY = 'theme';
const MODES = ['system', 'light', 'dark'];

function getStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

const getSystemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredMode);
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const handleChange = (event) => setSystemDark(event.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  const theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable in private mode; the current session still works.
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#080d19' : '#f5f7fb');
    }
  }, [mode, theme]);

  const toggleTheme = () => {
    setMode(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
