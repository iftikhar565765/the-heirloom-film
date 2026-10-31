export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function validId(id) {
  return /^[a-f0-9]{24}$/.test(id || "");
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function makeToken(bytes = 32) {
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function readJson(request, maxBytes = 1_900_000) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    return { error: json({ error: "The request is too large." }, 413) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { error: json({ error: "The request is too large." }, 413) };
  }
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: json({ error: "The request body must be valid JSON." }, 400) };
  }
}

export function validConfig(config) {
  return config && typeof config === "object" && !Array.isArray(config) &&
    config.couple && typeof config.couple === "object" &&
    config.wedding && typeof config.wedding === "object" &&
    config.venue && typeof config.venue === "object" &&
    config.content && typeof config.content === "object";
}

export async function loadInvitation(env, id) {
  return env.DB.prepare(
    "SELECT id, owner_hash, recipient, max_guests, config_json, template_id, published, revision " +
    "FROM invitations WHERE id = ?1"
  ).bind(id).first();
}

export async function verifyOwner(record, request) {
  const token = request.headers.get("X-Invitation-Token") || "";
  if (!token || !record || !record.owner_hash) return false;
  const actual = await hashToken(token);
  const expected = record.owner_hash;
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function withinRateLimit(env, request, scope, limit, windowSeconds) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await hashToken(`${scope}:${ip}`);
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const result = await env.DB.prepare(
    "INSERT INTO request_limits (key, window_start, count) VALUES (?1, ?2, 1) " +
    "ON CONFLICT(key) DO UPDATE SET " +
    "count = CASE WHEN request_limits.window_start = excluded.window_start " +
    "THEN request_limits.count + 1 ELSE 1 END, window_start = excluded.window_start " +
    "RETURNING count"
  ).bind(key, windowStart).first();
  return Number(result && result.count) <= limit;
}

export function publicConfig(record) {
  const config = JSON.parse(record.config_json);
  config.templateId = record.template_id || "heirloom-film";
  config.rsvp = config.rsvp && typeof config.rsvp === "object" ? config.rsvp : {};
  config.rsvp.endpoint = `/api/rsvp?id=${encodeURIComponent(record.id)}`;
  config.rsvp.maxGuests = record.max_guests;
  return config;
}
