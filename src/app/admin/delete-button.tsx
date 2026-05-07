"use client";

import { useRef } from "react";
import { deleteCandidate } from "./actions";

export function DeleteCandidateButton({ id, name }: { id: string; name: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm(`Delete "${name}"? This will permanently remove the candidate and all their responses.`)) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={deleteCandidate}>
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        onClick={handleClick}
        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
        title="Delete candidate"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </form>
  );
}
