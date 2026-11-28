"use client";

import type { AnalysisStatus, TestMethod } from "@/app/lib/types/analysis";
import { Search, X } from "lucide-react";
import { FilterChipGroup, type FilterChipOption } from "./FilterChipGroup";

const STATUS_FILTERS: readonly FilterChipOption<AnalysisStatus>[] = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Running" },
  { value: "failed", label: "Failed" },
];

const TEST_FILTERS: readonly FilterChipOption<TestMethod>[] = [
  { value: "welch_t", label: "Welch’s t-test" },
  { value: "mann_whitney", label: "Mann–Whitney U" },
];

interface RunsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: ReadonlySet<AnalysisStatus>;
  onToggleStatus: (status: AnalysisStatus) => void;
  selectedTests: ReadonlySet<TestMethod>;
  onToggleTest: (test: TestMethod) => void;
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

export function RunsFilterBar({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  selectedTests,
  onToggleTest,
  filteredCount,
  totalCount,
  hasActiveFilters,
  onClearAll,
}: RunsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-outline"
        />
        <input
          type="text"
          role="searchbox"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search analysis runs by name"
          placeholder="Search by analysis name..."
          className="type-body-sm w-full rounded-full border border-ghost-border-strong bg-surface-container-low/60 py-2 pr-9 pl-9.5 text-on-surface shadow-xs transition-colors placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-2.5 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      <span
        aria-hidden="true"
        className="hidden h-1.5 w-1.5 rounded-full bg-outline-variant sm:inline-block"
      />

      <FilterChipGroup
        ariaLabel="Filter by status"
        options={STATUS_FILTERS}
        selected={selectedStatuses}
        onToggle={onToggleStatus}
      />

      <span
        aria-hidden="true"
        className="hidden h-1.5 w-1.5 rounded-full bg-outline-variant sm:inline-block"
      />

      <FilterChipGroup
        ariaLabel="Filter by statistical test"
        options={TEST_FILTERS}
        selected={selectedTests}
        onToggle={onToggleTest}
      />

      <div className="ml-auto flex items-center gap-3">
        <span className="type-body-sm text-xs text-outline">
          {hasActiveFilters
            ? `Showing ${filteredCount} of ${totalCount} ${totalCount === 1 ? "run" : "runs"}`
            : `${totalCount} ${totalCount === 1 ? "run" : "runs"}`}
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="type-label-lg inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <X aria-hidden="true" className="size-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
