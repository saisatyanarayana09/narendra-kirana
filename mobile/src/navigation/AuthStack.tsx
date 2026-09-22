import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { WelcomeScreen } from "../screens/WelcomeScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPasswordScreen: undefined;
  ResetPasswordScreen: { uid?: string; token?: string } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen
        name="ForgotPasswordScreen"
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name="ResetPasswordScreen"
        component={ResetPasswordScreen}
      />
    </Stack.Navigator>
  );
}
