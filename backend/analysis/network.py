"""Gene-gene interaction network builder for Cytoscape.js.

Filters an edge-list CSV (`gene_a,gene_b[,score]`) to genes passing DGE
significance thresholds and returns Cytoscape-ready `nodes` and `edges`.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
import io
import math
from typing import Any

import numpy as np
import pandas as pd

from analysis.dge import GeneDGEResult


class NetworkValidationError(ValueError):
    """Raised when an interaction edge-list CSV or filter parameters are invalid."""


@dataclass
class NetworkResult:
    padj_threshold: float
    lfc_threshold: float
    min_score: float | None
    total_significant_genes: int
    node_count: int
    edge_count: int
    nodes: list[dict[str, dict[str, Any]]]
    edges: list[dict[str, dict[str, Any]]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "padj_threshold": self.padj_threshold,
            "lfc_threshold": self.lfc_threshold,
            "min_score": self.min_score,
            "total_significant_genes": self.total_significant_genes,
            "node_count": self.node_count,
            "edge_count": self.edge_count,
            "nodes": self.nodes,
            "edges": self.edges,
        }


def _read_interactions_csv(content: str | bytes) -> pd.DataFrame:
    if isinstance(content, bytes):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as e:
            raise NetworkValidationError(
                "Interactions CSV must be UTF-8 encoded."
            ) from e
    else:
        text = content

    if not text.strip():
        raise NetworkValidationError("Interactions CSV is empty.")

    try:
        return pd.read_csv(io.StringIO(text))
    except Exception as e:
        raise NetworkValidationError(f"Could not parse interactions CSV: {e}") from e


def _validate_interactions(
    interactions_df: pd.DataFrame,
) -> list[tuple[str, str, float | None]]:
    df = interactions_df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    required_cols = {"gene_a", "gene_b"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise NetworkValidationError(
            f"Interactions CSV must contain columns 'gene_a' and 'gene_b' "
            f"(missing: {', '.join(sorted(missing_cols))})."
        )

    if df.empty:
        raise NetworkValidationError("Interactions CSV contains no edge rows.")

    if df[["gene_a", "gene_b"]].isna().any().any():
        raise NetworkValidationError(
            "Interactions CSV contains missing 'gene_a' or 'gene_b' values."
        )

    gene_a_series = df["gene_a"].astype(str).str.strip()
    gene_b_series = df["gene_b"].astype(str).str.strip()
    if (gene_a_series == "").any() or (gene_b_series == "").any():
        raise NetworkValidationError(
            "Interactions CSV contains blank 'gene_a' or 'gene_b' values."
        )

    has_score = "score" in df.columns
    scores: list[float | None]
    if has_score:
        score_series = pd.to_numeric(df["score"], errors="coerce")
        if score_series.isna().any():
            raise NetworkValidationError(
                "Interactions CSV contains non-numeric or missing values in 'score'."
            )
        score_arr = score_series.to_numpy(dtype=float)
        if not np.isfinite(score_arr).all():
            raise NetworkValidationError(
                "Interactions CSV contains non-finite (inf/-inf) values in 'score'."
            )
        scores = [float(s) for s in score_arr]
    else:
        scores = [None] * len(df)

    # Deduplicate undirected edges.
    deduped: dict[tuple[str, str], float | None] = {}
    for a, b, score in zip(gene_a_series.tolist(), gene_b_series.tolist(), scores):
        # ignore self-loops
        if a == b:
            continue
        pair = (a, b) if a < b else (b, a)
        if pair not in deduped:
            deduped[pair] = score
        elif score is not None:
            existing = deduped[pair]
            # if duplicated, keep the pair with the highest score
            if existing is None or score > existing:
                deduped[pair] = score

    return [(a, b, score) for (a, b), score in sorted(deduped.items())]


def _extract_gene_record(item: GeneDGEResult | Mapping[str, Any]) -> dict[str, Any]:
    if isinstance(item, GeneDGEResult):
        return item.to_dict()
    return {
        "gene": str(item["gene"]),
        "mean_group_a": float(item["mean_group_a"]),
        "mean_group_b": float(item["mean_group_b"]),
        "log2_fold_change": float(item["log2_fold_change"]),
        "p_value": float(item["p_value"]),
        "adjusted_p_value": float(item["adjusted_p_value"]),
    }


def build_interaction_network(
    dge_results: Sequence[GeneDGEResult | Mapping[str, Any]],
    interactions_df: pd.DataFrame,
    *,
    padj_threshold: float = 0.05,
    lfc_threshold: float = 1.0,
    min_score: float | None = None,
    include_isolated: bool = False,
) -> NetworkResult:
    """Filter interactions to significant DGE genes and return Cytoscape-ready elements."""
    if not (0.0 <= padj_threshold <= 1.0) or not math.isfinite(padj_threshold):
        raise NetworkValidationError("padj_threshold must be between 0.0 and 1.0.")
    if lfc_threshold < 0.0 or not math.isfinite(lfc_threshold):
        raise NetworkValidationError("lfc_threshold must be a non-negative number.")
    if min_score is not None and not math.isfinite(min_score):
        raise NetworkValidationError("min_score must be a finite number.")

    parsed_edges = _validate_interactions(interactions_df)

    significant: dict[str, dict[str, Any]] = {}
    for item in dge_results:
        gene_record = _extract_gene_record(item)
        if (
            gene_record["adjusted_p_value"] <= padj_threshold
            and abs(gene_record["log2_fold_change"]) >= lfc_threshold
        ):
            significant[gene_record["gene"]] = gene_record

    # Export the edge data in the JSON format accepted by Cytoscape: https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html#cytoscape-js-json
    # Edge format: {"data": {"id": "geneA__geneB", "source": "geneA", "target": "geneB", "score": 0.948}}
    cy_edges: list[dict[str, dict[str, Any]]] = []
    # Number of edges connected to a given node (gene)
    degrees: dict[str, int] = {}

    for a, b, score in parsed_edges:
        if a not in significant or b not in significant:
            continue
        if min_score is not None and score is not None and score < min_score:
            continue
        edge_data: dict[str, Any] = {
            "id": f"{a}__{b}",
            "source": a,
            "target": b,
        }
        if score is not None:
            edge_data["score"] = score
        cy_edges.append({"data": edge_data})
        degrees[a] = degrees.get(a, 0) + 1
        degrees[b] = degrees.get(b, 0) + 1
    # If `include_isolated=True`: consider all nodes (genes) selected which are considered significant
    # based on their `adjusted_p_value <= padj_threshold`` and `log2_fold_change >= lfc_threshold`.
    # Otherwise: limit the selected set of nodes (genes) to the ones with at least 1 edge (degrees >= 1)
    selected_genes = (
        sorted(significant.keys())
        if include_isolated
        else sorted(degrees.keys())
    )

    # Export the node data in the JSON format accepted by Cytoscape: https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html#cytoscape-js-json
    # Node format: {"data": {"id": "geneA", ...}}
    cy_nodes = [
        {
            "data": {
                "id": gene,
                "label": gene,
                "log2_fold_change": significant[gene]["log2_fold_change"],
                "p_value": significant[gene]["p_value"],
                "adjusted_p_value": significant[gene]["adjusted_p_value"],
                "mean_group_a": significant[gene]["mean_group_a"],
                "mean_group_b": significant[gene]["mean_group_b"],
                "degree": degrees.get(gene, 0),
            }
        }
        for gene in selected_genes
    ]

    return NetworkResult(
        padj_threshold=padj_threshold,
        lfc_threshold=lfc_threshold,
        min_score=min_score,
        total_significant_genes=len(significant),
        node_count=len(cy_nodes),
        edge_count=len(cy_edges),
        nodes=cy_nodes,
        edges=cy_edges,
    )


def build_interaction_network_from_csv(
    dge_results: Sequence[GeneDGEResult | Mapping[str, Any]],
    interactions_csv: str | bytes,
    *,
    padj_threshold: float = 0.05,
    lfc_threshold: float = 1.0,
    min_score: float | None = None,
    include_isolated: bool = False,
) -> NetworkResult:
    """Parse an interactions CSV payload and build a Cytoscape-ready network."""
    interactions_df = _read_interactions_csv(interactions_csv)
    return build_interaction_network(
        dge_results,
        interactions_df,
        padj_threshold=padj_threshold,
        lfc_threshold=lfc_threshold,
        min_score=min_score,
        include_isolated=include_isolated,
    )
