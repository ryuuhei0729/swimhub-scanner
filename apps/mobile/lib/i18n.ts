import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  getI18nOptions,
  supportedLocales,
  defaultLocale,
  type SupportedLocale,
} from "@swimhub-scanner/i18n";

function getDeviceLocale(): SupportedLocale {
  const deviceLocales = getLocales();
  const deviceLang = deviceLocales[0]?.languageCode ?? "ja";
  if (supportedLocales.includes(deviceLang as SupportedLocale)) {
    return deviceLang as SupportedLocale;
  }
  return defaultLocale;
}

const deviceLocale = getDeviceLocale();
i18next.use(initReactI18next).init(getI18nOptions(deviceLocale));
export default i18next;
