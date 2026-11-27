import { apiFetch } from "@/app/lib/api";
import type { AnalysisRunSummary } from "@/app/lib/types/analysis";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

const TEST_LABELS: Record<AnalysisRunSummary["test_method"], string> = {
  welch_t: "Welch's t-test",
  mann_whitney: "Mann–Whitney U",
};

const STATUS_STYLES: Record<AnalysisRunSummary["status"], string> = {
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function formatTimestamp(iso: string): string {
  // SQLite CURRENT_TIMESTAMP lacks a trailing Z; normalize so Date parses as UTC.
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsListSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        Loading analysis runs...
      </p>
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
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {limit && totalCount > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Showing {visibleRuns.length} of {totalCount} run
              {totalCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {limit && (
          <Link
            href="/analyses"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View all runs →
          </Link>
        )}
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
      ) : visibleRuns.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No analysis runs yet. Run the simulated sample dataset or upload your
          own CSV files to get started.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Test</th>
                <th className="py-2 pr-4">Comparison</th>
                <th className="py-2 pr-4">Significant (padj ≤ 0.05)</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 text-right">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {visibleRuns.map((run) => (
                <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-3 pr-4 font-medium">{run.name}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[run.status]}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                    {TEST_LABELS[run.test_method]}
                  </td>
                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                    {run.group_a && run.group_b
                      ? `${run.group_a} (${run.n_group_a}) vs. ${run.group_b} (${run.n_group_b})`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {run.significant_genes !== null && run.total_genes !== null
                      ? `${run.significant_genes} / ${run.total_genes}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatTimestamp(run.created_at)}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/analyses/${run.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
