"use client";

import { useState } from "react";

export default function AdminMessageForm({ jobId, to, defaultSubject, defaultBody }) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [state, setState] = useState({ busy: false, msg: "", ok: false });

  async function send(e) {
    e.preventDefault();
    setState({ busy: true, msg: "", ok: false });
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      setState({ busy: false, ok: res.ok, msg: res.ok ? `Sent to ${to} from NaijaArtisans.` : data.error || "Could not send." });
    } catch {
      setState({ busy: false, ok: false, msg: "Network error." });
    }
  }

  if (state.ok) return <div className="mt-6 rounded-lg bg-green-50 p-4 font-medium text-green-800">{state.msg}</div>;

  return (
    <form onSubmit={send} className="mt-6 space-y-4">
      <p className="text-sm text-gray-600">
        To: <strong>{to}</strong> · From: <strong>NaijaArtisans</strong> (your personal address is never shown)
      </p>
      <div>
        <label className="label">Subject</label>
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="input min-h-[260px]" value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-gray-500">
          A &ldquo;Reply to NaijaArtisans&rdquo; button is added at the bottom. It opens the site&apos;s contact form, which comes to you.
        </p>
      </div>
      {state.msg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.msg}</div>}
      <button className="btn-primary" disabled={state.busy}>{state.busy ? "Sending…" : "Send as NaijaArtisans"}</button>
    </form>
  );
}
