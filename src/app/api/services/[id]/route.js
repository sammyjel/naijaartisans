import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request, { params }) {
  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      artisan: { select: { id: true, name: true, city: true, bio: true, phone: true, email: true } },
    },
  });
  if (!service) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ service });
}

export async function DELETE(_request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (service.artisanId !== user.id)
    return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });

  await prisma.service.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
