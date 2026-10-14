/* =========================================================
   dfs-dive — the scroll dive opening (test: /rimbo-home-test)

   Separate from main.js on purpose: one page loads it in its own
   page custom code, nothing else on the site knows it exists.

   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@dive-v0.3.2/dive/dive.js"></script>

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
    night: { text: [241, 237, 226], orange: [250, 106, 29], red: [235, 45, 35], blue: [29, 171, 250], back: '#05070d', tense: '#4a1c0c', calm: '#0f3a57' },
    day:   { text: [61, 58, 53],    orange: [216, 67, 2],   red: [200, 25, 15], blue: [2, 151, 219],  back: '#f1ede2', tense: '#dca98d', calm: '#c9e2ef' },
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
  if (countEl) { countEl.setAttribute('data-odometer-element', ''); countEl.textContent = '7'; }
  lines.forEach(l => split(l, 70));
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
  function rollCount(up) {
    if (!countEl) return;
    const text = up ? finalCount : '7';
    if (window.dfsOdometer && !reduce) window.dfsOdometer(countEl, text, { duration: up ? 2.2 : .6 });
    else countEl.textContent = text;
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
      if (inYear !== yearOn) { yearOn = inYear; rollCount(inYear); setFill(inYear ? 1 : 0, inYear ? 2.2 : .6); }
      const k = Math.min(1, (now - fillStart) / (fillDur * 1000));
      fillT = fillFrom + (fillTo - fillFrom) * (1 - Math.pow(1 - k, 3));
      const shown = fold < 1 ? 0 : Math.max(1, Math.round(fillT * 365));
      const orange = sm(.55, .66, p), blue = sm(.79, .93, p);
      const heat = orange * (1 - blue);                    // how hectic it is right now
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
            fill = rgba(P.blue, 1);
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
[data-time-note]{opacity:.72}
@media (prefers-reduced-motion: reduce){[data-dive-cue-text],[data-dive-cue-line]::after{animation:none}[data-dive-cue-line]::after{transform:scaleY(1)}.dive-wi,.dive-ra,.dive-rb{transition:none}}
`;
  const s = document.createElement('style'); s.id = 'dive-css'; s.textContent = css; document.head.append(s);
}
