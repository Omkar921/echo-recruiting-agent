import anim from "./ui-animations.module.css";

export function ThinkingDots({ label = "Listening" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <span className="inline-flex gap-0.5" aria-hidden>
        <span className={`inline-block h-1 w-1 rounded-full bg-current ${anim.dot}`} />
        <span className={`inline-block h-1 w-1 rounded-full bg-current ${anim.dot} ${anim.dotDelay1}`} />
        <span className={`inline-block h-1 w-1 rounded-full bg-current ${anim.dot} ${anim.dotDelay2}`} />
      </span>
    </span>
  );
}
