import { json } from "../../_lib/shared.js";

export async function onRequestGet(context) {
  const key = context.params.key;
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(key || "")) {
    return json({ error: "The image URL is invalid." }, 400);
  }
  const object = await context.env.IMAGES.get(key);
  if (!object) return json({ error: "This image was not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
