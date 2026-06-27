"use client";

import { useEffect, useState } from "react";

const MAX_PHOTOS = 12;

// Optional gallery of an artisan's past work. Nothing here is required.
export default function PortfolioUploader() {
  const [urls, setUrls] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState(""); // "", uploading
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me/gallery")
      .then((r) => r.json())
      .then((d) => setUrls(d.urls || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function onAdd(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");
    setStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/gallery", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      setUrls(data.urls || []);
    } catch {
      setError("Network error.");
    } finally {
      setStatus("");
    }
  }

  async function onRemove(url) {
    if (!confirm("Remove this photo?")) return;
    setError("");
    const prev = urls;
    setUrls((u) => u.filter((x) => x !== url)); // optimistic
    try {
      const res = await fetch("/api/me/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUrls(prev); // revert
        setError(data.error || "Could not remove photo.");
        return;
      }
      setUrls(data.urls || []);
    } catch {
      setUrls(prev);
      setError("Network error.");
    }
  }

  const full = urls.length >= MAX_PHOTOS;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">
        Work photos <span className="text-sm font-normal text-gray-400">(optional)</span>
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Show off past jobs — finished work wins customers. Add up to {MAX_PHOTOS} photos. You can skip this.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {urls.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Past work" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}

        {!full && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-200 text-center text-sm text-gray-400 transition hover:border-brand-300 hover:text-brand-600">
            {status === "uploading" ? "Uploading…" : (<span>＋<br />Add photo</span>)}
            <input type="file" accept="image/*" className="hidden" onChange={onAdd} disabled={status === "uploading"} />
          </label>
        )}
      </div>

      {loaded && urls.length === 0 && status !== "uploading" && (
        <p className="mt-3 text-xs text-gray-400">No work photos yet — add a few to stand out.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
