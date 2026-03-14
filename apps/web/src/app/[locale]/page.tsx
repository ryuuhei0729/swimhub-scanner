"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScannerFlow } from "@/components/scanner/ScannerFlow";
import type { Step } from "@/components/scanner/ScannerFlow";
import { SwimHubFamilyFooter } from "@/components/layout/SwimHubFamilyFooter";

const STEPS = [
  { key: "upload" as const, label: "画像アップロード", num: 1 },
  { key: "scanning" as const, label: "AI解析", num: 2 },
  { key: "result" as const, label: "結果確認・出力", num: 3 },
];

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium">
      {STEPS.map((s, i) => {
        const isActive = s.key === currentStep;
        return (
          <span key={s.key} className="flex items-center">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5" />}
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

  return (
    <AuthGuard>
      <div className="min-h-dvh flex flex-col">
        <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-2 sm:px-4 lg:px-8 flex items-center justify-between relative z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="SwimHub Scanner"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="text-lg font-bold tracking-tight">SwimHub Scanner</span>
            </div>
            <StepIndicator currentStep={currentStep} />
          </div>
          <UserMenu />
        </header>
        <main className="flex-1">
          <ScannerFlow onStepChange={setCurrentStep} />
        </main>
        <SwimHubFamilyFooter />
      </div>
    </AuthGuard>
  );
}
