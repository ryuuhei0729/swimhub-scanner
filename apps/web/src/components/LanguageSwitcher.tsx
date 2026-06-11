"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supportedLocales } from "@swimhub-scanner/i18n";

const localeLabels: Record<string, string> = {
  ja: "日本語",
  en: "English",
  zh: "简体中文",
  ko: "한국어",
  de: "Deutsch",
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentLocale = pathname.split("/")[1];
  const currentIndex = Math.max(
    0,
    supportedLocales.findIndex((l) => l === currentLocale),
  );

  // 外側クリック/タップで閉じる (モバイルは touchstart が先行発火するため両方を購読)
  useEffect(() => {
    const handlePointerOutside = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerOutside, { passive: true });
    document.addEventListener("touchstart", handlePointerOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, []);

  // メニューを開いたら現在のロケール項目へフォーカス (WAI-ARIA メニューパターン)
  useEffect(() => {
    if (isOpen) itemRefs.current[currentIndex]?.focus();
  }, [isOpen, currentIndex]);

  const close = (returnFocusToTrigger = false) => {
    setIsOpen(false);
    if (returnFocusToTrigger) triggerRef.current?.focus();
  };

  const switchedPath = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  };

  const handleSelect = async (locale: string) => {
    close();
    if (locale === currentLocale) return;
    await i18n.changeLanguage(locale);
    router.replace(switchedPath(locale));
  };

  // 隣の項目へ循環フォーカス
  const focusItemAt = (index: number) => {
    const count = supportedLocales.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true); // 開いた後は useEffect が現在のロケール項目へフォーカス
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const activeIndex = itemRefs.current.findIndex((el) => el === document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItemAt(activeIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItemAt(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItemAt(0);
        break;
      case "End":
        e.preventDefault();
        focusItemAt(supportedLocales.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("common.language")}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <Globe className="size-3.5" aria-hidden="true" />
        {t("common.language")}
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={t("common.language")}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-36 rounded-md border border-border bg-white py-1 shadow-lg"
        >
          {supportedLocales.map((locale, index) => {
            const isCurrent = locale === currentLocale;
            return (
              <button
                key={locale}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => handleSelect(locale)}
                aria-current={isCurrent ? "true" : undefined}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none ${
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{localeLabels[locale]}</span>
                {isCurrent && <Check className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
