import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validateImageUpload } from "@/lib/upload";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  // The Blob store is usable if either an explicit token or the connected
  // store id is present (Vercel injects the token at runtime when connected).
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "Photo uploads aren't enabled yet." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  // Allow-listed type, and the extension comes from our table rather than from
  // the uploader's filename. See src/lib/upload.js.
  const check = validateImageUpload(file);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const blob = await put(`avatars/${user.id}.${check.ext}`, file, {
      access: "public",
      contentType: check.contentType,
      addRandomSuffix: true,
    });
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("avatar upload error", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
