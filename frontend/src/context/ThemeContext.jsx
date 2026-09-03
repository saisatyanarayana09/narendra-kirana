import { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext(null);

const FONT_SIZE_MAP = {
  normal: '16px',
  large: '18px',
  extra_large: '20px',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('sk_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [fontSize, setFontSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem('sk_font_size');
      return ['normal', 'large', 'extra_large'].includes(saved) ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });

  // Apply theme class to document.documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply font size style to document.documentElement
  useEffect(() => {
    const sizeInPx = FONT_SIZE_MAP[fontSize] || '16px';
    document.documentElement.style.fontSize = sizeInPx;
  }, [fontSize]);

  const toggleTheme = (mode) => {
    const nextTheme = mode ? mode : (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    try {
      localStorage.setItem('sk_theme', nextTheme);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setFontSize = (size) => {
    if (FONT_SIZE_MAP[size]) {
      setFontSizeState(size);
      try {
        localStorage.setItem('sk_font_size', size);
      } catch (e) {
        console.error('Failed to save font size in localStorage', e);
      }
      document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
