"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "./actions";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200"
        title="Admin account"
      >
        A
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-gray-200/60 dark:border-neutral-700/60 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                A
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-neutral-100">Administrator</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-500">ORVAIT Recruitment</p>
              </div>
            </div>
          </div>
          <div className="p-1">
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
