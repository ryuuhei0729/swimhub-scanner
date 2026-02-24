/**
 * Expo設定ファイル（動的）
 * 環境変数を読み込んで設定
 *
 * ローカル開発: dotenvx run -f .env.local -- expo start
 * EAS Build: EAS 環境変数から直接読み込み
 */

const baseConfig = require('./app.json')

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const webApiUrl = process.env.EXPO_PUBLIC_WEB_API_URL

if (process.env.NODE_ENV === 'development') {
  console.log('app.config.js - 環境変数の確認:')
  console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未設定')
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定')
  console.log('EXPO_PUBLIC_WEB_API_URL:', webApiUrl || '未設定')
}

module.exports = {
  ...baseConfig.expo,
  extra: {
    ...baseConfig.expo.extra,
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey,
    webApiUrl: webApiUrl || 'https://scanner.swim-hub.app',
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
    eas: {
      projectId: baseConfig.expo.extra?.eas?.projectId || '',
    },
  },
}
