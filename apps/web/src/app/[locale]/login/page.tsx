import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
