/* Worker entry point.
   Routes /api/* to the request handlers in functions/ (shared with the
   historical Pages-Functions layout) and serves everything else as
   static assets from dist/ at the CDN edge.                           */
import { onRequestGet, onRequestPost } from "./functions/api/publish.js";
import { onRequestPost as onRsvpPost } from "./functions/api/rsvp.js";

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: "Method not allowed." }), {
    status: 405,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Allow": "GET, POST",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/publish") {
      if (request.method === "GET" || request.method === "HEAD") {
        return onRequestGet({ request, env });
      }
      if (request.method === "POST") {
        return onRequestPost({ request, env });
      }
      return methodNotAllowed();
    }

    if (pathname === "/api/rsvp") {
      if (request.method === "POST") {
        return onRsvpPost({ request, env });
      }
      return methodNotAllowed();
    }

    /* Known paths never reach the worker — Cloudflare serves matching
       static assets directly. The worker only sees /api/* and unknown
       paths, which fall through to the plain 404 below.                */
    return env.ASSETS.fetch(request);
  },
};
