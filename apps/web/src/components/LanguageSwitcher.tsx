"use client";

import { usePathname, useRouter } from "next/navigation";
import { supportedLocales } from "@swimhub-scanner/i18n";
import i18next from "i18next";

const localeLabels: Record<string, string> = {
  ja: "日本語",
  en: "English",
};

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const switchedPath = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  };

  const handleSwitch = async (locale: string) => {
    await i18next.changeLanguage(locale);
    router.replace(switchedPath(locale));
  };

  const currentLocale = pathname.split("/")[1];

  return (
    <div className="flex items-center gap-1">
      {supportedLocales.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && <span className="text-border mx-1">|</span>}
          <button
            type="button"
            aria-current={locale === currentLocale ? "true" : undefined}
            onClick={() => handleSwitch(locale)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {localeLabels[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
