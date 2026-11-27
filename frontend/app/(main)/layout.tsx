import { Suspense } from "react";
import { LogOutButton } from "./LogOutButton";
import NavBar from "./NavBar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense
        fallback={
          <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <span className="text-lg font-semibold tracking-tight">
                Omisearch
              </span>
            </nav>
          </header>
        }
      >
        <NavBar />
      </Suspense>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-zinc-200 py-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6">
          <p>Omisearch — Differential Gene Expression &amp; Network Explorer</p>
          <Suspense>
            <LogOutButton />
          </Suspense>
        </div>
      </footer>
    </div>
  );
}
