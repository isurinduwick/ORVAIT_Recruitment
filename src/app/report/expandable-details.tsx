"use client";

import { useState } from "react";

export function ExpandableDetails({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-600 bg-transparent hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800/40 px-6 py-5 transition-colors group"
      >
        <span className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700 transition-colors">
            <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold text-gray-800 dark:text-neutral-100">
              {open ? "Hide assessment details" : "View assessment details"}
            </span>
            <span className="block text-xs mt-0.5">
              <span className="text-emerald-500">Scores</span>
              <span className="text-gray-400 dark:text-neutral-500"> · </span>
              <span className="text-blue-400">Knowledge breakdown</span>
              <span className="text-gray-400 dark:text-neutral-500"> · </span>
              <span className="text-amber-400">Attitude analysis</span>
            </span>
          </span>
        </span>
        <span className={`flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700 transition-all duration-200 ${open ? "rotate-180" : ""}`}>
          <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-6 space-y-10">
          {children}
        </div>
      )}
    </div>
  );
}
