"use client";

import {
  buildAnalysisNetwork,
  type NetworkActionState,
} from "@/app/lib/actions/analysis";
import type {
  CytoscapeNodeData,
  NetworkResponse,
} from "@/app/lib/types/analysis";
import cytoscape, {
  type Core,
  type EdgeSingular,
  type LayoutOptions,
  type NodeSingular,
} from "cytoscape";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

type LayoutName = "cose" | "circle" | "concentric" | "grid" | "breadthfirst";

const INITIAL_STATE: NetworkActionState = { status: "idle" };

/** Interpolate log2 fold change into a blue (-2.5) -> neutral (0) -> red (+2.5) hex color. */
function log2fcToColor(lfc: number): string {
  const maxAbs = 2.5;
  const t = Math.max(-1, Math.min(1, lfc / maxAbs));
  const neutral = [226, 232, 240]; // slate-200
  const target =
    t >= 0
      ? [220, 38, 38] // red-600 (upregulated)
      : [37, 99, 235]; // blue-600 (downregulated)
  const w = Math.abs(t);
  const r = Math.round(neutral[0] + (target[0] - neutral[0]) * w);
  const g = Math.round(neutral[1] + (target[1] - neutral[1]) * w);
  const b = Math.round(neutral[2] + (target[2] - neutral[2]) * w);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatPValue(val: number): string {
  if (val === 0) return "< 1e-300";
  if (val < 0.001) return val.toExponential(2);
  return val.toFixed(4);
}

function buildLayoutOptions(name: LayoutName): LayoutOptions {
  if (name === "cose") {
    return {
      name: "cose",
      animate: false,
      padding: 28,
      nodeRepulsion: () => 6000,
      idealEdgeLength: () => 85,
    } as LayoutOptions;
  }
  if (name === "concentric") {
    return {
      name: "concentric",
      animate: false,
      padding: 28,
      concentric: (node) => Number(node.data("degree") ?? 0),
      levelWidth: () => 2,
    };
  }
  return { name, animate: false, padding: 28 };
}

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
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const network: NetworkResponse | null =
    state.status === "success" ? state.network : null;

  const selectedNode: CytoscapeNodeData | null = useMemo(() => {
    if (!network || !selectedGeneId) return null;
    return (
      network.nodes.find((n) => n.data.id === selectedGeneId)?.data ?? null
    );
  }, [network, selectedGeneId]);

  const selectedNeighbors = useMemo(() => {
    if (!network || !selectedGeneId) return [];
    const nodeById = new Map(network.nodes.map((n) => [n.data.id, n.data]));
    const neighbors: { gene: string; score: number | null; lfc: number }[] = [];
    for (const edge of network.edges) {
      const { source, target, score } = edge.data;
      let otherId: string | null = null;
      if (source === selectedGeneId) otherId = target;
      else if (target === selectedGeneId) otherId = source;
      if (otherId) {
        const other = nodeById.get(otherId);
        if (other) {
          neighbors.push({
            gene: otherId,
            score: score ?? null,
            lfc: other.log2_fold_change,
          });
        }
      }
    }
    neighbors.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return neighbors;
  }, [network, selectedGeneId]);

  // Initialize / rebuild Cytoscape instance when network data changes.
  useEffect(() => {
    if (!containerRef.current || !network) {
      cyRef.current?.destroy();
      cyRef.current = null;
      return;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: network.nodes.map((n) => ({ data: { ...n.data } })),
        edges: network.edges.map((e) => ({ data: { ...e.data } })),
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": (ele: NodeSingular) =>
              log2fcToColor(Number(ele.data("log2_fold_change") ?? 0)),
            "border-width": 1.5,
            "border-color": "#334155",
            width: (ele: NodeSingular) =>
              Math.min(50, 26 + Number(ele.data("degree") ?? 0) * 2.2),
            height: (ele: NodeSingular) =>
              Math.min(50, 26 + Number(ele.data("degree") ?? 0) * 2.2),
            "font-size": "10px",
            "font-weight": 600,
            color: "#0f172a",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "#94a3b8",
            width: (ele: EdgeSingular) => {
              const score = ele.data("score");
              return typeof score === "number" ? 1 + score * 2.5 : 1.5;
            },
            opacity: (ele: EdgeSingular) => {
              const score = ele.data("score");
              return typeof score === "number" ? 0.35 + score * 0.55 : 0.65;
            },
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.18,
          },
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 3,
            "border-color": "#0f172a",
            opacity: 1,
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-color": "#0f172a",
            opacity: 0.95,
          },
        },
      ],
      layout: buildLayoutOptions(layout),
      minZoom: 0.25,
      maxZoom: 3,
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setSelectedGeneId(node.id());
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedGeneId(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // Layout switches are handled smoothly by the separate effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  // Re-run layout without recreating the Cytoscape instance when layout changes.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !network) return;
    cy.layout(buildLayoutOptions(layout)).run();
  }, [layout, network]);

  // Highlight selected node and its immediate neighborhood.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("dimmed highlighted");
    if (!selectedGeneId) return;

    const target = cy.getElementById(selectedGeneId);
    if (target.empty()) return;

    const neighborhood = target.closedNeighborhood();
    cy.elements().not(neighborhood).addClass("dimmed");
    neighborhood.addClass("highlighted");
  }, [selectedGeneId, network]);

  function handleFitView() {
    cyRef.current?.fit(undefined, 32);
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Gene–Gene Interaction Network
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Overlay significant DGE genes onto an interaction edge list (
          <code>gene_a,gene_b[,score]</code>) or load the bundled STRING-style
          sample interactions.
        </p>
      </div>

      {/* Filter & edge-list form */}
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="analysis_id" value={analysisId} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="padj_threshold"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Max padj (FDR)
            </label>
            <input
              id="padj_threshold"
              name="padj_threshold"
              type="number"
              step="0.005"
              min="0"
              max="1"
              defaultValue="0.05"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
            />
          </div>

          <div>
            <label
              htmlFor="lfc_threshold"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Min |log2FC|
            </label>
            <input
              id="lfc_threshold"
              name="lfc_threshold"
              type="number"
              step="0.1"
              min="0"
              defaultValue="1.0"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
            />
          </div>

          <div>
            <label
              htmlFor="min_score"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Min Edge Score (optional)
            </label>
            <input
              id="min_score"
              name="min_score"
              type="number"
              step="0.05"
              min="0"
              max="1"
              placeholder="e.g. 0.70"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label
              htmlFor="include_isolated"
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <input
                id="include_isolated"
                name="include_isolated"
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              Include isolated genes
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              id="interactions_file"
              name="interactions_file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) =>
                setSelectedFileName(e.target.files?.[0]?.name ?? "")
              }
              className="block max-w-xs text-sm file:mr-3 file:rounded file:border-0 file:bg-white file:px-2.5 py-1 file:py-1 file:text-xs file:font-medium file:shadow-xs hover:file:bg-zinc-100 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            />
            <button
              type="submit"
              name="mode"
              value="upload"
              disabled={isPending || !selectedFileName}
              onClick={() => setSelectedGeneId(null)}
              className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
            >
              {isPending ? "Building..." : "Build from Upload"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">or</span>
            <button
              type="submit"
              name="mode"
              value="sample"
              disabled={isPending}
              onClick={() => setSelectedGeneId(null)}
              className="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Loading..." : "Load Sample Interactions"}
            </button>
          </div>
        </div>

        {state.status === "error" && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {state.message}
          </div>
        )}
      </form>

      {/* Network canvas + legend + node inspector */}
      {network && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 text-sm dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="rounded bg-zinc-100 px-2 py-1 font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {network.node_count} nodes · {network.edge_count} edges
              </span>
              <span>
                ({network.total_significant_genes} genes met{" "}
                <code>padj ≤ {network.padj_threshold}</code> &amp;{" "}
                <code>|log2FC| ≥ {network.lfc_threshold}</code>)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="network_layout"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Layout:
              </label>
              <select
                id="network_layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value as LayoutName)}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="cose">Force-directed (CoSE)</option>
                <option value="circle">Circle</option>
                <option value="concentric">Concentric (by degree)</option>
                <option value="grid">Grid</option>
                <option value="breadthfirst">Breadthfirst</option>
              </select>

              <button
                type="button"
                onClick={handleFitView}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Fit view
              </button>

              {selectedGeneId && (
                <button
                  type="button"
                  onClick={() => setSelectedGeneId(null)}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                −2.5 (Down)
              </span>
              <div
                className="h-3 w-44 rounded-full border border-zinc-300 dark:border-zinc-700"
                style={{
                  background:
                    "linear-gradient(to right, rgb(37, 99, 235), rgb(226, 232, 240), rgb(220, 38, 38))",
                }}
              />
              <span className="font-medium text-red-600 dark:text-red-400">
                +2.5 (Up)
              </span>
              <span className="ml-2 text-zinc-500">Node color: log2FC</span>
            </div>
            <span className="text-zinc-500">
              Node size = degree · Edge thickness = confidence score
            </span>
          </div>

          {network.node_count === 0 ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              No interactions matched the current significance thresholds. Try
              relaxing <code>padj</code>, lowering <code>|log2FC|</code>, or
              checking <strong>Include isolated genes</strong>.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Cytoscape canvas */}
              <div
                ref={containerRef}
                className="h-[480px] w-full rounded-md border border-zinc-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"
              />

              {/* Node detail inspector */}
              <aside className="flex flex-col rounded-md border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <h3 className="text-sm font-semibold tracking-tight">
                  Node Inspector
                </h3>

                {!selectedNode ? (
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Click any gene node in the graph to inspect its DGE
                    statistics and connected interaction partners.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold">
                        {selectedNode.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          selectedNode.log2_fold_change >= 0
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {selectedNode.log2_fold_change >= 0
                          ? "Upregulated"
                          : "Downregulated"}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-y-2 border-y border-zinc-200 py-3 font-mono dark:border-zinc-800">
                      <dt className="font-sans text-zinc-500">log2FC</dt>
                      <dd className="text-right font-semibold">
                        {selectedNode.log2_fold_change > 0 ? "+" : ""}
                        {selectedNode.log2_fold_change.toFixed(3)}
                      </dd>

                      <dt className="font-sans text-zinc-500">padj (FDR)</dt>
                      <dd className="text-right">
                        {formatPValue(selectedNode.adjusted_p_value)}
                      </dd>

                      <dt className="font-sans text-zinc-500">p-value</dt>
                      <dd className="text-right">
                        {formatPValue(selectedNode.p_value)}
                      </dd>

                      <dt className="font-sans text-zinc-500">
                        Mean ({groupA})
                      </dt>
                      <dd className="text-right">
                        {selectedNode.mean_group_a.toFixed(3)}
                      </dd>

                      <dt className="font-sans text-zinc-500">
                        Mean ({groupB})
                      </dt>
                      <dd className="text-right">
                        {selectedNode.mean_group_b.toFixed(3)}
                      </dd>

                      <dt className="font-sans text-zinc-500">Degree</dt>
                      <dd className="text-right">{selectedNode.degree}</dd>
                    </dl>

                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">
                        Interacting Neighbors ({selectedNeighbors.length})
                      </p>
                      {selectedNeighbors.length === 0 ? (
                        <p className="mt-1 text-zinc-500">
                          No connected neighbors.
                        </p>
                      ) : (
                        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
                          {selectedNeighbors.map((nbr) => (
                            <li key={nbr.gene}>
                              <button
                                type="button"
                                onClick={() => setSelectedGeneId(nbr.gene)}
                                className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <span className="font-medium">{nbr.gene}</span>
                                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {nbr.lfc > 0 ? "+" : ""}
                                  {nbr.lfc.toFixed(2)}
                                  {nbr.score !== null
                                    ? ` · s=${nbr.score.toFixed(2)}`
                                    : ""}
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
            </div>
          )}
        </div>
      )}
    </section>
  );
}
