"use client";

import type { ReactNode } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, disabled = false, children }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const showIndicator = pullDistance > 0 || isRefreshing;
  const isReady = pullDistance >= 60;

  return (
    <div ref={containerRef}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: showIndicator ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : "0px" }}
      >
        <div
          className="transition-transform duration-200"
          style={{
            transform: `rotate(${isReady || isRefreshing ? 180 : 0}deg)`,
          }}
        >
          {isRefreshing ? (
            <div
              className="h-6 w-6 animate-spin rounded-full border-3 border-border border-t-primary"
              role="status"
              aria-label="更新中"
            />
          ) : (
            <svg
              className={`h-6 w-6 ${isReady ? "text-primary" : "text-muted-foreground"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
