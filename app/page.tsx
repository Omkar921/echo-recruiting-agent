import Link from "next/link";
import { Logo } from "@/components/landing/logo";
import { GlobeBackground } from "@/components/landing/globe-background";
import { RotatingTaglines } from "@/components/landing/rotating-taglines";
import headline from "@/components/landing/hero-headline.module.css";
import supporting from "@/components/landing/supporting-text.module.css";
import buttons from "@/components/landing/glass-button.module.css";
import { inter } from "@/lib/fonts";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <GlobeBackground />
      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex flex-col items-center px-6 pb-5 pt-[10vh] sm:px-10 lg:px-12">
          <Logo />
          <RotatingTaglines variant="header" />
        </header>

        <section className="flex min-h-0 flex-1 flex-col px-6 text-center sm:px-10 lg:px-12">
          <h1
            className={`mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col font-normal ${headline.headline}`}
          >
            <span className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <span className={`${inter.className} ${headline.line}`}>
                Your company&apos;s tone, automated.
              </span>
              <span className={`${inter.className} ${headline.line}`}>
                Into every hiring conversation.
              </span>
            </span>
          </h1>
          <div className="flex shrink-0 flex-col items-center">
            <p className={`${inter.className} ${supporting.body} mx-auto`}>
              Onboard your company once. Écho becomes your company&apos;s dedicated recruiting agent —
              aligned to your tone, capable of planning outreach and handling candidate
              replies on its own — so your team spends less time on manual back-and-forth.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login?fresh=1"
                className={`${buttons.button} ${buttons.primary}`}
              >
                Start now
              </Link>
            </div>
          </div>
          <div className="min-h-0 flex-1" aria-hidden />
        </section>
      </div>
    </main>
  );
}
