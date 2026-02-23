"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h1 className="text-xl font-bold">タイム記録表スキャナー</h1>
          <UserMenu />
        </header>
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-gray-600">画像アップロード機能はPhase 4で実装予定</p>
        </div>
      </main>
    </AuthGuard>
  );
}
