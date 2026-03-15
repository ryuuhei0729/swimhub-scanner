"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, enterGuestMode } =
    useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params.locale as string) || "ja";
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? t("auth.loginFailed") : null,
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
    } catch (err) {
      setError(t("auth.googleLoginFailed"));
      if (process.env.NODE_ENV !== "production") {
        console.error("Google sign-in error:", err);
      }
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithApple();
    } catch (err) {
      setError(t("auth.appleLoginFailed"));
      if (process.env.NODE_ENV !== "production") {
        console.error("Apple sign-in error:", err);
      }
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
        router.push(`/${locale}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Invalid login credentials")) {
        setError(t("auth.invalidCredentials"));
      } else if (message.includes("already registered")) {
        setError(t("auth.alreadyRegistered"));
      } else {
        setError(
          isSignUp
            ? t("auth.signUpFailed")
            : t("auth.emailLoginFailed"),
        );
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("Email auth error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl animate-fade-in">
      <div className="text-center">
        <Image
          src="/icon.png"
          alt="SwimHub Scanner"
          width={180}
          height={180}
          className="mx-auto mb-3"
        />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          {isSignUp ? t("auth.signUp") : t("auth.login")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          {isSignUp ? t("auth.createAccount") : t("auth.tagline")}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-3 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {emailSent ? (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-400 mt-0.5 mr-3 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">{t("auth.confirmEmailSent")}</p>
              <p className="mt-1 text-sm">
                {t("auth.confirmEmailDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 text-sm text-blue-600 underline hover:text-blue-800"
            onClick={() => {
              setEmailSent(false);
              setIsSignUp(false);
            }}
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.emailLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 pr-3 transition duration-150 ease-in-out"
                  placeholder="example@email.com"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.passwordLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 pr-3 transition duration-150 ease-in-out"
                  placeholder={t("auth.passwordPlaceholder")}
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition duration-150 ease-in-out hover:scale-[1.02] shadow-md"
            >
              {loading ? t("common.processing") : isSignUp ? t("auth.signUp") : t("auth.emailLogin")}
            </button>
          </form>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t("common.or")}</span>
            </div>
          </div>

          {/* OAuth ボタン */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
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
              {isSignUp ? t("auth.googleSignUp") : t("auth.googleLogin")}
            </button>

            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              {isSignUp ? t("auth.appleSignUp") : t("auth.appleLogin")}
            </button>
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t("common.or")}</span>
            </div>
          </div>

          {/* ゲストとして利用 */}
          <button
            type="button"
            onClick={() => {
              enterGuestMode();
              router.replace(`/${locale}`);
            }}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-gray-500 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            {t("auth.guestMode")}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-150 ease-in-out"
            >
              {isSignUp
                ? t("auth.hasAccount")
                : t("auth.noAccount")}
            </button>
          </div>
        </>
      )}

      <p className="text-center text-xs text-gray-500">
        {t("auth.termsAgreement")}
        <Link href={`/${locale}/terms`} className="text-blue-600 underline hover:text-blue-800">
          {t("auth.terms")}
        </Link>
        {t("auth.and")}
        <Link href={`/${locale}/privacy`} className="text-blue-600 underline hover:text-blue-800">
          {t("auth.privacy")}
        </Link>
        {t("auth.termsAgreementEnd")}
      </p>
    </div>
  );
}
