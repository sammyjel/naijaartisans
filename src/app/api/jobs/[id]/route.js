import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request, { params }) {
  const user = await getCurrentUser();
  const job = await prisma.jobRequest.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      customer: { select: { id: true, name: true, city: true, phone: true, email: true } },
      quotes: {
        orderBy: { createdAt: "desc" },
        include: { artisan: { select: { id: true, name: true, city: true, phone: true, email: true } } },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // The customer who owns the job (and quoting artisans) can see contact details;
  // we expose quotes to everyone but only reveal the owner flag.
  const isOwner = user?.id === job.customerId;
  return NextResponse.json({ job, isOwner });
}

// Close / reopen a job (owner only)
export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const job = await prisma.jobRequest.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (job.customerId !== user.id)
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { status } = await request.json();
  if (!["OPEN", "CLOSED"].includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const updated = await prisma.jobRequest.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ job: updated });
}

export async function DELETE(_request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const job = await prisma.jobRequest.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (job.customerId !== user.id)
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  await prisma.jobRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
