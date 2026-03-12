"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Heart,
  ShieldCheck,
  FileText,
  HelpCircle,
  Mail,
  ExternalLink,
} from "lucide-react";

const familyServices = [
  {
    name: "SwimHub",
    description: "水泳チームの総合管理",
    href: "https://swim-hub.app",
    iconSrc: "/swimhub-icon.png",
    current: false,
  },
  {
    name: "SwimHub Timer",
    description: "動画にタイムをオーバーレイ",
    href: "https://timer.swim-hub.app",
    iconSrc: "/timer-icon.png",
    current: false,
  },
  {
    name: "SwimHub Scanner",
    description: "手書きの記録表をAIで解析",
    href: "https://scanner.swim-hub.app",
    iconSrc: "/icon.png",
    current: true,
  },
];

const footerLinks = [
  {
    name: "プライバシーポリシー",
    href: "/privacy",
    icon: ShieldCheck,
    external: false,
  },
  {
    name: "利用規約",
    href: "/terms",
    icon: FileText,
    external: false,
  },
  {
    name: "サポート",
    href: "/support",
    icon: HelpCircle,
    external: false,
  },
  {
    name: "お問い合わせ",
    href: "https://swim-hub.app/contact",
    icon: Mail,
    external: true,
  },
];

export function SwimHubFamilyFooter() {
  const params = useParams();
  const locale = (params.locale as string) || "ja";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左側：システム情報 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-6 h-6 flex items-center justify-center mr-2">
                <Image
                  src="/icon.png"
                  alt="SwimHub Scanner"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                SwimHub Scanner
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              手書きの記録表をAIで解析してデジタル化できるWebアプリケーション
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 mx-1" />
              <span>for swimmers</span>
            </div>
          </div>

          {/* 右側：法的情報とサポート */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              サポート・情報
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {footerLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    href={`/${locale}${link.href}`}
                    className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>

        {/* SwimHub サービス一覧 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 tracking-wide mb-4">
            SwimHub サービス一覧
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {familyServices.map((service) =>
              service.current ? (
                <div
                  key={service.name}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200"
                >
                  <Image
                    src={service.iconSrc}
                    alt={service.name}
                    width={128}
                    height={128}
                    className="w-32 h-32 shrink-0 object-contain"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-700">
                        {service.name}
                      </span>
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        利用中
                      </span>
                    </div>
                    <p className="text-xs text-blue-600/70 truncate">
                      {service.description}
                    </p>
                  </div>
                </div>
              ) : (
                <a
                  key={service.name}
                  href={service.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors duration-200 group"
                >
                  <Image
                    src={service.iconSrc}
                    alt={service.name}
                    width={128}
                    height={128}
                    className="w-32 h-32 shrink-0 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {service.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {service.description}
                    </p>
                  </div>
                </a>
              )
            )}
          </div>
        </div>

        {/* 下部：コピーライトとバージョン情報 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <div className="flex flex-col items-center sm:items-start space-y-1">
              <div className="text-sm text-gray-500">
                © {currentYear} SwimHub Scanner. All rights reserved.
              </div>
              <div className="text-xs text-gray-400">
                
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>Last updated: {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
