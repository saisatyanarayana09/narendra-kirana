import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  bg: string;
  headerBg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  indigo: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const LIGHT_COLORS: ThemeColors = {
  bg: '#f8fafc',       // slate-50
  headerBg: '#ffffff', // white
  card: '#ffffff',     // white
  cardAlt: '#f1f5f9',  // slate-100
  text: '#0f172a',     // slate-900
  textMuted: '#64748b',// slate-500
  border: '#e2e8f0',   // slate-200
  primary: '#10b981',  // emerald-500
  indigo: '#4f46e5',   // indigo-600
};

const DARK_COLORS: ThemeColors = {
  bg: '#090d16',       // web app dark main bg
  headerBg: '#0d1322', // web app dark header bg
  card: '#0f172a',     // slate-900
  cardAlt: '#1e293b',  // slate-800
  text: '#f8fafc',     // slate-50
  textMuted: '#94a3b8',// slate-400
  border: '#1e293b',   // slate-800
  primary: '#10b981',  // emerald-500
  indigo: '#6366f1',   // indigo-500
};

const THEME_KEY = 'smart-kirana-owner-theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  colors: LIGHT_COLORS,
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    safeStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      safeStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
