import type { AnalysisRunSummary } from "@/app/lib/types/analysis";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  formatDateShort,
  formatDateTime,
  STATUS_META,
  TEST_LABELS,
} from "./runFormatting";

export function RunCard({ run }: { run: AnalysisRunSummary }) {
  const status = STATUS_META[run.status];
  const StatusIcon = status.Icon;

  return (
    <Link
      href={`/analyses/${run.id}`}
      role="listitem"
      className="group run-card"
    >
      <div className="flex w-full flex-col lg:w-auto">
        <span className="type-label-lg text-sm font-semibold text-on-surface transition-colors group-hover:text-on-primary-fixed">
          {run.name}
        </span>
        <span className="type-metric-sm text-outline lg:hidden">
          {formatDateTime(run.created_at)}
        </span>
      </div>

      <div className="flex w-full items-center lg:w-auto">
        <span
          className={`type-label-lg inline-flex items-center gap-1.5 text-xs font-medium ${status.className}`}
        >
          <StatusIcon aria-hidden="true" className="size-4 shrink-0" />
          <span>{status.label}</span>
        </span>
      </div>

      <div className="flex w-full items-center lg:w-auto">
        <span className="type-body-sm text-xs text-on-surface-variant">
          {TEST_LABELS[run.test_method]}
        </span>
      </div>

      <div className="flex w-full items-center lg:w-auto">
        <span className="type-body-sm text-xs text-on-surface-variant">
          {run.group_a && run.group_b
            ? `${run.group_a} (${run.n_group_a}) vs. ${run.group_b} (${run.n_group_b})`
            : "—"}
        </span>
      </div>

      <div className="flex w-full items-center justify-between lg:w-auto lg:justify-end">
        <span className="type-metric-md text-xs font-semibold text-on-surface">
          {run.significant_genes !== null && run.total_genes !== null
            ? `${run.significant_genes} / ${run.total_genes}`
            : "—"}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-outline transition-all group-hover:translate-x-0.5 group-hover:text-primary lg:hidden"
        />
      </div>

      <div className="hidden items-center justify-end gap-3 lg:flex">
        <span
          title={formatDateTime(run.created_at)}
          className="type-metric-sm whitespace-nowrap text-on-surface-variant"
        >
          {formatDateShort(run.created_at)}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-outline transition-all group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Link>
  );
}
