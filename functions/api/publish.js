import {
  hashToken,
  json,
  loadInvitation,
  makeToken,
  publicConfig,
  readJson,
  validConfig,
  validEmail,
  validId,
  verifyOwner,
  withinRateLimit,
} from "../_lib/shared.js";

const MAX_CONFIG_BYTES = 1_900_000;

async function loadManaged(context, record, id) {
  if (!(await verifyOwner(record, context.request))) {
    return json({ error: "You do not have permission to edit this invitation." }, 403);
  }

  const url = new URL(context.request.url);
  const requested = Number(url.searchParams.get("limit"));
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(1000, requested) : 100;
  const replies = await context.env.DB.prepare(
    "SELECT id, name, email, attendance, guests, dietary, message, created_at " +
    "FROM rsvps WHERE invitation_id = ?1 ORDER BY created_at DESC LIMIT ?2"
  ).bind(id, limit).all();

  return json({
    id,
    published: Boolean(record.published),
    revision: record.revision,
    config: JSON.parse(record.config_json),
    adminEmail: record.recipient,
    responses: replies.results || [],
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get("action") || "";
  const id = url.searchParams.get("id") || "";
  if (!validId(id)) return json({ error: "The invitation link is invalid." }, 400);

  const record = await loadInvitation(context.env, id);
  if (!record) return json({ error: "This invitation was not found." }, 404);
  if (action === "manage") return loadManaged(context, record, id);
  if (!record.published) return json({ error: "This invitation has not been published." }, 404);
  if (action === "version") return json({ revision: record.revision });
  if (action !== "load") return json({ error: "The requested publishing action is invalid." }, 400);

  return json({
    id,
    revision: record.revision,
    config: publicConfig(record),
  }, 200, { "Cache-Control": "no-store" });
}

export async function onRequestPost(context) {
  const parsed = await readJson(context.request, MAX_CONFIG_BYTES);
  if (parsed.error) return parsed.error;
  const request = parsed.value;
  const action = request && request.action;
  const config = request && request.config;
  const email = request && request.adminEmail;

  if (!validConfig(config)) {
    return json({ error: "The invitation design or publishing action is invalid." }, 422);
  }
  /* The reply-notification email is optional: replies are always
     stored in D1 and listed in the editor; the email only adds
     convenience forwarding when it is provided.                    */
  const recipient = typeof email === "string" && email.trim() ? email.trim() : "";
  if (recipient && !validEmail(recipient)) {
    return json({ error: "Enter a valid email address, or leave the reply email empty." }, 422);
  }

  const templateId = typeof config.templateId === "string" ? config.templateId : "heirloom-film";
  if (templateId !== "heirloom-film") {
    return json({ error: "This invitation template is not available." }, 422);
  }

  const configJson = JSON.stringify(config);
  if (new TextEncoder().encode(configJson).byteLength > MAX_CONFIG_BYTES) {
    return json({ error: "This design is too large to publish." }, 413);
  }

  const id = typeof request.id === "string" ? request.id : "";
  const token = context.request.headers.get("X-Invitation-Token") || "";
  const now = new Date().toISOString();
  const guestLimit = Number(config.rsvp && config.rsvp.maxGuests);
  const maxGuests = Number.isInteger(guestLimit) ? Math.min(20, Math.max(1, guestLimit)) : 2;

  if (action === "publish" && !id) {
    /* Optional seller gate: when the ACCESS_CODE secret is set on the
       Pages project, only buyers quoting that code can create new
       invitations. Leave the secret unset for an open editor.        */
    const requiredCode = typeof context.env.ACCESS_CODE === "string" ? context.env.ACCESS_CODE.trim() : "";
    if (requiredCode) {
      const supplied = request && typeof request.accessCode === "string" ? request.accessCode.trim() : "";
      if (supplied !== requiredCode) {
        return json({ error: "This editor is protected by an access code.", codeRequired: true }, 403);
      }
    }
    if (!(await withinRateLimit(context.env, context.request, "publish", 10, 3600))) {
      return json({ error: "Too many invitations were published from this connection. Try again later." }, 429);
    }
    const newId = makeToken(12);
    const ownerToken = makeToken(32);
    const ownerHash = await hashToken(ownerToken);
    await context.env.DB.prepare(
      "INSERT INTO invitations " +
      "(id, owner_hash, recipient, max_guests, config_json, template_id, published, revision, created_at, updated_at) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 1, ?7, ?7)"
    ).bind(newId, ownerHash, recipient, maxGuests, configJson, templateId, now).run();

    return json({
      id: newId,
      token: ownerToken,
      published: true,
      revision: 1,
      url: new URL(`/?invite=${encodeURIComponent(newId)}`, context.request.url).toString(),
    }, 201);
  }

  if (!validId(id) || !token) {
    return json({ error: "Invitation editing credentials are missing or invalid." }, 401);
  }
  const record = await loadInvitation(context.env, id);
  if (!record || !(await verifyOwner(record, context.request))) {
    return json({ error: "You do not have permission to edit this invitation." }, 403);
  }

  const revision = record.revision + 1;
  await context.env.DB.prepare(
    "UPDATE invitations SET recipient = ?1, max_guests = ?2, config_json = ?3, " +
    "template_id = ?4, published = 1, revision = ?5, updated_at = ?6 WHERE id = ?7"
  ).bind(recipient, maxGuests, configJson, templateId, revision, now, id).run();

  return json({
    id,
    published: true,
    revision,
    url: new URL(`/?invite=${encodeURIComponent(id)}`, context.request.url).toString(),
  });
}
