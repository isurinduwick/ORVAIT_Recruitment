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
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-neutral-50 to-slate-100 dark:from-slate-950 dark:via-neutral-950 dark:to-slate-900 text-neutral-900 dark:text-neutral-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_60%)]" ></div>
      </div>

      <div className="relative container mx-auto px-6 py-16 h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4 mb-8">
            <div className="inline-block">
              <div className="text-5xl md:text-6xl font-black tracking-tighter">
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-300 bg-clip-text text-transparent">ORVAIT</span>
              </div>
            </div>
            <p className="text-sm font-semibold tracking-widest text-emerald-500 dark:text-emerald-400 uppercase">Administration Portal</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Secure access for authorized administrators</p>
          </div>

          {/* Form Container */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/80 dark:bg-neutral-900/40 backdrop-blur-2xl rounded-3xl border border-gray-200/80 dark:border-neutral-700/50 p-8 shadow-2xl hover:shadow-3xl transition-shadow duration-500">
              <form action={login} className="space-y-5">
                {/* Input Group */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Password</label>
                  <div className="relative group">
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 to-cyan-500/0 group-focus-within:from-emerald-500/10 group-focus-within:to-cyan-500/10 pointer-events-none transition-all duration-300"></div>
                  </div>
                </div>

                {/* Error Message */}
                {sp.error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-shake">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Incorrect password. Please try again.</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <SubmitButton
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 dark:from-emerald-600 dark:to-cyan-600 dark:hover:from-emerald-700 dark:hover:to-cyan-700 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    loadingText="Signing in…"
                  >
                    Sign in
                  </SubmitButton>
                </div>
              </form>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs text-neutral-600 dark:text-neutral-400 pt-4">
            <p>Restricted access • Authorized personnel only</p>
          </div>
        </div>
      </div>
    </main>
  );
}
