import Link from "next/link";

export default function AnalysisNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Analysis Run Not Found
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This analysis does not exist or does not belong to your account.
      </p>
      <Link
        href="/analyses"
        className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Back to All Runs
      </Link>
    </div>
  );
}
