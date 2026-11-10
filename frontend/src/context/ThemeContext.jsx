import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('jhe_theme_preference') || localStorage.getItem('jhe_org_theme') || 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const saved = localStorage.getItem('jhe_theme_preference') || localStorage.getItem('jhe_org_theme');
    if (saved === 'light') return 'light';
    if (saved === 'system') {
      return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = true;
      if (themePreference === 'light') {
        isDark = false;
      } else if (themePreference === 'dark') {
        isDark = true;
      } else if (themePreference === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = true;
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
      return localStorage.getItem('jhe_theme_preference') || 'dark';
    });

    useEffect(() => {
      const root = document.documentElement;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const applyTheme = () => {
        let isDark = true;
        if (themePreference === 'light') {
          isDark = false;
        } else if (themePreference === 'dark') {
          isDark = true;
        } else if (themePreference === 'system') {
          isDark = mediaQuery.matches;
        } else {
          isDark = true;
        }

        if (isDark) {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      };

      applyTheme();
      localStorage.setItem('jhe_theme_preference', themePreference);

      if (themePreference === 'system') {
        mediaQuery.addEventListener('change', applyTheme);
        return () => mediaQuery.removeEventListener('change', applyTheme);
      }
    }, [themePreference]);

    return { themePreference, setThemePreference, theme: 'dark', isDarkMode: true, toggleTheme: () => {} };
  }
  return context;
}

export function useDarkMode() {
  return useTheme();
}
