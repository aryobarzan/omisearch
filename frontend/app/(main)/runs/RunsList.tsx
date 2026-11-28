import { apiFetch } from "@/app/lib/api";
import type { AnalysisRunSummary } from "@/app/lib/types/analysis";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { RunsCollection } from "./RunsCollection";

export function RunsListSkeleton({
  title,
  rows = 2,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <section className="section-card">
      {title && (
        <div className="flex items-center justify-between pb-4">
          <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
            {title}
          </h2>
        </div>
      )}
      <div className="flex flex-col gap-1.5" aria-busy="true">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-18 animate-pulse rounded-md border border-ghost-border bg-surface-container-low/70 first:rounded-t-3xl last:rounded-b-3xl"
          />
        ))}
      </div>
    </section>
  );
}

export default async function RunsList({
  limit,
  title: customTitle,
  showFilters = false,
}: {
  limit?: number;
  title?: string;
  showFilters?: boolean;
}) {
  const title = customTitle ?? (limit ? "Recent Runs" : undefined);

  let runs: AnalysisRunSummary[] = [];
  let loadError: string | null = null;

  try {
    const res = await apiFetch("/analyses", { cache: "no-store" });
    if (res.ok) {
      runs = (await res.json()) as AnalysisRunSummary[];
    } else {
      loadError = `Could not load runs (HTTP ${res.status}).`;
    }
  } catch (err) {
    unstable_rethrow(err);
    loadError = "Could not reach the backend server.";
  }

  const totalCount = runs.length;
  const visibleRuns = limit ? runs.slice(0, limit) : runs;

  return (
    <section className="section-card">
      {(title || limit) && (
        <div className="flex flex-col justify-between gap-space-sm pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-baseline gap-3">
            {title && (
              <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
                {title}
              </h2>
            )}
            {totalCount > 0 && (
              <span className="type-body-sm text-xs text-outline">
                {limit
                  ? `Showing ${visibleRuns.length} of ${totalCount} ${totalCount === 1 ? "run" : "runs"}`
                  : `${totalCount} ${totalCount === 1 ? "run" : "runs"}`}
              </span>
            )}
          </div>

          {limit && (
            <Link
              href="/analyses"
              // self-start: avoid the button stretching to fill the width when displayed in a column (small devices)
              // sm:self-auto: on bigger devices, inherit instead the "items-center" from the parent container to center it vertically
              className="outlined-filled-button self-start sm:self-auto"
            >
              <span>View all runs</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      {loadError ? (
        <div role="alert" className="alert-error">
          {loadError}
        </div>
      ) : visibleRuns.length === 0 ? (
        <div className="empty-panel">
          <p className="type-body-md text-on-surface-variant">
            No analysis runs yet. Upload your CSV files or use the quick-start
            dataset to get started.
          </p>
        </div>
      ) : (
        <RunsCollection runs={visibleRuns} showFilters={showFilters} />
      )}
    </section>
  );
}
