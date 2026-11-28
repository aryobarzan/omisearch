import type {
  EdgeSingular,
  LayoutOptions,
  NodeSingular,
  StylesheetStyle,
} from "cytoscape";

export type LayoutName =
  | "cose"
  | "circle"
  | "concentric"
  | "grid"
  | "breadthfirst";

export const LAYOUT_OPTIONS: readonly { value: LayoutName; label: string }[] = [
  { value: "cose", label: "Force-directed (CoSE)" },
  { value: "circle", label: "Circle" },
  { value: "concentric", label: "Concentric (by degree)" },
  { value: "grid", label: "Grid" },
  { value: "breadthfirst", label: "Breadthfirst" },
];

/** Interpolate log2 fold change into blue (-2.5) -> neutral (0) -> red (+2.5). */
export function log2fcToColor(lfc: number): string {
  const maxAbs = 2.5;
  const t = Math.max(-1, Math.min(1, lfc / maxAbs));
  const neutral = [226, 232, 240]; // #e2e8f0
  const target = t >= 0 ? [220, 38, 38] : [37, 99, 235]; // #dc2626 / #2563eb
  const w = Math.abs(t);
  const r = Math.round(neutral[0] + (target[0] - neutral[0]) * w);
  const g = Math.round(neutral[1] + (target[1] - neutral[1]) * w);
  const b = Math.round(neutral[2] + (target[2] - neutral[2]) * w);
  return `rgb(${r}, ${g}, ${b})`;
}

export function buildLayoutOptions(name: LayoutName): LayoutOptions {
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

export const CYTOSCAPE_STYLE: StylesheetStyle[] = [
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
      color: "#0b1c30",
      "text-valign": "bottom",
      "text-margin-y": 4,
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.85,
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
      opacity: 0.16,
    },
  },
  {
    selector: "node.highlighted",
    style: {
      "border-width": 3,
      "border-color": "#006948",
      opacity: 1,
    },
  },
  {
    selector: "edge.highlighted",
    style: {
      "line-color": "#006948",
      opacity: 0.9,
    },
  },
];
