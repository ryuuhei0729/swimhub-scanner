import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { KeyboardScrollProvider } from "@/components/keyboard/KeyboardScrollProvider";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;

  return {
    title: {
      default: t.meta.title,
      template: `%s | ${t.common.appName}`,
    },
    description: t.meta.description,
    metadataBase: new URL(siteUrl),
    alternates: {
      languages: {
        ja: "/ja",
        en: "/en",
      },
    },
    keywords: t.meta.keywords.split(","),
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: siteUrl,
      siteName: t.common.appName,
      locale: t.meta.ogLocale,
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t.common.appName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
      images: ["/og-image.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
      ],
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#EFF6FF",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const t = i18nResources[locale].translation;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.common.appName,
    url: siteUrl,
    description: t.meta.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    inLanguage: locale,
  };

  return (
    <html lang={locale} className="h-full">
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans`}>
        <I18nProvider locale={locale}>
          <AuthProvider>
            <KeyboardScrollProvider>
              <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
              {children}
            </KeyboardScrollProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
