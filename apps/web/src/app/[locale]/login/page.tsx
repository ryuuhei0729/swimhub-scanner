"use client";

import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { LoginForm } from "@/components/auth/LoginForm";
import { FullScreenLoading } from "@/components/ui/LoadingSpinner";

function LoginPageContent() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<FullScreenLoading message={t("auth.loadingAuth")} />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
