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
npm install wrangler --save-dev   # once
node scripts/build.mjs
npx wrangler d1 migrations apply heirloom-invitations --local
npx wrangler pages dev --port 8788 --d1 DB=heirloom-invitations
# open http://127.0.0.1:8788/customize.html
```

(The `--d1` flag binds the database for `pages dev`; on the deployed site
the binding comes from the Pages project settings instead.)

## Deploy to Cloudflare Pages (GitHub → Pages)

1. Push this repository to GitHub (`main` branch).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   pick the repository. Build settings: **no framework**, build command
   `node scripts/build.mjs`, output directory `dist`.
3. Create the D1 database once and paste its id into `wrangler.jsonc`
   (the id in the file is the production database for this project):

   ```
   npx wrangler d1 create heirloom-invitations
   npx wrangler d1 migrations apply heirloom-invitations --remote
   ```

4. In the Pages project → **Settings → Bindings**, verify the D1 database is
   bound as `DB`. That is the only required binding.
5. Redeploy. The live editor is `https://PROJECT.pages.dev/customize.html`;
   published invitations live at `https://PROJECT.pages.dev/?invite=ID`.

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
- `functions/api/rsvp.js` — validates replies (name, email, attendance, party
  size against the invitation's limit), rate-limits per IP (5 per 10 minutes),
  stores replies in D1. Email forwarding through Resend is optional: set
  `RESEND_API_KEY` and `RSVP_FROM` only if you want it; replies are always
  visible in the editor under **Guest replies** (latest 100).
- Publishing is rate-limited to 10 new invitations per hour per IP.

## Accessibility & resilience

- The envelope is a real `<button>`; the opening is escapable via the open
  control, the skip link, or the Escape key.
- `prefers-reduced-motion` swaps the choreography for a quiet fade.
- Without JS the cover becomes the first section of an ordinary readable
  page; a watchdog reveals the site even if a script fails.
- If the GSAP CDN is unreachable, a pure-CSS keyframe sequence opens the
  envelope instead. No icon library — every ornament is inline SVG.
