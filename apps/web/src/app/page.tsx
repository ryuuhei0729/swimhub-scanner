"use client";

import Image from "next/image";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";
import { SwimHubFamilyFooter } from "@/components/layout/SwimHubFamilyFooter";

export default function HomePage() {
  return (
    <AuthGuard>
      <div className="min-h-dvh flex flex-col">
        <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-2 sm:px-4 lg:px-8 flex items-center justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="SwimHub Scanner" width={16} height={16} className="h-4 w-4" />
            <span className="font-semibold text-sm tracking-tight">SwimHub Scanner</span>
          </div>
          <UserMenu />
        </header>
        <main className="flex-1">
          <ScannerFlow />
        </main>
        <SwimHubFamilyFooter />
      </div>
    </AuthGuard>
  );
}
