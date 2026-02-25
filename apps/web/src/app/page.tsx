"use client";

import Image from "next/image";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 sm:px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="SwimHub Scanner" width={32} height={32} className="h-8 w-8" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">SwimHub Scanner</h1>
          </div>
          <UserMenu />
        </header>
        <ScannerFlow />
      </main>
    </AuthGuard>
  );
}
