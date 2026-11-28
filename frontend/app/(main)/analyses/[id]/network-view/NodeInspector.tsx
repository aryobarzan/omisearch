"use client";

import type { CytoscapeNodeData } from "@/app/lib/types/analysis";
import { Network, X } from "lucide-react";
import { formatPValue } from "../results-table/dgeFormatting";

export interface NeighborSummary {
  gene: string;
  score: number | null;
  lfc: number;
}

interface NodeInspectorProps {
  selectedNode: CytoscapeNodeData | null;
  neighbors: NeighborSummary[];
  groupA: string;
  groupB: string;
  onSelectGene: (geneId: string | null) => void;
}

export function NodeInspector({
  selectedNode,
  neighbors,
  groupA,
  groupB,
  onSelectGene,
}: NodeInspectorProps) {
  const isUp = selectedNode ? selectedNode.log2_fold_change >= 0 : false;
  const stats = selectedNode
    ? [
        {
          label: "log2FC",
          value: `${selectedNode.log2_fold_change > 0 ? "+" : ""}${selectedNode.log2_fold_change.toFixed(3)}`,
          valueClass: isUp
            ? "font-semibold text-fc-up"
            : "font-semibold text-fc-down",
        },
        {
          label: "padj (FDR)",
          value: formatPValue(selectedNode.adjusted_p_value),
          valueClass: "font-semibold text-status-success",
        },
        {
          label: "p-value",
          value: formatPValue(selectedNode.p_value),
          valueClass: "text-on-surface",
        },
        {
          label: `Mean (${groupA})`,
          value: selectedNode.mean_group_a.toFixed(3),
          valueClass: "text-on-surface",
        },
        {
          label: `Mean (${groupB})`,
          value: selectedNode.mean_group_b.toFixed(3),
          valueClass: "text-on-surface",
        },
        {
          label: "Degree",
          value: String(selectedNode.degree),
          valueClass: "text-on-surface",
        },
      ]
    : [];

  return (
    <aside className="flex flex-col rounded-2xl border border-ghost-border-strong bg-surface-container-low/55 p-5 lg:col-span-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-label-sm text-on-surface-variant">
          Node Inspector
        </h3>
        {selectedNode && (
          <button
            type="button"
            aria-label="Clear selected node"
            onClick={() => onSelectGene(null)}
            className="icon-button h-6 w-6 rounded-full"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      {!selectedNode ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Network aria-hidden="true" className="size-5" />
          </div>
          <p className="type-body-sm max-w-[220px] leading-relaxed text-on-surface-variant">
            Click any gene node in the graph to inspect its DGE statistics and
            connected partners.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="type-headline-sm text-lg font-semibold text-on-surface">
              {selectedNode.label}
            </span>
            <span
              className={`type-label-lg rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isUp ? "bg-fc-up-soft text-fc-up" : "bg-fc-down-soft text-fc-down"
              }`}
            >
              {isUp ? "Upregulated" : "Downregulated"}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-2.5 border-y border-ghost-border py-3.5">
            {stats.map((stat) => (
              <div key={stat.label} className="contents">
                <dt className="type-body-sm text-xs text-on-surface-variant">
                  {stat.label}
                </dt>
                <dd className={`type-metric-md text-right ${stat.valueClass}`}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2">
            <p className="type-label-sm text-on-surface-variant">
              Connected Neighbors ({neighbors.length})
            </p>
            {neighbors.length === 0 ? (
              <p className="type-body-sm text-xs text-outline">
                No connected neighbors.
              </p>
            ) : (
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
                {neighbors.map((nbr) => (
                  <li key={nbr.gene}>
                    <button
                      type="button"
                      onClick={() => onSelectGene(nbr.gene)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent bg-surface-container-lowest/80 px-3 py-1.5 text-left transition-colors hover:border-primary/25 hover:bg-primary/6"
                    >
                      <span className="type-label-lg text-xs font-semibold text-on-surface">
                        {nbr.gene}
                      </span>
                      <span className="type-metric-sm flex items-center gap-1.5 text-on-surface-variant">
                        <span
                          className={
                            nbr.lfc >= 0
                              ? "font-semibold text-fc-up"
                              : "font-semibold text-fc-down"
                          }
                        >
                          {nbr.lfc > 0 ? "+" : ""}
                          {nbr.lfc.toFixed(2)}
                        </span>
                        {nbr.score !== null && (
                          <span className="text-outline">
                            · {nbr.score.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
