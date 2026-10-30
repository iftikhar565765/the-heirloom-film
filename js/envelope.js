/* ═══════════════════════════════════════════════════════════════
   THE HEIRLOOM FILM · envelope.js
   The opening experience — wax seal, flap, letter, handover.
   · GSAP choreography when GSAP is available
   · Pure-CSS keyframe fallback when GSAP fails to load
   · Instant, motion-free handover under prefers-reduced-motion
   · Always escapable: skip control, the open button, Escape key
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Tell the inline watchdog (index.html) that the intro system is alive. */
  window.__heirloomIntroReady = true;

  var body = document.body;
  var opening = document.getElementById('opening');
  var envelope = document.getElementById('envelope');
  var skipBtn = document.getElementById('skip-intro');
  var openBtn = document.getElementById('open-invitation');

  if (!opening || !envelope) {
    // Nothing to orchestrate — reveal the site immediately.
    body.classList.remove('intro-pending');
    body.classList.add('intro-done');
    return;
  }

  var letter = envelope.querySelector('.envelope__letter');
  var flap = envelope.querySelector('.envelope__flap');
  var seal = envelope.querySelector('.envelope__seal');
  var fadingParts = '.envelope__pocket, .envelope__back, .envelope__flap, ' +
                    '.envelope__stamps, .envelope-shadow, .envelope-lace';

  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined';

  var started = false;
  var finished = false;
  var timeline = null;

  /* ── Final handover ──────────────────────────────────────────── */
  function completeIntro(fadeOut) {
    if (finished) return;
    finished = true;

    if (timeline) { timeline.kill(); timeline = null; }

    if (fadeOut) opening.classList.add('is-leaving');

    body.classList.remove('intro-pending');
    body.classList.add('intro-done');

    // Hand focus to the invitation headline for keyboard & screen readers.
    // preventScroll keeps the arrival at the very top of the suite —
    // focusing must never yank the guest into the middle of the card.
    var h1 = document.getElementById('invitation-title');
    if (h1) {
      try { h1.focus({ preventScroll: true }); } catch (e) { h1.focus(); }
      window.scrollTo(0, 0);
    }

    // The cover leaves the accessibility tree entirely.
    opening.setAttribute('aria-hidden', 'true');
    try { opening.inert = true; } catch (e) { /* older browsers: visual hiding suffices */ }

    window.setTimeout(function () {
      opening.style.display = 'none';
    }, fadeOut ? 1050 : 120);

    document.dispatchEvent(new CustomEvent('heirloom:intro-complete'));
  }

  /* ── GSAP choreography ───────────────────────────────────────── */
  function openWithGsap() {
    envelope.classList.add('is-open');

    gsap.set(letter, { yPercent: 4, scale: 1 });
    gsap.set(flap, { rotationX: 0, transformOrigin: '50% 0%' });
    gsap.set(seal, { xPercent: -50, yPercent: -50, rotation: -3 });

    timeline = gsap.timeline({ onComplete: function () { completeIntro(false); } });

    timeline
      /* 1 · the envelope acknowledges the touch */
      .to(envelope, { scale: 1.02, duration: 0.32, ease: 'power2.out' })

      /* 2 · the wax seal loosens and falls away */
      .to(seal, {
        rotation: 15, y: -20, scale: 0.9, opacity: 0,
        duration: 0.6, ease: 'power1.in'
      }, 0.12)

      /* 3 · the flap opens — z-index drops mid-flip so it passes
            behind the pocket, exactly like paper would            */
      .to(flap, { rotationX: -105, duration: 1.3, ease: 'power2.inOut' }, 0.78)
      .set(flap, { zIndex: 0 }, 1.88)

      /* 4 · the letter rises out of the pocket */
      .to(letter, { yPercent: -58, duration: 0.95, ease: 'power2.out' }, 1.72)

      /* 5 · the letter grows toward the viewer — the film begins */
      .to(letter, { yPercent: -72, scale: 2.05, duration: 0.95, ease: 'power2.in' }, 2.7)
      .to(fadingParts, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 2.75)
      .to(opening, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 2.9);
  }

  /* ── CSS-keyframes fallback (no GSAP) ────────────────────────── */
  function openWithFallback() {
    var wait = reducedQuery.matches ? 300 : 3300;
    envelope.classList.add('is-fallback-open');
    window.setTimeout(function () { completeIntro(true); }, wait);
  }

  /* ── Reduced motion: quiet, near-instant handover ─────────────── */
  function openReduced() {
    envelope.classList.add('is-open');
    window.setTimeout(function () { completeIntro(true); }, 120);
  }

  /* ── Entry point ─────────────────────────────────────────────── */
  function open() {
    if (started || finished) return;
    started = true;
    skipBtn.disabled = true;
    if (openBtn) openBtn.disabled = true;

    if (reducedQuery.matches)      openReduced();
    else if (hasGsap)              openWithGsap();
    else                           openWithFallback();
  }

  envelope.addEventListener('click', open);
  if (openBtn) openBtn.addEventListener('click', open);

  skipBtn.addEventListener('click', function () {
    if (started) return;
    started = true;
    completeIntro(true);
  });

  // Escape always offers a way out of the opening.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !finished && body.classList.contains('intro-pending')) {
      started = true;
      completeIntro(true);
    }
  });

  /* ── Replay (wired from the closing scene) ───────────────────── */
  window.heirloomReplayIntro = function () {
    if (!finished) return;
    finished = false;
    started = false;
    skipBtn.disabled = false;
    if (openBtn) openBtn.disabled = false;

    if (window.ScrollTrigger) {
      try { ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); } catch (e) {}
    }

    // Reset the envelope to its sealed state.
    envelope.classList.remove('is-open', 'is-fallback-open');
    [letter, flap, seal].forEach(function (el) {
      if (el && el.style) el.removeAttribute('style');
    });
    envelope.querySelectorAll('.envelope__pocket, .envelope__back, .envelope__flap, ' +
                               '.envelope__stamps, .envelope-shadow, .envelope-lace')
      .forEach(function (el) { el.removeAttribute('style'); });
    if (hasGsap) {
      gsap.set([letter, flap, seal], { clearProps: 'all' });
      gsap.set(envelope, { clearProps: 'all' });
    }

    // Reset the overlay.
    opening.classList.remove('is-leaving');
    opening.removeAttribute('aria-hidden');
    try { opening.inert = false; } catch (e) {}
    opening.style.display = '';
    opening.style.opacity = '';

    // Return to the top, instantly and quietly.
    body.classList.remove('intro-done');
    body.classList.add('intro-pending');
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, 0); }

    window.setTimeout(function () {
      try { envelope.focus({ preventScroll: true }); } catch (e) { envelope.focus(); }
    }, 60);
  };

})();
