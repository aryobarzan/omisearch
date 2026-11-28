"use client";

import {
  uploadAndRunAnalysis,
  type UploadActionState,
} from "@/app/lib/actions/analysis";
import {
  validateAnnotationsCsv,
  validateExpressionCsv,
  type AnnotationsValidation,
  type ExpressionValidation,
} from "@/app/lib/csvValidation";
import { LoaderCircle, Rocket, Table } from "lucide-react";
import { useActionState, useId, useMemo, useRef, useState } from "react";
import { AnalysisOptions, type TestMethod } from "./AnalysisOptions";
import { CsvDropzoneField, type FieldValidation } from "./CsvDropzoneField";
import {
  ActionResultBanner,
  ValidationBanners,
} from "./UploadStatusBanners";

const INITIAL_STATE: UploadActionState = { status: "idle" };

export default function UploadForm() {
  const [state, formAction, isPending] = useActionState(
    uploadAndRunAnalysis,
    INITIAL_STATE,
  );

  const [exprFile, setExprFile] = useState<File | null>(null);
  const [annFile, setAnnFile] = useState<File | null>(null);
  const [exprCheck, setExprCheck] = useState<ExpressionValidation | null>(null);
  const [annCheck, setAnnCheck] = useState<AnnotationsValidation | null>(null);
  const [testMethod, setTestMethod] = useState<TestMethod>("welch_t");
  const [isLog2, setIsLog2] = useState(true);

  const exprSeq = useRef(0);
  const annSeq = useRef(0);
  const nameInputId = useId();

  async function handleExpressionFile(file: File | null) {
    setExprFile(file);
    const seq = ++exprSeq.current;
    if (!file) {
      setExprCheck(null);
      return;
    }
    const result = await validateExpressionCsv(file);
    if (seq === exprSeq.current) {
      setExprCheck(result);
    }
  }

  async function handleAnnotationsFile(file: File | null) {
    setAnnFile(file);
    const seq = ++annSeq.current;
    if (!file) {
      setAnnCheck(null);
      return;
    }
    const result = await validateAnnotationsCsv(file);
    if (seq === annSeq.current) {
      setAnnCheck(result);
    }
  }

  function handleSubmit(formData: FormData) {
    if (exprFile) {
      formData.set("expression_file", exprFile);
    } else {
      formData.delete("expression_file");
    }
    if (annFile) {
      formData.set("annotations_file", annFile);
    } else {
      formData.delete("annotations_file");
    }
    formAction(formData);
  }

  const crossFileError = useMemo(() => {
    if (!exprCheck?.ok || !annCheck?.ok) return null;
    const exprSampleSet = new Set(exprCheck.sampleCols);
    const missing = annCheck.samples.filter((s) => !exprSampleSet.has(s));
    if (missing.length > 0) {
      const preview = missing.slice(0, 5).join(", ");
      const suffix = missing.length > 5 ? ` (+${missing.length - 5} more)` : "";
      return `Expression CSV is missing annotated sample column(s): ${preview}${suffix}.`;
    }
    return null;
  }, [exprCheck, annCheck]);

  const linearNegativeError =
    exprCheck?.ok && !isLog2 && exprCheck.hasNegative
      ? "Linear-scale expression values cannot be negative. Choose “My values are log2-transformed” if values are already log2-scaled."
      : null;

  const log2ScaleWarning =
    exprCheck?.ok && isLog2 && exprCheck.maxValue > 50
      ? `Expression values reach up to ${exprCheck.maxValue.toFixed(1)} — double-check whether this file is linear-scale rather than log2-transformed.`
      : null;

  const hasHardError =
    (exprCheck !== null && !exprCheck.ok) ||
    (annCheck !== null && !annCheck.ok) ||
    crossFileError !== null ||
    linearNegativeError !== null;

  const exprValidation: FieldValidation = exprCheck
    ? exprCheck.ok
      ? {
          ok: true,
          summary: `${exprCheck.geneCount} genes × ${exprCheck.sampleCols.length} samples detected`,
        }
      : { ok: false, error: exprCheck.error }
    : null;

  const annValidation: FieldValidation = annCheck
    ? annCheck.ok
      ? {
          ok: true,
          summary: `${annCheck.groups.map(([g, n]) => `${n} ${g}`).join(" vs. ")} samples`,
        }
      : { ok: false, error: annCheck.error }
    : null;

  return (
    <section className="flex w-full flex-col gap-6 rounded-3xl border border-ghost-border-strong bg-surface-container-lowest p-6 shadow-[0_8px_30px_rgba(15,23,42,0.03)] md:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
          Upload Omics Dataset
        </h2>
        <p className="type-body-sm text-on-surface-variant">
          Provide an expression matrix and sample group annotations in CSV
          format.
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-5">
        <input type="hidden" name="test_method" value={testMethod} />
        <input type="hidden" name="is_log2" value={isLog2 ? "true" : "false"} />

        <div className="flex flex-col gap-2">
          <label
            htmlFor={nameInputId}
            className="type-label-lg text-xs font-semibold text-on-surface"
          >
            Analysis name (optional)
          </label>
          <input
            id={nameInputId}
            name="name"
            type="text"
            maxLength={120}
            disabled={isPending}
            placeholder="Leave blank to auto-name or enter custom name (e.g. Treated vs. Control)..."
            className="type-body-md w-full rounded-2xl border border-ghost-border-strong bg-surface-container-low/60 px-4 py-2.5 text-on-surface shadow-xs transition-colors placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CsvDropzoneField
            label="Expression CSV"
            hint="genes as rows, sample IDs as columns"
            icon={<Table aria-hidden="true" className="size-5" />}
            defaultFileName="expression.csv"
            placeholder={
              "gene,sample1,sample2,sample3...\nGAPDH,12.4,12.1,12.5...\nACTB,14.0,13.8,14.2..."
            }
            disabled={isPending}
            validation={exprValidation}
            onFileChange={handleExpressionFile}
          />

          <CsvDropzoneField
            label="Sample annotations CSV"
            hint={
              <>
                columns <code className="font-mono">sample,group</code>, 2
                groups, ≥ 2 samples each
              </>
            }
            icon={<Table aria-hidden="true" className="size-5" />}
            defaultFileName="annotations.csv"
            placeholder={
              "sample,group\nsample1,control\nsample2,control\nsample3,treated..."
            }
            disabled={isPending}
            validation={annValidation}
            onFileChange={handleAnnotationsFile}
          />
        </div>

        <ValidationBanners
          hardError={crossFileError ?? linearNegativeError}
          warning={hasHardError ? null : log2ScaleWarning}
        />

        <AnalysisOptions
          testMethod={testMethod}
          onTestMethodChange={setTestMethod}
          isLog2={isLog2}
          onIsLog2Change={setIsLog2}
          disabled={isPending}
        />

        <div className="flex flex-wrap items-center justify-between gap-space-md pt-2">
          <div className="min-h-5">
            {isPending && (
              <p
                role="status"
                className="type-body-sm font-medium text-primary"
              >
                Running DGE analysis...
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || hasHardError || !exprFile || !annFile}
            className="filled-button ml-auto px-7 py-3 text-sm shadow-md"
          >
            {isPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 shrink-0 animate-spin"
              />
            ) : (
              <Rocket aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span>
              {isPending ? "Running DGE analysis..." : "Upload & Run Analysis"}
            </span>
          </button>
        </div>

        <ActionResultBanner state={state} />
      </form>
    </section>
  );
}
