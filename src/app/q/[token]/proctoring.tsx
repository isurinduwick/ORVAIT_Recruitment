"use client";

import { useEffect, useRef } from "react";

type EventPayload = { token: string; type: string; detail: string };

async function logEvent(payload: EventPayload) {
  try {
    await fetch("/api/proctor-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // silent — never break the assessment
  }
}

export function Proctoring({ token }: { token: string }) {
  const blurCount = useRef(0);
  const tabHideCount = useRef(0);

  useEffect(() => {
    const send = (type: string, detail: string) =>
      logEvent({ token, type, detail });

    // ── Tab / window visibility ──────────────────────────────────────────
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        tabHideCount.current++;
        send("tab_hidden", `Tab hidden (count: ${tabHideCount.current})`);
      } else {
        send("tab_visible", `Returned to tab`);
      }
    }

    // ── Window focus/blur (switch app) ───────────────────────────────────
    function onBlur() {
      blurCount.current++;
      send("window_blur", `Window lost focus (count: ${blurCount.current})`);
    }
    function onFocus() {
      send("window_focus", "Window regained focus");
    }

    // ── Keyboard shortcuts ────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // PrintScreen
      if (key === "PrintScreen") {
        send("print_screen", "PrintScreen key pressed");
        return;
      }
      // Ctrl/Cmd + C (copy)
      if (ctrl && key === "c") {
        const sel = window.getSelection()?.toString() || "";
        if (sel.length > 0) {
          send("copy_attempt", `Copied text (${sel.length} chars)`);
        }
        return;
      }
      // Ctrl/Cmd + V (paste)
      if (ctrl && key === "v") {
        send("paste_attempt", "Paste shortcut used");
        return;
      }
      // Ctrl/Cmd + P (print)
      if (ctrl && key === "p") {
        e.preventDefault();
        send("print_attempt", "Print shortcut used (Ctrl/Cmd+P)");
        return;
      }
      // Mac screenshot shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (ctrl && shift && (key === "3" || key === "4" || key === "5")) {
        send("screenshot_shortcut", `Mac screenshot shortcut: Cmd+Shift+${key}`);
        return;
      }
      // Win+Shift+S
      if (e.key === "S" && shift && e.getModifierState?.("Meta")) {
        send("screenshot_shortcut", "Windows screenshot shortcut: Win+Shift+S");
        return;
      }
      // DevTools: F12 or Ctrl+Shift+I/J
      if (key === "F12" || (ctrl && shift && (key === "i" || key === "I" || key === "j" || key === "J"))) {
        send("devtools_attempt", `DevTools shortcut: ${ctrl ? "Ctrl+" : ""}${shift ? "Shift+" : ""}${key}`);
        return;
      }
    }

    // ── Right click ───────────────────────────────────────────────────────
    function onContextMenu(e: MouseEvent) {
      send("right_click", `Right-click at (${e.clientX}, ${e.clientY})`);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [token]);

  return null; // invisible component
}
