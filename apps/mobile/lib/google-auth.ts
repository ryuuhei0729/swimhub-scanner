/**
 * Google OAuth認証ユーティリティ
 * 実体は共有パッケージ (@ryuuhei0729/swimhub-oauth/mobile) に集約されており、
 * ここはこのアプリ固有の scheme を束ねる薄いアダプタ。
 */
import { getRedirectUri as sharedGetRedirectUri } from "@ryuuhei0729/swimhub-oauth/mobile";

export { claimOAuthCode, signInWithGoogle } from "@ryuuhei0729/swimhub-oauth/mobile";

/**
 * このアプリのカスタム URL スキーム。Google OAuth のリダイレクト (getRedirectUri /
 * hooks/useGoogleAuth.ts の signInWithGoogle 呼び出しの `scheme`) と、
 * app/_layout.tsx が deep link を判別する際の前提になっている。ハードコード箇所を
 * 1箇所に集約し、将来スキームを変更する際の取りこぼしを防ぐ。
 */
export const APP_SCHEME = "swimhub-scanner";

/**
 * リダイレクトURIを生成
 * カスタムスキーム(swimhub-scanner://)を使用
 */
export const getRedirectUri = (): string => sharedGetRedirectUri(APP_SCHEME);
