import { cormorant } from "@/lib/fonts";
import styles from "./logo.module.css";

export function Logo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`${cormorant.className} ${styles.logo}${compact ? ` ${styles.compact}` : ""}${className ? ` ${className}` : ""}`}
      aria-label="Écho"
    >
      Écho
    </span>
  );
}
