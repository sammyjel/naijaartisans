"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Owner controls on one done-for-you order: copy the brief for a freelancer,
// record who is doing it, post work, mark the deliverer paid, close the order.
export default function AdminOrderActions({ reference, status, fulfiller, forwardText }) {
  const router = useRouter();
  const [f, setF] = useState({ name: fulfiller.name, note: fulfiller.note, costNaira: fulfiller.costNaira });
  const [d, setD] = useState({ note: "", links: "" });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function act(action, body = {}) {
    if ((action === "cancel" || action === "refunded") && !confirm(`Mark this order ${action === "cancel" ? "cancelled" : "refunded"}?`)) return;
    setBusy(action);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed.");
      setMsg("✓ Saved");
      if (action === "deliver") setD({ note: "", links: "" });
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    }
    setBusy("");
  }

  const open = ["IN_PROGRESS", "AWAITING_BALANCE", "COMPLETED"].includes(status);
  const canDeliver = status === "IN_PROGRESS" || status === "COMPLETED";

  return (
    <div className="mt-6 space-y-6">
      {open && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">1. Send the job to someone</h2>
            <button
              className="btn-outline"
              onClick={() => { navigator.clipboard?.writeText(forwardText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            >
              {copied ? "✓ Copied" : "Copy brief for WhatsApp"}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">The copied brief has no customer contact details, so the job stays with you. Do it yourself? Put your own name.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input className="input" placeholder="Who is doing it" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="input" placeholder="Agreed pay (₦)" type="number" value={f.costNaira} onChange={(e) => setF({ ...f, costNaira: e.target.value })} />
            <input className="input" placeholder="Their WhatsApp / notes" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={Boolean(busy)} onClick={() => act("assign", f)}>{busy === "assign" ? "Saving…" : "Save deliverer"}</button>
            {fulfiller.name && !fulfiller.paidAt && (
              <button className="btn-outline" disabled={Boolean(busy)} onClick={() => act("fulfiller_paid")}>Mark deliverer paid</button>
            )}
            {fulfiller.paidAt && <span className="self-center text-sm text-green-700">✓ Deliverer paid</span>}
          </div>
        </div>
      )}

      {canDeliver && (
        <div className="card p-5">
          <h2 className="font-bold">{status === "COMPLETED" ? "3. Post the FINAL files" : "2. Post the work for the customer to review"}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {status === "COMPLETED"
              ? "Fully paid. Post the full-quality files (Google Drive / Dropbox links). The customer is emailed."
              : "Before the balance is paid, post PREVIEWS (watermarked or low-resolution) so the work can't be taken without paying. The customer is emailed and asked to approve and pay."}
          </p>
          <textarea className="input mt-3 min-h-[80px]" placeholder="Message to the customer (optional)" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
          <textarea className="input mt-2 min-h-[80px]" placeholder="File links, one per line (https://…)" value={d.links} onChange={(e) => setD({ ...d, links: e.target.value })} />
          <button className="btn-primary mt-2" disabled={Boolean(busy)} onClick={() => act("deliver", d)}>
            {busy === "deliver" ? "Posting…" : status === "COMPLETED" ? "Post final files" : "Post for review"}
          </button>
        </div>
      )}

      {!["CANCELLED", "REFUNDED", "COMPLETED"].includes(status) && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="btn-ghost text-red-600" disabled={Boolean(busy)} onClick={() => act("cancel")}>Cancel order</button>
          {status !== "AWAITING_DEPOSIT" && (
            <button className="btn-ghost text-red-600" disabled={Boolean(busy)} onClick={() => act("refunded")}>Mark refunded (refund it in Paystack first)</button>
          )}
        </div>
      )}
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
