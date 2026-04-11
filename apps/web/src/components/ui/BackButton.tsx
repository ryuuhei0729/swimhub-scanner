"use client";

import { useTranslation } from "react-i18next";

export function BackButton() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="text-sm text-blue-600 hover:text-blue-800"
      aria-label={t("common.back")}
    >
      ← {t("common.back")}
    </button>
  );
}
