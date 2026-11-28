import {
  fail,
  MAX_CSV_BYTES,
  parseFiniteNumber,
  readCsvTable,
  type CsvRow,
  type ValidationResult,
} from "./csv";

export { MAX_CSV_BYTES, type ValidationResult };

export type ExpressionValidation = ValidationResult<{
  geneCount: number;
  sampleCols: string[];
  hasNegative: boolean;
  maxValue: number;
}>;

export type AnnotationsValidation = ValidationResult<{
  samples: string[];
  groups: [string, number][];
}>;

export type InteractionsValidation = ValidationResult<{
  edgeCount: number;
  hasScore: boolean;
}>;

/** Validate sample annotations CSV (`sample,group` with 2 groups and >=2 samples each). */
export async function validateAnnotationsCsv(
  file: File,
): Promise<AnnotationsValidation> {
  const table = await readCsvTable(file, {
    label: "Annotations",
    emptyRowsNoun: "sample",
    requiredColumns: ["sample", "group"] as const,
  });
  if (!table.ok) return table;

  const { sample: sampleIdx, group: groupIdx } = table.columns;
  const samples: string[] = [];
  const seenSamples = new Set<string>();
  const groupCounts = new Map<string, number>();

  for (const { rowNumber, cells } of table.rows) {
    const sample = cells[sampleIdx] ?? "";
    const group = cells[groupIdx] ?? "";
    if (!sample || !group) {
      return fail(
        `Row ${rowNumber} has a blank 'sample' or 'group' value.`,
      );
    }
    if (seenSamples.has(sample)) {
      return fail(`Duplicate sample ID found: '${sample}'.`);
    }
    seenSamples.add(sample);
    samples.push(sample);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  const groups = Array.from(groupCounts.entries());
  if (groups.length !== 2) {
    const names = groups.map(([g]) => g).join(", ");
    return fail(
      `Must contain exactly 2 groups, found ${groups.length} (${names}).`,
    );
  }

  const smallGroup = groups.find(([, count]) => count < 2);
  if (smallGroup) {
    const [group, count] = smallGroup;
    return fail(
      `Group '${group}' has only ${count} sample (at least 2 required per group).`,
    );
  }

  return { ok: true, samples, groups };
}

function validateExpressionRow(
  { rowNumber, cells }: CsvRow,
  header: string[],
  seenGenes: Set<string>,
): ValidationResult<{ hasNegative: boolean; rowMax: number }> {
  const gene = cells[0] ?? "";
  if (!gene) {
    return fail(`Row ${rowNumber} has a blank gene identifier.`);
  }
  if (seenGenes.has(gene)) {
    return fail(`Duplicate gene identifier found: '${gene}'.`);
  }
  seenGenes.add(gene);

  let hasNegative = false;
  let rowMax = Number.NEGATIVE_INFINITY;

  for (let c = 1; c < header.length; c++) {
    const raw = cells[c] ?? "";
    if (raw === "") {
      return fail(
        `Missing expression value at row ${rowNumber} (gene '${gene}', sample '${header[c]}').`,
      );
    }
    const num = parseFiniteNumber(raw);
    if (num === null) {
      return fail(
        `Non-numeric or non-finite value '${raw}' at row ${rowNumber} (sample '${header[c]}').`,
      );
    }
    if (num < 0) hasNegative = true;
    if (num > rowMax) rowMax = num;
  }

  return { ok: true, hasNegative, rowMax };
}

/** Validate expression matrix CSV (unique gene rows x numeric sample columns). */
export async function validateExpressionCsv(
  file: File,
): Promise<ExpressionValidation> {
  const table = await readCsvTable(file, {
    label: "Expression",
    emptyRowsNoun: "gene",
    minColumns: {
      count: 2,
      error:
        "Expression CSV must have a gene identifier column and at least one sample column.",
    },
  });
  if (!table.ok) return table;

  const seenGenes = new Set<string>();
  let hasNegative = false;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (const row of table.rows) {
    const result = validateExpressionRow(row, table.header, seenGenes);
    if (!result.ok) return result;
    if (result.hasNegative) hasNegative = true;
    if (result.rowMax > maxValue) maxValue = result.rowMax;
  }

  return {
    ok: true,
    geneCount: seenGenes.size,
    sampleCols: table.header.slice(1),
    hasNegative,
    maxValue,
  };
}

/** Validate gene-gene interactions CSV (`gene_a,gene_b[,score]`). */
export async function validateInteractionsCsv(
  file: File,
): Promise<InteractionsValidation> {
  const table = await readCsvTable(file, {
    label: "Interactions",
    emptyRowsNoun: "edge",
    requiredColumns: ["gene_a", "gene_b"] as const,
  });
  if (!table.ok) return table;

  const { gene_a: aIdx, gene_b: bIdx } = table.columns;
  const scoreIdx = table.header.indexOf("score");

  for (const { rowNumber, cells } of table.rows) {
    const geneA = cells[aIdx] ?? "";
    const geneB = cells[bIdx] ?? "";
    if (!geneA || !geneB) {
      return fail(
        `Row ${rowNumber} has a blank 'gene_a' or 'gene_b' value.`,
      );
    }
    if (scoreIdx !== -1) {
      const scoreRaw = cells[scoreIdx] ?? "";
      if (parseFiniteNumber(scoreRaw) === null) {
        return fail(
          `Invalid numeric score '${scoreRaw}' at row ${rowNumber}.`,
        );
      }
    }
  }

  return {
    ok: true,
    edgeCount: table.rows.length,
    hasScore: scoreIdx !== -1,
  };
}
