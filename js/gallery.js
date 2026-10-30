
/* ╔══════════════════════════════════════════════════════════════════╗
   ║  THE VISUAL DIARY — behaviour                                    ║
   ║  INTEGRATION: copy this whole <script> with the section.         ║
   ║  Visual data (src / alt / captions) lives in the <figure>        ║
   ║  blocks above; behaviour knobs live in CONFIG below.             ║
   ╚══════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  /* ── Behaviour configuration ──────────────────────────────────── */
  var CONFIG = {
    scrollStep: '36vh',        // desktop: scroll distance per photograph (also set as --hg-step in CSS)
    swipeThresholdRatio: .22,  // swipe commits past 22% of the card width …
    swipeThresholdMin: 72,     // … or at least 72px
    flingVelocity: .5,         // px/ms — a quick flick commits even under the threshold
    dragRotation: .05,         // deg of card tilt per px of horizontal drag (subtle on purpose)
    narrowBreakpoint: 760      // below this width even fine-pointer devices get the deck
  };

  var section = document.getElementById('heirloom-gallery');
  var stage   = document.getElementById('hg-stage');
  if (!section || !stage) return;

  var wrap      = stage.closest('.hg-scrollwrap');
  var chrome    = document.getElementById('hg-chrome');
  var folio     = document.getElementById('hg-folio');
  var captionEl = document.getElementById('hg-caption');
  var capA      = captionEl.querySelector('.hg-caption-a');
  var capB      = captionEl.querySelector('.hg-caption-b');
  var capMeta   = document.getElementById('hg-caption-meta');
  var prevBtn   = document.getElementById('hg-prev');
  var nextBtn   = document.getElementById('hg-next');
  var curNum    = document.getElementById('hg-progress-cur');
  var totalNum  = document.getElementById('hg-progress-total');
  var fill      = document.getElementById('hg-progress-fill');
  var live      = document.getElementById('hg-live');
  var endEl     = document.getElementById('hg-end');
  var restartBtn= document.getElementById('hg-restart');

  /* the photograph collection, read from the markup (single source of truth) */
  var plates = Array.prototype.slice.call(stage.querySelectorAll('.hg-plate'));
  var imgs   = plates.map(function (p) { return p.querySelector('img'); });
  var metas  = imgs.map(function (img, i) {
    return {
      plate: plates[i], img: img,
      caption: img ? (img.getAttribute('data-caption') || '') : '',
      meta:    img ? (img.getAttribute('data-meta') || '') : '',
      side: null                                   // which way this card was swiped away ('l' | 'r')
    };
  });
  var N = plates.length;
  if (!N) return;

  var reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarseMQ  = window.matchMedia('(hover: none), (pointer: coarse)');

  /* optional URL override for previewing a specific mode: ?hg-mode=deck|scroll|static */
  var forcedMode = null;
  try {
    var mMatch = window.location.search.match(/[?&]hg-mode=(deck|scroll|static)\b/);
    if (mMatch) forcedMode = mMatch[1];
  } catch (e) {}

  var state = { mode: null, index: 0, showA: true };
  var deck  = null;              // deck interaction state (deck mode only)
  var tl = null, st = null;      // GSAP timeline + its ScrollTrigger (scroll mode only)
  var modeAc = null;             // AbortController for the current mode's listeners
  var globalAc = new AbortController();
  var wrapTop = 0, wrapH = 0, vh = 0;

  function pad(n)   { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ── Chrome (progress + caption + live region) ────────────────── */

  function updateChrome(i, force) {
    i = clamp(i, 0, N - 1);
    var d = metas[i];
    var captionPath = 'content.diaryCaption' + pad(i + 1);
    var metaPath = 'content.diaryFolio' + pad(i + 1);
    capA.setAttribute('data-editor-path', captionPath);
    capB.setAttribute('data-editor-path', captionPath);
    capA.setAttribute('data-editor-placeholder', 'Click to add a caption');
    capB.setAttribute('data-editor-placeholder', 'Click to add a caption');
    capMeta.setAttribute('data-editor-path', metaPath);
    curNum.textContent = pad(i + 1);
    fill.style.transform = 'scaleX(' + ((i + 1) / N) + ')';

    var front = state.showA ? capA : capB;
    var back  = state.showA ? capB : capA;
    if (force) {
      front.textContent = d.caption || (window.parent !== window ? 'Click to add a caption' : '');
      front.classList.add('is-front');
      back.classList.remove('is-front');
    } else {
      back.textContent = d.caption || (window.parent !== window ? 'Click to add a caption' : '');
      back.classList.add('is-front');
      front.classList.remove('is-front');
      state.showA = !state.showA;
    }
    capMeta.textContent = d.meta;
    folio.textContent = pad(i + 1);
    live.textContent = 'Photograph ' + (i + 1) + ' of ' + N + (d.caption ? ' — ' + d.caption : '');

    prevBtn.disabled = (i === 0);
    nextBtn.disabled = (state.mode === 'deck') ? (!!(deck && deck.empty)) : (i === N - 1);

    endEl.classList.toggle('is-visible', i === N - 1);
  }

  function setIndex(i) {
    state.index = clamp(i, 0, N - 1);
    if (state.mode === 'deck' && deck) layoutDeck();
    updateChrome(state.index, false);
  }

  /* ════════════════════════════════════════════════════════════════
     MODE routing — one DOM, three behaviours
     ════════════════════════════════════════════════════════════════ */

  function desiredMode() {
    if (forcedMode) return forcedMode;
    if (reducedMQ.matches) return 'static';
    var coarse = coarseMQ.matches;
    var narrow = window.innerWidth < CONFIG.narrowBreakpoint;
    if (coarse || narrow) return 'deck';
    var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    return hasGsap ? 'scroll' : 'static';
  }

  function applyMode() {
    var mode = desiredMode();
    if (mode === state.mode) return;
    teardown();
    state.mode = mode;
    section.classList.remove('hg-mode-deck', 'hg-mode-scroll', 'hg-mode-static');
    section.classList.add('hg-mode-' + mode);
    if (mode === 'deck')        setupDeck();
    else if (mode === 'scroll') setupScroll();
    else                        setupStatic();
    updateChrome(state.index, true);
  }

  function teardown() {
    if (modeAc) { modeAc.abort(); modeAc = null; }
    if (st) { try { window.ScrollTrigger.removeEventListener('refresh', measure); } catch (e) {} st.kill(); st = null; }
    if (tl) { tl.kill(); tl = null; }
    if (window.gsap) { gsap.killTweensOf(plates); gsap.killTweensOf(imgs); }
    plates.forEach(function (pl) {
      pl.style.cssText = '';
      pl.className = 'hg-plate';
    });
    Array.prototype.slice.call(section.querySelectorAll('[data-hg-static]'))
      .forEach(function (n) { n.remove(); });
    stage.classList.remove('is-empty', 'is-dragging');
    wrap.style.removeProperty('--hg-n');
    wrap.after(chrome);                       // chrome returns to its flow position
    deck = null;
  }

  /* ════════════════════════════════════════════════════════════════
     DECK — Tinder-style card swiping (pointer events, no library)
     ════════════════════════════════════════════════════════════════ */

  function setupDeck() {
    modeAc = new AbortController();
    var sig = { signal: modeAc.signal };
    deck = {
      dragging: false, intent: false,
      pid: null, startX: 0, startY: 0, dx: 0, dy: 0,
      lastX: 0, lastT: 0, vx: 0,
      raf: 0, committing: false, holdT: 0, empty: false
    };
    layoutDeck();
    stage.addEventListener('pointerdown',  onDown,  sig);
    stage.addEventListener('pointermove',  onMove,  sig);
    stage.addEventListener('pointerup',    onUp,    sig);
    stage.addEventListener('pointercancel', onUp,   sig);
    stage.addEventListener('keydown',      onKey,   sig);
  }

  /* assign pose classes from state.index — CSS transitions do the moving */
  function layoutDeck() {
    plates.forEach(function (pl, i) {
      pl.style.cssText = '';
      pl.classList.remove('is-active', 'is-next', 'is-next2', 'is-parked', 'is-parked-l', 'is-parked-r', 'is-dragging', 'no-trans');
      if (deck && deck.empty) {                   // the whole deck has been swiped away
        pl.classList.add(metas[i].side ? 'is-parked-' + metas[i].side : 'is-parked');
      } else if (i === state.index) {
        pl.classList.add('is-active');
      } else if (i === state.index + 1) {
        pl.classList.add('is-next');
      } else if (i === state.index + 2) {
        pl.classList.add('is-next2');
      } else {
        pl.classList.add(metas[i].side ? 'is-parked-' + metas[i].side : 'is-parked');
      }
    });
  }

  function onDown(e) {
    if (!deck || deck.committing || deck.empty) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    deck.pid = e.pointerId;
    deck.startX = deck.lastX = e.clientX;
    deck.startY = e.clientY;
    deck.lastT = performance.now();
    deck.vx = 0; deck.dx = 0; deck.dy = 0;
    deck.intent = false; deck.dragging = false;
  }

  function onMove(e) {
    if (!deck || e.pointerId !== deck.pid) return;
    var dx = e.clientX - deck.startX;
    var dy = e.clientY - deck.startY;
    var now = performance.now();
    var dt = now - deck.lastT;
    if (dt > 0 && dt < 120) deck.vx = deck.vx * .8 + ((e.clientX - deck.lastX) / dt) * .2;
    deck.lastX = e.clientX; deck.lastT = now;

    if (!deck.intent) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        /* horizontal intent claimed — capture the pointer */
        deck.intent = true; deck.dragging = true;
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
        stage.classList.add('is-dragging');
        plates[state.index].classList.add('is-dragging');
      } else if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        deck.pid = null;                          // vertical intent — hand the gesture back to the page
        return;
      } else return;
    }
    deck.dx = dx; deck.dy = dy;
    if (!deck.raf) deck.raf = requestAnimationFrame(paintDrag);
  }

  /* the card follows the finger 1:1; the card beneath drifts along, slightly */
  function paintDrag() {
    deck.raf = 0;
    if (!deck.dragging) return;
    var pl = plates[state.index];
    pl.style.transform = 'translate3d(' + deck.dx + 'px,' + (deck.dy * .16) + 'px,0) rotate(' + (deck.dx * CONFIG.dragRotation) + 'deg)';
    var nx = plates[state.index + 1];
    if (nx) {
      var p = Math.min(1, Math.abs(deck.dx) / (stage.offsetWidth || 1));
      nx.style.transform = 'translate3d(' + (deck.dx * .12) + 'px,' + (15 - 15 * p) + 'px,0) scale(' + (.945 + .055 * p) + ') rotate(' + (-1.7 * (1 - p)) + 'deg)';
    }
  }

  function onUp(e) {
    if (!deck || e.pointerId !== deck.pid) return;
    deck.pid = null;
    stage.classList.remove('is-dragging');
    if (!deck.dragging) return;
    deck.dragging = false;
    if (deck.raf) { cancelAnimationFrame(deck.raf); deck.raf = 0; }

    var w = stage.offsetWidth || 1;
    var threshold = Math.max(CONFIG.swipeThresholdMin, w * CONFIG.swipeThresholdRatio);
    var fling = Math.abs(deck.vx) > CONFIG.flingVelocity && deck.dx !== 0 &&
                Math.sign(deck.vx) === Math.sign(deck.dx);

    if (Math.abs(deck.dx) >= threshold || (fling && Math.abs(deck.dx) > 24)) {
      commitForward(deck.dx > 0 ? 1 : -1);
    } else {
      /* not far enough — settle back onto the pile */
      var pl = plates[state.index];
      pl.classList.remove('is-dragging');
      pl.style.transform = ''; pl.style.opacity = '';
      var nx = plates[state.index + 1];
      if (nx) nx.style.transform = '';
    }
    deck.dx = 0; deck.dy = 0;
  }

  /* commit: current card leaves (its pose class parks it off-screen),
     the one beneath is promoted — all motion is class-driven CSS transition */
  function commitForward(dir) {
    if (!deck || deck.empty) return;
    deck.committing = true;
    clearTimeout(deck.holdT);
    deck.holdT = setTimeout(function () { deck.committing = false; }, 340);
    metas[state.index].side = dir > 0 ? 'r' : 'l';
    if (state.index === N - 1) {
      deck.empty = true;
      stage.classList.add('is-empty');
      layoutDeck();
      updateChrome(state.index, false);
    } else {
      setIndex(state.index + 1);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     SCROLL — GSAP ScrollTrigger drives the sequence from page scroll
     ════════════════════════════════════════════════════════════════ */

  function setupScroll() {
    modeAc = new AbortController();
    var sig = { signal: modeAc.signal };
    gsap.registerPlugin(ScrollTrigger);
    wrap.style.setProperty('--hg-n', N);
    stage.appendChild(chrome);                  /* chrome lives inside the sticky stage while scrolling */

    gsap.set(plates, { opacity: 0, xPercent: 6.5, rotation: 1.2, scale: .962, zIndex: function (i) { return N - i; }, transformOrigin: '50% 58%' });
    gsap.set(plates[0], { opacity: 1, xPercent: 0, rotation: 0, scale: 1 });

    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: 'bottom bottom',
        scrub: .5,                                  /* settles quickly; stable the moment scrolling stops */
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var i = Math.round(self.progress * (N - 1));
          if (i !== state.index) setIndex(i);
        }
      }
    });

    /* Each photograph holds fully visible for the first and last 18% of
       its step, then dissolves across the middle 64% — the picture sits
       before it turns, like prints being lifted from a pile. */
    var HOLD = .18, TURN = 1 - HOLD * 2;
    plates.forEach(function (pl, i) {
      var img = pl.querySelector('img');
      if (i > 0) {
        tl.fromTo(pl,
          { opacity: 0, xPercent: 6.5, rotation: 1.2, scale: .962 },
          { opacity: 1, xPercent: 0, rotation: 0, scale: 1, duration: TURN, immediateRender: false }, (i - 1) + HOLD);
      }
      if (i < N - 1) {
        tl.to(pl,
          { opacity: 0, xPercent: -6.5, rotation: -1.2, scale: .962, duration: TURN, immediateRender: false }, i + HOLD);
      }
      /* the print slides gently inside its mat while it is on stage */
      var segStart = i > 0 ? i - 1 : 0;
      var segDur = (i > 0 && i < N - 1) ? 2 : 1;
      tl.fromTo(img, { yPercent: 3.4 }, { yPercent: -3.4, duration: segDur, immediateRender: false }, segStart);
    });
    tl.set({}, {}, N - 1);                        /* pin the timeline length to exactly N-1 steps */

    st = tl.scrollTrigger;
    measure();
    window.addEventListener('resize', debounce(measure, 160), sig);
    window.ScrollTrigger.addEventListener('refresh', measure);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (state.mode === 'scroll' && st) { st.refresh(); measure(); }
      });
    }
    stage.addEventListener('keydown', onKey, sig);
  }

  function measure() {
    if (state.mode !== 'scroll') return;
    var r = wrap.getBoundingClientRect();
    wrapTop = r.top + window.pageYOffset;
    wrapH = wrap.offsetHeight;
    vh = window.innerHeight;
  }

  /* buttons + keyboard: scroll to the position where plate i is centred */
  function goTo(i) {
    i = clamp(i, 0, N - 1);
    if (state.mode !== 'scroll' || !wrapH) return;
    var target = wrapTop + (i / (N - 1)) * (wrapH - vh);
    window.scrollTo({ top: target, behavior: reducedMQ.matches ? 'auto' : 'smooth' });
  }

  /* ════════════════════════════════════════════════════════════════
     STATIC — reduced motion / no GSAP: a quiet editorial film-strip
     ════════════════════════════════════════════════════════════════ */

  function setupStatic() {
    metas.forEach(function (m, i) {
      if (!m.caption && window.parent === window) return;
      var c = document.createElement('p');
      c.className = 'hg-static-caption';
      c.setAttribute('data-hg-static', '');
      var caption = document.createElement('span');
      caption.setAttribute('data-editor-path', 'content.diaryCaption' + pad(i + 1));
      if (!m.caption && window.parent !== window) caption.setAttribute('data-editor-placeholder', 'Click to add a caption');
      caption.textContent = m.caption || (window.parent !== window ? 'Click to add a caption' : '');
      c.appendChild(caption);
      if (m.meta) {
        var separator = document.createElement('span');
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = ' · ';
        c.appendChild(separator);
        var meta = document.createElement('span');
        meta.setAttribute('data-editor-path', 'content.diaryFolio' + pad(i + 1));
        meta.textContent = m.meta;
        c.appendChild(meta);
      }
      m.plate.appendChild(c);
    });
  }

  /* ════════════════════════════════════════════════════════════════
     Shared controls
     ════════════════════════════════════════════════════════════════ */

  function nextAction() {
    if (state.mode === 'deck' && deck) {
      if (deck.empty) return;
      commitForward(1);
    } else if (state.mode === 'scroll') {
      goTo(state.index + 1);
    }
  }

  function prevAction() {
    if (state.mode === 'deck' && deck) {
      if (deck.empty) { deck.empty = false; stage.classList.remove('is-empty'); }
      if (state.index > 0) setIndex(state.index - 1);
    } else if (state.mode === 'scroll') {
      goTo(state.index - 1);
    }
  }

  function restart() {
    if (state.mode === 'deck' && deck) {
      deck.empty = false;
      stage.classList.remove('is-empty');
      metas.forEach(function (m) { m.side = null; });
      setIndex(0);
    } else if (state.mode === 'scroll') {
      goTo(0);
    }
  }

  function onKey(e) {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); nextAction(); break;
      case 'ArrowLeft':  case 'ArrowUp':   e.preventDefault(); prevAction(); break;
      case 'Home': e.preventDefault(); if (state.mode === 'scroll') goTo(0); else setIndex(0); break;
      case 'End':  e.preventDefault(); if (state.mode === 'scroll') goTo(N - 1); else setIndex(N - 1); break;
    }
  }

  prevBtn.addEventListener('click', prevAction);
  nextBtn.addEventListener('click', nextAction);
  restartBtn.addEventListener('click', restart);

  /* ── boot ─────────────────────────────────────────────────────── */

  totalNum.textContent = pad(N);

  coarseMQ.addEventListener('change', applyMode, { signal: globalAc.signal });
  reducedMQ.addEventListener('change', applyMode, { signal: globalAc.signal });
  window.addEventListener('resize', debounce(applyMode, 220), { signal: globalAc.signal });

  applyMode();

  document.addEventListener('heirloom:config-updated', function () {
    metas.forEach(function (item) {
      item.caption = item.img ? (item.img.getAttribute('data-caption') || '') : '';
      item.meta = item.img ? (item.img.getAttribute('data-meta') || '') : '';
      var staticCaption = item.plate.querySelector('[data-hg-static]');
      if (staticCaption) {
        var captionText = staticCaption.querySelector('[data-editor-path^="content.diaryCaption"]');
        var metaText = staticCaption.querySelector('[data-editor-path^="content.diaryFolio"]');
        if (captionText) {
          captionText.textContent = item.caption ||
            (window.parent !== window ? 'Click to add a caption' : '');
          if (!item.caption && window.parent !== window) {
            captionText.setAttribute('data-editor-placeholder', 'Click to add a caption');
          }
        }
        if (metaText) metaText.textContent = item.meta;
        var separator = staticCaption.querySelector('[aria-hidden="true"]');
        if (separator) separator.hidden = !item.meta;
        staticCaption.hidden = !item.caption && window.parent === window;
      }
    });
    updateChrome(state.index, true);
  });

  /* public API — safe to call from other scripts on your site */
  window.HeirloomGallery = {
    next: nextAction,
    prev: prevAction,
    goTo: goTo,
    destroy: function () {
      globalAc.abort();
      teardown();
      section.classList.remove('hg-mode-deck', 'hg-mode-scroll', 'hg-mode-static');
      state.mode = null;
    }
  };
})();