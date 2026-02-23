"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{user.displayName ?? user.email}</span>
      <Button variant="ghost" size="sm" onClick={signOut}>
        ログアウト
      </Button>
    </div>
  );
}
