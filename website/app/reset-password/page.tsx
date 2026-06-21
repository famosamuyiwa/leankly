import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
    "";
  const projectId =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ||
    "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
      <Suspense fallback={<ResetCardFallback />}>
        <ResetPasswordForm endpoint={endpoint} projectId={projectId} />
      </Suspense>
    </main>
  );
}

function ResetCardFallback() {
  return (
    <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-black/5">
      <p className="text-sm text-gray-500">Loading password reset…</p>
    </section>
  );
}
