"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

// ComponentProps<"input"> includes all native <input> attributes and React 19's
// `ref` prop, so spreading react-hook-form's register() forwards `ref` directly
// to the underlying <input> without needing React.forwardRef.
interface AuthFieldProps extends ComponentProps<"input"> {
  id: string;
  label: string;
  error?: string;
}

export function AuthField({
  id,
  label,
  type = "text",
  error,
  className = "",
  ...inputProps
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="type-label-lg text-xs font-semibold text-on-surface"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          className={`text-input ${isPassword ? "pr-11" : ""} ${error ? "text-input-error" : ""} ${className}`}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="type-body-sm text-xs font-medium text-status-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
