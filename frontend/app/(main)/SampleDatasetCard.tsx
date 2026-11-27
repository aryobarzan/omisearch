"use client";

import {
  loadAndRunSampleAnalysis,
  type UploadActionState,
} from "@/app/lib/actions/analysis";
import { useActionState } from "react";

const INITIAL_STATE: UploadActionState = { status: "idle" };

export default function SampleDatasetCard() {
  const [state, formAction, isPending] = useActionState(
    loadAndRunSampleAnalysis,
    INITIAL_STATE,
  );

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-6 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Try the Simulated Sample Dataset
          </h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            200 genes × 12 samples (6 <code>control</code> vs. 6{" "}
            <code>treated</code>, log2 scale) with planted up- and
            down-regulated Hallmark modules.
          </p>
        </div>

        <form
          action={formAction}
          className="flex shrink-0 flex-wrap items-center gap-3"
        >
          <select
            name="test_method"
            aria-label="Statistical test for sample dataset"
            defaultValue="welch_t"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="welch_t">Welch&apos;s t-test</option>
            <option value="mann_whitney">Mann–Whitney U</option>
          </select>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Running sample..." : "Load & Run Sample Dataset"}
          </button>
        </form>
      </div>

      {state.status === "error" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div
          role="status"
          className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <strong>{state.run.name}</strong> completed:{" "}
          <strong>{state.run.significant_genes}</strong> /{" "}
          {state.run.total_genes} significant genes (<code>padj ≤ 0.05</code>,{" "}
          {state.run.group_a} vs. {state.run.group_b}).
        </div>
      )}
    </section>
  );
}
