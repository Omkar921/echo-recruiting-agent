import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Écho — your company's recruiting agent",
  description:
    "Écho configures a company-branded recruiting agent from your context, then lets you preview how it engages candidates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
