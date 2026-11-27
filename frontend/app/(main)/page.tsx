import UploadForm from "./UploadForm";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          DGE Analysis Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload expression and annotation CSVs to run differential gene
          expression analysis and explore gene interaction networks.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
