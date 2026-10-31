import {
  json,
  loadInvitation,
  validId,
  validEmail,
  withinRateLimit,
} from "../_lib/shared.js";

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim().slice(0, maxLength);
}

async function sendNotification(env, record, reply) {
  if (!record.recipient) return false;
  if (!env.RESEND_API_KEY || !env.RSVP_FROM) return false;
  let coupleNames = "the couple";
  try {
    const published = JSON.parse(record.config_json);
    if (published && published.couple && typeof published.couple.namesLine === "string") {
      coupleNames = published.couple.namesLine;
    }
  } catch {
    /* the stored config could not be read — the generic subject still works */
  }
  const attendance = reply.attendance === "attending" ? "Attending" : "Declining";
  const subject = `RSVP for ${coupleNames} — ${reply.name}`;
  const text = [
    `A reply has come in for the wedding of ${coupleNames}.`,
    "",
    `Name: ${reply.name}`,
    `Attendance: ${attendance}`,
    `Party size: ${reply.guests}`,
    `Dietary requirements: ${reply.dietary || "None provided"}`,
    `Message: ${reply.message || "None provided"}`,
    "",
    "Open your editor's “Guest replies” panel to see every response.",
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RSVP_FROM,
        to: [record.recipient],
        ...(reply.email ? { reply_to: reply.email } : {}),
        subject,
        text,
      }),
    });
    if (!response.ok) {
      console.error("RSVP notification delivery failed:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("RSVP notification request failed:", error);
    return false;
  }
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id") || "";
  if (!validId(id)) return json({ error: "The invitation link is invalid." }, 400);
  const record = await loadInvitation(context.env, id);
  if (!record || !record.published) return json({ error: "This invitation is not available for replies." }, 404);
  if (!(await withinRateLimit(context.env, context.request, `rsvp:${id}`, 5, 600))) {
    return json({ error: "Too many replies were sent from this connection. Please try again later." }, 429);
  }

  const contentType = (context.request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return json({ error: "Submit the RSVP using the invitation form." }, 415);

  let reply;
  try {
    const length = Number(context.request.headers.get("content-length") || 0);
    if (length > 16_384) return json({ error: "The RSVP is too large to process." }, 413);
    reply = await context.request.json();
  } catch {
    return json({ error: "The RSVP could not be read. Please try again." }, 400);
  }
  if (!reply || typeof reply !== "object" || Array.isArray(reply)) {
    return json({ error: "The RSVP could not be read. Please try again." }, 400);
  }
  if (reply.website) return json({ error: "The RSVP could not be accepted." }, 400);

  const name = cleanText(reply.name, 240).replace(/[\r\n]+/g, " ");
  /* guests no longer hand over an email address — when one is
     supplied anyway (older forms, integrations) it must be valid */
  const email = typeof reply.email === "string" ? reply.email.trim() : "";
  const attendance = reply.attendance;
  const guests = Number(reply.guests);
  const maxGuests = Number(record.max_guests);
  if (name.length < 2 || (email && !validEmail(email)) ||
      !["attending", "declining"].includes(attendance) ||
      !Number.isInteger(guests) || guests < 1 || guests > maxGuests) {
    return json({ error: "Please check the name, attendance and guest count." }, 422);
  }

  const cleaned = {
    name,
    email,
    attendance,
    guests,
    dietary: cleanText(reply.dietary, 1000),
    message: cleanText(reply.message, 2000),
  };
  await context.env.DB.prepare(
    "INSERT INTO rsvps (invitation_id, name, email, attendance, guests, dietary, message, created_at) " +
    "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
  ).bind(id, cleaned.name, cleaned.email, cleaned.attendance, cleaned.guests,
    cleaned.dietary, cleaned.message, new Date().toISOString()).run();

  const emailSent = await sendNotification(context.env, record, cleaned);
  return json({ ok: true, stored: true, emailSent });
}
