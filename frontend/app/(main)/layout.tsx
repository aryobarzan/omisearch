import { Suspense } from "react";
import { LogOutButton } from "./LogOutButton";
import NavBar from "./NavBar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense
        fallback={
          <header className="sticky top-0 z-50 w-full border-b border-ghost-border bg-surface-container-lowest/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] backdrop-blur-xl">
            <div className="flex h-nav w-full items-center justify-between gap-gutter px-6 md:px-10">
              <span className="type-headline-sm font-bold tracking-tight text-on-surface">
                Omisearch
              </span>
            </div>
          </header>
        }
      >
        <NavBar />
      </Suspense>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
      <footer className="w-full border-t border-ghost-border bg-surface-container-low/60 py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row md:px-10">
          <p className="type-body-sm text-xs text-on-surface-variant">
            Omisearch — Differential Gene Expression Analysis &amp; Network
            Graph
          </p>
          <Suspense>
            <LogOutButton />
          </Suspense>
        </div>
      </footer>
    </div>
  );
}
