"use client";

import { register } from "@/app/lib/actions/auth";
import { LoaderCircle, UserPlus } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { AuthField } from "../components/AuthField";
import { PASSWORD_RULES, USERNAME_RULES } from "../components/authRules";
import { AuthShell } from "../components/AuthShell";

type RegisterForm = {
  username: string;
  password: string;
  repeatPassword: string;
};

export default function RegisterPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    register,
    undefined,
  );

  const {
    register: registerField,
    handleSubmit,
    getValues,
    formState: { isValid, errors },
  } = useForm<RegisterForm>({
    mode: "onChange",
  });

  const onSubmit = (data: RegisterForm) => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("password", data.password);
      formAction(formData);
    });
  };

  return (
    <AuthShell
      title="Create an account"
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in!"
      footerLinkHref="/login"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        // disable native browser validation tooltips
        noValidate
      >
        <AuthField
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="4–32 letters, numbers, _ or -"
          disabled={isPending}
          error={errors.username?.message}
          {...registerField("username", USERNAME_RULES)}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={isPending}
          error={errors.password?.message}
          {...registerField("password", {
            ...PASSWORD_RULES,
            deps: ["repeatPassword"],
          })}
        />

        <AuthField
          id="repeatPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          disabled={isPending}
          error={errors.repeatPassword?.message}
          {...registerField("repeatPassword", {
            required: "Please confirm your password.",
            validate: (value) =>
              value === getValues("password") || "Passwords do not match.",
          })}
        />

        {errorMessage && (
          <div role="alert" className="alert-error">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isPending}
          className="filled-button mt-1 w-full py-3 text-sm shadow-sm"
        >
          {isPending ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin"
            />
          ) : (
            <UserPlus aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span>{isPending ? "Creating account..." : "Create account"}</span>
        </button>
      </form>
    </AuthShell>
  );
}
