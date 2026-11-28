import type { AnalysisStatus, TestMethod } from "@/app/lib/types/analysis";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const TEST_LABELS: Record<TestMethod, string> = {
  welch_t: "Welch’s t-test",
  mann_whitney: "Mann–Whitney U",
};

export const STATUS_META: Record<
  AnalysisStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "Completed",
    className: "text-status-success",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Running",
    className: "text-status-warning",
    Icon: Clock,
  },
  failed: {
    label: "Failed",
    className: "text-status-error",
    Icon: AlertCircle,
  },
};

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}
