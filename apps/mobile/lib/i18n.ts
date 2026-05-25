import "intl-pluralrules";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  getI18nOptions,
  isSupportedLocale,
  DEVICE_FALLBACK_LOCALE,
  type SupportedLocale,
} from "@swimhub-scanner/i18n";

function getDeviceLocale(): SupportedLocale {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return isSupportedLocale(code) ? code : DEVICE_FALLBACK_LOCALE;
  } catch (err) {
    console.error("[i18n] getDeviceLocale 失敗:", err);
    return DEVICE_FALLBACK_LOCALE;
  }
}

void i18next.use(initReactI18next).init(getI18nOptions(getDeviceLocale()));

export default i18next;
