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

  const isOwner = user?.id === job.customerId;

  // SECURITY: strip contact details the caller is not entitled to.
  //
  // The intent was always "the customer who owns the job, and the artisans who
  // quoted on it, can see contact details" — but the response returned the
  // customer's phone and email, and every quoting artisan's, to anyone who
  // asked. `isOwner` was only a flag, and a flag the client was trusted to
  // honour is not an access control. Iterating job ids harvested the contact
  // book of both sides of the marketplace.
  const redactedCustomer = isOwner
    ? job.customer
    : { id: job.customer.id, name: job.customer.name, city: job.customer.city };

  const quotes = job.quotes.map((q) => {
    // An artisan always sees their own details; the job owner sees everyone who
    // quoted, because contacting them is the point. Nobody else does.
    const maySeeArtisan = isOwner || user?.id === q.artisanId;
    return {
      ...q,
      artisan: maySeeArtisan
        ? q.artisan
        : { id: q.artisan.id, name: q.artisan.name, city: q.artisan.city },
    };
  });

  return NextResponse.json({ job: { ...job, customer: redactedCustomer, quotes }, isOwner });
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
