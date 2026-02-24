"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      // Only start pull if scrolled to top
      if (window.scrollY > 0) return;
      startY.current = e.touches[0]!.clientY;
      pulling.current = true;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || disabled || isRefreshing) return;
      const currentY = e.touches[0]!.clientY;
      const distance = currentY - startY.current;
      if (distance > 0) {
        // Apply resistance: the further you pull, the harder it gets
        const dampened = Math.min(distance * 0.4, 120);
        setPullDistance(dampened);
        // Prevent default scroll when pulling down
        if (window.scrollY === 0) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    },
    [disabled, isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || disabled) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Snap to threshold during refresh
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, disabled, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullDistance, isRefreshing };
}
