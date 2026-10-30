"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Verify / decline / suspend buttons for one row of /admin/artisans.
export default function AdminArtisanActions({ id, verified, suspended, requested }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function act(action) {
    let reason;
    if (action === "suspend") {
      reason = prompt("Why are you suspending this artisan? (for your records)");
      if (reason === null) return;
    }
    if (action === "decline") {
      reason = prompt("Tell the artisan why (they will see this), e.g. \"The photos don't show your own work.\"");
      if (reason === null) return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/artisans/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed.");
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {!suspended && (verified
        ? <button className="btn-ghost text-xs" disabled={busy} onClick={() => act("unverify")}>Remove ✓</button>
        : <button className="btn-primary px-3 py-1 text-xs" disabled={busy} onClick={() => act("verify")}>✓ Verify</button>)}
      {!suspended && !verified && requested && (
        <button className="btn-outline px-3 py-1 text-xs" disabled={busy} onClick={() => act("decline")}>Decline</button>
      )}
      {suspended
        ? <button className="btn-outline px-3 py-1 text-xs" disabled={busy} onClick={() => act("unsuspend")}>Unsuspend</button>
        : <button className="btn-ghost text-xs text-red-600" disabled={busy} onClick={() => act("suspend")}>Suspend</button>}
      {msg && <span className="w-full text-right text-xs text-red-600">{msg}</span>}
    </div>
  );
}
