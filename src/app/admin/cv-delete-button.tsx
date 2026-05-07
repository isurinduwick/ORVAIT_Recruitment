"use client";

import { useRef } from "react";
import { deleteCV } from "./actions";

export function CVDeleteButton({ id, cvPath }: { id: string; cvPath: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm("Remove this CV? This cannot be undone.")) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={deleteCV}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cv_path" value={cvPath} />
      <button
        type="button"
        onClick={handleClick}
        className="text-xs text-red-400 hover:text-red-300"
      >
        Remove CV
      </button>
    </form>
  );
}
