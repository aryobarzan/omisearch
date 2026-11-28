"use client";

import {
  loadAndRunSampleAnalysis,
  type UploadActionState,
} from "@/app/lib/actions/analysis";
import { ArrowRight, Check, LoaderCircle, Play } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";

const INITIAL_STATE: UploadActionState = { status: "idle" };

const TEST_OPTIONS = [
  { value: "welch_t", label: "Welch’s t-test (default)" },
  { value: "mann_whitney", label: "Mann–Whitney U" },
] as const;

type TestMethod = (typeof TEST_OPTIONS)[number]["value"];

export default function SampleDatasetCard() {
  const [state, formAction, isPending] = useActionState(
    loadAndRunSampleAnalysis,
    INITIAL_STATE,
  );
  const [testMethod, setTestMethod] = useState<TestMethod>("welch_t");
  const testGroupLabelId = useId();

  const selectedLabel =
    TEST_OPTIONS.find((opt) => opt.value === testMethod)?.label ??
    "Welch’s t-test";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-on-primary shadow-[0_12px_36px_rgba(0,105,72,0.18)] md:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-on-primary/5 blur-3xl"
      />

      <form action={formAction} className="relative flex flex-col gap-6">
        <input type="hidden" name="test_method" value={testMethod} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="type-headline-md text-2xl font-semibold tracking-tight text-on-primary">
              Quick-Start Sample Dataset
            </h2>
            <p className="type-body-md leading-relaxed text-on-primary-container/90 md:text-base">
              200 genes × 12 samples (6{" "}
              <code className="font-mono text-[0.9em]">control</code> vs. 6{" "}
              <code className="font-mono text-[0.9em]">treated</code>, log2
              scale) with both up- and down-regulated Hallmark modules.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <span
              id={testGroupLabelId}
              className="type-label-sm text-primary-fixed/90"
            >
              Statistical Test
            </span>
            <div
              role="radiogroup"
              aria-labelledby={testGroupLabelId}
              className="inline-flex flex-wrap items-center gap-1.5 self-start"
            >
              {TEST_OPTIONS.map((option, index) => {
                const selected = testMethod === option.value;
                const unselectedRadius =
                  index === 0
                    ? "rounded-l-full rounded-r-lg"
                    : "rounded-l-lg rounded-r-full";

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isPending}
                    onClick={() => setTestMethod(option.value)}
                    className={
                      selected
                        ? "filled-button filled-button-inverted text-xs text-on-primary-fixed shadow-md"
                        : `type-label-lg inline-flex cursor-pointer items-center gap-2 ${unselectedRadius} border border-on-primary/15 bg-on-primary/15 px-5 py-2.5 text-xs font-medium text-on-primary transition-colors hover:bg-on-primary/25 active:bg-on-primary/35 disabled:cursor-not-allowed disabled:opacity-60`
                    }
                  >
                    {selected && (
                      <Check
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                        strokeWidth={2.5}
                      />
                    )}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-h-5">
            {isPending && (
              <p
                role="status"
                className="type-body-sm font-medium text-on-primary-container/90"
              >
                Analyzing sample dataset with {selectedLabel}...
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="filled-button filled-button-inverted ml-auto w-full px-7 py-3 text-sm shadow-lg sm:w-auto"
          >
            {isPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 shrink-0 animate-spin"
              />
            ) : (
              <Play
                aria-hidden="true"
                className="size-4 shrink-0 fill-current"
              />
            )}
            <span>{isPending ? "Running analysis..." : "Analyze"}</span>
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <div
          role="alert"
          className="relative mt-4 rounded-2xl border border-error/25 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div
          role="status"
          className="relative mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-on-primary/20 bg-on-primary/12 px-4 py-3 text-sm text-on-primary"
        >
          <span>
            <strong className="font-semibold">{state.run.name}</strong>{" "}
            completed:{" "}
            <strong className="type-metric-md font-semibold">
              {state.run.significant_genes} / {state.run.total_genes}
            </strong>{" "}
            significant genes (
            <code className="font-mono text-xs">padj ≤ 0.05</code>,{" "}
            {state.run.group_a} vs. {state.run.group_b}).
          </span>
          <Link
            href={`/analyses/${state.run.id}`}
            className="filled-button filled-button-inverted gap-1.5 px-3.5 py-1.5 text-xs"
          >
            <span>View results</span>
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
