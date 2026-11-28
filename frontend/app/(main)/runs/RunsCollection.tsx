"use client";

import type {
  AnalysisRunSummary,
  AnalysisStatus,
  TestMethod,
} from "@/app/lib/types/analysis";
import { useMemo, useState } from "react";
import { RunCard } from "./RunCard";
import { RunsFilterBar } from "./RunsFilterBar";

function toggleInSet<T>(prev: Set<T>, value: T): Set<T> {
  const next = new Set(prev);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

interface RunsCollectionProps {
  runs: AnalysisRunSummary[];
  showFilters?: boolean;
}

export function RunsCollection({
  runs,
  showFilters = false,
}: RunsCollectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<AnalysisStatus>>(
    () => new Set(),
  );
  const [selectedTests, setSelectedTests] = useState<Set<TestMethod>>(
    () => new Set(),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    selectedStatuses.size > 0 ||
    selectedTests.size > 0;

  const filteredRuns = useMemo(() => {
    if (!showFilters || !hasActiveFilters) return runs;
    return runs.filter((run) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        run.name.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        selectedStatuses.size === 0 || selectedStatuses.has(run.status);
      const matchesTest =
        selectedTests.size === 0 || selectedTests.has(run.test_method);
      return matchesQuery && matchesStatus && matchesTest;
    });
  }, [
    runs,
    showFilters,
    hasActiveFilters,
    normalizedQuery,
    selectedStatuses,
    selectedTests,
  ]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedStatuses(new Set());
    setSelectedTests(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      {showFilters && (
        <RunsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatuses={selectedStatuses}
          onToggleStatus={(status) =>
            setSelectedStatuses((prev) => toggleInSet(prev, status))
          }
          selectedTests={selectedTests}
          onToggleTest={(test) =>
            setSelectedTests((prev) => toggleInSet(prev, test))
          }
          filteredCount={filteredRuns.length}
          totalCount={runs.length}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearFilters}
        />
      )}

      {filteredRuns.length === 0 ? (
        <div className="empty-panel">
          <p className="type-body-md text-on-surface-variant">
            No analysis runs match the selected filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="outlined-filled-button"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="run-list-header">
            <span>Analysis name</span>
            <span>Status</span>
            <span>Test</span>
            <span>Comparison</span>
            <span className="text-right">Significant</span>
            <span className="pr-8 text-right">Created</span>
          </div>

          <div className="flex flex-col gap-1.5" role="list">
            {filteredRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
