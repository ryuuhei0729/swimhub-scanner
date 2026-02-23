"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{displayName}</span>
      <Button variant="ghost" size="sm" onClick={signOut}>
        ログアウト
      </Button>
    </div>
  );
}
