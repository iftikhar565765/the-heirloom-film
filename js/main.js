/* ═══════════════════════════════════════════════════════════════
   THE HEIRLOOM FILM · main.js
   Content injection · navigation · countdown · wedding-day words ·
   calendar files · reveals · parallax · audio · replay.
   Everything degrades gracefully:
   · no GSAP      → reveals still run (CSS + IntersectionObserver)
   · reduced motion → no scroll effects, countdown still runs
   · no JS at all → the page reads fully (see README)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var cfg = window.HEIRLOOM || {};
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';

  /* ══ 1 · CONTENT INJECTION (progressive enhancement) ═══════════
     The copy lives in index.html; config values refine it. If a
     [data-content] key exists in config.content below, its string
     replaces the text. Keys map to the config sections.           */
  function getConfigValue(path, source) {
    return path.split('.').reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, source || cfg);
  }

  function injectContent() {
    var c = cfg.couple || {}, w = cfg.wedding || {}, v = cfg.venue || {}, r = cfg.rsvp || {};
    var map = {
      'couple.names': c.namesLine,
      'couple.initials': c.initials,
      'couple.partner-one': c.partnerOne,
      'couple.partner-two': c.partnerTwo,
      'wedding.display': w.display,
      'wedding.words': w.words,
      'wedding.numerals': w.numerals,
      'wedding.zoneLabel': w.zoneLabel,
      'venue.name': v.name,
      'venue.address': v.address,
      'rsvp.deadline': r.deadline
    };
    Object.keys(map).forEach(function (key) {
      if (map[key] == null) return;
      document.querySelectorAll('[data-content="' + key + '"]').forEach(function (el) {
        el.textContent = map[key];
      });
    });
    document.querySelectorAll('[data-couple-initials]').forEach(function (el) {
      if (c.initials != null) el.textContent = c.initials;
    });
    document.querySelectorAll('[data-content^="content."]').forEach(function (el) {
      var value = getConfigValue(el.getAttribute('data-content'));
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll('[data-placeholder-content]').forEach(function (el) {
      var value = getConfigValue(el.getAttribute('data-placeholder-content'));
      if (value != null) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('[data-aria-label-content]').forEach(function (el) {
      var value = getConfigValue(el.getAttribute('data-aria-label-content'));
      if (value != null) el.setAttribute('aria-label', value);
    });
    document.querySelectorAll('[data-meta-property], [data-meta-name]').forEach(function (el) {
      var value = getConfigValue(el.getAttribute('data-meta-content'));
      if (value == null) return;
      el.setAttribute('content', value);
    });
    var title = getConfigValue('content.pageTitle');
    if (typeof title === 'string' && title) document.title = title;
    var description = getConfigValue('content.pageDescription');
    var descriptionEl = document.querySelector('meta[name="description"]');
    if (descriptionEl && typeof description === 'string' && description) descriptionEl.content = description;
    applyTheme();
    applyFonts();
    applyPalette();
  }

  function applyPreviewConfig(nextConfig) {
    if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) return;
    cfg = nextConfig;
    window.HEIRLOOM = cfg;
    injectContent();
    applyColorEdits();
    applyHiddenElements();
    renderMoments();
    initCountdown();
    initMapLink();
    updateGcalLink();
    document.dispatchEvent(new CustomEvent('heirloom:config-updated'));
  }
  window.HeirloomApplyPublishedConfig = applyPreviewConfig;

  var editableContentPaths = {
    'couple.names': 'couple.namesLine',
    'couple.initials': 'couple.initials',
    'couple.partner-one': 'couple.partnerOne',
    'couple.partner-two': 'couple.partnerTwo',
    'wedding.display': 'wedding.display',
    'wedding.words': 'wedding.words',
    'wedding.numerals': 'wedding.numerals',
    'wedding.zoneLabel': 'wedding.zoneLabel',
    'venue.name': 'venue.name',
    'venue.address': 'venue.address',
    'rsvp.deadline': 'rsvp.deadline'
  };

  function previewMessage(message) {
    if (window.parent === window) return;
    window.parent.postMessage(message, window.location.origin === 'null' ? '*' : window.location.origin);
  }

  function configPathForContent(key) {
    if (key.indexOf('content.nav') === 0 || key.indexOf('content.menu') === 0) return '';
    if (key.indexOf('content.') === 0) return key;
    return editableContentPaths[key] || '';
  }

  var fontFamilies = {
    editorial: {
      bodoni: "'Bodoni Moda', serif",
      playfair: "'Playfair Display', serif",
      dmSerif: "'DM Serif Display', serif",
      cormorant: "'Cormorant Garamond', serif"
    },
    display: {
      cormorant: "'Cormorant Garamond', serif",
      ebGaramond: "'EB Garamond', serif",
      lora: "'Lora', serif",
      playfair: "'Playfair Display', serif"
    },
    script: {
      pinyon: "'Pinyon Script', cursive",
      greatVibes: "'Great Vibes', cursive",
      allura: "'Allura', cursive"
    },
    hand: {
      laBelle: "'La Belle Aurore', cursive",
      caveat: "'Caveat', cursive",
      cedarville: "'Cedarville Cursive', cursive"
    },
    body: {
      jost: "'Jost', sans-serif",
      dmSans: "'DM Sans', sans-serif",
      lato: "'Lato', sans-serif",
      montserrat: "'Montserrat', sans-serif"
    }
  };

  function applyFonts() {
    var fonts = cfg.fonts || {};
    Object.keys(fontFamilies).forEach(function (role) {
      var choices = fontFamilies[role];
      var selected = choices[fonts[role]] || choices[{
        editorial: 'bodoni',
        display: 'cormorant',
        script: 'pinyon',
        hand: 'laBelle',
        body: 'jost'
      }[role]];
      document.documentElement.style.setProperty('--font-' + role, selected);
    });
  }

  function colorSelectorFor(element) {
    var parts = [];
    var current = element;
    while (current && current !== document.body && current.parentElement) {
      var tag = current.tagName.toLowerCase();
      var index = 1;
      var sibling = current;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName.toLowerCase() === tag) index++;
      }
      parts.unshift(tag + ':nth-of-type(' + index + ')');
      current = current.parentElement;
    }
    return parts.length ? 'body > ' + parts.join(' > ') : '';
  }

  function colorToHex(color) {
    var match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
    if (!match) return '';
    if (match[4] !== undefined && Number(match[4]) === 0) return '';
    return '#' + match.slice(1, 4).map(function (part) {
      return Number(part).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  function backgroundToHex(styles) {
    return colorToHex(styles.backgroundColor);
  }

  /* The colour a region really shows: walk up until a painted
     background is found, so gradient sections still get a fair
     starting value in the editor's background tooltip.          */
  function effectiveBackground(element) {
    var current = element;
    while (current && current !== document.documentElement) {
      var hex = backgroundToHex(window.getComputedStyle(current));
      if (hex) return hex;
      current = current.parentElement;
    }
    return '#18070b';
  }

  /* Removable pieces of the opening & keepsake — keyed in HTML via
     data-element-key and hidden through config.hiddenElements.      */
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
    'details-keepsake': 'Keepsake card'
  };

  function keyFor(element) {
    var keyed = element && element.closest ? element.closest('[data-element-key]') : null;
    return keyed ? keyed.getAttribute('data-element-key') : '';
  }

  var appliedHiddenElements = [];

  function applyHiddenElements() {
    appliedHiddenElements.forEach(function (element) {
      element.style.removeProperty('display');
    });
    appliedHiddenElements = [];
    var hidden = cfg.hiddenElements;
    if (!hidden || typeof hidden !== 'object' || Array.isArray(hidden)) return;
    Object.keys(hidden).forEach(function (key) {
      if (!hidden[key]) return;
      var element;
      try {
        element = document.querySelector('[data-element-key="' + key + '"]');
      } catch (error) {
        return;
      }
      if (!element) return;
      appliedHiddenElements.push(element);
      element.style.setProperty('display', 'none', 'important');
    });
  }

  function labelFor(element) {
    var text = (element.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, 40);
    var key = keyFor(element);
    if (key && elementLabels[key]) return elementLabels[key];
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label').slice(0, 40);
    var cls = (element.className || '').toString().trim().split(/\s+/)[0] || '';
    if (cls) return cls.replace(/[_.-]+/g, ' ').replace(/\b\w/g, function (ch) {
      return ch.toUpperCase();
    }).slice(0, 40);
    return element.tagName.toLowerCase();
  }

  function sendColorSelection(element) {
    var selector = colorSelectorFor(element);
    if (!selector) return;
    var styles = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    var key = keyFor(element);
    previewMessage({
      type: 'heirloom:element-selected',
      element: 'color',
      selector: selector,
      key: key,
      removable: !!key,
      label: labelFor(element),
      color: colorToHex(styles.color) || '#f7f4ee',
      backgroundColor: backgroundToHex(styles),
      anchor: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    });
  }

  function sendBackgroundSelection(element, x, y) {
    var selector = element === document.body ? 'body' : colorSelectorFor(element);
    if (!selector) return;
    var name = element.id ? '#' + element.id :
      (element.getAttribute('aria-label') || element.className || 'background')
        .toString().trim().replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ');
    previewMessage({
      type: 'heirloom:element-selected',
      element: 'background',
      selector: selector,
      key: '',
      removable: false,
      label: 'Background · ' + name,
      backgroundColor: effectiveBackground(element),
      anchor: { left: (x || 0) - 30, top: (y || 0) - 30, width: 60, height: 60 }
    });
  }

  var appliedColorElements = [];

  function applyColorEdits() {
    appliedColorElements.forEach(function (entry) {
      if (entry.color) entry.element.style.setProperty('color', entry.color, entry.colorPriority);
      else entry.element.style.removeProperty('color');
      if (entry.backgroundColor) {
        entry.element.style.setProperty('background-color', entry.backgroundColor, entry.backgroundPriority);
      } else {
        entry.element.style.removeProperty('background-color');
      }
    });
    appliedColorElements = [];
    var edits = cfg.colorEdits;
    if (!edits || typeof edits !== 'object' || Array.isArray(edits)) return;
    Object.keys(edits).forEach(function (selector) {
      var edit = edits[selector];
      if (!edit || typeof edit !== 'object') return;
      var element;
      try {
        element = document.querySelector(selector);
      } catch (error) {
        return;
      }
      if (!element) return;
      appliedColorElements.push({
        element: element,
        color: element.style.getPropertyValue('color'),
        colorPriority: element.style.getPropertyPriority('color'),
        backgroundColor: element.style.getPropertyValue('background-color'),
        backgroundPriority: element.style.getPropertyPriority('background-color')
      });
      if (/^#[0-9a-f]{6}$/i.test(edit.color || '')) {
        element.style.setProperty('color', edit.color, 'important');
      }
      if (/^#[0-9a-f]{6}$/i.test(edit.backgroundColor || '')) {
        element.style.setProperty('background-color', edit.backgroundColor, 'important');
        /* gradient images would cover the flat colour — clear them so
           the change is always visible in the preview and live page */
        element.style.setProperty('background-image', 'none', 'important');
      }
    });
  }

  var clearEditorSelection = null;

  function enableCanvasEditing() {
    if (window.parent === window) return;
    var activeText = null;
    var activeColorElement = null;
    var editorStyles = document.createElement('style');
    editorStyles.textContent =
      '[data-content][contenteditable="true"],[data-editor-path][contenteditable="true"]{' +
        'outline:1px dashed rgba(205,187,154,.95)!important;' +
        'outline-offset:4px!important;cursor:text!important;' +
      '}' +
      '.heirloom-editor-color-selected{' +
        'outline:1px dashed rgba(205,187,154,.9)!important;' +
        'outline-offset:3px!important;' +
        'cursor:crosshair!important;' +
      '}' +
      /* decorative envelope pieces ignore pointer events on the guest
         page — the editor needs to reach them for recolour & removal */
      '.envelope-lace,.envelope-shadow,.envelope__stamps,.envelope__seal,.envelope__letter{' +
        'pointer-events:auto!important;' +
      '}' +
      '[data-element-key]:not([contenteditable="true"]){cursor:crosshair;}';
    document.head.appendChild(editorStyles);

    function clearActive() {
      if (activeColorElement) activeColorElement.classList.remove('heirloom-editor-color-selected');
      activeColorElement = null;
      if (activeText) activeText.blur();
      activeText = null;
    }

    clearEditorSelection = function () {
      if (activeText) {
        activeText.removeAttribute('contenteditable');
        activeText.classList.remove('heirloom-editor-text-active');
      }
      clearActive();
    };

    document.addEventListener('click', function (event) {
      if (event.target.closest('#skip-intro')) {
        /* the skip link stays fully functional and never selectable —
           discard any open selection so the tooltip never lingers    */
        previewMessage({ type: 'heirloom:element-selected', element: 'none' });
        clearActive();
        return;
      }
      if (event.target.closest('input, textarea, select, label')) {
        previewMessage({ type: 'heirloom:element-selected', element: 'none' });
        clearActive();
        return;
      }

      var textElement = event.target.closest('[data-editor-path], [data-content]');
      var textPath = '';
      if (textElement) {
        textPath = textElement.getAttribute('data-editor-path') ||
          configPathForContent(textElement.getAttribute('data-content') || '');
        if (textElement.closest('[data-nav], #mobile-menu')) textPath = '';
      }
      if (textElement && textPath && typeof getConfigValue(textPath) === 'string') {
        event.stopPropagation();
        if (textElement === activeText) return;
        if (textElement.closest('a, button')) event.preventDefault();
        if (activeText && activeText !== textElement) activeText.blur();
        if (activeColorElement && activeColorElement !== textElement) {
          activeColorElement.classList.remove('heirloom-editor-color-selected');
        }
        activeColorElement = textElement;
        textElement.classList.add('heirloom-editor-color-selected');
        activeText = textElement;
        textElement.contentEditable = 'true';
        textElement.classList.add('heirloom-editor-text-active');
        textElement.focus();
        var selection = window.getSelection();
        if (selection) {
          var range = document.createRange();
          range.selectNodeContents(textElement);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          if (textElement.hasAttribute('data-editor-placeholder')) {
            textElement.textContent = textElement.getAttribute('data-editor-placeholder');
            selection.selectNodeContents(textElement);
          }
        }
        var keyedOwner = keyFor(textElement);
        previewMessage({
          type: 'heirloom:element-selected',
          element: 'text',
          path: textPath,
          selector: colorSelectorFor(textElement),
          key: keyedOwner,
          removable: !!keyedOwner,
          label: (textElement.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          color: colorToHex(window.getComputedStyle(textElement).color) || '#f7f4ee',
          backgroundColor: backgroundToHex(window.getComputedStyle(textElement)),
          anchor: (function () {
            var rect = textElement.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          })()
        });
        return;
      }

      /* envelope faces paint over their keyed wrappers — select the
         face itself for recolouring; Remove still targets the keyed
         parent (keyFor walks up) so the whole piece comes away      */
      var envelopeFace = event.target.closest('.envelope__flap-face, .envelope__pocket-face, ' +
        '.envelope__flap-liner, .envelope__back, .envelope__letter-inner');
      if (envelopeFace) {
        event.preventDefault();
        event.stopPropagation();
        clearActive();
        activeColorElement = envelopeFace;
        envelopeFace.classList.add('heirloom-editor-color-selected');
        sendColorSelection(envelopeFace);
        return;
      }

      /* keyed decorative pieces (lace, stamps, seal, letter, flap…) —
         selectable for recolouring and removable                          */
      var keyedElement = event.target.closest('[data-element-key]');
      if (keyedElement && !keyedElement.closest('[data-nav], #mobile-menu')) {
        event.preventDefault();
        event.stopPropagation();
        clearActive();
        activeColorElement = keyedElement;
        keyedElement.classList.add('heirloom-editor-color-selected');
        sendColorSelection(keyedElement);
        return;
      }

      var colorElement = event.target.closest('a, button, p, h1, h2, h3, h4, li, span, strong, em, blockquote');
      if (colorElement && !colorElement.closest('[data-nav], #mobile-menu')) {
        event.preventDefault();
        event.stopPropagation();
        clearActive();
        activeColorElement = colorElement;
        colorElement.classList.add('heirloom-editor-color-selected');
        sendColorSelection(colorElement);
        return;
      }

      /* blank space → select the surrounding background for recolouring */
      var backgroundElement = event.target.closest('section, header, footer') || document.body;
      sendBackgroundSelection(backgroundElement, event.clientX, event.clientY);
      clearActive();
    }, true);

    document.addEventListener('blur', function (event) {
      var element = event.target;
      if (!element.matches || !element.matches('[contenteditable="true"][data-content], [contenteditable="true"][data-editor-path]')) return;
      var path = element.getAttribute('data-editor-path') ||
        configPathForContent(element.getAttribute('data-content') || '');
      element.removeAttribute('contenteditable');
      element.classList.remove('heirloom-editor-text-active');
      if (path) previewMessage({
        type: 'heirloom:element-edited',
        element: 'text',
        path: path,
        value: element.hasAttribute('data-editor-placeholder') &&
          element.textContent === element.getAttribute('data-editor-placeholder')
          ? ''
          : element.textContent
      });
      if (activeText === element) activeText = null;
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && event.target.matches &&
          event.target.matches('[contenteditable="true"][data-content], [contenteditable="true"][data-editor-path]')) {
        event.preventDefault();
        event.target.blur();
      }
    }, true);
  }

  window.addEventListener('message', function (event) {
    if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin) return;
    var message = event.data;
    if (!message) return;
    if (message.type === 'heirloom:preview' && message.config) {
      var previewConfig = message.config;
      if (previewConfig.rsvp) previewConfig.rsvp.endpoint = '';
      applyPreviewConfig(previewConfig);
    }
    if (message.type === 'heirloom:clear-selection' && clearEditorSelection) {
      clearEditorSelection();
    }
  });
  var themePresets = {
    burgundy: { burgundy: '#5D2029', deep: '#4B1A22', wine: '#35181D', crimson: '#8D1E2B', champagne: '#CDBB9A', soft: '#B9A47E', parchment: '#EEE8DD', ivory: '#F7F4EE', paper: '#FBF9F4', night: '#24090D', nightDeep: '#1A060A', olive: '#777957', oliveDeep: '#66684A', sage: '#A1A18A', rose: '#C5A0A0', ink: '#292622', inkSoft: '#4E4942', charcoal: '#70695F' },
    rose: { burgundy: '#70404A', deep: '#56313A', wine: '#39252A', crimson: '#A65D69', champagne: '#D5B6A1', soft: '#C49A8F', parchment: '#F1E8E2', ivory: '#FAF4EF', paper: '#FFF9F5', night: '#2A171C', nightDeep: '#1B0E12', olive: '#81706B', oliveDeep: '#69595A', sage: '#B9A09A', rose: '#D19DA4', ink: '#30282A', inkSoft: '#55484B', charcoal: '#76696B' },
    olive: { burgundy: '#53513A', deep: '#3F402E', wine: '#302F26', crimson: '#777957', champagne: '#CBB98E', soft: '#B6A274', parchment: '#EFEADD', ivory: '#F8F5EC', paper: '#FCFAF2', night: '#22231B', nightDeep: '#161711', olive: '#777957', oliveDeep: '#66684A', sage: '#A1A18A', rose: '#C5A0A0', ink: '#292920', inkSoft: '#4B4A3F', charcoal: '#6A695C' },
    midnight: { burgundy: '#394253', deep: '#283141', wine: '#202733', crimson: '#65718A', champagne: '#C8B99A', soft: '#B2A17F', parchment: '#E8E6E0', ivory: '#F5F3EE', paper: '#FAF9F5', night: '#171C26', nightDeep: '#10141C', olive: '#777D83', oliveDeep: '#626970', sage: '#A1A7AA', rose: '#B8A0A7', ink: '#25282C', inkSoft: '#484D53', charcoal: '#686D72' }
  };

  function applyTheme() {
    var themeName = Object.prototype.hasOwnProperty.call(themePresets, cfg.theme) ? cfg.theme : 'burgundy';
    var colors = themePresets[themeName];
    var root = document.documentElement;
    root.style.setProperty('--burgundy', colors.burgundy);
    root.style.setProperty('--burgundy-deep', colors.deep);
    root.style.setProperty('--wine', colors.wine);
    root.style.setProperty('--crimson', colors.crimson);
    root.style.setProperty('--champagne', colors.champagne);
    root.style.setProperty('--champagne-soft', colors.soft);
    root.style.setProperty('--parchment', colors.parchment);
    root.style.setProperty('--ivory', colors.ivory);
    root.style.setProperty('--paper-raised', colors.paper);
    root.style.setProperty('--night', colors.night);
    root.style.setProperty('--night-deep', colors.nightDeep);
    root.style.setProperty('--olive', colors.olive);
    root.style.setProperty('--olive-deep', colors.oliveDeep);
    root.style.setProperty('--sage', colors.sage);
    root.style.setProperty('--rose', colors.rose);
    root.style.setProperty('--ink', colors.ink);
    root.style.setProperty('--ink-soft', colors.inkSoft);
    root.style.setProperty('--charcoal', colors.charcoal);
    root.style.setProperty('--shadow-seal',
      '0 4px 10px color-mix(in srgb, ' + colors.burgundy + ' 45%, transparent), ' +
      '0 14px 30px color-mix(in srgb, ' + colors.burgundy + ' 28%, transparent)');
    var customColors = cfg.themeColors || {};
    var colorRoles = {
      primary: ['--burgundy', '--burgundy-deep', '--crimson'],
      darkBackground: ['--wine', '--night', '--night-deep'],
      paper: ['--ivory', '--paper-raised', '--parchment'],
      accent: ['--champagne', '--champagne-soft', '--gold'],
      botanical: ['--olive', '--olive-deep', '--sage'],
      rose: ['--rose']
    };
    Object.keys(colorRoles).forEach(function (role) {
      var color = customColors[role];
      if (!/^#[0-9a-f]{6}$/i.test(color || '')) return;
      colorRoles[role].forEach(function (property) {
        root.style.setProperty(property, color);
      });
    });
    document.documentElement.dataset.theme = themeName;
    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.content = colors.night;
  }

  function applyPalette() {
    if (!Array.isArray(cfg.palette)) return;
    document.querySelectorAll('.palette-swatch').forEach(function (item, index) {
      var swatch = cfg.palette[index];
      if (!swatch) return;
      var color = item.querySelector('.palette-color');
      var name = item.querySelector('.palette-name');
      var value = item.querySelector('.palette-value');
      if (color && /^#[0-9a-f]{6}$/i.test(swatch.color || '')) color.style.setProperty('--swatch-color', swatch.color);
      if (name && typeof swatch.name === 'string') name.textContent = swatch.name;
      if (value && typeof swatch.color === 'string') value.textContent = swatch.color.toUpperCase();
    });
  }
  injectContent();
  applyColorEdits();
  applyHiddenElements();
  enableCanvasEditing();

  /* ══ 2 · NAVIGATION ════════════════════════════════════════════ */
  var nav = document.querySelector('[data-nav]');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Full-screen scene index (mobile menu) */
  var menuToggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');
  var menuClose = document.getElementById('menu-close');
  var menuPreviousOverflow = '';

  function setMenu(open) {
    if (!menu || !menuToggle) return;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menuPreviousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      var first = menu.querySelector('a, button');
      if (first) first.focus();
      document.addEventListener('keydown', onMenuKeydown);
    } else {
      document.removeEventListener('keydown', onMenuKeydown);
      document.body.style.overflow = menuPreviousOverflow;
      menuToggle.focus();
    }
  }
  function onMenuKeydown(e) {
    if (e.key === 'Escape') {
      setMenu(false);
      return;
    }
    if (e.key !== 'Tab') return;
    var focusable = menu.querySelectorAll('a[href], button:not([disabled])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if (menuToggle && menu) {
    menuToggle.addEventListener('click', function () { setMenu(menu.hidden); });
    if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  /* Active-section highlighting in the nav */
  (function initActiveLinks() {
    var ids = ['story', 'details', 'venue', 'rsvp'];
    var links = {};
    document.querySelectorAll('.nav__links a').forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace('#', '');
      if (id) links[id] = a;
    });
    if (!('IntersectionObserver' in window)) return;
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          if (current && current !== link) current.removeAttribute('aria-current');
          link.setAttribute('aria-current', 'true');
          current = link;
        } else if (current === link) {
          link.removeAttribute('aria-current');
          current = null;
        }
      });
    }, { rootMargin: '-38% 0px -55% 0px' });
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  })();

  /* Sections become focusable targets for anchor navigation */
  document.querySelectorAll('main section[id]').forEach(function (s) {
    if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '-1');
  });
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.length < 2 || href === '#') return;
    a.addEventListener('click', function () {
      var target = document.getElementById(href.slice(1));
      if (target) {
        // native smooth scrolling happens; we only move focus for a11y
        window.setTimeout(function () {
          try { target.focus({ preventScroll: true }); } catch (e) {}
        }, 650);
      }
    });
  });

  /* ══ 3 · WEDDING-DAY WORD SPREAD ═════════════════════════════ */
  function renderMoments() {
    var list = document.getElementById('day-words');
    var scene = document.getElementById('itinerary');
    var items = Array.isArray(cfg.moments) ? cfg.moments.map(function (word, index) {
      return { word: word, index: index };
    }).filter(function (item) {
      return typeof item.word === 'string' && item.word.trim();
    }) : [];
    if (!list) return;
    if (!items.length) {
      if (scene) scene.hidden = true;
      return;
    }
    if (scene) scene.hidden = false;
    list.innerHTML = items.map(function (item) {
      return '<li class="day-word reveal">' +
        '<svg class="day-word__icon" viewBox="0 0 32 32" aria-hidden="true">' +
        '<path d="M16 27c0-6 1-10 5-14M16 22c-1-4-4-6-8-6 0 4 3 7 8 8m3-11c-2-4-1-7 2-10 4 3 4 6 1 10m-5 5c3-3 6-4 10-3-1 4-5 6-10 6" />' +
        '<path d="M21 13c-2-2-2-5 0-7 2 2 3 5 0 7Zm0 0c3-1 5 0 6 2-2 2-5 2-6-2Z" />' +
        '</svg><span class="day-word__text" data-editor-path="moments.' + item.index + '">' +
        escapeHTML(item.word.trim()) + '</span></li>';
    }).join('');
    if (window.parent !== window) {
      list.querySelectorAll('.reveal').forEach(function (item) { item.classList.add('in-view'); });
    }
  }
  renderMoments();

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* ══ 4 · COUNTDOWN ═════════════════════════════════════════════ */
  var countdownTimer = null;
  var countdownVisibilityHandler = null;
  function initCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    if (countdownVisibilityHandler) document.removeEventListener('visibilitychange', countdownVisibilityHandler);
    var box = document.getElementById('countdown-clock');
    var msg = document.getElementById('countdown-message');
    var summary = document.getElementById('countdown-summary');
    if (!box || !msg) return;

    var els = {
      d: box.querySelector('[data-cd-days]'),
      h: box.querySelector('[data-cd-hours]'),
      m: box.querySelector('[data-cd-mins]'),
      s: box.querySelector('[data-cd-secs]')
    };

    function showMsg(text) {
      box.hidden = true;
      msg.hidden = false;
      msg.textContent = text;
      if (summary) summary.textContent = '';
    }

    var raw = cfg.wedding && cfg.wedding.iso;
    var target = raw ? new Date(raw) : null;
    if (!target || isNaN(target.getTime())) {
      showMsg((cfg.countdown && cfg.countdown.invalidMessage) ||
              'See the details below for the full schedule.');
      return;
    }

    var lastDayText = '';

    function pad(n) { return String(n).padStart(2, '0'); }

    function tick() {
      var diff = target.getTime() - Date.now();
      if (diff <= 0) {
        if (countdownTimer) window.clearInterval(countdownTimer);
        countdownTimer = null;
        showMsg((cfg.countdown && cfg.countdown.pastMessage) || 'The celebration has begun.');
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor(diff / 3600000) % 24;
      var m = Math.floor(diff / 60000) % 60;
      var s = Math.floor(diff / 1000) % 60;

      els.d.textContent = String(d);
      els.h.textContent = pad(h);
      els.m.textContent = pad(m);
      els.s.textContent = pad(s);

      var dayText = d + (d === 1 ? ' day' : ' days') + ' until the wedding';
      if (dayText !== lastDayText) {
        lastDayText = dayText;
        if (summary) summary.textContent = dayText;
      }
    }

    tick();
    countdownTimer = window.setInterval(tick, 1000);

    /* pause the ticker while the tab is hidden */
    countdownVisibilityHandler = function () {
      if (document.hidden) {
        if (countdownTimer) { window.clearInterval(countdownTimer); countdownTimer = null; }
      } else if (!countdownTimer) {
        tick();
        countdownTimer = window.setInterval(tick, 1000);
      }
    };
    document.addEventListener('visibilitychange', countdownVisibilityHandler);
  }
  initCountdown();

  /* ══ 5 · VENUE MAP LINK ════════════════════════════════════════ */
  function initMapLink() {
    var link = document.getElementById('map-link');
    if (!link) return;
    var v = cfg.venue || {};
    var location = [v.name, v.address].filter(Boolean).join(', ');
    var query = v.mapsQuery || location || '';
    link.removeAttribute('href');
    if (typeof v.mapUrl === 'string' && /^https?:\/\//i.test(v.mapUrl)) {
      link.href = v.mapUrl;
    } else if (query) {
      link.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(query);
    }
    link.target = '_blank';
    link.rel = 'noopener';
  }
  initMapLink();

  /* ══ 6 · ADD TO CALENDAR (real .ics file + Google Calendar) ═════ */
  function padNum(n, len) { return String(n).padStart(len || 2, '0'); }
  function icsUTC(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + padNum(d.getUTCMonth() + 1) + padNum(d.getUTCDate()) +
           'T' + padNum(d.getUTCHours()) + padNum(d.getUTCMinutes()) + padNum(d.getUTCSeconds()) + 'Z';
  }
  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
                    .replace(/\r?\n/g, '\\n');
  }

  function calendarData() {
    var w = cfg.wedding || {};
    var v = cfg.venue || {};
    var c = cfg.couple || {};
    var start = w.iso ? new Date(w.iso) : null;
    if (!start || isNaN(start.getTime())) return null;
    var end = w.endIso ? new Date(w.endIso) : new Date(start.getTime() + 4 * 3600000);
    if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) return null;
    var title = w.eventTitle || ((c.namesLine || 'Our Wedding'));
    var location = [v.name, v.address].filter(Boolean).join(', ');
    var url = '';
    if (typeof v.mapUrl === 'string' && /^https?:\/\//i.test(v.mapUrl)) url = v.mapUrl;
    else if (v.mapsQuery || location) url = 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(v.mapsQuery || location);
    return { start: start, end: end, title: title, location: location, url: url };
  }

  var icsBtn = document.getElementById('ics-download');
  if (icsBtn) {
    icsBtn.addEventListener('click', function () {
      var data = calendarData();
      if (!data) return;
      var lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//The Heirloom Film//Wedding Invitation//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:' + icsUTC(data.start.getTime()) + '-heirloom@invitation',
        'DTSTAMP:' + icsUTC(Date.now()),
        'DTSTART:' + icsUTC(data.start.getTime()),
        'DTEND:' + icsUTC(data.end.getTime()),
        'SUMMARY:' + icsEscape(data.title),
        'LOCATION:' + icsEscape(data.location || 'To be announced'),
        'DESCRIPTION:' + icsEscape('With love, ' + (cfg.couple && cfg.couple.namesLine || '') +
                       '. See the invitation for details.' + (data.url ? '\\n' + data.url : '')),
        'END:VEVENT',
        'END:VCALENDAR'
      ];
      var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'wedding-invitation.ics';
      document.body.appendChild(a);
      a.click();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 400);
    });
  }

  function updateGcalLink() {
    var gcalLink = document.getElementById('gcal-link');
    if (!gcalLink) return;
    var data = calendarData();
    gcalLink.removeAttribute('href');
    if (data) {
      var params = new URLSearchParams({
        action: 'TEMPLATE',
        text: data.title,
        dates: icsUTC(data.start.getTime()) + '/' + icsUTC(data.end.getTime()),
        location: data.location || '',
        details: 'See the invitation for details.' + (data.url ? ' ' + data.url : '')
      });
      gcalLink.href = 'https://calendar.google.com/calendar/render?' + params.toString();
      gcalLink.target = '_blank';
      gcalLink.rel = 'noopener';
    }
  }
  updateGcalLink();

  /* ══ 7 · SECTION REVEALS (CSS transitions + IntersectionObserver) ══ */
  (function initReveals() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    /* gentle natural stagger inside marked groups */
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.querySelectorAll('.reveal'), function (el, i) {
        if (!el.style.getPropertyValue('--reveal-delay')) {
          el.style.setProperty('--reveal-delay', (i * 0.09).toFixed(2) + 's');
        }
      });
    });

    if (reducedQuery.matches || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  })();

  /* ══ 8 · A BREATH OF PARALLAX (GSAP only, never essential) ═════ */
  function initParallax() {
    if (!hasST || reducedQuery.matches) return;
    try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return; }
    document.querySelectorAll('[data-drift]').forEach(function (el) {
      gsap.fromTo(el, { yPercent: -3 }, {
        yPercent: 3, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom', end: 'bottom top', scrub: true
        }
      });
    });
  }
  if (document.body.classList.contains('intro-done')) initParallax();
  document.addEventListener('heirloom:intro-complete', initParallax);

  /* ══ 9 · OPTIONAL AMBIENT MUSIC ════════════════════════════════ */
  (function initAudio() {
    var btn = document.getElementById('audio-toggle');
    if (!btn || !cfg.audio || !cfg.audio.src) return;

    var audio = new Audio();
    audio.src = cfg.audio.src;
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'none';

    var playing = false;
    btn.hidden = false;

    function render() {
      btn.innerHTML = playing
        ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>';
      btn.setAttribute('aria-pressed', String(playing));
      btn.setAttribute('aria-label', playing ? 'Pause ambient music' : 'Play ambient music');
    }
    render();

    btn.addEventListener('click', function () {
      if (playing) {
        audio.pause();
        playing = false;
        render();
      } else {
        var p = audio.play();
        if (p && p.catch) {
          p.then(function () { playing = true; render(); })
           .catch(function () { render(); }); // browser policy — stays silent, stays honest
        } else {
          playing = true; render();
        }
      }
    });
  })();

  /* ══ 10 · REPLAY THE OPENING & RETURN TO TOP ═══════════════════ */
  var replayBtn = document.getElementById('replay-intro');
  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      if (typeof window.heirloomReplayIntro === 'function') {
        window.heirloomReplayIntro();
      } else {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
      }
    });
  }
  var topBtn = document.getElementById('back-to-top');
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedQuery.matches ? 'auto' : 'smooth' });
    });
  }

})();
