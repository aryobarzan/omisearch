import { ArrowLeft, FileSearch } from "lucide-react";
import Link from "next/link";

export default function AnalysisNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <section className="section-card w-full max-w-md items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileSearch aria-hidden="true" className="size-6" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="type-headline-md text-on-surface">
            Analysis Run Not Found
          </h1>
          <p className="type-body-sm text-on-surface-variant">
            This analysis does not exist or does not belong to your account.
          </p>
        </div>

        <Link href="/analyses" className="filled-button mt-1 px-5 py-2.5 text-sm">
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          <span>Back to All Runs</span>
        </Link>
      </section>
    </div>
  );
}
