"use client";

import { register } from "@/app/lib/actions/auth";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

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
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Register to run and save differential gene expression analyses.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
              {...registerField("username", {
                required: "Username is required.",
                minLength: {
                  value: 4,
                  message: "Username must be at least 4 characters.",
                },
                maxLength: {
                  value: 32,
                  message: "Username must be at most 32 characters.",
                },
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message:
                    "Username can only contain letters, numbers, underscores, and hyphens.",
                },
              })}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
              {...registerField("password", {
                required: "Password is required.",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters.",
                },
                maxLength: {
                  value: 64,
                  message: "Password must be at most 64 characters.",
                },
                deps: ["repeatPassword"],
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="repeatPassword" className="block text-sm font-medium">
              Repeat Password
            </label>
            <input
              id="repeatPassword"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700"
              {...registerField("repeatPassword", {
                required: "Please repeat your password.",
                validate: (value) =>
                  value === getValues("password") || "Passwords do not match.",
              })}
            />
            {errors.repeatPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.repeatPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || isPending}
            className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPending ? "Creating account..." : "Register"}
          </button>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </form>

        <hr className="my-6 border-zinc-200 dark:border-zinc-800" />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
