export type TestMethod = "welch_t" | "mann_whitney";

export type AnalysisStatus = "pending" | "completed" | "failed";

export type AnalysisRunSummary = {
  id: number;
  name: string;
  status: AnalysisStatus;
  test_method: TestMethod;
  is_log2: boolean;
  group_a: string | null;
  group_b: string | null;
  n_group_a: number | null;
  n_group_b: number | null;
  total_genes: number | null;
  significant_genes: number | null;
  created_at: string;
  updated_at: string;
};

export type GeneResult = {
  gene: string;
  mean_group_a: number;
  mean_group_b: number;
  log2_fold_change: number;
  p_value: number;
  adjusted_p_value: number;
};

export type AnalysisRunDetail = AnalysisRunSummary & {
  results: GeneResult[];
};

export type CytoscapeNodeData = {
  id: string;
  label: string;
  log2_fold_change: number;
  p_value: number;
  adjusted_p_value: number;
  mean_group_a: number;
  mean_group_b: number;
  degree: number;
};

export type CytoscapeNode = {
  data: CytoscapeNodeData;
};

export type CytoscapeEdgeData = {
  id: string;
  source: string;
  target: string;
  score?: number | null;
};

export type CytoscapeEdge = {
  data: CytoscapeEdgeData;
};

export type NetworkResponse = {
  padj_threshold: number;
  lfc_threshold: number;
  min_score: number | null;
  total_significant_genes: number;
  node_count: number;
  edge_count: number;
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
};
