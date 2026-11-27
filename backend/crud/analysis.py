import json

from analysis.dge import DGEAnalysisResult, TestMethod
from models.analysis import AnalysisRun, AnalysisStatus
from sqlalchemy import select
from sqlalchemy.orm import Session


# Create a new pending analysis run storing the uploaded/sample CSV inputs.
def create_analysis_run(
    db: Session,
    *,
    user_id: int,
    name: str,
    expression_csv: str,
    annotations_csv: str,
    test_method: TestMethod = TestMethod.welch_t,
    is_log2: bool = True,
) -> AnalysisRun:
    run = AnalysisRun(
        user_id=user_id,
        name=name,
        status=AnalysisStatus.pending,
        test_method=test_method,
        is_log2=is_log2,
        expression_csv=expression_csv,
        annotations_csv=annotations_csv,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


# Return all analysis runs owned by the given user, newest first.
def list_analysis_runs_for_user(db: Session, user_id: int) -> list[AnalysisRun]:
    stmt = (
        select(AnalysisRun)
        .where(AnalysisRun.user_id == user_id)
        .order_by(AnalysisRun.created_at.desc(), AnalysisRun.id.desc())
    )
    return list(db.execute(stmt).scalars().all())


# Fetch a single analysis run scoped to the authenticated user (returns None if missing or owned by someone else).
def get_analysis_run_for_user(
    db: Session, run_id: int, user_id: int
) -> AnalysisRun | None:
    stmt = select(AnalysisRun).where(
        AnalysisRun.id == run_id,
        AnalysisRun.user_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


# Persist DGE summary metadata and serialized per-gene results onto an existing AnalysisRun.
def save_analysis_results(
    db: Session, run: AnalysisRun, dge_result: DGEAnalysisResult
) -> AnalysisRun:
    run.status = AnalysisStatus.completed
    run.test_method = dge_result.test_method
    run.is_log2 = dge_result.is_log2
    run.group_a = dge_result.group_a
    run.group_b = dge_result.group_b
    run.n_group_a = dge_result.n_group_a
    run.n_group_b = dge_result.n_group_b
    run.total_genes = dge_result.total_genes
    run.significant_genes = sum(
        1 for r in dge_result.results if r.adjusted_p_value <= 0.05
    )
    run.results_json = json.dumps([r.to_dict() for r in dge_result.results])
    db.commit()
    db.refresh(run)
    return run


# Mark an analysis run as failed when DGE execution cannot complete.
def mark_analysis_failed(db: Session, run: AnalysisRun) -> AnalysisRun:
    run.status = AnalysisStatus.failed
    db.commit()
    db.refresh(run)
    return run
