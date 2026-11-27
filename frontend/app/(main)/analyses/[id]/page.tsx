import { apiFetch } from "@/app/lib/api";
import type { AnalysisRunDetail } from "@/app/lib/types/analysis";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import NetworkView from "./NetworkView";
import ResultsTable from "./ResultsTable";

const TEST_LABELS: Record<AnalysisRunDetail["test_method"], string> = {
  welch_t: "Welch's t-test",
  mann_whitney: "Mann–Whitney U",
};

function formatTimestamp(iso: string): string {
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const date = new Date(withZone);
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        {loadError ?? "Analysis run could not be loaded."}
      </div>
    );
  }

  const sigUp = run.results.filter(
    (r) => r.adjusted_p_value <= 0.05 && r.log2_fold_change > 0,
  ).length;
  const sigDown = run.results.filter(
    (r) => r.adjusted_p_value <= 0.05 && r.log2_fold_change < 0,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/analyses" className="hover:underline">
              All Runs
            </Link>
            <span>/</span>
            <span>Run #{run.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {run.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {TEST_LABELS[run.test_method]} ·{" "}
            {run.is_log2 ? "log2-transformed" : "linear scale"} ·{" "}
            {run.group_a && run.group_b
              ? `${run.group_a} (n=${run.n_group_a}) vs. ${run.group_b} (n=${run.n_group_b})`
              : "Groups pending"}{" "}
            · {formatTimestamp(run.created_at)}
          </p>
        </div>

        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total Genes
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {run.total_genes ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Significant (padj ≤ 0.05)
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {run.significant_genes ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Upregulated (padj ≤ 0.05)
          </p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
            {run.status === "completed" ? sigUp : "—"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Downregulated (padj ≤ 0.05)
          </p>
          <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {run.status === "completed" ? sigDown : "—"}
          </p>
        </div>
      </div>

      {run.status === "completed" ? (
        <>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          This analysis run is currently <strong>{run.status}</strong> and has
          no DGE results yet.
        </div>
      )}
    </div>
  );
}

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading analysis results...
        </div>
      }
    >
      <AnalysisDetailContent params={params} />
    </Suspense>
  );
}
