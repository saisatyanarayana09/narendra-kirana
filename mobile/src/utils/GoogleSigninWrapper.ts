import { Alert } from "react-native";

let GoogleSigninModule: any = null;

try {
  GoogleSigninModule = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch (error) {
  console.warn("GoogleSignin native module not available.");
}

export const GoogleSignin = GoogleSigninModule || {
  configure: () => {},
  hasPlayServices: async () => {
    Alert.alert("Not Supported", "Google Sign-In requires a custom development build (not Expo Go).");
    throw new Error("GoogleSignin native module not available");
  },
  signIn: async () => {
    throw new Error("GoogleSignin native module not available");
  },
  signOut: async () => {},
};
