"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "../api";
import type {
  AnalysisRunSummary,
  NetworkResponse,
} from "../types/analysis";

export type UploadActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; run: AnalysisRunSummary };

export type NetworkActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; network: NetworkResponse };

async function extractErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errBody = (await response.json()) as { detail?: unknown };
    if (typeof errBody.detail === "string" && errBody.detail.trim()) {
      return errBody.detail;
    }
  } catch {
    // non-JSON error body
  }
  return fallback;
}

export async function uploadAndRunAnalysis(
  _prevState: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const rawName = String(formData.get("name") ?? "").trim();
  const expressionFile = formData.get("expression_file");
  const annotationsFile = formData.get("annotations_file");
  const testMethod = String(formData.get("test_method") ?? "welch_t");
  const rawLog2 = formData.get("is_log2");
  const isLog2 = rawLog2 === "on" || rawLog2 === "true";

  if (rawName.length > 120) {
    return {
      status: "error",
      message: "Analysis name must be at most 120 characters.",
    };
  }
  if (!(expressionFile instanceof File) || expressionFile.size === 0) {
    return {
      status: "error",
      message: "Please provide a gene expression CSV file or raw CSV text.",
    };
  }
  if (!(annotationsFile instanceof File) || annotationsFile.size === 0) {
    return {
      status: "error",
      message: "Please provide a sample annotations CSV file or raw CSV text.",
    };
  }

  const stem = expressionFile.name.replace(/\.csv$/i, "").trim();
  const autoName =
    stem && stem.toLowerCase() !== "expression"
      ? stem.slice(0, 120)
      : "DGE Analysis";
  const name = rawName || autoName;

  const payload = new FormData();
  payload.append("name", name);
  payload.append("expression_file", expressionFile);
  payload.append("annotations_file", annotationsFile);
  payload.append("test_method", testMethod);
  payload.append("is_log2", String(isLog2));
  payload.append("auto_run", "true");

  let response: Response;
  try {
    response = await apiFetch("/analyses/upload", {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    // Re-throw Next.js redirect errors from apiFetch on 401/missing session.
    unstable_rethrow(err);
    return {
      status: "error",
      message: "Could not reach the server.",
    };
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(
      response,
      `Upload failed (HTTP ${response.status}).`,
    );
    return { status: "error", message: detail };
  }

  const run = (await response.json()) as AnalysisRunSummary;
  revalidatePath("/");
  revalidatePath("/analyses");
  return { status: "success", run };
}

export async function loadAndRunSampleAnalysis(
  _prevState: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const testMethod = String(formData.get("test_method") ?? "welch_t");

  let response: Response;
  try {
    response = await apiFetch("/analyses/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sample Dataset (Simulated)",
        test_method: testMethod,
        is_log2: true,
        auto_run: true,
      }),
    });
  } catch (err) {
    unstable_rethrow(err);
    return {
      status: "error",
      message: "Could not reach the server.",
    };
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(
      response,
      `Failed to run sample dataset (HTTP ${response.status}).`,
    );
    return { status: "error", message: detail };
  }

  const run = (await response.json()) as AnalysisRunSummary;
  revalidatePath("/");
  revalidatePath("/analyses");
  return { status: "success", run };
}

export async function buildAnalysisNetwork(
  _prevState: NetworkActionState,
  formData: FormData,
): Promise<NetworkActionState> {
  const analysisId = String(formData.get("analysis_id") ?? "").trim();
  const hasStored = formData.get("has_stored_interactions") === "true";
  const padjThreshold = String(formData.get("padj_threshold") ?? "0.05");
  const lfcThreshold = String(formData.get("lfc_threshold") ?? "1.0");
  const minScore = String(formData.get("min_score") ?? "").trim();
  const includeIsolated = formData.get("include_isolated") === "on";
  const interactionsFile = formData.get("interactions_file");

  if (!/^\d+$/.test(analysisId)) {
    return { status: "error", message: "Invalid analysis ID." };
  }

  const hasUploadedFile =
    interactionsFile instanceof File && interactionsFile.size > 0;

  if (!hasUploadedFile && !hasStored) {
    return {
      status: "error",
      message:
        "Please select an interactions CSV file (gene_a,gene_b[,score]).",
    };
  }

  const payload = new FormData();
  payload.append("padj_threshold", padjThreshold);
  payload.append("lfc_threshold", lfcThreshold);
  payload.append("include_isolated", String(includeIsolated));
  if (minScore !== "") {
    payload.append("min_score", minScore);
  }
  if (hasUploadedFile) {
    payload.append("interactions_file", interactionsFile);
  }

  let response: Response;
  try {
    response = await apiFetch(`/analyses/${analysisId}/network`, {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    unstable_rethrow(err);
    return {
      status: "error",
      message: "Could not reach the server.",
    };
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(
      response,
      `Failed to build network (HTTP ${response.status}).`,
    );
    return { status: "error", message: detail };
  }

  const network = (await response.json()) as NetworkResponse;
  return { status: "success", network };
}
