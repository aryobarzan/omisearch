"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "../api";
import type { AnalysisRunSummary } from "../types/analysis";

export type UploadActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; run: AnalysisRunSummary };

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
  const name = String(formData.get("name") ?? "").trim();
  const expressionFile = formData.get("expression_file");
  const annotationsFile = formData.get("annotations_file");
  const testMethod = String(formData.get("test_method") ?? "welch_t");
  const isLog2 = formData.get("is_log2") === "on";

  if (!name || name.length > 120) {
    return {
      status: "error",
      message: "Analysis name must be between 1 and 120 characters.",
    };
  }
  if (!(expressionFile instanceof File) || expressionFile.size === 0) {
    return {
      status: "error",
      message: "Please select a gene expression CSV file.",
    };
  }
  if (!(annotationsFile instanceof File) || annotationsFile.size === 0) {
    return {
      status: "error",
      message: "Please select a sample annotations CSV file.",
    };
  }

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
