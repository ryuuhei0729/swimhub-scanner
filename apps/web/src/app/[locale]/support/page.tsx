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
  return { title: t.support.metaTitle };
}

export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = i18nResources[locale].translation;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">{t.support.title}</h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t.support.faqTitle}
          </h2>
          <div className="mt-4 space-y-4">
            {t.support.faqItems.map((item, i) => (
              <div key={i}>
                <h3 className="font-medium text-gray-900">
                  {item.question}
                </h3>
                <p className="mt-1">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">{t.support.contactTitle}</h2>
          <p className="mt-2">
            {t.support.contactBody}
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${t.support.contactEmail}`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {t.support.contactEmail}
            </a>
          </p>
          <p className="mt-2 text-gray-500">
            {t.support.responseNote}
          </p>
        </section>
      </div>
    </main>
  );
}
