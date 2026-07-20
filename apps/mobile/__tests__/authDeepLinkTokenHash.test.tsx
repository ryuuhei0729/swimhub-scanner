/**
 * Sprint Contract テストスケルトン (QA Phase B)
 * scanner mobile — token_hash + type メール確認/パスワードリセット deep link 分岐
 *
 * NOTE: scanner mobile には Jest/Vitest が未セットアップ (package.json に test
 * スクリプト・jest 依存が無い) のため、このファイルは実行不可。PM 裁定によりスケルトン
 * 作成 + コード確認 ([C]) で代替する。テスト基盤が Phase 以降で追加された際に、
 * timer mobile の __tests__/rootLayoutAuthDeepLink.test.tsx と同じ手法
 * (expo-linking の parse/getInitialURL/addEventListener をモックし、
 * app/_layout.tsx の handleAuthDeepLink を実コンポーネント経由で駆動する) で
 * 実装する。
 *
 * [C] コード確認メモ (QA Phase B, app/_layout.tsx L107-197 および lib/auth-deep-link.ts):
 *   - token_hash 抽出 (extractTokenHash) は code 抽出より先にチェックされ、
 *     両方存在する場合 token_hash が優先される (V-07 相当、web/timer と整合)。
 *   - OAuth コールバック判定 (hostname==="auth" && path==="callback") は
 *     token_hash 抽出より前に early return するが、signUp の emailRedirectTo は
 *     "swimhub-scanner://" (bare scheme、host/path 無し) であるため衝突しないことを
 *     contexts/AuthProvider.tsx L266-270 のコメント/実装で確認済み。
 *   - recovery 判定は `type === "recovery" || hostname === "reset-password"` の
 *     二重チェック。resetPasswordForEmail の redirectTo は
 *     "swimhub-scanner://reset-password" (app/(auth)/email-login.tsx L104) であり
 *     一貫している。
 *   - token_hash の重複処理防止は既存の processedCodesRef (code 用) を token_hash にも
 *     流用しており、Set が一つなので token_hash と code の値が偶然衝突しない限り安全。
 *   - verifyOtp がエラーの場合、isRecovery なら setPendingRecoveryCheck(false) に戻し、
 *     次回ログインが誤って reset-password へ誘導されない (timer と同じ設計思想)。
 *
 * 検証観点 (テスト基盤導入後に実装):
 * [SC-01] token_hash + type=signup → verifyOtp が呼ばれ、成功時は特に画面遷移しない
 * [SC-02] token_hash + type=recovery → setPendingRecoveryCheck(true) → verifyOtp
 *         成功 → router.replace("/(auth)/reset-password")
 * [SC-03] token_hash + type=recovery で verifyOtp がエラー →
 *         setPendingRecoveryCheck(false) に戻り、reset-password へ遷移しない
 * [SC-04] token_hash と code が両方ある URL では token_hash が優先され
 *         exchangeCodeForSession は呼ばれない (V-07)
 * [SC-05] token_hash が無く code のみの URL では exchangeCodeForSession が呼ばれる
 *         (V-04: 既存 OAuth / PKCE 回帰)
 * [SC-06] hostname==="auth" && path==="callback" (Google OAuth) の URL は
 *         token_hash の有無に関わらず無視される (useGoogleAuth 側が処理するため)
 * [SC-07] 同一 token_hash を含む URL が2回処理されても verifyOtp は1回しか
 *         呼ばれない (processedCodesRef による重複排除)
 * [SC-08] 境界値: token_hash はあるが type が未知の値 → extractTokenHash が null を
 *         返し、code 分岐にもフォールバックしない (type なしとして無視される)
 */

// import { render, waitFor } from "@testing-library/react-native";
// import RootLayout from "../app/_layout";
//
// jest.mock("expo-linking", () => { ... });
// jest.mock("../lib/supabase", () => ({ supabase: { auth: { verifyOtp: jest.fn(), ... } } }));

export {};
