# The Heirloom Film — a burgundy-heirloom wedding invitation

A cinematic wedding invitation that opens like a letter kept in a family
archive: a burgundy envelope, a wax seal, and an editorial invitation. The
frontend uses HTML, CSS, and vanilla JavaScript; the recommended live service
uses Cloudflare Pages Functions, D1, and R2. A small dependency-free Node
script copies only the public website files into the Pages build directory.

## Run it

For local frontend-only preview, open `index.html`. For the complete Cloudflare
Pages workflow, including Functions and storage bindings, install Node.js and
run the build and Pages runtime from this folder after configuring
`wrangler.jsonc` and applying the D1 migration.

```
node scripts/build.mjs
npx wrangler pages dev dist
```

Alternatively, deploy the repository to Cloudflare Pages through Git
integration. Static hosting alone cannot run publishing, image uploads, or
RSVP submission endpoints.

## What's inside

```
index.html            the whole suite: ornaments, envelope, nine scenes
css/variables.css     design tokens — palette, type, spacing, shadows, motion
css/base.css          reset, typography, stationery primitives, navigation
css/envelope.css      the opening envelope and its fallback keyframes
css/sections.css      invitation, collage, editorial spreads, venue, RSVP…
css/rsvp.css          the response card's controls and states
css/responsive.css    tablet / phone / short-viewport / print courtesy
js/config.js          ← personalise everything here
js/envelope.js        the opening choreography (GSAP with CSS fallback)
js/main.js            countdown, itinerary, calendar files, reveals, menu
js/boot.js            loads the selected live invitation before site scripts
js/rsvp.js            validation + demo mode / published RSVP mode
scripts/build.mjs     copies only public files into the Pages build folder
functions/api/        Cloudflare publish, RSVP, and image APIs
functions/_lib/       shared validation and D1 helpers
migrations/           D1 schema for invitations, replies, and rate limits
wrangler.jsonc        Pages output and D1/R2 binding configuration
php/                  legacy self-hosted PHP backend; not used by Pages
assets/images/        locally cached wedding photographs and share image (JPG)
assets/favicon.svg    the wax-seal monogram
```

## The typography system (four voices, four jobs)

| Voice | Font | Used for |
|-------|------|----------|
| Editorial | Bodoni Moda | dates, section headings, venue name, countdown |
| Romantic serif | Cormorant Garamond | prose, leads, values, italic phrases |
| Expressive | Pinyon Script | **only** the couple's names & signature words |
| Handwritten | La Belle Aurore | photo captions, scrapbook notes |
| Functional | Jost | labels, navigation, buttons, forms |

All five load from Google Fonts via a single `<link>` in `index.html`; if it
fails, the site falls back to system serifs and stays fully usable.

## Personalise (10 minutes)

Open **`customize.html`** in a browser to use the visual editor. For the
complete live workflow locally, run the Pages Functions runtime:

```
npx wrangler pages dev .
# open http://127.0.0.1:8788/customize.html
```

The sidebar is reserved for shared details that repeat across the invitation:
the couple's names and monogram, venue name, wedding date/time, calendar event
timing, location search or Maps URL, and the overall colour palette. Date and
time controls use native date/time pickers; the numerals and displayed date
copy follow the selected event start. Edit unique wording directly on the live
page by clicking it. The navigation is intentionally not directly editable.

Click any invitation photo to reveal **Replace image**. In the Visual Diary,
click the displayed caption or folio to edit it, and click a photograph to
replace that specific image. Wedding-day words and countdown copy are edited
in place; the countdown itself recalculates from the shared event start time.
The location name or address updates **View Location** automatically. Use
**Choose location on Google Maps** to open a Maps search, then paste a selected
place's URL into the optional Maps URL field to use that exact pin. The
calendar download and Google Calendar link use the shared start/end date and
the venue details. Changes update the preview as you work. Use
**Publish invitation** once to create a shareable link. Subsequent text,
image, palette, date and RSVP-email edits are saved automatically; visitors
with the live link see changes within a few seconds. The owner edit key stays
in the browser that published it, so return to
`customize.html?edit=YOUR_INVITATION_ID` on that browser to continue editing.
Keep the browser's site data or save the optional JSON backup.

Uploaded images are resized to a maximum 2000px edge and uploaded to R2 when
publishing or saving. The invitation record stores the resulting image URL,
not the image bytes. The social-sharing image should be a publicly hosted
absolute URL so link previews can fetch it.

The sample config can also be edited by hand:

1. **`js/config.js`** — names, initials, wedding start and end times (ISO with
   UTC offset), venue & address, map query, the itinerary list, RSVP deadline,
   guest allowance, and the optional ambient music file.
2. **Photographs** — replace the files in `assets/images/` with your own
   (keep the same file names, or update the image sources and the
   `width`/`height` attributes). The bundled wedding images are illustrative
   Unsplash photographs, not photographs of this couple.
3. Before publishing, review `index.html` search and social metadata. The
   sample page starts with `noindex, nofollow`; set the appropriate indexing
   policy, canonical URL, absolute Open Graph / Twitter URLs, and share image.

### Dates & the countdown

`wedding.iso` carries an explicit UTC offset — `"2027-09-18T16:00:00+02:00"`
is 4:00 PM in GMT+2. The countdown, the .ics download and the Google
Calendar link are all derived from that one value, so guests in any time
zone see the correct start time. Set `wedding.endIso` to the actual end of the
celebration so calendar saves reserve the right duration. An invalid date
shows a graceful message; a past date switches to the celebration wording.

### Wedding-day words

`HEIRLOOM.moments` is a list of single words displayed in the framed wedding
programme (for example: `["Arrival", "Vows", "Feast", "Dancing"]`).
There are no times or schedule notes in this section. Empty the list (`[]`) to
hide the whole scene, or replace the sample words with moments that suit your
celebration.

### Cloudflare Pages setup

The Cloudflare Pages version uses one hosted application for all invitations.
Each publish creates a unique invitation record and guest URL; the saved
`templateId` identifies the design. The current supported template is
`heirloom-film`. Future templates can be added to the template registry while
continuing to use the same publishing API and database.

1. Install Node.js 18+, create a Cloudflare account, and create a private
   GitHub repository for this project. Push the project to its `main` branch.
   From the project folder, the initial Git setup is:

   ```
   git init
   git add .
   git status
   git commit -m "Prepare invitation for Cloudflare Pages"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   Review `git status` before committing and replace the remote URL with your
   private repository's URL.
2. Authenticate the Cloudflare CLI and create the data resources:

   ```
   npx wrangler login
   npx wrangler d1 create heirloom-invitations
   npx wrangler r2 bucket create heirloom-invitation-images
   ```

   Copy the D1 `database_id` from the command output into
   `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. Apply the database schema:

   ```
   npx wrangler d1 migrations apply heirloom-invitations --remote
   ```

4. In Cloudflare, open **Workers & Pages → Create application → Pages →
   Connect to Git**, authorize GitHub, and select the repository. Use `main`
   as the production branch, select no framework, set
   the build command to `node scripts/build.mjs`, and set the build output
   directory to `dist`.
5. In the Pages project's **Settings → Bindings**, verify or add the D1
   database as `DB` and the R2 bucket as `IMAGES`. If using the optional email
   notification, configure `RESEND_API_KEY` as a secret and `RSVP_FROM` as a
   variable. Redeploy after changing bindings or secrets.
6. Open the deployed `https://PROJECT.pages.dev/customize.html`. The editor
   creates invitations at `https://PROJECT.pages.dev/?invite=INVITATION_ID`.

The `_routes.json` file limits Functions execution to `/api/*`; static page,
script, stylesheet, and image requests remain static assets. Keep the Cloudflare
account and GitHub repository under your control. Never commit API keys.

The local Cloudflare runtime can be started with
`node scripts/build.mjs` followed by `npx wrangler pages dev dist`.
For local database data, apply migrations with
`npx wrangler d1 migrations apply heirloom-invitations --local`. The D1 and
R2 bindings must be configured for local or remote use; see `wrangler.jsonc`
and Cloudflare's Pages Functions binding settings.

The build copies only public frontend files into `dist`; PHP sources,
migrations, configuration, and function source are not exposed as static
downloads.

The current public flow has no purchase activation or customer account yet:
anyone who can access the customizer can publish. Each invitation has a
private edit token stored in the publisher's browser. Keep that browser's
site data. If it is lost, the current prototype does not have account-based
recovery.

### Publishing and RSVP delivery

`functions/api/publish.js` creates, updates, loads, and manages invitation
records in D1. Owner tokens are generated randomly; only their SHA-256 hashes
are stored. The public invitation endpoint excludes the private recipient
email and owner token. Public invitations check for changed revisions every
three seconds.

`functions/api/images.js` uploads resized images to R2. Image keys are
unpredictable and served by `functions/api/images/[key].js`. Uploads are
limited to 5 MB each and rate-limited per connecting IP.

`functions/api/rsvp.js` validates replies, enforces the invitation's guest
limit, applies a per-IP rate limit, and stores replies in D1. The invitation
owner can view the latest 100 responses by reopening the invitation editor.
Email notifications are optional. To enable them, configure a Resend API key
as the `RESEND_API_KEY` secret and a verified sender as `RSVP_FROM` in the
Pages project's environment variables. Without these values, RSVPs are still
stored in D1 and are viewable in the editor, but no email notification is
sent. Resend requires a verified sending domain; the free `pages.dev` address
does not satisfy that requirement.

Cloudflare plan allowances and provider terms can change. Monitor D1, R2, and
Functions usage before offering high-volume or permanent hosting guarantees.

### Legacy PHP backend

The `php/` directory remains for deployments to PHP hosts. Cloudflare Pages
does not execute PHP; the Pages site uses the `functions/` implementation
instead. Do not expect `php/publish.php` or `php/rsvp.php` to run on Pages.

## Accessibility & resilience

- The envelope is a real `<button>`; the opening is also reachable via the
  "Open the Invitation" control, the skip link, or the Escape key.
- `prefers-reduced-motion` swaps the choreography for a quiet fade; every
  fact is readable without any motion.
- Without JS the cover becomes the first section of an ordinary, fully
  readable page; a watchdog reveals the site even if a script fails to load.
- If the GSAP CDN is unreachable, a pure-CSS keyframe sequence opens the
  envelope instead. No icon library is used — every ornament is inline SVG.
- Images are lazy-loaded with explicit dimensions (no layout shift) and
  descriptive alt text.

## Photography notice

The Visual Diary photographs (`diary-01.jpg` through `diary-09.jpg`) are
downloaded from Unsplash and used under the
[Unsplash License](https://unsplash.com/license). They are illustrative
wedding imagery, not photographs of the couple. Their original Unsplash CDN
photo IDs are recorded below for provenance:

| File | Unsplash photo ID |
|------|-------------------|
| `diary-01.jpg` | `photo-1519741497674-611481863552` |
| `diary-02.jpg` | `photo-1511285560929-80b456fea0bc` |
| `diary-03.jpg`, `og-image.jpg` | `photo-1537633552985-df8429e8048b` |
| `diary-04.jpg` | `photo-1529636798458-92182e662485` |
| `diary-05.jpg`, `details-table.jpg` | `photo-1511795409834-ef04bbd61622` |
| `diary-06.jpg` | `photo-1523438885200-e635ba2c371e` |
| `diary-07.jpg` | `photo-1532712938310-34cb3982ef74` |
| `diary-08.jpg` | `photo-1515934751635-c81c6bc9a2d8` |
| `diary-09.jpg` | `photo-1469371670807-013ccf25f16a` |
| `story-01.jpg` | `photo-1520854221256-17451cc331bf` |
| `story-02.jpg` | `photo-1762319981432-609103ab4a75` |
| `story-03.jpg` | `photo-1460978812857-470ed1c77af0` |
| `venue-feature.jpg` | `photo-1519225421980-715cb0215aed` |

These illustrative photos do not depict the couple. Replace them with images
you have permission to publish before sharing the invitation with guests.
