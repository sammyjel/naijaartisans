"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// What the customer can do on their order page: pay what is owed, or ask for
// changes on delivered work. Authorised by the token in their tracking link.
export default function DfyOrderActions({ reference, token, status, depositLabel, balanceLabel, canRevise, revisionsLeft }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [showRevise, setShowRevise] = useState(false);
  const [sent, setSent] = useState(false);

  async function act(action, extra = {}) {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/dfy/orders/${reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (data.authorization_url) { window.location.href = data.authorization_url; return; }
      if (action === "revision") setSent(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
    setBusy("");
  }

  if (status === "AWAITING_DEPOSIT") {
    return (
      <div className="mt-5">
        <button className="btn-primary" disabled={Boolean(busy)} onClick={() => act("pay")}>
          {busy ? "Opening Paystack…" : `Pay ${depositLabel} deposit to start`}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (status !== "AWAITING_BALANCE") return null;

  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <p className="text-sm text-gray-700">Your work is ready — see it below. Happy with it?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={Boolean(busy)} onClick={() => act("pay")}>
          {busy === "pay" ? "Opening Paystack…" : `Approve and pay ${balanceLabel}`}
        </button>
        {canRevise && !sent && (
          <button className="btn-outline" disabled={Boolean(busy)} onClick={() => setShowRevise(!showRevise)}>
            Ask for changes ({revisionsLeft} left)
          </button>
        )}
      </div>
      {showRevise && !sent && (
        <div className="mt-3">
          <textarea
            className="input min-h-[96px]"
            placeholder="Tell us exactly what to change, e.g. 'make the logo text bigger and use dark green'"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn-primary mt-2" disabled={Boolean(busy)} onClick={() => act("revision", { note })}>
            {busy === "revision" ? "Sending…" : "Send my changes"}
          </button>
        </div>
      )}
      {sent && <p className="mt-3 text-sm text-brand-700">✓ Got it — we're making your changes and will email you when they're ready.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
