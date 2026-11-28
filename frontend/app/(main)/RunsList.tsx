import { apiFetch } from "@/app/lib/api";
import type { AnalysisRunSummary } from "@/app/lib/types/analysis";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

const TEST_LABELS: Record<AnalysisRunSummary["test_method"], string> = {
  welch_t: "Welch’s t-test",
  mann_whitney: "Mann–Whitney U",
};

const STATUS_META: Record<
  AnalysisRunSummary["status"],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "Completed",
    className: "text-status-success",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className: "text-status-warning",
    Icon: Clock,
  },
  failed: {
    label: "Failed",
    className: "text-status-error",
    Icon: AlertCircle,
  },
};

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}

export function RunsListSkeleton({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-ghost-border-strong bg-surface-container-lowest p-6 shadow-card md:p-8">
      <div className="flex items-center justify-between border-b border-ghost-border pb-4">
        <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-1.5" aria-busy="true">
        <div className="h-18 animate-pulse rounded-t-3xl rounded-b-md border border-ghost-border bg-surface-container-low/70" />
        <div className="h-18 animate-pulse rounded-t-md rounded-b-3xl border border-ghost-border bg-surface-container-low/70" />
      </div>
    </section>
  );
}

export default async function RunsList({ limit }: { limit?: number }) {
  const title = limit ? "Recent Runs" : "All Analysis Runs";

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
    <section className="flex flex-col gap-5 rounded-3xl border border-ghost-border-strong bg-surface-container-lowest p-6 shadow-card md:p-8">
      <div className="flex flex-col justify-between gap-space-sm pb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
            {title}
          </h2>
          {limit && totalCount > 0 && (
            <span className="type-body-sm text-xs text-outline">
              Showing {visibleRuns.length} of {totalCount} run
              {totalCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {limit && (
          <Link
            href="/analyses"
            // self-start: avoid the button stretching to fill the width when displayed in a column (small devices)
            // sm:self-auto: on bigger devices, inherit instead the "items-center" from teh parent container to center it vertically
            className="outlined-filled-button self-start sm:self-auto"
          >
            <span>View all runs</span>
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>

      {loadError ? (
        <div
          role="alert"
          className="type-body-sm rounded-2xl border border-error/25 bg-error-container px-4 py-3 font-medium text-on-error-container"
        >
          {loadError}
        </div>
      ) : visibleRuns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ghost-border-strong bg-surface-container-low/50 px-6 py-8 text-center">
          <p className="type-body-md text-on-surface-variant">
            No analysis runs yet. Upload your CSV files or use the quick-start
            dataset to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="hidden grid-cols-12 gap-4 rounded-xl border border-ghost-border bg-surface-container-low/70 px-5 py-2 text-xs font-semibold text-on-surface-variant md:grid">
            <span className="col-span-4">Analysis name</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Test</span>
            <span className="col-span-2">Comparison</span>
            <span className="col-span-2 text-right">Significant</span>
          </div>

          <div className="flex flex-col gap-1.5" role="list">
            {visibleRuns.map((run) => {
              const status = STATUS_META[run.status];
              const StatusIcon = status.Icon;

              return (
                <Link
                  key={run.id}
                  href={`/analyses/${run.id}`}
                  role="listitem"
                  className="group run-card"
                >
                  <div className="flex w-full flex-col md:col-span-4 md:w-auto">
                    <span className="type-label-lg text-sm font-semibold text-on-surface transition-colors group-hover:text-on-primary-fixed">
                      {run.name}
                    </span>
                    <span className="type-metric-sm text-outline md:hidden">
                      {formatDateTime(run.created_at)}
                    </span>
                  </div>

                  <div className="flex w-full items-center md:col-span-2 md:w-auto">
                    <span
                      className={`type-label-lg inline-flex items-center gap-1.5 text-xs font-medium ${status.className}`}
                    >
                      <StatusIcon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  <div className="flex w-full items-center md:col-span-2 md:w-auto">
                    <span className="type-body-sm text-xs text-on-surface-variant">
                      {TEST_LABELS[run.test_method]}
                    </span>
                  </div>

                  <div className="flex w-full items-center md:col-span-2 md:w-auto">
                    <span className="type-body-sm text-xs text-on-surface-variant">
                      {run.group_a && run.group_b
                        ? `${run.group_a} (${run.n_group_a}) vs. ${run.group_b} (${run.n_group_b})`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 md:col-span-2 md:w-auto md:justify-end">
                    <div className="flex flex-col md:items-end">
                      <span className="type-metric-md text-xs font-semibold text-on-surface">
                        {run.significant_genes !== null &&
                        run.total_genes !== null
                          ? `${run.significant_genes} / ${run.total_genes}`
                          : "—"}
                      </span>
                      <span
                        title={formatDateTime(run.created_at)}
                        className="type-metric-sm hidden text-[11px] text-outline md:inline"
                      >
                        {formatDateShort(run.created_at)}
                      </span>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-outline transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
