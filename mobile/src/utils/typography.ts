import { StyleSheet, Platform } from 'react-native';

export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export function getFontFamily(weight?: string | number): string {
  if (!weight) return fonts.regular;
  const w = String(weight).toLowerCase();
  if (w === '900' || w === 'black') return fonts.black;
  if (w === '800' || w === 'extrabold' || w === 'heavy') return fonts.extraBold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '600' || w === 'semibold') return fonts.semiBold;
  if (w === '500' || w === 'medium') return fonts.medium;
  return fonts.regular;
}

// On Web, ensure Nunito Google Font stylesheet is injected
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existingLink = document.getElementById('nunito-google-font');
  if (!existingLink) {
    const link = document.createElement('link');
    link.id = 'nunito-google-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }
}

// Intercept StyleSheet.create to inject Nunito font family for all text styles
const originalCreate = StyleSheet.create;

(StyleSheet as any).create = function <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(styles: T): T {
  if (styles && typeof styles === 'object') {
    for (const key of Object.keys(styles)) {
      const style = (styles as any)[key];
      if (style && typeof style === 'object') {
        const isTextStyle = 
          style.fontSize !== undefined ||
          style.fontWeight !== undefined ||
          style.letterSpacing !== undefined ||
          style.lineHeight !== undefined ||
          (style.color !== undefined && style.backgroundColor === undefined && style.flexDirection === undefined);

        if (isTextStyle && !style.fontFamily) {
          style.fontFamily = getFontFamily(style.fontWeight);
        }
      }
    }
  }
  return originalCreate(styles);
};
