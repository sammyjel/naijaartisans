import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { phoneProblem } from "@/lib/phone";

// POST /api/me/phone — change the logged-in member's phone number.
//
// Until 2026-10-21 a number could only be set at signup, so a typo (one hired
// artisan saved "+234 81103291", two digits short) left a member unreachable
// with no way to fix it. Stored as typed, like signup, because login by phone
// matches the stored string exactly.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { phone: raw } = await request.json().catch(() => ({}));
  const phone = String(raw ?? "").trim();
  const problem = phoneProblem(phone);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
    return NextResponse.json({ ok: true, phone });
  } catch (e) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "That number is already registered to another account." }, { status: 409 });
    }
    console.error("[me/phone] update failed:", e);
    return NextResponse.json({ error: "Could not save your number. Please try again." }, { status: 500 });
  }
}
