/* =========================================================
   dfs-dive — the scroll dive opening (test: /rimbo-home-test)

   Separate from main.js on purpose: one page loads it in its own
   page custom code, nothing else on the site knows it exists.

   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@dive-v0.3.3/dive/dive.js"></script>

   Webflow structure (classes are free, the attributes matter):
     [data-dive]                 section, its height sets the scroll length (e.g. 380vh)
       [data-dive-sticky]        position: sticky; top: 0; height: 100vh; overflow: hidden
         [data-dive-canvas]      the dithered swirl (Paper Shaders) is mounted here
         [data-dive-fade]        colour layer the swirl drains into
         [data-dive-logo]        the DFS star (SVG is added here), Keeper tick
         [data-dive-title]       first line, words rise in
         [data-dive-end]         line on the empty page at the end
         [data-dive-end2]        optional second end line
         [data-dive-cue]         square glass box; hover/click rolls the label to
                                 "Continue" (data-dive-cue-alt), which stays during the dive; click 1 = glide
                                 to the first sentence, click 2 = to the closing sentence; there it turns
                                 into the bottom nav ([data-bottom-nav-init], Osmo Expanding Bottom Nav)

   Optional settings on [data-dive] (defaults = the hero lab):
     data-zoom="2.4" data-spin="420" data-pixel="2" data-pixel-grow="2"
     data-start-zoom="0.9" data-speed="0.5" data-pattern="4x4"
     data-fade="0.42" data-title-in="0.1" data-word-step="70"
     data-logo="keeper|spin|still"

   Colours follow the site's night mode (html.dfs-night):
   night = Mist (navy + dusk blue, ends in black), day = Ink (bage + dark grey, ends in bage).
   Shader: Paper Shaders Dithering, @paper-design/shaders 0.0.81, Apache 2.0.
   Also here: section 2, the time story ([data-time]), see initTime below.
   ========================================================= */

import { ShaderMount, ditheringFragmentShader, getShaderColorFromString as col } from 'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.81/+esm';

const root = document.querySelector('[data-dive]');
if (root) init(root);
const timeRoot = document.querySelector('[data-time]');
if (timeRoot) initTime(timeRoot);
const macRoot = document.querySelector('[data-mac]');
if (macRoot) initMac(macRoot);

function init(root) {
  const q = sel => root.querySelector(sel);
  const el = {
    sticky: q('[data-dive-sticky]'), canvas: q('[data-dive-canvas]'), fade: q('[data-dive-fade]'),
    logo: q('[data-dive-logo]'), title: q('[data-dive-title]'), end: q('[data-dive-end]'), end2: q('[data-dive-end2]'),
    cue: q('[data-dive-cue]'),
  };
  if (!el.sticky || !el.canvas) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (name, def) => { const v = parseFloat(root.dataset[name]); return Number.isFinite(v) ? v : def; };
  const S = {
    zoom: num('zoom', 2.4), spin: num('spin', 420), px: num('pixel', 2), pxGrow: num('pixelGrow', 2),
    scale0: num('startZoom', .9), speed: num('speed', .5), fade: num('fade', .42),
    titleIn: num('titleIn', .1), wordStep: num('wordStep', 70),
    type: { random: 1, '2x2': 2, '4x4': 3, '8x8': 4 }[root.dataset.pattern] || 3,
    logo: root.dataset.logo || 'keeper',
  };
  const PAL = {
    night: { back: '#0e1628', front: '#5f719c', text: '#f1ede2', accent: '#1dabfa', end: '#05070d', endText: '#f1ede2',
             glass: 'rgba(14,22,40,.42)', glassHover: 'rgba(14,22,40,.62)', glassHi: 'rgba(255,255,255,.07)',
             navBg: 'rgba(14,22,40,.82)', navLine: 'rgba(241,237,226,.14)' },
    day:   { back: '#f1ede2', front: '#3d3a35', text: '#3d3a35', accent: '#0297db', end: '#f1ede2', endText: '#3d3a35',
             glass: 'rgba(241,237,226,.5)', glassHover: 'rgba(241,237,226,.78)', glassHi: 'rgba(255,255,255,.55)',
             navBg: 'rgba(241,237,226,.86)', navLine: 'rgba(61,58,53,.14)' },
  };
  const isNight = () => document.documentElement.classList.contains('dfs-night');

  injectCSS();

  /* ---- shader ---- */
  const sizing = { u_fit: 0, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0 };
  let mount = null;
  try {
    const p = PAL[isNight() ? 'night' : 'day'];
    mount = new ShaderMount(el.canvas, ditheringFragmentShader, {
      ...sizing, u_colorBack: col(p.back), u_colorFront: col(p.front), u_shape: 6, u_type: S.type, u_pxSize: S.px, u_scale: S.scale0,
    }, undefined, reduce ? 0 : S.speed, 0);
  } catch (e) { console.warn('[dive] shader did not start', e); }

  /* ---- the star + Keeper tick (ring +45°, inner star -45°, every 4.4 s, Osmo curve) ---- */
  let outer, inner;
  if (el.logo) {
    const STAR = 'M21.127 5.125H26.873V10.876L26.874 10.875L32 16.001L26.874 21.126L26.873 21.125V26.8691H21.126L21.127 26.8701L16.001 31.9961L10.875 26.8701L10.876 26.8691H5.12598V21.126L0 16.001L5.12598 10.875V5.125H10.875L16.001 0L21.127 5.125ZM12.375 12.374H6.625L10.252 16.001L6.63184 19.6201H12.375V25.3701L16.001 21.7451L19.624 25.3672V19.6201H25.3682L21.748 16.001L25.375 12.374H19.624V6.62793L16.001 10.251L12.375 6.625V12.374Z';
    const cut = STAR.indexOf('ZM'), id = 'dive-star-' + Math.random().toString(36).slice(2, 7);
    el.logo.innerHTML = `<svg viewBox="0 0 32 32" role="img" aria-label="Digital Feng Shui"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-8" y="-8" width="48" height="48"><path fill="#fff" d="${STAR.slice(0, cut + 1)}"/><path fill="#000" d="M${STAR.slice(cut + 2)}"/></mask></defs><rect x="-8" y="-8" width="48" height="48" fill="currentColor" mask="url(#${id})"/></svg>`;
    [outer, inner] = el.logo.querySelectorAll('mask path');
  }
  const osmo = (() => {
    const x1 = .625, y1 = .05, x2 = 0, y2 = 1;
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = a => 3 * a;
    const f = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t, s = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const d = s(t, x1, x2); if (d < 1e-6) break; t -= (f(t, x1, x2) - x) / d; } return f(t, y1, y2); };
  })();
  const t0 = performance.now();
  let logoVisible = true;
  function tickLogo(now) {
    if (outer && logoVisible && !reduce) {
      const t = (now - t0) / 1000;
      const turns = S.logo === 'keeper' ? Math.floor(t / 4.4) + osmo(((t % 4.4) - 3.6) / .8) : S.logo === 'spin' ? t * .12 : 0;
      outer.setAttribute('transform', `rotate(${turns * 45} 16 16)`);
      inner.setAttribute('transform', `rotate(${-turns * 45} 16 16)`);
    }
    requestAnimationFrame(tickLogo);
  }
  requestAnimationFrame(tickLogo);

  /* ---- words: each word rises out of its own overflow-hidden box ---- */
  function split(node) {
    if (!node) return;
    const words = node.textContent.trim().split(/\s+/).filter(Boolean);
    node.setAttribute('aria-label', words.join(' '));
    node.innerHTML = '<span class="dive-txt" aria-hidden="true">' + words.map((w, i) =>
      `<span class="dive-w"><span class="dive-wi" style="transition-delay:${reduce ? 0 : i * S.wordStep}ms">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ') + '</span>';
  }
  [el.title, el.end, el.end2].forEach(split);
  document.documentElement.classList.add('dive-ready');
  const setState = (node, state) => {
    if (!node || node.dataset.diveState === state) return;
    node.dataset.diveState = state;
    node.classList.toggle('dive-in', state === 'in');
    node.classList.toggle('dive-out', state === 'out');
  };

  /* ---- colours ---- */
  const hex3 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lerp = (a, b, t) => { const A = hex3(a), B = hex3(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let P = PAL[isNight() ? 'night' : 'day'];
  function paint() {
    P = PAL[isNight() ? 'night' : 'day'];
    // on <html>, so the bottom nav (outside the dive section) gets the same colours
    const s = document.documentElement.style;
    s.setProperty('--dive-back', P.back); s.setProperty('--dive-text', P.text); s.setProperty('--dive-accent', P.accent);
    s.setProperty('--dive-end', P.end); s.setProperty('--dive-endtext', P.endText);
    s.setProperty('--dive-glass', P.glass); s.setProperty('--dive-glass-hover', P.glassHover); s.setProperty('--dive-glass-hi', P.glassHi);
    s.setProperty('--dive-nav-bg', P.navBg); s.setProperty('--dive-nav-line', P.navLine);
    render();
  }
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ---- scroll ---- */
  function progress() {
    const r = root.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }
  let lastKey = '';
  function render() {
    const p = progress();
    const z = sm(.04, .7, p), f0 = S.fade;
    const drain = sm(f0, f0 + .22, p), dark = sm(f0 + .1, f0 + .3, p);
    const key = p.toFixed(4) + P.back;
    if (mount && key !== lastKey) {
      lastKey = key;
      mount.setUniforms({
        u_scale: S.scale0 + z * S.zoom, u_rotation: z * S.spin, u_pxSize: S.px + Math.round(z * S.pxGrow),
        u_colorBack: col(P.back), u_colorFront: col(lerp(P.front, P.end, drain)),
      });
    }
    if (el.logo) {
      const lo = sm(.01, .07, p);
      el.logo.style.opacity = 1 - lo;
      el.logo.style.transform = `scale(${1 - lo * .6})`;
      logoVisible = lo < 1;
    }
    const outAt = Math.min(f0 - .04, S.titleIn + .26);
    setState(el.title, p < S.titleIn ? 'pre' : p < outAt ? 'in' : 'out');
    const endAt = f0 + .3;
    if (el.cue) {
      if (nav) {
        // the cue stays as "Continue" until the closing sentence, then turns into the bottom nav (and back)
        if (p >= endAt) showNav(true); else if (p < endAt - .03) showNav(false);
      } else {
        const o = 1 - sm(endAt - .05, endAt, p); el.cue.style.opacity = o; el.cue.style.pointerEvents = o > .3 ? 'auto' : 'none';
      }
      el.cue.classList.toggle('is-alt', p > .005);   // at the very top it reads "Scroll down" (hover shows "Continue")
      el.cue.setAttribute('aria-label', p > .005 ? 'Continue to the closing sentence' : 'Scroll down to the first sentence');
    }
    setState(el.end, p < endAt ? 'pre' : 'in');
    setState(el.end2, p < endAt + .1 ? 'pre' : 'in');
    if (el.fade) el.fade.style.opacity = dark;
  }
  /* ---- the cue is also a button: the label rolls to "Continue" (hover, or the click itself on touch).
     Click 1 glides to the first sentence, click 2 to the closing sentence ---- */
  if (el.cue) {
    const label = el.cue.querySelector('[data-dive-cue-text]');
    if (label) {
      const alt = el.cue.dataset.diveCueAlt || 'Continue';
      const words = (t, cls) => t.trim().split(/\s+/).map((w, i) =>
        `<span class="dive-w"><span class="${cls}" style="transition-delay:${reduce ? 0 : i * 45}ms">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ');
      label.setAttribute('aria-hidden', 'true');
      label.innerHTML = `<span class="dive-roll"><span>${words(label.textContent, 'dive-ra')}</span><span>${words(alt, 'dive-rb')}</span></span>`;
    }
    el.cue.setAttribute('role', 'button');
    el.cue.setAttribute('tabindex', '0');
    el.cue.setAttribute('aria-label', 'Scroll down to the first sentence');
    const go = () => {
      const top = root.getBoundingClientRect().top + scrollY, run = root.offsetHeight - innerHeight;
      const stops = [S.titleIn + .06, S.fade + .34];          // the first sentence, the closing sentence
      const now = progress(), next = stops.find(s => s > now + .01);
      if (next === undefined) return;
      const target = top + next * run;
      const duration = Math.min(3.2, Math.max(1.6, Math.abs(target - scrollY) / innerHeight * .55));
      if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(target, { duration: reduce ? 0 : duration });
      else scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    };
    const press = () => {
      const wasAlt = el.cue.classList.contains('is-alt') || el.cue.matches(':hover');
      el.cue.classList.add('is-alt');
      setTimeout(go, reduce || wasAlt ? 0 : 420);          // on touch, let the roll to "Continue" play first
    };
    el.cue.addEventListener('click', press);
    el.cue.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(); } });
  }

  /* ---- the cue becomes the nav (Osmo Expanding Bottom Navigation, [data-bottom-nav-init]).
     Same spot, same glass: the label rolls out, the box takes the nav bar's size, the nav takes over. ---- */
  const nav = document.querySelector('[data-bottom-nav-init]');
  const navInner = nav && nav.querySelector('[data-bottom-nav-inner]');
  const navBar = nav && nav.querySelector('[data-bottom-nav-bar]');
  const navToggle = nav && nav.querySelector('[data-bottom-nav-toggle]');
  const G = window.gsap;
  let navShown = null, cueSize = null, first = true;
  if (nav) { nav.style.visibility = 'hidden'; nav.style.opacity = '0'; nav.setAttribute('inert', ''); }
  // the nav's frosted colour is a color-mix() that GSAP can't tween (it flashed yellow): use the brand beige/navy at 72%
  function navGlass() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-colors--bage').trim();
    const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : P.back;
    return `rgba(${hex3(hex).join(',')},.72)`;
  }
  function showNav(show) {
    if (!nav || !navInner || show === navShown) return;
    navShown = show;
    const instant = first || reduce || !G;
    first = false;
    if (show) nav.removeAttribute('inert'); else nav.setAttribute('inert', '');
    if (!show && nav.getAttribute('data-bottom-nav-open') === 'true' && navToggle) navToggle.click();   // close the menu first
    const c = el.cue;
    c.style.pointerEvents = show ? 'none' : '';
    c.classList.toggle('is-leaving', show);
    if (instant) {
      nav.style.visibility = show ? 'visible' : 'hidden'; nav.style.opacity = show ? '1' : '0';
      c.style.opacity = show ? '0' : '';
      return;
    }
    const bar = navBar ? [...navBar.children] : [];
    G.killTweensOf([c, nav, ...bar]);
    if (show) {
      const cr = c.getBoundingClientRect(), nr = navInner.getBoundingClientRect();
      if (!cueSize) cueSize = { w: cr.width, h: cr.height };
      G.timeline()
        .set(c, { width: cr.width, height: cr.height, xPercent: -50, x: 0 })   // keep it centred while it grows
        .to(c, { width: nr.width, height: nr.height, y: `+=${nr.bottom - cr.bottom}`, backgroundColor: navGlass(), borderRadius: getComputedStyle(navInner).borderTopLeftRadius, duration: .6, ease: 'osmo' }, .1)
        .set(nav, { visibility: 'visible' }, .55)
        .fromTo(nav, { opacity: 0 }, { opacity: 1, duration: .25, ease: 'none' }, .55)
        .fromTo(bar, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .55, stagger: .07, ease: 'osmo' }, .6)
        .to(c, { opacity: 0, duration: .2, ease: 'none' }, .75);
    } else {
      G.timeline()
        .to(nav, { opacity: 0, duration: .2, ease: 'none' }, 0)
        .set(nav, { visibility: 'hidden' })
        .set(c, { opacity: 1 }, 0)
        .to(c, { width: cueSize ? cueSize.w : 'auto', height: cueSize ? cueSize.h : 'auto', y: 0, borderRadius: 0, duration: .5, ease: 'osmo' }, 0)
        .set(c, { clearProps: 'width,height,backgroundColor,opacity,transform,borderRadius' });
    }
  }

  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paint();
}

/* =========================================================
   Section 2 — the time story ("the space we never designed")
   Starts in the same black/paper the dive ends in, pinned:
     1. "7+ Hours A Day."      24 hour-pixels in a row, 7 light up
     2. "2,555 Hours A Year."  the row folds into one 6×4 day tile, a year of tiles fills in, digits roll
     3. orange                 lit hours turn orange and blink like badges, the dither creeps in at the edges
     4. blue                   orange becomes blue, the dither calms: "Tech can make life better"
   Webflow:
     [data-time]                 section (height = scroll length, e.g. 440vh)
       [data-time-sticky]        sticky 100vh
         [data-time-canvas]      dither around the edges (Paper Shaders, warp)
         [data-time-line="1-4"]  the four big lines (stacked, words rise in/out)
         [data-time-count]       inside line 2: the number (rolled by Osmo's Number Odometer, window.dfsOdometer)
         [data-time-grid]        the pixel hours (canvas is added here)
         [data-time-note="1-4"]  the small mono line under each beat
   ========================================================= */
function initTime(root) {
  const q = s => root.querySelector(s);
  const sticky = q('[data-time-sticky]'), gridHost = q('[data-time-grid]'), ditherHost = q('[data-time-canvas]');
  if (!sticky || !gridHost) return;
  const byNum = attr => [...root.querySelectorAll(`[${attr}]`)].sort((a, b) => +a.getAttribute(attr) - +b.getAttribute(attr));
  const lines = byNum('data-time-line'), notes = byNum('data-time-note');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNight = () => document.documentElement.classList.contains('dfs-night');
  const PAL = {
    // orange = attention taken (the opposite hue of the brand blue), bleeding to red at its worst; blue = digital done right
    night: { text: [241, 237, 226], orange: [240, 110, 40], red: [215, 55, 40], blue: [29, 171, 250], back: '#05070d', tense: '#361509', calm: '#0f3a57', calmTo: .75 },
    day:   { text: [61, 58, 53],    orange: [216, 67, 2],   red: [200, 25, 15], blue: [2, 151, 219],  back: '#f1ede2', tense: '#dca98d', calm: '#c9e2ef', calmTo: 1 },
  };
  injectCSS();

  /* words (keeps the counter element as one "word") */
  function split(node, step) {
    const parts = [];
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/\s+/).filter(Boolean).forEach(t => parts.push({ t }));
      else if (n.nodeType === 1) parts.push({ el: n });
    });
    node.setAttribute('aria-label', node.textContent.replace(/\s+/g, ' ').trim());
    node.textContent = '';
    const txt = document.createElement('span'); txt.className = 'dive-txt'; txt.setAttribute('aria-hidden', 'true');
    parts.forEach((p, i) => {
      const w = document.createElement('span'); w.className = 'dive-w';
      const wi = document.createElement('span'); wi.className = 'dive-wi';
      wi.style.transitionDelay = (reduce ? 0 : i * step) + 'ms';
      if (p.el) wi.append(p.el); else wi.textContent = p.t;
      w.append(wi); txt.append(w);
      if (i < parts.length - 1) txt.append(' ');
    });
    node.append(txt);
  }
  const countEl = q('[data-time-count]');
  const countFinal = countEl ? countEl.textContent.trim() : '';
  let countBox = null;
  if (countEl) {
    // the number gets its own box, as wide as the final number, so nothing around it shifts while it rolls
    countBox = document.createElement('span'); countBox.className = 'time-count-box';
    countEl.replaceWith(countBox); countBox.append(countEl);
    countEl.setAttribute('data-odometer-element', '');
  }
  lines.forEach(l => split(l, 70));
  /* the number is always drawn the way the odometer draws it: one equal-width cell per digit (Mondwest's digits are
     not equal width, and the rolling columns are as wide as the widest digit), so nothing jumps when it starts or ends */
  const lineStep = () => { const cs = getComputedStyle(countEl); return cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / parseFloat(cs.fontSize); };
  function drawCount(text) {
    const step = lineStep();
    countEl.style.width = countEl.style.overflow = '';
    countEl.innerHTML = [...text].map(ch => `<span data-odometer-part="${/\d/.test(ch) ? 'mask' : 'static'}" style="height:${step}em;line-height:${step}">${ch}</span>`).join('');
  }
  function sizeCountBox() {
    if (!countBox) return;
    const keep = countEl.textContent, fs = parseFloat(getComputedStyle(countEl).fontSize);
    const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    countEl.append(probe);
    let dw = 0; for (let d = 0; d < 10; d++) { probe.textContent = d; dw = Math.max(dw, probe.getBoundingClientRect().width); }
    probe.remove();
    countEl.style.setProperty('--time-digit', (dw / fs).toFixed(3) + 'em');
    drawCount(countFinal); countBox.style.width = '';
    countBox.style.width = (countEl.getBoundingClientRect().width / fs + .04).toFixed(3) + 'em';
    drawCount(keep);
  }
  if (countEl) { countEl.textContent = '7'; sizeCountBox(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (!countEl.querySelector('[data-odometer-part="roller"]')) sizeCountBox(); }); }
  notes.forEach(n => split(n, 25));
  const setState = (node, state) => {
    if (!node || node.dataset.diveState === state) return;
    node.dataset.diveState = state;
    node.classList.toggle('dive-in', state === 'in');
    node.classList.toggle('dive-out', state === 'out');
  };

  /* the number: Osmo's Number Odometer rolls it once from 7 to the year total (window.dfsOdometer, set in the page
     code as  window.dfsOdometer = initNumberOdometer()). Without it, the number just switches. */
  const finalCount = countFinal;
  let yearOn = false;
  let countTimer = 0;
  function rollCount(up) {
    if (!countEl) return;
    clearTimeout(countTimer);
    if (!window.dfsOdometer || reduce) { drawCount(up ? finalCount : '7'); return; }
    // up: roll once the words have risen; down: reset quietly once the line has left
    countTimer = setTimeout(() => {
      if (!up) { drawCount('7'); return; }
      window.dfsOdometer(countEl, finalCount, { duration: 2.2 });
      // the box already has the final width: drop the odometer's width squeeze (it clipped the digits)
      if (window.gsap) gsap.killTweensOf(countEl);
      countEl.style.width = countEl.style.overflow = '';
      // the comma waits for the thousands digit instead of floating in alone
      const statics = countEl.querySelectorAll('[data-odometer-part="static"]');
      if (window.gsap && statics.length) { gsap.killTweensOf(statics); gsap.fromTo(statics, { opacity: 0 }, { opacity: 1, duration: .35, delay: .3, ease: 'power2.out' }); }
    }, up ? 380 : 700);
  }

  /* the year: 365 days × 24 hours, 7 of them on a screen (seeded, so it looks the same every visit) */
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const days = Array.from({ length: 365 }, () => {
    const pool = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const lit = [];
    while (lit.length < 7) { const h = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; lit.push(h); }
    lit.sort((a, b) => a - b);
    return { lit, taken: lit.filter(() => rnd() < .45), tOrange: rnd(), tBlue: rnd(), phase: lit.map(() => rnd() * 6.28), grab: lit.map(() => rnd()) };
  });

  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  gridHost.append(cv);
  const g = cv.getContext('2d');
  let L = null;
  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = gridHost.clientWidth || 300;
    const cols = W >= 640 ? 53 : 19, rows = Math.ceil(365 / cols);
    const u = W / (cols * 6 + (cols - 1) * 2);                  // one hour-pixel; a day is 6×4 of them, 2 between days
    const gridH = rows * 4 * u + (rows - 1) * 2 * u;
    const big = Math.min(W / 30, 30);                            // the hour row in beat 1
    const H = Math.max(gridH, big * 2.2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const oy = (H - gridH) / 2;
    const cell = d => cols === 53
      ? { x: Math.floor(d / 7) * 8 * u, y: oy + (d % 7) * 6 * u }
      : { x: (d % cols) * 8 * u, y: oy + Math.floor(d / cols) * 6 * u };
    const rowX = h => W / 2 - (24 * big * 1.25) / 2 + h * big * 1.25 + big * .125;
    L = { W, H, u, big, cell, rowX, rowY: H / 2 - big / 2 };
  }
  new ResizeObserver(layout).observe(gridHost);
  layout();

  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  let P = PAL[isNight() ? 'night' : 'day'];

  /* dither around the edges */
  let mount = null;
  if (ditherHost) {
    try {
      mount = new ShaderMount(ditherHost, ditheringFragmentShader, {
        u_fit: 0, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0,
        u_colorBack: col(P.back), u_colorFront: col(P.back), u_shape: 2, u_type: 3, u_pxSize: 2, u_scale: .7,
      }, undefined, reduce ? 0 : .35, 0);
    } catch (e) { console.warn('[time] dither did not start', e); }
  }
  const hexLerp = (a, b, t) => { const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

  function progress() {
    const r = root.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }

  // the year fills in time-based (in step with the odometer), not per scroll pixel
  let fillT = 0, fillFrom = 0, fillTo = 0, fillStart = 0, fillDur = 1;
  const setFill = (to, dur) => { fillFrom = fillT; fillTo = to; fillStart = performance.now(); fillDur = reduce ? .001 : dur; };
  let visible = false, p = 0, lastSpeed = .35, lastHole = 42;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);

  function frame(now) {
    if (visible && L) {
      P = PAL[isNight() ? 'night' : 'day'];
      p = progress();
      const t = now / 1000;
      // words
      setState(lines[0], p < .03 ? 'pre' : p < .28 ? 'in' : 'out');
      setState(lines[1], p < .3 ? 'pre' : p < .54 ? 'in' : 'out');
      setState(lines[2], p < .56 ? 'pre' : p < .75 ? 'in' : 'out');
      setState(lines[3], p < .78 ? 'pre' : 'in');
      setState(notes[0], p < .08 ? 'pre' : p < .28 ? 'in' : 'out');
      setState(notes[1], p < .4 ? 'pre' : p < .54 ? 'in' : 'out');
      setState(notes[2], p < .6 ? 'pre' : p < .75 ? 'in' : 'out');
      setState(notes[3], p < .83 ? 'pre' : 'in');
      // the beats
      const rowIn = sm(.04, .1, p), litN = Math.floor(sm(.08, .22, p) * 7.999);
      const fold = sm(.24, .31, p);
      const inYear = p >= .31;
      if (inYear !== yearOn) { yearOn = inYear; rollCount(inYear); setFill(inYear ? 1 : 0, inYear ? 2.4 : .6); }
      const k = Math.min(1, (now - fillStart) / (fillDur * 1000));
      fillT = fillFrom + (fillTo - fillFrom) * (1 - Math.pow(1 - k, 3));
      const shown = fold < 1 ? 0 : Math.max(1, Math.round(fillT * 365));
      const orange = sm(.55, .66, p), blue = sm(.79, .93, p);
      const heat = orange * (1 - blue) * P.calmTo;         // how hectic it is right now (a little softer at night)
      // dither: nothing at first; with the orange it turns into restless noise, speeds up, shakes and closes in;
      // with the blue it goes back to an ordered pattern, slows down and pulls back to the edges
      if (mount) {
        mount.setUniforms({
          u_colorBack: col(P.back),
          u_colorFront: col(blue > 0 ? hexLerp(P.tense, P.calm, blue) : hexLerp(P.back, P.tense, orange)),
          u_type: heat > .35 ? 1 : 3,
          u_scale: .7 + orange * .7 - blue * .45,
          u_rotation: p * 120 + (reduce ? 0 : heat * Math.sin(t * 9) * 6),
        });
        const spd = reduce ? 0 : Math.max(.12, .35 + heat * 1.8 - blue * .22);
        if (Math.abs(spd - lastSpeed) > .05) { lastSpeed = spd; mount.setSpeed(spd); }
      }
      const hole = 42 - heat * 30 + blue * 22;
      if (ditherHost && Math.abs(hole - lastHole) > .5) {
        lastHole = hole;
        const m = `radial-gradient(ellipse 72% 64% at 50% 50%,transparent ${hole.toFixed(1)}%,#000 100%)`;
        ditherHost.style.webkitMaskImage = m; ditherHost.style.maskImage = m;
      }
      // pixels
      const { u, big, cell, rowX, rowY } = L;
      g.clearRect(0, 0, L.W, L.H);
      const gap = u > 2.5 ? .18 : 0;
      for (let d = 0; d < 365; d++) {
        if (d > 0 && d >= shown) continue;
        const day = days[d], c = cell(d);
        const isO = orange > day.tOrange, isB = blue > day.tBlue;
        for (let h = 0; h < 24; h++) {
          const litIdx = day.lit.indexOf(h);
          let x, y, s;
          const hx = c.x + (h % 6) * u, hy = c.y + Math.floor(h / 6) * u;
          if (d === 0 && fold < 1) {                     // beat 1: the hour row, folding into day one
            const k = reduce ? (fold > .5 ? 1 : 0) : fold;
            x = rowX(h) + (hx - rowX(h)) * k; y = rowY + (hy - rowY) * k; s = big + (u - big) * k;
          } else { x = hx; y = hy; s = u; }
          const inset = s * (d === 0 && fold < 1 ? .12 : gap);
          let fill;
          if (litIdx === -1 || (d === 0 && fold === 0 && litIdx >= litN)) {
            fill = rgba(P.text, d === 0 && fold < 1 ? .14 : .07);
          } else if (isO && !isB && (day.taken.includes(h) || day.grab[litIdx] < heat * .85)) {
            // taken: blinks faster, bleeds red and jitters the more hectic it gets
            const ph = day.phase[litIdx];
            const on = reduce || Math.sin(t * (5 + heat * 11) + ph) > -.35 + Math.sin(t * 2.3 + ph * 3) * .3 * heat;
            const c = mix(P.orange, P.red, heat * (.35 + .35 * Math.sin(t * 6 + ph)));
            fill = rgba(c, on ? 1 : .28);
            if (!reduce && heat > .15) { x += Math.sin(t * 31 + ph * 17) * u * .7 * heat; y += Math.cos(t * 27 + ph * 11) * u * .5 * heat; }
          } else if (isB && (day.taken.includes(h) || blue > .6)) {
            // a few blue sparks: rare, short glints with a soft glow
            const ph = day.phase[litIdx];
            const spark = reduce || day.grab[litIdx] > .09 ? 0 : Math.pow(Math.max(0, Math.sin(t * .8 + ph * 5.3)), 60) * blue;
            fill = spark > .02 ? rgba(mix(P.blue, [255, 255, 255], spark * .85), 1) : rgba(P.blue, 1);
            if (spark > .02) { g.globalAlpha = spark * .55; g.fillStyle = rgba(P.blue, 1); g.fillRect(x - s, y - s, s * 3, s * 3); g.globalAlpha = 1; }
          } else {
            fill = rgba(P.text, .72);
          }
          if (d === 0 && fold === 0 && rowIn < 1) g.globalAlpha = rowIn; else g.globalAlpha = 1;
          g.fillStyle = fill;
          g.fillRect(x + inset / 2, y + inset / 2, s - inset, s - inset);
        }
      }
      g.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   The pixel computer: a small retro computer, ray-traced at low resolution and dithered like the rest
   of the page. Scroll turns it to face you, its screen tidies itself up, and the camera moves into the
   screen. Our own take on the old compact computers: no Apple logo, the DFS star on the front.
   Webflow:
     [data-mac]                 section (height = scroll length, e.g. 320vh)
       [data-mac-sticky]        sticky 100dvh
         [data-mac-canvas]      the computer is drawn here (fills the sticky)
   ========================================================= */
function initMac(root) {
  const sticky = root.querySelector('[data-mac-sticky]') || root;
  const host = root.querySelector('[data-mac-canvas]') || sticky;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNight = () => document.documentElement.classList.contains('dfs-night');
  const PAL = {
    day:   { light: [251, 247, 238], dark: [61, 58, 53], glass: [228, 236, 236], accent: [2, 151, 219], orange: [216, 67, 2] },
    night: { light: [241, 237, 226], dark: [16, 24, 44], glass: [214, 226, 232], accent: [29, 171, 250], orange: [240, 110, 40] },
  };

  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges';
  host.append(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0, img = null, buf = null, mask = null;
  function layout() {
    const r = host.getBoundingClientRect();
    const px = Math.max(3, Math.round(innerWidth / 340));
    W = Math.max(1, Math.ceil(r.width / px)); H = Math.max(1, Math.ceil(r.height / px));
    cv.width = W; cv.height = H;
    img = g.createImageData(W, H); buf = img.data; mask = new Uint8Array(W * H);
  }
  new ResizeObserver(layout).observe(host);
  layout();

  /* the computer: boxes (min xyz, max xyz). 0 body, 1 base, 2 keyboard, 3 mouse */
  const B = [
    [-.5, .04, -.55, .5, 1.39, .55],
    [-.46, 0, -.5, .46, .04, .5],
    [-.56, 0, .8, .56, .07, 1.2],
    [.7, 0, .92, .86, .055, 1.14],
  ];
  const L = (() => { const v = [-.45, .62, .75], m = Math.hypot(...v); return v.map(c => c / m); })();
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  // the DFS star, as small as it gets (5×5), on the front
  const STAR = ['..#..', '.###.', '##.##', '.###.', '..#..'];

  /* ray against the boxes: nearest hit in hitT / hitI / hitA (axis); any = stop at the first */
  let hitT = 0, hitI = -1, hitA = 0;
  function trace(ox, oy, oz, dx, dy, dz, any) {
    const o = [ox, oy, oz], d = [dx, dy, dz];
    let best = Infinity, bi = -1, ba = 0;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      let tmin = -Infinity, tmax = Infinity, ax = 0, miss = false;
      for (let a = 0; a < 3; a++) {
        const lo = b[a], hi = b[a + 3];
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo || o[a] > hi) { miss = true; break; } continue; }
        let t1 = (lo - o[a]) / d[a], t2 = (hi - o[a]) / d[a];
        if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
        if (t1 > tmin) { tmin = t1; ax = a; }
        if (t2 < tmax) tmax = t2;
        if (tmax < tmin) { miss = true; break; }
      }
      if (miss || tmin <= 1e-4 || tmin >= best) continue;
      if (any) return true;
      best = tmin; bi = i; ba = ax;
    }
    hitT = best; hitI = bi; hitA = ba;
    return bi >= 0;
  }

  /* the screen: a tiny desktop, drawn each frame. c: 0 a mess, 1 tidy */
  const TW = 64, TH = 48;
  const tex = document.createElement('canvas'); tex.width = TW; tex.height = TH;
  const tg = tex.getContext('2d');
  let texData = null;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const icons = Array.from({ length: 24 }, () => ({ x: 2 + rnd() * 54, y: 8 + rnd() * 26, at: .05 + rnd() * .5, badge: rnd() < .3 }));
  const wins = [{ x: 6, y: 10, w: 30, h: 20, to: [3, 8, 28, 30] }, { x: 24, y: 15, w: 32, h: 19, to: [33, 8, 28, 30] }, { x: 14, y: 20, w: 26, h: 15, to: [20, 14, 24, 18] }];
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function drawScreen(c, t, P) {
    const ink = css(P.dark), glass = css(P.glass), orange = css(P.orange), accent = css(P.accent);
    tg.fillStyle = glass; tg.fillRect(0, 0, TW, TH);
    // menu bar
    tg.fillStyle = ink; tg.fillRect(0, 4, TW, 1);
    tg.fillRect(2, 1, 2, 2);
    [7, 12, 18, 23].forEach(x => tg.fillRect(x, 2, 3, 1));
    // the mess: files all over the desktop, flying into one folder as it tidies
    const blink = Math.sin(t * 9) > -.2;
    icons.forEach(ic => {
      const k = sm(ic.at, ic.at + .25, c);
      if (k >= 1) return;
      const x = Math.round(lerp(ic.x, 57, k)), y = Math.round(lerp(ic.y, 7, k));
      tg.fillStyle = ink; tg.fillRect(x, y, 4, 4);
      tg.fillStyle = glass; tg.fillRect(x + 1, y + 1, 2, 2);
      tg.fillStyle = ink; tg.fillRect(x, y + 5, 4, 1);
      if (ic.badge && c < .5 && blink) { tg.fillStyle = orange; tg.fillRect(x + 3, y - 1, 2, 2); }
    });
    // the one folder they all go to
    if (c > .05) { tg.fillStyle = ink; tg.fillRect(56, 6, 6, 5); tg.fillRect(56, 5, 3, 1); tg.fillStyle = css(P.light); tg.fillRect(57, 8, 4, 2); }
    // windows: piled up, then side by side
    wins.forEach((w, i) => {
      const k = sm(.35 + i * .08, .7 + i * .05, c);
      if (i === 2 && k >= 1) return;
      const x = Math.round(lerp(w.x, w.to[0], k)), y = Math.round(lerp(w.y, w.to[1], k));
      const ww = Math.round(lerp(w.w, w.to[2], k)), hh = Math.round(lerp(w.h, w.to[3], k));
      if (i === 2 && k > .5) return;
      tg.fillStyle = ink; tg.fillRect(x, y, ww, hh);
      tg.fillStyle = css(P.light); tg.fillRect(x + 1, y + 4, ww - 2, hh - 5);
      tg.fillStyle = glass; tg.fillRect(x + 1, y + 1, 3, 2);
      for (let r = y + 6; r < y + hh - 2; r += 2) { tg.fillStyle = ink; tg.fillRect(x + 3, r, Math.max(2, Math.round((ww - 6) * (.5 + .5 * ((r * 7 + i * 3) % 5) / 5))), 1); }
    });
    // the Dock: crowded with badges, then a few
    const n = Math.round(lerp(14, 5, sm(.15, .6, c)));
    const dw = n * 4 + 2, dx = Math.round((TW - dw) / 2);
    tg.fillStyle = ink; tg.fillRect(dx, 41, dw, 6);
    for (let i = 0; i < n; i++) {
      tg.fillStyle = css(P.light); tg.fillRect(dx + 2 + i * 4, 43, 2, 2);
      if (c < .45 && (i * 5) % 3 === 0 && blink) { tg.fillStyle = orange; tg.fillRect(dx + 3 + i * 4, 42, 1, 1); }
    }
    // a notification sliding in and out, while it's a mess
    const nk = c < .4 ? Math.max(0, Math.sin(t * 1.3)) * (1 - c / .4) : 0;
    if (nk > .05) {
      const nx = Math.round(TW - 20 * nk);
      tg.fillStyle = ink; tg.fillRect(nx, 6, 19, 7);
      tg.fillStyle = css(P.light); tg.fillRect(nx + 1, 7, 17, 5);
      tg.fillStyle = orange; tg.fillRect(nx + 2, 8, 3, 3);
      tg.fillStyle = ink; tg.fillRect(nx + 7, 8, 9, 1); tg.fillRect(nx + 7, 10, 6, 1);
    }
    // tidy: one quiet blue line of focus in the main window
    if (c > .8) { tg.fillStyle = accent; tg.fillRect(5, 36, Math.round(22 * sm(.8, 1, c)), 1); }
    texData = tg.getImageData(0, 0, TW, TH).data;
  }

  function progress() {
    const r = root.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }
  let visible = false, mx = 0, my = 0, tmx = 0, tmy = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
  if (!reduce) addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  function render(now) {
    const P = PAL[isNight() ? 'night' : 'day'];
    const p = progress(), t = now / 1000;
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    const reveal = reduce ? 1 : sm(0, .14, p);
    const turn = sm(0, .6, p), clean = sm(.28, .74, p), zoom = sm(.78, 1, p);
    const zin = zoom * zoom * (3 - 2 * zoom);
    drawScreen(clean, reduce ? 0 : t, P);

    // camera: from above and to the side, round to the front, then into the screen
    const aspect = W / H, fov = 30 * Math.PI / 180, ty = Math.tan(fov / 2), tx = ty * aspect;
    const far = Math.max(4.4, .92 / (ty * Math.min(aspect, 1.6)));
    const yaw = (lerp(-36, 0, turn) + mx * 7 * (1 - zin)) * Math.PI / 180;
    const pitch = (lerp(22, 12, turn) * (1 - zin) - my * 4 * (1 - zin)) * Math.PI / 180;
    const T = [0, lerp(.66, .99, zin), lerp(.3, .55, zin)];
    const dist = lerp(far, .9, zin);
    const C = [T[0] + dist * Math.sin(yaw) * Math.cos(pitch), T[1] + dist * Math.sin(pitch), T[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
    let f = [T[0] - C[0], T[1] - C[1], T[2] - C[2]]; const fm = Math.hypot(...f); f = f.map(v => v / fm);
    let rgt = [f[2], 0, -f[0]]; const rm = Math.hypot(...rgt); rgt = rgt.map(v => -v / rm);
    const up = [rgt[1] * f[2] - rgt[2] * f[1], rgt[2] * f[0] - rgt[0] * f[2], rgt[0] * f[1] - rgt[1] * f[0]];

    buf.fill(0); mask.fill(0);
    const put = (i, c) => { const j = i * 4; buf[j] = c[0]; buf[j + 1] = c[1]; buf[j + 2] = c[2]; buf[j + 3] = 255; };
    for (let y = 0; y < H; y++) {
      const fy = (1 - (y + .5) / H * 2) * ty;
      for (let x = 0; x < W; x++) {
        const i = y * W + x, th = bayer(x, y);
        const fx = ((x + .5) / W * 2 - 1) * tx;
        let dx = f[0] + rgt[0] * fx + up[0] * fy, dy = f[1] + rgt[1] * fx + up[1] * fy, dz = f[2] + rgt[2] * fx + up[2] * fy;
        const dm = Math.hypot(dx, dy, dz); dx /= dm; dy /= dm; dz /= dm;
        if (!trace(C[0], C[1], C[2], dx, dy, dz, false)) {
          // the table: only the shadow shows, dithered
          if (dy >= 0 || th > reveal) continue;
          const tg0 = -C[1] / dy, gx = C[0] + dx * tg0, gz = C[2] + dz * tg0;
          if (Math.abs(gx) > 3 || gz > 3 || gz < -3) continue;
          let dens = 0;
          if (trace(gx, .001, gz, L[0], L[1], L[2], true)) dens = .17;
          const ex = Math.max(0, Math.abs(gx) - .5), ez = Math.max(0, Math.abs(gz) - .55);
          const near = Math.hypot(ex, ez);
          if (near < .1) dens = Math.max(dens, .42 * (1 - near / .1));
          if (th < dens) { put(i, P.dark); mask[i] = 2; }
          continue;
        }
        if (th > reveal) continue;
        const bi = hitI, ax = hitA, sgn = (ax === 0 ? dx : ax === 1 ? dy : dz) > 0 ? -1 : 1;
        const hx = C[0] + dx * hitT, hy = C[1] + dy * hitT, hz = C[2] + dz * hitT;
        const n = [0, 0, 0]; n[ax] = sgn;
        let lum = .4 + .62 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
        const b = B[bi];
        // a face's own coordinates, 0…1
        let u, v;
        if (ax === 2) { u = (hx - b[0]) / (b[3] - b[0]); v = (b[4] - hy) / (b[4] - b[1]); }
        else if (ax === 0) { u = (hz - b[2]) / (b[5] - b[2]); if (sgn < 0) u = 1 - u; v = (b[4] - hy) / (b[4] - b[1]); }
        else { u = (hx - b[0]) / (b[3] - b[0]); v = (hz - b[2]) / (b[5] - b[2]); }
        let colour = null;
        if (bi === 0 && ax === 2 && sgn > 0) {
          // the front: the screen, its recess, the floppy slot, the star
          if (u > .18 && u < .82 && v > .1 && v < .5) {
            let cx = (u - .18) / .64 * 2 - 1, cy = (v - .1) / .4 * 2 - 1;
            const r2 = cx * cx + cy * cy;
            cx *= 1 + .07 * r2; cy *= 1 + .09 * r2;
            if (Math.abs(cx) > .97 || Math.abs(cy) > .96) { lum = .12; }
            else {
              const sx = Math.min(TW - 1, Math.floor((cx + 1) / 2 * TW)), sy = Math.min(TH - 1, Math.floor((cy + 1) / 2 * TH));
              const k = (sy * TW + sx) * 4, glow = 1 - .22 * r2 - (y & 1) * .05;
              colour = [texData[k] * glow, texData[k + 1] * glow, texData[k + 2] * glow];
            }
          } else if (u > .13 && u < .87 && v > .06 && v < .54) {
            lum = lerp(.42, .86, (v - .06) / .48) * (u < .18 ? .85 : 1);   // the recess: shadow under its top edge
          } else if (u > .57 && u < .8 && v > .69 && v < .715) {
            lum = .08;
          } else if (u > .14 && u < .2 && v > .66 && v < .715) {
            const sx = Math.floor((u - .14) / .06 * 5), sy = Math.floor((v - .66) / .055 * 5);
            if (STAR[sy] && STAR[sy][sx] === '#') lum = .1;
          } else if (v > .965) lum *= .7;
        } else if (bi === 0 && ax === 0) {
          if (u < .45 && v > .1 && v < .34 && Math.floor(v * 70) % 2 === 0) lum *= .72;   // vents on the side
        } else if (bi === 2 && ax === 1 && sgn > 0) {
          const ku = (u * 15) % 1, kv = (v * 5) % 1;
          if (ku < .18 || kv < .2) lum *= .62;
        } else if (bi === 3 && ax === 1 && sgn > 0) {
          if (v < .38 && Math.abs(u - .5) < .04) lum *= .6;
        } else if (bi === 1) lum *= .55;
        // edges catch the light a little
        if (!colour && (u < .02 || u > .98 || v < .015)) lum = Math.min(1, lum * (n[1] > 0 || n[0] < 0 ? 1.15 : .8));
        // shadows on the keyboard and the mouse
        if (!colour && bi >= 2 && ax === 1 && trace(hx, hy + .001, hz, L[0], L[1], L[2], true)) lum *= .55;
        if (colour) put(i, colour);
        else put(i, Math.min(lum, .93) > th ? P.light : P.dark);
        mask[i] = 1;
      }
    }
    // a one-pixel outline round the computer, as in pixel art
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (mask[i] !== 1) continue;
      if ((x > 0 && mask[i - 1] !== 1) || (x < W - 1 && mask[i + 1] !== 1) || (y > 0 && mask[i - W] !== 1) || (y < H - 1 && mask[i + W] !== 1)) put(i, P.dark);
    }
    g.putImageData(img, 0, 0);
  }

  function frame(now) {
    if (visible) render(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function injectCSS() {
  if (document.getElementById('dive-css')) return;
  const css = `
[data-dive]{background:var(--dive-back,#0e1628)}
[data-dive-sticky]{background:var(--dive-back,#0e1628)}
[data-dive-canvas]{pointer-events:none}
[data-dive-canvas] canvas{width:100%!important;height:100%!important;display:block}
[data-dive-fade]{background:var(--dive-end,#05070d);opacity:0;pointer-events:none}
[data-dive-logo]{color:var(--dive-text);pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 0 18px var(--dive-back)) drop-shadow(0 0 4px var(--dive-back))}
[data-dive-logo] svg{display:block;width:100%;height:auto}
[data-dive-title]{color:var(--dive-text);pointer-events:none}
[data-dive-end]{color:var(--dive-endtext);pointer-events:none}
[data-dive-end2]{color:var(--dive-accent);pointer-events:none}
[data-dive-cue]{color:var(--dive-text);cursor:pointer;background:var(--dive-glass);box-shadow:inset 0 1px 0 var(--dive-glass-hi),0 12px 32px rgba(0,0,0,.14);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);transition:background-color .35s ease}
[data-dive-cue]{justify-content:center}
[data-dive-cue]:hover{background:var(--dive-glass-hover)}
[data-dive-cue]:focus-visible{outline:1px solid var(--dive-text);outline-offset:4px}
.dive-roll{display:inline-grid;justify-items:center}
.dive-roll>span{grid-area:1/1;white-space:nowrap}
.dive-ra,.dive-rb{display:inline-block;transition:transform .55s cubic-bezier(.625,.05,0,1)}
.dive-rb{transform:translateY(110%)}
[data-dive-cue]:hover .dive-ra,[data-dive-cue]:focus-visible .dive-ra,[data-dive-cue].is-alt .dive-ra{transform:translateY(-110%)}
[data-dive-cue]:hover .dive-rb,[data-dive-cue]:focus-visible .dive-rb,[data-dive-cue].is-alt .dive-rb{transform:none}
[data-dive-cue].is-leaving .dive-ra,[data-dive-cue].is-leaving .dive-rb{transform:translateY(-110%)!important}
[data-dive-cue-text]{animation:dive-pulse 2.4s ease-in-out infinite}
[data-dive-cue-line]{position:relative;overflow:hidden;background:color-mix(in srgb,currentColor 25%,transparent)}
[data-dive-cue-line]::after{content:"";position:absolute;inset:0;background:currentColor;transform:scaleY(0);transform-origin:top;animation:dive-draw 2.4s cubic-bezier(.625,.05,0,1) infinite}
@keyframes dive-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes dive-draw{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.dive-txt{display:block}
.dive-w{display:inline-block;overflow:hidden;vertical-align:top;padding:.06em .02em .12em;margin:-.06em -.02em -.12em}
.dive-wi{display:inline-block;transform:translateY(130%);transition:transform .8s cubic-bezier(.625,.05,0,1)}
.dive-in .dive-wi{transform:none}
.dive-out .dive-wi{transform:translateY(-130%)}
[data-time]{background:var(--dive-end,#05070d);color:var(--dive-endtext,#f1ede2)}
[data-time-sticky]{background:var(--dive-end,#05070d)}
[data-time-canvas]{pointer-events:none;-webkit-mask-image:radial-gradient(ellipse 72% 64% at 50% 50%,transparent 42%,#000 100%);mask-image:radial-gradient(ellipse 72% 64% at 50% 50%,transparent 42%,#000 100%)}
[data-time-canvas] canvas{width:100%!important;height:100%!important;display:block}
[data-time-grid] canvas{display:block;margin:0 auto}
[data-time-line],[data-time-note]{pointer-events:none}
.time-count-box{display:inline-flex;justify-content:flex-end;vertical-align:top;white-space:nowrap}
.time-count-box [data-odometer-part="mask"]{width:var(--time-digit,auto);text-align:center}
[data-time-note]{opacity:.72}
@media (prefers-reduced-motion: reduce){[data-dive-cue-text],[data-dive-cue-line]::after{animation:none}[data-dive-cue-line]::after{transform:scaleY(1)}.dive-wi,.dive-ra,.dive-rb{transition:none}}
`;
  const s = document.createElement('style'); s.id = 'dive-css'; s.textContent = css; document.head.append(s);
}
