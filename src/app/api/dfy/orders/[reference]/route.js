// POST — the customer's actions on their own order, authorised by the secret
// token in their tracking link (no account needed).
//   { t, action: "pay" }               pay whatever is owed (deposit retry or balance)
//   { t, action: "revision", note }    ask for changes on delivered work

import { NextResponse } from "next/server";
import { orderForCustomer, startBalancePayment, restartDepositPayment, requestRevision } from "@/lib/dfy";

export async function POST(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const order = await orderForCustomer(params.reference, body.t);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  try {
    if (body.action === "pay") {
      const r = order.status === "AWAITING_DEPOSIT" ? await restartDepositPayment(order) : await startBalancePayment(order);
      if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json(r.url ? { authorization_url: r.url } : { completed: true });
    }
    if (body.action === "revision") {
      const r = await requestRevision(order, body.note);
      if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("[dfy] customer action failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
