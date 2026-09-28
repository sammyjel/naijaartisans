// PATCH /api/deals/[id]  — move a deal along.
//
//   { "action": "mark_done" | "confirm" | "dispute" | "cancel", "note": "..." }
//
// Who may do what is decided by canTransition() in src/lib/deal-rules.js, not
// here. In particular an artisan cannot "confirm": only the customer can reach
// COMPLETED, and only COMPLETED counts towards the artisan's public record.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyDealAction, getDealForUser } from "@/lib/deals";
import { availableActions, DEAL_ACTIONS } from "@/lib/deal-rules";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const deal = await getDealForUser(params.id, user.id);
  // Deliberately 404 rather than 403 for a deal that exists but is not theirs:
  // a 403 would confirm the id is real to someone enumerating.
  if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });

  return NextResponse.json({
    deal: {
      ...deal,
      you: deal.customerId === user.id ? "customer" : "artisan",
      actions: availableActions(deal, user.id),
    },
  });
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  if (!DEAL_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Unknown action. Expected one of: ${DEAL_ACTIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  const result = await applyDealAction({
    dealId: params.id,
    action,
    userId: user.id,
    note: body.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status });

  return NextResponse.json({
    deal: {
      ...result.deal,
      you: result.deal.customerId === user.id ? "customer" : "artisan",
      actions: availableActions(result.deal, user.id),
    },
  });
}
