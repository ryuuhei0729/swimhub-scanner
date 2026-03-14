import React from "react";
import { TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { MainStackParamList } from "./types";
import { ScannerScreen } from "@/screens/ScannerScreen";
import { AccountScreen } from "@/screens/AccountScreen";
import { GuestSignupScreen } from "@/screens/GuestSignupScreen";
import { LoginMethodScreen } from "@/screens/LoginMethodScreen";
import { EmailLoginScreen } from "@/screens/EmailLoginScreen";
import { EmailSignupScreen } from "@/screens/EmailSignupScreen";
import { useAuth } from "@/contexts/AuthProvider";

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  const { isGuest, isAuthenticated } = useAuth();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={({ navigation }) => ({
          headerTitle: "SwimHub Scanner",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (isAuthenticated) {
                  navigation.navigate("Account");
                } else {
                  navigation.navigate("LoginMethod");
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={isAuthenticated ? "user" : "log-in"} size={22} color="#374151" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerTitle: "アカウント",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="GuestSignup"
        component={GuestSignupScreen}
        options={{
          headerTitle: "アカウント登録",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="LoginMethod"
        component={LoginMethodScreen}
        options={{
          headerTitle: "ログイン",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="EmailLogin"
        component={EmailLoginScreen}
        options={{
          headerTitle: "メールでログイン",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="EmailSignup"
        component={EmailSignupScreen}
        options={{
          headerTitle: "アカウント作成",
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
    </Stack.Navigator>
  );
};
