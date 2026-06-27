import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_PHOTOS = 12;

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// Read the current gallery, tolerating the column not existing yet (pre-migration).
async function readGallery(userId) {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { galleryUrls: true } });
    return { urls: u?.galleryUrls || [], migrated: true };
  } catch {
    return { urls: [], migrated: false };
  }
}

// GET — list the logged-in artisan's work photos.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const { urls } = await readGallery(user.id);
  return NextResponse.json({ urls });
}

// POST — upload one work photo and append it to the gallery.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  if (!blobEnabled()) {
    return NextResponse.json({ error: "Photo uploads aren't enabled yet." }, { status: 503 });
  }

  const { urls, migrated } = await readGallery(user.id);
  if (!migrated) {
    return NextResponse.json({ error: "Work gallery isn't enabled yet. Please try again soon." }, { status: 503 });
  }
  if (urls.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `You can upload up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (!file.type?.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large (max 5MB)." }, { status: 400 });
  }

  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  try {
    const blob = await put(`gallery/${user.id}/${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    const next = [...urls, blob.url];
    await prisma.user.update({ where: { id: user.id }, data: { galleryUrls: next } });
    return NextResponse.json({ urls: next });
  } catch (e) {
    console.error("gallery upload error", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

// DELETE — remove one work photo (body: { url }).
export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const url = (body.url || "").trim();
  if (!url) return NextResponse.json({ error: "No photo specified." }, { status: 400 });

  const { urls, migrated } = await readGallery(user.id);
  if (!migrated) return NextResponse.json({ urls: [] });

  const next = urls.filter((u) => u !== url);
  try {
    await prisma.user.update({ where: { id: user.id }, data: { galleryUrls: next } });
    // Best-effort removal from Blob storage; ignore failures.
    if (blobEnabled()) await del(url).catch(() => {});
    return NextResponse.json({ urls: next });
  } catch (e) {
    console.error("gallery delete error", e);
    return NextResponse.json({ error: "Could not remove photo." }, { status: 500 });
  }
}
