import type { ReactNode } from "react";

const WIDTH = {
  sm: "max-w-sm",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  wide: "max-w-6xl",
} as const;

type PageShellProps = {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  centered?: boolean;
  className?: string;
};

export function PageShell({
  children,
  width = "xl",
  centered = false,
  className = "",
}: PageShellProps) {
  return (
    <main
      className={`flex min-h-dvh flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12 ${
        centered ? "items-center justify-center" : ""
      } ${className}`}
    >
      <div
        className={`mx-auto w-full ${WIDTH[width]} ${
          centered
            ? "flex w-full flex-col"
            : "flex min-h-0 flex-1 flex-col"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
