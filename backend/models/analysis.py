from datetime import datetime
from enum import StrEnum

from analysis.dge import TestMethod
from database.base import Base
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column


class AnalysisStatus(StrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Owner of this analysis run (cascade deletes runs if user is removed)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Display label shown in the dashboard's recent runs list
    name: Mapped[str] = mapped_column(String(120))
    # Lifecycle state: pending (uploaded), completed (DGE ran), or failed
    status: Mapped[AnalysisStatus] = mapped_column(default=AnalysisStatus.pending)
    # Statistical test used for p-value calculation (welch_t or mann_whitney)
    test_method: Mapped[TestMethod] = mapped_column(default=TestMethod.welch_t)
    # Whether expression values are already log2-transformed (affects log2FC formula)
    is_log2: Mapped[bool] = mapped_column(Boolean, default=True)

    # Summary metadata populated once DGE completes
    group_a: Mapped[str | None] = mapped_column(String(64), nullable=True)  # reference/control group name
    group_b: Mapped[str | None] = mapped_column(String(64), nullable=True)  # comparison/treated group name
    n_group_a: Mapped[int | None] = mapped_column(Integer, nullable=True)  # sample count in group_a
    n_group_b: Mapped[int | None] = mapped_column(Integer, nullable=True)  # sample count in group_b
    total_genes: Mapped[int | None] = mapped_column(Integer, nullable=True)  # total genes evaluated
    significant_genes: Mapped[int | None] = mapped_column(Integer, nullable=True)  # genes with padj <= 0.05

    # Raw CSV inputs retained so the run can be executed or re-run without re-uploading
    expression_csv: Mapped[str] = mapped_column(Text)
    annotations_csv: Mapped[str] = mapped_column(Text)
    # JSON-serialized list of per-gene DGE results once status == completed
    results_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Managed by SQLite's CURRENT_TIMESTAMP (UTC)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
