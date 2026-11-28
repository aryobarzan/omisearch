import { Dna } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: ReactNode;
}

export function AuthShell({
  title,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthShellProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-primary">
            <Dna aria-hidden="true" className="size-6" />
          </div>
          <span className="type-headline-md font-bold tracking-tight text-on-surface">
            Omisearch
          </span>
        </div>

        <section className="section-card gap-6 p-7 sm:p-8">
          <h1 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
            {title}
          </h1>

          {children}

          <div className="border-t border-ghost-border pt-5 text-center">
            <p className="type-body-sm text-on-surface-variant">
              {footerPrompt}{" "}
              <Link
                href={footerLinkHref}
                className="font-semibold text-primary underline-offset-2 transition-colors hover:text-on-primary-fixed-variant hover:underline"
              >
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>

        <p className="type-body-sm text-center text-xs text-outline">
          Differential Gene Expression Analysis &amp; Network Graph
        </p>
      </div>
    </main>
  );
}
