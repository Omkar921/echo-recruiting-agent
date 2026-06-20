type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  align?: "left" | "center";
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  subtitleClassName = "",
  align = "left",
  className = "",
}: PageHeaderProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
      )}
      <h1 className={`${eyebrow ? "mt-2" : ""} text-2xl font-semibold leading-tight sm:text-3xl`}>
        {title}
      </h1>
      {subtitle && (
        <p
          className={`mt-2 text-sm leading-relaxed text-muted ${align === "center" ? "max-w-md" : "max-w-2xl"} ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
