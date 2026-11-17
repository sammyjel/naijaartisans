// Email a job's customer, sent as NaijaArtisans (never from the owner's own
// address — the owner asked for that on 2026-11-17).
//
//   POST /api/admin/jobs/<id>/message   { subject, body }
//
// The recipient is always the job's customer; the admin cannot type an
// arbitrary address, so this cannot become a general mail-anyone tool.
// naijaartisans.com cannot receive mail yet (no MX record), so the email asks
// the customer to answer through the site's contact form, which reaches the
// owner without exposing any personal address.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CONTACT_URL = "https://naijaartisans.com/contact";

function messageHtml(body) {
  const paras = String(body)
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;color:#0f172a;font-size:15px;line-height:1.55">
    <div style="font-weight:800;color:#0f4a80;font-size:18px;margin-bottom:16px">NaijaArtisans</div>
    ${paras}
    <p style="margin:18px 0 0">
      <a href="${CONTACT_URL}" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">Reply to NaijaArtisans</a>
    </p>
    <p style="margin:18px 0 0;color:#94a3b8;font-size:12px">Please reply using the button above, not by replying to this email. NaijaArtisans never asks you for money.</p>
  </div>
</div>`;
}

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { subject, body } = await request.json().catch(() => ({}));
  const s = String(subject || "").trim().slice(0, 150);
  const b = String(body || "").trim().slice(0, 5000);
  if (s.length < 3 || b.length < 10) return NextResponse.json({ error: "Write a subject and a message." }, { status: 400 });

  const job = await prisma.jobRequest.findUnique({
    where: { id: params.id },
    select: { id: true, customer: { select: { email: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (!job.customer?.email) return NextResponse.json({ error: "This customer has no email address." }, { status: 400 });

  const res = await sendEmail({ to: job.customer.email, subject: s, html: messageHtml(b) });
  track("admin_customer_message", { jobId: job.id, sent: res.sent });
  if (!res.sent) return NextResponse.json({ error: `Email not sent (${res.reason}).` }, { status: 502 });
  return NextResponse.json({ ok: true });
}
