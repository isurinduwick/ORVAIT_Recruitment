"use client";

import { useEffect, useState } from "react";

export function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState(`/q/${token}`);

  useEffect(() => {
    setLink(`${window.location.origin}/q/${token}`);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2 py-1 text-neutral-200"
      title={link}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
