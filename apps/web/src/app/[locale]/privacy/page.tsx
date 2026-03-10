import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { i18nResources, supportedLocales, type SupportedLocale } from "@swimhub-scanner/i18n";

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;
  return { title: t.privacy.metaTitle };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">{t.privacy.title}</h1>
      <p className="mt-2 text-sm text-gray-500">{t.privacy.lastUpdated}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec1Title}</h2>
          <p className="mt-2">{t.privacy.sec1Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec2Title}</h2>
          <p className="mt-2">{t.privacy.sec2Body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {t.privacy.sec2Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec3Title}</h2>
          <p className="mt-2">{t.privacy.sec3Body}</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {t.privacy.sec3Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec4Title}</h2>
          <p className="mt-2">{t.privacy.sec4Body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {t.privacy.sec4Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-2">{t.privacy.sec4Note}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec5Title}</h2>
          <p className="mt-2">{t.privacy.sec5Body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {t.privacy.sec5Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec6Title}</h2>
          <p className="mt-2">{t.privacy.sec6Body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {t.privacy.sec6Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-2">{t.privacy.sec6Note}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec7Title}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {t.privacy.sec7Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec8Title}</h2>
          <p className="mt-2">{t.privacy.sec8Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec9Title}</h2>
          <p className="mt-2">{t.privacy.sec9Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.privacy.sec10Title}</h2>
          <p className="mt-2">{t.privacy.sec10Body}</p>
        </section>
      </div>
    </main>
  );
}
