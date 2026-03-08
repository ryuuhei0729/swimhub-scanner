"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
