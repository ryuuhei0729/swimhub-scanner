import Image from "next/image";
import { ExternalLink } from "lucide-react";

const services = [
  {
    name: "SwimHub",
    description: "水泳チームの総合管理",
    href: "https://swim-hub.app",
    iconSrc: "/swimhub-icon.png",
    current: false,
  },
  {
    name: "SwimHub Timer",
    description: "動画からタイムを自動計測",
    href: "https://timer.swim-hub.app",
    iconSrc: "/timer-icon.png",
    current: false,
  },
  {
    name: "SwimHub Scanner",
    description: "手書き記録表をAIでデジタル化",
    href: "https://scanner.swim-hub.app",
    iconSrc: "/icon.png",
    current: true,
  },
];

export function SwimHubFamilyFooter() {
  return (
    <footer className="border-t border-border bg-surface/50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">
          SwimHub サービス一覧
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {services.map((service) =>
            service.current ? (
              <div
                key={service.name}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15"
              >
                <Image
                  src={service.iconSrc}
                  alt={service.name}
                  width={64}
                  height={64}
                  className="w-8 h-8 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-primary">
                      {service.name}
                    </span>
                    <span className="text-[9px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                      利用中
                    </span>
                  </div>
                  <p className="text-[11px] text-primary/50 truncate">
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-raised border border-border hover:bg-accent/50 hover:border-border/80 transition-colors duration-200 group"
              >
                <Image
                  src={service.iconSrc}
                  alt={service.name}
                  width={64}
                  height={64}
                  className="w-8 h-8 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
                      {service.name}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40 group-hover:text-muted-foreground/60" />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 truncate">
                    {service.description}
                  </p>
                </div>
              </a>
            )
          )}
        </div>
      </div>
    </footer>
  );
}
