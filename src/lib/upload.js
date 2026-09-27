// Shared validation for user-supplied images (avatars and portfolio photos).
//
// Both upload routes previously trusted two values that come straight from the
// browser and can be set to anything by a crafted request:
//
//   * `file.type` — the declared MIME type. `startsWith("image/")` accepted
//     `image/svg+xml`, and an SVG is a document: opened directly it executes
//     script. The blob store serves it with the type we pass, so we were
//     offering to host attacker-controlled executable pages on our storage.
//
//   * `file.name` — the extension was taken with `name.split(".").pop()` and
//     pasted into the blob pathname unchecked, so "x.php", "x.html", or
//     something containing slashes and dot-segments went straight through.
//
// The fix is to allow-list rather than deny-list: a fixed set of raster formats,
// each mapped to the one extension we will write.

/** MIME types we accept, mapped to the extension used in storage. */
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Validates an uploaded image.
 *
 * @returns {{ok: true, ext: string, contentType: string} | {ok: false, error: string, status: number}}
 */
export function validateImageUpload(file) {
  if (!file || typeof file === "string") {
    return { ok: false, error: "No image provided.", status: 400 };
  }

  const declared = String(file.type || "").toLowerCase().split(";")[0].trim();
  const ext = ALLOWED[declared];
  if (!ext) {
    return {
      ok: false,
      // Named explicitly so an artisan with a real SVG logo knows what to do,
      // rather than being told "invalid" with no way forward.
      error: "Please upload a JPG, PNG, WebP, GIF or AVIF image. SVG files are not accepted.",
      status: 400,
    };
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return { ok: false, error: "That file appears to be empty.", status: 400 };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image is too large (max 5MB).", status: 400 };
  }

  // The extension comes from our own table, never from file.name, so the blob
  // pathname cannot be steered by the uploader.
  return { ok: true, ext, contentType: declared };
}
