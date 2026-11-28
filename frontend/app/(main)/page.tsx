import { Suspense } from "react";
import { FdrInfoButton } from "./FdrInfoButton";
import RunsList, { RunsListSkeleton } from "./runs/RunsList";
import SampleDatasetCard from "./SampleDatasetCard";
import UploadForm from "./upload-form/UploadForm";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5">
          <h1 className="type-headline-lg text-on-surface">DGE Analysis</h1>
          <p className="type-body-md text-on-surface-variant">
            Perform a differential gene expression analysis from a CSV dataset
            or explore the sample dataset.
          </p>
        </div>
        {/* In case of small screen size, do not squeeze this info chip. */}
        <div className="shrink-0">
          <FdrInfoButton />
        </div>
      </section>

      <UploadForm />
      <SampleDatasetCard />
      <Suspense fallback={<RunsListSkeleton title="Recent Runs" />}>
        <RunsList limit={2} />
      </Suspense>
    </div>
  );
}
