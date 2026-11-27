"""Unit tests for backend/analysis/dge.py."""

from __future__ import annotations

import math
from textwrap import dedent

import pandas as pd
import pytest
from statsmodels.stats.multitest import multipletests

from analysis.dge import (
    DGEValidationError,
    TestMethod as DGETestMethod,
    run_dge,
    run_dge_from_csv,
)
from tests.helpers import SAMPLE_DATA_DIR, basic_tables


def test_welch_t_log2_detects_up_down_and_handles_constant_gene() -> None:
    """Test DGE on a 4v4 dataset with Welch's t-test.

    Asserts on `adjusted_p_value` because Welch's parametric test uses the
    raw numeric values and easily reaches `padj < 0.001` even at n=4 per group.
    """
    expr, ann = basic_tables()
    res = run_dge(expr, ann, test_method=DGETestMethod.WELCH_T, is_log2=True)

    # Check that "control" was automatically determined as "group_a".
    assert res.group_a == "control"
    assert res.group_b == "treated"
    assert res.n_group_a == 4
    assert res.n_group_b == 4
    assert res.total_genes == 4
    assert res.test_method == DGETestMethod.WELCH_T

    by_gene = {r.gene: r for r in res.results}

    # Up-regulated gene
    assert by_gene["UP_1"].log2_fold_change == pytest.approx(3.025, abs=1e-6)
    assert by_gene["UP_1"].adjusted_p_value < 0.001

    # Down-regulated gene
    assert by_gene["DOWN_1"].log2_fold_change == pytest.approx(-3.95, abs=1e-6)
    assert by_gene["DOWN_1"].adjusted_p_value < 0.001

    # Unchanged gene
    assert abs(by_gene["NULL_1"].log2_fold_change) < 0.1
    assert by_gene["NULL_1"].adjusted_p_value > 0.5

    # Constant zero-variance gene (identical across groups)
    assert by_gene["CONST_SAME"].log2_fold_change == 0.0
    assert by_gene["CONST_SAME"].p_value == 1.0
    assert by_gene["CONST_SAME"].adjusted_p_value == 1.0

    # Results sorted by adjusted_p_value ascending
    padjs = [r.adjusted_p_value for r in res.results]
    assert padjs == sorted(padjs)


def test_mann_whitney_runs_and_separates_signal_from_null() -> None:
    """Test DGE on a 4v4 dataset with Mann-Whitney U.

    Asserts on raw `p_value` rather than `adjusted_p_value`: with only 4v4
    samples there are C(8, 4) = 70 rank orderings, so the smallest possible
    two-sided p-value is 2/70 (~0.0286), which Benjamini-Hochberg adjustment over 4 genes 
    raises to ~0.057 (just above 0.05).
    """
    expr, ann = basic_tables()
    res = run_dge(expr, ann, test_method="mann_whitney", is_log2=True)

    assert res.test_method == DGETestMethod.MANN_WHITNEY
    by_gene = {r.gene: r for r in res.results}
    assert by_gene["UP_1"].p_value < 0.05
    assert by_gene["DOWN_1"].p_value < 0.05
    assert by_gene["NULL_1"].p_value > 0.5
    assert by_gene["CONST_SAME"].p_value == 1.0


def test_linear_scale_fold_change_with_pseudocount() -> None:
    """Verify log2((mean_b + eps) / (mean_a + eps)) on linear-scale data, including all-zero genes."""
    expr = pd.DataFrame(
        {
            "gene": ["FOUR_X", "ALL_ZERO"],
            "C1": [10.0, 0.0],
            "C2": [10.0, 0.0],
            "T1": [40.0, 0.0],
            "T2": [40.0, 0.0],
        }
    )
    ann = pd.DataFrame(
        {"sample": ["C1", "C2", "T1", "T2"], "group": ["control", "control", "treated", "treated"]}
    )

    res = run_dge(expr, ann, is_log2=False, eps=1e-6)
    by_gene = {r.gene: r for r in res.results}

    # 40 / 10 = 4 -> log2(4) = 2.0; distinct constant groups -> p_value == 0.0
    assert by_gene["FOUR_X"].log2_fold_change == pytest.approx(2.0, abs=1e-5)
    assert by_gene["FOUR_X"].p_value == 0.0
    assert math.isfinite(by_gene["FOUR_X"].adjusted_p_value)

    # All-zero linear gene should not divide by zero or produce NaN
    assert by_gene["ALL_ZERO"].log2_fold_change == 0.0
    assert by_gene["ALL_ZERO"].p_value == 1.0


def test_benjamini_hochberg_fdr_matches_statsmodels() -> None:
    """Verify BH-adjusted p-values match statsmodels directly and satisfy 0 <= p <= padj <= 1."""
    expr, ann = basic_tables()
    res = run_dge(expr, ann)

    pvals = [r.p_value for r in res.results]
    padjs = [r.adjusted_p_value for r in res.results]
    _, expected_padjs, _, _ = multipletests(pvals, method="fdr_bh")

    for p, padj, exp in zip(pvals, padjs, expected_padjs):
        assert 0.0 <= p <= padj <= 1.0
        assert padj == pytest.approx(float(exp), abs=1e-12)


def test_group_ordering_control_alias_and_reference_override() -> None:
    """Verify control aliases (e.g., 'vehicle') auto-select as group_a and reference_group flips log2FC sign."""
    expr, ann = basic_tables()
    # "drug" comes alphabetically before "vehicle", but "vehicle" is a control alias
    ann["group"] = ann["group"].replace({"control": "vehicle", "treated": "drug"})

    res_auto = run_dge(expr, ann)
    assert res_auto.group_a == "vehicle"
    assert res_auto.group_b == "drug"
    up_auto = next(r for r in res_auto.results if r.gene == "UP_1")
    assert up_auto.log2_fold_change > 0

    # Explicit override flips the sign
    res_flipped = run_dge(expr, ann, reference_group="drug")
    assert res_flipped.group_a == "drug"
    assert res_flipped.group_b == "vehicle"
    up_flipped = next(r for r in res_flipped.results if r.gene == "UP_1")
    assert up_flipped.log2_fold_change == pytest.approx(-up_auto.log2_fold_change)

VALID_EXPR_CSV = dedent(
    """\
    gene,C1,C2,T1,T2
    G1,1,2,3,4
    """
)
VALID_ANN_CSV = dedent(
    """\
    sample,group
    C1,a
    C2,a
    T1,b
    T2,b
    """
)


# 13 possible validation error cases
@pytest.mark.parametrize(
    ("expr_csv", "ann_csv", "kwargs", "match"),
    [
        # 1. empty expression csv
        pytest.param("", VALID_ANN_CSV, {}, "empty", id="empty_expression"),
        # 2. Missing `group` column in annotation csv
        pytest.param(
            VALID_EXPR_CSV,
            dedent(
                """\
                sample,condition
                C1,a
                """
            ),
            {},
            "sample.*group",
            id="missing_group_column",
        ),
        # 3. Duplicate samples in annotation csv
        pytest.param(
            VALID_EXPR_CSV,
            dedent(
                """\
                sample,group
                C1,a
                C1,a
                T1,b
                T2,b
                """
            ),
            {},
            "duplicate sample",
            id="duplicate_sample",
        ),
        # 4. Only 1 group `a`, no second group `b`
        pytest.param(
            dedent(
                """\
                gene,C1,C2,C3
                G1,1,2,3
                """
            ),
            dedent(
                """\
                sample,group
                C1,a
                C2,a
                C3,a
                """
            ),
            {},
            "exactly 2 groups",
            id="only_one_group",
        ),
        # 5. More than 2 groups (`a`, `b`, `c`)
        pytest.param(
            dedent(
                """\
                gene,C1,T1,X1
                G1,1,2,3
                """
            ),
            dedent(
                """\
                sample,group
                C1,a
                T1,b
                X1,c
                """
            ),
            {},
            "exactly 2 groups",
            id="three_groups",
        ),
        # 6. Fewer than 2 samples in group `control`
        pytest.param(
            dedent(
                """\
                gene,C1,T1,T2
                G1,1,2,3
                """
            ),
            dedent(
                """\
                sample,group
                C1,control
                T1,treated
                T2,treated
                """
            ),
            {},
            "at least 2 samples",
            id="too_few_samples_in_group",
        ),
        # 7. Duplicate gene `G1` in expression csv
        pytest.param(
            dedent(
                """\
                gene,C1,C2,T1,T2
                G1,1,2,3,4
                G1,5,6,7,8
                """
            ),
            VALID_ANN_CSV,
            {},
            "duplicate gene",
            id="duplicate_gene",
        ),
        # 8. Missing sample column in expression csv for `T2`
        pytest.param(
            dedent(
                """\
                gene,C1,C2,T1
                G1,1,2,3
                """
            ),
            VALID_ANN_CSV,
            {},
            "missing annotated sample",
            id="missing_sample_column",
        ),
        # 9. Non-numeric expression value for sample `C2` in expression csv
        pytest.param(
            dedent(
                """\
                gene,C1,C2,T1,T2
                G1,1,bad,3,4
                """
            ),
            VALID_ANN_CSV,
            {},
            "non-numeric",
            id="non_numeric_value",
        ),
        # 10. infinite expression value for sample `C2` in expression csv
        pytest.param(
            dedent(
                """\
                gene,C1,C2,T1,T2
                G1,1,inf,3,4
                """
            ),
            VALID_ANN_CSV,
            {},
            "non-finite",
            id="infinite_value",
        ),
        # 11. Negative linear value for sample `C1` when `is_log2=False`
        pytest.param(
            dedent(
                """\
                gene,C1,C2,T1,T2
                G1,-1,2,3,4
                """
            ),
            VALID_ANN_CSV,
            {"is_log2": False},
            "non-negative",
            id="negative_linear_value",
        ),
        # 12. Unknown test method `student_t` (expect either `welch_t` or `mann_whitney`)
        pytest.param(
            VALID_EXPR_CSV,
            VALID_ANN_CSV,
            {"test_method": "student_t"},
            "Unsupported test_method",
            id="unsupported_test_method",
        ),
        # 13. Unknown reference group `missing` (expected either `a` or `b`)
        pytest.param(
            VALID_EXPR_CSV,
            VALID_ANN_CSV,
            {"reference_group": "missing"},
            "Reference group",
            id="unknown_reference_group",
        ),
    ],
)
def test_dge_validation_errors(
    expr_csv: str, ann_csv: str, kwargs: dict, match: str
) -> None:
    """Verify malformed expression/annotation CSVs and invalid options raise descriptive DGEValidationErrors."""
    with pytest.raises(DGEValidationError, match=match):
        run_dge_from_csv(expr_csv, ann_csv, **kwargs)


def test_dge_on_sample_data() -> None:
    """Verify Welch's t-test recovers the planted up-regulated and down-regulated modules in sample_data/."""
    expr_csv = (SAMPLE_DATA_DIR / "expression.csv").read_text(encoding="utf-8")
    ann_csv = (SAMPLE_DATA_DIR / "annotations.csv").read_text(encoding="utf-8")

    res = run_dge_from_csv(expr_csv, ann_csv, test_method=DGETestMethod.WELCH_T, is_log2=True)
    assert res.total_genes == 200
    assert res.group_a == "control"
    assert res.group_b == "treated"
    assert res.n_group_a == 6
    assert res.n_group_b == 6

    sig = [r for r in res.results if r.adjusted_p_value <= 0.05]
    assert len(sig) >= 45
