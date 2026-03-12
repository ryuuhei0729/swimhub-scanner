import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";

const supportedLocales = ["ja", "en"] as const;
type SupportedLocale = (typeof supportedLocales)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

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

export const metadata: Metadata = {
  metadataBase: new URL("https://scanner.swim-hub.app"),
  title: {
    default: "SwimHub Scanner - 手書きタイム記録表をAIで自動デジタル化",
    template: "%s | SwimHub Scanner",
  },
  description:
    "手書きの水泳タイム記録表を撮影するだけでAIが自動解析。デジタルデータに変換して記録管理を効率化します。",
  keywords: [
    "水泳",
    "記録表",
    "手書き",
    "デジタル化",
    "AI",
    "OCR",
    "スイミング",
    "タイム記録",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://scanner.swim-hub.app",
    siteName: "SwimHub Scanner",
    title: "SwimHub Scanner - 手書きタイム記録表をAIで自動デジタル化",
    description:
      "手書きの水泳タイム記録表を撮影するだけでAIが自動解析。デジタルデータに変換して記録管理を効率化します。",
  },
  twitter: {
    card: "summary",
    title: "SwimHub Scanner - 手書きタイム記録表をAIで自動デジタル化",
    description:
      "手書きの水泳タイム記録表を撮影するだけでAIが自動解析。デジタルデータに変換して記録管理を効率化します。",
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
    <html lang={locale} className="h-full">
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
