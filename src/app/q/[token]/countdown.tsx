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
  const low = remaining < 5 * 60 * 1000;

  return (
    <div
      className={`rounded-md px-3 py-1.5 text-sm font-mono ${
        low
          ? "bg-red-900/60 text-red-200"
          : "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
      }`}
    >
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
