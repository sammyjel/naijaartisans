"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

// Lets a logged-in member capture/update their location from the dashboard.
export default function LocationUpdater() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState(""); // "", "locating", "saving", "ok", "error"
  const hasLocation = user && user.latitude != null && user.longitude != null;

  function save() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("saving");
        try {
          const res = await fetch("/api/me/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          });
          if (!res.ok) {
            setStatus("error");
            return;
          }
          setStatus("ok");
          refresh();
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">📍 Your location</h2>
      <p className="mt-1 text-sm text-gray-500">
        {hasLocation
          ? "Your location is set — customers searching “near me” can find you."
          : "Add your location so customers nearby can find you when they search “artisans near me”."}
      </p>
      <button onClick={save} className={`mt-3 ${hasLocation ? "btn-outline" : "btn-primary"}`} disabled={status === "locating" || status === "saving"}>
        {status === "locating"
          ? "Locating…"
          : status === "saving"
          ? "Saving…"
          : status === "ok"
          ? "✓ Location saved"
          : hasLocation
          ? "Update my location"
          : "📍 Use my current location"}
      </button>
      {status === "error" && (
        <p className="mt-2 text-xs text-gray-400">Couldn’t get your location. Please allow location access and try again.</p>
      )}
    </div>
  );
}
