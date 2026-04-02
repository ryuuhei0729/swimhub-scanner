import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { MainStackParamList } from "./types";
import { ScannerScreen } from "@/screens/ScannerScreen";
import { AccountScreen } from "@/screens/AccountScreen";
import { PaywallScreen } from "@/screens/PaywallScreen";
import { GuestSignupScreen } from "@/screens/GuestSignupScreen";
import { LoginMethodScreen } from "@/screens/LoginMethodScreen";
import { EmailLoginScreen } from "@/screens/EmailLoginScreen";
import { EmailSignupScreen } from "@/screens/EmailSignupScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerTitle: "アカウント",
          headerBackTitle: "戻る",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="GuestSignup"
        component={GuestSignupScreen}
        options={{
          headerTitle: "アカウント登録",
          headerBackTitle: "戻る",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="LoginMethod"
        component={LoginMethodScreen}
        options={{
          headerTitle: "ログイン",
          headerBackTitle: "戻る",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="EmailLogin"
        component={EmailLoginScreen}
        options={{
          headerTitle: "メールでログイン",
          headerBackTitle: "戻る",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="EmailSignup"
        component={EmailSignupScreen}
        options={{
          headerTitle: "アカウント作成",
          headerBackTitle: "戻る",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
    </Stack.Navigator>
  );
};
