import { defaultLocale } from "@swimhub-scanner/i18n";
import { redirect } from "next/navigation";

export default function PrivacyRedirectPage() {
  redirect(`/${defaultLocale}/privacy`);
}
