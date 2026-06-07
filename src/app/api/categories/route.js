import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Always run on-demand — never prerender at build time (avoids hitting the DB during the build).
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { services: true } } },
  });
  return NextResponse.json({ categories });
}
