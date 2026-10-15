"use client";

// Admin toggle for an artisan-posted job: is this a real vacancy (an artisan
// hiring) or a self-advert? Approved jobs are shown to Google as job postings;
// unapproved ones stay noindexed. See lib/job-seo.js.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VacancyApprovalButton({ jobId, approved }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/vacancy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !approved }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update.");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 text-xs">
      {approved ? (
        <span className="font-semibold text-green-700">✓ Real job — on Google</span>
      ) : (
        <span className="text-gray-500">Posted by an artisan — hidden from Google</span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`ml-2 rounded px-2 py-0.5 font-semibold ring-1 disabled:opacity-50 ${
          approved
            ? "text-gray-600 ring-gray-300 hover:bg-gray-50"
            : "bg-brand-600 text-white ring-brand-600 hover:bg-brand-700"
        }`}
      >
        {busy ? "…" : approved ? "Undo" : "Approve as real job"}
      </button>
      {error && <div className="mt-1 text-red-600">{error}</div>}
    </div>
  );
}
