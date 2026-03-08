/**
 * ゲストユーザーのトークン管理（localStorage）
 * デバイスローカルで3トークンを管理する
 */
import { GUEST_INITIAL_TOKENS } from "@swimhub-scanner/shared";

const STORAGE_KEY = "guest_token_balance";

/**
 * ゲストのトークン残高を取得。
 * 初回呼び出し時は GUEST_INITIAL_TOKENS で初期化。
 */
export function getGuestTokenBalance(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(STORAGE_KEY, String(GUEST_INITIAL_TOKENS));
    return GUEST_INITIAL_TOKENS;
  }
  return parseInt(stored, 10);
}

/**
 * ゲストのトークンを1消費する。
 * 残高不足の場合は false を返す。
 */
export function consumeGuestToken(): boolean {
  const balance = getGuestTokenBalance();
  if (balance <= 0) return false;
  localStorage.setItem(STORAGE_KEY, String(balance - 1));
  return true;
}

/**
 * ゲストのトークン残高が0より大きいかチェック。
 */
export function canGuestScan(): boolean {
  return getGuestTokenBalance() > 0;
}

/**
 * ゲストのトークンデータをクリア（アカウント登録後に呼ぶ）。
 */
export function clearGuestTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}
