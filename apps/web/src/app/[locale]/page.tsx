"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";
import type { Step } from "@/components/scanner/ScannerFlow";
import { SwimHubFamilyFooter } from "@/components/layout/SwimHubFamilyFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const { t } = useTranslation();

  const STEPS = [
    { key: "upload" as const, label: t("scanner.steps.upload"), num: 1 },
    { key: "scanning" as const, label: t("scanner.steps.scanning"), num: 2 },
    { key: "result" as const, label: t("scanner.steps.result"), num: 3 },
  ];

  return (
    <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium">
      {STEPS.map((s, i) => {
        const isActive = s.key === currentStep;
        return (
          <span key={s.key} className="flex items-center">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5" />
            )}
            <span
              className={`px-2.5 py-1 rounded-md ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-surface-raised text-muted-foreground"
              }`}
            >
              {s.num}. {s.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  return (
    <AuthGuard>
      <div className="min-h-dvh flex flex-col">
        <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-2 sm:px-4 lg:px-8 flex items-center justify-between relative z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src="/icon.png" alt="SwimHub Scanner" width={40} height={40} className="w-10 h-10 object-contain" />
              <span className="text-lg font-bold tracking-tight">SwimHub Scanner</span>
            </div>
            <StepIndicator currentStep={currentStep} />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1">
          <ScannerFlow onStepChange={setCurrentStep} />
        </main>
        <SwimHubFamilyFooter />
      </div>
    </AuthGuard>
  );
}
