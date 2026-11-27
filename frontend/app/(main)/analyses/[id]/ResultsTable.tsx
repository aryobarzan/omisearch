"use client";

import type { GeneResult } from "@/app/lib/types/analysis";
import { useMemo, useState } from "react";

type SortKey =
  | "gene"
  | "mean_group_a"
  | "mean_group_b"
  | "log2_fold_change"
  | "p_value"
  | "adjusted_p_value";

type SortDir = "asc" | "desc";
type DirectionFilter = "all" | "up" | "down";

const PAGE_SIZE = 50;

function formatPValue(val: number): string {
  if (val === 0) return "< 1e-300";
  if (val < 0.001) return val.toExponential(2);
  return val.toFixed(4);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ResultsTable({
  results,
  groupA,
  groupB,
  runName,
}: {
  results: GeneResult[];
  groupA: string;
  groupB: string;
  runName: string;
}) {
  const [search, setSearch] = useState("");
  const [padjMax, setPadjMax] = useState<string>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("adjusted_p_value");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    const padjLimit = padjMax === "all" ? null : Number(padjMax);

    const filtered = results.filter((row) => {
      if (query && !row.gene.toLowerCase().includes(query)) return false;
      if (padjLimit !== null && row.adjusted_p_value > padjLimit) return false;
      if (direction === "up" && row.log2_fold_change <= 0) return false;
      if (direction === "down" && row.log2_fold_change >= 0) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "gene") {
        cmp = a.gene.localeCompare(b.gene);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [results, search, padjMax, direction, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredAndSorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "log2_fold_change" ? "desc" : "asc");
    }
    setPage(1);
  }

  function renderSortArrow(col: SortKey) {
    if (sortKey !== col) {
      return <span className="ml-1 text-zinc-300 dark:text-zinc-600">↕</span>;
    }
    return <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function handleExportCsv() {
    const header = [
      "gene",
      `mean_${groupA}`,
      `mean_${groupB}`,
      "log2_fold_change",
      "p_value",
      "adjusted_p_value",
    ];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...filteredAndSorted.map((r) =>
        [
          r.gene,
          r.mean_group_a,
          r.mean_group_b,
          r.log2_fold_change,
          r.p_value,
          r.adjusted_p_value,
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const slug =
      runName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || "dge";
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}_dge_results.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Differential Expression Results
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Showing {filteredAndSorted.length} of {results.length} genes · Click
            any column header to sort.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search gene (e.g. ABCA1)..."
            aria-label="Search genes"
            className="w-52 rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
          />

          <select
            value={padjMax}
            onChange={(e) => {
              setPadjMax(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by adjusted p-value"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">padj: All</option>
            <option value="0.05">padj ≤ 0.05</option>
            <option value="0.01">padj ≤ 0.01</option>
            <option value="0.001">padj ≤ 0.001</option>
          </select>

          <select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as DirectionFilter);
              setPage(1);
            }}
            aria-label="Filter by fold change direction"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">Direction: All</option>
            <option value="up">Upregulated (log2FC &gt; 0)</option>
            <option value="down">Downregulated (log2FC &lt; 0)</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredAndSorted.length === 0}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No genes match the current search and filter criteria.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("gene")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Gene{renderSortArrow("gene")}
                  </button>
                </th>
                <th className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("mean_group_a")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Mean ({groupA}){renderSortArrow("mean_group_a")}
                  </button>
                </th>
                <th className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("mean_group_b")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Mean ({groupB}){renderSortArrow("mean_group_b")}
                  </button>
                </th>
                <th className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("log2_fold_change")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    log2FC{renderSortArrow("log2_fold_change")}
                  </button>
                </th>
                <th className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("p_value")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    p-value{renderSortArrow("p_value")}
                  </button>
                </th>
                <th className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("adjusted_p_value")}
                    className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    padj (FDR){renderSortArrow("adjusted_p_value")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-xs dark:divide-zinc-900">
              {pageRows.map((row) => {
                const isSig = row.adjusted_p_value <= 0.05;
                const lfcColor =
                  row.log2_fold_change > 0.25
                    ? "text-red-600 dark:text-red-400"
                    : row.log2_fold_change < -0.25
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-600 dark:text-zinc-400";
                return (
                  <tr
                    key={row.gene}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="py-2.5 pr-4 font-sans text-sm font-medium">
                      {row.gene}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-600 dark:text-zinc-400">
                      {row.mean_group_a.toFixed(3)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-600 dark:text-zinc-400">
                      {row.mean_group_b.toFixed(3)}
                    </td>
                    <td className={`py-2.5 pr-4 text-right font-semibold ${lfcColor}`}>
                      {row.log2_fold_change > 0 ? "+" : ""}
                      {row.log2_fold_change.toFixed(3)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-600 dark:text-zinc-400">
                      {formatPValue(row.p_value)}
                    </td>
                    <td
                      className={`py-2.5 text-right ${
                        isSig
                          ? "font-semibold text-emerald-700 dark:text-emerald-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {formatPValue(row.adjusted_p_value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
