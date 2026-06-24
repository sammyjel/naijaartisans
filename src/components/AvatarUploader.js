"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

// Optional profile photo upload. Nothing here is required.
export default function AvatarUploader() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState(""); // "", uploading, error
  const [error, setError] = useState("");

  async function onChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setStatus("error");
        return;
      }
      setStatus("");
      refresh();
    } catch {
      setError("Network error.");
      setStatus("error");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">
        Profile picture <span className="text-sm font-normal text-gray-400">(optional)</span>
      </h2>
      <p className="mt-1 text-sm text-gray-500">A clear photo helps customers trust and choose you. You can skip this.</p>
      <div className="mt-4 flex items-center gap-4">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="Your photo" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700">
            {user?.name?.charAt(0) || "?"}
          </div>
        )}
        <label className="btn-outline cursor-pointer">
          {status === "uploading" ? "Uploading…" : user?.avatarUrl ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={status === "uploading"} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-gray-400">{error}</p>}
    </div>
  );
}
