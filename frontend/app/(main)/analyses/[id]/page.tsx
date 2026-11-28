import { apiFetch } from "@/app/lib/api";
import type { AnalysisRunDetail } from "@/app/lib/types/analysis";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { TEST_LABELS } from "../../runs/runFormatting";
import NetworkView from "./network-view/NetworkView";
import ResultsTable from "./results-table/ResultsTable";
import { ExpressionSummaryCard } from "./summary/ExpressionSummaryCard";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function AnalysisDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  let run: AnalysisRunDetail | null = null;
  let loadError: string | null = null;

  try {
    const res = await apiFetch(`/analyses/${id}`, { cache: "no-store" });
    if (res.status === 404) {
      notFound();
    }
    if (res.ok) {
      run = (await res.json()) as AnalysisRunDetail;
    } else {
      loadError = `Failed to load analysis (HTTP ${res.status}).`;
    }
  } catch (err) {
    unstable_rethrow(err);
    loadError = "Could not reach the backend server.";
  }

  if (loadError || !run) {
    return (
      <div role="alert" className="alert-error rounded-3xl p-6 text-sm">
        {loadError ?? "Analysis run could not be loaded."}
      </div>
    );
  }

  const isCompleted = run.status === "completed";
  const sigUp = isCompleted
    ? run.results.filter(
        (r) => r.adjusted_p_value <= 0.05 && r.log2_fold_change > 0,
      ).length
    : 0;
  const sigDown = isCompleted
    ? run.results.filter(
        (r) => r.adjusted_p_value <= 0.05 && r.log2_fold_change < 0,
      ).length
    : 0;

  const metaParts = [
    TEST_LABELS[run.test_method],
    run.is_log2 ? "log2-transformed" : "linear scale",
    run.group_a && run.group_b
      ? `${run.group_a} (n=${run.n_group_a}) vs. ${run.group_b} (n=${run.n_group_b})`
      : "Groups pending",
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1.5">
        <nav
          aria-label="Breadcrumb"
          className="type-body-sm flex items-center gap-1.5 text-xs text-outline"
        >
          <Link
            href="/analyses"
            className="font-medium transition-colors hover:text-primary"
          >
            All Runs
          </Link>
          <ChevronRight aria-hidden="true" className="size-3.5" />
          <span className="type-metric-sm text-on-surface-variant">
            Run #{run.id}
          </span>
        </nav>

        <h1 className="type-headline-lg text-on-surface">{run.name}</h1>

        <p className="type-body-sm flex flex-wrap items-center gap-x-2 gap-y-1 text-on-surface-variant">
          {metaParts.map((part) => (
            <span key={part} className="inline-flex items-center gap-2">
              <span>{part}</span>
              <span aria-hidden="true" className="text-outline-variant">
                ·
              </span>
            </span>
          ))}
          <span className="type-metric-sm text-outline">
            {formatTimestamp(run.created_at)}
          </span>
        </p>
      </section>

      {isCompleted ? (
        <>
          <ExpressionSummaryCard
            totalGenes={run.total_genes}
            significantGenes={run.significant_genes}
            sigUp={sigUp}
            sigDown={sigDown}
          />
          <ResultsTable
            results={run.results}
            groupA={run.group_a ?? "Group A"}
            groupB={run.group_b ?? "Group B"}
            runName={run.name}
          />
          <NetworkView
            analysisId={run.id}
            groupA={run.group_a ?? "Group A"}
            groupB={run.group_b ?? "Group B"}
          />
        </>
      ) : (
        <div
          role="status"
          className="type-body-md rounded-3xl border border-status-warning/30 bg-status-warning-soft p-6 text-on-surface"
        >
          This analysis run is currently{" "}
          <strong className="font-semibold">{run.status}</strong> and has no DGE
          results yet.
        </div>
      )}
    </div>
  );
}

function AnalysisDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded-full bg-surface-container-low" />
        <div className="h-8 w-80 animate-pulse rounded-xl bg-surface-container-low" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-surface-container-low" />
      </div>
      <div className="h-48 animate-pulse rounded-3xl border border-ghost-border bg-surface-container-lowest" />
      <div className="h-96 animate-pulse rounded-3xl border border-ghost-border bg-surface-container-lowest" />
    </div>
  );
}

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<AnalysisDetailSkeleton />}>
      <AnalysisDetailContent params={params} />
    </Suspense>
  );
}
