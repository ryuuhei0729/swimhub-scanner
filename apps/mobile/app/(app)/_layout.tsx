import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#2563EB",
        headerTitleStyle: { color: "#111827" },
        contentStyle: { backgroundColor: "#EFF6FF" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="account"
        options={{
          headerTitle: t("accountScreen.title", { defaultValue: "アカウント" }),
          headerBackTitle: t("common.back", { defaultValue: "戻る" }),
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="login-method"
        options={{
          headerTitle: t("auth.loginMethod.title", { defaultValue: "ログイン" }),
          headerBackTitle: t("common.back", { defaultValue: "戻る" }),
        }}
      />
      <Stack.Screen
        name="email-login"
        options={{
          headerTitle: t("auth.emailLoginScreen.title", { defaultValue: "メールでログイン" }),
          headerBackTitle: t("common.back", { defaultValue: "戻る" }),
        }}
      />
      <Stack.Screen
        name="email-signup"
        options={{
          headerTitle: t("auth.emailSignupScreen.title", { defaultValue: "アカウント作成" }),
          headerBackTitle: t("common.back", { defaultValue: "戻る" }),
        }}
      />
    </Stack>
  );
}
