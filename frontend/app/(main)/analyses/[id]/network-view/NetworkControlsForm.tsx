"use client";

import type { NetworkActionState } from "@/app/lib/actions/analysis";
import {
  validateInteractionsCsv,
  type InteractionsValidation,
} from "@/app/lib/csvValidation";
import {
  Check,
  CheckCircle2,
  LoaderCircle,
  Network,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

const THRESHOLD_FIELDS = [
  {
    id: "padj_threshold",
    label: "Max padj (FDR)",
    step: "0.005",
    min: "0",
    max: "1",
    defaultValue: "0.05",
  },
  {
    id: "lfc_threshold",
    label: "Min |log2FC|",
    step: "0.1",
    min: "0",
    defaultValue: "1.0",
  },
  {
    id: "min_score",
    label: "Min Edge Score (optional)",
    step: "0.05",
    min: "0",
    max: "1",
    placeholder: "e.g. 0.70",
  },
] as const;

interface NetworkControlsFormProps {
  analysisId: number;
  hasStoredInteractions: boolean;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  state: NetworkActionState;
  onResetSelection: () => void;
}

export function NetworkControlsForm({
  analysisId,
  hasStoredInteractions,
  formAction,
  isPending,
  state,
  onResetSelection,
}: NetworkControlsFormProps) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileCheck, setFileCheck] = useState<InteractionsValidation | null>(
    null,
  );
  const [includeIsolated, setIncludeIsolated] = useState(false);
  const fileSeq = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const seq = ++fileSeq.current;
    setSelectedFileName(file?.name ?? "");
    if (!file) {
      setFileCheck(null);
      return;
    }
    const result = await validateInteractionsCsv(file);
    if (seq === fileSeq.current) {
      setFileCheck(result);
    }
  }

  const canSubmit =
    !isPending &&
    (fileCheck === null || fileCheck.ok) &&
    (Boolean(selectedFileName) || hasStoredInteractions);

  const isUpdatingStored = hasStoredInteractions && !selectedFileName;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="analysis_id" value={analysisId} />
      <input
        type="hidden"
        name="has_stored_interactions"
        value={hasStoredInteractions ? "true" : "false"}
      />
      {includeIsolated && (
        <input type="hidden" name="include_isolated" value="on" />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THRESHOLD_FIELDS.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label
              htmlFor={field.id}
              className="type-label-sm text-on-surface-variant"
            >
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              type="number"
              step={field.step}
              min={field.min}
              max={"max" in field ? field.max : undefined}
              defaultValue={
                "defaultValue" in field ? field.defaultValue : undefined
              }
              placeholder={
                "placeholder" in field ? field.placeholder : undefined
              }
              disabled={isPending}
              className="text-input type-metric-md py-2"
            />
          </div>
        ))}

        <div className="flex items-end">
          <button
            type="button"
            role="switch"
            aria-checked={includeIsolated}
            disabled={isPending}
            onClick={() => setIncludeIsolated((v) => !v)}
            className={
              includeIsolated
                ? "chip chip-selected w-full justify-center py-2.5"
                : "chip w-full justify-center rounded-full py-2.5"
            }
          >
            {includeIsolated && (
              <Check
                aria-hidden="true"
                className="size-3.5 shrink-0"
                strokeWidth={2.5}
              />
            )}
            <span>Include isolated genes</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-ghost-border bg-surface-container-low/60 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              id="interactions_file"
              name="interactions_file"
              type="file"
              accept=".csv,text/csv"
              disabled={isPending}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              className="outlined-filled-button border-ghost-border-strong bg-surface-container-lowest px-4 py-2 font-medium text-on-surface shadow-xs hover:border-primary/35 hover:bg-primary/5"
            >
              <Upload aria-hidden="true" className="size-3.5 text-primary" />
              <span>
                {selectedFileName ||
                  (hasStoredInteractions
                    ? "Replace interactions CSV..."
                    : "Choose interactions CSV...")}
              </span>
            </button>

            {isUpdatingStored && (
              <span className="type-body-sm text-xs text-outline">
                Using stored interactions edge list
              </span>
            )}
          </div>

          {fileCheck &&
            (fileCheck.ok ? (
              <p className="type-body-sm flex items-center gap-1.5 text-xs font-medium text-status-success">
                <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
                <span>
                  {fileCheck.edgeCount}{" "}
                  {fileCheck.edgeCount === 1 ? "edge" : "edges"} detected
                  {fileCheck.hasScore ? " (with confidence scores)" : ""}
                </span>
              </p>
            ) : (
              <p
                role="alert"
                className="type-body-sm text-xs font-medium text-status-error"
              >
                {fileCheck.error}
              </p>
            ))}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          onClick={onResetSelection}
          className="filled-button shrink-0 px-5 py-2.5 text-xs"
        >
          {isPending ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 shrink-0 animate-spin"
            />
          ) : (
            <Network aria-hidden="true" className="size-3.5 shrink-0" />
          )}
          <span>
            {isPending
              ? isUpdatingStored
                ? "Updating..."
                : "Building..."
              : isUpdatingStored
                ? "Update Network"
                : "Build Network"}
          </span>
        </button>
      </div>

      {state.status === "error" && (
        <div role="alert" className="alert-error">
          {state.message}
        </div>
      )}
    </form>
  );
}
