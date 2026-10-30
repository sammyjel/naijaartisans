"use client";

import { useEffect, useState } from "react";

const NEVER_ASK = "NaijaArtisans will never ask you for money, BVN, OTP, PIN or bank details — not on WhatsApp, by phone or by email. If anyone does, it isn't us.";

// Dashboard card: the artisan asks to be verified here, on the site, instead of
// being messaged by a stranger. See src/lib/verification.js.
export default function VerificationCard() {
  const [v, setV] = useState(null);
  const [area, setArea] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    return fetch("/api/me/verification").then((r) => r.json()).then((d) => { setV(d); if (d?.area) setArea(d.area); }).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your request.");
      setV(data);
    } catch (err) {
      setError(err.message);
      load(); // photos may have been added since the page loaded
    }
    setBusy(false);
  }

  if (!v || v.error) return null;

  if (v.status === "verified") {
    return (
      <div className="card border-green-200 bg-green-50 p-5">
        <h2 className="font-bold text-green-800">✓ You are verified</h2>
        <p className="mt-1 text-sm text-green-800">Customers see the Verified badge on your profile and in search results.</p>
      </div>
    );
  }

  if (v.status === "pending") {
    return (
      <div className="card border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-900">⏳ Verification request received</h2>
        <p className="mt-1 text-sm text-amber-900">
          We're reviewing your profile and work photos. You'll get a notification and an email when it's done, usually within 2 working days.
        </p>
        <p className="mt-2 text-xs text-amber-800">{NEVER_ASK}</p>
      </div>
    );
  }

  return (
    <div className="card border-brand-200 p-5">
      <h2 className="text-lg font-bold">🛡️ Get your free ✓ Verified badge</h2>
      <p className="mt-1 text-sm text-gray-600">
        For everyone's security, we're verifying every artisan on NaijaArtisans to keep fraudsters off the site. Verified artisans
        show a badge customers trust. It's free and takes two minutes, all here on the website.
      </p>
      {v.status === "declined" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Your last request wasn't approved: {v.declinedReason} Fix this and send it again.
        </p>
      )}

      <ul className="mt-3 space-y-1 text-sm">
        {v.missing.length === 0
          ? <li className="text-green-700">✓ Phone number, service listing and {v.minPhotos}+ work photos: all done</li>
          : v.missing.map((m) => <li key={m} className="text-red-600">• {m}</li>)}
      </ul>
      {v.photoCount < v.minPhotos && (
        <a href="#photos" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">Add work photos below ↓</a>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          className="input"
          placeholder="Area you work in, e.g. Ikeja, Lekki, Surulere"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          maxLength={120}
        />
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>I confirm my name, trade and area are true and the photos on my profile are of my own work.</span>
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Request verification"}</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="mt-3 text-xs text-gray-500">{NEVER_ASK}</p>
    </div>
  );
}
