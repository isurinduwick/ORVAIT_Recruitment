"use client";

import { useEffect, useState } from "react";

export function Countdown({ expiresAtMs }: { expiresAtMs: number }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, expiresAtMs - Date.now())
  );

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, expiresAtMs - Date.now());
      setRemaining(r);
      if (r === 0) {
        const form = document.getElementById("qform") as HTMLFormElement | null;
        form?.requestSubmit();
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [expiresAtMs]);

  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const critical = remaining < 2 * 60 * 1000;   // < 2 min: red + pulse
  const low = remaining < 5 * 60 * 1000;         // < 5 min: amber

  if (remaining === 0) {
    return (
      <div className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white tracking-widest uppercase select-none">
        Time&apos;s up
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 select-none transition-colors ${
        critical
          ? "bg-red-950 border border-red-700/60"
          : low
          ? "bg-amber-950 border border-amber-700/50"
          : "bg-neutral-800/80 border border-neutral-700/50"
      }`}
    >
      {critical && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-300" />
        </span>
      )}
      <span
        className={`text-sm font-mono font-semibold tabular-nums ${
          critical ? "text-red-300" : low ? "text-amber-300" : "text-neutral-200"
        }`}
      >
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      {low && !critical && (
        <span className="text-xs text-amber-500/70 hidden sm:inline">left</span>
      )}
    </div>
  );
}
