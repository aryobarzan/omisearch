"use client";

import {
  buildAnalysisNetwork,
  type NetworkActionState,
} from "@/app/lib/actions/analysis";
import type {
  CytoscapeNodeData,
  NetworkResponse,
} from "@/app/lib/types/analysis";
import { useActionState, useMemo, useState } from "react";
import { LAYOUT_OPTIONS, type LayoutName } from "./cytoscapeConfig";
import { NetworkCanvas } from "./NetworkCanvas";
import { NetworkControlsForm } from "./NetworkControlsForm";
import { NodeInspector, type NeighborSummary } from "./NodeInspector";

const INITIAL_STATE: NetworkActionState = { status: "idle" };

export default function NetworkView({
  analysisId,
  groupA,
  groupB,
}: {
  analysisId: number;
  groupA: string;
  groupB: string;
}) {
  const [state, formAction, isPending] = useActionState(
    buildAnalysisNetwork,
    INITIAL_STATE,
  );
  const [layout, setLayout] = useState<LayoutName>("cose");
  const [selectedGeneId, setSelectedGeneId] = useState<string | null>(null);

  const network: NetworkResponse | null =
    state.status === "success" ? state.network : null;

  const selectedNode: CytoscapeNodeData | null = useMemo(() => {
    if (!network || !selectedGeneId) return null;
    return (
      network.nodes.find((n) => n.data.id === selectedGeneId)?.data ?? null
    );
  }, [network, selectedGeneId]);

  const selectedNeighbors: NeighborSummary[] = useMemo(() => {
    if (!network || !selectedGeneId) return [];
    const nodeById = new Map(network.nodes.map((n) => [n.data.id, n.data]));
    const neighbors: NeighborSummary[] = [];

    for (const edge of network.edges) {
      const { source, target, score } = edge.data;
      const otherId =
        source === selectedGeneId
          ? target
          : target === selectedGeneId
            ? source
            : null;
      if (!otherId) continue;

      const other = nodeById.get(otherId);
      if (other) {
        neighbors.push({
          gene: otherId,
          score: score ?? null,
          lfc: other.log2_fold_change,
        });
      }
    }

    neighbors.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return neighbors;
  }, [network, selectedGeneId]);

  return (
    <section className="section-card gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-headline-md text-xl font-semibold tracking-tight text-on-surface">
          Gene–Gene Interaction Network
        </h2>
        <p className="type-body-sm text-on-surface-variant">
          Overlay significant DGE genes onto an interaction edge list (
          <code className="font-mono text-xs">gene_a,gene_b[,score]</code>) or
          load the bundled STRING-style sample interactions.
        </p>
      </div>

      <NetworkControlsForm
        analysisId={analysisId}
        formAction={formAction}
        isPending={isPending}
        state={state}
        onResetSelection={() => setSelectedGeneId(null)}
      />

      {network && (
        <div className="flex flex-col gap-4 border-t border-ghost-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="type-metric-sm rounded-full border border-primary/20 bg-primary/8 px-3 py-1 font-semibold text-on-primary-fixed-variant">
                {network.node_count} nodes · {network.edge_count} edges
              </span>
              <span className="type-body-sm text-xs text-outline">
                {network.total_significant_genes} genes met{" "}
                <code className="font-mono">
                  padj ≤ {network.padj_threshold}
                </code>{" "}
                &amp;{" "}
                <code className="font-mono">
                  |log2FC| ≥ {network.lfc_threshold}
                </code>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="network_layout"
                className="type-label-sm text-on-surface-variant"
              >
                Layout
              </label>
              <select
                id="network_layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value as LayoutName)}
                className="type-body-sm cursor-pointer rounded-full border border-ghost-border-strong bg-surface-container-low/70 px-3.5 py-1.5 text-xs font-medium text-on-surface focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
              >
                {LAYOUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {network.node_count === 0 ? (
            <div className="empty-panel py-10">
              <p className="type-body-md text-on-surface-variant">
                No interactions matched the current significance thresholds. Try
                relaxing <code className="font-mono text-xs">padj</code>,
                lowering <code className="font-mono text-xs">|log2FC|</code>, or
                enabling{" "}
                <strong className="font-semibold text-on-surface">
                  Include isolated genes
                </strong>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
              <NetworkCanvas
                network={network}
                layout={layout}
                selectedGeneId={selectedGeneId}
                onSelectGene={setSelectedGeneId}
              />
              <NodeInspector
                selectedNode={selectedNode}
                neighbors={selectedNeighbors}
                groupA={groupA}
                groupB={groupB}
                onSelectGene={setSelectedGeneId}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
