import type { MetadataRoute } from "next";
import { supportedLocales } from "@swimhub-scanner/i18n";

export const dynamic = "force-static";

const baseUrl = "https://scanner.swim-hub.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return supportedLocales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: locale === "ja" ? 1 : 0.9,
    },
    {
      url: `${baseUrl}/${locale}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/${locale}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/${locale}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/${locale}/support`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ]);
}
