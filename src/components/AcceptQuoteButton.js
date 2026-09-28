"use client";

// "Accept this quote" — the customer's decision that starts a transaction.
//
// This is the only way a deal comes into existence, and it is deliberately a
// customer action. If an artisan could open a deal, they could also finish and
// count it, and the completed-jobs badge would be self-awarded.

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcceptQuoteButton({ quoteId, artisanName, price }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    const amount = price ? ` at ₦${Number(price).toLocaleString("en-NG")}` : "";
    if (!window.confirm(`Hire ${artisanName}${amount}? This starts the job and takes it off the open board.`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start the job.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button className="btn-primary w-full sm:w-auto" onClick={accept} disabled={busy}>
        {busy ? "Starting…" : `✅ Hire ${artisanName.split(" ")[0]}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
