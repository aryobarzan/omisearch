export const MAX_CSV_BYTES = 10 * 1024 * 1024; // 10 MB (matches backend limit)

export type ValidationResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export interface CsvRow {
  rowNumber: number;
  cells: string[];
}

export interface CsvTable<K extends string = string> {
  header: string[];
  columns: Record<K, number>;
  rows: CsvRow[];
}

/** Construct a failed validation result with an error message. */
export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Parse a finite number from a trimmed CSV cell, returning null when blank or invalid. */
export function parseFiniteNumber(raw: string): number | null {
  if (raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** Split a single CSV line into trimmed fields, supporting quoted cells. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let isInQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (isInQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote ("") inside a quoted field
          current += '"';
          i++;
        } else {
          // Closing quote ends quoted mode
          isInQuotes = false;
        }
      } else {
        // Keep commas and other characters verbatim while inside quotes
        current += ch;
      }
    } else if (ch === '"') {
      // Opening quote enters quoted mode
      isInQuotes = true;
    } else if (ch === ",") {
      // Unquoted comma ends the current field
      fields.push(current.trim());
      current = "";
    } else {
      // Regular character outside quotes
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Validate file size, strip UTF-8 BOM, and return non-empty CSV lines. */
async function readNonEmptyLines(
  file: File,
  label: string,
): Promise<ValidationResult<{ lines: string[] }>> {
  if (file.size === 0) {
    return fail(`${label} CSV is empty.`);
  }
  if (file.size > MAX_CSV_BYTES) {
    return fail(`${label} CSV exceeds maximum allowed size (10 MB).`);
  }

  const raw = await file.text();
  // Strip UTF-8 BOM if exported from Excel
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return fail(`${label} CSV is empty.`);
  }
  return { ok: true, lines };
}

/** Map required column names to their zero-based indices in the CSV header. */
function resolveRequiredColumns<K extends string>(
  header: string[],
  requiredColumns: readonly K[],
): ValidationResult<{ columns: Record<K, number> }> {
  const columns = {} as Record<K, number>;
  const missing: string[] = [];

  for (const col of requiredColumns) {
    const idx = header.indexOf(col);
    if (idx === -1) {
      missing.push(col);
    } else {
      columns[col] = idx;
    }
  }

  if (missing.length > 0) {
    return fail(`Missing required column(s): ${missing.join(", ")}.`);
  }
  return { ok: true, columns };
}

/** Read a CSV file, validate its header and presence of data rows, and parse all rows. */
export async function readCsvTable<K extends string = never>(
  file: File,
  options: {
    label: string;
    emptyRowsNoun: string;
    requiredColumns?: readonly K[];
    minColumns?: { count: number; error: string };
  },
): Promise<ValidationResult<CsvTable<K>>> {
  const read = await readNonEmptyLines(file, options.label);
  if (!read.ok) return read;

  const header = parseCsvLine(read.lines[0]);
  if (options.minColumns && header.length < options.minColumns.count) {
    return fail(options.minColumns.error);
  }

  const resolved = resolveRequiredColumns(
    header,
    options.requiredColumns ?? [],
  );
  if (!resolved.ok) return resolved;

  if (read.lines.length < 2) {
    return fail(
      `${options.label} CSV contains no ${options.emptyRowsNoun} rows.`,
    );
  }

  const rows = read.lines.slice(1).map((line, idx) => ({
    rowNumber: idx + 2,
    cells: parseCsvLine(line),
  }));

  return { ok: true, header, columns: resolved.columns, rows };
}
