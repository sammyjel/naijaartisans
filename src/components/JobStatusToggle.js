"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Owner-only control to close / reopen a job. Server already verified ownership.
export default function JobStatusToggle({ jobId, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next) {
    setBusy(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
      {status === "OPEN" ? (
        <button onClick={() => setStatus("CLOSED")} disabled={busy} className="btn-outline">
          {busy ? "Saving…" : "Mark as closed"}
        </button>
      ) : (
        <button onClick={() => setStatus("OPEN")} disabled={busy} className="btn-outline">
          {busy ? "Saving…" : "Reopen job"}
        </button>
      )}
    </div>
  );
}
