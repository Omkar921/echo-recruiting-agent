import { agentAvatarLabel } from "@/lib/agent/display-name";
import type { AgentPersona } from "@/lib/types";

function splitTrait(trait: string): { label: string; detail?: string } {
  const match = trait.match(/^(.+?)\s*[—–-]\s+(.+)$/);
  if (match) {
    return { label: match[1].trim(), detail: match[2].trim() };
  }
  return { label: trait.trim() };
}

type AgentProfileCardProps = {
  agentName: string;
  persona: AgentPersona;
  maxTraits?: number;
};

export function AgentProfileCard({
  agentName,
  persona,
  maxTraits = 3,
}: AgentProfileCardProps) {
  const traits = persona.traits.slice(0, maxTraits);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-foreground">
          {agentAvatarLabel()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium leading-snug">{agentName}</p>
          <p className="mt-0.5 text-xs text-muted">Your company&apos;s Écho</p>
        </div>
      </div>

      {traits.length > 0 && (
        <ul className="mt-5 space-y-3.5 border-t border-border pt-4">
          {traits.map((trait) => {
            const { label, detail } = splitTrait(trait);
            return (
              <li key={trait} className="min-w-0">
                {detail ? (
                  <>
                    <p className="text-xs font-medium leading-snug text-foreground">{label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{detail}</p>
                  </>
                ) : (
                  <p className="text-[11px] leading-relaxed text-muted">{label}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
