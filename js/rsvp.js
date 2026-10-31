/* ═══════════════════════════════════════════════════════════════
   THE HEIRLOOM FILM · rsvp.js
   The response card.
   · Endpoint mode  — POSTs JSON to the configured URL, reports
     real success and failure states.
   · Demo mode (default) — validates locally and shows a preview
     of the reply with an explicit statement that nothing was
     sent or stored. Never pretends a reply was received.
   Guests answer with a name, an attendance choice, a seat count
   (a stepped number field) and optional notes — no email asked.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var cfg = (window.HEIRLOOM && window.HEIRLOOM.rsvp) || {};
  var endpoint = typeof cfg.endpoint === 'string' ? cfg.endpoint.trim() : '';
  var configuredMaxGuests = Number(cfg.maxGuests);
  var maxGuests = isFinite(configuredMaxGuests) && configuredMaxGuests >= 1
    ? Math.floor(configuredMaxGuests)
    : 2;

  var form = document.getElementById('rsvp-form');
  var preview = document.getElementById('rsvp-preview');
  var status = document.getElementById('rsvp-status');
  var demoNote = document.getElementById('rsvp-demo-note');
  if (!form || !preview) return;

  var summaryEl = preview.querySelector('.rsvp__summary');
  var previewNote = preview.querySelector('.rsvp__demo-note');
  var editBtn = document.getElementById('rsvp-edit');
  var submitBtn = document.getElementById('rsvp-submit');
  var liveRegion = document.getElementById('rsvp-live');

  var nameInput = document.getElementById('rsvp-name');
  var attendanceInputs = form.querySelectorAll('input[name="attendance"]');
  var guestsInput = document.getElementById('rsvp-guests');
  var dietaryInput = document.getElementById('rsvp-dietary');
  var messageInput = document.getElementById('rsvp-message');

  /* ── honour the invitation's allowance ────────────────────────── */
  function configureGuestInput() {
    if (!guestsInput) return;
    guestsInput.max = String(maxGuests);
    guestsInput.min = '1';
    guestsInput.step = '1';
    var current = parseInt(guestsInput.value, 10);
    if (!isFinite(current) || current < 1) guestsInput.value = '1';
    if (current > maxGuests) guestsInput.value = String(maxGuests);
  }
  configureGuestInput();

  document.addEventListener('heirloom:config-updated', function () {
    var next = window.HEIRLOOM && window.HEIRLOOM.rsvp || {};
    endpoint = typeof next.endpoint === 'string' ? next.endpoint.trim() : '';
    configuredMaxGuests = Number(next.maxGuests);
    maxGuests = isFinite(configuredMaxGuests) && configuredMaxGuests >= 1
      ? Math.floor(configuredMaxGuests)
      : 2;
    configureGuestInput();
    if (demoNote) demoNote.hidden = !!endpoint;
    if (previewNote) previewNote.hidden = !!endpoint;
  });

  /* In endpoint mode the demonstration notice is removed — the
     reply is really going somewhere.                                   */
  if (endpoint) {
    if (demoNote) demoNote.hidden = true;
    if (previewNote) previewNote.hidden = true;
  }

  /* ── field error helpers ─────────────────────────────────────── */
  function setError(key, invalid) {
    var err = document.getElementById('err-' + key);
    if (err) err.hidden = !invalid;
    var wrap = document.getElementById('field-' + key);
    if (wrap) wrap.classList.toggle('is-invalid', invalid);
    var input = key === 'attendance' ? attendanceInputs[0]
              : key === 'name' ? nameInput
              : key === 'guests' ? guestsInput : null;
    if (input) input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function validName() { return nameInput.value.trim().length >= 2; }
  function guestCount() {
    var value = parseInt(guestsInput.value, 10);
    return isFinite(value) ? value : 0;
  }
  function validGuests() {
    var value = guestCount();
    return Number.isInteger(value) && value >= 1 && value <= maxGuests;
  }
  function attendanceValue() {
    var chosen = null;
    attendanceInputs.forEach(function (r) { if (r.checked) chosen = r.value; });
    return chosen;
  }

  /* live validation: clear as the guest types, flag on leave */
  nameInput.addEventListener('input', function () { if (validName()) setError('name', false); });
  guestsInput.addEventListener('input', function () { if (validGuests()) setError('guests', false); });
  nameInput.addEventListener('blur', function () { setError('name', !validName()); });
  guestsInput.addEventListener('blur', function () {
    if (guestsInput.value === '') { guestsInput.value = '1'; setError('guests', false); return; }
    setError('guests', !validGuests());
  });
  attendanceInputs.forEach(function (r) {
    r.addEventListener('change', function () { setError('attendance', false); });
  });

  function announce(text, isError) {
    if (!liveRegion) return;
    liveRegion.textContent = text;
    if (status) status.classList.toggle('is-error', !!isError);
  }

  /* ── escape user content before it touches innerHTML ─────────── */
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ── the reply, gathered ─────────────────────────────────────── */
  function collectReply() {
    return {
      name: nameInput.value.trim(),
      email: '',
      attendance: attendanceValue() === 'accepts' ? 'attending' : 'declining',
      guests: guestCount(),
      dietary: dietaryInput.value.trim(),
      message: messageInput.value.trim(),
      website: (document.getElementById('rsvp-website') || {}).value || ''
    };
  }

  /* ── preview card (demo mode & post-submit confirmation) ─────── */
  function renderPreview(reply, isDemo) {
    summaryEl.innerHTML =
      '<div><dt>Name</dt><dd>' + esc(reply.name) + '</dd></div>' +
      '<div><dt>Reply</dt><dd>' +
        (reply.attendance === 'attending' ? 'Joyfully accepts' : 'Regretfully declines') +
      '</dd></div>' +
      (reply.attendance === 'attending'
        ? '<div><dt>Party</dt><dd>' + reply.guests + (reply.guests === 1 ? ' guest' : ' guests') + '</dd></div>'
        : '') +
      '<div><dt>Dietary</dt><dd>' + (reply.dietary ? esc(reply.dietary) : '—') + '</dd></div>' +
      '<div><dt>Note</dt><dd>' + (reply.message ? esc(reply.message) : '—') + '</dd></div>';

    if (previewNote && !isDemo) previewNote.hidden = true; /* a real reply was stored */
    form.hidden = true;
    preview.hidden = false;
    if (!preview.hasAttribute('role')) preview.setAttribute('role', 'status');
    preview.setAttribute('tabindex', '-1');
    try { preview.focus({ preventScroll: false }); } catch (e) { preview.focus(); }
  }

  /* ── submit ───────────────────────────────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var bad = [];
    if (!validName()) { setError('name', true); bad.push(nameInput); }
    if (!validGuests()) { setError('guests', true); bad.push(guestsInput); }
    if (!attendanceValue()) { setError('attendance', true); bad.push(attendanceInputs[0]); }

    if (bad.length) {
      announce('A few details are missing — please check the highlighted fields.', true);
      try { bad[0].focus({ preventScroll: false }); } catch (err) { bad[0].focus(); }
      return;
    }

    var reply = collectReply();

    /* ── Demo mode — honest, local, no network calls at all ── */
    if (!endpoint) {
      renderPreview(reply, true);
      announce('Reply preview ready. Nothing has been sent or stored — this is a demonstration.');
      return;
    }

    /* ── Endpoint mode — a real submission ──────────────────── */
    submitBtn.disabled = true;
    submitBtn.dataset.label = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    announce('Sending your reply…');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(reply)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('The response could not be delivered.');
        return res.json().catch(function () { return {}; });
      })
      .then(function (result) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.label || 'Send Response';
        renderPreview(reply, false);
        announce(result && result.emailSent === false
          ? 'Your reply has been saved, but an email notification was not sent.'
          : 'Thank you — your reply has been received.');
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.label || 'Send Response';
        announce('We could not deliver your reply just now. Please try again in a moment — ' +
                  'or contact the couple directly.', true);
      });
  });

  /* ── amend the reply ──────────────────────────────────────────── */
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      preview.hidden = true;
      form.hidden = false;
      announce('');
      try { nameInput.focus({ preventScroll: false }); } catch (e) { nameInput.focus(); }
    });
  }

})();
