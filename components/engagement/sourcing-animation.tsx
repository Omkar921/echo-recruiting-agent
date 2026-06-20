"use client";

import { useEffect, useRef, useState } from "react";
import anim from "./ui-animations.module.css";
import { matchLabel } from "@/components/shared/match-labels";
import type { MockCandidateProfile } from "@/lib/types";

type SourcingAnimationProps = {
  agentName: string;
  roleName: string;
  candidates: MockCandidateProfile[];
  matched: MockCandidateProfile;
  onComplete: () => void;
  minDurationMs?: number;
  instant?: boolean;
};

const NETWORKS = ["LinkedIn", "GitHub", "AngelList", "Wellfound", "internal DB"];

export function SourcingAnimation({
  agentName,
  roleName,
  candidates,
  matched,
  onComplete,
  minDurationMs = 4800,
  instant = false,
}: SourcingAnimationProps) {
  const duration = instant ? 600 : minDurationMs;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "matched">("scanning");
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [networkIdx, setNetworkIdx] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const tick = setInterval(() => {
      setActiveIdx((i) => (i + 1) % candidates.length);
      setStep((s) => s + 1);
      setNetworkIdx((i) => (i + 1) % NETWORKS.length);
    }, 550);

    const progressTick = setInterval(() => {
      setProgress((p) => Math.min(p + 2 + Math.random() * 5, 92));
    }, 280);

    const showMatch = setTimeout(() => {
      clearInterval(tick);
      clearInterval(progressTick);
      setPhase("matched");
      setProgress(100);
    }, duration);

    const done = setTimeout(() => {
      onCompleteRef.current();
    }, duration + (instant ? 400 : 1000));

    return () => {
      clearInterval(tick);
      clearInterval(progressTick);
      clearTimeout(showMatch);
      clearTimeout(done);
    };
  }, [candidates.length, duration, instant]);

  const active = candidates[activeIdx] ?? candidates[0];
  const profileCount = 120 + step * 37 + activeIdx * 11;

  return (
    <div className="mx-auto w-full text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span
          className={`absolute inset-0 rounded-full border border-accent/25 ${anim.pulseRing}`}
          aria-hidden
        />
        <span
          className={`absolute inset-1 rounded-full border border-foreground/10 ${anim.pulseRingDelayed}`}
          aria-hidden
        />
        <div
          className={`h-10 w-10 rounded-full border-2 border-border border-t-accent ${anim.spinner}`}
        />
      </div>

      <p className={`mt-6 text-sm font-medium ${anim.fadeSlideUp}`}>
        {phase === "scanning"
          ? `${agentName} is sourcing worldwide…`
          : "Shortlist ready — review matches below"}
      </p>
      <p className="mt-1 text-xs text-muted">
        {phase === "scanning" ? (
          <>
            Scanning <span className="text-foreground">{NETWORKS[networkIdx]}</span> for{" "}
            <span className="text-foreground">{roleName}</span>
          </>
        ) : (
          <>
            {matched.matchScore}% top match · <span className="text-foreground">{matched.name}</span>
          </>
        )}
      </p>

      <div className="mx-auto mt-6 w-full max-w-md">
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full bg-accent transition-all duration-300 ${phase === "scanning" ? anim.shimmerBar : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {phase === "scanning" && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">
            {profileCount.toLocaleString()} profiles scanned
          </p>
        )}
      </div>

      <div className="relative mt-8 space-y-2 overflow-hidden rounded-xl border border-border bg-surface/40 p-3">
        {phase === "scanning" && (
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-accent/20 to-transparent ${anim.scanLine}`}
            aria-hidden
          />
        )}

        {(phase === "matched" ? [matched] : candidates.slice(0, 4)).map((c, i) => {
          const isActive = phase === "matched" || c.id === active?.id;
          const isMatch = c.id === matched.id && phase === "matched";
          return (
            <div
              key={c.id}
              className={`rounded-xl border px-4 py-3 text-left transition-all duration-300 ${anim.fadeSlideUp} ${
                isMatch
                  ? "scale-[1.02] border-foreground bg-surface-raised shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                  : isActive
                    ? "border-accent/40 bg-surface opacity-100"
                    : "border-border bg-surface opacity-45"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.headline}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                    isMatch ? "bg-accent text-black" : "border border-border text-muted"
                  }`}
                >
                  {isMatch ? "Top match" : matchLabel(c.matchLabel)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted">{c.highlight}</p>
              {phase === "scanning" && isActive && !isMatch && (
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-accent">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full bg-accent ${anim.pulseRing}`} />
                  Reviewing profile…
                </p>
              )}
            </div>
          );
        })}
      </div>

      {phase === "scanning" && (
        <p className="mt-5 text-xs text-muted">
          Ranking against your requirements · match {Math.min(62 + step * 3, 97)}%
        </p>
      )}
    </div>
  );
}
