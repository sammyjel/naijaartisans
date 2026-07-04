"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const GREETING = "👋 Hi! I'm the NaijaArtisans assistant. I can help you find an artisan, post a job, or join as an artisan. What do you need?";
const SUGGESTIONS = [
  "Find a plumber near me",
  "How much does AC servicing cost?",
  "How do I join as an artisan?",
  "Is it free to post a job?",
];

// Render markdown-style [label](/path) links inside assistant text.
function renderText(text) {
  const parts = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const label = m[1];
    const href = m[2];
    if (href.startsWith("/")) {
      parts.push(
        <Link key={i++} href={href} className="font-semibold text-brand-700 underline">{label}</Link>
      );
    } else {
      parts.push(
        <a key={i++} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">{label}</a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Inline WhatsApp capture shown when the assistant invites contact.
function LeadInline({ side, onDone }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setErr("Please enter your name.");
    if (whatsapp.replace(/\D/g, "").length < 7) return setErr("Enter a valid WhatsApp number.");
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, side, source: "chatbot", magnet: "chatbot" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Something went wrong. Try again.");
        return;
      }
      onDone(name.trim().split(" ")[0]);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3">
      <p className="text-sm font-semibold text-brand-800">📩 Leave your WhatsApp and we&apos;ll reach you</p>
      <form onSubmit={submit} className="mt-2 space-y-2">
        {err && <p className="text-xs text-red-600">{err}</p>}
        <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" placeholder="WhatsApp number" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send my details"}
        </button>
      </form>
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [capture, setCapture] = useState(null); // { side } when the bot invites a WhatsApp capture
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send only role/content pairs the API expects.
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json().catch(() => ({}));
      let reply = data.reply || "Sorry, I couldn't answer that. Try [posting a job free](/post-job).";
      const mk = reply.match(/\[\[LEAD:(customer|artisan)\]\]/i);
      let side = null;
      if (mk) { side = mk[1].toUpperCase(); reply = reply.replace(mk[0], "").trim(); }
      setMessages((cur) => [...cur, { role: "assistant", content: reply }]);
      if (side) setCapture({ side });
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", content: "Network hiccup 😅 — please try again, or [post a job free](/post-job)." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-2xl text-white shadow-lg transition hover:bg-brand-700"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center gap-3 bg-brand-700 px-4 py-3 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg">🛠️</span>
            <div>
              <p className="text-sm font-bold leading-tight">NaijaArtisans Assistant</p>
              <p className="text-xs text-brand-100">Ask me anything about hiring or joining</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {m.role === "assistant" ? renderText(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                  typing…
                </div>
              </div>
            )}
            {capture && !loading && (
              <LeadInline
                side={capture.side}
                onDone={(first) => {
                  setCapture(null);
                  setMessages((cur) => [
                    ...cur,
                    { role: "assistant", content: `✅ Got it${first ? ", " + first : ""}! We'll reach you on WhatsApp shortly. Meanwhile, you can [post a job free](/post-job) or [browse artisans](/browse).` },
                  ]);
                }}
              />
            )}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs text-brand-700 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-gray-200 bg-white p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white disabled:opacity-40"
              aria-label="Send"
            >
              ➤
            </button>
          </form>
          <p className="pb-2 text-center text-[10px] text-gray-400">AI can make mistakes — never share passwords or OTPs.</p>
        </div>
      )}
    </>
  );
}
