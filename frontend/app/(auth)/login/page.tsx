"use client";

import { login } from "@/app/lib/actions/auth";
import { LoaderCircle, LogIn } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { AuthField } from "../components/AuthField";
import { PASSWORD_RULES, USERNAME_RULES } from "../components/authRules";
import { AuthShell } from "../components/AuthShell";

type LoginForm = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    login,
    undefined,
  );

  const {
    register,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<LoginForm>({
    mode: "onChange",
  });

  const onSubmit = (data: LoginForm) => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("password", data.password);
      formAction(formData);
    });
  };

  return (
    <AuthShell
      title="Sign in"
      footerPrompt="Don’t have an account?"
      footerLinkLabel="Register!"
      footerLinkHref="/register"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <AuthField
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          disabled={isPending}
          error={errors.username?.message}
          {...register("username", USERNAME_RULES)}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          error={errors.password?.message}
          {...register("password", PASSWORD_RULES)}
        />

        {errorMessage && (
          <div
            role="alert"
            className="type-body-sm rounded-2xl border border-error/25 bg-error-container px-4 py-3 font-medium text-on-error-container"
          >
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
            <LogIn aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span>{isPending ? "Signing in..." : "Sign in"}</span>
        </button>
      </form>
    </AuthShell>
  );
}
