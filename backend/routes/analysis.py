from os import getenv
from pathlib import Path
from typing import Annotated

import crud.analysis as crud_analysis
from analysis.dge import DGEValidationError, TestMethod, run_dge_from_csv
from analysis.network import NetworkValidationError, build_interaction_network_from_csv
from core.dependencies import get_current_user
from database.session import get_db
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from models.analysis import AnalysisRun, AnalysisStatus
from models.user import User
from schemas.analysis import (
    AnalysisRunDetailSchema,
    AnalysisRunRequestSchema,
    AnalysisRunSummarySchema,
    AnalysisSampleCreateSchema,
    NetworkResponseSchema,
)
from sqlalchemy.orm import Session

router = APIRouter(prefix="/analyses", tags=["analyses"])

MAX_CSV_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_sample_data_dir() -> Path:
    """Resolve the sample_data directory from SAMPLE_DATA_DIR or the repo root."""
    env_dir = getenv("SAMPLE_DATA_DIR")
    if env_dir:
        return Path(env_dir)
    return Path(__file__).resolve().parents[2] / "sample_data"


def _read_sample_file(filename: str) -> str:
    """Read a UTF-8 CSV from sample_data/, raising 500 if the file is missing or unreadable."""
    path = _get_sample_data_dir() / filename
    try:
        return path.read_text(encoding="utf-8")
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sample dataset file '{filename}' could not be read.",
        ) from e


async def _read_upload_csv(upload: UploadFile, label: str) -> str:
    """Read and validate an uploaded CSV file (max 10 MB, non-empty UTF-8)."""
    raw = await upload.read(MAX_CSV_BYTES + 1)
    if len(raw) > MAX_CSV_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{label} CSV exceeds maximum allowed size (10 MB).",
        )
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise HTTPException(
            status_code=400, detail=f"{label} CSV must be UTF-8 encoded."
        ) from e
    if not text.strip():
        raise HTTPException(status_code=400, detail=f"{label} CSV is empty.")
    return text


def _get_user_run(db: Session, analysis_id: int, user_id: int) -> AnalysisRun:
    """Fetch an AnalysisRun owned by user_id or raise 404."""
    run = crud_analysis.get_analysis_run_for_user(db, analysis_id, user_id)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    return run


def _execute_dge_for_run(
    db: Session,
    run: AnalysisRun,
    *,
    test_method: TestMethod,
    is_log2: bool,
    reference_group: str | None = None,
) -> AnalysisRun:
    """Run DGE on a stored AnalysisRun, saving results or marking it failed on validation error."""
    try:
        dge_result = run_dge_from_csv(
            run.expression_csv,
            run.annotations_csv,
            test_method=test_method,
            is_log2=is_log2,
            reference_group=reference_group,
        )
    except DGEValidationError as e:
        crud_analysis.mark_analysis_failed(db, run)
        raise HTTPException(status_code=400, detail=str(e)) from e

    return crud_analysis.save_analysis_results(db, run, dge_result)


@router.post("/upload", response_model=AnalysisRunSummarySchema, status_code=201)
async def upload_analysis(
    expression_file: Annotated[UploadFile, File()],
    annotations_file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()] = "Uploaded Analysis",
    test_method: Annotated[TestMethod, Form()] = TestMethod.welch_t,
    is_log2: Annotated[bool, Form()] = True,
    auto_run: Annotated[bool, Form()] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload expression and annotation CSVs to create a new analysis run (optionally running DGE immediately)."""
    clean_name = name.strip()
    if not clean_name or len(clean_name) > 120:
        raise HTTPException(
            status_code=400,
            detail="Analysis name must be between 1 and 120 characters.",
        )

    expression_csv = await _read_upload_csv(expression_file, "Expression")
    annotations_csv = await _read_upload_csv(annotations_file, "Annotations")

    dge_result = None
    if auto_run:
        try:
            dge_result = run_dge_from_csv(
                expression_csv,
                annotations_csv,
                test_method=test_method,
                is_log2=is_log2,
            )
        except DGEValidationError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    run = crud_analysis.create_analysis_run(
        db,
        user_id=current_user.id,
        name=clean_name,
        expression_csv=expression_csv,
        annotations_csv=annotations_csv,
        test_method=test_method,
        is_log2=is_log2,
    )
    if dge_result is not None:
        return crud_analysis.save_analysis_results(db, run, dge_result)
    return run


@router.post("/sample", response_model=AnalysisRunSummarySchema, status_code=201)
def create_sample_analysis(
    payload: Annotated[AnalysisSampleCreateSchema | None, Body()] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an analysis run preloaded with the bundled simulated sample dataset and interaction network."""
    opts = payload or AnalysisSampleCreateSchema()
    expression_csv = _read_sample_file("expression.csv")
    annotations_csv = _read_sample_file("annotations.csv")
    interactions_csv = _read_sample_file("interactions.csv")

    run = crud_analysis.create_analysis_run(
        db,
        user_id=current_user.id,
        name=opts.name,
        expression_csv=expression_csv,
        annotations_csv=annotations_csv,
        interactions_csv=interactions_csv,
        test_method=opts.test_method,
        is_log2=opts.is_log2,
    )

    if opts.auto_run:
        return _execute_dge_for_run(
            db,
            run,
            test_method=opts.test_method,
            is_log2=opts.is_log2,
        )

    return run


@router.post("/{analysis_id}/run", response_model=AnalysisRunDetailSchema)
def run_analysis(
    analysis_id: int,
    options: Annotated[AnalysisRunRequestSchema | None, Body()] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute (or re-run) differential gene expression analysis on a stored run."""
    run = _get_user_run(db, analysis_id, current_user.id)

    return _execute_dge_for_run(
        db,
        run,
        test_method=options.test_method if options else run.test_method,
        is_log2=options.is_log2 if options else run.is_log2,
        reference_group=options.reference_group if options else None,
    )


@router.get("", response_model=list[AnalysisRunSummarySchema])
def list_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all analysis runs owned by the authenticated user, newest first.

    Returns lightweight summaries (omitting raw CSVs and per-gene `results`) so
    the dashboard list stays fast even with many runs.
    """
    return crud_analysis.list_analysis_runs_for_user(db, current_user.id)


@router.get("/{analysis_id}", response_model=AnalysisRunDetailSchema)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full detail (including per-gene DGE `results`) for a single owned analysis run."""
    return _get_user_run(db, analysis_id, current_user.id)


@router.post("/{analysis_id}/network", response_model=NetworkResponseSchema)
async def build_analysis_network(
    analysis_id: int,
    interactions_file: Annotated[UploadFile | None, File()] = None,
    use_sample: Annotated[bool, Form()] = False,
    padj_threshold: Annotated[float, Form()] = 0.05,
    lfc_threshold: Annotated[float, Form()] = 1.0,
    min_score: Annotated[float | None, Form()] = None,
    include_isolated: Annotated[bool, Form()] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Build a Cytoscape-ready interaction subgraph filtered to significant genes of a completed run."""
    run = _get_user_run(db, analysis_id, current_user.id)
    if run.status != AnalysisStatus.completed or not run.results_json:
        raise HTTPException(
            status_code=400,
            detail="Analysis run has not completed yet. Run DGE analysis first.",
        )

    should_persist = False
    if interactions_file is not None:
        interactions_csv = await _read_upload_csv(interactions_file, "Interactions")
        should_persist = True
    elif use_sample:
        interactions_csv = _read_sample_file("interactions.csv")
        should_persist = True
    elif run.interactions_csv:
        interactions_csv = run.interactions_csv
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide an interactions CSV file or set use_sample=true.",
        )

    try:
        network_result = build_interaction_network_from_csv(
            run.results,
            interactions_csv,
            padj_threshold=padj_threshold,
            lfc_threshold=lfc_threshold,
            min_score=min_score,
            include_isolated=include_isolated,
        )
    except NetworkValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if should_persist:
        crud_analysis.save_analysis_interactions(db, run, interactions_csv)

    return network_result.to_dict()
