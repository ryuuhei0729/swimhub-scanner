import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#EFF6FF" },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="get-started" />
      <Stack.Screen name="login-method" />
      <Stack.Screen name="email-login" />
      <Stack.Screen name="email-signup" />
    </Stack>
  );
}
