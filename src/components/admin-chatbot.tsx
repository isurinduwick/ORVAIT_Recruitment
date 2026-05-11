"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Message = { role: "user" | "model"; content: string };

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900 dark:text-neutral-100">{part}</strong>
      : part
  );
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1.5" />);
    } else if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s/, "");
      nodes.push(
        <p key={i} className="font-semibold text-gray-900 dark:text-neutral-100 text-[13px] mt-1">
          {parseBold(content)}
        </p>
      );
    } else if (/^[-*•]\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="text-emerald-500 font-bold mt-px shrink-0 text-[11px]">•</span>
          <span className="text-[13px] leading-relaxed">{parseBold(line.replace(/^[-*•]\s/, ""))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        nodes.push(
          <div key={i} className="flex gap-2 items-start">
            <span className="text-emerald-500 font-semibold shrink-0 text-[12px] min-w-[16px]">{match[1]}.</span>
            <span className="text-[13px] leading-relaxed">{parseBold(match[2])}</span>
          </div>
        );
      }
    } else {
      nodes.push(
        <p key={i} className="text-[13px] leading-relaxed">
          {parseBold(line)}
        </p>
      );
    }
    i++;
  }
  return nodes;
}

const SUGGESTIONS = [
  "Who scored the highest overall?",
  "Who should I shortlist for each role?",
  "Show me all submitted candidates",
  "Which candidates have the best attitude scores?",
];

export function AdminChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "model", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const unread = !open && messages.filter((m) => m.role === "model").length;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-40 group">

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
          <div className="bg-gray-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
            Recruitment AI
            <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Open recruitment AI"
        >
          {/* Idle pulse ring */}
          {!open && (
            <span
              className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
              style={{ animationDuration: "2.5s" }}
            />
          )}

          {/* Slow orbit rings */}
          <span
            className="absolute inset-0 rounded-full border border-emerald-500/25 animate-spin"
            style={{ animationDuration: "9s" }}
          />
          <span
            className="absolute inset-[4px] rounded-full border border-violet-500/15 animate-spin"
            style={{ animationDuration: "6s", animationDirection: "reverse" }}
          />

          {/* Dark glass background */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-900 via-[#0c1a10] to-neutral-900 shadow-2xl shadow-emerald-500/20 group-hover:shadow-emerald-500/40 border border-emerald-500/20 group-hover:border-emerald-500/35 transition-all duration-300" />

          {/* Inner radial glow */}
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(16,185,129,0.15),transparent_65%)]" />

          {/* Icon */}
          <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
            {open ? (
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            )}
          </span>

          {/* Unread badge */}
          {!!unread && (
            <span className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white dark:ring-neutral-900">
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={`fixed bottom-[88px] right-6 z-40 w-[390px] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700/80 shadow-2xl shadow-black/15 overflow-hidden transition-all duration-300 origin-bottom-right ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            {/* Company logo + AI badge */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-sm">
                <Image src="/Logo.png" alt="Company logo" width={28} height={28} className="object-contain" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-white dark:border-neutral-900">
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-neutral-100 leading-none">Recruitment AI</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Powered by Groq · Live data</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="space-y-5 pt-2">
              {/* Welcome */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 border border-emerald-400/20 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-neutral-200">Hi, I'm your Recruitment AI</p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 leading-relaxed max-w-[260px] mx-auto">
                  Ask me anything about your candidates, scores, or hiring decisions.
                </p>
              </div>

              {/* Suggested questions */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-neutral-600 uppercase tracking-widest px-0.5">Suggested</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-emerald-400/50 dark:hover:border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-xs font-medium text-gray-600 dark:text-neutral-300 transition-all duration-150 group"
                  >
                    <span className="text-emerald-500 mr-1.5 group-hover:mr-2 transition-all">›</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) =>
                m.role === "user" ? (
                  /* User bubble — right-aligned, compact */
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[75%] bg-emerald-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm shadow-emerald-500/20">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  /* AI message — full width, left-aligned with markdown */
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-500/30">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 bg-gray-50 dark:bg-neutral-800/60 rounded-2xl rounded-tl-sm px-3.5 py-3 border border-gray-100 dark:border-neutral-700/50 text-gray-700 dark:text-neutral-300 space-y-0.5">
                      {renderContent(m.content)}
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-neutral-500 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-neutral-800 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about candidates…"
              disabled={loading}
              className="flex-1 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-neutral-600 disabled:opacity-50 transition-shadow"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 transition-all hover:shadow-emerald-500/40 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-gray-400 dark:text-neutral-600 text-center mt-2">
            Reads live data · Responses may not be perfect
          </p>
        </div>
      </div>
    </>
  );
}
