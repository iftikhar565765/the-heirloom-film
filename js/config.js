/* ═══════════════════════════════════════════════════════════════
   THE HEIRLOOM FILM · config.js
   ---------------------------------------------------------------
   Main personalisation data for the site and visual editor.
   Longer copy, imagery, palette, and theme are editable here.
   Values marked SAMPLE are tasteful placeholders — replace them
   with your own before sending the link to your guests.
   ═══════════════════════════════════════════════════════════════ */

window.HEIRLOOM = {
  templateId: "heirloom-film",

  /* ── The couple — SAMPLE content, replace with your names ────── */
  couple: {
    partnerOne: "Amelia",                    // SAMPLE
    partnerTwo: "Julien",                   // SAMPLE
    initials:  "A · J",                     // SAMPLE — used on seals & monograms
    namesLine: "Amelia & Julien"            // SAMPLE — used across the site
  },

  /* ── The wedding date & time ─────────────────────────────────
     iso : ISO 8601 date-time WITH an explicit UTC offset, so the
           countdown and the calendar files are correct on every
           guest's device, wherever they are in the world.
           Format: "YYYY-MM-DDTHH:MM:SS±HH:MM"
           The sample below = 18 Sept 2027, 4:00 PM, GMT+2 (CEST).
     display / words / numerals : how the date reads in the copy. */
  wedding: {
    iso: "2027-09-18T16:00:00+02:00",                              // EDIT
    endIso: "2027-09-19T00:00:00+02:00",                           // EDIT — end of the celebration
    display: "Saturday, 18 September 2027 · 4:00 PM",              // EDIT
    zoneLabel: "GMT+2",                                            // EDIT
    words: "Saturday · The Eighteenth of September · Two Thousand Twenty-Seven", // EDIT
    numerals: "18 · 09 · 2027",                                    // EDIT
    eventTitle: "Amelia & Julien — Wedding"                        // EDIT (calendar entry)
  },

  /* ── The venue ──────────────────────────────────────────────── */
  venue: {
    name: "The Linden Estate",                    // SAMPLE
    address: "12 Linden Lane, Willowbrook",       // SAMPLE
    mapsQuery: "",                                // optional Maps search override
    /* A full URL here overrides the map link built above, e.g. an
       exact Google Maps place link or an Apple Maps URL.          */
    mapUrl: ""
  },

  /* ── Copy shown throughout the invitation ────────────────────
     The visual editor can change these values without editing HTML. */
  content: {
    pageTitle: "Amelia & Julien · 18 September 2027 — A Love Letter",
    pageDescription: "Amelia and Julien request the pleasure of your company at The Linden Estate, Willowbrook, on Saturday the eighteenth of September 2027. Open your invitation.",
    socialTitle: "Amelia & Julien — An Invitation · 18.09.2027",
    socialDescription: "An heirloom envelope, a wax seal, and a love story — you are cordially invited.",
    navStory: "Story",
    navPhotos: "Photos",
    navDetails: "Details",
    navVenue: "Venue",
    navRsvp: "RSVP",
    menuInvitation: "The Invitation",
    menuStory: "Our Story",
    menuPhotos: "The Visual Diary",
    menuSaveDate: "Save the Date",
    menuDetails: "The Details",
    menuPalette: "The Palette",
    menuWeddingDay: "The Wedding Day",
    menuVenue: "Venue & Location",
    menuRsvp: "Kindly Respond",
    menuCountdown: "The Countdown",
    menuClosing: "A Closing Note",
    openingEyebrow: "A love letter from",
    openingHint: "You are cordially invited",
    openButton: "Open the Invitation",
    skipButton: "Skip straight to the invitation",
    envelopeAddress: "friends & family",
    invitationEyebrow: "Together with their families",
    invitationLead: "request the honour of your presence as they exchange vows and begin their greatest adventure together.",
    invitationVenueSuffix: "· Willowbrook",
    storyKicker: "№ 02 · Their Story",
    storyTitle: "Our",
    storyTitleScript: "Story",
    storyParagraphOne: "Every love story deserves a beautiful beginning, and ours started in the most ordinary of places — a crowded bookshop, a shared table, and one conversation neither of us wanted to end.",
    storyParagraphTwo: "Three cities, a thousand small adventures and one borrowed umbrella later, we are finally writing the chapter we always dreamed of. We would love nothing more than to have you beside us as we turn the page.",
    storyNote: "somewhere between hello & forever",
    storyNoteCredit: "— a note we keep returning to",
    storyCaptionOne: "the first chapter",
    storyCaptionTwo: "always, us",
    storyCaptionFour: "the long way home",
    storyAltOne: "Illustrative close-up of a bride's lace-sleeved hand resting in the groom's hand",
    storyAltTwo: "Illustrative reception photograph of a bride celebrating with her guests",
    storyAltThree: "Illustrative wedding table with a small floral arrangement and place settings",
    storyAltFour: "A newlywed couple walking together through a mountain meadow at sunset",
    storyAside: "the beginning of always",
    visualDiaryEyebrow: "The Visual Diary",
    visualDiaryTitle: "A story told in",
    visualDiaryScript: "quiet stills",
    visualDiaryLead: "Some moments are too soft for words — they live best in photographs. Move through them slowly, the way you would turn the pages of a family album.",
    visualDiarySwipeHint: "swipe them gently, either way",
    visualDiaryScrollHint: "keep scrolling — the album turns itself",
    visualDiaryEndNote: "the rest is still unfolding —",
    visualDiaryRestart: "begin again",
    diaryCaption01: "a bouquet gathered before the vows",
    diaryCaption02: "the whole gathering sent them into the sky",
    diaryCaption03: "the shoreline held their quiet portrait",
    diaryCaption04: "the bouquet, just before the walk",
    diaryCaption05: "summer flowers gathered around the table",
    diaryCaption06: "the aisle before anyone arrived",
    diaryCaption07: "one last walk through the hills",
    diaryCaption08: "two rings, tucked among the petals",
    diaryCaption09: "",
    diaryAlt01: "A bride holding a bouquet of white and blush flowers",
    diaryAlt02: "A newlywed couple releasing balloons as guests gather around a pool",
    diaryAlt03: "A bride and groom embracing on a pebble beach",
    diaryAlt04: "A bride's bouquet of pink and cream roses against her wedding dress",
    diaryAlt05: "A wedding table set with flowers, candles, and crystal glasses",
    diaryAlt06: "An outdoor wedding ceremony set beneath a flower-decorated gazebo",
    diaryAlt07: "A bride and groom walking together through a mountain meadow at sunset",
    diaryAlt08: "Two wedding rings resting among soft pink and white flowers",
    diaryAlt09: "A garden wedding aisle framed by a bouquet of roses",
    diaryFolio01: "no. i",
    diaryFolio02: "no. ii",
    diaryFolio03: "no. iii",
    diaryFolio04: "no. iv",
    diaryFolio05: "no. v",
    diaryFolio06: "no. vi",
    diaryFolio07: "no. vii",
    diaryFolio08: "no. viii",
    diaryFolio09: "no. ix",
    saveDateTitle: "Save the Date",
    saveDateCrossing: "forever is coming",
    saveDateNote: "The date is set. Add it to your calendar and keep these details close.",
    calendarDownloadLabel: "Add to Calendar",
    calendarGoogleLabel: "Google Calendar",
    detailsKicker: "№ 04 · The Particulars",
    detailsTitleFirst: "Wedding",
    detailsTitleSecond: "Details",
    detailsIntro: "The day, at a glance.",
    ceremonyLabel: "The Ceremony",
    ceremonyTime: "Four o'clock",
    ceremonyNote: "Vows beneath the linden trees, weather kindly permitting.",
    receptionLabel: "The Reception",
    receptionTime: "Six thirty",
    receptionNote: "Dinner, speeches and dancing in the orangery.",
    kindlyReplyLabel: "Kindly Reply",
    kindlyReplyNote: "Please send your response using the card below.",
    paletteKicker: "№ 05 · A Note on Colour",
    paletteTitleFirst: "The wedding",
    paletteTitleSecond: "palette",
    paletteIntro: "A study in garden greens, softened rose and candlelit neutrals — chosen to feel at home beneath the linden trees.",
    dressCodeLabel: "Attire · Garden celebration",
    dressCodeTitle: "Garden formal",
    dressCodeNote: "A little dressed up, a little garden-ready. Soft tones are welcome, but the palette is only a suggestion — wear what makes you feel wonderful.",
    weddingDayKicker: "№ 06 · The Celebration",
    weddingDayTitleFirst: "The Wedding",
    weddingDayTitleSecond: "Day",
    venueKicker: "№ 07 · The Place",
    venueDescription: "A storied country estate wrapped in rose gardens and old linden trees — where candlelit dinners drift slowly into long summer evenings.",
    venueCeremonyLabel: "Ceremony",
    venueCeremonyText: "in the garden, at four o'clock",
    venueReceptionLabel: "Reception",
    venueReceptionText: "dinner & dancing in the orangery",
    mapButton: "View Location",
    rsvpKicker: "№ 08 · Your Reply",
    rsvpTitle: "Kindly Respond",
    rsvpLead: "Kindly reply by",
    rsvpNameLabel: "Your name",
    rsvpNamePlaceholder: "e.g. Eleanor Whitmore",
    rsvpNameError: "May we have your name? Two letters or more will do.",
    rsvpEmailLabel: "Email address",
    rsvpEmailPlaceholder: "you@example.com",
    rsvpEmailError: "That email address does not look quite right.",
    rsvpAttendanceLabel: "Will you be joining us?",
    rsvpAcceptLabel: "Joyfully accepts",
    rsvpDeclineLabel: "Regretfully declines",
    rsvpAttendanceError: "Please let us know whether you can come.",
    rsvpGuestsLabel: "Seats in your party",
    rsvpGuestSingular: "guest",
    rsvpGuestPlural: "guests",
    rsvpDietaryLabel: "Dietary requirements",
    rsvpDietaryPlaceholder: "Allergies, intolerances, or dishes to avoid",
    rsvpMessageLabel: "A note for the couple",
    rsvpMessagePlaceholder: "Song requests, memories, well wishes…",
    rsvpSubmitLabel: "Send Response",
    rsvpAmendLabel: "Amend the reply",
    countdownDaysLabel: "Days",
    countdownHoursLabel: "Hours",
    countdownMinutesLabel: "Minutes",
    countdownSecondsLabel: "Seconds",
    countdownKicker: "№ 09 · Counting the Moments",
    countdownTitle: "until we say",
    countdownPromise: "“I do”",
    closingScript: "with all our love",
    closingMessage: "Thank you, from the bottom of our hearts, for being part of our story. We cannot wait to celebrate with you beneath the linden trees.",
    footerTagline: "A day together, forever held."
  },

  images: {
    social: "assets/images/og-image.jpg",
    storyOne: "assets/images/story-01.jpg",
    storyTwo: "assets/images/story-02.jpg",
    storyThree: "assets/images/story-03.jpg",
    storyFour: "assets/images/diary-07.jpg",
    details: "assets/images/details-table.jpg",
    venue: "assets/images/venue-feature.jpg",
    diary01: "assets/images/diary-01.jpg",
    diary02: "assets/images/diary-02.jpg",
    diary03: "assets/images/diary-03.jpg",
    diary04: "assets/images/diary-04.jpg",
    diary05: "assets/images/diary-05.jpg",
    diary06: "assets/images/diary-06.jpg",
    diary07: "assets/images/diary-07.jpg",
    diary08: "assets/images/diary-08.jpg",
    diary09: "assets/images/diary-09.jpg"
  },
  palette: [
    { name: "Ivory", color: "#EFE7D8" },
    { name: "Linden", color: "#777957" },
    { name: "Rose", color: "#C5A0A0" },
    { name: "Oxblood", color: "#5D2029" },
    { name: "Champagne", color: "#CDBB9A" }
  ],
  theme: "burgundy",
  themeColors: {},
  fonts: {
    editorial: "bodoni",
    display: "cormorant",
    script: "pinyon",
    hand: "la-belle",
    body: "jost"
  },

  /* ── Wedding-day moments — SAMPLE words for the wedding programme.
     Use one short word per entry; an empty list hides the section. */
  moments: ["Arrival", "Vows", "Gathering", "Feast", "Toasts", "Cake", "Dancing"],

  /* ── RSVP ─────────────────────────────────────────────────────
     endpoint : leave "" for the honest demonstration mode — the
                form validates and shows a preview of the reply and
                states clearly that nothing is sent or stored.
                Cloudflare's publishing service supplies the invitation-
                specific RSVP endpoint to public invitation pages.
     maxGuests: the number allowed by the invitation.
     deadline  : shown above the form.                                  */
  rsvp: {
    endpoint: "",
    maxGuests: 2,
    deadline: "the first of August, 2027"           // SAMPLE
  },

  /* ── Countdown wording (invalid or passed dates) ─────────────── */
  countdown: {
    invalidMessage: "The exact hour is still being sealed in wax — see the details below.",
    pastMessage: "The celebration has begun — thank you for being part of our story."
  },

  /* ── Optional ambient music ───────────────────────────────────
     Drop a small looping file at assets/audio/theme.mp3 and set
     src to enable the volume toggle in the navigation. Never
     autoplays; stays silent if the file is missing.                  */
  audio: {
    src: ""             // e.g. "assets/audio/theme.mp3"
  }
};
