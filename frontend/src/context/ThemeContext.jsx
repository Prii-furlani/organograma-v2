import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('jhe_theme_preference') || localStorage.getItem('jhe_org_theme') || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (themePreference === 'dark') {
        isDark = true;
      } else if (themePreference === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      const activeMode = isDark ? 'dark' : 'light';
      setResolvedTheme(activeMode);
      root.setAttribute('data-theme', activeMode);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('jhe_theme_preference', themePreference);
    localStorage.setItem('jhe_org_theme', themePreference === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themePreference);

    if (themePreference === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themePreference]);

  const toggleTheme = () => {
    setThemePreference((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const isDarkMode = resolvedTheme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themePreference,
        setThemePreference,
        isDarkMode,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback caso usado fora do Provider
    const [themePreference, setThemePreference] = useState(() => {
      return localStorage.getItem('jhe_theme_preference') || 'system';
    });

    useEffect(() => {
      const root = document.documentElement;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const applyTheme = () => {
        let isDark = false;
        if (themePreference === 'dark') {
          isDark = true;
        } else if (themePreference === 'light') {
          isDark = false;
        } else {
          isDark = mediaQuery.matches;
        }

        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      applyTheme();
      localStorage.setItem('jhe_theme_preference', themePreference);

      if (themePreference === 'system') {
        mediaQuery.addEventListener('change', applyTheme);
        return () => mediaQuery.removeEventListener('change', applyTheme);
      }
    }, [themePreference]);

    return { themePreference, setThemePreference, theme: 'light', isDarkMode: false, toggleTheme: () => {} };
  }
  return context;
}

export function useDarkMode() {
  return useTheme();
}
