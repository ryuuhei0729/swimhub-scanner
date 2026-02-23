"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "ログインに失敗しました。もう一度お試しください。" : null,
  );
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // リダイレクト方式のため、ここには戻らない
    } catch (err) {
      setError("Googleログインに失敗しました。もう一度お試しください。");
      console.error("Google sign-in error:", err);
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithApple();
      // リダイレクト方式のため、ここには戻らない
    } catch (err) {
      setError("Appleログインに失敗しました。もう一度お試しください。");
      console.error("Apple sign-in error:", err);
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setEmailSent(true);
      } else {
        await signInWithEmail(email, password);
        router.push("/");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Invalid login credentials")) {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (message.includes("already registered")) {
        setError("このメールアドレスは既に登録されています。ログインしてください。");
      } else {
        setError(
          isSignUp
            ? "アカウント作成に失敗しました。もう一度お試しください。"
            : "メールログインに失敗しました。もう一度お試しください。",
        );
      }
      console.error("Email auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">タイム記録表スキャナー</h1>
        <p className="mt-2 text-gray-600">手書きタイム記録表をAIで自動デジタル化</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {emailSent ? (
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <p className="font-medium text-green-800">確認メールを送信しました</p>
          <p className="mt-1 text-sm text-green-700">
            メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
          <button
            type="button"
            className="mt-3 text-sm text-blue-600 underline hover:text-blue-800"
            onClick={() => {
              setEmailSent(false);
              setIsSignUp(false);
            }}
          >
            ログイン画面に戻る
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google でログイン
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={handleAppleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple でログイン
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="6文字以上"
                disabled={loading}
              />
            </div>
            <Button variant="primary" size="lg" className="w-full" disabled={loading}>
              {isSignUp ? "アカウント作成" : "メールでログイン"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600">
            {isSignUp ? (
              <>
                既にアカウントをお持ちですか？{" "}
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-800"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                >
                  ログイン
                </button>
              </>
            ) : (
              <>
                アカウントをお持ちでないですか？{" "}
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-800"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                >
                  新規登録
                </button>
              </>
            )}
          </p>
        </>
      )}

      <p className="text-center text-xs text-gray-500">
        ログインすることで、
        <Link href="/terms" className="text-blue-600 underline hover:text-blue-800">
          利用規約
        </Link>
        および
        <Link href="/privacy" className="text-blue-600 underline hover:text-blue-800">
          プライバシーポリシー
        </Link>
        に同意したものとします。
      </p>
    </div>
  );
}
