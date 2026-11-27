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
