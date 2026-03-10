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
  return { title: t.terms.metaTitle };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">{t.terms.title}</h1>
      <p className="mt-2 text-sm text-gray-500">{t.terms.lastUpdated}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article1Title}</h2>
          <p className="mt-2">{t.terms.article1Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article2Title}</h2>
          <p className="mt-2">{t.terms.article2Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article3Title}</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {t.terms.article3Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article4Title}</h2>
          <p className="mt-2">{t.terms.article4Body}</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {t.terms.article4Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article5Title}</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {t.terms.article5Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article6Title}</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {t.terms.article6Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article7Title}</h2>
          <p className="mt-2">{t.terms.article7Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article8Title}</h2>
          <p className="mt-2">{t.terms.article8Body}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.terms.article9Title}</h2>
          <p className="mt-2">{t.terms.article9Body}</p>
        </section>
      </div>
    </main>
  );
}
