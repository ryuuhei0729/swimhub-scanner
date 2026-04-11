import Link from "next/link";

const FAMILY_APPS = [
  {
    name: "SwimHub",
    description: "練習・大会・チーム管理",
    url: "https://swim-hub.app",
  },
  {
    name: "SwimHub Scanner",
    description: "AI タイムシート読み取り",
    url: "https://scanner.swim-hub.app",
    current: true,
  },
  {
    name: "SwimHub Timer",
    description: "水泳タイマー",
    url: "https://timer.swim-hub.app",
  },
];

export function SwimHubFamilyFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-6 px-4">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-xs font-medium text-gray-500 mb-3">
          SwimHub Family
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          {FAMILY_APPS.map((app) =>
            app.current ? (
              <span key={app.name} className="font-medium text-primary-600">
                {app.name}
              </span>
            ) : (
              <Link
                key={app.name}
                href={app.url}
                className="hover:text-primary-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {app.name}
              </Link>
            ),
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
          <Link href="/ja/terms" className="hover:text-gray-600 transition-colors">
            利用規約
          </Link>
          <span>·</span>
          <Link href="/ja/privacy" className="hover:text-gray-600 transition-colors">
            プライバシーポリシー
          </Link>
          <span>·</span>
          <Link href="/ja/support" className="hover:text-gray-600 transition-colors">
            サポート
          </Link>
        </div>
      </div>
    </footer>
  );
}
