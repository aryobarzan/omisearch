"use client";

import { useState } from "react";
import { InfoDialog } from "./InfoDialog";
import { Info } from "lucide-react";

export function FdrInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-left text-on-primary-fixed-variant shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all hover:bg-primary/14 active:bg-primary/20"
      >
        <Info
          aria-hidden="true"
          className="size-4 transition-transform group-hover:scale-105"
        />
        <span className="type-label-lg font-medium text-on-primary-fixed-variant">
          FDR Correction: Benjamini–Hochberg
        </span>
      </button>

      <InfoDialog
        open={open}
        onClose={() => setOpen(false)}
        title="False Discovery Rate (FDR) Correction"
        icon={
          <Info
            aria-hidden="true"
            className="size-4 transition-transform group-hover:scale-105 text-primary"
          />
        }
      >
        <p>
          Multiple hypothesis testing dramatically increases false positives
          when testing thousands of genes simultaneously. Omisearch
          automatically applies the Benjamini–Hochberg (BH) procedure to
          calculate adjusted p-values (<code>padj</code>), controlling the
          expected proportion of false discoveries at the specified threshold
          (default{" "}
          <span className="type-metric-sm font-medium text-on-surface">
            padj ≤ 0.05
          </span>
          ).
        </p>
      </InfoDialog>
    </>
  );
}
