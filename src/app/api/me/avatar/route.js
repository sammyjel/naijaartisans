import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    const blob = await put(`avatars/${user.id}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("avatar upload error", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
