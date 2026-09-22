import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getItem, saveItem } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  cardBg: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  success: string;
  error: string;
  inputBg: string;
  divider: string;
  mutedSurface: string;
}

const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  error: '#EF4444',
  inputBg: '#F1F5F9',
  divider: '#F1F5F9',
  mutedSurface: '#F8FAFC',
};

const darkColors: ThemeColors = {
  background: '#090D16',
  surface: '#131B2E',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#24334C',
  cardBg: '#131B2E',
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#064E3B',
  success: '#10B981',
  error: '#F87171',
  inputBg: '#162032',
  divider: '#1E293B',
  mutedSurface: '#0E1626',
};

interface ThemeContextType {
  theme: ThemeMode;
  themeMode: ThemeMode;
  toggleTheme: (mode: ThemeMode) => void;
  toggleThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const STORAGE_THEME_KEY = 'sk_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    async function loadPreferences() {
      try {
        const savedMode = await getItem(STORAGE_THEME_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode);
        }
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      }
    }
    loadPreferences();
  }, []);

  const toggleThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveItem(STORAGE_THEME_KEY, mode);
  }, []);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const contextValue = useMemo(() => ({
    theme: themeMode,
    themeMode,
    toggleTheme: toggleThemeMode,
    toggleThemeMode,
    colors,
    isDark,
  }), [themeMode, toggleThemeMode, colors, isDark]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
