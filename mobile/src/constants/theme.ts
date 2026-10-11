export type ThemeMode = "light" | "dark" | "system";

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
  welcomeGradient: [string, string, string];
  indigo: string;
  indigoLight: string;
  action: string;
  secondary?: string;
  accent?: string;
  accentLight?: string;
}

// -------------------------------------------------------------
// 1. BRAND COLORS (Vacation 5-Color Palette)
// -------------------------------------------------------------
export const brandColors = {
  primary: "#5ba8a6",      // Seafoam Teal (Main CTA, buttons, active tabs)
  primaryDark: "#3d8b89",  // Deep Coastal Teal (Pressed button shade, contrast)
  primaryLight: "#d8eeed", // Soft Teal Mist (Pills, tag fills)
  secondary: "#4d69a5",    // Coastal Denim Blue (Secondary actions, delivery)
  accent: "#ecd386",       // Butter Sand Gold (Offers, discounts, star ratings)
  accentLight: "#fbf6e7",  // Pale Butter Wash (Coupon banners)
  success: "#5ba8a6",      // Harmonized Fresh Teal
  error: "#ef4444",        // Red-500
  indigo: "#4d69a5",       // Coastal Denim Blue
  indigoLight: "#e9edf5",  // Pale Denim Mist
  action: "#dc2626",       // Red-600
};

// -------------------------------------------------------------
// 2. LIGHT PALETTE (Warm Linen Canvas & Soft Charcoal)
// -------------------------------------------------------------
export const lightColors: ThemeColors = {
  background: "#f7f5f0",   // Warm Cream Linen Canvas
  surface: "#ffffff",      // Crisp White Cards
  text: "#323232",         // Soft Charcoal Typography
  textSecondary: "#6b7280",// Muted Slate Gray
  border: "#ded9cd",       // Warm Organic Border
  cardBg: "#ffffff",
  primary: brandColors.primary,
  primaryDark: brandColors.primaryDark,
  primaryLight: brandColors.primaryLight,
  success: brandColors.success,
  error: brandColors.error,
  inputBg: "#eae6dd",      // Cream Linen Input Fill
  divider: "#eae6dd",
  mutedSurface: "#f0ece3",
  welcomeGradient: ["#ffffff", "#fbf6e7", "#d8eeed"],
  indigo: brandColors.indigo,
  indigoLight: brandColors.indigoLight,
  action: brandColors.action,
  secondary: brandColors.secondary,
  accent: brandColors.accent,
  accentLight: brandColors.accentLight,
};

// -------------------------------------------------------------
// 3. DARK PALETTE (Deep Charcoal Night)
// -------------------------------------------------------------
export const darkColors: ThemeColors = {
  background: "#181a1b",   // Deep Charcoal Night
  surface: "#222527",      // Elevated Dark Card
  text: "#f3efe6",         // Warm Linen Text
  textSecondary: "#9aa1a9",
  border: "#363a3d",
  cardBg: "#222527",
  primary: "#5ba8a6",      // Vibrant Seafoam Teal
  primaryDark: brandColors.primaryDark,
  primaryLight: "#1c3c3b",
  success: brandColors.success,
  error: "#f87171",
  inputBg: "#2b2e31",
  divider: "#2e3338",
  mutedSurface: "#1e2123",
  welcomeGradient: ["#181a1b", "#1c2c3b", "#181a1b"],
  indigo: "#6f8ac7",       // Lifted Denim Blue
  indigoLight: "#1e283d",
  action: "#ef4444",
  secondary: "#6f8ac7",
  accent: brandColors.accent,
  accentLight: "#332d1e",
};

// -------------------------------------------------------------
// 4. STATIC BUNDLE (For backwards-compatibility in static contexts)
// -------------------------------------------------------------
export const theme = {
  colors: lightColors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fonts: {
    regular: "Nunito_400Regular",
    medium: "Nunito_500Medium",
    semiBold: "Nunito_600SemiBold",
    bold: "Nunito_700Bold",
    extraBold: "Nunito_800ExtraBold",
    black: "Nunito_900Black",
  },
};

export const THEME_PRESETS = {
  vacation: {
    primary: "#5ba8a6",
    primaryDark: "#3d8b89",
    primaryLight: "#d8eeed",
    secondary: "#4d69a5",
    accent: "#ecd386",
    accentLight: "#fbf6e7",
    canvas: "#f7f5f0",
    text: "#323232",
  },
  emerald: {
    primary: "#059669",
    primaryDark: "#047857",
    primaryLight: "#d1fae5",
    secondary: "#10b981",
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    canvas: "#f8fafc",
    text: "#0f172a",
  },
  indigo: {
    primary: "#4f46e5",
    primaryDark: "#4338ca",
    primaryLight: "#e0e7ff",
    secondary: "#6366f1",
    accent: "#8b5cf6",
    accentLight: "#ede9fe",
    canvas: "#f8fafc",
    text: "#0f172a",
  },
  warm_sun: {
    primary: "#f59e0b",
    primaryDark: "#d97706",
    primaryLight: "#fef3c7",
    secondary: "#ef4444",
    accent: "#f97316",
    accentLight: "#ffedd5",
    canvas: "#fffbeb",
    text: "#1c1917",
  },
};
