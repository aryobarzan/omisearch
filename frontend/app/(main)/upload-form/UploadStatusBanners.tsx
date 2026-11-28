import type { UploadActionState } from "@/app/lib/actions/analysis";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ValidationBannersProps {
  hardError: string | null;
  warning: string | null;
}

export function ValidationBanners({
  hardError,
  warning,
}: ValidationBannersProps) {
  return (
    <>
      {hardError && (
        <div role="alert" className="alert-error">
          {hardError}
        </div>
      )}

      {!hardError && warning && (
        <div
          role="status"
          className="type-body-sm rounded-2xl border border-status-warning/30 bg-status-warning-soft px-4 py-3 font-medium text-on-surface"
        >
          {warning}
        </div>
      )}
    </>
  );
}

export function ActionResultBanner({ state }: { state: UploadActionState }) {
  if (state.status === "error") {
    return (
      <div role="alert" className="alert-error">
        {state.message}
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-status-success-soft px-4 py-3 text-sm text-on-primary-fixed-variant"
      >
        <span>
          <strong className="font-semibold text-on-surface">
            {state.run.name}
          </strong>{" "}
          completed:{" "}
          <strong className="type-metric-md font-semibold text-on-surface">
            {state.run.significant_genes} / {state.run.total_genes}
          </strong>{" "}
          significant genes (
          <code className="font-mono text-xs">padj ≤ 0.05</code>,{" "}
          {state.run.group_a} vs. {state.run.group_b}).
        </span>
        <Link
          href={`/analyses/${state.run.id}`}
          className="filled-button gap-1.5 px-3.5 py-1.5 text-xs"
        >
          <span>View results</span>
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    );
  }

  return null;
}
