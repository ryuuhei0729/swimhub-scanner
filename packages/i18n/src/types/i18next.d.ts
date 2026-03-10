import "i18next";
import type { TranslationResource } from "../locales/ja";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResource;
    };
  }
}
