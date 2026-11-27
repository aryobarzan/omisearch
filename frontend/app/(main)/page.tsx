import { Suspense } from "react";
import RunsList, { RunsListSkeleton } from "./RunsList";
import SampleDatasetCard from "./SampleDatasetCard";
import UploadForm from "./UploadForm";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          DGE Analysis Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload expression and annotation CSVs—or run the simulated sample
          dataset—to perform differential gene expression analysis and explore
          gene interaction networks.
        </p>
      </div>

      <SampleDatasetCard />
      <UploadForm />
      <Suspense fallback={<RunsListSkeleton title="Recent Runs" />}>
        <RunsList limit={2} />
      </Suspense>
    </div>
  );
}
