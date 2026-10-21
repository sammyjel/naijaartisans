"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { looksIncompleteNG, phoneProblem } from "@/lib/phone";

// Lets a member see and correct their phone number — the number customers and
// artisans use to reach them once a job is agreed.
export default function PhoneEditor() {
  const { user, refresh } = useAuth();
  const current = user?.phone || "";
  const [phone, setPhone] = useState(current);
  const [status, setStatus] = useState(""); // "", "saving", "ok"
  const [error, setError] = useState("");

  const broken = !current || looksIncompleteNG(current);

  async function save(e) {
    e.preventDefault();
    const problem = phoneProblem(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your number.");
      setStatus("ok");
      refresh();
    } catch (err) {
      setStatus("");
      setError(err.message);
    }
  }

  return (
    <div className={`card p-6 ${broken ? "ring-2 ring-amber-300" : ""}`}>
      <h2 className="text-lg font-bold">📞 Your phone number</h2>
      <p className="mt-1 text-sm text-gray-500">
        {!current
          ? "Add a number so the people you work with can call or WhatsApp you."
          : broken
          ? "⚠ This number looks incomplete, so nobody can reach you on it. Please correct it."
          : "This is the number people you agree a job with will use to reach you."}
      </p>
      <form onSubmit={save} className="mt-3 flex flex-wrap gap-2">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setStatus("");
          }}
          placeholder="0803 123 4567"
          className="input max-w-xs"
          aria-label="Phone number"
        />
        <button type="submit" className="btn-primary" disabled={status === "saving" || phone.trim() === current}>
          {status === "saving" ? "Saving…" : status === "ok" ? "✓ Saved" : "Save number"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
