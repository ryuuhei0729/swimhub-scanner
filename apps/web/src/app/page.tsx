"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <header className="flex items-center justify-between border-b bg-white px-6 py-4">
          <h1 className="text-xl font-bold">タイム記録表スキャナー</h1>
          <UserMenu />
        </header>
        <ScannerFlow />
      </main>
    </AuthGuard>
  );
}
