"use client";

import { useEffect, useRef, useCallback } from "react";

type EventPayload = { token: string; type: string; detail: string };

async function logEvent(payload: EventPayload) {
  try {
    const res = await fetch("/api/proctor-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (process.env.NODE_ENV === "development") {
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        console.warn("[proctoring] event not saved:", payload.type, json);
      }
    }
  } catch (err) {
    // silent — never break the assessment
    if (process.env.NODE_ENV === "development") {
      console.warn("[proctoring] fetch failed:", payload.type, err);
    }
  }
}

export function Proctoring({ token }: { token: string }) {
  const blurCount = useRef(0);
  const tabHideCount = useRef(0);

  const flag = useCallback(
    (type: string, detail: string) => {
      logEvent({ token, type, detail });
    },
    [token]
  );

  useEffect(() => {
    const send = (type: string, detail: string) => logEvent({ token, type, detail });

    // ── Visibility ──────────────────────────────────────────────────────────
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        tabHideCount.current++;
        flag("tab_hidden", `Tab hidden (count: ${tabHideCount.current})`);
      } else {
        send("tab_visible", "Returned to tab");
      }
    }

    // ── Window focus ────────────────────────────────────────────────────────
    function onBlur() {
      blurCount.current++;
      flag("window_blur", `Window lost focus (count: ${blurCount.current})`);
    }
    function onFocus() {
      send("window_focus", "Window regained focus");
    }

    // ── BLOCK copy ──────────────────────────────────────────────────────────
    function onCopy(e: ClipboardEvent) {
      const sel = window.getSelection()?.toString().trim() ?? "";
      if (sel.length > 0) {
        e.preventDefault();
        flag("copy_attempt", `Copy blocked — ${sel.length} chars`);
      }
    }

    // ── BLOCK paste in answer fields ────────────────────────────────────────
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      if (tag === "TEXTAREA" || (tag === "INPUT" && (t as HTMLInputElement).type !== "hidden")) {
        e.preventDefault();
        flag("paste_attempt", "Paste blocked in answer field");
      }
    }

    // ── BLOCK drag-drop into answer fields ──────────────────────────────────
    function onDrop(e: DragEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") {
        e.preventDefault();
        flag("drag_drop_attempt", "Drag-drop blocked in answer field");
      }
    }
    function onDragOver(e: DragEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") {
        e.preventDefault();
      }
    }

    // ── BLOCK right-click ──────────────────────────────────────────────────
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      flag("right_click", `Right-click at (${e.clientX}, ${e.clientY})`);
    }

    // ── BLOCK / log keyboard shortcuts ─────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (key === "PrintScreen") {
        flag("print_screen", "PrintScreen key pressed");
        return;
      }
      if (ctrl && key === "p") {
        e.preventDefault();
        flag("print_attempt", "Print blocked (Ctrl+P)");
        return;
      }
      if (ctrl && key === "s") {
        e.preventDefault();
        flag("save_attempt", "Save page blocked (Ctrl+S)");
        return;
      }
      if (ctrl && key === "u") {
        e.preventDefault();
        flag("view_source", "View source blocked (Ctrl+U)");
        return;
      }
      if (ctrl && shift && (key === "3" || key === "4" || key === "5")) {
        flag("screenshot_shortcut", `Mac screenshot: Cmd+Shift+${key}`);
        return;
      }
      if (key === "S" && shift && e.getModifierState?.("Meta")) {
        flag("screenshot_shortcut", "Win+Shift+S screenshot blocked");
        return;
      }
      if (
        key === "F12" ||
        (ctrl && shift && ["i", "I", "j", "J", "c", "C"].includes(key))
      ) {
        e.preventDefault();
        flag("devtools_attempt", `DevTools blocked: ${key}`);
        return;
      }
    }

    // ── Detect suspicious large text insertion (clipboard extension bypass) ─
    const areaLens = new Map<EventTarget, number>();
    function onInput(e: Event) {
      const t = e.target as HTMLTextAreaElement;
      if (t.tagName !== "TEXTAREA") return;
      const prev = areaLens.get(t) ?? 0;
      const curr = t.value.length;
      areaLens.set(t, curr);
      const delta = curr - prev;
      if (delta > 80) {
        flag("suspicious_input", `Suspicious large insertion: +${delta} chars`);
      }
    }

    // ── Mouse leaving viewport ─────────────────────────────────────────────
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    function onMouseLeave(e: MouseEvent) {
      const outside =
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight;
      if (outside) {
        leaveTimer = setTimeout(() => {
          flag("mouse_left_window", "Mouse left browser viewport");
        }, 800);
      }
    }
    function onMouseEnter() {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("drop", onDrop, true);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("drop", onDrop, true);
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [token, flag]);

  return null;
}
