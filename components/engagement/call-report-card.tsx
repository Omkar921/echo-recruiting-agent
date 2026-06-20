"use client";

import type { CallReport, CallReportVerdict } from "@/lib/types";

const VERDICT_LABEL: Record<CallReportVerdict, { label: string; className: string }> = {
  strong_yes: { label: "Strong yes", className: "text-green-400 bg-green-400/10 border-green-400/30" },
  yes: { label: "Yes — advance", className: "text-green-300 bg-green-400/10 border-green-400/20" },
  maybe: { label: "Maybe", className: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" },
  no: { label: "No", className: "text-red-300 bg-red-400/10 border-red-400/20" },
  strong_no: { label: "Strong no", className: "text-red-400 bg-red-400/10 border-red-400/30" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-400";
  if (score >= 65) return "bg-accent";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

type CallReportCardProps = {
  report: CallReport | null;
  generating?: boolean;
};

export function CallReportCard({ report, generating }: CallReportCardProps) {
  if (generating && !report) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-8 text-center text-sm text-muted">
        Generating scorecard…
      </div>
    );
  }

  if (!report) return null;

  const verdict = VERDICT_LABEL[report.verdict] ?? VERDICT_LABEL.maybe;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[10px] uppercase tracking-wide text-muted">Call report</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">{report.candidateName}</h2>
            <p className="text-sm text-muted">
              {report.roleName} · {report.callPurposeLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums">{report.overallScore}</p>
              <p className="text-[10px] text-muted">Overall</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${verdict.className}`}
            >
              {verdict.label}
            </span>
          </div>
        </div>
      </div>

      {generating ? (
        <div className="px-5 py-4 text-center text-sm text-muted">Updating scorecard…</div>
      ) : (
        <div className="space-y-5 px-5 py-4">
          <p className="text-sm leading-relaxed">{report.summary}</p>

          {report.nextRoundLikelihood !== undefined && (
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Next round likelihood</p>
                <p className="text-lg font-semibold tabular-nums text-accent">
                  {report.nextRoundLikelihood}%
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${scoreColor(report.nextRoundLikelihood)}`}
                  style={{ width: `${report.nextRoundLikelihood}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Scored dimensions</p>
            <ul className="mt-3 space-y-3">
              {report.dimensions.map((dim) => (
                <li key={dim.key}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{dim.label}</span>
                    <span className="tabular-nums text-muted">{dim.score}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${scoreColor(dim.score)}`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{dim.summary}</p>
                </li>
              ))}
            </ul>
          </div>

          {report.highlights.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Highlights</p>
              <ul className="mt-2 space-y-1 text-sm">
                {report.highlights.map((item) => (
                  <li key={item} className="text-foreground/90">
                    &ldquo;{item}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Strengths</p>
              <ul className="mt-2 space-y-1 text-sm text-green-300/90">
                {report.strengths.map((item) => (
                  <li key={item}>+ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Concerns</p>
              <ul className="mt-2 space-y-1 text-sm text-red-300/90">
                {report.concerns.map((item) => (
                  <li key={item}>− {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-accent">Recommendation</p>
            <p className="mt-1 text-sm">{report.recommendation}</p>
          </div>

          <p className="text-[10px] text-muted">
            {report.turnCount} candidate {report.turnCount === 1 ? "reply" : "replies"} ·{" "}
            {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
