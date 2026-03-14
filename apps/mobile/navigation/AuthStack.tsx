import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { GetStartedScreen } from "@/screens/GetStartedScreen";
import { LoginMethodScreen } from "@/screens/LoginMethodScreen";
import { EmailLoginScreen } from "@/screens/EmailLoginScreen";
import { EmailSignupScreen } from "@/screens/EmailSignupScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#EFF6FF",
        },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="LoginMethod" component={LoginMethodScreen} />
      <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
      <Stack.Screen name="EmailSignup" component={EmailSignupScreen} />
    </Stack.Navigator>
  );
};
