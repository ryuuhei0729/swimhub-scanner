import type { InitOptions } from "i18next";
import ja from "./locales/ja";
import en from "./locales/en";

export const supportedLocales = ["ja", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "ja";

export const i18nResources = {
  ja: { translation: ja },
  en: { translation: en },
} as const;

export function getI18nOptions(lng: SupportedLocale): InitOptions {
  return {
    lng,
    fallbackLng: defaultLocale,
    resources: i18nResources,
    interpolation: {
      escapeValue: false,
    },
  };
}
