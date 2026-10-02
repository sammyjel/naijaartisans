// Deals: the record of work between a customer and an artisan.
//
//   GET  /api/deals            every deal the caller is party to
//   POST /api/deals            the customer accepts a quote, starting a deal
//
// Both are scoped to the logged-in user. A deal carries the two parties' phone
// numbers and email addresses, so "party to it" is the only access rule — there
// is no admin-style listing here.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptQuote, listDealsForUser } from "@/lib/deals";
import { availableActions } from "@/lib/deal-rules";
import { revalidateFor } from "@/lib/cached-queries";
import { recordConversion } from "@/lib/attribution";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const deals = await listDealsForUser(user.id);

  // The buttons are computed server-side from the same rules the write path
  // enforces, so the UI can never offer an action the API will refuse.
  return NextResponse.json({
    deals: deals.map((d) => ({
      ...d,
      you: d.customerId === user.id ? "customer" : "artisan",
      actions: availableActions(d, user.id),
    })),
  });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const quoteId = String(body.quoteId || "").trim();
  if (!quoteId) return NextResponse.json({ error: "Which quote?" }, { status: 400 });

  const result = await acceptQuote({ quoteId, userId: user.id });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status });

  // Hiring moves the job off the open board and changes nothing else public.
  revalidateFor("deal", ["/jobs", "/sitemap.xml"]);

  await recordConversion({
    conversion: "deal_started",
    userId: user.id,
    subjectType: "Deal",
    subjectId: result.deal.id,
    conversionPath: "/dashboard",
  });

  return NextResponse.json(
    { deal: { ...result.deal, you: "customer", actions: availableActions(result.deal, user.id) } },
    { status: 201 }
  );
}
