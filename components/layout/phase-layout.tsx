import type { ReactNode } from "react";

const WIDTH = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  full: "max-w-none",
} as const;

type PhaseLayoutProps = {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  className?: string;
};

/** Vertically centers flow phases (sourcing, pick, preflight) within the page shell. */
export function PhaseLayout({
  children,
  width = "md",
  className = "",
}: PhaseLayoutProps) {
  return (
    <div
      className={`flex min-h-[min(720px,calc(100dvh-10rem))] flex-1 flex-col items-center justify-center py-8 sm:py-12 ${className}`}
    >
      <div className={`mx-auto w-full ${WIDTH[width]} px-0`}>{children}</div>
    </div>
  );
}
