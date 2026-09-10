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

// Export fonts helper without monkey-patching StyleSheet.create
export default fonts;
