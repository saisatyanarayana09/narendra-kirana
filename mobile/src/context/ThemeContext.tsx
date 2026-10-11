import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useColorScheme, AppState } from "react-native";

import { getItem, saveItem } from "../utils/storage";

import {
  ThemeColors,
  ThemeMode,
  lightColors,
  darkColors,
  THEME_PRESETS,
} from "../constants/theme";
import { storeApi } from "../api/store";

export type { ThemeMode, ThemeColors };

export function normalizeHex(hex?: string | null, fallback = "#5ba8a6"): string {
  if (!hex || typeof hex !== "string") return fallback;
  const clean = hex.trim().replace(/[^0-9a-fA-F#]/g, "");
  const withHash = clean.startsWith("#") ? clean : `#${clean}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash) ? withHash : fallback;
}

export function adjustLuminance(hex: string, percent: number): string {
  if (!hex || typeof hex !== "string") return hex;
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function getContrastTextColor(hexColor: string): "#ffffff" | "#0f172a" {
  if (!hexColor || typeof hexColor !== "string") return "#ffffff";
  const clean = hexColor.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#ffffff";
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165 ? "#0f172a" : "#ffffff";
}

interface ThemeContextType {
  theme: ThemeMode;
  themeMode: ThemeMode;
  toggleTheme: (mode: ThemeMode) => void;
  toggleThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const STORAGE_THEME_KEY = "sk_theme_mode";
const STORAGE_BRAND_THEME_KEY = "sk_brand_theme_settings";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [activePreset, setActivePreset] = useState<string>("vacation");
  const [paletteMode, setPaletteMode] = useState<number>(5);
  const [customColors, setCustomColors] = useState<{
    primary?: string;
    secondary?: string;
    accent?: string;
    canvas?: string;
    text?: string;
  }>({});

  const applyThemeSettings = useCallback((settings: any) => {
    if (!settings) return;
    if (settings.brand_theme_preset) {
      setActivePreset(settings.brand_theme_preset);
    }
    if (settings.palette_mode) {
      setPaletteMode(Number(settings.palette_mode) || 5);
    }
    setCustomColors({
      primary: settings.custom_primary_color,
      secondary: settings.custom_secondary_color,
      accent: settings.custom_accent_color,
      canvas: settings.custom_canvas_color,
      text: settings.custom_text_color,
    });
    // Persist brand theme for instant next cold start
    saveItem(STORAGE_BRAND_THEME_KEY, JSON.stringify(settings)).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const savedMode = await getItem(STORAGE_THEME_KEY);
        if (
          savedMode === "light" ||
          savedMode === "dark" ||
          savedMode === "system"
        ) {
          setThemeModeState(savedMode);
        }

        const savedBrand = await getItem(STORAGE_BRAND_THEME_KEY);
        if (savedBrand) {
          try {
            applyThemeSettings(JSON.parse(savedBrand));
          } catch {}
        }
      } catch (error) {
        console.error("Failed to load theme preferences:", error);
      }
    }
    loadPreferences();
  }, [applyThemeSettings]);

  useEffect(() => {
    const unsubscribe = storeApi.subscribe((settings) => {
      applyThemeSettings(settings);
    });

    // Proactively fetch latest published theme
    storeApi.getSettings(true).then((s) => {
      if (s) applyThemeSettings(s);
    }).catch(() => {});

    return () => {
      unsubscribe();
    };
  }, [applyThemeSettings]);

  // Over-the-air theme synchronization when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        storeApi.getSettings(true).then((s) => {
          if (s) applyThemeSettings(s);
        }).catch(() => {});
      }
    });
    return () => {
      sub.remove();
    };
  }, [applyThemeSettings]);

  const toggleThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveItem(STORAGE_THEME_KEY, mode);
  }, []);

  const isDark =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";

  const colors = useMemo(() => {
    const base = isDark ? { ...darkColors } : { ...lightColors };
    const preset = (THEME_PRESETS as any)[activePreset] || THEME_PRESETS.vacation;
    const isCustom = activePreset === "custom";

    const pPrimary = normalizeHex(isCustom ? (customColors.primary || preset.primary) : preset.primary, "#5ba8a6");
    const pSecondary = normalizeHex(isCustom ? (customColors.secondary || preset.secondary) : preset.secondary, "#4d69a5");
    const pAccent = normalizeHex(isCustom ? (customColors.accent || preset.accent) : preset.accent, "#ecd386");
    const pCanvas = normalizeHex(isCustom ? (customColors.canvas || preset.canvas || "#f7f5f0") : (preset.canvas || "#f7f5f0"), "#f7f5f0");
    const pText = normalizeHex(isCustom ? (customColors.text || preset.text || "#323232") : (preset.text || "#323232"), "#323232");

    base.primary = pPrimary;
    base.primaryDark = isCustom
      ? adjustLuminance(pPrimary, -15)
      : (preset.primaryDark || adjustLuminance(pPrimary, -15));
    base.primaryLight = isCustom ? adjustLuminance(pPrimary, 80) : (preset.primaryLight || "#d8eeed");

    base.accent = pAccent;
    base.accentLight = isCustom ? adjustLuminance(pAccent, 40) : (preset.accentLight || "#fbf6e7");

    // Lift secondary luminance in dark mode for WCAG AA readability against dark surfaces
    const effectiveSecondary = isDark ? adjustLuminance(pSecondary, 25) : pSecondary;

    if (paletteMode === 2) {
      // 2-Color Mode: Minimalist Dual-Tone
      if (!isDark) {
        base.background = "#ffffff";
        base.surface = "#ffffff";
        base.inputBg = "#f8fafc";
        base.border = "#e2e8f0";
        base.text = "#0f172a";
        base.mutedSurface = "#f8fafc";
      }
      base.secondary = pPrimary;
      base.indigo = pPrimary;
    } else if (paletteMode === 3) {
      // 3-Color Mode: Standard Trio (Primary + Delivery/Secondary + Accent)
      base.secondary = effectiveSecondary;
      base.indigo = effectiveSecondary;
      if (!isDark) {
        base.background = "#f8fafc";
        base.surface = "#ffffff";
        base.inputBg = "#f1f5f9";
        base.border = "#e2e8f0";
        base.text = "#0f172a";
        base.mutedSurface = "#f1f5f9";
      }
    } else if (paletteMode === 4) {
      // 4-Color Mode: Rich Ambient (Canvas Surface Tint is custom)
      base.secondary = effectiveSecondary;
      base.indigo = effectiveSecondary;
      if (!isDark) {
        base.background = pCanvas;
        base.inputBg = pCanvas;
        base.border = adjustLuminance(pCanvas, -12);
        base.text = "#0f172a";
        base.mutedSurface = adjustLuminance(pCanvas, -4);
      }
    } else {
      // 5-Color Mode (Full Atmosphere Master): All 5 Vacation tokens
      base.secondary = effectiveSecondary;
      base.indigo = effectiveSecondary;
      if (!isDark) {
        base.background = pCanvas;
        base.inputBg = pCanvas;
        base.border = adjustLuminance(pCanvas, -12);
        base.text = pText;
        base.mutedSurface = adjustLuminance(pCanvas, -4);
      }
    }

    base.welcomeGradient = isDark
      ? [base.background, adjustLuminance(pPrimary, -75), base.background]
      : [base.background, base.accentLight || "#fbf6e7", base.primaryLight];

    return base;
  }, [isDark, activePreset, paletteMode, customColors]);

  const contextValue = useMemo(
    () => ({
      theme: themeMode,
      themeMode,
      toggleTheme: toggleThemeMode,
      toggleThemeMode,
      colors,
      isDark,
    }),
    [themeMode, toggleThemeMode, colors, isDark],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
