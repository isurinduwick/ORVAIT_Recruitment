import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = await isAdmin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100">
      <header className="border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-semibold">
            Generic Recruitment Portal
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {signedIn && (
              <form action={logout}>
                <button className="text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
