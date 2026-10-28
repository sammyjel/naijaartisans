// POST — owner actions on a done-for-you order.
//   { action: "assign", name, note, costNaira }   who is doing it, and for how much
//   { action: "deliver", note, links }            post previews (or finals once paid)
//   { action: "fulfiller_paid" }                  mark the deliverer as paid
//   { action: "cancel" } / { action: "refunded" } close it (refund itself is done in Paystack)

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { assignFulfiller, addDelivery } from "@/lib/dfy";

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const order = await prisma.serviceOrder.findUnique({ where: { reference: params.reference } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case "assign":
      if (!String(body.name || "").trim()) return NextResponse.json({ error: "Enter who is doing the work." }, { status: 400 });
      await assignFulfiller(order, body);
      return NextResponse.json({ ok: true });
    case "deliver": {
      const r = await addDelivery(order, body);
      return r.error ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json({ ok: true });
    }
    case "fulfiller_paid":
      await prisma.serviceOrder.update({ where: { id: order.id }, data: { fulfillerPaidAt: new Date() } });
      return NextResponse.json({ ok: true });
    case "cancel":
    case "refunded":
      await prisma.serviceOrder.update({ where: { id: order.id }, data: { status: body.action === "cancel" ? "CANCELLED" : "REFUNDED" } });
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
