'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (mode) => {
    const isDark = mode === 'dark';
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
        document.documentElement.style.colorScheme = 'dark';
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        document.body.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.style.colorScheme = 'light';
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        document.body.style.colorScheme = 'light';
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('feenix_theme');
    const userChose = localStorage.getItem('feenix_theme_user_set');
    // If user explicitly chose a theme, respect it; otherwise default to light
    const active = userChose ? (saved || 'light') : 'light';
    setTheme(active);
    applyTheme(active);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('feenix_theme', next);
    localStorage.setItem('feenix_theme_user_set', '1');
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
