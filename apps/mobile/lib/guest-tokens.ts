/**
 * ゲストユーザーのトークン管理（AsyncStorage）
 * デバイスローカルで3トークンを管理する
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GUEST_INITIAL_TOKENS } from '@swimhub-scanner/shared'

const STORAGE_KEY = 'guest_token_balance'

/**
 * ゲストのトークン残高を取得。
 * 初回呼び出し時は GUEST_INITIAL_TOKENS で初期化。
 */
export async function getGuestTokenBalance(): Promise<number> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY)
  if (stored === null) {
    await AsyncStorage.setItem(STORAGE_KEY, String(GUEST_INITIAL_TOKENS))
    return GUEST_INITIAL_TOKENS
  }
  return parseInt(stored, 10)
}

/**
 * ゲストのトークンを1消費する。
 * 残高不足の場合は false を返す。
 */
export async function consumeGuestToken(): Promise<boolean> {
  const balance = await getGuestTokenBalance()
  if (balance <= 0) return false
  await AsyncStorage.setItem(STORAGE_KEY, String(balance - 1))
  return true
}

/**
 * ゲストのトークン残高が0より大きいかチェック。
 */
export async function canGuestScan(): Promise<boolean> {
  const balance = await getGuestTokenBalance()
  return balance > 0
}

/**
 * ゲストのトークンデータをクリア（アカウント登録後に呼ぶ）。
 */
export async function clearGuestTokens(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
