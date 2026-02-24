"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 sm:px-6 py-3 shadow-sm">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">SwimHub Scanner</h1>
          <UserMenu />
        </header>
        <ScannerFlow />
      </main>
    </AuthGuard>
  );
}
