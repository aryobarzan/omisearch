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
          className="search-input"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="icon-button absolute top-1/2 right-1.5 h-6 w-6 -translate-y-1/2 rounded-full"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      <span aria-hidden="true" className="divider-dot" />

      <FilterChipGroup
        ariaLabel="Filter by status"
        options={STATUS_FILTERS}
        selected={selectedStatuses}
        onToggle={onToggleStatus}
      />

      <span aria-hidden="true" className="divider-dot" />

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
