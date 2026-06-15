"use client";

import { useState } from "react";

// One-tap social sharing for any listing. Works on server pages (pass an
// absolute `url`) and client pages alike.
export default function ShareButtons({ url, title = "", label = "Share this listing" }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const text = title ? `${title} — on NaijaArtisans` : "Check this out on NaijaArtisans";

  const targets = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      className: "bg-[#25D366] hover:bg-[#1ebe5b] text-white",
      icon: "💬",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      className: "bg-[#1877F2] hover:bg-[#0e6ae0] text-white",
      icon: "f",
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      className: "bg-black hover:bg-gray-800 text-white",
      icon: "𝕏",
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — ignore.
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {targets.map((t) => (
          <a
            key={t.name}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${t.name}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${t.className}`}
          >
            <span className="grid h-4 w-4 place-items-center text-xs">{t.icon}</span>
            {t.name}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          {copied ? "✓ Copied!" : "🔗 Copy link"}
        </button>
      </div>
    </div>
  );
}
