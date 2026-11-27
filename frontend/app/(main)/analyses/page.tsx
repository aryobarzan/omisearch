import Link from "next/link";
import { Suspense } from "react";
import RunsList, { RunsListSkeleton } from "../RunsList";

export default function AllAnalysesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All Analysis Runs
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Browse all differential gene expression runs saved to your account.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New Analysis
        </Link>
      </div>

      <Suspense fallback={<RunsListSkeleton title="All Analysis Runs" />}>
        <RunsList />
      </Suspense>
    </div>
  );
}
