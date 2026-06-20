"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink } from "@/components/layout/back-link";
import { Logo } from "@/components/landing/logo";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useEchoStore } from "@/lib/session/store";

const POSITIONS = [
  "Founder / CEO",
  "Co-Founder",
  "Head of Talent",
  "Head of People",
  "VP of Talent Acquisition",
  "Talent Acquisition Manager",
  "Recruiter",
  "Senior Recruiter",
  "Hiring Manager",
  "HR Manager",
  "People Operations",
  "Talent Partner",
  "Other",
] as const;

function emptyForm() {
  return { name: "", position: "", companyName: "", email: "" };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useStoreHydrated();
  const profile = useEchoStore((s) => s.profile);
  const setProfile = useEchoStore((s) => s.setProfile);
  const resetAll = useEchoStore((s) => s.resetAll);

  const [form, setForm] = useState(emptyForm);
  const [seeded, setSeeded] = useState(false);
  const isFreshStart = searchParams.get("fresh") === "1";

  useEffect(() => {
    if (!hydrated || seeded) return;

    if (isFreshStart) {
      resetAll();
      setForm(emptyForm());
      setSeeded(true);
      router.replace("/login");
      return;
    }

    if (profile) {
      setForm({
        name: profile.name,
        position: profile.position,
        companyName: profile.companyName,
        email: profile.email,
      });
    }
    setSeeded(true);
  }, [hydrated, seeded, isFreshStart, profile, resetAll, router]);

  if (!hydrated || !seeded) return null;

  const isValid =
    form.name.trim() &&
    form.companyName.trim() &&
    form.position &&
    form.email.trim();

  const fieldClassName =
    "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-foreground";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setProfile({
      name: form.name,
      companyName: form.companyName,
      position: form.position,
      email: form.email,
    });
    router.push("/onboarding");
  }

  return (
    <PageShell width="sm" centered>
      <BackLink href="/" label="Home" className="mb-4" />

      <Logo />

      <PageHeader
        className="mt-6"
        title={profile && !isFreshStart ? "Your profile" : "Welcome"}
        subtitle={
          profile && !isFreshStart
            ? "Update your details — changes carry through to your agent and engagements."
            : "No password needed for this preview — just tell us who you are."
        }
      />

      <form className="mt-8 w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-xs text-muted" htmlFor="company">
            Company name
          </label>
          <input
            id="company"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            className={fieldClassName}
            placeholder="Acme Inc."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={fieldClassName}
            placeholder="Jordan Lee"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted" htmlFor="position">
            Your position
          </label>
          <select
            id="position"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            className={`${fieldClassName} text-foreground ${form.position ? "" : "text-muted"}`}
          >
            <option value="" disabled>
              Select your position
            </option>
            {POSITIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={fieldClassName}
            placeholder="jordan@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="block w-full rounded-full bg-accent px-4 py-2.5 text-center text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {profile && !isFreshStart ? "Save & continue" : "Continue"}
        </button>
      </form>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
