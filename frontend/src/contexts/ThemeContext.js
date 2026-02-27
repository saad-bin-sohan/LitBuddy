// frontend/src/contexts/ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const getInitialTheme = () => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const applyTheme = (newTheme) => {
      const root = document.documentElement;
      // Canonical theme attribute
      root.setAttribute('data-theme', newTheme);
      // Backward-compatible alias (temporary)
      root.setAttribute('data-color-scheme', newTheme);
      // Let user agent controls follow app theme
      root.style.colorScheme = newTheme;
      // Transitional compatibility class hooks
      root.classList.remove('theme-light', 'theme-dark');
      root.classList.add(newTheme === 'dark' ? 'theme-dark' : 'theme-light');

      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', newTheme === 'dark' ? '#181818' : '#21808D');
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('theme', newTheme);
      } catch (e) {
        console.warn('Failed to save theme to localStorage:', e);
      }
    };

    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      let savedTheme = null;
      try {
        savedTheme = localStorage.getItem('theme');
      } catch {
        savedTheme = null;
      }
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');

  const value = {
    theme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
