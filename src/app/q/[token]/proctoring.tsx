"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

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

type Severity = "info" | "warn" | "danger";
type Toast = { id: number; message: string; severity: Severity };

export function Proctoring({ token }: { token: string }) {
  const blurCount = useRef(0);
  const tabHideCount = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [violations, setViolations] = useState(0);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const toastIdRef = useRef(0);
  const violationRef = useRef(0);

  const addToast = useCallback((message: string, severity: Severity) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, severity }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const flag = useCallback(
    (type: string, detail: string, severity: Severity = "warn", message?: string) => {
      logEvent({ token, type, detail });
      violationRef.current++;
      setViolations(violationRef.current);
      if (violationRef.current >= 8) setShowCriticalModal(true);
      if (message) addToast(message, severity);
    },
    [token, addToast]
  );

  useEffect(() => {
    const send = (type: string, detail: string) => logEvent({ token, type, detail });

    // ── Visibility ──────────────────────────────────────────────────────────
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        tabHideCount.current++;
        flag(
          "tab_hidden",
          `Tab hidden (count: ${tabHideCount.current})`,
          tabHideCount.current >= 3 ? "danger" : "warn",
          `Tab switch #${tabHideCount.current} recorded — this assessment is monitored.`
        );
      } else {
        send("tab_visible", "Returned to tab");
      }
    }

    // ── Window focus ────────────────────────────────────────────────────────
    function onBlur() {
      blurCount.current++;
      flag(
        "window_blur",
        `Window lost focus (count: ${blurCount.current})`,
        "warn",
        `Window focus lost (${blurCount.current}). Please stay on this page.`
      );
    }
    function onFocus() {
      send("window_focus", "Window regained focus");
    }

    // ── BLOCK copy ──────────────────────────────────────────────────────────
    function onCopy(e: ClipboardEvent) {
      const sel = window.getSelection()?.toString().trim() ?? "";
      if (sel.length > 0) {
        e.preventDefault();
        flag(
          "copy_attempt",
          `Copy blocked — ${sel.length} chars`,
          "danger",
          "Copying content is not allowed. This attempt has been recorded."
        );
      }
    }

    // ── BLOCK paste in answer fields ────────────────────────────────────────
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      if (tag === "TEXTAREA" || (tag === "INPUT" && (t as HTMLInputElement).type !== "hidden")) {
        e.preventDefault();
        flag(
          "paste_attempt",
          "Paste blocked in answer field",
          "danger",
          "Pasting is not allowed. All answers must be typed manually."
        );
      }
    }

    // ── BLOCK drag-drop into answer fields ──────────────────────────────────
    function onDrop(e: DragEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") {
        e.preventDefault();
        flag(
          "drag_drop_attempt",
          "Drag-drop blocked in answer field",
          "danger",
          "Drag and drop is not allowed in answer fields."
        );
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
      flag("right_click", `Right-click at (${e.clientX}, ${e.clientY})`, "warn");
    }

    // ── BLOCK / log keyboard shortcuts ─────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (key === "PrintScreen") {
        flag("print_screen", "PrintScreen key pressed", "danger", "Screenshots are not permitted during the assessment.");
        return;
      }
      if (ctrl && key === "p") {
        e.preventDefault();
        flag("print_attempt", "Print blocked (Ctrl+P)", "danger", "Printing is not permitted.");
        return;
      }
      if (ctrl && key === "s") {
        e.preventDefault();
        flag("save_attempt", "Save page blocked (Ctrl+S)", "warn");
        return;
      }
      if (ctrl && key === "u") {
        e.preventDefault();
        flag("view_source", "View source blocked (Ctrl+U)", "warn");
        return;
      }
      if (ctrl && shift && (key === "3" || key === "4" || key === "5")) {
        flag("screenshot_shortcut", `Mac screenshot: Cmd+Shift+${key}`, "danger", "Screenshots are not permitted.");
        return;
      }
      if (key === "S" && shift && e.getModifierState?.("Meta")) {
        flag("screenshot_shortcut", "Win+Shift+S screenshot blocked", "danger", "Screenshots are not permitted.");
        return;
      }
      if (
        key === "F12" ||
        (ctrl && shift && ["i", "I", "j", "J", "c", "C"].includes(key))
      ) {
        e.preventDefault();
        flag("devtools_attempt", `DevTools blocked: ${key}`, "danger", "Developer tools are not permitted during the assessment.");
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
        flag(
          "suspicious_input",
          `Suspicious large insertion: +${delta} chars`,
          "danger",
          `Suspicious input detected (+${delta} chars). Manual typing is required — do not use extensions.`
        );
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
          flag("mouse_left_window", "Mouse left browser viewport", "warn");
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Violation badge */}
      {violations > 0 && (
        <div className="fixed top-[68px] right-4 z-[200] flex items-center gap-2 rounded-full bg-red-600/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white shadow-xl border border-red-400/30 select-none">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-100" />
          </span>
          {violations} flag{violations !== 1 ? "s" : ""} recorded
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col-reverse gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up rounded-xl px-4 py-3 text-sm shadow-2xl backdrop-blur-sm border pointer-events-auto select-none ${
              t.severity === "danger"
                ? "bg-red-950/97 text-red-100 border-red-700/50 shadow-red-900/40"
                : t.severity === "warn"
                ? "bg-orange-950/97 text-orange-100 border-orange-700/50 shadow-orange-900/40"
                : "bg-neutral-900/97 text-neutral-100 border-neutral-700/50"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5 shrink-0">
                {t.severity === "danger" ? "🚫" : "⚠️"}
              </span>
              <span className="font-medium leading-snug">{t.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Critical violation modal */}
      {showCriticalModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-red-950 border border-red-700/60 p-7 shadow-2xl text-center space-y-4">
            <div className="text-4xl">🚨</div>
            <h2 className="text-xl font-bold text-red-200">Integrity Warning</h2>
            <p className="text-red-300 text-sm leading-relaxed">
              Multiple violations have been recorded during this assessment.
              Continued suspicious activity will result in automatic disqualification.
              All flags are reviewed by the hiring team.
            </p>
            <p className="text-red-400/70 text-xs">
              {violations} security events recorded so far.
            </p>
            <button
              onClick={() => setShowCriticalModal(false)}
              className="rounded-lg bg-red-700 hover:bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              I understand — continue assessment
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
