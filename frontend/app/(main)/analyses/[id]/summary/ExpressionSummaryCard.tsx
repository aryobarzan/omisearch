import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

interface ExpressionSummaryCardProps {
  totalGenes: number | null;
  significantGenes: number | null;
  sigUp: number;
  sigDown: number;
}

interface SummarySegment {
  key: string;
  label: string;
  subtitle: string;
  count: number;
  barClass: string;
  valueClass: string;
  labelClass: string;
  icon: ReactNode;
}

function formatPct(count: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

export function ExpressionSummaryCard({
  totalGenes,
  significantGenes,
  sigUp,
  sigDown,
}: ExpressionSummaryCardProps) {
  const total = totalGenes ?? 0;
  const sigTotal = significantGenes ?? sigUp + sigDown;
  const nonSig = Math.max(0, total - sigUp - sigDown);

  const segments: SummarySegment[] = [
    {
      key: "down",
      label: "Downregulated",
      subtitle: "log2FC < 0, padj ≤ 0.05",
      count: sigDown,
      barClass: "bg-fc-down",
      valueClass: "font-semibold text-fc-down",
      labelClass: "text-on-surface",
      icon: (
        <TrendingDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-fc-down"
        />
      ),
    },
    {
      key: "ns",
      label: "Not significant",
      subtitle: "padj > 0.05",
      count: nonSig,
      barClass: "bg-fc-neutral",
      valueClass: "font-medium text-on-surface-variant",
      labelClass: "text-on-surface-variant",
      icon: (
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-fc-neutral ring-1 ring-ghost-border-strong"
        />
      ),
    },
    {
      key: "up",
      label: "Upregulated",
      subtitle: "log2FC > 0, padj ≤ 0.05",
      count: sigUp,
      barClass: "bg-fc-up",
      valueClass: "font-semibold text-fc-up",
      labelClass: "text-on-surface",
      icon: (
        <TrendingUp
          aria-hidden="true"
          className="size-3.5 shrink-0 text-fc-up"
        />
      ),
    },
  ];

  return (
    <section className="section-card">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <span className="type-label-sm text-on-surface-variant">
            Expression Summary
          </span>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="type-metric-lg text-3xl text-status-success">
              {sigTotal.toLocaleString()}
            </span>
            <span className="type-body-md text-on-surface-variant">
              of{" "}
              <strong className="type-metric-md font-semibold text-on-surface">
                {total.toLocaleString()}
              </strong>{" "}
              genes significant
            </span>
          </div>
        </div>

        <p className="type-body-sm text-xs text-outline">
          {formatPct(sigTotal, total)} remain significant following
          Benjamini–Hochberg FDR correction (
          <code className="font-mono">padj ≤ 0.05</code>)
        </p>
      </div>

      {/* Material 3 Expressive segmented pill bar */}
      <div
        role="img"
        aria-label={segments.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(", ")}
        className="flex h-3 w-full items-center gap-1"
      >
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div
                key={seg.key}
                style={{ flexGrow: seg.count, flexBasis: 0 }}
                className={`h-full min-w-2 rounded-full transition-all ${seg.barClass}`}
                title={`${seg.label}: ${seg.count} (${formatPct(seg.count, total)})`}
              />
            ),
        )}
      </div>

      {/* Compact 3-column breakdown */}
      <dl className="grid grid-cols-1 divide-y divide-ghost-border rounded-2xl border border-ghost-border bg-surface-container-low/45 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <dt className="flex flex-col gap-0.5">
              <span
                className={`type-label-lg flex items-center gap-1.5 text-xs font-medium ${seg.labelClass}`}
              >
                {seg.icon}
                <span>{seg.label}</span>
              </span>
              <span className="type-body-sm text-[11px] text-outline">
                {seg.subtitle}
              </span>
            </dt>
            <dd className="flex flex-col items-end">
              <span className={`type-metric-md text-sm ${seg.valueClass}`}>
                {seg.count.toLocaleString()}
              </span>
              <span className="type-metric-sm text-outline">
                {formatPct(seg.count, total)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
