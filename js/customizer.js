(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     THE HEIRLOOM FILM · customizer.js
     ---------------------------------------------------------------
     A guided seven-step studio. One decision at a time, a live
     proof beside every field, and everything saved automatically.
     Research notes behind the shape of this file:
       · staged disclosure (one chapter visible, NN/g) — the flow
       · ≤ 2 disclosure levels — each step keeps one “fine-tune”
       · curated choices, not catalogues — theme & typeface cards
       · derived fields are computed, never asked (dates)
       · status is always visible (NN/g heuristic I)
     ═══════════════════════════════════════════════════════════════ */

  var sourceConfig = window.HEIRLOOM;
  var stepsHost = document.getElementById('flow-steps');
  var frame = document.getElementById('invitation-preview');
  var loading = document.getElementById('preview-loading');
  var hint = document.getElementById('save-hint');
  var colorAction = document.getElementById('canvas-color-action');
  var colorActionLabel = document.getElementById('canvas-color-label');
  var textColorInput = document.getElementById('canvas-text-color');
  var bgColorInput = document.getElementById('canvas-bg-color');
  var textGroup = document.getElementById('canvas-text-group');
  var bgGroup = document.getElementById('canvas-bg-group');
  var resetElementColorsButton = document.getElementById('reset-element-colors');
  var removeElementButton = document.getElementById('remove-element');
  var closeTooltipButton = document.getElementById('close-color-tooltip');
  var headerSaveStatus = document.getElementById('header-save-status');
  var headerSaveLabel = document.getElementById('header-save-label');
  var accessCodeRow = document.getElementById('access-code-row');
  var accessCodeInput = document.getElementById('access-code');
  var pendingPublishAfterCode = false;
  if (!sourceConfig || !stepsHost || !frame) {
    if (hint) hint.textContent = 'The editor could not load its configuration or preview.';
    return;
  }

  /* ── state ─────────────────────────────────────────────────── */

  var defaults = clone(sourceConfig);
  var config = clone(sourceConfig);
  var previewReady = false;
  var hintTimer = null;
  var currentStep = 1;
  var fineTuneOpen = {};
  var fieldSyncs = [];

  var selectedColorSelector = '';
  var selectedColorDefaults = null;
  var selectedColorKey = '';
  var selectedColorSwatchIndex = null;
  var selectedColorRemovable = false;
  var elementLabels = {
    'opening-watermark': 'Opening watermark',
    'opening-eyebrow': 'Opening introduction',
    'opening-names': 'Opening names',
    'envelope-lace': 'Envelope lace',
    'envelope-shadow': 'Envelope shadow',
    'envelope-letter': 'Envelope letter',
    'envelope-address': 'Envelope address',
    'envelope-flap': 'Envelope flap',
    'envelope-stamps': 'Postage stamps',
    'envelope-seal': 'Wax seal',
    'opening-hint': 'Invitation hint',
    'open-button': 'Open button',
    'folio-quote': 'Keepsake quote card',
    'folio-note-one': 'Folio note i',
    'folio-note-two': 'Folio note ii',
    'folio-note-three': 'Folio note iii',
    'story-garland-top': 'Story garland',
    'story-garland-bottom': 'Story garland (bottom)',
    'story-caption': 'Story inscription',
    'story-note': 'Story handwritten note',
    'story-keepsake': 'Stamp & postmark',
    'std-note': 'Save-the-date note',
    'std-seal': 'Save-the-date seal',
    'detail-ceremony': 'Details · ceremony',
    'detail-reception': 'Details · reception',
    'detail-reply': 'Details · kindly reply',
    'details-art': 'Details ornamental crest',
    'details-art-frame': 'Crest · plate frame',
    'details-art-arch': 'Crest · linden wreath',
    'details-art-drop': 'Crest · hanging drop',
    'details-art-rings': 'Crest · wedding rings',
    'details-art-mono': 'Crest · monogram',
    'details-art-date': 'Crest · date ribbon',
    'details-art-sparkles': 'Crest · sparkles',
    'palette-dresscode': 'Dress code card',
    'palette-swatches': 'Palette swatches',
    'day-words': 'Wedding-day words',
    'rsvp-watermark': 'RSVP watermark',
    'rsvp-ornament': 'RSVP ornament',
    'countdown-clock': 'Countdown clock',
    'closing-garland': 'Closing garland',
    'closing-message': 'Closing message',
    'closing-seal': 'Closing wax seal',
    'venue-ornament': 'Venue ornament',
    'footer-ornament': 'Footer ornament'
  };

  function labelForKey(key) {
    return elementLabels[key] ||
      (key ? key.replace(/-/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); }) : 'Selected element');
  }

  var publishId = '';
  var ownerToken = '';
  var publishRevision = 0;
  var lastSavedSnapshot = '';
  var blockedSnapshot = '';
  var saveTimer = null;
  var saveInFlight = false;
  var managedLoading = false;
  var publishButton = document.getElementById('publish-invitation');
  var finishPublishButton = document.getElementById('publish-invitation-finish');
  var publishedLink = document.getElementById('published-link');
  var publishedUrl = document.getElementById('published-url');
  var copyPublishedUrl = document.getElementById('copy-published-url');
  var manageInvitation = document.getElementById('manage-invitation');
  var openPreview = document.getElementById('open-preview');
  var viewReplies = document.getElementById('view-replies');
  var viewRepliesPanel = document.getElementById('view-replies-panel');
  var openRepliesPage = document.getElementById('open-replies-page');
  var submissionsButton = document.getElementById('submissions-button');
  var headerPublished = document.getElementById('header-published');
  var headerPublishedUrl = document.getElementById('header-published-url');
  var headerCopyPublishedUrl = document.getElementById('header-copy-published-url');
  var headerSubmissionsButton = document.getElementById('header-submissions-button');
  var restoreRemovedButton = document.getElementById('restore-removed');

  /* ── small helpers ─────────────────────────────────────────── */

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function getPath(path) {
    return path.split('.').reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, config);
  }

  function setPath(path, value) {
    var keys = path.split('.');
    var target = config;
    for (var i = 0; i < keys.length - 1; i++) target = target[keys[i]];
    target[keys[keys.length - 1]] = value;
  }

  /* Every field registers a sync function, so an edit made on the
     invitation itself updates the matching control in the flow.    */
  function registerSync(path, fn) {
    fieldSyncs.push({ path: path, fn: fn });
  }

  function syncGlobalField(path, value) {
    fieldSyncs.forEach(function (entry) {
      if (entry.path === path) entry.fn(value);
    });
  }

  /* ── date helpers ──────────────────────────────────────────── */

  function localDateTime(value) {
    var match = typeof value === 'string' &&
      value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return match ? match[1] : '';
  }

  function datePart(value) {
    var match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  function timePart(value) {
    var local = localDateTime(value);
    return local ? local.slice(11) : '';
  }

  function offsetPart(value) {
    var match = typeof value === 'string' && value.match(/(Z|[+-]\d{2}:\d{2})$/);
    if (match) return match[1] === 'Z' ? '+00:00' : match[1];
    var offset = -new Date().getTimezoneOffset();
    return (offset < 0 ? '-' : '+') +
      String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0') + ':' +
      String(Math.abs(offset) % 60).padStart(2, '0');
  }

  function storedDateTime(value, previousValue) {
    return value ? value + ':00' + offsetPart(previousValue) : '';
  }

  function dateDeltaDays(previousValue, nextValue) {
    var previousDate = datePart(previousValue);
    var nextDate = datePart(nextValue);
    if (!previousDate || !nextDate) return 0;
    return (Date.parse(nextDate + 'T12:00:00Z') -
      Date.parse(previousDate + 'T12:00:00Z')) / 86400000;
  }

  function shiftDateTime(value, days) {
    var local = localDateTime(value);
    if (!local || !days) return value;
    var shifted = new Date(Date.parse(local.slice(0, 10) + 'T12:00:00Z') + days * 86400000);
    var date = shifted.toISOString().slice(0, 10);
    return storedDateTime(date + local.slice(10), value);
  }

  function todayLocal() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function updateDerivedDateFields() {
    var local = localDateTime(config.wedding.iso);
    if (!local) return;
    var parts = local.slice(0, 10).split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
    var weekday = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(date);
    var month = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(date);
    var hourMinute = local.slice(11).split(':').map(Number);
    var hour = hourMinute[0] % 12 || 12;
    var time = hour + ':' + String(hourMinute[1]).padStart(2, '0') +
      (hourMinute[0] < 12 ? ' AM' : ' PM');
    config.wedding.display = weekday + ', ' + parts[2] + ' ' + month + ' ' + parts[0] + ' · ' + time;
    config.wedding.numerals = String(parts[2]).padStart(2, '0') + ' · ' +
      String(parts[1]).padStart(2, '0') + ' · ' + parts[0];
    config.wedding.words = weekday + ' · ' + parts[2] + ' ' + month + ' · ' + parts[0];
  }

  function isMapUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }

  /* ── status & notification ─────────────────────────────────── */

  function notify(message) {
    if (hint) hint.textContent = message || '';
    setSaveStatus(publishId ? 'editing' : 'preview', publishId ? 'Live · saving as you edit' : 'Draft · visible only to you');
    if (hintTimer) window.clearTimeout(hintTimer);
    if (message) {
      hintTimer = window.setTimeout(function () {
        if (hint) hint.textContent = '';
      }, 5000);
    }
    sendPreview();
    scheduleRemoteSave();
    storePreviewConfig();
    updateShareReadiness();
    updateRestoreVisibility();
  }

  function setSaveStatus(state, message) {
    if (headerSaveLabel) headerSaveLabel.textContent = message;
    if (headerSaveStatus) {
      headerSaveStatus.dataset.state = state;
      headerSaveStatus.setAttribute('aria-label', message);
    }
  }

  function snapshot() {
    return JSON.stringify({ config: config });
  }

  /* The full-page guest preview (?preview=1) reads the latest edits
     straight from this browser, so “See it as a guest” is always
     honest — even before publishing.                               */
  function storePreviewConfig() {
    try { window.localStorage.setItem('heirloom-preview-config', JSON.stringify(config)); }
    catch (error) { /* private mode — the in-editor preview still works */ }
  }

  /* ── publishing & saving ───────────────────────────────────── */

  function requestPublish(data, token) {
    var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) headers['X-Invitation-Token'] = token;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeoutId;
    var timeout = new Promise(function (resolve, reject) {
      timeoutId = window.setTimeout(function () {
        reject(new Error('Publishing timed out. Please check your connection and try again.'));
        if (controller) controller.abort();
      }, 30000);
    });
    var request = fetch('/api/publish', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.text().then(function (body) {
        var result = null;
        try {
          result = JSON.parse(body);
        } catch (error) {
          if (response.status === 405) {
            throw new Error('The studio is having a brief moment. Please try again in a minute.');
          }
          throw new Error('We could not reach the studio just then. Please try again in a moment.');
        }
        if (!response.ok) {
          var publishError = new Error(result.error || 'The invitation could not be saved.');
          if (result && result.codeRequired) publishError.codeRequired = true;
          throw publishError;
        }
        return result;
      });
    });
    return Promise.race([request, timeout]).finally(function () {
      window.clearTimeout(timeoutId);
    });
  }

  function prepareConfigForPublish() {
    config.templateId = config.templateId || 'heirloom-film';
    sendPreview();
    return Promise.resolve(clone(config));
  }

  function updatePublishedLink(url) {
    if (publishedLink) publishedLink.hidden = false;
    if (publishedUrl) publishedUrl.value = url;
    if (headerPublished) headerPublished.hidden = false;
    if (headerPublishedUrl) headerPublishedUrl.value = url;
    if (manageInvitation) manageInvitation.href = 'customize.html?edit=' + encodeURIComponent(publishId);
    var repliesHref = 'replies.html?edit=' + encodeURIComponent(publishId);
    if (viewReplies) { viewReplies.href = repliesHref; viewReplies.hidden = false; }
    if (viewRepliesPanel) { viewRepliesPanel.href = repliesHref; viewRepliesPanel.hidden = false; }
    if (openRepliesPage) { openRepliesPage.href = repliesHref; openRepliesPage.hidden = false; }
    if (submissionsButton) { submissionsButton.href = repliesHref; submissionsButton.hidden = false; }
    if (headerSubmissionsButton) { headerSubmissionsButton.href = repliesHref; headerSubmissionsButton.hidden = false; }
    if (openPreview) {
      openPreview.href = url;
      openPreview.textContent = 'View published invitation ↗';
    }
  }

  function scheduleRemoteSave() {
    if (!publishId || !ownerToken || snapshot() === lastSavedSnapshot ||
        snapshot() === blockedSnapshot) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(savePublishedChanges, 700);
  }

  function savePublishedChanges() {
    if (saveInFlight || !publishId || !ownerToken || snapshot() === lastSavedSnapshot) return;
    saveInFlight = true;
    if (publishButton) publishButton.disabled = true;
    setSaveStatus('saving', 'Saving your changes…');
    if (hint) hint.textContent = 'Saving your changes…';
    var savedSnapshot = '';
    prepareConfigForPublish().then(function (preparedConfig) {
      savedSnapshot = snapshot();
      return requestPublish({
        action: 'save',
        id: publishId,
        config: preparedConfig
      }, ownerToken);
    }).then(function (result) {
      publishRevision = result.revision;
      lastSavedSnapshot = savedSnapshot;
      blockedSnapshot = '';
      updatePublishedLink(result.url);
      if (snapshot() !== lastSavedSnapshot) scheduleRemoteSave();
      else {
        if (hint) hint.textContent = 'All changes saved.';
        setSaveStatus('saved', 'All changes saved');
      }
    }).catch(function (error) {
      blockedSnapshot = savedSnapshot || snapshot();
      notify('We could not save that last change: ' + error.message);
      setSaveStatus('error', 'Needs your attention');
    }).finally(function () {
      saveInFlight = false;
      if (publishButton && !managedLoading) publishButton.disabled = false;
      if (snapshot() !== lastSavedSnapshot) scheduleRemoteSave();
    });
  }

  function publishInvitation() {
    if (managedLoading || saveInFlight) return;

    if (publishButton) {
      publishButton.disabled = true;
      publishButton.textContent = publishId ? 'Updating invitation…' : 'Publishing…';
    }
    setSaveStatus('publishing', publishId ? 'Updating your invitation…' : 'Publishing your invitation…');
    var publishingSnapshot = '';
    prepareConfigForPublish().then(function (publishingConfig) {
      publishingSnapshot = snapshot();
      var payload = {
        action: 'publish',
        id: publishId,
        config: publishingConfig
      };
      if (getAccessCode()) payload.accessCode = getAccessCode();
      return requestPublish(payload, ownerToken);
    }).then(function (result) {
      pendingPublishAfterCode = false;
      if (accessCodeRow) accessCodeRow.hidden = true;
      publishId = result.id;
      if (result.token) {
        ownerToken = result.token;
        try { window.localStorage.setItem('heirloom-owner:' + publishId, ownerToken); }
        catch (error) { notify('Your invitation is live. This device is in private mode, so it cannot remember your edit link, please keep this tab open.'); }
      }
      publishRevision = result.revision;
      lastSavedSnapshot = publishingSnapshot;
      blockedSnapshot = '';
      updatePublishedLink(result.url);
      renderRsvpResponses([]);
      if (publishButton) publishButton.textContent = 'Publish latest changes';
      if (finishPublishButton) finishPublishButton.hidden = true;
      var url = new URL(window.location.href);
      url.searchParams.set('edit', publishId);
      window.history.replaceState({}, '', url.toString());
      notify('Your invitation is live. Every change you make from now on saves by itself.');
      setSaveStatus('saved', 'Live · changes save by themselves');
      renderRsvpResponses(result.responses || []);
      goStep(7);
      scheduleRemoteSave();
    }).catch(function (error) {
      if (error && error.codeRequired) {
        pendingPublishAfterCode = true;
        goStep(7);
        if (accessCodeRow) {
          accessCodeRow.hidden = false;
          if (accessCodeInput) accessCodeInput.focus();
        }
        notify('This editor is protected by an access code. Paste the code from your purchase to continue.');
        setSaveStatus('preview', 'Access code needed');
      } else {
        notify('We could not publish your invitation: ' + (error && error.message ? error.message : 'please try again in a moment.'));
        setSaveStatus('error', 'Needs your attention');
      }
    }).finally(function () {
      if (publishButton) {
        publishButton.disabled = false;
        publishButton.textContent = publishId ? 'Publish latest changes' : 'Publish invitation';
      }
    });
  }

  function loadManagedInvitation() {
    var editId = new URLSearchParams(window.location.search).get('edit') || '';
    if (!/^[a-f0-9]{24}$/.test(editId)) return;
    managedLoading = true;
    if (publishButton) publishButton.disabled = true;
    try { ownerToken = window.localStorage.getItem('heirloom-owner:' + editId) || ''; }
    catch (error) {
      managedLoading = false;
      if (publishButton) publishButton.disabled = false;
      notify('This device is in private mode, so your saved edit link could not be opened. You can still make changes, please keep this tab open.');
      return;
    }
    if (!ownerToken) {
      managedLoading = false;
      if (publishButton) publishButton.disabled = false;
      notify('This invitation opens on the device where it was created. Open the editor there, or load a saved copy from your files.');
      return;
    }
    fetch('/api/publish?action=manage&id=' + encodeURIComponent(editId), {
      headers: { Accept: 'application/json', 'X-Invitation-Token': ownerToken },
      cache: 'no-store'
    }).then(function (response) {
      return response.json().catch(function () { throw new Error('The invitation settings could not be read.'); })
        .then(function (result) {
          if (!response.ok) throw new Error(result.error || 'The invitation could not be opened.');
          return result;
        });
    }).then(function (result) {
      publishId = result.id;
      publishRevision = result.revision;
      config = result.config;
      lastSavedSnapshot = snapshot();
      blockedSnapshot = '';
      renderFlow();
      updatePublishedLink(window.location.origin + '/?invite=' + encodeURIComponent(publishId));
      renderRsvpResponses(result.responses || []);
      if (publishButton) publishButton.textContent = 'Publish latest changes';
      if (finishPublishButton) finishPublishButton.hidden = true;
      sendPreview();
      notify('Your invitation is open. Edit anything; every change saves by itself.');
      setSaveStatus('saved', 'Live · changes save by themselves');
    }).catch(function (error) {
      notify('We could not open your invitation: ' + error.message);
    }).finally(function () {
      managedLoading = false;
      if (publishButton) publishButton.disabled = false;
    });
  }

  function sendPreview() {
    if (!previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'heirloom:preview',
      config: clone(config)
    }, window.location.origin === 'null' ? '*' : window.location.origin);
  }

  function renderRsvpResponses(responses) {
    var panel = document.getElementById('rsvp-responses');
    var list = document.getElementById('rsvp-responses-list');
    var count = document.getElementById('rsvp-responses-count');
    if (!panel || !list || !count) return;
    list.textContent = '';
    count.textContent = String(responses.length);
    panel.hidden = !publishId;
    if (!responses.length) {
      var empty = document.createElement('li');
      empty.className = 'rsvp-response-empty';
      empty.textContent = 'No replies received yet.';
      list.appendChild(empty);
      return;
    }
    responses.forEach(function (reply) {
      var item = document.createElement('li');
      item.className = 'rsvp-response';
      var title = document.createElement('strong');
      title.textContent = reply.name + ' · ' + (reply.attendance === 'attending' ? 'Attending' : 'Declining');
      var details = document.createElement('span');
      details.textContent = (reply.email ? reply.email + ' · ' : '') +
        reply.guests + (reply.guests === 1 ? ' guest' : ' guests');
      var note = document.createElement('span');
      note.textContent = [reply.dietary, reply.message].filter(Boolean).join(' · ');
      item.appendChild(title);
      item.appendChild(details);
      if (note.textContent) item.appendChild(note);
      list.appendChild(item);
    });
  }

  /* ── field builders ────────────────────────────────────────── */

  function fieldLabel(text, id) {
    var label = el('label', null, text);
    if (id) label.htmlFor = id;
    return label;
  }

  function fieldId(path) {
    return 'f-' + path.replace(/[^a-z0-9]/gi, '-');
  }

  /* A single-line or multi-line text field bound to a config path. */
  function addTextField(parent, opts) {
    var value = getPath(opts.path);
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    var wrapper = el('div', 'field');
    var id = fieldId(opts.path);
    var label = fieldLabel(opts.label, id);
    var input = document.createElement(opts.multiline ? 'textarea' : 'input');
    if (!opts.multiline) input.type = opts.type || 'text';
    if (opts.multiline) input.rows = opts.rows || 3;
    input.id = id;
    input.value = String(value == null ? '' : value);
    input.autocomplete = 'off';
    input.dataset.configPath = opts.path;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener('input', function () {
      setPath(opts.path, input.value);
      if (opts.after) opts.after(input.value);
      notify();
    });
    registerSync(opts.path, function (next) {
      if (document.activeElement !== input) input.value = String(next == null ? '' : next);
    });
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    if (opts.hint) wrapper.appendChild(el('span', 'field-hint', opts.hint));
    parent.appendChild(wrapper);
    return input;
  }

  /* The date & time of the ceremony — two small, familiar controls.
     The written forms (display, numerals, words) are derived, and
     the celebration end follows any change of day automatically.  */
  function addStartDateTime(parent) {
    var row = el('div', 'field--row');
    var dateWrap = el('div', 'field');
    var timeWrap = el('div', 'field');
    var dateInput = el('input');
    dateInput.type = 'date';
    dateInput.id = 'f-wedding-date';
    dateInput.min = todayLocal();
    dateInput.autocomplete = 'off';
    var timeInput = el('input');
    timeInput.type = 'time';
    timeInput.id = 'f-wedding-time';
    timeInput.autocomplete = 'off';

    dateWrap.appendChild(fieldLabel('The date', dateInput.id));
    dateWrap.appendChild(dateInput);
    timeWrap.appendChild(fieldLabel('The ceremony begins', timeInput.id));
    timeWrap.appendChild(timeInput);
    row.appendChild(dateWrap);
    row.appendChild(timeWrap);
    parent.appendChild(row);

    function readBack() {
      if (!dateInput.value || !timeInput.value) return;
      var previousStart = config.wedding.iso;
      var nextStart = storedDateTime(dateInput.value + 'T' + timeInput.value, previousStart);
      var dayDelta = dateDeltaDays(previousStart, nextStart);
      config.wedding.iso = nextStart;
      config.wedding.endIso = shiftDateTime(config.wedding.endIso, dayDelta);
      updateDerivedDateFields();
      updateReadsAs();
      notify();
    }
    dateInput.addEventListener('change', readBack);
    timeInput.addEventListener('change', readBack);

    function syncDate() {
      dateInput.value = datePart(config.wedding.iso);
      timeInput.value = timePart(config.wedding.iso);
      updateReadsAs();
    }
    registerSync('wedding.iso', syncDate);
    syncDate();
    return { dateInput: dateInput, timeInput: timeInput };
  }

  var readsAsValue = null;
  function updateReadsAs() {
    if (!readsAsValue) return;
    var label = config.wedding.display || '';
    var zone = config.wedding.zoneLabel || '';
    readsAsValue.textContent = zone ? label + ' · ' + zone : label;
  }

  function addReadsAs(parent) {
    var box = el('p', 'reads-as', 'Your guests will read');
    var value = el('b');
    box.appendChild(value);
    readsAsValue = value;
    parent.appendChild(box);
    updateReadsAs();
  }

  /* A numeric choice presented as − [n] + — a stepper, because a
     bare number input invites typing surprises.                    */
  function addStepper(parent, opts) {
    var wrap = el('div', 'field');
    wrap.appendChild(fieldLabel(opts.label, fieldId(opts.path)));
    var stepper = el('div', 'stepper');
    var minus = el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'One seat fewer');
    var input = el('input');
    input.type = 'text';
    input.readOnly = true;
    input.setAttribute('aria-live', 'polite');
    input.id = fieldId(opts.path);
    var plus = el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'One seat more');

    function current() {
      var parsed = parseInt(getPath(opts.path), 10);
      return isFinite(parsed) ? parsed : (opts.min || 1);
    }
    function render() {
      var value = current();
      input.value = String(value);
      minus.disabled = value <= (opts.min || 1);
      plus.disabled = value >= (opts.max || 20);
    }
    function move(delta) {
      var next = Math.min(opts.max || 20, Math.max(opts.min || 1, current() + delta));
      if (next === current()) return;
      setPath(opts.path, next);
      render();
      notify();
    }
    minus.addEventListener('click', function () { move(-1); });
    plus.addEventListener('click', function () { move(1); });
    stepper.appendChild(minus);
    stepper.appendChild(input);
    stepper.appendChild(plus);
    wrap.appendChild(stepper);
    if (opts.hint) wrap.appendChild(el('span', 'field-hint', opts.hint));
    registerSync(opts.path, render);
    render();
    parent.appendChild(wrap);
  }

  /* ── fine-tune disclosure (level two — the only one) ───────── */

  function addFineTune(parent, id, label, buildInner) {
    var wrap = el('div', 'finetune');
    wrap.dataset.finetune = id;
    var toggle = el('button', 'finetune__toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', fineTuneOpen[id] ? 'true' : 'false');
    toggle.appendChild(el('span', null, label));
    var chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('viewBox', '0 0 12 12');
    chevron.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 4l4 4 4-4');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    chevron.appendChild(path);
    toggle.appendChild(chevron);
    var body = el('div', 'finetune__body');
    var inner = el('div', 'finetune__inner');
    var clip = el('div');
    clip.appendChild(inner);
    body.appendChild(clip);
    if (fineTuneOpen[id]) wrap.classList.add('is-open');
    toggle.addEventListener('click', function () {
      var open = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      fineTuneOpen[id] = open;
    });
    buildInner(inner);
    wrap.appendChild(toggle);
    wrap.appendChild(body);
    parent.appendChild(wrap);
  }

  function groupLabel(parent, text) {
    parent.appendChild(el('p', 'finetune__group-label', text));
  }

  /* ── chapter builders ──────────────────────────────────────── */

  function buildCoupleStep(body) {
    /* the combined line follows the two names — a derivation, so
       the couple never writes their names twice               */
    function recombine() {
      var one = sampleValue(config.couple.partnerOne) ? config.couple.partnerOne : '';
      var two = sampleValue(config.couple.partnerTwo) ? config.couple.partnerTwo : '';
      config.couple.namesLine = [one, two].filter(Boolean).join(' & ');
      syncGlobalField('couple.namesLine', config.couple.namesLine);
    }
    var grid = el('div', 'field-grid');
    addTextField(grid, { path: 'couple.partnerOne', label: 'Partner one', after: recombine });
    addTextField(grid, { path: 'couple.partnerTwo', label: 'Partner two', after: recombine });
    body.appendChild(grid);
    addFineTune(body, 'names', 'Fine-tune · how the names read', function (inner) {
      addTextField(inner, {
        path: 'couple.namesLine', label: 'Combined names line'
      });
      addTextField(inner, {
        path: 'couple.initials', label: 'Monogram initials',
        hint: 'Two or three letters, for example A·J.'
      });
    });
  }

  function buildDayStep(body) {
    addStartDateTime(body);
    addReadsAs(body);
    addFineTune(body, 'day', 'Fine-tune · the celebration end & details', function (inner) {
      var endWrap = el('div', 'field');
      endWrap.appendChild(fieldLabel('Celebration end · date & time', 'f-end-iso'));
      var endInput = el('input');
      endInput.type = 'datetime-local';
      endInput.id = 'f-end-iso';
      endInput.autocomplete = 'off';
      endInput.value = localDateTime(config.wedding.endIso);
      endInput.addEventListener('change', function () {
        config.wedding.endIso = storedDateTime(endInput.value, config.wedding.endIso);
        notify();
      });
      registerSync('wedding.endIso', function (next) {
        if (document.activeElement !== endInput) endInput.value = localDateTime(next);
      });
      endWrap.appendChild(endInput);
      inner.appendChild(endWrap);
      addTextField(inner, {
        path: 'wedding.zoneLabel', label: 'Time-zone note (optional)'
      });
      addTextField(inner, {
        path: 'wedding.eventTitle', label: 'Calendar event title',
        hint: 'The name of the event when a guest saves the date.'
      });
    });
  }

  function buildPlaceStep(body) {
    var grid = el('div', 'field-grid');
    addTextField(grid, { path: 'venue.name', label: 'The venue' });
    addTextField(grid, {
      path: 'venue.mapsQuery', label: 'Address or area'
    });
    body.appendChild(grid);
    var check = el('div', 'field');
    check.style.marginTop = '4px';
    var checkButton = el('button', 'maps-button', 'Check the pin on Maps');
    checkButton.type = 'button';
    checkButton.addEventListener('click', function () {
      var query = config.venue.mapsQuery ||
        [config.venue.name, config.venue.address].filter(Boolean).join(', ');
      var url = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(query);
      var mapLink = document.createElement('a');
      mapLink.href = url;
      mapLink.target = '_blank';
      mapLink.rel = 'noopener noreferrer';
      document.body.appendChild(mapLink);
      mapLink.click();
      mapLink.remove();
    });
    check.appendChild(checkButton);
    body.appendChild(check);
    addFineTune(body, 'place', 'Fine-tune · an exact map link', function (inner) {
      var url = getPath('venue.mapUrl');
      var wrap = el('div', 'field');
      wrap.appendChild(fieldLabel('Exact map link · optional', 'f-map-url'));
      var input = el('input');
      input.type = 'url';
      input.id = 'f-map-url';
      input.autocomplete = 'off';
      input.value = typeof url === 'string' ? url : '';
      input.placeholder = 'https://…';
      input.addEventListener('input', function () {
        if (input.value && !isMapUrl(input.value)) {
          input.setCustomValidity('Paste a complete Google Maps or Apple Maps link.');
          return;
        }
        input.setCustomValidity('');
        setPath('venue.mapUrl', input.value);
        notify();
      });
      input.addEventListener('change', function () {
        if (input.value && !isMapUrl(input.value)) input.reportValidity();
      });
      registerSync('venue.mapUrl', function (next) {
        if (document.activeElement !== input) input.value = String(next == null ? '' : next);
      });
      wrap.appendChild(input);
      wrap.appendChild(el('span', 'field-hint', 'Paste a Google Maps or Apple Maps link.'));
      inner.appendChild(wrap);
    });
  }

  function buildWordsStep(body) {
    var grid = el('div', 'field-grid');
    addTextField(grid, {
      path: 'content.storyParagraphOne', label: 'How the story begins',
      multiline: true, rows: 3, hint: 'Two or three sentences is plenty.'
    });
    addTextField(grid, {
      path: 'content.storyParagraphTwo', label: 'How it continues',
      multiline: true, rows: 3
    });
    addTextField(grid, {
      path: 'content.closingMessage', label: 'Your closing note',
      multiline: true, rows: 3,
      hint: 'The last words at the foot of the invitation.'
    });
    body.appendChild(grid);
    addFineTune(body, 'words', 'Fine-tune · the smaller words', function (inner) {
      groupLabel(inner, 'The opening envelope');
      addTextField(inner, { path: 'content.openingEyebrow', label: 'Opening introduction' });
      addTextField(inner, { path: 'content.envelopeAddress', label: 'Envelope addressee' });
      addTextField(inner, { path: 'content.openingHint', label: 'Invitation hint' });
      addTextField(inner, { path: 'content.openButton', label: 'Open button' });
      addTextField(inner, { path: 'content.skipButton', label: 'Skip button' });
      groupLabel(inner, 'The story frame');
      addTextField(inner, { path: 'content.storyTitle', label: 'Story heading' });
      addTextField(inner, { path: 'content.storyTitleScript', label: 'Story heading · script word' });
      addTextField(inner, { path: 'content.storyQuote', label: 'Keepsake quote', multiline: true, rows: 2 });
      addTextField(inner, { path: 'content.storyQuoteLabel', label: 'Quote credit' });
      groupLabel(inner, 'The details columns');
      addTextField(inner, { path: 'content.detailsIntro', label: 'Details introduction' });
      addTextField(inner, { path: 'content.ceremonyLabel', label: 'Ceremony heading' });
      addTextField(inner, { path: 'content.ceremonyTime', label: 'Ceremony time' });
      addTextField(inner, { path: 'content.ceremonyNote', label: 'Ceremony note' });
      addTextField(inner, { path: 'content.receptionLabel', label: 'Reception heading' });
      addTextField(inner, { path: 'content.receptionTime', label: 'Reception time' });
      addTextField(inner, { path: 'content.receptionNote', label: 'Reception note' });
      addTextField(inner, { path: 'content.kindlyReplyLabel', label: 'Kindly reply heading' });
      addTextField(inner, { path: 'content.kindlyReplyNote', label: 'Kindly reply note' });
      addTextField(inner, { path: 'content.venueDescription', label: 'Venue description', multiline: true, rows: 2 });
      groupLabel(inner, 'The programme frame');
      var momentsWrap = el('div', 'field');
      momentsWrap.appendChild(fieldLabel('Moments of the day', 'f-moments'));
      var moments = el('textarea');
      moments.id = 'f-moments';
      moments.rows = 6;
      moments.value = (Array.isArray(config.moments) ? config.moments : []).join('\n');
      moments.addEventListener('input', function () {
        config.moments = moments.value.split('\n')
          .map(function (line) { return line.trim(); })
          .filter(function (line) { return line.length > 0; });
        notify('Wedding-day words updated.');
      });
      momentsWrap.appendChild(moments);
      momentsWrap.appendChild(el('span', 'field-hint', 'One line per moment, in order.'));
      inner.appendChild(momentsWrap);
    });
  }

  /* ── design step: curated moods & voices ───────────────────── */

  var THEME_META = [
    { key: 'burgundy', name: 'Burgundy heirloom', chips: ['#5D2029', '#F7F4EE', '#CDBB9A', '#24090D'] },
    { key: 'rose', name: 'Soft rose', chips: ['#70404A', '#FAF4EF', '#D5B6A1', '#2A171C'] },
    { key: 'olive', name: 'Garden olive', chips: ['#53513A', '#F8F5EC', '#CBB98E', '#22231B'] },
    { key: 'midnight', name: 'Midnight blue', chips: ['#394253', '#F5F3EE', '#C8B99A', '#171C26'] }
  ];

  var TYPE_PAIRINGS = [
    { name: 'Heirloom Classic', fonts: { editorial: 'bodoni', display: 'cormorant', script: 'pinyon', hand: 'laBelle', body: 'jost' } },
    { name: 'Romantic Garden', fonts: { editorial: 'playfair', display: 'ebGaramond', script: 'greatVibes', hand: 'caveat', body: 'dmSans' } },
    { name: 'Modern Editorial', fonts: { editorial: 'dmSerif', display: 'lora', script: 'allura', hand: 'shadowsIntoLight', body: 'montserrat' } },
    { name: 'Gallery Minimal', fonts: { editorial: 'italiana', display: 'prata', script: 'parisienne', hand: 'nothingYouCouldDo', body: 'lato' } },
    { name: 'Old Library', fonts: { editorial: 'libreBaskerville', display: 'cardo', script: 'tangerine', hand: 'cedarville', body: 'karla' } },
    { name: 'Soft Storybook', fonts: { editorial: 'crimsonPro', display: 'cormorant', script: 'alexBrush', hand: 'homemadeApple', body: 'lato' } }
  ];

  function fontPreviewFamily(font) {
    var families = {
      bodoni: '"Bodoni Moda", serif',
      playfair: '"Playfair Display", serif',
      dmSerif: '"DM Serif Display", serif',
      cormorant: '"Cormorant Garamond", serif',
      prata: '"Prata", serif',
      marcellus: '"Marcellus", serif',
      italiana: '"Italiana", serif',
      libreCaslon: '"Libre Caslon Text", serif',
      libreBaskerville: '"Libre Baskerville", serif',
      ebGaramond: '"EB Garamond", serif',
      lora: '"Lora", serif',
      cardo: '"Cardo", serif',
      spectral: '"Spectral", serif',
      crimsonPro: '"Crimson Pro", serif',
      pinyon: '"Pinyon Script", cursive',
      greatVibes: '"Great Vibes", cursive',
      allura: '"Allura", cursive',
      tangerine: '"Tangerine", cursive',
      parisienne: '"Parisienne", cursive',
      alexBrush: '"Alex Brush", cursive',
      mrsSaintDelafield: '"Mrs Saint Delafield", cursive',
      herrVonMuellerhoff: '"Herr Von Muellerhoff", cursive',
      laBelle: '"La Belle Aurore", cursive',
      caveat: '"Caveat", cursive',
      cedarville: '"Cedarville Cursive", cursive',
      shadowsIntoLight: '"Shadows Into Light", cursive',
      homemadeApple: '"Homemade Apple", cursive',
      nothingYouCouldDo: '"Nothing You Could Do", cursive',
      jost: '"Jost", sans-serif',
      dmSans: '"DM Sans", sans-serif',
      lato: '"Lato", sans-serif',
      montserrat: '"Montserrat", sans-serif',
      karla: '"Karla", sans-serif',
      workSans: '"Work Sans", sans-serif',
      outfit: '"Outfit", sans-serif',
      sourceSans: '"Source Sans 3", sans-serif'
    };
    return families[font] || families.bodoni;
  }

  function currentPairingName() {
    for (var i = 0; i < TYPE_PAIRINGS.length; i++) {
      var pairing = TYPE_PAIRINGS[i];
      var match = Object.keys(pairing.fonts).every(function (role) {
        return (config.fonts && config.fonts[role]) === pairing.fonts[role];
      });
      if (match) return pairing.name;
    }
    return '';
  }

  function buildDesignStep(body) {
    var themeLabel = el('p', 'field-label', 'Colour');
    themeLabel.style.cssText = 'margin:0 0 10px;color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase;';
    body.appendChild(themeLabel);
    var themeGrid = el('div', 'choice-grid');
    THEME_META.forEach(function (theme) {
      var card = el('button', 'choice-card theme-card');
      card.type = 'button';
      card.dataset.theme = theme.key;
      var chips = el('span', 'theme-card__chips');
      theme.chips.forEach(function (color) {
        var chip = document.createElement('i');
        chip.style.background = color;
        chips.appendChild(chip);
      });
      card.appendChild(chips);
      card.appendChild(el('span', 'choice-card__name', theme.name));
      if ((config.theme || 'burgundy') === theme.key) card.classList.add('is-selected');
      card.addEventListener('click', function () {
        if (config.theme === theme.key) return;
        config.theme = theme.key;
        config.themeColors = {};
        config.colorEdits = {};
        config.hiddenElements = {};
        renderFlow();
        notify('A new colour mood settles over the invitation.');
      });
      themeGrid.appendChild(card);
    });
    body.appendChild(themeGrid);

    var typeLabel = el('p', 'field-label', 'Type');
    typeLabel.style.cssText = 'margin:22px 0 10px;color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase;';
    body.appendChild(typeLabel);
    var typeGrid = el('div', 'choice-grid');
    TYPE_PAIRINGS.forEach(function (pairing) {
      var card = el('button', 'choice-card type-card');
      card.type = 'button';
      card.dataset.pairing = pairing.name;
      var specimen = el('span', 'type-card__specimen');
      var scriptLine = el('span', 'type-card__script', 'Amelia & Julien');
      scriptLine.style.fontFamily = fontPreviewFamily(pairing.fonts.script);
      var editorialLine = el('span', 'type-card__editorial', 'The Story');
      editorialLine.style.fontFamily = fontPreviewFamily(pairing.fonts.editorial);
      var bodyLine = el('span', 'type-card__body', 'Together with their families');
      bodyLine.style.fontFamily = fontPreviewFamily(pairing.fonts.body);
      specimen.appendChild(scriptLine);
      specimen.appendChild(editorialLine);
      specimen.appendChild(bodyLine);
      card.appendChild(specimen);
      card.appendChild(el('span', 'choice-card__name', pairing.name));
      if (currentPairingName() === pairing.name) card.classList.add('is-selected');
      card.addEventListener('click', function () {
        if (!config.fonts || typeof config.fonts !== 'object') config.fonts = {};
        Object.keys(pairing.fonts).forEach(function (role) {
          config.fonts[role] = pairing.fonts[role];
        });
        renderFlow();
        notify('“' + pairing.name + '” now speaks throughout the invitation.');
      });
      typeGrid.appendChild(card);
    });
    body.appendChild(typeGrid);

    addFineTune(body, 'design', 'Fine-tune · typefaces & colours', function (inner) {
      groupLabel(inner, 'Individual typefaces');
      var roles = [
        {
          key: 'editorial', label: 'Editorial headings',
          choices: ['bodoni', 'playfair', 'dmSerif', 'italiana', 'prata', 'libreBaskerville', 'crimsonPro', 'cormorant']
        },
        {
          key: 'display', label: 'Romantic serif',
          choices: ['cormorant', 'ebGaramond', 'lora', 'cardo', 'crimsonPro', 'libreBaskerville', 'playfair', 'prata']
        },
        {
          key: 'script', label: 'Signature script',
          choices: ['pinyon', 'greatVibes', 'allura', 'tangerine', 'parisienne', 'alexBrush']
        },
        {
          key: 'hand', label: 'Handwritten accents',
          choices: ['laBelle', 'caveat', 'cedarville', 'shadowsIntoLight', 'homemadeApple', 'nothingYouCouldDo']
        },
        {
          key: 'body', label: 'Interface & small text',
          choices: ['jost', 'dmSans', 'lato', 'montserrat', 'karla']
        }
      ];
      roles.forEach(function (role) {
        var wrap = el('div', 'field');
        var select = el('select');
        select.id = 'font-' + role.key;
        wrap.appendChild(fieldLabel(role.label, select.id));
        role.choices.forEach(function (choice) {
          var option = document.createElement('option');
          option.value = choice;
          option.textContent = choice.charAt(0).toUpperCase() +
            choice.slice(1).replace(/([A-Z])/g, ' $1').replace('Dm ', 'DM ').replace('Eb ', 'EB ');
          option.style.fontFamily = fontPreviewFamily(choice);
          select.appendChild(option);
        });
        select.value = (config.fonts && config.fonts[role.key]) || role.choices[0];
        select.style.fontFamily = fontPreviewFamily(select.value);
        select.addEventListener('change', function () {
          if (!config.fonts || typeof config.fonts !== 'object') config.fonts = {};
          config.fonts[role.key] = select.value;
          select.style.fontFamily = fontPreviewFamily(select.value);
          notify('Typography updated in your invitation.');
        });
        wrap.appendChild(select);
        inner.appendChild(wrap);
      });

      groupLabel(inner, 'The website colours');
      var themeColorDefaults = {
        burgundy: { primary: '#5D2029', darkBackground: '#24090D', paper: '#F7F4EE', accent: '#CDBB9A', botanical: '#777957', rose: '#C5A0A0' },
        rose: { primary: '#70404A', darkBackground: '#2A171C', paper: '#FAF4EF', accent: '#D5B6A1', botanical: '#81706B', rose: '#D19DA4' },
        olive: { primary: '#53513A', darkBackground: '#22231B', paper: '#F8F5EC', accent: '#CBB98E', botanical: '#777957', rose: '#C5A0A0' },
        midnight: { primary: '#394253', darkBackground: '#171C26', paper: '#F5F3EE', accent: '#C8B99A', botanical: '#777D83', rose: '#B8A0A7' }
      };
      var activeThemeColors = themeColorDefaults[config.theme] || themeColorDefaults.burgundy;
      var palette = el('div', 'palette-editor');
      [
        ['primary', 'Primary'],
        ['darkBackground', 'Dark background'],
        ['paper', 'Light paper'],
        ['accent', 'Champagne accent'],
        ['botanical', 'Botanical'],
        ['rose', 'Rose']
      ].forEach(function (role) {
        var item = el('div', 'palette-editor__item');
        var label = fieldLabel(role[1], 'theme-color-' + role[0]);
        label.style.margin = '0';
        var color = el('input');
        color.type = 'color';
        color.id = 'theme-color-' + role[0];
        color.value = config.themeColors && /^#[0-9a-f]{6}$/i.test(config.themeColors[role[0]] || '')
          ? config.themeColors[role[0]]
          : activeThemeColors[role[0]];
        color.setAttribute('aria-label', role[1] + ' website colour');
        color.addEventListener('input', function () {
          if (!config.themeColors || typeof config.themeColors !== 'object') config.themeColors = {};
          config.themeColors[role[0]] = color.value.toUpperCase();
          notify();
        });
        item.appendChild(label);
        item.appendChild(color);
        palette.appendChild(item);
      });
      inner.appendChild(palette);

      groupLabel(inner, 'Your palette swatches');
      var swatchList = el('div', 'palette-editor palette-editor--swatches');
      (config.palette || []).forEach(function (swatch, index) {
        var item = el('div', 'palette-editor__item palette-editor__item--swatch');
        var name = el('input');
        name.type = 'text';
        name.value = swatch.name || '';
        name.setAttribute('aria-label', 'Swatch ' + (index + 1) + ' name');
        name.addEventListener('input', function () {
          config.palette[index].name = name.value;
          notify();
        });
        var color = el('input');
        color.type = 'color';
        color.value = /^#[0-9a-f]{6}$/i.test(swatch.color || '') ? swatch.color : '#cdbb9a';
        color.setAttribute('aria-label', 'Swatch ' + (index + 1) + ' colour');
        color.addEventListener('input', function () {
          config.palette[index].color = color.value.toUpperCase();
          notify();
        });
        var removeSwatch = el('button', 'swatch-remove', '×');
        removeSwatch.type = 'button';
        removeSwatch.setAttribute('aria-label',
          'Remove swatch ' + (index + 1) + (swatch.name ? ' (' + swatch.name + ')' : '') + ' only');
        removeSwatch.addEventListener('click', function () {
          if (!Array.isArray(config.palette) || !config.palette[index]) return;
          var removedName = config.palette[index].name || 'swatch ' + (index + 1);
          config.palette.splice(index, 1);
          if (config.hiddenElements && typeof config.hiddenElements === 'object') {
            Object.keys(config.hiddenElements).forEach(function (key) {
              if (/^palette-swatch-\d+$/.test(key)) delete config.hiddenElements[key];
            });
          }
          renderFlow();
          notify('“' + removedName + '” was taken out of the palette. The other colours keep their places.');
        });
        item.appendChild(name);
        item.appendChild(color);
        item.appendChild(removeSwatch);
        swatchList.appendChild(item);
      });
      if (!config.palette || !config.palette.length) {
        swatchList.appendChild(el('p', 'field-note', 'No swatches yet.'));
      }
      inner.appendChild(swatchList);
      var addSwatch = el('button', 'maps-button', 'Add a colour swatch');
      addSwatch.type = 'button';
      addSwatch.addEventListener('click', function () {
        if (!Array.isArray(config.palette)) config.palette = [];
        config.palette.push({ name: 'Colour ' + (config.palette.length + 1), color: '#CDBB9A' });
        renderFlow();
        notify('Name the new swatch and pick its colour.');
      });
      inner.appendChild(addSwatch);
    });
  }

  function buildRepliesStep(body) {
    var grid = el('div', 'field-grid');
    addTextField(grid, {
      path: 'rsvp.deadline', label: 'Reply-by date',
      hint: 'For example: the first of August, 2027.'
    });
    grid.appendChild((function () {
      var holder = el('div');
      addStepper(holder, {
        path: 'rsvp.maxGuests', label: 'Seats one reply may claim',
        min: 1, max: 20
      });
      return holder;
    })());
    body.appendChild(grid);
  }

  /* ── step registry ─────────────────────────────────────────── */

  var STEPS = [
    { key: 'couple', title: 'The two of you', check: 'names',
      build: buildCoupleStep },
    { key: 'day', title: 'The day', check: 'day',
      build: buildDayStep },
    { key: 'place', title: 'The place', check: 'place',
      build: buildPlaceStep },
    { key: 'words', title: 'Your words', check: 'words',
      build: buildWordsStep },
    { key: 'design', title: 'Colour & type',
      build: buildDesignStep },
    { key: 'replies', title: 'Guest replies', check: 'replies',
      build: buildRepliesStep }
  ];
  var SHARE_STEP = 7;

  /* ── flow rendering & navigation ───────────────────────────── */

  var shareSection = stepsHost.querySelector('[data-step-key="share"]');

  function buildStepSection(meta, index) {
    var section = el('section', 'flow-step');
    section.dataset.step = String(index + 1);
    section.dataset.stepKey = meta.key;
    section.dataset.generated = '1';
    var head = el('header', 'flow-step__head');
    var headCopy = el('div');
    headCopy.appendChild(el('h2', null, meta.title));
    head.appendChild(headCopy);
    section.appendChild(head);
    var body = el('div', 'flow-step__body');
    meta.build(body);
    section.appendChild(body);
    return section;
  }

  function renderFlow() {
    stepsHost.querySelectorAll('[data-generated]').forEach(function (node) { node.remove(); });
    STEPS.forEach(function (meta, index) {
      stepsHost.insertBefore(buildStepSection(meta, index), shareSection);
    });
    goStep(currentStep, true);
    updateShareReadiness();
  }

  var flowCount = document.getElementById('flow-step-count');
  var flowName = document.getElementById('flow-step-name');
  var flowFill = document.getElementById('flow-progress-fill');
  var flowBack = document.getElementById('flow-back');
  var flowNext = document.getElementById('flow-next');

  function goStep(step, quiet) {
    currentStep = Math.max(1, Math.min(SHARE_STEP, step));
    var sections = stepsHost.querySelectorAll('.flow-step');
    sections.forEach(function (section) {
      var mine = Number(section.dataset.step) === currentStep;
      section.hidden = !mine;
      section.classList.toggle('is-active', mine && !quiet);
    });
    var title = currentStep === SHARE_STEP ? 'Share your invitation' : STEPS[currentStep - 1].title;
    if (flowCount) flowCount.textContent = 'Step ' + currentStep + ' of ' + SHARE_STEP;
    if (flowName) flowName.textContent = title;
    if (flowFill) flowFill.style.width = (currentStep / SHARE_STEP * 100).toFixed(1) + '%';
    if (flowBack) flowBack.hidden = currentStep === 1;
    if (flowNext) {
      flowNext.hidden = currentStep === SHARE_STEP;
      flowNext.textContent = currentStep === SHARE_STEP - 1 ? 'Go to sharing' : 'Continue';
    }
    if (currentStep === SHARE_STEP) {
      updateShareReadiness();
      if (finishPublishButton && !publishId) finishPublishButton.hidden = false;
    }
    try { window.sessionStorage.setItem('heirloom-atelier-step', String(currentStep)); }
    catch (error) { /* private mode — the flow simply starts at one */ }
  }

  if (flowBack) flowBack.addEventListener('click', function () { goStep(currentStep - 1); });
  if (flowNext) flowNext.addEventListener('click', function () { goStep(currentStep + 1); });

  /* Enter advances the flow — the keyboard matches the promise of
     the buttons. Textareas keep their newline.                     */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    var active = document.activeElement;
    if (!active || active.tagName !== 'INPUT' || active.readOnly) return;
    if (active.type === 'password' || active.closest('#header-published')) return;
    if (currentStep >= SHARE_STEP) return;
    event.preventDefault();
    goStep(currentStep + 1);
  });

  /* ── readiness — honest, per-step, and on the share page ───── */

  function sampleValue(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  var setupChecks = [
    { key: 'names', step: 1, label: 'Your names',
      isDone: function () {
        return sampleValue(config.couple.partnerOne) !== sampleValue(defaults.couple.partnerOne) ||
          sampleValue(config.couple.partnerTwo) !== sampleValue(defaults.couple.partnerTwo);
      } },
    { key: 'day', step: 2, label: 'Your date & time',
      isDone: function () {
        return sampleValue(config.wedding.iso) !== sampleValue(defaults.wedding.iso);
      } },
    { key: 'place', step: 3, label: 'Your venue',
      isDone: function () {
        return sampleValue(config.venue.name) !== sampleValue(defaults.venue.name) ||
          sampleValue(config.venue.mapsQuery) !== sampleValue(defaults.venue.mapsQuery);
      } },
    { key: 'words', step: 4, label: 'Your story',
      isDone: function () {
        return sampleValue(config.content.storyParagraphOne) !== sampleValue(defaults.content.storyParagraphOne) ||
          sampleValue(config.content.closingMessage) !== sampleValue(defaults.content.closingMessage);
      } },
    { key: 'replies', step: 6, label: 'Your reply-by date',
      isDone: function () {
        return sampleValue(config.rsvp && config.rsvp.deadline) !==
          sampleValue(defaults.rsvp && defaults.rsvp.deadline);
      } }
  ];

  var shareReadiness = document.getElementById('share-readiness');

  function updateShareReadiness() {
    if (!shareReadiness) return;
    shareReadiness.textContent = '';
    var pending = [];
    setupChecks.forEach(function (check) {
      var done = false;
      try { done = check.isDone(); } catch (error) { done = false; }
      var item = el('div', 'readiness-item' + (done ? ' readiness-item--done' : ''));
      item.appendChild(el('span', 'readiness-item__mark', done ? '✓' : '·'));
      var button = el('button', null, check.label);
      button.type = 'button';
      if (done) button.disabled = true;
      else {
        pending.push(check.label.toLowerCase());
        button.addEventListener('click', function () { goStep(check.step); });
      }
      item.appendChild(button);
      shareReadiness.appendChild(item);
    });
    if (!pending.length) {
      shareReadiness.insertBefore(
        el('p', 'field-note', 'Every essential is yours. This invitation is ready to share.'),
        shareReadiness.firstChild);
    }
  }

  function updateRestoreVisibility() {
    if (!restoreRemovedButton) return;
    var removed = 0;
    if (config.hiddenElements && typeof config.hiddenElements === 'object') {
      removed += Object.keys(config.hiddenElements).length;
    }
    if (config.hiddenSelectors && typeof config.hiddenSelectors === 'object') {
      removed += Object.keys(config.hiddenSelectors).length;
    }
    restoreRemovedButton.hidden = removed === 0;
  }

  /* ── preview messages (canvas editing) ─────────────────────── */

  function handlePreviewMessage(event) {
    if (event.source !== frame.contentWindow || event.origin !== window.location.origin || !event.data) return;
    var message = event.data;
    if (message.type === 'heirloom:ready') {
      previewReady = true;
      if (loading) loading.hidden = true;
      sendPreview();
      return;
    }
    if (message.type === 'heirloom:load-error') {
      if (loading) loading.hidden = true;
      if (hint) hint.textContent = 'The preview could not load. ' + message.message;
      return;
    }
    if (message.type === 'heirloom:element-selected') {
      var validSelector = typeof message.selector === 'string' &&
        (message.selector === 'body' || message.selector.indexOf('body > ') === 0);
      var validAnchor = message.anchor && Number.isFinite(message.anchor.left) &&
        Number.isFinite(message.anchor.top) && Number.isFinite(message.anchor.width) &&
        Number.isFinite(message.anchor.height);
      var isBackground = message.element === 'background';
      var elementKind = message.element;
      var swatchIndex = message.swatchIndex != null && Array.isArray(config.palette) &&
        Number.isInteger(message.swatchIndex) && message.swatchIndex >= 0 &&
        message.swatchIndex < config.palette.length ? message.swatchIndex : null;
      var hasColor = isBackground || /^#[0-9a-f]{6}$/i.test(message.color || '');
      if ((elementKind === 'color' || elementKind === 'text' || isBackground) &&
          validSelector && hasColor && validAnchor) {
        selectedColorSelector = message.selector;
        selectedColorKey = typeof message.key === 'string' ? message.key : '';
        selectedColorSwatchIndex = swatchIndex;
        selectedColorRemovable = !isBackground && selectedColorKey !== 'skip-intro';
        var savedColors = config.colorEdits && config.colorEdits[selectedColorSelector];
        if (textColorInput) {
          textColorInput.value = swatchIndex != null
            ? (/^#[0-9a-f]{6}$/i.test(config.palette[swatchIndex].color || '')
              ? config.palette[swatchIndex].color : '#cdbb9a')
            : (savedColors && savedColors.color) || message.color || '#f7f4ee';
        }
        if (bgColorInput) {
          bgColorInput.value = (savedColors && savedColors.backgroundColor) ||
            message.backgroundColor || '#211316';
        }
        selectedColorDefaults = {
          color: textColorInput ? textColorInput.value : '',
          backgroundColor: bgColorInput ? bgColorInput.value : ''
        };
        if (colorActionLabel) colorActionLabel.textContent = message.label || 'Selected element';
        if (textGroup) {
          textGroup.hidden = isBackground;
          var textGroupLabel = textGroup.querySelector('span');
          if (textGroupLabel) {
            textGroupLabel.textContent = swatchIndex != null ? 'Colour' : 'Text';
          }
        }
        if (bgGroup) bgGroup.hidden = swatchIndex != null;
        if (removeElementButton) removeElementButton.hidden = !selectedColorRemovable;
        if (colorAction) colorAction.hidden = false;
        positionColorTooltip(message.anchor);
        if (hint) hint.textContent = isBackground
          ? 'Background selected. Choose a colour to update it, then press Done.'
          : swatchIndex != null
            ? 'Palette swatch selected. Change this one colour or remove just this swatch; the rest stay untouched.'
            : 'Element selected. Recolour it, remove it, or press Done to keep editing.';
      } else {
        hideColorTooltip(false);
        if (hint && message.element === 'text') {
          hint.textContent = 'Click elsewhere on the proof when you are done.';
        }
      }
      return;
    }

    var allowedTextPath = typeof message.path === 'string' &&
      (message.path.indexOf('content.') === 0 ||
       ['couple.namesLine', 'couple.initials', 'couple.partnerOne', 'couple.partnerTwo',
        'wedding.display', 'wedding.words', 'wedding.numerals', 'wedding.zoneLabel',
        'venue.name', 'venue.address', 'rsvp.deadline'].indexOf(message.path) !== -1 ||
       /^moments\.\d+$/.test(message.path) ||
       /^palette\.\d+\.name$/.test(message.path));
    if (message.type !== 'heirloom:element-edited' || !allowedTextPath ||
        typeof message.value !== 'string') return;

    if (/^moments\.\d+$/.test(message.path)) {
      var momentIndex = Number(message.path.split('.')[1]);
      if (!Array.isArray(config.moments) || momentIndex >= config.moments.length) return;
      if (message.value.trim()) config.moments[momentIndex] = message.value.trim();
      else config.moments.splice(momentIndex, 1);
    } else if (/^palette\.\d+\.name$/.test(message.path)) {
      var swatchNamed = Number(message.path.split('.')[1]);
      if (!Array.isArray(config.palette) || !config.palette[swatchNamed]) return;
      if (message.value.trim()) {
        config.palette[swatchNamed].name = message.value.trim();
        notify('Palette swatch renamed.');
      } else {
        notify('The swatch keeps its name; give it at least one character.');
      }
      return;
    } else {
      if (typeof getPath(message.path) !== 'string') return;
      setPath(message.path, message.value);
      syncGlobalField(message.path, message.value);
      if (message.path === 'couple.partnerOne' || message.path === 'couple.partnerTwo') {
        config.couple.namesLine = config.couple.partnerOne + ' & ' + config.couple.partnerTwo;
        syncGlobalField('couple.namesLine', config.couple.namesLine);
      }
    }
    notify('Text updated in your invitation.');
  }

  window.addEventListener('message', handlePreviewMessage);

  /* ── canvas colour tooltip ─────────────────────────────────── */

  function positionColorTooltip(anchor) {
    if (!colorAction || !frame) return;
    var frameWidth = frame.clientWidth;
    var frameHeight = frame.clientHeight;
    var tooltipWidth = colorAction.offsetWidth;
    var tooltipHeight = colorAction.offsetHeight;
    var centerX = frame.offsetLeft + anchor.left + anchor.width / 2;
    var top = frame.offsetTop + anchor.top - 10;
    var below = top - tooltipHeight < 8;
    if (below) top = frame.offsetTop + anchor.top + anchor.height + tooltipHeight + 10;
    top = Math.max(tooltipHeight + 8, Math.min(top, frame.offsetTop + frameHeight - 8));
    centerX = Math.max(tooltipWidth / 2 + 8, Math.min(centerX, frame.offsetLeft + frameWidth - tooltipWidth / 2 - 8));
    colorAction.classList.toggle('is-below', below);
    colorAction.style.left = centerX + 'px';
    colorAction.style.top = top + 'px';
  }

  function updateSelectedColor(value) {
    if (!selectedColorSelector || !/^#[0-9a-f]{6}$/i.test(value)) return;
    if (selectedColorSwatchIndex != null) {
      if (!Array.isArray(config.palette) || !config.palette[selectedColorSwatchIndex]) return;
      config.palette[selectedColorSwatchIndex].color = value.toUpperCase();
      notify('Swatch colour updated. Only this swatch changed.');
      return;
    }
    if (!config.colorEdits || typeof config.colorEdits !== 'object') config.colorEdits = {};
    if (!config.colorEdits[selectedColorSelector]) config.colorEdits[selectedColorSelector] = {};
    config.colorEdits[selectedColorSelector].color = value.toUpperCase();
    notify('Colour updated in the invitation preview.');
  }

  function updateSelectedBackground(value) {
    if (!selectedColorSelector || !/^#[0-9a-f]{6}$/i.test(value)) return;
    if (selectedColorSwatchIndex != null) return;
    if (!config.colorEdits || typeof config.colorEdits !== 'object') config.colorEdits = {};
    if (!config.colorEdits[selectedColorSelector]) config.colorEdits[selectedColorSelector] = {};
    config.colorEdits[selectedColorSelector].backgroundColor = value.toUpperCase();
    notify('Background colour updated in the invitation preview.');
  }

  function hideColorTooltip(clearInPreview) {
    selectedColorSelector = '';
    selectedColorKey = '';
    selectedColorSwatchIndex = null;
    selectedColorRemovable = false;
    if (colorAction) colorAction.hidden = true;
    if (clearInPreview !== false && frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'heirloom:clear-selection' },
        window.location.origin === 'null' ? '*' : window.location.origin);
    }
  }

  if (textColorInput) {
    textColorInput.addEventListener('input', function () {
      updateSelectedColor(textColorInput.value);
    });
  }
  if (bgColorInput) {
    bgColorInput.addEventListener('input', function () {
      updateSelectedBackground(bgColorInput.value);
    });
  }
  if (closeTooltipButton) {
    closeTooltipButton.addEventListener('click', function () {
      hideColorTooltip(true);
      if (hint) hint.textContent = 'Done. Click any element or the background to keep styling your invitation.';
    });
  }
  if (removeElementButton) {
    removeElementButton.addEventListener('click', function () {
      if (!selectedColorSelector || selectedColorKey === 'skip-intro') return;
      var removedLabel = colorActionLabel && colorActionLabel.textContent
        ? colorActionLabel.textContent : labelForKey(selectedColorKey);
      if (selectedColorSwatchIndex != null) {
        if (!Array.isArray(config.palette) || !config.palette[selectedColorSwatchIndex]) return;
        config.palette.splice(selectedColorSwatchIndex, 1);
        if (config.hiddenElements && typeof config.hiddenElements === 'object') {
          Object.keys(config.hiddenElements).forEach(function (key) {
            if (/^palette-swatch-\d+$/.test(key)) delete config.hiddenElements[key];
          });
        }
        hideColorTooltip(true);
        renderFlow();
        notify('“' + removedLabel + '” was taken out of the palette. The remaining colours keep their places.');
        return;
      }
      if (!config.hiddenElements || typeof config.hiddenElements !== 'object') config.hiddenElements = {};
      if (!config.hiddenSelectors || typeof config.hiddenSelectors !== 'object') config.hiddenSelectors = {};
      if (selectedColorKey) {
        config.hiddenElements[selectedColorKey] = true;
      } else {
        config.hiddenSelectors[selectedColorSelector] = true;
      }
      hideColorTooltip(true);
      notify('“' + removedLabel + '” was removed from the invitation. Use “Restore removed elements” under the preview to bring it back.');
    });
  }
  if (restoreRemovedButton) {
    restoreRemovedButton.addEventListener('click', function () {
      config.hiddenElements = {};
      config.hiddenSelectors = {};
      updateRestoreVisibility();
      notify('All removed elements are back in the invitation.');
    });
  }
  if (resetElementColorsButton) {
    resetElementColorsButton.addEventListener('click', function () {
      if (selectedColorSwatchIndex != null) {
        if (!Array.isArray(config.palette) || !config.palette[selectedColorSwatchIndex]) return;
        if (selectedColorDefaults && /^#[0-9a-f]{6}$/i.test(selectedColorDefaults.color || '')) {
          config.palette[selectedColorSwatchIndex].color = selectedColorDefaults.color.toUpperCase();
        }
        if (textColorInput && selectedColorDefaults) textColorInput.value = selectedColorDefaults.color;
        notify('Swatch colour restored.');
        return;
      }
      if (!selectedColorSelector || !config.colorEdits) return;
      delete config.colorEdits[selectedColorSelector];
      if (textColorInput && selectedColorDefaults) textColorInput.value = selectedColorDefaults.color;
      if (bgColorInput && selectedColorDefaults) bgColorInput.value = selectedColorDefaults.backgroundColor;
      notify('Selected element colours restored.');
    });
  }

  /* ── start over · saved copies ─────────────────────────────── */

  function resetToSample() {
    if (typeof window.confirm === 'function' &&
        !window.confirm('Restore the sample invitation? Your current edits will be replaced.')) return;
    config = clone(defaults);
    renderRsvpResponses([]);
    var responsesPanel = document.getElementById('rsvp-responses');
    if (responsesPanel) responsesPanel.hidden = true;
    fineTuneOpen = {};
    renderFlow();
    goStep(1);
    notify('Sample invitation restored. Review the preview before publishing.');
  }

  function download(name, content, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type }));
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function saveCopy() {
    download('heirloom-invitation-copy.json', JSON.stringify(config, null, 2) + '\n', 'application/json;charset=utf-8');
    notify('A copy of your invitation is saved to your device. You can load it here any time.');
  }

  function validConfig(value) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      value.couple && value.wedding && value.venue && value.content &&
      (value.palette == null || Array.isArray(value.palette)) &&
      (value.moments == null || Array.isArray(value.moments));
  }

  var menuReset = document.getElementById('menu-reset');
  var menuDownload = document.getElementById('menu-download');
  if (menuReset) menuReset.addEventListener('click', resetToSample);
  if (menuDownload) menuDownload.addEventListener('click', saveCopy);
  var downloadButton = document.getElementById('download-json');
  if (downloadButton) downloadButton.addEventListener('click', saveCopy);

  var importInput = document.getElementById('import-config');
  if (importInput) {
    importInput.addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onerror = function () { notify('The selected file could not be read.'); };
      reader.onload = function () {
        try {
          var imported = JSON.parse(String(reader.result));
          if (!validConfig(imported)) throw new Error('This file does not look like a saved invitation copy.');
          config = imported;
          fineTuneOpen = {};
          renderFlow();
          goStep(1);
          notify('Saved copy loaded. Check the preview, then publish when it feels right.');
        } catch (error) {
          notify(error.message || 'This file is not a saved invitation copy.');
        }
        event.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  /* ── the ⋯ menu ────────────────────────────────────────────── */

  var headerMenu = document.getElementById('header-menu');
  var menuToggle = document.getElementById('header-menu-toggle');
  var menuList = document.getElementById('header-menu-list');

  function closeMenu() {
    if (!menuList || !menuToggle) return;
    menuList.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle && menuList) {
    menuToggle.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = menuList.hidden;
      menuList.hidden = !open;
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (event) {
      if (headerMenu && !headerMenu.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
    menuList.addEventListener('click', function (event) {
      if (event.target.closest('[data-menu-item]')) closeMenu();
    });
  }

  /* ── access code (optional seller gate) ────────────────────── */

  function getAccessCode() {
    if (accessCodeInput && accessCodeInput.value.trim()) return accessCodeInput.value.trim();
    try { return window.sessionStorage.getItem('heirloom-access-code') || ''; }
    catch (error) { return ''; }
  }
  if (accessCodeInput) {
    try {
      var storedCode = window.sessionStorage.getItem('heirloom-access-code');
      if (storedCode) accessCodeInput.value = storedCode;
    } catch (error) { /* session storage unavailable — the field still works */ }
    accessCodeInput.addEventListener('input', function () {
      try {
        if (accessCodeInput.value.trim()) {
          window.sessionStorage.setItem('heirloom-access-code', accessCodeInput.value.trim());
        } else {
          window.sessionStorage.removeItem('heirloom-access-code');
        }
      } catch (error) { /* private mode — keep the code in memory only */ }
      if (pendingPublishAfterCode && accessCodeInput.value.trim()) {
        pendingPublishAfterCode = false;
        publishInvitation();
      }
    });
  }

  /* ── copy link ─────────────────────────────────────────────── */

  if (publishButton) publishButton.addEventListener('click', publishInvitation);
  if (finishPublishButton) finishPublishButton.addEventListener('click', publishInvitation);

  function copyInvitationLink(input) {
    if (!input || !input.value) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(input.value).then(function () {
        notify('Live invitation link copied.');
      }).catch(function () {
        input.select();
        notify('Select and copy the live invitation link.');
      });
    } else {
      input.select();
      document.execCommand('copy');
      notify('Live invitation link copied.');
    }
  }
  if (copyPublishedUrl) copyPublishedUrl.addEventListener('click', function () { copyInvitationLink(publishedUrl); });
  if (headerCopyPublishedUrl) headerCopyPublishedUrl.addEventListener('click', function () { copyInvitationLink(headerPublishedUrl); });

  /* ── mobile preview overlay ────────────────────────────────── */

  var previewToggle = document.getElementById('preview-toggle');
  var previewClose = document.getElementById('preview-close');

  function setPreviewOpen(open) {
    document.body.classList.toggle('preview-open', open);
    if (previewClose) previewClose.hidden = !open;
    if (open) {
      var panel = document.querySelector('.preview-panel');
      if (panel) panel.scrollTop = 0;
    }
  }
  if (previewToggle) previewToggle.addEventListener('click', function () { setPreviewOpen(true); });
  if (previewClose) previewClose.addEventListener('click', function () { setPreviewOpen(false); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.body.classList.contains('preview-open')) setPreviewOpen(false);
  });

  /* ── first paint ───────────────────────────────────────────── */

  try {
    var savedStep = parseInt(window.sessionStorage.getItem('heirloom-atelier-step'), 10);
    if (isFinite(savedStep) && savedStep >= 1 && savedStep <= SHARE_STEP) currentStep = savedStep;
  } catch (error) { /* private mode — start at the first step */ }

  renderFlow();
  loadManagedInvitation();
})();
