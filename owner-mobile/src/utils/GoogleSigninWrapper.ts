import { Alert, Platform } from 'react-native';

let GoogleSigninModule: any = null;

if (Platform.OS !== 'web') {
  try {
    // Dynamic require so module evaluation doesn't fail when TurboModule RNGoogleSignin is absent (e.g. in Expo Go)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    if (mod && mod.GoogleSignin) {
      GoogleSigninModule = mod.GoogleSignin;
    }
  } catch {
    console.warn('[GoogleSigninWrapper] Native GoogleSignin module unavailable (running in Expo Go or Web).');
  }
}

export const GoogleSignin = GoogleSigninModule || {
  configure: () => {},
  hasPlayServices: async () => {
    Alert.alert(
      'Not Supported in Expo Go',
      'Google Sign-In requires a standalone APK build. Please log in with your Username/Email and Password in Expo Go.'
    );
    throw new Error('GoogleSignin native module is not available in Expo Go');
  },
  signIn: async () => {
    throw new Error('GoogleSignin native module is not available in Expo Go');
  },
  signOut: async () => {},
};

export default GoogleSignin;
