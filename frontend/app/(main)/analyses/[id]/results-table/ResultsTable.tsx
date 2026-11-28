"use client";

import type { GeneResult } from "@/app/lib/types/analysis";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadResultsCsv, formatPValue } from "./dgeFormatting";
import { ResultsToolbar, type DirectionFilter } from "./ResultsToolbar";

type SortKey =
  | "gene"
  | "mean_group_a"
  | "mean_group_b"
  | "log2_fold_change"
  | "p_value"
  | "adjusted_p_value";

type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

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
  const [padjMax, setPadjMax] = useState<number | null>(null);
  const [direction, setDirection] = useState<DirectionFilter | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("adjusted_p_value");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const hasActiveFilters =
    search.trim().length > 0 || padjMax !== null || direction !== null;

  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = results.filter((row) => {
      if (query && !row.gene.toLowerCase().includes(query)) return false;
      if (padjMax !== null && row.adjusted_p_value > padjMax) return false;
      if (direction === "up" && row.log2_fold_change <= 0) return false;
      if (direction === "down" && row.log2_fold_change >= 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "gene"
          ? a.gene.localeCompare(b.gene)
          : a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, search, padjMax, direction, sortKey, sortDir]);

  function clearFilters() {
    setSearch("");
    setPadjMax(null);
    setDirection(null);
    setPage(1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / PAGE_SIZE),
  );
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

  function renderSortIcon(col: SortKey) {
    if (sortKey !== col) {
      return (
        <ArrowUpDown aria-hidden="true" className="size-3.5 text-outline/60" />
      );
    }
    return sortDir === "asc" ? (
      <ArrowUp aria-hidden="true" className="size-3.5 text-primary" />
    ) : (
      <ArrowDown aria-hidden="true" className="size-3.5 text-primary" />
    );
  }

  const columns: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "gene", label: "Gene", align: "left" },
    { key: "mean_group_a", label: `Mean (${groupA})`, align: "right" },
    { key: "mean_group_b", label: `Mean (${groupB})`, align: "right" },
    { key: "log2_fold_change", label: "log2FC", align: "right" },
    { key: "p_value", label: "p-value", align: "right" },
    { key: "adjusted_p_value", label: "padj (FDR)", align: "right" },
  ];

  return (
    <section className="section-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
          Differential Expression Results
        </h2>
        <span className="type-body-sm text-xs text-outline">
          Showing{" "}
          <strong className="type-metric-sm font-semibold text-on-surface">
            {filteredAndSorted.length}
          </strong>{" "}
          of {results.length} genes · Click any column header to sort
        </span>
      </div>

      <ResultsToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        padjMax={padjMax}
        onPadjMaxChange={(val) => {
          setPadjMax(val);
          setPage(1);
        }}
        direction={direction}
        onDirectionChange={(val) => {
          setDirection(val);
          setPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearFilters}
        canExport={filteredAndSorted.length > 0}
        onExportCsv={() =>
          downloadResultsCsv(filteredAndSorted, groupA, groupB, runName)
        }
      />

      {pageRows.length === 0 ? (
        <div className="empty-panel">
          <p className="type-body-md text-on-surface-variant">
            No genes match the current search and filter criteria.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="outlined-filled-button"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ghost-border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface-container-low/90 backdrop-blur-sm">
              <tr className="border-b border-ghost-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`type-label-sm px-4 py-3 text-on-surface-variant ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-on-surface ${
                        col.align === "right" ? "ml-auto" : ""
                      }`}
                    >
                      <span>{col.label}</span>
                      {renderSortIcon(col.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ghost-border">
              {pageRows.map((row) => {
                const isSig = row.adjusted_p_value <= 0.05;
                const lfcBadgeClass =
                  row.log2_fold_change > 0.25
                    ? "bg-fc-up-soft text-fc-up"
                    : row.log2_fold_change < -0.25
                      ? "bg-fc-down-soft text-fc-down"
                      : "bg-surface-container-low text-on-surface-variant";

                return (
                  <tr
                    key={row.gene}
                    className="h-table-row transition-colors hover:bg-primary/5"
                  >
                    <td className="type-label-lg px-4 py-2 font-semibold text-on-surface">
                      {row.gene}
                    </td>
                    <td className="type-metric-md px-4 py-2 text-right text-on-surface-variant">
                      {row.mean_group_a.toFixed(3)}
                    </td>
                    <td className="type-metric-md px-4 py-2 text-right text-on-surface-variant">
                      {row.mean_group_b.toFixed(3)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`type-metric-md inline-block rounded-full px-2.5 py-0.5 font-semibold ${lfcBadgeClass}`}
                      >
                        {row.log2_fold_change > 0 ? "+" : ""}
                        {row.log2_fold_change.toFixed(3)}
                      </span>
                    </td>
                    <td className="type-metric-md px-4 py-2 text-right text-on-surface-variant">
                      {formatPValue(row.p_value)}
                    </td>
                    <td
                      className={`type-metric-md px-4 py-2 text-right ${
                        isSig
                          ? "font-semibold text-status-success"
                          : "text-outline"
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
        <div className="flex items-center justify-between border-t border-ghost-border pt-4">
          <span className="type-body-sm text-xs text-outline">
            Page{" "}
            <strong className="type-metric-sm font-semibold text-on-surface">
              {safePage}
            </strong>{" "}
            of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="outlined-filled-button px-3.5 py-1.5"
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="outlined-filled-button px-3.5 py-1.5"
            >
              <span>Next</span>
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
