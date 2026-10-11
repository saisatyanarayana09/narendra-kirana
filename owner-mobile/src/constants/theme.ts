/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Centralized Single Source of Truth for owner-mobile design tokens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  headerBg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryDark: string;
  indigo: string;
  accent?: string;
  secondary?: string;
}

export type HexColor = `#${string}`;

// -------------------------------------------------------------
// 1. BRAND COLORS (Edit here to change brand identity)
// -------------------------------------------------------------
export const brandColors = {
  primary: '#10b981' as HexColor,  // emerald-500
  primaryDark: '#059669' as HexColor, // emerald-600
  indigo: '#4f46e5' as HexColor,   // indigo-600
  indigoLight: '#6366f1' as HexColor, // indigo-500
};

export const theme = {
  colors: {
    primary: brandColors.primary as HexColor,
    primaryDark: brandColors.primaryDark as HexColor,
    indigo: brandColors.indigo as HexColor,
    indigoLight: brandColors.indigoLight as HexColor,
    accent: '#ecd386' as HexColor,
    secondary: '#4d69a5' as HexColor,
  },
};

// -------------------------------------------------------------
// 2. LIGHT PALETTE
// -------------------------------------------------------------
export const LIGHT_COLORS: ThemeColors = {
  bg: '#f8fafc',       // slate-50
  headerBg: '#ffffff', // white
  card: '#ffffff',     // white
  cardAlt: '#f1f5f9',  // slate-100
  text: '#0f172a',     // slate-900
  textMuted: '#64748b',// slate-500
  border: '#e2e8f0',   // slate-200
  primary: brandColors.primary,
  primaryDark: brandColors.primaryDark,
  indigo: brandColors.indigo,
};

// -------------------------------------------------------------
// 3. DARK PALETTE
// -------------------------------------------------------------
export const DARK_COLORS: ThemeColors = {
  bg: '#090d16',       // web app dark main bg
  headerBg: '#0d1322', // web app dark header bg
  card: '#0f172a',     // slate-900
  cardAlt: '#1e293b',  // slate-800
  text: '#f8fafc',     // slate-50
  textMuted: '#94a3b8',// slate-400
  border: '#1e293b',   // slate-800
  primary: brandColors.primary,
  primaryDark: brandColors.primaryDark,
  indigo: brandColors.indigoLight,
};

// Backwards-compatible Colors export
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: brandColors.primary,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: brandColors.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export interface ThemePreset {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  canvas: string;
  text: string;
  colors: string[];
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  vacation: {
    id: 'vacation',
    name: '🌴 Vacation Retro',
    tagline: 'Seafoam Teal, Butter Gold & Warm Linen',
    primary: '#5ba8a6',
    primaryDark: '#3d8b89',
    secondary: '#4d69a5',
    accent: '#ecd386',
    canvas: '#f7f5f0',
    text: '#323232',
    colors: ['#5ba8a6', '#ecd386', '#4d69a5', '#eae6dd'],
  },
  emerald: {
    id: 'emerald',
    name: '🌿 Fresh Emerald',
    tagline: 'Classic Kirana Mint & Leaf Green',
    primary: '#059669',
    primaryDark: '#047857',
    secondary: '#10b981',
    accent: '#f59e0b',
    canvas: '#f8fafc',
    text: '#0f172a',
    colors: ['#059669', '#10b981', '#047857', '#ffffff'],
  },
  indigo: {
    id: 'indigo',
    name: '👑 Royal Indigo',
    tagline: 'Modern Deep Blue & Purple Tech',
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    secondary: '#6366f1',
    accent: '#8b5cf6',
    canvas: '#f8fafc',
    text: '#0f172a',
    colors: ['#4f46e5', '#6366f1', '#8b5cf6', '#ffffff'],
  },
  warm_sun: {
    id: 'warm_sun',
    name: '☀️ Warm Sun',
    tagline: 'Golden Honey & Energetic Amber',
    primary: '#f59e0b',
    primaryDark: '#d97706',
    secondary: '#ef4444',
    accent: '#f97316',
    canvas: '#fffbeb',
    text: '#1c1917',
    colors: ['#f59e0b', '#d97706', '#ef4444', '#ffffff'],
  },
};
