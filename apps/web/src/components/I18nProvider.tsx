"use client";

import { useEffect, useState } from "react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { getI18nOptions, type SupportedLocale } from "@swimhub-scanner/i18n";

let initialized = false;

export function I18nProvider({
  locale,
  children,
}: {
  locale: SupportedLocale;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(initialized);

  useEffect(() => {
    if (!initialized) {
      i18next
        .use(initReactI18next)
        .init(getI18nOptions(locale))
        .then(() => {
          initialized = true;
          setReady(true);
        });
    } else if (i18next.language !== locale) {
      i18next.changeLanguage(locale);
    }
  }, [locale]);

  if (!ready) return null;

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
