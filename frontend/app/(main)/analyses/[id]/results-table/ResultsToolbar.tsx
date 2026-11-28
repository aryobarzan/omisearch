"use client";

import { Check, Download, Search, X } from "lucide-react";

export type DirectionFilter = "up" | "down";

const PADJ_OPTIONS = [
  { value: 0.05, label: "padj ≤ 0.05" },
  { value: 0.01, label: "padj ≤ 0.01" },
  { value: 0.001, label: "padj ≤ 0.001" },
] as const;

const DIRECTION_OPTIONS: readonly { value: DirectionFilter; label: string }[] = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];

function ToggleChipGroup<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="chip-group">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : opt.value)}
            className={selected ? "chip chip-selected" : "chip"}
          >
            {selected && (
              <Check
                aria-hidden="true"
                className="size-3.5 shrink-0"
                strokeWidth={2.5}
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ResultsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  padjMax: number | null;
  onPadjMaxChange: (value: number | null) => void;
  direction: DirectionFilter | null;
  onDirectionChange: (value: DirectionFilter | null) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  canExport: boolean;
  onExportCsv: () => void;
}

export function ResultsToolbar({
  search,
  onSearchChange,
  padjMax,
  onPadjMaxChange,
  direction,
  onDirectionChange,
  hasActiveFilters,
  onClearAll,
  canExport,
  onExportCsv,
}: ResultsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-60">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-outline"
        />
        <input
          type="text"
          role="searchbox"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search gene (e.g. ABCA1)..."
          aria-label="Search genes"
          className="search-input"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear gene search"
            onClick={() => onSearchChange("")}
            className="icon-button absolute top-1/2 right-1.5 h-6 w-6 -translate-y-1/2 rounded-full"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      <span aria-hidden="true" className="divider-dot" />

      <ToggleChipGroup
        ariaLabel="Filter by adjusted p-value"
        options={PADJ_OPTIONS}
        value={padjMax}
        onChange={onPadjMaxChange}
      />

      <span aria-hidden="true" className="divider-dot" />

      <ToggleChipGroup
        ariaLabel="Filter by fold change direction"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={onDirectionChange}
      />

      <div className="ml-auto flex items-center gap-3">
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

        <button
          type="button"
          onClick={onExportCsv}
          disabled={!canExport}
          className="outlined-filled-button px-4 py-2"
        >
          <Download aria-hidden="true" className="size-3.5 shrink-0" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}
