"use client";

import type { NetworkResponse } from "@/app/lib/types/analysis";
import cytoscape, { type Core } from "cytoscape";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import {
  buildLayoutOptions,
  CYTOSCAPE_STYLE,
  type LayoutName,
} from "./cytoscapeConfig";

const CANVAS_CONTROLS = [
  { action: "zoom-in", label: "Zoom in", Icon: ZoomIn },
  { action: "zoom-out", label: "Zoom out", Icon: ZoomOut },
  { action: "fit", label: "Fit view", Icon: Maximize2 },
] as const;

type CanvasAction = (typeof CANVAS_CONTROLS)[number]["action"];

interface NetworkCanvasProps {
  network: NetworkResponse;
  layout: LayoutName;
  selectedGeneId: string | null;
  onSelectGene: (geneId: string | null) => void;
}

export function NetworkCanvas({
  network,
  layout,
  selectedGeneId,
  onSelectGene,
}: NetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const handleSelectGene = useEffectEvent((geneId: string | null) => {
    onSelectGene(geneId);
  });

  const getInitialLayout = useEffectEvent(() => buildLayoutOptions(layout));

  // Initialize / rebuild Cytoscape instance when network data changes.
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: network.nodes.map((n) => ({ data: { ...n.data } })),
        edges: network.edges.map((e) => ({ data: { ...e.data } })),
      },
      style: CYTOSCAPE_STYLE,
      layout: getInitialLayout(),
      minZoom: 0.25,
      maxZoom: 3,
    });

    cy.on("tap", "node", (evt) => handleSelectGene(evt.target.id()));
    cy.on("tap", (evt) => {
      if (evt.target === cy) handleSelectGene(null);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [network]);

  // Re-run layout without recreating the Cytoscape instance when layout changes.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
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

  function handleControl(action: CanvasAction) {
    const cy = cyRef.current;
    if (!cy) return;
    if (action === "fit") {
      cy.fit(undefined, 32);
      return;
    }
    const factor = action === "zoom-in" ? 1.25 : 0.8;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ghost-border-strong bg-surface lg:col-span-8">
      <div ref={containerRef} className="h-[500px] w-full" />

      {/* Floating top-left zoom & fit controls */}
      <div className="workbench-popover absolute top-3 left-3 flex items-center gap-1 p-1">
        {CANVAS_CONTROLS.map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            onClick={() => handleControl(action)}
            aria-label={label}
            title={label}
            className="icon-button"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        ))}
      </div>

      {/* Floating bottom-left diverging log2FC color legend */}
      <div className="workbench-popover pointer-events-none absolute right-3 bottom-3 left-3 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs sm:right-auto">
        <div className="flex items-center gap-2">
          <span className="type-metric-sm font-semibold text-fc-down">
            −2.5
          </span>
          <div
            aria-hidden="true"
            className="h-2.5 w-28 rounded-full border border-ghost-border-strong"
            style={{
              background:
                "linear-gradient(to right, var(--fc-down), var(--fc-neutral), var(--fc-up))",
            }}
          />
          <span className="type-metric-sm font-semibold text-fc-up">+2.5</span>
          <span className="type-body-sm text-[11px] text-outline">log2FC</span>
        </div>
        <span className="type-body-sm hidden text-[11px] text-outline sm:inline">
          · Size = degree · Width = score
        </span>
      </div>
    </div>
  );
}
