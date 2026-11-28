"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  FilePenLine,
  X,
} from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

export type FieldValidation =
  | { ok: true; summary: string }
  | { ok: false; error: string }
  | null;

interface CsvDropzoneFieldProps {
  label: string;
  required?: boolean;
  hint: ReactNode;
  icon: ReactNode;
  defaultFileName: string;
  placeholder: string;
  disabled?: boolean;
  validation: FieldValidation;
  onFileChange: (file: File | null) => void;
}

const KB = 1024;
const MB = 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export function CsvDropzoneField({
  label,
  required = true,
  hint,
  icon,
  defaultFileName,
  placeholder,
  disabled = false,
  validation,
  onFileChange,
}: CsvDropzoneFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [mode, setMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function buildTextFile(text: string): File | null {
    if (!text.trim()) return null;
    return new File([text], defaultFileName, { type: "text/csv" });
  }

  function selectFile(file: File | null) {
    setSelectedFile(file);
    onFileChange(file);
  }

  function switchToText(initialText?: string) {
    const nextText = initialText ?? rawText;
    setMode("text");
    if (initialText !== undefined) {
      setRawText(initialText);
    }
    onFileChange(buildTextFile(nextText));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function switchToFile() {
    setMode("file");
    onFileChange(selectedFile);
  }

  function handleTextChange(nextText: string) {
    setRawText(nextText);
    onFileChange(buildTextFile(nextText));
  }

  function handleClearFile(e: React.MouseEvent) {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    selectFile(null);
  }

  const trimmed = rawText.trim();
  const rowCount = trimmed === "" ? 0 : trimmed.split(/\r\n|\r|\n/).length;
  const charCount = rawText.length;

  const hasError = validation !== null && !validation.ok;
  const isValid = validation?.ok === true;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="type-label-lg flex items-center gap-1 text-xs font-semibold text-on-surface"
        >
          <span>{label}</span>
          {required && (
            <span
              className="text-sm leading-none font-bold text-error"
              title="Required"
            >
              *
            </span>
          )}
        </label>
      </div>

      {mode === "file" ? (
        <div
          tabIndex={0}
          role="button"
          aria-label={`Upload ${label}`}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) {
              selectFile(dropped);
            }
          }}
          onPaste={(e) => {
            if (disabled) return;
            const pasted = e.clipboardData.getData("text");
            if (pasted && pasted.trim().length > 0) {
              e.preventDefault();
              switchToText(pasted);
            }
          }}
          className={`group relative flex h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 transition-colors ${
            hasError
              ? "border-error/60 bg-error-container/25"
              : isDragging || selectedFile
                ? "border-primary bg-primary/8"
                : "border-ghost-border-strong bg-surface-container-low/60 hover:border-primary/50 hover:bg-primary/5"
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              selectFile(file);
            }}
            className="hidden"
          />

          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary transition-colors group-hover:bg-primary/18">
            {icon}
          </div>

          {selectedFile ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
              <span className="type-label-lg text-sm font-semibold text-on-primary-fixed">
                {selectedFile.name}
              </span>
              <span className="type-metric-sm rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-on-primary-fixed-variant">
                {formatFileSize(selectedFile.size)}
              </span>
              <button
                type="button"
                onClick={handleClearFile}
                aria-label={`Remove ${selectedFile.name}`}
                className="ml-0.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1 text-center">
              <span className="type-label-lg text-sm font-semibold text-on-surface">
                Drag and drop your CSV file here, or
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="type-label-lg cursor-pointer text-sm font-semibold text-primary underline underline-offset-2 transition-colors hover:text-on-primary-fixed-variant"
              >
                browse
              </button>
            </div>
          )}

          <p className="type-body-sm mt-0.5 text-center text-xs text-on-surface-variant">
            {hint}
          </p>

          <div className="mt-3 flex w-full items-center justify-center border-t border-ghost-border pt-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                switchToText();
              }}
              className="type-label-lg inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ghost-border-strong bg-surface-container-lowest/85 px-3 py-1 text-xs font-medium text-on-surface-variant shadow-xs transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <ClipboardPaste aria-hidden="true" className="size-3.5" />
              <span>or paste raw text instead</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`flex h-52 flex-col overflow-hidden rounded-2xl border-2 bg-surface-container-low/80 shadow-xs ${
            hasError ? "border-error/60" : "border-primary/40"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/12 bg-primary/6 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="type-label-lg flex items-center gap-1 font-semibold text-on-surface">
                <FilePenLine
                  aria-hidden="true"
                  className="size-3.5 text-primary"
                />
                <span>Raw CSV Text</span>
              </span>
              <span className="type-metric-sm rounded-full border border-ghost-border-strong bg-surface-container-lowest px-2 py-0.5 text-[11px] text-on-surface-variant">
                {rowCount} {rowCount === 1 ? "row" : "rows"} • {charCount}{" "}
                {charCount === 1 ? "char" : "chars"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {rawText.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    handleTextChange("");
                    textareaRef.current?.focus();
                  }}
                  className="cursor-pointer text-xs font-medium text-on-surface-variant transition-colors hover:text-error"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={switchToFile}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-on-primary-fixed-variant"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                <span>Switch back to file upload</span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id={inputId}
            value={rawText}
            disabled={disabled}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-0 w-full flex-1 resize-none border-none bg-surface-container-lowest p-3 font-mono text-xs leading-relaxed text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>
      )}

      {isValid && (
        <p className="type-body-sm flex items-center gap-1.5 text-xs font-medium text-status-success">
          <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{validation.summary}</span>
        </p>
      )}

      {hasError && (
        <p
          role="alert"
          className="type-body-sm text-xs font-medium text-status-error"
        >
          {validation.error}
        </p>
      )}
    </div>
  );
}
