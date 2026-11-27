"""Shared helpers for analysis tests."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

# parents[0]: omisearch/backend/tests/analysis
# parents[1]: omisearch/backend/tests
# parents[2]: omisearch/backend
# parents[3]: omisearch
SAMPLE_DATA_DIR = Path(__file__).resolve().parents[3] / "sample_data"


def basic_tables() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return a minimal 4v4 expression and annotations pair for unit tests.

    4 control samples, 4 treated samples;
    4 genes: 1 up-regulated, 1 down-regulated, 1 unchanged, 1 constant.
    """
    expressions = pd.DataFrame(
        {
            "gene": ["UP_1", "DOWN_1", "NULL_1", "CONST_SAME"],
            "C1": [5.0, 9.0, 6.0, 4.0],
            "C2": [5.2, 8.8, 6.5, 4.0],
            "C3": [4.8, 9.2, 5.5, 4.0],
            "C4": [5.1, 8.9, 6.1, 4.0],
            "T1": [8.0, 5.0, 6.1, 4.0],
            "T2": [8.2, 4.8, 5.9, 4.0],
            "T3": [7.9, 5.2, 6.3, 4.0],
            "T4": [8.1, 5.1, 5.8, 4.0],
        }
    )
    annotations = pd.DataFrame(
        {
            "sample": ["C1", "C2", "C3", "C4", "T1", "T2", "T3", "T4"],
            "group": [
                "control",
                "control",
                "control",
                "control",
                "treated",
                "treated",
                "treated",
                "treated",
            ],
        }
    )
    return expressions, annotations
