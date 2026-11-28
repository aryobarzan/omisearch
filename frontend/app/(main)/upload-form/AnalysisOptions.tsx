"use client";

import { Info, Sigma } from "lucide-react";
import { useState } from "react";
import { InfoDialog } from "../InfoDialog";
import { OptionChipGroup } from "./OptionChipGroup";

export const STAT_TEST_OPTIONS = [
  { value: "welch_t", label: "Welch’s t-test (default)" },
  { value: "mann_whitney", label: "Mann–Whitney U" },
] as const;

export const DATA_SCALE_OPTIONS = [
  { value: true, label: "My values are log2-transformed" },
  { value: false, label: "Apply log2-transform" },
] as const;

export type TestMethod = (typeof STAT_TEST_OPTIONS)[number]["value"];

interface AnalysisOptionsProps {
  testMethod: TestMethod;
  onTestMethodChange: (value: TestMethod) => void;
  isLog2: boolean;
  onIsLog2Change: (value: boolean) => void;
  disabled?: boolean;
}

export function AnalysisOptions({
  testMethod,
  onTestMethodChange,
  isLog2,
  onIsLog2Change,
  disabled = false,
}: AnalysisOptionsProps) {
  const [statInfoOpen, setStatInfoOpen] = useState(false);
  const [log2InfoOpen, setLog2InfoOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        <OptionChipGroup
          label="Statistical test"
          options={STAT_TEST_OPTIONS}
          value={testMethod}
          onChange={onTestMethodChange}
          disabled={disabled}
          infoButton={{
            ariaLabel: "Statistical test information",
            title: "Welch’s t-test vs. Mann–Whitney U",
            onClick: () => setStatInfoOpen(true),
          }}
        />

        <OptionChipGroup
          label="Data scale"
          options={DATA_SCALE_OPTIONS}
          value={isLog2}
          onChange={onIsLog2Change}
          disabled={disabled}
          infoButton={{
            ariaLabel: "Data scale formula information",
            title: "Data Scale Formula & Rationale",
            onClick: () => setLog2InfoOpen(true),
          }}
        />
      </div>

      <InfoDialog
        open={statInfoOpen}
        onClose={() => setStatInfoOpen(false)}
        title="Statistical Test"
        icon={<Info aria-hidden="true" className="size-5" />}
      >
        <div className="flex flex-col gap-3">
          <p>
            <strong className="font-semibold text-on-surface">
              Welch’s t-test (parametric, default):
            </strong>{" "}
            Compares group means without assuming equal variances. Recommended
            for approximately normally distributed data such as log2-transformed
            expression matrices.
          </p>
          <p>
            <strong className="font-semibold text-on-surface">
              Mann–Whitney U (non-parametric):
            </strong>{" "}
            Rank-based test comparing group distributions. Useful when data is
            heavily skewed or contains strong outliers, though it has lower
            power with very small replicate counts.
          </p>
          <p className="type-body-sm text-xs text-outline">
            Both tests produce two-sided p-values adjusted with
            Benjamini–Hochberg FDR correction.
          </p>
        </div>
      </InfoDialog>

      <InfoDialog
        open={log2InfoOpen}
        onClose={() => setLog2InfoOpen(false)}
        title="Data Scale & Log2 Transformation"
        icon={<Sigma aria-hidden="true" className="size-5" />}
      >
        <div className="flex flex-col gap-3">
          <p>
            Log2 transformation ensures symmetric fold-change scaling across
            high and low expression values. Tell Omisearch whether your uploaded
            matrix is already log2-transformed or still on a linear scale.
          </p>
          <div className="type-metric-sm rounded-xl border border-ghost-border-strong bg-surface-container-lowest p-3 leading-relaxed text-on-surface">
            <div>Linear scale: log2FC = log2((mean_b + ε) / (mean_a + ε))</div>
            <div>Log2 scale: log2FC = mean_b − mean_a</div>
          </div>
        </div>
      </InfoDialog>
    </>
  );
}
