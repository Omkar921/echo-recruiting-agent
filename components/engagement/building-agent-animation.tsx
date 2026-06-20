"use client";

import { useEffect, useState } from "react";
import { agentAvatarLabel } from "@/lib/agent/display-name";
import { cormorant } from "@/lib/fonts";
import anim from "./ui-animations.module.css";

const STEPS = [
  "Reading what you told us…",
  "Working out how your Écho should sound…",
  "Shaping its personality…",
  "Almost ready…",
];

type BuildingAgentAnimationProps = {
  steps?: string[];
};

export function BuildingAgentAnimation({ steps = STEPS }: BuildingAgentAnimationProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 900);

    const progressTimer = window.setInterval(() => {
      setProgress((p) => Math.min(p + 3 + Math.random() * 4, 94));
    }, 420);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
  }, [steps.length]);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          className={`absolute inset-0 rounded-full border border-foreground/20 ${anim.pulseRing}`}
          aria-hidden
        />
        <span
          className={`absolute inset-2 rounded-full border border-foreground/15 ${anim.pulseRingDelayed}`}
          aria-hidden
        />
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised ${anim.echoMarkRing}`}
        >
          <span
            className={`${cormorant.className} ${anim.echoMark}`}
            aria-label="Écho"
          >
            {agentAvatarLabel()}
          </span>
        </div>
      </div>

      <p className="mt-8 text-sm font-medium">{steps[step]}</p>
      <p className="mt-1 text-xs text-muted">Configuring your company&apos;s Écho</p>

      <div className="mt-8 w-full max-w-xs">
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full bg-accent transition-all duration-500 ease-out ${anim.shimmerBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">
          Step {step + 1} of {steps.length}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2 max-sm:hidden">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`rounded-full border px-2.5 py-1 text-[10px] transition-all duration-300 ${
              i <= step
                ? "border-foreground/30 bg-surface-raised text-foreground"
                : "border-border text-muted opacity-50"
            }`}
          >
            {i < step ? "✓" : i + 1}. {label.replace("…", "").trim()}
          </span>
        ))}
      </div>
    </div>
  );
}
