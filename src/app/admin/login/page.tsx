import { redirect } from "next/navigation";
import { signInAdmin, isAdmin } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";

async function login(formData: FormData) {
  "use server";
  const pw = String(formData.get("password") || "");
  const ok = await signInAdmin(pw);
  if (!ok) redirect("/admin/login?error=1");
  redirect("/admin");
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 px-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 bg-white dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-neutral-800"
      >
        <div>
          <h1 className="text-xl font-semibold">Admin sign in</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Generic Recruitment Portal</p>
        </div>
        <input
          type="password"
          name="password"
          required
          placeholder="Admin password"
          className="w-full rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {sp.error && (
          <p className="text-xs text-red-500 dark:text-red-400">Incorrect password</p>
        )}
        <SubmitButton
          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
          loadingText="Signing in…"
        >
          Sign in
        </SubmitButton>
      </form>
    </main>
  );
}
