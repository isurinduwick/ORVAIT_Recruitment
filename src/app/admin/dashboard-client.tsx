"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateRoleModal, type Question } from "./create-role-modal";
import { EditRoleModal } from "./edit-role-modal";
import { DeleteJobRoleButton } from "./delete-role-button";

export type RoleData = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  questionCount: number;
  questions: Question[];
  stats: {
    total: number;
    submitted: number;
    shortlisted: number;
    in_progress: number;
  };
};

type Props = {
  roles: RoleData[];
};

export function DashboardClient({ roles }: Props) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);

  const filtered = search.trim()
    ? roles.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description?.toLowerCase().includes(search.toLowerCase())
      )
    : roles;

  return (
    <>
      {showModal && <CreateRoleModal onClose={() => setShowModal(false)} />}
      {editingRole && (
        <EditRoleModal role={editingRole} onClose={() => setEditingRole(null)} />
      )}

      <div className="space-y-8">
        {/* Top bar: create button */}
        <div className="flex items-center justify-end gap-4 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-emerald-400/60 dark:hover:border-emerald-600/60 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-neutral-200 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-200"
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-sm">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            Create
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job roles…"
            className="w-full rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm placeholder:text-gray-400 dark:placeholder:text-neutral-600 transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-gray-500 dark:text-neutral-400 hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
            Job Roles &middot; {filtered.length}
            {search && ` of ${roles.length}`}
          </p>
        </div>

        {/* Empty state — no roles at all */}
        {roles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-neutral-800 py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/5">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-neutral-100 mb-2">No job roles yet</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-500 mb-8 max-w-sm leading-relaxed">
              Get started by creating your first job role. You can add assessment questions and invite candidates to each role.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white px-6 py-3 text-sm font-bold shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create your first role
            </button>
          </div>
        )}

        {/* No search results */}
        {roles.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800 py-14 text-center">
            <svg className="w-8 h-8 text-gray-300 dark:text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">No roles match &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="mt-2 text-xs text-emerald-500 hover:text-emerald-400">
              Clear search
            </button>
          </div>
        )}

        {/* Role cards */}
        {filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((role) => {
              const submitRate = role.stats.total > 0
                ? Math.round((role.stats.submitted / role.stats.total) * 100)
                : 0;
              return (
                <div
                  key={role.id}
                  className="group relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-emerald-400/50 dark:hover:border-emerald-600/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
                >
                  {/* Top glow accent on hover */}
                  <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />

                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-snug truncate">{role.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {role.description ?? <span className="italic text-gray-300 dark:text-neutral-700">No description</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingRole(role)}
                        className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit role"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <DeleteJobRoleButton id={role.id} title={role.title} />
                    </div>
                  </div>

                  {/* Question count badge */}
                  {role.questionCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                      <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                        {role.questionCount} question{role.questionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Invited" value={role.stats.total} color="neutral" />
                    <MiniStat label="Done" value={role.stats.submitted} color="amber" />
                    <MiniStat label="Listed" value={role.stats.shortlisted} color="emerald" />
                  </div>

                  {/* Progress bar */}
                  {role.stats.total > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-neutral-600 mb-1.5">
                        <span>Submission rate</span>
                        <span className="font-semibold">{submitRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${submitRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA button */}
                  <Link
                    href={`/admin/roles/${role.id}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 dark:border-emerald-600/30 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold py-2.5 transition-colors"
                  >
                    View Candidates
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: "neutral" | "amber" | "emerald" }) {
  const bg = { neutral: "bg-gray-50 dark:bg-neutral-800", amber: "bg-amber-50 dark:bg-amber-900/10", emerald: "bg-emerald-50 dark:bg-emerald-900/10" };
  const text = { neutral: "text-gray-800 dark:text-neutral-100", amber: "text-amber-600 dark:text-amber-400", emerald: "text-emerald-600 dark:text-emerald-400" };
  return (
    <div className={`rounded-xl py-2.5 ${bg[color]}`}>
      <p className={`text-lg font-bold ${text[color]}`}>{value}</p>
      <p className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
