import Link from "next/link";

type BackLinkProps = {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
};

export function BackLink({
  href,
  label = "Back",
  onClick,
  className = "",
}: BackLinkProps) {
  const styles = `inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={styles}>
        <span aria-hidden>←</span>
        {label}
      </button>
    );
  }

  if (!href) return null;

  return (
    <Link href={href} className={styles}>
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
