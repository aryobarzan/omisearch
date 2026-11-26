"""Differential Gene Expression (DGE) analysis module.

Independent of FastAPI so logic is unit-testable.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import StrEnum
import io

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests


class TestMethod(StrEnum):
    # parametric option for bell-shaped distribution, with no assumption on equal variances between the two groups
    WELCH_T = "welch_t"
    # non-parametric option to better handle data with large outliers
    MANN_WHITNEY = "mann_whitney"

DEFAULT_EPSILON = 1e-6
CONTROL_GROUP_ALIASES = {"control", "ctrl", "untreated", "vehicle", "normal", "wt"}


class DGEValidationError(ValueError):
    """Raised when input expression or annotation tables fail validation."""


@dataclass
class GeneDGEResult:
    gene: str
    mean_group_a: float
    mean_group_b: float
    log2_fold_change: float
    p_value: float
    adjusted_p_value: float

    def to_dict(self) -> dict[str, str | float]:
        return asdict(self)


@dataclass
class DGEAnalysisResult:
    group_a: str
    group_b: str
    n_group_a: int
    n_group_b: int
    test_method: TestMethod
    is_log2: bool
    total_genes: int
    results: list[GeneDGEResult]

    def to_dict(self) -> dict:
        return {
            "group_a": self.group_a,
            "group_b": self.group_b,
            "n_group_a": self.n_group_a,
            "n_group_b": self.n_group_b,
            "test_method": self.test_method,
            "is_log2": self.is_log2,
            "total_genes": self.total_genes,
            "results": [r.to_dict() for r in self.results],
        }


def _read_csv_input(content: str | bytes, label: str) -> pd.DataFrame:
    if isinstance(content, bytes):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as e:
            raise DGEValidationError(f"{label} CSV must be UTF-8 encoded.") from e
    else:
        text = content

    if not text.strip():
        raise DGEValidationError(f"{label} CSV is empty.")

    try:
        return pd.read_csv(io.StringIO(text))
    except Exception as e:
        raise DGEValidationError(f"Could not parse {label} CSV: {e}") from e


def _resolve_group_order(
    groups: list[str], reference_group: str | None
) -> tuple[str, str]:
    """Resolve a deterministic group order, as the choice of 'group_a' can flip the sign of every gene: log2_fold_change = mean(group_b) - mean(group_a)"""
    # Case 1: the user has explicitly indicated a reference group to be used as `group_a`.
    if reference_group is not None:
        if reference_group not in groups:
            raise DGEValidationError(
                f"Reference group '{reference_group}' not found in annotations "
                f"(available: {', '.join(sorted(groups))})."
            )
        other = next(g for g in groups if g != reference_group)
        return reference_group, other
    # Case 2: the user did not indicate a reference_group.
    # In that case, check if one of the groups uses a common control group name (defined as `CONTROL_GROUP_ALIASES`).
    # If so, use that as `group_a`.
    # Note: we prefer a recognizable control/reference label as `group_a`` so a positive log2 fold change
    # means up-regulated in the comparison/treated group.
    sorted_groups = sorted(groups)
    for g in sorted_groups:
        if g.lower() in CONTROL_GROUP_ALIASES:
            other = next(x for x in sorted_groups if x != g)
            return g, other
    # Case 3: as a final fallback, we simply sort the groups alphabetically to have a deterministic ordering.
    return sorted_groups[0], sorted_groups[1]


def _validate_annotations(
    annotations_df: pd.DataFrame,
    reference_group: str | None = None,
) -> tuple[str, str, list[str], list[str]]:
    df = annotations_df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    required_cols = {"sample", "group"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise DGEValidationError(
            f"Annotations CSV must contain columns 'sample' and 'group' "
            f"(missing: {', '.join(sorted(missing_cols))})."
        )

    if df.empty:
        raise DGEValidationError("Annotations CSV contains no sample rows.")

    # first any() -> check per column for NaN
    # second any() -> simply return True if either column contains NaN
    if df[["sample", "group"]].isna().any().any():
        raise DGEValidationError(
            "Annotations CSV contains missing 'sample' or 'group' values."
        )
    # Cleaning (strip leading and trailing whitespaces)
    df["sample"] = df["sample"].astype(str).str.strip()
    df["group"] = df["group"].astype(str).str.strip()

    if (df["sample"] == "").any() or (df["group"] == "").any():
        raise DGEValidationError(
            "Annotations CSV contains blank 'sample' or 'group' values."
        )

    duplicates = df.loc[df["sample"].duplicated(), "sample"].unique().tolist()
    if duplicates:
        raise DGEValidationError(
            f"Annotations CSV contains duplicate sample(s): {', '.join(duplicates[:5])}."
        )

    unique_groups = df["group"].unique().tolist()
    if len(unique_groups) != 2:
        raise DGEValidationError(
            f"Annotations CSV must contain exactly 2 groups, found {len(unique_groups)} "
            f"({', '.join(sorted(unique_groups))})."
        )

    group_a, group_b = _resolve_group_order(unique_groups, reference_group)
    samples_a = df.loc[df["group"] == group_a, "sample"].tolist()
    samples_b = df.loc[df["group"] == group_b, "sample"].tolist()

    if len(samples_a) < 2 or len(samples_b) < 2:
        raise DGEValidationError(
            f"Each group must have at least 2 samples "
            f"('{group_a}': {len(samples_a)}, '{group_b}': {len(samples_b)})."
        )

    return group_a, group_b, samples_a, samples_b


def _validate_expression(
    expression_df: pd.DataFrame,
    required_samples: list[str],
    is_log2: bool,
) -> tuple[list[str], pd.DataFrame]:
    df = expression_df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    # fewer than 2 columns
    if df.shape[1] < 2:
        raise DGEValidationError(
            "Expression CSV must have a gene identifier column and at least one sample column."
        )
    if df.empty:
        raise DGEValidationError("Expression CSV contains no gene rows.")

    # First column (gene identifiers) has missing values.
    gene_col = df.columns[0]
    if df[gene_col].isna().any():
        raise DGEValidationError("Expression CSV contains missing gene identifiers.")

    genes = df[gene_col].astype(str).str.strip()
    if (genes == "").any():
        raise DGEValidationError("Expression CSV contains blank gene identifiers.")

    # First column (gene identifiers) has duplicate entries.
    dup_genes = genes[genes.duplicated()].unique().tolist()
    if dup_genes:
        raise DGEValidationError(
            f"Expression CSV contains duplicate gene(s): {', '.join(dup_genes[:5])}."
        )

    # Omit the first column (gene identifiers) to only retain the sample columns.
    sample_cols = set(df.columns[1:])
    missing_samples = [s for s in required_samples if s not in sample_cols]
    if missing_samples:
        raise DGEValidationError(
            f"Expression CSV is missing annotated sample column(s): "
            f"{', '.join(missing_samples[:5])}."
        )

    # `errors="coerce"` so invalid values are converted to NaN rather than directly raising an exception.
    numeric_df = df[required_samples].apply(pd.to_numeric, errors="coerce")
    if numeric_df.isna().any().any():
        bad_cols = numeric_df.columns[numeric_df.isna().any()].tolist()
        raise DGEValidationError(
            f"Expression CSV contains non-numeric or missing values in sample(s): "
            f"{', '.join(bad_cols[:5])}."
        )

    values = numeric_df.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise DGEValidationError(
            "Expression CSV contains non-finite (inf/-inf) values."
        )

    # if `is_log2=True`: the values are on a log2 scale already, meaning numbers can be negative.
    # Otherwise: values are linear counts which cannot be negative, e.g., the TPM (transcripts-per-million) count.
    # In that case, taking the log2 of a negative value would lead to NaN.
    if not is_log2 and (values < 0).any():
        raise DGEValidationError(
            "Linear-scale expression values (is_log2=False) must be non-negative."
        )

    return genes.tolist(), numeric_df


def _compute_p_value(
    vals_a: np.ndarray, vals_b: np.ndarray, test_method: TestMethod
) -> float:
    const_a = bool(np.all(vals_a == vals_a[0]))
    const_b = bool(np.all(vals_b == vals_b[0]))

    # Identical constant expression across both groups -> no difference.
    if const_a and const_b and vals_a[0] == vals_b[0]:
        return 1.0

    if test_method == TestMethod.WELCH_T:
        if const_a and const_b:
            # Zero variance in both groups with distinct constant levels.
            return 0.0
        _, p_val = stats.ttest_ind(vals_b, vals_a, equal_var=False)
    elif test_method == TestMethod.MANN_WHITNEY:
        _, p_val = stats.mannwhitneyu(vals_b, vals_a, alternative="two-sided")
    else:
        valid = ", ".join(f"'{m.value}'" for m in TestMethod)
        raise DGEValidationError(
            f"Unsupported test_method '{test_method}'. Choose one of: {valid}."
        )

    p_float = float(np.asarray(p_val).item())
    if not np.isfinite(p_float):
        return 1.0
    return min(max(p_float, 0.0), 1.0)


def run_dge(
    expression_df: pd.DataFrame,
    annotations_df: pd.DataFrame,
    *,
    test_method: TestMethod | str = TestMethod.WELCH_T,
    is_log2: bool = True,
    reference_group: str | None = None,
    eps: float = DEFAULT_EPSILON,
) -> DGEAnalysisResult:
    """Run two-group Differential Gene Expression with Benjamini-Hochberg FDR."""
    try:
        method = TestMethod(test_method)
    except ValueError as e:
        valid = ", ".join(f"'{m.value}'" for m in TestMethod)
        raise DGEValidationError(
            f"Unsupported test_method '{test_method}'. Choose one of: {valid}."
        ) from e # exception chaining

    group_a, group_b, samples_a, samples_b = _validate_annotations(
        annotations_df, reference_group=reference_group
    )
    genes, numeric_df = _validate_expression(
        expression_df, samples_a + samples_b, is_log2=is_log2
    )

    mat_a = numeric_df[samples_a].to_numpy(dtype=float)
    mat_b = numeric_df[samples_b].to_numpy(dtype=float)

    means_a = mat_a.mean(axis=1)
    means_b = mat_b.mean(axis=1)

    # log2 fold changes
    if is_log2:
        log2_fcs = means_b - means_a
    else:
        log2_fcs = np.log2((means_b + eps) / (means_a + eps))

    p_values = [
        _compute_p_value(mat_a[i], mat_b[i], method)
        for i in range(len(genes))
    ]
    # Benjamini-Hochberg FDR (false dicovery rate)
    _, padj_values, _, _ = multipletests(p_values, method="fdr_bh")

    rows = [
        GeneDGEResult(
            gene=genes[i],
            mean_group_a=float(means_a[i]),
            mean_group_b=float(means_b[i]),
            log2_fold_change=float(log2_fcs[i]),
            p_value=float(p_values[i]),
            adjusted_p_value=float(padj_values[i]),
        )
        for i in range(len(genes))
    ]
    rows.sort(key=lambda row: (row.adjusted_p_value, row.p_value, -abs(row.log2_fold_change)))

    return DGEAnalysisResult(
        group_a=group_a,
        group_b=group_b,
        n_group_a=len(samples_a),
        n_group_b=len(samples_b),
        test_method=method,
        is_log2=is_log2,
        total_genes=len(rows),
        results=rows,
    )


def run_dge_from_csv(
    expression_csv: str | bytes,
    annotations_csv: str | bytes,
    *,
    test_method: TestMethod | str = TestMethod.WELCH_T,
    is_log2: bool = True,
    reference_group: str | None = None,
    eps: float = DEFAULT_EPSILON,
) -> DGEAnalysisResult:
    """Parse raw CSV payloads and run DGE analysis."""
    expression_df = _read_csv_input(expression_csv, "Expression")
    annotations_df = _read_csv_input(annotations_csv, "Annotations")
    return run_dge(
        expression_df,
        annotations_df,
        test_method=test_method,
        is_log2=is_log2,
        reference_group=reference_group,
        eps=eps,
    )
