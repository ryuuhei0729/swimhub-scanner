import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

if (__DEV__) {
  console.log("Supabase環境変数の確認:");
  console.log("supabaseUrl:", supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : "未設定");
  console.log("supabaseAnonKey:", supabaseAnonKey ? "設定済み" : "未設定");
}

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error("Supabaseクライアントの初期化に失敗しました:", error);
  }
} else {
  console.error(
    "Supabase環境変数が設定されていません。\n" +
      "EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください。",
  );
}

export { supabase };
