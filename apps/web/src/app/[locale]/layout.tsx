import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import {
  supportedLocales,
  i18nResources,
  type SupportedLocale,
} from "@swimhub-scanner/i18n";

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

const siteUrl = "https://scanner.swim-hub.app";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t.meta.title,
      template: "%s | SwimHub Scanner",
    },
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ja: "/ja",
        en: "/en",
      },
    },
    keywords: [...t.meta.keywords],
    openGraph: {
      type: "website",
      locale: t.meta.ogLocale,
      url: siteUrl,
      siteName: "SwimHub Scanner",
      title: t.meta.title,
      description: t.meta.description,
    },
    twitter: {
      card: "summary",
      title: t.meta.title,
      description: t.meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <I18nProvider locale={locale}>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}
