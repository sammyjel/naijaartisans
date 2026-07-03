"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(""); // "", sending, sent
  const [error, setError] = useState("");

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("");
        return;
      }
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setError("Network error. Please try again.");
      setStatus("");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg bg-brand-50 px-4 py-6 text-center text-brand-800">
        ✅ Thank you — your message has been sent. We'll get back to you soon.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label">Your name</label>
        <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
      </div>
      <div>
        <label className="label">Your email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="input" rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} required />
      </div>
      <button className="btn-primary w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
