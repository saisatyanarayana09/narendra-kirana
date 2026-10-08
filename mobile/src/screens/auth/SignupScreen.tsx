import React from "react";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { LoginScreen } from "./LoginScreen";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Signup">;
  route?: RouteProp<AuthStackParamList, "Signup">;
};

export function SignupScreen({ navigation, route }: Props) {
  // Delegate to the unified 1-Tap Google authentication screen
  return <LoginScreen navigation={navigation as any} route={route as any} />;
}
