import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = await isAdmin();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-neutral-50 to-slate-100 dark:from-slate-950 dark:via-neutral-950 dark:to-slate-900 text-neutral-900 dark:text-neutral-100 relative overflow-hidden transition-colors duration-500">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/5 dark:bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/5 dark:bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.02),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_70%)]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-2xl transition-all duration-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/admin" className="group flex items-center gap-2 transition-all duration-300">
            <div className="text-2xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-emerald-600 dark:from-emerald-400 to-cyan-600 dark:to-cyan-400 bg-clip-text text-transparent">ORVAIT</span>
            </div>
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">ADMIN</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {signedIn && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl rounded-3xl border border-neutral-200/50 dark:border-neutral-700/50 p-8 lg:p-12 shadow-xl dark:shadow-2xl hover:shadow-2xl dark:hover:shadow-2xl transition-shadow duration-500">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
