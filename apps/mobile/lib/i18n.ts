import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getI18nOptions, defaultLocale } from "@swimhub-scanner/i18n";

i18n.use(initReactI18next).init(getI18nOptions(defaultLocale));

export default i18n;
