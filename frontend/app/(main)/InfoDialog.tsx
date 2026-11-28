"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type ReactNode,
} from "react";

interface InfoDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  dismissLabel?: string;
}

export function InfoDialog({
  open,
  onClose,
  title,
  icon,
  children,
  dismissLabel = "Okay",
}: InfoDialogProps) {
  const titleId = useId();
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  // useEffectEvent so the effect below only re-runs when `open` changes
  // (not when a parent passes a new `onClose` function reference). It always
  // reads the latest `onClose` without being a dependency, and must only be
  // called from inside an effect.
  const onEscape = useEffectEvent(() => {
    onClose();
  });

  useEffect(() => {
    if (!open) return;
    // Get the button that had opened this dialog
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Keep track of the last scroll position of the view under this dialog
    const prevOverflow = document.body.style.overflow;
    // Disable scrolling for the view under this dialog
    document.body.style.overflow = "hidden";
    // Focus the dismiss button of the dialog
    dismissButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore the scroll position of the view under the dialog
      document.body.style.overflow = prevOverflow;
      // Focus again the button that had opened the dialog
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // fixed: pin to the browser's viewport
      // inset-0: stretch to cover the entirety of the viewport
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-ghost-border-strong bg-surface-container-lowest p-6 shadow-2xl md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            {icon}
          </div>
          <h3
            id={titleId}
            className="type-headline-sm text-lg font-semibold text-on-surface"
          >
            {title}
          </h3>
        </div>

        <div className="type-body-md rounded-2xl border border-ghost-border bg-surface-container-low/60 p-4 leading-relaxed text-on-surface-variant">
          {children}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            ref={dismissButtonRef}
            type="button"
            onClick={onClose}
            className="filled-button text-sm"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
