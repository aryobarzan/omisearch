import type { GeneResult } from "@/app/lib/types/analysis";

export function formatPValue(val: number): string {
  if (val === 0) return "< 1e-300";
  if (val < 0.001) return val.toExponential(2);
  return val.toFixed(4);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadResultsCsv(
  rows: GeneResult[],
  groupA: string,
  groupB: string,
  runName: string,
): void {
  const header = [
    "gene",
    `mean_${groupA}`,
    `mean_${groupB}`,
    "log2_fold_change",
    "p_value",
    "adjusted_p_value",
  ];
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((r) =>
      [
        r.gene,
        r.mean_group_a,
        r.mean_group_b,
        r.log2_fold_change,
        r.p_value,
        r.adjusted_p_value,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const slug =
    runName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "dge";
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}_dge_results.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
