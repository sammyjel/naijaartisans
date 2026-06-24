"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "Artisans near me" — captures the visitor's location and adds lat/lng to the
// Browse URL so the server can sort results by distance. baseParams are the
// non-geo filters (category/city/q) to preserve.
export default function NearMeButton({ baseParams = {}, active = false }) {
  const router = useRouter();
  const [status, setStatus] = useState("");

  function base() {
    const sp = new URLSearchParams();
    Object.entries(baseParams).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    return sp;
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sp = base();
        sp.set("lat", pos.coords.latitude.toFixed(6));
        sp.set("lng", pos.coords.longitude.toFixed(6));
        router.push(`/browse?${sp.toString()}`);
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clear() {
    const qs = base().toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  }

  if (active) {
    return (
      <button onClick={clear} className="btn-primary whitespace-nowrap">
        📍 Nearest to you ✓ — clear
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={locate} className="btn-outline whitespace-nowrap">
        {status === "locating" ? "Locating…" : "📍 Artisans near me"}
      </button>
      {status === "error" && <span className="text-xs text-gray-400">Couldn’t get your location</span>}
    </div>
  );
}
