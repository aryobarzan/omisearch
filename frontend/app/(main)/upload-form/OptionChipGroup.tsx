"use client";

import { Check, Info } from "lucide-react";
import { useId } from "react";

export interface ChipOption<T> {
  readonly value: T;
  readonly label: string;
}

interface OptionChipGroupProps<T> {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  infoButton?: {
    ariaLabel: string;
    title: string;
    onClick: () => void;
  };
}

export function OptionChipGroup<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  infoButton,
}: OptionChipGroupProps<T>) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <span
          id={labelId}
          className="type-label-lg text-xs font-semibold text-on-surface"
        >
          {label}
        </span>
        {infoButton && (
          <button
            type="button"
            aria-label={infoButton.ariaLabel}
            title={infoButton.title}
            onClick={infoButton.onClick}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap items-center gap-1.5"
      >
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={selected ? "chip chip-selected" : "chip"}
            >
              {selected && (
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
    </div>
  );
}
