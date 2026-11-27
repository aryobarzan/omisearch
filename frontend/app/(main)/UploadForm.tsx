"use client";

import {
  uploadAndRunAnalysis,
  type UploadActionState,
} from "@/app/lib/actions/analysis";
import Link from "next/link";
import { useActionState } from "react";

const INITIAL_STATE: UploadActionState = { status: "idle" };

export default function UploadForm() {
  const [state, formAction, isPending] = useActionState(
    uploadAndRunAnalysis,
    INITIAL_STATE,
  );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight">
        Upload Omics Dataset
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Upload a gene expression matrix and sample annotations CSV to run
        two-group differential gene expression (DGE) analysis.
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Analysis Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            defaultValue="New DGE Analysis"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="expression_file"
              className="block text-sm font-medium"
            >
              Expression CSV
            </label>
            <input
              id="expression_file"
              name="expression_file"
              type="file"
              accept=".csv,text/csv"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-medium hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Genes as rows (first column), sample IDs as columns.
            </p>
          </div>

          <div>
            <label
              htmlFor="annotations_file"
              className="block text-sm font-medium"
            >
              Sample Annotations CSV
            </label>
            <input
              id="annotations_file"
              name="annotations_file"
              type="file"
              accept=".csv,text/csv"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-medium hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Columns: <code>sample,group</code> (2 groups, ≥ 2 samples each).
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="test_method" className="block text-sm font-medium">
              Statistical Test
            </label>
            <select
              id="test_method"
              name="test_method"
              defaultValue="welch_t"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="welch_t">
                Welch&apos;s t-test (parametric, default)
              </option>
              <option value="mann_whitney">
                Mann–Whitney U (non-parametric)
              </option>
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Multiple testing corrected via Benjamini–Hochberg FDR.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <label
              htmlFor="is_log2"
              className="flex items-start gap-2.5 text-sm font-medium cursor-pointer"
            >
              <input
                id="is_log2"
                name="is_log2"
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Values are already log2-transformed
                <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Checked: <code>mean_b − mean_a</code>. Unchecked: linear scale{" "}
                  <code>log2((mean_b + ε) / (mean_a + ε))</code>.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
          >
            {isPending ? "Running DGE analysis..." : "Upload & Run Analysis"}
          </button>
        </div>

        {state.status === "error" && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {state.message}
          </div>
        )}

        {state.status === "success" && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <span>
              <strong>{state.run.name}</strong> completed:{" "}
              <strong>{state.run.significant_genes}</strong> /{" "}
              {state.run.total_genes} significant genes (<code>padj ≤ 0.05</code>,{" "}
              {state.run.group_a} vs. {state.run.group_b}).
            </span>
            <Link
              href={`/analyses/${state.run.id}`}
              className="font-semibold underline underline-offset-2"
            >
              View results →
            </Link>
          </div>
        )}
      </form>
    </section>
  );
}
