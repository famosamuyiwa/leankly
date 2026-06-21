"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  endpoint: string;
  projectId: string;
};

type AppwriteError = {
  message?: string;
};

export default function ResetPasswordForm({ endpoint, projectId }: Props) {
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const secret = params.get("secret") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const configurationMissing = !endpoint || !projectId;
  const tokenMissing = !userId || !secret;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (configurationMissing) {
      setError("Password reset is not configured. Please contact support.");
      return;
    }

    if (tokenMissing) {
      setError("This recovery link is incomplete. Request a new reset email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least eight characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${endpoint.replace(/\/$/, "")}/account/recovery`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": projectId,
          },
          body: JSON.stringify({ userId, secret, password }),
        },
      );
      const body = (await response
        .json()
        .catch(() => null)) as AppwriteError | null;

      if (!response.ok) {
        throw new Error(body?.message || "Unable to update your password.");
      }

      setIsComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update your password.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isComplete) {
    return (
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[#10131f]">Password updated</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Return to Leankly and sign in with your new password.
        </p>
        <a
          href="leankly://"
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-5 font-semibold text-white"
        >
          Open Leankly
        </a>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-black/5">
      <a href="/" className="text-sm font-semibold text-gray-500">
        ← Leankly
      </a>
      <h1 className="mt-7 text-3xl font-bold tracking-tight text-[#10131f]">
        Reset password
      </h1>
      <p className="mt-3 text-sm leading-6 text-gray-500">
        Choose a new password for your Leankly account.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[#10131f] outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isLoading}
            className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[#10131f] outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          />
        </label>

        {(error || tokenMissing || configurationMissing) && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
            {error ||
              (tokenMissing
                ? "This recovery link is incomplete. Request a new reset email."
                : "Password reset is not configured. Please contact support.")}
          </p>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            tokenMissing ||
            configurationMissing ||
            !password ||
            !confirmPassword
          }
          className="h-12 w-full rounded-full bg-black px-5 font-semibold text-white transition enabled:hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isLoading ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
