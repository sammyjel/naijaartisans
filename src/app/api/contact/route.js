import { NextResponse } from "next/server";
import { emailConfigured, sendEmail } from "@/lib/email";

const OWNER_EMAIL = (process.env.LEAD_NOTIFY_EMAIL || "support@naijaartisans.com").trim();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { name, email, message } = body;
    name = (name || "").trim();
    email = (email || "").trim();
    message = (message || "").trim();

    if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (message.length < 5) return NextResponse.json({ error: "Please enter a message." }, { status: 400 });

    if (!emailConfigured()) {
      // No email configured — accept gracefully so the UX still works.
      return NextResponse.json({ ok: true, delivered: false });
    }

    const res = await sendEmail({
      to: OWNER_EMAIL,
      subject: `📨 Contact form: ${name}`,
      html: `
        <h2>New message from the contact form</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    });

    return NextResponse.json({ ok: true, delivered: !!res.sent });
  } catch (err) {
    console.error("contact error", err);
    return NextResponse.json({ error: "Something went wrong. Please email us directly." }, { status: 500 });
  }
}
