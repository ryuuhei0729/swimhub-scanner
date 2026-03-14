import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "利用規約 | SwimHub Scanner",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />

      <h1 className="mt-6 text-2xl font-bold">利用規約</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年2月23日</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">第1条（適用）</h2>
          <p className="mt-2">
            本利用規約（以下「本規約」）は、SwimHub
            Scanner（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第2条（サービス内容）</h2>
          <p className="mt-2">
            本サービスは、手書きのタイム記録表を撮影・アップロードし、AI技術を用いて自動的にデジタルデータに変換するサービスです。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第3条（アカウント）</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>
              ユーザーは、Google または Apple のアカウントを使用して本サービスにログインします。
            </li>
            <li>ユーザーは、自己のアカウントを適切に管理する責任を負います。</li>
            <li>アカウントの第三者への譲渡・貸与は禁止します。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第4条（禁止事項）</h2>
          <p className="mt-2">ユーザーは、以下の行為を行ってはなりません。</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>他のユーザーまたは第三者の権利を侵害する行為</li>
            <li>不正アクセスまたはこれを試みる行為</li>
            <li>本サービスを商用目的で無断利用する行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第5条（利用制限）</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>本サービスでは、1日あたりの解析回数に制限を設けています。</li>
            <li>
              将来的に有料プランを提供する場合があります。その際は事前に利用規約を更新し通知します。
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第6条（免責事項）</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>
              AI
              による変換結果の正確性を保証するものではありません。ユーザーは変換結果を確認の上ご利用ください。
            </li>
            <li>本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</li>
            <li>本サービスは予告なく変更・停止する場合があります。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第7条（知的財産権）</h2>
          <p className="mt-2">
            本サービスに関する知的財産権は運営者に帰属します。ユーザーがアップロードしたデータの権利はユーザーに帰属します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第8条（規約の変更）</h2>
          <p className="mt-2">
            運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に掲示した時点で効力を生じます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">第9条（準拠法・管轄裁判所）</h2>
          <p className="mt-2">
            本規約は日本法に準拠し、本サービスに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </main>
  );
}
