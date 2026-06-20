"use client";

import anim from "./ui-animations.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { matchLabel } from "@/components/shared/match-labels";
import type { AgentIntent, MockCandidateProfile } from "@/lib/types";

const BADGE_COLOR: Record<MockCandidateProfile["matchLabel"], string> = {
  strong: "bg-green-400/15 text-green-300 border-green-400/30",
  partial: "bg-yellow-400/15 text-yellow-200 border-yellow-400/30",
  stretch: "bg-orange-400/15 text-orange-200 border-orange-400/30",
  unknown: "bg-muted/20 text-muted border-border",
};

type CandidatePickerProps = {
  intent: AgentIntent;
  candidates: MockCandidateProfile[];
  selectedId: string | null;
  onSelect: (candidate: MockCandidateProfile) => void;
  onStart: () => void;
  starting?: boolean;
};

export function CandidatePicker({
  intent,
  candidates,
  selectedId,
  onSelect,
  onStart,
  starting,
}: CandidatePickerProps) {
  const selected = candidates.find((c) => c.id === selectedId);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Shortlist ready"
        title="Choose who to pursue"
        subtitle={`${candidates.length} candidates sourced for ${intent.roleName}. Pick one — you'll preview the live call as them.`}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {candidates.map((c) => {
          const isSelected = c.id === selectedId;
          const badgeColor = BADGE_COLOR[c.matchLabel];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={`rounded-xl border p-4 text-left transition-all duration-200 ${anim.fadeSlideUp} ${
                isSelected
                  ? "scale-[1.01] border-accent bg-accent/5 ring-1 ring-accent/40"
                  : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.headline}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${badgeColor}`}>
                  {c.matchScore}%
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted">{c.highlight}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted">
                <span>{c.location}</span>
                <span>·</span>
                <span>{matchLabel(c.matchLabel)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted">You selected</p>
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted">{selected.experience}</p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="w-full shrink-0 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-40 sm:w-auto"
          >
            {starting ? "Preparing outreach…" : `Start call as ${selected.name.split(" ")[0]}`}
          </button>
        </div>
      )}
    </div>
  );
}
