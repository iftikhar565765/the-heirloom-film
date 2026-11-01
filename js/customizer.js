(function () {
  'use strict';

  var sourceConfig = window.HEIRLOOM;
  var editor = document.getElementById('editor-sections');
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
  if (!sourceConfig || !editor || !frame) {
    if (hint) hint.textContent = 'The editor could not load its configuration or preview.';
    return;
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

  var defaults = clone(sourceConfig);
  var config = clone(sourceConfig);
  var previewReady = false;
  var hintTimer = null;
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
      (key ? key.replace(/-/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); })
           .replace(/\b\w/, function (ch) { return ch.toUpperCase(); })
      : 'Selected element');
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
  var publishedLink = document.getElementById('published-link');
  var publishedUrl = document.getElementById('published-url');
  var copyPublishedUrl = document.getElementById('copy-published-url');
  var manageInvitation = document.getElementById('manage-invitation');
  var openPreview = document.getElementById('open-preview');
  var viewReplies = document.getElementById('view-replies');
  var viewRepliesPanel = document.getElementById('view-replies-panel');
  var openRepliesPage = document.getElementById('open-replies-page');
  var globalFields = [
    { path: 'couple.partnerOne', label: 'First partner', group: 'couple' },
    { path: 'couple.partnerTwo', label: 'Second partner', group: 'couple' },
    { path: 'couple.namesLine', label: 'Couple names across the invitation', group: 'couple' },
    { path: 'couple.initials', label: 'Shared monogram', group: 'couple' },
    { path: 'venue.name', label: 'Venue name repeated in the invitation', group: 'couple' },
    { path: 'wedding.iso', label: 'Wedding date & time · event start', group: 'date', type: 'datetime-local', wide: true },
    { path: 'wedding.endIso', label: 'Event end date & time', group: 'date', type: 'datetime-local', wide: true },
    { path: 'wedding.numerals', label: 'Date in numerals', group: 'date', type: 'date' },
    { path: 'wedding.zoneLabel', label: 'Venue time-zone label', group: 'date' },
    { path: 'wedding.eventTitle', label: 'Calendar event title', group: 'date', wide: true },
    { path: 'venue.mapsQuery', label: 'Location name or address', group: 'venue', wide: true },
    { path: 'venue.mapUrl', label: 'Google Maps URL (optional)', group: 'venue', type: 'url', wide: true }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function syncGlobalField(path, value) {
    editor.querySelectorAll('[data-config-path]').forEach(function (input) {
      if (input.dataset.configPath === path) {
        input.value = input.dataset.inputType === 'date'
          ? datePart(config.wedding.iso)
          : input.dataset.inputType === 'datetime-local'
            ? localDateTime(value)
            : value;
      }
    });
  }

  function localDateTime(value) {
    var match = typeof value === 'string' &&
      value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return match ? match[1] : '';
  }

  function datePart(value) {
    var match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
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
    syncGlobalField('wedding.numerals', config.wedding.numerals);
  }

  function isMapUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }

  function notify(message) {
    if (hint) hint.textContent = message || 'Click any text in the preview to edit it in place; click an element to recolour it.';
    setSaveStatus(publishId ? 'editing' : 'preview', publishId ? 'Editing · changes save automatically' : 'Preview ready · changes are not published');
    if (hintTimer) window.clearTimeout(hintTimer);
    if (message) {
      hintTimer = window.setTimeout(function () {
        if (hint) hint.textContent = 'Click any text in the preview to edit it in place; click an element to recolour it.';
      }, 5000);
    }
    sendPreview();
    scheduleRemoteSave();
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
            throw new Error('The invitation could not be saved. The publishing service is not responding as expected — please try again in a moment.');
          }
          throw new Error('The invitation could not be saved. The publishing service replied unexpectedly — please try again in a moment.');
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
    if (manageInvitation) manageInvitation.href = 'customize.html?edit=' + encodeURIComponent(publishId);
    var repliesHref = 'replies.html?edit=' + encodeURIComponent(publishId);
    if (viewReplies) { viewReplies.href = repliesHref; viewReplies.hidden = false; }
    if (viewRepliesPanel) { viewRepliesPanel.href = repliesHref; viewRepliesPanel.hidden = false; }
    if (openRepliesPage) { openRepliesPage.href = repliesHref; openRepliesPage.hidden = false; }
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
    if (hint) hint.textContent = 'Saving your latest changes to the live invitation…';
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
        if (hint) hint.textContent = 'All changes saved · your live invitation is up to date.';
        setSaveStatus('saved', 'All changes saved');
      }
    }).catch(function (error) {
      blockedSnapshot = savedSnapshot || snapshot();
      notify('Could not update the live invitation: ' + error.message);
      setSaveStatus('error', 'Could not save changes');
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
        catch (error) { notify('Published, but this browser could not save the private edit key. Keep this editor tab open to retain access.'); }
      }
      publishRevision = result.revision;
      lastSavedSnapshot = publishingSnapshot;
      blockedSnapshot = '';
      updatePublishedLink(result.url);
      renderRsvpResponses([]);
      if (publishButton) publishButton.textContent = 'Publish latest changes';
      var url = new URL(window.location.href);
      url.searchParams.set('edit', publishId);
      window.history.replaceState({}, '', url.toString());
      notify('Published. This link is live, and future changes save automatically.');
      setSaveStatus('saved', 'Published · edits stay in sync');
      renderRsvpResponses(result.responses || []);
      scheduleRemoteSave();
    }).catch(function (error) {
      if (error && error.codeRequired) {
        pendingPublishAfterCode = true;
        if (accessCodeRow) {
          accessCodeRow.hidden = false;
          if (accessCodeInput) accessCodeInput.focus();
        }
        notify('This editor is protected by an access code. Paste the code from your purchase to continue.');
        setSaveStatus('preview', 'Access code required');
      } else {
        notify('Could not publish the invitation: ' + (error && error.message ? error.message : 'unexpected error'));
        setSaveStatus('error', 'Publishing needs attention');
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
      notify('This browser blocked access to the saved invitation edit key.');
      return;
    }
    if (!ownerToken) {
      managedLoading = false;
      if (publishButton) publishButton.disabled = false;
      notify('This browser does not have the private edit key for that invitation.');
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
      renderSidebar();
      updatePublishedLink(window.location.origin + window.location.pathname.replace(/customize\.html$/, '') +
        'index.html?invite=' + encodeURIComponent(publishId));
      renderRsvpResponses(result.responses || []);
      if (publishButton) publishButton.textContent = 'Publish latest changes';
      sendPreview();
      notify('Published invitation loaded. Changes save automatically.');
      setSaveStatus('saved', 'Published · edits stay in sync');
    }).catch(function (error) {
      notify('Could not load the published invitation: ' + error.message);
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

  function addTextField(parent, field) {
    var value = getPath(field.path);
    if (typeof value !== 'string') return;
    if (field.path === 'venue.mapsQuery' && !value) {
      value = [config.venue.name, config.venue.address].filter(Boolean).join(', ');
    }
    var wrapper = document.createElement('div');
    wrapper.className = 'field' + (field.wide ? ' field--wide' : '');
    var label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = 'global-' + field.path.replace(/[^a-z0-9]/gi, '-');
    var input = document.createElement('input');
    input.type = field.type || 'text';
    input.id = label.htmlFor;
    input.dataset.inputType = input.type;
    input.value = input.type === 'datetime-local'
      ? localDateTime(value)
      : input.type === 'date'
        ? datePart(config.wedding.iso)
        : value;
    input.dataset.configPath = field.path;
    input.autocomplete = 'off';
    input.addEventListener('input', function () {
      if (field.path === 'venue.mapUrl') {
        if (input.value && !isMapUrl(input.value)) {
          input.setCustomValidity('Paste a complete Google Maps or Apple Maps URL.');
          return;
        }
        input.setCustomValidity('');
      }
      if (field.path === 'wedding.iso') {
        var previousStart = config.wedding.iso;
        var nextStart = storedDateTime(input.value, previousStart);
        var dayDelta = dateDeltaDays(previousStart, nextStart);
        setPath(field.path, nextStart);
        config.wedding.endIso = shiftDateTime(config.wedding.endIso, dayDelta);
        syncGlobalField('wedding.endIso', config.wedding.endIso);
        updateDerivedDateFields();
      } else if (field.path === 'wedding.numerals') {
        var currentLocal = localDateTime(config.wedding.iso);
        var nextLocal = input.value + currentLocal.slice(10);
        var startBeforeDateChange = config.wedding.iso;
        var startAfterDateChange = storedDateTime(nextLocal, startBeforeDateChange);
        var numeralsDayDelta = dateDeltaDays(startBeforeDateChange, startAfterDateChange);
        config.wedding.iso = startAfterDateChange;
        config.wedding.endIso = shiftDateTime(config.wedding.endIso, numeralsDayDelta);
        syncGlobalField('wedding.iso', config.wedding.iso);
        syncGlobalField('wedding.endIso', config.wedding.endIso);
        updateDerivedDateFields();
      } else if (field.path === 'wedding.endIso') {
        setPath(field.path, storedDateTime(input.value, config.wedding.endIso));
      } else {
        setPath(field.path, input.value);
      }
      if (field.path === 'couple.partnerOne' || field.path === 'couple.partnerTwo') {
        config.couple.namesLine = config.couple.partnerOne + ' & ' + config.couple.partnerTwo;
        syncGlobalField('couple.namesLine', config.couple.namesLine);
      }
      if (field.path === 'venue.mapsQuery') {
        config.venue.mapUrl = '';
        syncGlobalField('venue.mapUrl', '');
      }
      notify();
    });
    if (field.path === 'venue.mapUrl') {
      input.addEventListener('change', function () {
        if (input.value && !isMapUrl(input.value)) input.reportValidity();
      });
    }
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    if (field.path === 'wedding.iso' || field.path === 'wedding.endIso') {
      var hintText = document.createElement('span');
      hintText.className = 'field-hint';
      hintText.textContent = 'Choose the local venue time. Its configured UTC offset is preserved for calendars.';
      wrapper.appendChild(hintText);
    } else if (field.path === 'venue.mapUrl') {
      var mapHint = document.createElement('span');
      mapHint.className = 'field-hint';
      mapHint.textContent = 'Paste a Google Maps or Apple Maps link to use that exact location.';
      wrapper.appendChild(mapHint);
    }
    parent.appendChild(wrapper);
  }

  function addSharedFields() {
    ['couple', 'date', 'venue'].forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'global-settings-group';
      var heading = document.createElement('h3');
      heading.textContent = group === 'couple' ? 'Names used throughout' :
        group === 'date' ? 'Wedding date & calendar' : 'Location';
      section.appendChild(heading);
      var grid = document.createElement('div');
      grid.className = 'field-grid';
      globalFields.filter(function (field) { return field.group === group; })
        .forEach(function (field) { addTextField(grid, field); });
      if (group === 'venue') {
        var chooseField = document.createElement('div');
        chooseField.className = 'field field--wide';
        var chooseButton = document.createElement('button');
        chooseButton.type = 'button';
        chooseButton.className = 'maps-button';
        chooseButton.textContent = 'Choose location on Google Maps';
        chooseButton.addEventListener('click', function () {
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
        chooseField.appendChild(chooseButton);
        var chooseHint = document.createElement('span');
        chooseHint.className = 'field-hint';
        chooseHint.textContent = 'Enter a place name above to update View Location, then use this button to find or confirm it on Maps.';
        chooseField.appendChild(chooseHint);
        grid.appendChild(chooseField);
      }
      section.appendChild(grid);
      editor.appendChild(section);
    });

    var calendarNote = document.createElement('p');
    calendarNote.className = 'editor-note';
    calendarNote.textContent = 'The date in numerals follows the event start date. Changing the start date shifts the event end date by the same number of days. Calendar links use these times; View Location uses the location name or the Maps URL.';
    editor.appendChild(calendarNote);
  }

  function addSimpleField(parent, path, label, opts) {
    opts = opts || {};
    var value = getPath(path);
    if (typeof value !== 'string' && typeof value !== 'number') return;
    var field = document.createElement('div');
    field.className = 'field' + (opts.wide ? ' field--wide' : '');
    var labelEl = document.createElement('label');
    labelEl.textContent = label;
    var input = document.createElement(opts.options ? 'select' : (opts.multiline ? 'textarea' : 'input'));
    input.id = 'f-' + path.replace(/[^a-z0-9]/gi, '-');
    labelEl.htmlFor = input.id;
    if (!opts.options && !opts.multiline) input.type = opts.type || 'text';
    if (opts.multiline) input.rows = opts.rows || 3;
    if (opts.options) {
      opts.options.forEach(function (option) {
        var el = document.createElement('option');
        el.value = option[0];
        el.textContent = option[1];
        input.appendChild(el);
      });
      input.value = String(value);
    } else {
      input.value = String(value == null ? '' : value);
      if (opts.placeholder) input.placeholder = opts.placeholder;
    }
    input.addEventListener('input', function () {
      var next = input.value;
      if (opts.type === 'number') {
        var parsed = parseInt(input.value, 10);
        if (!isFinite(parsed)) return;
        next = Math.min(opts.max || 20, Math.max(opts.min || 1, parsed));
      }
      setPath(path, next);
      if (opts.after) opts.after(next);
      notify();
    });
    field.appendChild(labelEl);
    field.appendChild(input);
    if (opts.hint) {
      var hintEl = document.createElement('span');
      hintEl.className = 'field-hint';
      hintEl.textContent = opts.hint;
      field.appendChild(hintEl);
    }
    parent.appendChild(field);
  }

  function addWordingSettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'Story & wording';
    section.appendChild(heading);
    var description = document.createElement('p');
    description.className = 'field-hint';
    description.textContent = 'The words that carry your invitation. Every field also edits in place — click the matching text in the preview.';
    section.appendChild(description);
    var grid = document.createElement('div');
    grid.className = 'field-grid';
    addSimpleField(grid, 'content.storyTitle', 'Story heading', { hint: 'The large editorial word, e.g. “Our”.' });
    addSimpleField(grid, 'content.storyTitleScript', 'Story heading script', { hint: 'The script word beneath it, e.g. “Story”.' });
    addSimpleField(grid, 'content.storyParagraphOne', 'Story · first paragraph', { wide: true, multiline: true, rows: 3 });
    addSimpleField(grid, 'content.storyParagraphTwo', 'Story · second paragraph', { wide: true, multiline: true, rows: 3 });
    addSimpleField(grid, 'content.storyQuote', 'Keepsake quote', { wide: true, multiline: true, rows: 2, hint: 'The quote pinned to the keepsake folio.' });
    addSimpleField(grid, 'content.storyQuoteLabel', 'Keepsake quote credit', { wide: true });
    addSimpleField(grid, 'content.detailsIntro', 'Details · introduction', { wide: true });
    addSimpleField(grid, 'content.ceremonyLabel', 'Ceremony · heading', {});
    addSimpleField(grid, 'content.ceremonyTime', 'Ceremony · time', {});
    addSimpleField(grid, 'content.ceremonyNote', 'Ceremony · note', { wide: true });
    addSimpleField(grid, 'content.receptionLabel', 'Reception · heading', {});
    addSimpleField(grid, 'content.receptionTime', 'Reception · time', {});
    addSimpleField(grid, 'content.receptionNote', 'Reception · note', { wide: true });
    addSimpleField(grid, 'content.kindlyReplyLabel', 'Kindly reply · heading', {});
    addSimpleField(grid, 'content.kindlyReplyNote', 'Kindly reply · note', { wide: true });
    addSimpleField(grid, 'content.venueDescription', 'Venue description', { wide: true, multiline: true, rows: 3 });
    addSimpleField(grid, 'content.closingMessage', 'Closing message', { wide: true, multiline: true, rows: 3 });
    section.appendChild(grid);
    editor.appendChild(section);
  }

  function addMomentsSettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'Wedding-day words';
    section.appendChild(heading);
    var description = document.createElement('p');
    description.className = 'field-hint';
    description.textContent = 'One word per line — the moments of your day, shown in the framed programme. Clear every line to hide that section entirely.';
    section.appendChild(description);
    var field = document.createElement('div');
    field.className = 'field field--wide';
    var label = document.createElement('label');
    label.htmlFor = 'moments-lines';
    label.textContent = 'Moments of the day';
    var textarea = document.createElement('textarea');
    textarea.id = label.htmlFor;
    textarea.rows = 6;
    textarea.value = (Array.isArray(config.moments) ? config.moments : []).join('\n');
    textarea.addEventListener('input', function () {
      config.moments = textarea.value.split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
      notify('Wedding-day words updated.');
    });
    field.appendChild(label);
    field.appendChild(textarea);
    section.appendChild(field);
    editor.appendChild(section);
  }

  function addRsvpSettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'RSVP & replies';
    section.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'field-grid';
    addSimpleField(grid, 'rsvp.deadline', 'Reply-by date shown to guests', { wide: true, hint: 'Written as you would like guests to read it, e.g. “the first of August, 2027”.' });
    addSimpleField(grid, 'rsvp.maxGuests', 'Largest party size per reply', {
      type: 'number', min: 1, max: 20, wide: true,
      hint: 'Guests can reserve 1 up to this many seats.'
    });

    var note = document.createElement('span');
    note.className = 'field-hint';
    note.textContent = 'Every reply arrives in the Guest replies list below the moment guests respond — no email address or extra setup is needed.';
    section.appendChild(grid);
    section.appendChild(note);
    editor.appendChild(section);
  }

  function addOpeningSettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'Opening envelope';
    section.appendChild(heading);
    var description = document.createElement('p');
    description.className = 'field-hint';
    description.textContent = 'Personalize the words guests see before opening your invitation.';
    section.appendChild(description);
    var grid = document.createElement('div');
    grid.className = 'field-grid';
    [
      ['content.openingEyebrow', 'Opening introduction'],
      ['content.envelopeAddress', 'Envelope addressee'],
      ['content.openingHint', 'Invitation hint'],
      ['content.openButton', 'Open button'],
      ['content.skipButton', 'Skip button']
    ].forEach(function (entry) {
      var field = document.createElement('div');
      field.className = 'field field--wide';
      var label = document.createElement('label');
      label.textContent = entry[1];
      label.htmlFor = 'opening-' + entry[0].replace(/[^a-z0-9]/gi, '-');
      var input = document.createElement('input');
      input.type = 'text';
      input.id = label.htmlFor;
      input.value = getPath(entry[0]) || '';
      input.dataset.configPath = entry[0];
      input.addEventListener('input', function () {
        setPath(entry[0], input.value);
        notify();
      });
      field.appendChild(label);
      field.appendChild(input);
      grid.appendChild(field);
    });
    section.appendChild(grid);
    editor.appendChild(section);
  }

  function addTypographySettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'Typography';
    section.appendChild(heading);
    var description = document.createElement('p');
    description.className = 'field-hint';
    description.textContent = 'Choose a considered typeface for each role. Your selections carry through the full invitation.';
    section.appendChild(description);
    var grid = document.createElement('div');
    grid.className = 'field-grid typography-grid';
    var roles = [
      {
        key: 'editorial', label: 'Editorial headings', defaultValue: 'bodoni',
        choices: [
          ['bodoni', 'Bodoni Moda'], ['playfair', 'Playfair Display'], ['dmSerif', 'DM Serif Display'],
          ['cormorant', 'Cormorant Garamond'], ['prata', 'Prata'], ['marcellus', 'Marcellus'],
          ['italiana', 'Italiana'], ['libreCaslon', 'Libre Caslon Text']
        ]
      },
      {
        key: 'display', label: 'Romantic serif', defaultValue: 'cormorant',
        choices: [
          ['cormorant', 'Cormorant Garamond'], ['ebGaramond', 'EB Garamond'], ['lora', 'Lora'],
          ['playfair', 'Playfair Display'], ['cardo', 'Cardo'], ['spectral', 'Spectral'],
          ['crimsonPro', 'Crimson Pro'], ['libreBaskerville', 'Libre Baskerville']
        ]
      },
      {
        key: 'script', label: 'Signature script', defaultValue: 'pinyon',
        choices: [
          ['pinyon', 'Pinyon Script'], ['greatVibes', 'Great Vibes'], ['allura', 'Allura'],
          ['tangerine', 'Tangerine'], ['parisienne', 'Parisienne'], ['alexBrush', 'Alex Brush'],
          ['mrsSaintDelafield', 'Mrs Saint Delafield'], ['herrVonMuellerhoff', 'Herr Von Muellerhoff']
        ]
      },
      {
        key: 'hand', label: 'Handwritten accents', defaultValue: 'laBelle',
        choices: [
          ['laBelle', 'La Belle Aurore'], ['caveat', 'Caveat'], ['cedarville', 'Cedarville Cursive'],
          ['shadowsIntoLight', 'Shadows Into Light'], ['homemadeApple', 'Homemade Apple'],
          ['nothingYouCouldDo', 'Nothing You Could Do']
        ]
      },
      {
        key: 'body', label: 'Interface & small text', defaultValue: 'jost',
        choices: [
          ['jost', 'Jost'], ['dmSans', 'DM Sans'], ['lato', 'Lato'], ['montserrat', 'Montserrat'],
          ['karla', 'Karla'], ['workSans', 'Work Sans'], ['outfit', 'Outfit'], ['sourceSans', 'Source Sans 3']
        ]
      }
    ];
    roles.forEach(function (role) {
      var field = document.createElement('div');
      field.className = 'field field--wide';
      var label = document.createElement('label');
      label.textContent = role.label;
      label.htmlFor = 'font-' + role.key;
      var select = document.createElement('select');
      select.id = label.htmlFor;
      role.choices.forEach(function (choice) {
        var option = document.createElement('option');
        option.value = choice[0];
        option.textContent = choice[1];
        option.style.fontFamily = fontPreviewFamily(choice[0]);
        select.appendChild(option);
      });
      select.value = config.fonts && config.fonts[role.key] || role.defaultValue;
      select.style.fontFamily = fontPreviewFamily(select.value);
      select.addEventListener('change', function () {
        if (!config.fonts || typeof config.fonts !== 'object') config.fonts = {};
        config.fonts[role.key] = select.value;
        select.style.fontFamily = fontPreviewFamily(select.value);
        notify('Typography updated in your invitation.');
      });
      field.appendChild(label);
      field.appendChild(select);
      grid.appendChild(field);
    });
    section.appendChild(grid);
    editor.appendChild(section);
  }

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
      ebGaramond: '"EB Garamond", serif',
      lora: '"Lora", serif',
      cardo: '"Cardo", serif',
      spectral: '"Spectral", serif',
      crimsonPro: '"Crimson Pro", serif',
      libreBaskerville: '"Libre Baskerville", serif',
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

  function addAppearanceSettings() {
    var section = document.createElement('section');
    section.className = 'global-settings-group';
    var heading = document.createElement('h3');
    heading.textContent = 'Shared look & feel';
    section.appendChild(heading);

    var themeField = document.createElement('div');
    themeField.className = 'field field--wide';
    var label = document.createElement('label');
    label.htmlFor = 'theme-select';
    label.textContent = 'Website colour theme';
    var select = document.createElement('select');
    select.id = label.htmlFor;
    [
      ['burgundy', 'Burgundy heirloom'],
      ['rose', 'Soft rose'],
      ['olive', 'Garden olive'],
      ['midnight', 'Midnight blue']
    ].forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry[0];
      option.textContent = entry[1];
      select.appendChild(option);
    });
    select.value = config.theme || 'burgundy';
    select.addEventListener('change', function () {
      config.theme = select.value;
      config.themeColors = {};
      config.colorEdits = {};
      config.hiddenElements = {};
      renderSidebar();
      notify();
    });
    themeField.appendChild(label);
    themeField.appendChild(select);
    section.appendChild(themeField);

    var paletteHeading = document.createElement('h4');
    paletteHeading.textContent = 'Website colour palette';
    section.appendChild(paletteHeading);
    var paletteHint = document.createElement('p');
    paletteHint.className = 'field-hint';
    paletteHint.textContent = 'Choose a theme above, then adjust these colours to update the invitation throughout.';
    section.appendChild(paletteHint);
    var palette = document.createElement('div');
    palette.className = 'palette-editor';
    var themeColorDefaults = {
      burgundy: { primary: '#5D2029', darkBackground: '#24090D', paper: '#F7F4EE', accent: '#CDBB9A', botanical: '#777957', rose: '#C5A0A0' },
      rose: { primary: '#70404A', darkBackground: '#2A171C', paper: '#FAF4EF', accent: '#D5B6A1', botanical: '#81706B', rose: '#D19DA4' },
      olive: { primary: '#53513A', darkBackground: '#22231B', paper: '#F8F5EC', accent: '#CBB98E', botanical: '#777957', rose: '#C5A0A0' },
      midnight: { primary: '#394253', darkBackground: '#171C26', paper: '#F5F3EE', accent: '#C8B99A', botanical: '#777D83', rose: '#B8A0A7' }
    };
    var activeThemeColors = themeColorDefaults[config.theme] || themeColorDefaults.burgundy;
    [
      ['primary', 'Primary'],
      ['darkBackground', 'Dark background'],
      ['paper', 'Light paper'],
      ['accent', 'Champagne accent'],
      ['botanical', 'Botanical'],
      ['rose', 'Rose']
    ].forEach(function (role) {
      var item = document.createElement('div');
      item.className = 'palette-editor__item';
      var label = document.createElement('label');
      label.textContent = role[1];
      var color = document.createElement('input');
      color.id = 'theme-color-' + role[0];
      color.type = 'color';
      label.htmlFor = color.id;
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
    section.appendChild(palette);

    var swatchHeading = document.createElement('h4');
    swatchHeading.textContent = 'Wedding-day palette swatches';
    section.appendChild(swatchHeading);
    var swatchHint = document.createElement('p');
    swatchHint.className = 'field-hint';
    swatchHint.textContent = 'Each colour is its own swatch — rename it, recolour it or remove it without touching the others. The same swatches are selectable one by one on the invitation itself.';
    section.appendChild(swatchHint);
    /* the swatch rows live in their own grid so they never mix with
       the website theme colours above                             */
    var swatchList = document.createElement('div');
    swatchList.className = 'palette-editor palette-editor--swatches';
    (config.palette || []).forEach(function (swatch, index) {
      var item = document.createElement('div');
      item.className = 'palette-editor__item palette-editor__item--swatch';
      var name = document.createElement('input');
      name.type = 'text';
      name.value = swatch.name || '';
      name.setAttribute('aria-label', 'Swatch ' + (index + 1) + ' name');
      name.addEventListener('input', function () {
        config.palette[index].name = name.value;
        notify();
      });
      var color = document.createElement('input');
      color.type = 'color';
      color.value = /^#[0-9a-f]{6}$/i.test(swatch.color || '') ? swatch.color : '#cdbb9a';
      color.setAttribute('aria-label', 'Swatch ' + (index + 1) + ' colour');
      color.addEventListener('input', function () {
        config.palette[index].color = color.value.toUpperCase();
        notify();
      });
      var removeSwatch = document.createElement('button');
      removeSwatch.type = 'button';
      removeSwatch.className = 'swatch-remove';
      removeSwatch.textContent = '×';
      removeSwatch.setAttribute('aria-label',
        'Remove swatch ' + (index + 1) + (swatch.name ? ' (' + swatch.name + ')' : '') + ' only');
      removeSwatch.addEventListener('click', function () {
        if (!Array.isArray(config.palette) || !config.palette[index]) return;
        var removedName = config.palette[index].name || 'swatch ' + (index + 1);
        config.palette.splice(index, 1);
        /* stale swatch keys never hide anything — the array is the
           single source of truth                                */
        if (config.hiddenElements && typeof config.hiddenElements === 'object') {
          Object.keys(config.hiddenElements).forEach(function (key) {
            if (/^palette-swatch-\d+$/.test(key)) delete config.hiddenElements[key];
          });
        }
        renderSidebar();
        notify('"' + removedName + '" was taken out of the palette. The other colours keep their places.');
      });
      item.appendChild(name);
      item.appendChild(color);
      item.appendChild(removeSwatch);
      swatchList.appendChild(item);
    });
    if (!config.palette || !config.palette.length) {
      var emptySwatches = document.createElement('p');
      emptySwatches.className = 'field-hint';
      emptySwatches.textContent = 'No swatches yet — add one below.';
      section.appendChild(emptySwatches);
    }
    section.appendChild(swatchList);
    var addSwatchField = document.createElement('div');
    addSwatchField.className = 'field field--wide';
    var addSwatchButton = document.createElement('button');
    addSwatchButton.type = 'button';
    addSwatchButton.className = 'maps-button';
    addSwatchButton.textContent = 'Add a colour swatch';
    addSwatchButton.addEventListener('click', function () {
      if (!Array.isArray(config.palette)) config.palette = [];
      config.palette.push({
        name: 'Colour ' + (config.palette.length + 1),
        color: '#CDBB9A'
      });
      renderSidebar();
      notify('A new swatch joined the palette — name it and pick its colour.');
    });
    addSwatchField.appendChild(addSwatchButton);
    section.appendChild(addSwatchField);
    editor.appendChild(section);
  }

  function renderSidebar() {
    var openSections = {};
    editor.querySelectorAll('details[data-editor-section]').forEach(function (details) {
      openSections[details.dataset.editorSection] = details.open;
    });
    editor.textContent = '';
    addSharedFields();
    addWordingSettings();
    addOpeningSettings();
    addMomentsSettings();
    addRsvpSettings();
    addAppearanceSettings();
    addTypographySettings();
    var sections = editor.querySelectorAll('.global-settings-group');
    sections.forEach(function (section, index) {
      var heading = section.querySelector('h3');
      if (!heading) return;
      var title = heading.textContent.trim();
      var key = title.toLowerCase();
      var details = document.createElement('details');
      details.className = 'global-settings-group editor-accordion';
      details.dataset.editorSection = key;
      details.open = Object.prototype.hasOwnProperty.call(openSections, key)
        ? openSections[key]
        : index === 0;
      var summary = document.createElement('summary');
      summary.appendChild(heading);
      var content = document.createElement('div');
      content.className = 'editor-accordion__content';
      while (section.firstChild) content.appendChild(section.firstChild);
      details.appendChild(summary);
      details.appendChild(content);
      section.replaceWith(details);
    });
    editor.querySelectorAll('.global-settings-group').forEach(function (section) {
      var heading = section.querySelector('h3');
      if (heading) {
        var title = heading.textContent.trim().toLowerCase();
        var details = section.closest('details[data-editor-section]');
        if (details) {
          details.addEventListener('toggle', function () {
            if (!details.open) return;
            editor.querySelectorAll('details[data-editor-section]').forEach(function (other) {
              if (other !== details) other.open = false;
            });
          });
        }
      }
    });
  }

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
      if (hint) hint.textContent = 'The live preview could not load: ' + message.message;
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
        /* every element on the canvas can be removed — backgrounds are
           the exception (the scene itself always stays)               */
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
            ? 'Palette swatch selected. Change this one colour or remove just this swatch — the rest stay untouched.'
            : 'Element selected. Recolour it, remove it, or press Done to keep editing.';
      } else {
        hideColorTooltip(false);
        if (hint && message.element === 'text') {
          hint.textContent = 'Edit the selected text in the preview. Click elsewhere when you are done.';
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
        notify('The swatch keeps its name — give it at least one character.');
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

  function validConfig(value) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      value.couple && value.wedding && value.venue && value.content &&
      (value.palette == null || Array.isArray(value.palette)) &&
      (value.moments == null || Array.isArray(value.moments));
  }

  window.addEventListener('message', handlePreviewMessage);

  /* ── access code (optional seller gate) ─────────────────────── */
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
      /* a palette swatch recolours only itself — the array entry is
         the single source of truth for that swatch                */
      if (!Array.isArray(config.palette) || !config.palette[selectedColorSwatchIndex]) return;
      config.palette[selectedColorSwatchIndex].color = value.toUpperCase();
      notify('Swatch colour updated — only this swatch changed.');
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
      if (hint) hint.textContent = 'Tooltip closed. Click any element or the background to keep styling your invitation.';
    });
  }
  if (removeElementButton) {
    removeElementButton.addEventListener('click', function () {
      if (!selectedColorSelector || selectedColorKey === 'skip-intro') return;
      var removedLabel = colorActionLabel && colorActionLabel.textContent
        ? colorActionLabel.textContent : labelForKey(selectedColorKey);
      /* a palette swatch comes out of the palette array itself —
         the other colours keep their places                     */
      if (selectedColorSwatchIndex != null) {
        if (!Array.isArray(config.palette) || !config.palette[selectedColorSwatchIndex]) return;
        config.palette.splice(selectedColorSwatchIndex, 1);
        if (config.hiddenElements && typeof config.hiddenElements === 'object') {
          Object.keys(config.hiddenElements).forEach(function (key) {
            if (/^palette-swatch-\d+$/.test(key)) delete config.hiddenElements[key];
          });
        }
        hideColorTooltip(true);
        renderSidebar();
        notify('"' + removedLabel + '" was taken out of the palette. The remaining colours keep their places.');
        return;
      }
      if (!config.hiddenElements || typeof config.hiddenElements !== 'object') config.hiddenElements = {};
      if (!config.hiddenSelectors || typeof config.hiddenSelectors !== 'object') config.hiddenSelectors = {};
      /* a key names the labelled catalogue piece — a click on text
         inside it (a row label, a heading) removes the whole piece,
         exactly what the tooltip promised. Pieces without a key come
         away by their own structural selector, so every clickable
         element can still be removed                             */
      if (selectedColorKey) {
        config.hiddenElements[selectedColorKey] = true;
      } else {
        config.hiddenSelectors[selectedColorSelector] = true;
      }
      hideColorTooltip(true);
      notify('"' + removedLabel + '" was removed from the invitation. Use “Restore removed elements” under the preview to bring it back.');
    });
  }
  var restoreRemovedButton = document.getElementById('restore-removed');
  if (restoreRemovedButton) {
    restoreRemovedButton.addEventListener('click', function () {
      config.hiddenElements = {};
      config.hiddenSelectors = {};
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

  document.getElementById('reset-config').addEventListener('click', function () {
    if (typeof window.confirm === 'function' &&
        !window.confirm('Restore the sample invitation? Your current edits will be replaced.')) return;
    config = clone(defaults);
    renderRsvpResponses([]);
    if (document.getElementById('rsvp-responses')) document.getElementById('rsvp-responses').hidden = true;
    renderSidebar();
    notify('Sample invitation restored. Review the preview before publishing.');
  });

  document.getElementById('import-config').addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { notify('The selected JSON file could not be read.'); };
    reader.onload = function () {
      try {
        var imported = JSON.parse(String(reader.result));
        if (!validConfig(imported)) throw new Error('This file does not look like a wedding invitation configuration.');
        config = imported;
        renderSidebar();
        notify('Backup imported. Review the preview before publishing.');
      } catch (error) {
        notify(error.message || 'This file is not valid configuration JSON.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('download-json').addEventListener('click', function () {
    download('heirloom-config.json', JSON.stringify(config, null, 2) + '\n', 'application/json;charset=utf-8');
    notify('Your JSON backup is ready.');
  });

  if (publishButton) publishButton.addEventListener('click', publishInvitation);
  if (copyPublishedUrl) copyPublishedUrl.addEventListener('click', function () {
    if (!publishedUrl || !publishedUrl.value) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(publishedUrl.value).then(function () {
        notify('Live invitation link copied.');
      }).catch(function () {
        publishedUrl.select();
        notify('Select and copy the live invitation link.');
      });
    } else {
      publishedUrl.select();
      document.execCommand('copy');
      notify('Live invitation link copied.');
    }
  });

  renderSidebar();
  loadManagedInvitation();
})();
