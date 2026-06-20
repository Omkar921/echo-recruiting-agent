"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BuildingAgentAnimation } from "@/components/engagement/building-agent-animation";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { PhaseLayout } from "@/components/layout/phase-layout";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { formatAgentDisplayName } from "@/lib/agent/display-name";
import { contextsEqual } from "@/lib/session/align";
import { isAgentReady } from "@/lib/session/keys";
import { useEchoStore } from "@/lib/session/store";

type FieldKey = "whoWeAre" | "culture" | "profilesWeHire" | "tone";

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "whoWeAre",
    label: "Who you are",
    placeholder: "Series A robotics startup building warehouse automation",
  },
  {
    key: "culture",
    label: "Culture",
    placeholder: "Fast-paced, scrappy, no bureaucracy, everyone wears a few hats",
  },
  {
    key: "profilesWeHire",
    label: "Profiles you hire",
    placeholder:
      "Senior engineers with startup experience, hands-on builders, comfortable with ambiguity",
  },
  {
    key: "tone",
    label: "Tone",
    placeholder: "Casual, direct, a bit informal — not corporate",
  },
];

const BUILD_STEPS = [
  "Reading what you told us...",
  "Working out how your Écho should sound...",
  "Shaping its personality...",
  "Almost ready...",
];

const emptyValues = (): Record<FieldKey, string> => ({
  whoWeAre: "",
  culture: "",
  profilesWeHire: "",
  tone: "",
});

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const setCompanyContext = useEchoStore((s) => s.setCompanyContext);
  const setCompanyIntelligence = useEchoStore((s) => s.setCompanyIntelligence);
  const setPersona = useEchoStore((s) => s.setPersona);
  const profile = useEchoStore((s) => s.profile);
  const companyContext = useEchoStore((s) => s.companyContext);
  const persona = useEchoStore((s) => s.persona);
  const resetEngagement = useEchoStore((s) => s.resetEngagement);

  const [values, setValues] = useState<Record<string, string>>(emptyValues);
  const [suggestedFields, setSuggestedFields] = useState<Set<FieldKey>>(new Set());
  const [companyUrl, setCompanyUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchSource, setFetchSource] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const hasExistingAgent = isAgentReady(companyContext, persona);

  useEffect(() => {
    if (!hydrated) return;
    if (!companyContext) {
      setValues(emptyValues());
      setSuggestedFields(new Set());
      setFetchSource(null);
      setCompanyUrl("");
      setSeeded(false);
    }
  }, [hydrated, companyContext]);

  useEffect(() => {
    if (!hydrated || seeded || !companyContext) return;
    const allEmpty = FIELDS.every((f) => !(values[f.key] ?? "").trim());
    if (!allEmpty) return;
    setValues({
      whoWeAre: companyContext.whoWeAre,
      culture: companyContext.culture,
      profilesWeHire: companyContext.profilesWeHire,
      tone: companyContext.tone,
    });
    setSeeded(true);
  }, [hydrated, companyContext, seeded, values]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) router.replace("/login");
  }, [hydrated, profile, router]);

  const isValid = FIELDS.every((f) => (values[f.key] ?? "").trim().length > 0);

  async function handleUrlFetch() {
    if (!companyUrl.trim() || fetching) return;

    setFetching(true);
    setError(null);
    setFetchSource(null);

    try {
      const res = await fetch("/api/company/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: companyUrl.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not fetch company info.");
      }

      setValues({
        whoWeAre: body.whoWeAre ?? "",
        culture: body.culture ?? "",
        profilesWeHire: body.profilesWeHire ?? "",
        tone: body.tone ?? "",
      });
      setSuggestedFields(new Set(body.suggestedFields ?? ["culture", "tone"]));
      setFetchSource(body.sourceUrl ?? companyUrl.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch company info.");
    } finally {
      setFetching(false);
    }
  }

  function clearSuggestion(key: FieldKey) {
    setSuggestedFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || building) return;

    const context = {
      whoWeAre: values.whoWeAre,
      culture: values.culture,
      profilesWeHire: values.profilesWeHire,
      tone: values.tone,
    };

    const unchanged = hasExistingAgent && contextsEqual(companyContext, context);
    if (unchanged) {
      router.push("/dashboard");
      return;
    }

    setBuilding(true);
    setError(null);

    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, companyName: profile?.companyName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to build the agent.");
      }
      const { persona: nextPersona, companyIntelligence } = await res.json();
      resetEngagement();
      setCompanyContext(context);
      setPersona(nextPersona);
      setCompanyIntelligence(companyIntelligence);
      router.push("/dashboard");
    } catch (err) {
      setBuilding(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (building) {
    return (
      <PageShell width="sm" centered>
        <PhaseLayout width="sm" className="min-h-0 py-0">
          <BuildingAgentAnimation steps={BUILD_STEPS} />
        </PhaseLayout>
      </PageShell>
    );
  }

  return (
    <PageShell width="md">
      <BackLink href="/login" label="Profile" />

      <PageHeader
        className="mt-4"
        eyebrow={hasExistingAgent ? "Edit company" : "Company setup"}
        title="Tell us about your company"
        subtitle="Paste a company URL to auto-fill, or write it yourself. Review AI suggestions before building."
      />

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Start from a URL</p>
        <p className="mt-1 text-xs text-muted">
          We read the public page and fill in what the company does. Culture and tone are
          suggested — edit them to match how you actually hire.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlFetch();
              }
            }}
            placeholder="stripe.com or https://stripe.com"
            className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={handleUrlFetch}
            disabled={fetching || !companyUrl.trim()}
            className="shrink-0 rounded-full border border-border px-4 py-2.5 text-sm transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
        {fetchSource && (
          <p className="mt-2 text-xs text-muted">
            Filled from <span className="text-foreground">{fetchSource}</span> — review below
            before building.
          </p>
        )}
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {FIELDS.map((field) => {
          const isSuggested = suggestedFields.has(field.key);
          return (
            <div key={field.key}>
              <label
                className="mb-1.5 flex items-center gap-2 text-xs text-muted"
                htmlFor={field.key}
              >
                {field.label}
                {isSuggested && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    AI suggested
                  </span>
                )}
              </label>
              <textarea
                id={field.key}
                rows={2}
                value={values[field.key] ?? ""}
                onChange={(e) => {
                  clearSuggestion(field.key);
                  setValues((v) => ({ ...v, [field.key]: e.target.value }));
                }}
                placeholder={field.placeholder}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
          );
        })}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!isValid}
          className="block w-full rounded-full bg-accent px-4 py-2.5 text-center text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasExistingAgent
            ? `Save ${profile?.companyName ? formatAgentDisplayName(profile.companyName) : "Écho"}`
            : `Build ${profile?.companyName ? formatAgentDisplayName(profile.companyName) : "Écho"}`}
        </button>
      </form>
    </PageShell>
  );
}
