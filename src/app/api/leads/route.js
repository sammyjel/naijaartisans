import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

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

    // No email to the owner for a sign-up: the owner asked (2026-11-03) to be
    // emailed about posted jobs only. New leads are listed on /admin instead.
    if (emailConfigured()) {
      // Welcome the lead by email if they gave one (side-appropriate).
      if (email) {
        const first = name.split(" ")[0];
        sendEmail({
          to: email,
          subject: side === "ARTISAN" ? "You're in — welcome, Founding Artisan 🎉" : "📩 Your No-Wahala Hiring Kit",
          html: side === "ARTISAN" ? welcomeEmailHtml(first) : hiringKitEmailHtml(first),
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

function hiringKitEmailHtml(firstName) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#039855;color:#fff;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:22px">Your No-Wahala Hiring Kit 📩</h1>
        <p style="margin:8px 0 0">Hi ${escapeHtml(firstName)} — hire any artisan with confidence.</p>
      </div>
      <div style="padding:24px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
        <p><strong>Before you pay anyone, ask:</strong></p>
        <ol>
          <li>Can I see photos of your past work or reviews?</li>
          <li>What's your full price — including materials and call-out?</li>
          <li>How long exactly will the job take?</li>
          <li>Do you give any guarantee if something goes wrong?</li>
          <li>Can you share a past customer as a reference?</li>
          <li>Will you provide materials and give receipts?</li>
          <li>What deposit do you need — with the balance on completion?</li>
        </ol>
        <p><strong>🚩 Walk away if</strong> they demand 100% upfront, have no reviews/references, or quote far below everyone else.</p>
        <p style="margin-top:16px"><strong>The easy way:</strong> post your job free and get quotes from trusted, reviewed artisans near you.</p>
        <p>
          <a href="${SITE_URL}/post-job"
             style="display:inline-block;background:#039855;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">
            Post my job free →
          </a>
        </p>
        <p style="color:#666;font-size:13px">Hire smart. No wahala. 🇳🇬</p>
      </div>
    </div>
  `;
}
