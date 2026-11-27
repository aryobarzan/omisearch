from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from analysis.dge import TestMethod
from models.analysis import AnalysisStatus


# Single gene's differential expression statistics returned inside AnalysisRunDetailSchema.
class GeneResultSchema(BaseModel):
    gene: str
    mean_group_a: float
    mean_group_b: float
    log2_fold_change: float
    p_value: float
    adjusted_p_value: float


# Request body for POST /analyses/{id}/run to execute (or re-run) DGE on stored CSVs.
class AnalysisRunRequestSchema(BaseModel):
    test_method: TestMethod = TestMethod.welch_t
    is_log2: bool = True
    reference_group: str | None = None


# Optional request body for POST /analyses/sample to create (and optionally run) the simulated dataset.
class AnalysisSampleCreateSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(
        default="Sample Dataset (Simulated)", min_length=1, max_length=120
    )
    test_method: TestMethod = TestMethod.welch_t
    is_log2: bool = True
    auto_run: bool = False


# Lightweight analysis metadata for dashboard lists and create responses (omits raw CSVs and gene array).
class AnalysisRunSummarySchema(BaseModel):
    id: int
    name: str
    status: AnalysisStatus
    test_method: TestMethod
    is_log2: bool
    group_a: str | None = None
    group_b: str | None = None
    n_group_a: int | None = None
    n_group_b: int | None = None
    total_genes: int | None = None
    significant_genes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Full analysis response for GET /analyses/{id} and POST /analyses/{id}/run, including per-gene results.
class AnalysisRunDetailSchema(AnalysisRunSummarySchema):
    results: list[GeneResultSchema] = Field(default_factory=list)


# Cytoscape.js node `data` payload representing a single significant gene.
class CytoscapeNodeDataSchema(BaseModel):
    id: str
    label: str
    log2_fold_change: float
    p_value: float
    adjusted_p_value: float
    mean_group_a: float
    mean_group_b: float
    degree: int


# Cytoscape.js node wrapper: {"data": {...}}.
class CytoscapeNodeSchema(BaseModel):
    data: CytoscapeNodeDataSchema


# Cytoscape.js edge `data` payload linking two interacting significant genes.
class CytoscapeEdgeDataSchema(BaseModel):
    id: str
    source: str
    target: str
    score: float | None = None


# Cytoscape.js edge wrapper: {"data": {...}}.
class CytoscapeEdgeSchema(BaseModel):
    data: CytoscapeEdgeDataSchema


# Response payload for POST /analyses/{id}/network containing filter metadata and Cytoscape elements.
class NetworkResponseSchema(BaseModel):
    padj_threshold: float
    lfc_threshold: float
    min_score: float | None = None
    total_significant_genes: int
    node_count: int
    edge_count: int
    nodes: list[CytoscapeNodeSchema]
    edges: list[CytoscapeEdgeSchema]
