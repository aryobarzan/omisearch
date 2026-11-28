"use client";

import { Check } from "lucide-react";

export interface FilterChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface FilterChipGroupProps<T extends string> {
  ariaLabel: string;
  options: readonly FilterChipOption<T>[];
  selected: ReadonlySet<T>;
  onToggle: (value: T) => void;
}

export function FilterChipGroup<T extends string>({
  ariaLabel,
  options,
  selected,
  onToggle,
}: FilterChipGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((option) => {
        const isSelected = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(option.value)}
            className={isSelected ? "chip chip-selected" : "chip"}
          >
            {isSelected && (
              <Check
                aria-hidden="true"
                className="size-3.5 shrink-0"
                strokeWidth={2.5}
              />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
