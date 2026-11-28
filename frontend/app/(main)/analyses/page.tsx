import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import RunsList, { RunsListSkeleton } from "../runs/RunsList";

export default function AllAnalysesPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5">
          <h1 className="type-headline-lg text-on-surface">
            All Analysis Runs
          </h1>
          <p className="type-body-md text-on-surface-variant">
            Browse all differential gene expression runs saved to your account.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href="/"
            className="filled-button px-5 py-2.5 text-sm shadow-sm"
          >
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            <span>New Analysis</span>
          </Link>
        </div>
      </section>

      <Suspense fallback={<RunsListSkeleton rows={4} />}>
        <RunsList showFilters />
      </Suspense>
    </div>
  );
}
