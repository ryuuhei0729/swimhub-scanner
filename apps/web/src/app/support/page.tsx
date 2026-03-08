import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "サポート | SwimHub Scanner",
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">サポート</h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            よくある質問 (FAQ)
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">
                Q. スキャンした結果が正確ではありません
              </h3>
              <p className="mt-1">
                鮮明な画像を使用してください。手書きの文字がはっきり読み取れる画像をお勧めします。撮影時は記録表が画像全体に大きく写るようにしてください。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Q. 1日の利用回数に制限はありますか？
              </h3>
              <p className="mt-1">
                無料プランでは1日あたりの解析回数に制限があります。Premiumプランにアップグレードすると、無制限でご利用いただけます。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Q. 対応している記録表の形式は？
              </h3>
              <p className="mt-1">
                アプリ内で提供しているテンプレート形式に対応しています。テンプレートはアプリのスキャン画面からPDFまたは画像としてダウンロードできます。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Q. アカウントを削除したい
              </h3>
              <p className="mt-1">
                アプリ内のアカウント画面から「アカウントを削除」ボタンで削除できます。削除するとすべてのデータが完全に削除されます。
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">お問い合わせ</h2>
          <p className="mt-2">
            上記で解決しない場合は、以下のメールアドレスまでお気軽にお問い合わせください。
          </p>
          <p className="mt-2">
            <a
              href="mailto:support@swim-hub.app"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              support@swim-hub.app
            </a>
          </p>
          <p className="mt-2 text-gray-500">
            通常2営業日以内にご返信いたします。
          </p>
        </section>
      </div>
    </main>
  );
}
