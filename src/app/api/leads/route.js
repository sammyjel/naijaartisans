import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

// Where new-lead alerts go. Set LEAD_NOTIFY_EMAIL in Vercel to your real inbox
// (e.g. your Gmail) so you actually receive them.
const OWNER_EMAIL = (process.env.LEAD_NOTIFY_EMAIL || "support@naijaartisans.com").trim();

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { name, whatsapp, email, trade, city, side, source, magnet } = body;

    name = (name || "").trim();
    whatsapp = (whatsapp || "").trim();
    email = (email || "").trim().toLowerCase() || null;
    trade = (trade || "").trim() || null;
    city = (city || "").trim() || null;
    side = side === "CUSTOMER" ? "CUSTOMER" : "ARTISAN";
    source = (source || "").trim() || null;
    magnet = (magnet || "").trim() || null;

    if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    // Require a usable WhatsApp/phone number (at least 7 digits).
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 7)
      return NextResponse.json({ error: "Please enter a valid WhatsApp number." }, { status: 400 });

    // Store the lead (tolerate the table not existing yet, pre-migration).
    let stored = false;
    try {
      await prisma.lead.create({
        data: { name, whatsapp, email, trade, city, side, source, magnet },
      });
      stored = true;
    } catch (e) {
      console.error("lead store failed (table missing?)", e);
    }

    // Notify the owner so they can follow up on WhatsApp quickly.
    if (emailConfigured()) {
      const waLink = `https://wa.me/${digits}`;
      sendEmail({
        to: OWNER_EMAIL,
        subject: `🚀 New ${side === "ARTISAN" ? "Founding Artisan" : "customer"} lead: ${name}`,
        html: `
          <h2>New ${side.toLowerCase()} lead</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>WhatsApp:</strong> <a href="${waLink}">${escapeHtml(whatsapp)}</a></p>
          ${trade ? `<p><strong>Trade:</strong> ${escapeHtml(trade)}</p>` : ""}
          ${city ? `<p><strong>City:</strong> ${escapeHtml(city)}</p>` : ""}
          ${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : ""}
          <p><strong>Magnet:</strong> ${escapeHtml(magnet || "-")} · <strong>Source:</strong> ${escapeHtml(source || "-")}</p>
          <p><a href="${waLink}">👉 Message ${escapeHtml(name.split(" ")[0])} on WhatsApp</a></p>
        `,
      }).catch(() => {});

      // Welcome the lead by email if they gave one.
      if (email) {
        sendEmail({
          to: email,
          subject: "You're in — welcome, Founding Artisan 🎉",
          html: welcomeEmailHtml(name.split(" ")[0]),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, stored });
  } catch (err) {
    console.error("lead capture error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function welcomeEmailHtml(firstName) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#039855;color:#fff;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:22px">Welcome, ${escapeHtml(firstName)} 🎉</h1>
        <p style="margin:8px 0 0">You're now a NaijaArtisans Founding Artisan.</p>
      </div>
      <div style="padding:24px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
        <p>Here's what you unlocked:</p>
        <ul>
          <li>🎁 <strong>30 days of Featured placement — FREE</strong></li>
          <li>📩 Free job leads near you as customers post work</li>
          <li>📘 Our guide: getting more customers without ad spend</li>
        </ul>
        <p><strong>Next step (2 minutes):</strong> finish your free profile so customers can find and hire you.</p>
        <p>
          <a href="${SITE_URL}/register?role=artisan"
             style="display:inline-block;background:#039855;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">
            Complete my free profile →
          </a>
        </p>
        <p style="color:#666;font-size:13px">We'll also reach you on WhatsApp. See you inside! 🇳🇬</p>
      </div>
    </div>
  `;
}
