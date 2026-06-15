"use client";

import { useEffect } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

// Renders a Google AdSense unit. Renders NOTHING until you set
// NEXT_PUBLIC_ADSENSE_CLIENT (and pass a real slot id), so it's safe
// to place anywhere before AdSense is approved.
export default function AdSlot({ slot, format = "auto", className = "" }) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet — ignore.
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
