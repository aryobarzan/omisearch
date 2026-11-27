"""Unit tests for backend/analysis/network.py."""

from __future__ import annotations

from textwrap import dedent

import pandas as pd
import pytest

from analysis.dge import run_dge, run_dge_from_csv
from analysis.network import (
    NetworkValidationError,
    build_interaction_network,
    build_interaction_network_from_csv,
)
from tests.analysis.helpers import SAMPLE_DATA_DIR, basic_tables

# Minimal dict-format DGE results (mirrors JSON rows read back from SQLite):
# 2 connected significant genes (G_UP1, G_UP2), 1 isolated significant gene (G_ISO),
# and 1 non-significant gene (G_NS).
SAMPLE_DGE_ROWS = [
    {
        "gene": "G_UP1",
        "mean_group_a": 5.0,
        "mean_group_b": 8.0,
        "log2_fold_change": 3.0,
        "p_value": 1e-5,
        "adjusted_p_value": 1e-4,
    },
    {
        "gene": "G_UP2",
        "mean_group_a": 5.0,
        "mean_group_b": 7.5,
        "log2_fold_change": 2.5,
        "p_value": 2e-5,
        "adjusted_p_value": 2e-4,
    },
    {
        "gene": "G_ISO",
        "mean_group_a": 8.0,
        "mean_group_b": 5.5,
        "log2_fold_change": -2.5,
        "p_value": 3e-5,
        "adjusted_p_value": 3e-4,
    },
    {
        "gene": "G_NS",
        "mean_group_a": 6.0,
        "mean_group_b": 6.1,
        "log2_fold_change": 0.1,
        "p_value": 0.8,
        "adjusted_p_value": 0.9,
    },
]

# Includes a reversed duplicate edge with a higher score, a self-loop, and a non-significant edge.
SAMPLE_INTERACTIONS_CSV = dedent(
    """\
    gene_a,gene_b,score
    G_UP1,G_UP2,0.70
    G_UP2,G_UP1,0.92
    G_UP1,G_UP1,0.99
    G_UP1,G_NS,0.95
    """
)


def test_network_deduplicates_edges_and_drops_self_loops_and_nonsig() -> None:
    """Verify reversed duplicates keep max score, self-loops/non-significant edges are dropped, and isolated genes are hidden by default."""
    net = build_interaction_network_from_csv(
        SAMPLE_DGE_ROWS,
        SAMPLE_INTERACTIONS_CSV,
        padj_threshold=0.05,
        lfc_threshold=1.0,
    )

    assert net.total_significant_genes == 3
    assert net.node_count == 2  # G_ISO excluded when include_isolated=False
    assert net.edge_count == 1
    assert net.edges[0]["data"] == {
        "id": "G_UP1__G_UP2",
        "source": "G_UP1",
        "target": "G_UP2",
        "score": 0.92,
    }
    assert {n["data"]["id"] for n in net.nodes} == {"G_UP1", "G_UP2"}
    assert all(n["data"]["degree"] == 1 for n in net.nodes)


def test_network_include_isolated_keeps_zero_degree_genes() -> None:
    """Verify include_isolated=True retains significant genes with no surviving edges (degree 0)."""
    net = build_interaction_network_from_csv(
        SAMPLE_DGE_ROWS,
        SAMPLE_INTERACTIONS_CSV,
        padj_threshold=0.05,
        lfc_threshold=1.0,
        include_isolated=True,
    )

    assert net.node_count == 3
    by_id = {n["data"]["id"]: n["data"] for n in net.nodes}
    assert by_id["G_ISO"]["degree"] == 0


def test_network_min_score_filters_low_confidence_edges() -> None:
    """Verify min_score removes edges below the confidence cutoff."""
    net = build_interaction_network_from_csv(
        SAMPLE_DGE_ROWS,
        SAMPLE_INTERACTIONS_CSV,
        padj_threshold=0.05,
        lfc_threshold=1.0,
        min_score=0.95,
    )

    assert net.edge_count == 0
    assert net.node_count == 0


def test_network_without_score_column_from_dge_results() -> None:
    """Verify 2-column edge lists without 'score' work directly with DGEAnalysisResult objects."""
    expr, ann = basic_tables()
    dge = run_dge(expr, ann)

    df = pd.DataFrame(
        {
            "gene_a": ["UP_1", "UP_1"],
            "gene_b": ["DOWN_1", "NULL_1"],
        }
    )
    net = build_interaction_network(
        dge.results, df, padj_threshold=0.05, lfc_threshold=1.0
    )

    # UP_1 <-> DOWN_1 survives; UP_1 <-> NULL_1 is filtered out
    assert net.node_count == 2
    assert net.edge_count == 1
    assert {n["data"]["id"] for n in net.nodes} == {"UP_1", "DOWN_1"}
    assert "score" not in net.edges[0]["data"]


VALID_EDGES_CSV = dedent(
    """\
    gene_a,gene_b
    A,B
    """
)

# Testing the 7 possible network validation cases
@pytest.mark.parametrize(
    ("csv_text", "kwargs", "match"),
    [
        # 1. empty interactions csv
        pytest.param("", {}, "empty", id="empty_csv"),
        # 2. wrong column headers for interactions csv (expected: gene_a,gene_b; got: source,target)
        pytest.param(
            dedent(
                """\
                source,target
                A,B
                """
            ),
            {},
            "gene_a.*gene_b",
            id="missing_required_columns",
        ),
        # 3. missing value in interactions csv
        pytest.param(
            dedent(
                """\
                gene_a,gene_b
                A,
                """
            ),
            {},
            "missing",
            id="missing_gene_b",
        ),
        # 4. invalid score value (non-numeric)
        pytest.param(
            dedent(
                """\
                gene_a,gene_b,score
                A,B,bad
                """
            ),
            {},
            "non-numeric",
            id="non_numeric_score",
        ),
        # 5. invalid score value (non-finite)
        pytest.param(
            dedent(
                """\
                gene_a,gene_b,score
                A,B,inf
                """
            ),
            {},
            "non-finite",
            id="infinite_score",
        ),
        # 6. adjusted p-value threshold invalid (>1)
        pytest.param(
            VALID_EDGES_CSV,
            {"padj_threshold": 1.5},
            "padj_threshold",
            id="invalid_padj_threshold",
        ),
        # 7. invalid log2 fold change threshold (<0)
        pytest.param(
            VALID_EDGES_CSV,
            {"lfc_threshold": -0.5},
            "lfc_threshold",
            id="invalid_lfc_threshold",
        ),
    ],
)
def test_network_validation_errors(csv_text: str, kwargs: dict, match: str) -> None:
    """Verify invalid interaction CSVs and out-of-range threshold parameters raise NetworkValidationError."""
    with pytest.raises(NetworkValidationError, match=match):
        build_interaction_network_from_csv([], csv_text, **kwargs)


def test_network_on_sample_data() -> None:
    """Verify sample_data/ interactions prune monotonically as |log2FC| tightens and all nodes meet thresholds."""
    expr_csv = (SAMPLE_DATA_DIR / "expression.csv").read_text(encoding="utf-8")
    ann_csv = (SAMPLE_DATA_DIR / "annotations.csv").read_text(encoding="utf-8")
    inter_csv = (SAMPLE_DATA_DIR / "interactions.csv").read_text(encoding="utf-8")

    dge = run_dge_from_csv(expr_csv, ann_csv)
    # 1. Low threshold for log2 fold changes: should lead to higher node and edge count
    net_loose = build_interaction_network_from_csv(
        dge.results, inter_csv, padj_threshold=0.05, lfc_threshold=0.5
    )
    # 2. Standard threshold for log2 fold changes
    net_default = build_interaction_network_from_csv(
        dge.results, inter_csv, padj_threshold=0.05, lfc_threshold=1.0
    )
    # 3. High threshold for log2 fold changes: given strictness, should lead to lower node and edge count
    net_strict = build_interaction_network_from_csv(
        dge.results, inter_csv, padj_threshold=0.05, lfc_threshold=1.5
    )

    assert net_loose.edge_count >= net_default.edge_count >= net_strict.edge_count > 0
    assert net_default.node_count > 0
    for node in net_default.nodes:
        data = node["data"]
        assert data["adjusted_p_value"] <= 0.05
        assert abs(data["log2_fold_change"]) >= 1.0
