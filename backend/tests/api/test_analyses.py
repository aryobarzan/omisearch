"""API tests for analysis upload, DGE execution, listing, detail retrieval, and user isolation."""

from __future__ import annotations

from fastapi.testclient import TestClient

from tests.api.helpers import VALID_ANN_CSV, VALID_EXPR_CSV, register_and_get_headers


def test_upload_run_and_rerun_flow(client: TestClient) -> None:
    """Verify uploading CSVs, running Welch's t-test, re-running with Mann-Whitney U, and fetching detail."""
    headers = register_and_get_headers(client, "alice")

    upload_res = client.post(
        "/analyses/upload",
        headers=headers,
        data={"name": "Drug Experiment", "test_method": "welch_t", "is_log2": "true"},
        files={
            "expression_file": ("expression.csv", VALID_EXPR_CSV, "text/csv"),
            "annotations_file": ("annotations.csv", VALID_ANN_CSV, "text/csv"),
        },
    )
    assert upload_res.status_code == 201, upload_res.text
    created = upload_res.json()
    assert created["name"] == "Drug Experiment"
    assert created["status"] == "pending"
    run_id = created["id"]

    # Run DGE (default options from upload)
    run_res = client.post(f"/analyses/{run_id}/run", headers=headers)
    assert run_res.status_code == 200, run_res.text
    detail = run_res.json()
    assert detail["status"] == "completed"
    assert detail["group_a"] == "control"
    assert detail["group_b"] == "treated"
    assert detail["total_genes"] == 3
    assert detail["significant_genes"] == 2
    assert len(detail["results"]) == 3

    # Re-run with Mann-Whitney U
    rerun_res = client.post(
        f"/analyses/{run_id}/run",
        headers=headers,
        json={"test_method": "mann_whitney", "is_log2": True},
    )
    assert rerun_res.status_code == 200
    assert rerun_res.json()["test_method"] == "mann_whitney"

    # List & Get detail
    list_res = client.get("/analyses", headers=headers)
    assert list_res.status_code == 200
    runs = list_res.json()
    assert len(runs) == 1
    assert runs[0]["id"] == run_id
    assert "results" not in runs[0]  # summary omits full gene array

    get_res = client.get(f"/analyses/{run_id}", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()["results"]) == 3


def test_upload_auto_run_validation_and_failed_run(client: TestClient) -> None:
    """Verify auto_run rejects bad CSVs without saving a broken row, and /run marks invalid pending runs failed."""
    headers = register_and_get_headers(client, "alice")
    bad_ann = "sample,group\nC1,only_one\nC2,only_one\n"

    # auto_run=true rejects bad CSV with 400 and leaves DB clean
    bad_auto = client.post(
        "/analyses/upload",
        headers=headers,
        data={"name": "Broken Auto", "auto_run": "true"},
        files={
            "expression_file": ("expression.csv", VALID_EXPR_CSV, "text/csv"),
            "annotations_file": ("annotations.csv", bad_ann, "text/csv"),
        },
    )
    assert bad_auto.status_code == 400
    assert "exactly 2 groups" in bad_auto.json()["detail"]
    assert client.get("/analyses", headers=headers).json() == []

    # Uploading pending + calling /run returns 400 and transitions run to status=failed
    pending = client.post(
        "/analyses/upload",
        headers=headers,
        data={"name": "Broken Pending"},
        files={
            "expression_file": ("expression.csv", VALID_EXPR_CSV, "text/csv"),
            "annotations_file": ("annotations.csv", bad_ann, "text/csv"),
        },
    )
    assert pending.status_code == 201
    run_id = pending.json()["id"]

    failed = client.post(f"/analyses/{run_id}/run", headers=headers)
    assert failed.status_code == 400
    assert client.get(f"/analyses/{run_id}", headers=headers).json()["status"] == "failed"


def test_user_isolation(client: TestClient) -> None:
    """Verify users cannot view, run, or build networks on another user's analysis runs."""
    alice_headers = register_and_get_headers(client, "alice")
    bob_headers = register_and_get_headers(client, "bobby")

    sample_res = client.post(
        "/analyses/sample", headers=alice_headers, json={"auto_run": True}
    )
    assert sample_res.status_code == 201
    alice_run_id = sample_res.json()["id"]

    assert client.get("/analyses", headers=bob_headers).json() == []
    assert client.get(f"/analyses/{alice_run_id}", headers=bob_headers).status_code == 404
    assert (
        client.post(f"/analyses/{alice_run_id}/run", headers=bob_headers).status_code
        == 404
    )
    assert (
        client.post(
            f"/analyses/{alice_run_id}/network",
            headers=bob_headers,
            data={"use_sample": "true"},
        ).status_code
        == 404
    )
