import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getItem, saveItem } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'normal' | 'large' | 'extra_large';

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
};

const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  cardBg: '#1E293B',
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  error: '#EF4444',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  fontSize: FontSize;
  toggleThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  colors: ThemeColors;
  fontSizeMultiplier: number;
  isDark: boolean;
}

const STORAGE_THEME_KEY = 'sk_theme_mode';
const STORAGE_FONT_SIZE_KEY = 'sk_font_size';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');

  useEffect(() => {
    async function loadPreferences() {
      try {
        const savedMode = await getItem(STORAGE_THEME_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode);
        }

        const savedFontSize = await getItem(STORAGE_FONT_SIZE_KEY);
        if (savedFontSize === 'normal' || savedFontSize === 'large' || savedFontSize === 'extra_large') {
          setFontSizeState(savedFontSize);
        }
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      }
    }
    loadPreferences();
  }, []);

  const toggleThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveItem(STORAGE_THEME_KEY, mode);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    saveItem(STORAGE_FONT_SIZE_KEY, size);
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  let fontSizeMultiplier = 1.0;
  if (fontSize === 'large') {
    fontSizeMultiplier = 1.12;
  } else if (fontSize === 'extra_large') {
    fontSizeMultiplier = 1.22;
  }

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        fontSize,
        toggleThemeMode,
        setFontSize,
        colors,
        fontSizeMultiplier,
        isDark,
      }}
    >
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
