"use client";

import { useState, useRef, useEffect } from "react";

export type FlagEvent = {
  event_type: string;
  detail: string | null;
  occurred_at: string;
};

const EVENT_META: Record<string, { label: string; color: string; severity: "high" | "med" | "low" }> = {
  copy_attempt:        { label: "Copy blocked",       color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  paste_attempt:       { label: "Paste blocked",      color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  drag_drop_attempt:   { label: "Drag-drop blocked",  color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  suspicious_input:    { label: "Suspicious input",   color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  print_screen:        { label: "Print Screen",       color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  screenshot_shortcut: { label: "Screenshot key",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  devtools_attempt:    { label: "DevTools",            color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",         severity: "high" },
  print_attempt:       { label: "Print blocked",      color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", severity: "med" },
  view_source:         { label: "View source",        color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", severity: "med" },
  save_attempt:        { label: "Save page",          color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", severity: "med" },
  tab_hidden:          { label: "Tab switch",         color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", severity: "med" },
  window_blur:         { label: "Window left",        color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", severity: "med" },
  mouse_left_window:   { label: "Left viewport",      color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300", severity: "low" },
  right_click:         { label: "Right click",        color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300", severity: "low" },
};

export function FlagPopover({ flags, events }: { flags: number; events: FlagEvent[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const highCount = events.filter((e) => (EVENT_META[e.event_type]?.severity ?? "low") === "high").length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => flags > 0 && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all select-none ${
          flags >= 5
            ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
            : flags > 0
            ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60"
            : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400"
        } ${flags > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
        </svg>
        {flags} Flag{flags !== 1 ? "s" : ""}
        {flags > 0 && (
          <svg
            className={`w-2.5 h-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-80 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl shadow-black/30 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 dark:bg-neutral-800/80 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <svg className={`w-3.5 h-3.5 ${flags >= 5 ? "text-red-500" : "text-orange-500"}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
              </svg>
              <span className={`text-xs font-bold ${flags >= 5 ? "text-red-500" : "text-orange-500"}`}>
                {flags} flag{flags !== 1 ? "s" : ""} recorded
              </span>
              {highCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  {highCount} high risk
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Event list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-neutral-800">
            {events.map((ev, i) => {
              const meta = EVENT_META[ev.event_type] ?? {
                label: ev.event_type,
                color: "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400",
                severity: "low" as const,
              };
              return (
                <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800/60 transition-colors">
                  <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 ${meta.color}`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {ev.detail && (
                      <p className="text-xs text-gray-600 dark:text-neutral-300 leading-snug">{ev.detail}</p>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-neutral-600 font-mono">
                      {new Date(ev.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-3.5 py-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30">
            <p className="text-[10px] text-gray-400 dark:text-neutral-600">
              Full timeline available in candidate review →
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
