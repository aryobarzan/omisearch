"""API tests for the sample dataset loader and interaction network endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from tests.api.helpers import (
    VALID_ANN_CSV,
    VALID_EXPR_CSV,
    VALID_INTERACTIONS_CSV,
    register_and_get_headers,
)


def test_sample_analysis_and_sample_network(client: TestClient) -> None:
    """Verify POST /analyses/sample with auto_run=true and POST /analyses/{id}/network with use_sample=true."""
    headers = register_and_get_headers(client, "alice")

    sample_res = client.post(
        "/analyses/sample",
        headers=headers,
        json={"name": "Demo Sample Run", "auto_run": True},
    )
    assert sample_res.status_code == 201, sample_res.text
    run = sample_res.json()
    assert run["status"] == "completed"
    assert run["total_genes"] == 200
    assert run["significant_genes"] >= 45
    assert run["has_interactions"] is True

    # Preloaded sample interactions allow building the network directly without use_sample or file
    net_res = client.post(
        f"/analyses/{run['id']}/network",
        headers=headers,
        data={
            "padj_threshold": "0.05",
            "lfc_threshold": "1.0",
        },
    )
    assert net_res.status_code == 200, net_res.text
    net = net_res.json()
    assert net["node_count"] > 0
    assert net["edge_count"] > 0
    assert len(net["nodes"]) == net["node_count"]
    assert len(net["edges"]) == net["edge_count"]


def test_network_upload_and_error_cases(client: TestClient) -> None:
    """Verify custom interactions upload and 400 error handling on pending runs or invalid inputs."""
    headers = register_and_get_headers(client, "alice")

    upload_res = client.post(
        "/analyses/upload",
        headers=headers,
        data={"name": "Net Test"},
        files={
            "expression_file": ("expression.csv", VALID_EXPR_CSV, "text/csv"),
            "annotations_file": ("annotations.csv", VALID_ANN_CSV, "text/csv"),
        },
    )
    run_id = upload_res.json()["id"]

    # Network on pending run -> 400
    pending_net = client.post(
        f"/analyses/{run_id}/network", headers=headers, data={"use_sample": "true"}
    )
    assert pending_net.status_code == 400

    # Complete DGE first
    assert client.post(f"/analyses/{run_id}/run", headers=headers).status_code == 200

    # Neither file nor use_sample -> 400
    missing_src = client.post(f"/analyses/{run_id}/network", headers=headers)
    assert missing_src.status_code == 400

    # Valid custom edge list -> UP_1 <-> DOWN_1 survives; UP_1 <-> NULL_1 filtered out
    custom_net = client.post(
        f"/analyses/{run_id}/network",
        headers=headers,
        data={"padj_threshold": "0.05", "lfc_threshold": "1.0"},
        files={
            "interactions_file": (
                "interactions.csv",
                VALID_INTERACTIONS_CSV,
                "text/csv",
            )
        },
    )
    assert custom_net.status_code == 200, custom_net.text
    payload = custom_net.json()
    assert payload["node_count"] == 2
    assert payload["edge_count"] == 1
    assert payload["edges"][0]["data"]["score"] == 0.88

    # Uploaded interactions are persisted so subsequent threshold updates need no file
    rerun_net = client.post(
        f"/analyses/{run_id}/network",
        headers=headers,
        data={"padj_threshold": "0.05", "lfc_threshold": "1.0", "min_score": "0.95"},
    )
    assert rerun_net.status_code == 200, rerun_net.text
    assert rerun_net.json()["edge_count"] == 0

    # Malformed interactions CSV -> 400 (and does not clobber stored valid interactions)
    bad_net = client.post(
        f"/analyses/{run_id}/network",
        headers=headers,
        files={"interactions_file": ("bad.csv", "wrong_a,wrong_b\nA,B\n", "text/csv")},
    )
    assert bad_net.status_code == 400

    still_valid = client.post(
        f"/analyses/{run_id}/network",
        headers=headers,
        data={"padj_threshold": "0.05", "lfc_threshold": "1.0"},
    )
    assert still_valid.status_code == 200
    assert still_valid.json()["edge_count"] == 1
