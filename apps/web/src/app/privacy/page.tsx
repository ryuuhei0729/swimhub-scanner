import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "プライバシーポリシー | SwimHub Scanner",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">プライバシーポリシー</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年2月23日</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. はじめに</h2>
          <p className="mt-2">
            SwimHub Scanner（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、本サービスにおける個人情報の取り扱いについて説明します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 収集する情報</h2>
          <p className="mt-2">本サービスでは、以下の情報を収集します。</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>アカウント情報:</strong> Google または Apple
              アカウントから提供される名前、メールアドレス、プロフィール画像
            </li>
            <li>
              <strong>アップロードデータ:</strong>{" "}
              ユーザーがスキャンのためにアップロードした画像データ
            </li>
            <li>
              <strong>利用状況:</strong> サービスの利用日時、利用回数などの統計情報
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 情報の利用目的</h2>
          <p className="mt-2">収集した情報は、以下の目的で利用します。</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>本サービスの提供・運営</li>
            <li>ユーザー認証およびアカウント管理</li>
            <li>AI によるタイム記録表の解析・変換処理</li>
            <li>サービスの改善・新機能の開発</li>
            <li>利用状況の分析・統計処理</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 第三者への提供</h2>
          <p className="mt-2">
            以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護に必要な場合</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 外部サービスの利用</h2>
          <p className="mt-2">本サービスでは、以下の外部サービスを利用しています。</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>Google / Apple 認証:</strong> ログイン機能の提供
            </li>
            <li>
              <strong>Google AI (Gemini):</strong> 画像解析・データ変換処理
            </li>
            <li>
              <strong>Supabase:</strong> データの保存・管理
            </li>
          </ul>
          <p className="mt-2">
            各外部サービスのプライバシーポリシーについては、各サービス提供元のサイトをご確認ください。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. データの保管と削除</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>アップロードされた画像データは、処理完了後に速やかに削除されます。</li>
            <li>アカウント情報は、ユーザーがアカウントを削除するまで保管されます。</li>
            <li>アカウント削除を希望される場合は、お問い合わせください。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Cookie について</h2>
          <p className="mt-2">
            本サービスでは、認証状態の維持のために Cookie
            を使用しています。ブラウザの設定により Cookie
            を無効にすることができますが、本サービスの一部機能が利用できなくなる場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. ポリシーの変更</h2>
          <p className="mt-2">
            本ポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は、本サービス上で通知します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. お問い合わせ</h2>
          <p className="mt-2">
            本ポリシーに関するお問い合わせは、本サービス内のお問い合わせ機能よりご連絡ください。
          </p>
        </section>
      </div>
    </main>
  );
}
