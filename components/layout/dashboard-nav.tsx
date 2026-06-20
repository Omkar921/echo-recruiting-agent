"use client";

import { Logo } from "@/components/landing/logo";
import type { UserProfile } from "@/lib/types";

type DashboardNavProps = {
  profile: UserProfile | null;
  onNewCompany: () => void;
  onLogout: () => void;
};

export function DashboardNav({ profile, onNewCompany, onLogout }: DashboardNavProps) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo compact />

        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:justify-end sm:gap-4">
          {(profile?.name || profile?.companyName) && (
            <div
              className="max-w-full truncate rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted"
              title={[profile?.name, profile?.companyName].filter(Boolean).join(" · ")}
            >
              {profile?.name && (
                <span className="font-medium text-foreground">{profile.name}</span>
              )}
              {profile?.name && profile?.companyName && (
                <span className="mx-1.5 text-border/80">·</span>
              )}
              {profile?.companyName && <span>{profile.companyName}</span>}
            </div>
          )}

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onNewCompany}
              className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-foreground"
            >
              New company
            </button>
            <span className="mx-0.5 hidden h-4 w-px bg-border sm:block" aria-hidden />
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-foreground"
            >
              Log out
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
