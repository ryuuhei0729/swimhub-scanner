"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteAccount = async () => {
    if (!confirm("アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。\n\n本当に削除しますか？")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "アカウントの削除に失敗しました");
      }
      await signOut();
    } catch (err) {
      alert(err instanceof Error ? err.message : "アカウントの削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-muted transition-colors duration-200"
      >
        ログイン
      </Link>
    );
  }

  const displayName = user.user_metadata?.full_name ?? user.email;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
      >
        <svg
          className="h-5 w-5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
        <span className="hidden sm:inline max-w-[150px] truncate">
          {displayName}
        </span>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md bg-card shadow-lg ring-1 ring-border z-50 animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
            {user.email && displayName !== user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
            >
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              ログアウト
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                handleDeleteAccount();
              }}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              {deleting ? "削除中..." : "アカウントを削除"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
