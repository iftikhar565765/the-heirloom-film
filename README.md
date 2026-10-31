# The Heirloom Film — a burgundy-heirloom wedding invitation

A cinematic wedding invitation that opens like a letter kept in a family
archive: a burgundy envelope, a wax seal, and an editorial invitation built
purely from typography and hand-drawn SVG ornament — no photography, no image
storage, nothing to break. The frontend is HTML, CSS and vanilla JavaScript.
The recommended hosting is **Cloudflare Pages + Pages Functions + D1**.

This is a sellable digital product: payment happens outside the platform
(bank transfer, Stripe Payment Link, WhatsApp — anything). The buyer opens
`customize.html`, personalises the invitation in the visual editor, presses
**Publish invitation**, and receives a unique shareable link for their guests.

## What changed in this edition

- **No photographs anywhere.** The gallery ("Visual Diary") and every photo
  field were removed by design. The story chapter is now a keepsake folio of
  letterpress-style quote cards and handwritten notes; the details chapter
  pairs the ledger with a wax-seal note card; the venue scene is a candlelit
  night layout with a lace ornament. Every ornament is inline SVG.
- **No R2.** The image-upload endpoints and the R2 binding were removed. The
  whole product now needs exactly **one** Cloudflare resource: a D1 database.
- **Sell-ready customizer.** New editor chapters for story & wording,
  wedding-day words, RSVP party-size limit and reply-by date. The reply
  notification email is now optional. An optional **access code** gate can
  restrict who may publish (see *Selling the product*).

## Run it locally

Frontend only (open straight in a browser):

```
open index.html        # or double-click it
```

Full product with working publish + RSVP (needs Node.js 18+):

```
npm install          # once — installs wrangler
npm run dev          # builds, applies local D1 migrations, serves on :8788
# open http://127.0.0.1:8788/customize.html
```

(`npm run dev` passes `--d1 DB=heirloom-invitations` explicitly — local
`pages dev` needs the flag even though `wrangler.jsonc` declares the
binding; on the deployed site the binding comes from the config.)

## Deploy to Cloudflare Pages (GitHub → Pages)

Go-live checklist, in order:

1. Push this repository to GitHub (`main` branch).
2. Create the D1 database **and apply the migration to it** — without the
   tables the publish and RSVP endpoints would return HTTP 500:

   ```
   npx wrangler login
   npx wrangler d1 create heirloom-invitations     # skip if it exists already
   npx wrangler d1 migrations apply heirloom-invitations --remote
   ```

   The database id in `wrangler.jsonc` is the production database for this
   project; if you create a fresh database, paste its id into
   `wrangler.jsonc` before the next step.
3. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   pick the repository. Build settings: **no framework**, build command
   `node scripts/build.mjs`, output directory `dist`.
4. In the Pages project → **Settings → Bindings**, verify the D1 database is
   bound as `DB` (Cloudflare reads the binding from `wrangler.jsonc`). That
   is the only required binding.
5. Optional secrets (Settings → Environment variables): `ACCESS_CODE`
   (sells the editor behind a code), `RESEND_API_KEY` + `RSVP_FROM`
   (emails each reply to the couple). See *Selling the product* below.
6. Redeploy and smoke-test: open `https://PROJECT.pages.dev/customize.html`,
   publish a test invitation, open its guest link, send a test reply, and
   check it appears under **Guest replies** in the editor.

Alternative one-command deploy (direct upload, no Git connection) after
`npx wrangler login`:

```
npm run deploy       # builds dist, then `wrangler deploy`
```

The live editor is `https://PROJECT.pages.dev/customize.html`; published
invitations live at `https://PROJECT.pages.dev/?invite=ID`.

`_routes.json` limits Functions execution to `/api/*` — every page, script and
stylesheet is served as a static asset from the CDN edge.

## Selling the product

Payment is collected **outside** this platform. Your options, in order of
tightness:

1. **Open editor (default).** Anyone with the link can publish. Fine when you
   sell the link personally and trust buyers.
2. **Access-code gate (recommended).** In the Pages project →
   **Settings → Environment variables**, add a secret `ACCESS_CODE` with any
   string you choose. The editor then asks buyers to paste that code before
   their first publish — you hand the code over only after payment. The code
   is checked server-side by the publish Function.
3. Each published invitation gets a **unique id and guest link**. The buyer's
   browser stores the private edit token (`localStorage`), so they return to
   `customize.html?edit=ID` on the same browser to keep editing. Advise buyers
   to also press **Download a backup** — without the browser's site data the
   token cannot be recovered in this prototype.

## Personalise (10 minutes)

Open **customize.html**. The sidebar chapters cover everything shared:
names & monogram, wedding date & time (with the venue's UTC offset kept for
calendars), location and Maps link, story & wording, the opening envelope,
wedding-day words, RSVP limits, colour theme & palette, and typography.
Unique wording can also be edited directly on the live preview — click any
text to edit it in place, click an element to recolour it.

Press **Publish invitation** once to create the unique guest link. After
that, edits save automatically and guests see changes within a few seconds.

### Dates & the countdown

`wedding.iso` carries an explicit UTC offset — `"2027-09-18T16:00:00+02:00"`
is 4:00 PM in GMT+2. The countdown, the .ics download and the Google Calendar
link all derive from that one value. An invalid date shows a graceful
message; a past date switches to the celebration wording.

### Wedding-day words

`moments` is a list of single words displayed in the framed wedding
programme. Empty the list to hide the whole scene.

## Publishing and RSVP delivery

- `functions/api/publish.js` — creates and updates invitation records in D1.
  Owner tokens are random; only their SHA-256 hashes are stored. The public
  endpoint never exposes the token or the reply-notification email. Public
  pages poll for changed revisions every three seconds.
- `functions/api/rsvp.js` — validates replies (name, attendance, party size
  against the invitation's limit), rate-limits per IP (5 per 10 minutes),
  stores replies in D1. Guests are never asked for an email address. When the
  couple enters a notification email in the editor, every reply is emailed to
  that address the moment it arrives — add the two Cloudflare Pages
  environment variables `RESEND_API_KEY` (a Resend API key) and `RSVP_FROM`
  (a verified sending address such as `RSVP <rsvp@yourdomain.com>`) to switch
  delivery on. Replies are always visible in the editor under **Guest
  replies** (latest 100), with or without email delivery.
- Publishing is rate-limited to 10 new invitations per hour per IP.

## Accessibility & resilience

- The envelope is a real `<button>`; the opening is escapable via the open
  control, the skip link, or the Escape key.
- `prefers-reduced-motion` swaps the choreography for a quiet fade.
- Without JS the cover becomes the first section of an ordinary readable
  page; a watchdog reveals the site even if a script fails.
- If the GSAP CDN is unreachable, a pure-CSS keyframe sequence opens the
  envelope instead. No icon library — every ornament is inline SVG.
