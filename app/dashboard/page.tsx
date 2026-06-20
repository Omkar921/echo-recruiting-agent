"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaleSessionPurge } from "@/hooks/use-stale-session-purge";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { useEchoStore } from "@/lib/session/store";
import { buildAgentSessionKey, isAgentReady, isEngagementForSession } from "@/lib/session/keys";
import { AgentProfileCard } from "@/components/engagement/agent-profile-card";
import { useAgentDisplayName } from "@/hooks/use-agent-display-name";

const PIPELINE = [
  { key: "agent", label: "Agent ready" },
  { key: "role", label: "Role defined" },
  { key: "sourced", label: "Sourced" },
  { key: "live", label: "Live" },
] as const;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-medium leading-snug" title={value}>
        {value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const profile = useEchoStore((s) => s.profile);
  const companyContext = useEchoStore((s) => s.companyContext);
  const persona = useEchoStore((s) => s.persona);
  const agentName = useAgentDisplayName();
  const intent = useEchoStore((s) => s.intent);
  const engagementDraft = useEchoStore((s) => s.engagementDraft);
  const matchedCandidate = useEchoStore((s) => s.matchedCandidate);
  const conversation = useEchoStore((s) => s.conversation);
  const resetAll = useEchoStore((s) => s.resetAll);
  const startNewCompany = useEchoStore((s) => s.startNewCompany);

  const agentReady = isAgentReady(companyContext, persona);
  const agentSessionKey = buildAgentSessionKey(
    profile?.companyName,
    companyContext,
    persona,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!agentReady) {
      router.replace(profile ? "/onboarding" : "/login");
    }
  }, [hydrated, agentReady, profile, router]);

  useStaleSessionPurge(agentSessionKey);

  const validIntent =
    intent && agentSessionKey && isEngagementForSession(intent, agentSessionKey)
      ? intent
      : null;

  const activeDraft =
    engagementDraft?.sessionKey === agentSessionKey ? engagementDraft : null;

  if (!hydrated) return null;
  if (!agentReady || !persona || !companyContext) return null;

  const agentMessages = conversation.messages.filter((m) => m.role === "agent").length;
  const candidateReplies = conversation.messages.filter((m) => m.role === "candidate").length;
  const hasDraft = Boolean(activeDraft && activeDraft.pagePhase !== "conversation");
  const hasEngagement = Boolean(validIntent) || hasDraft;
  const isLive = Boolean(validIntent) && conversation.messages.length > 0;
  const isCompleted = conversation.status === "completed";
  const callReport = useEchoStore((s) => s.callReport);
  const displayRoleName = validIntent?.roleName ?? activeDraft?.roleName;
  const pipelineStep = isLive ? 3 : hasEngagement ? 2 : 0;

  return (
    <PageShell width="xl">
      <DashboardNav
        profile={profile}
        onNewCompany={() => {
          startNewCompany();
          router.push("/login?fresh=1");
        }}
        onLogout={() => {
          resetAll();
          router.push("/");
        }}
      />

      <div className="mt-8 flex min-w-0 flex-1 flex-col gap-8 lg:mt-10">
        <div className="space-y-4">
          <BackLink href="/onboarding" label="Edit company" />
          <PageHeader
          eyebrow="Recruiting dashboard"
          title={`Hi ${profile?.name?.split(" ")[0] ?? "there"}`}
          subtitle={companyContext.whoWeAre}
          subtitleClassName="line-clamp-3"
          />
        </div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Agent" value={agentName} />
              <StatCard label="Active role" value={displayRoleName ?? "—"} />
              <StatCard label="Outreach sent" value={String(agentMessages)} />
              <StatCard label="Replies" value={String(candidateReplies)} />
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Pipeline</p>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {PIPELINE.map((step, i) => (
                  <div key={step.key} className="min-w-0">
                    <div
                      className={`h-1.5 rounded-full ${i <= pipelineStep ? "bg-accent" : "bg-border"}`}
                    />
                    <p
                      className={`mt-2.5 text-[11px] leading-snug ${i <= pipelineStep ? "text-foreground" : "text-muted"}`}
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {isLive && matchedCandidate && (
              <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Active engagement</p>
                    <p className="truncate text-base font-medium">{matchedCandidate.name}</p>
                    <p className="text-sm text-muted">
                      {validIntent?.roleName} · {matchedCandidate.matchScore}% match
                    </p>
                    <p className="text-xs capitalize text-muted">
                      {isCompleted ? "Call complete — scorecard ready" : conversation.status.replace("_", " ")}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/agent"
                    className="shrink-0 self-start rounded-full bg-accent px-5 py-2.5 text-center text-sm font-medium text-black hover:opacity-90 sm:self-center"
                  >
                    {isCompleted ? (callReport ? "View report →" : "View call →") : "Resume call →"}
                  </Link>
                </div>
              </div>
            )}

            {!hasEngagement && (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 px-5 py-8 text-center sm:px-6">
                <p className="text-sm font-medium">No active role yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Define a role, source candidates, pick who to pursue, then preview the live call.
                </p>
                <Link
                  href="/dashboard/agent"
                  className="mt-5 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-black hover:opacity-90"
                >
                  Start hiring →
                </Link>
              </div>
            )}

            {hasEngagement && !isLive && (
              <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                <p className="font-medium">
                  {validIntent ? "Role saved" : "Engagement in progress"}: {displayRoleName}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {hasDraft && !validIntent
                    ? "Pick up where you left off — sourcing, candidate selection, or call preview."
                    : "Continue sourcing and pick a candidate to start the preview call."}
                </p>
                <Link
                  href="/dashboard/agent"
                  className="mt-4 inline-block text-sm text-foreground underline-offset-2 hover:underline"
                >
                  Continue →
                </Link>
              </div>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-8">
            <AgentProfileCard agentName={agentName} persona={persona} />

            <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
              {[
                { icon: "🎙️", label: "Voice + mic preview" },
                { icon: "📷", label: "Camera call feel" },
                { icon: "🧠", label: "Live agent reasoning" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex w-5 shrink-0 justify-center">{c.icon}</span>
                  <span className="leading-snug">{c.label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/agent"
              className="block w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-center text-sm font-medium transition hover:border-foreground/40"
            >
              {isLive ? "Open live call" : hasEngagement ? "Continue engagement" : "New engagement"}
            </Link>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
