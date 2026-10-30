import { json, makeToken, withinRateLimit } from "../_lib/shared.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function onRequestPost(context) {
  const declaredLength = Number(context.request.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES + 64 * 1024) {
    return json({ error: "Images must be smaller than 5 MB." }, 413);
  }
  if (!(await withinRateLimit(context.env, context.request, "image-upload", 30, 3600))) {
    return json({ error: "Too many images were uploaded. Please try again later." }, 429);
  }
  const form = await context.request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !ALLOWED_TYPES.has(image.type)) {
    return json({ error: "Choose a JPEG, PNG, WebP, or GIF image." }, 415);
  }
  if (!image.size || image.size > MAX_IMAGE_BYTES) {
    return json({ error: "Images must be smaller than 5 MB." }, 413);
  }

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[image.type];
  const key = `${makeToken(16)}.${extension}`;
  await context.env.IMAGES.put(key, image.stream(), {
    httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return json({ url: `/api/images/${key}` }, 201);
}
