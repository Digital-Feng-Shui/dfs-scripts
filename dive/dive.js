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
   Also here: section 2, the time story ([data-time]), see initTime below,
   section 3, what we stand for ([data-stand]), see initStand, section 4, the mission ([data-mission]), see initMission,
   and section 5, our solutions ([data-sol]), see initSol.
   ========================================================= */

import { ShaderMount, ditheringFragmentShader, getShaderColorFromString as col } from 'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.81/+esm';

const root = document.querySelector('[data-dive]');
if (root) init(root);
const timeRoot = document.querySelector('[data-time]');
if (timeRoot) initTime(timeRoot);
const standRoot = document.querySelector('[data-stand]');
if (standRoot) initStand(standRoot);
const missionRoot = document.querySelector('[data-mission]');
if (missionRoot) initMission(missionRoot);
const solRoot = document.querySelector('[data-sol]');
if (solRoot) initSol(solRoot);

/* sound: Timer's rule, sound means something answered you (sound/sound.js; off until the visitor turns it on).
   Mostly hover (Rim: you don't click often, and a click is usually a link): point = soft tick on hover,
   do = soft tick on hover and the press on click. The time story's clear ticks come from initTime. */
const SOUNDS = {
  '[data-dive-cue], .bottom-nav__link, .bottom-nav__toggle, .bottom-nav__logo, .dfs-night-toggle, [data-sound-toggle]': 'point',
  '.sol_link, .cnb_option, .lesson-complete_overlay, [data-player-control], .c_item, [data-accordion-toggle]': 'point',
  '.rhythms-app_icon-btn, .rhythms-app_add-time, .rhythms-app_set-link, .rhythms-app_kind': 'point',
  '.journal_card, .foot_brand, .foot_link, .foot_social, .foot_base-link, .foot_cell.is-login': 'point',
  '.close_door, .close_submit, .found_play, .rhythms-app_save, [data-tk], .tk-reset': 'do',
};
// no ambience for now: Rim didn't like the wind (18 Oct); a bed that follows the sections is being explored
import('../sound/sound.js').then(() => window.dfsSound && window.dfsSound.map(SOUNDS)).catch(e => console.warn('[sound] did not load', e));

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
  let navShown = null, cueSize = null, cueShadow = '', cueBg = '', first = true, stingW = 0, starRest = null;
  if (nav) { nav.style.visibility = 'hidden'; nav.style.opacity = '0'; nav.setAttribute('inert', ''); }
  const navLogo = navBar && navBar.querySelector('.bottom-nav__logo');
  const navIcon = navLogo && navLogo.querySelector('.logo_icon');
  const navName = navLogo && navLogo.querySelector('.logo_text');
  // the closed bar is as wide as what's in it: its padding + logo + its 2rem gap + button + padding (a fixed width broke
  // the name onto three lines when the font came out wider). Measured again once the fonts are in; Osmo re-measures on
  // resize.
  function fitNav() {
    if (!navBar) return;
    const keep = navBar.style.width;
    navBar.style.width = 'max-content';
    const w = navBar.offsetWidth + 2;   // + the inner box's two 1px borders
    navBar.style.width = keep;
    nav.style.setProperty('--closed-width', `min(90vw, ${w}px)`);
  }
  if (nav) {
    fitNav();
    if (document.fonts) document.fonts.ready.then(() => { fitNav(); dispatchEvent(new Event('resize')); });
    // and whenever the logo's width changes (a late font, a different browser): fit again, Osmo re-measures
    if (window.ResizeObserver && navLogo) {
      let last = 0, t = 0;
      new ResizeObserver(() => {
        const w = navLogo.getBoundingClientRect().width;
        if (Math.abs(w - last) < .5) return;
        last = w; clearTimeout(t);
        t = setTimeout(() => { fitNav(); dispatchEvent(new Event('resize')); }, 60);
      }).observe(navLogo);
    }
  }
  /* the name scrambles in, as in the DFS logo sting: noise first, then letter by letter it settles */
  const nameNodes = [];
  if (navName) { const w = document.createTreeWalker(navName, NodeFilter.SHOW_TEXT); while (w.nextNode()) if (w.currentNode.nodeValue.trim()) nameNodes.push({ n: w.currentNode, t: w.currentNode.nodeValue }); }
  const NOISE = 'ABCDEFGHJKLMNPRSTUVWXYZ#%&*+=/<>';
  function scramble(k) {   // k 0..1
    let i = 0;
    nameNodes.forEach(({ n, t }) => {
      n.nodeValue = [...t].map(ch => {
        if (ch === ' ') return ch;
        const settle = .25 + i++ * .045;
        return k >= settle ? ch : NOISE[(Math.random() * NOISE.length) | 0];
      }).join('');
    });
  }
  const unscramble = () => nameNodes.forEach(({ n, t }) => { n.nodeValue = t; });
  // the star turns about its own middle, exactly as main.js's ticks do ('50% 50%'), and without GSAP's origin smoothing
  const STAR_ORIGIN = { transformOrigin: '50% 50%', smoothOrigin: false };
  // the star's two parts as main.js splits them (ring + inner star); without main.js, the whole svg
  const starParts = () => {
    const ring = navIcon && navIcon.querySelector('svg g > path'), inner = navIcon && navIcon.querySelector('svg mask path');
    return ring && inner ? { ring, inner } : null;
  };
  // the nav's frosted colour is a color-mix() that GSAP can't tween (it flashed yellow): use the brand beige/navy at 72%
  function navGlass() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-colors--bage').trim();
    const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : P.back;
    return `rgba(${hex3(hex).join(',')},.72)`;
  }
  let navTl = null;
  // the menu opened while the sting still plays: the sting jumps to its end first (capture, so before Osmo's own click),
  // so the menu always opens from the settled bar (two width tweens at once made the box jump)
  if (navToggle) navToggle.addEventListener('click', () => { if (navShown && navTl && navTl.isActive()) navTl.progress(1); }, true);
  function showNav(show) {
    if (!nav || !navInner || show === navShown) return;
    navShown = show;
    const instant = first || reduce || !G;
    first = false;
    if (show) nav.removeAttribute('inert'); else nav.setAttribute('inert', '');
    // scrolling back with the menu open: it folds shut first, then the bar turns back into the box
    const wasOpen = !show && nav.getAttribute('data-bottom-nav-open') === 'true' && navToggle;
    if (wasOpen) navToggle.click();
    const c = el.cue;
    c.style.pointerEvents = show ? 'none' : '';
    if (show || instant) c.classList.toggle('is-leaving', show);
    if (instant) {
      nav.style.visibility = show ? 'visible' : 'hidden'; nav.style.opacity = show ? '1' : '0';
      c.style.opacity = show ? '0' : '';
      return;
    }
    const bar = navBar ? [...navBar.children] : [];
    const parts = [navLogo, navIcon, navName, navToggle].filter(Boolean);
    const sp = starParts();
    G.killTweensOf([c, nav, ...bar, ...parts, ...(sp ? [sp.ring, sp.inner] : [])]);
    if (navTl) navTl.kill();   // a turn halfway: its timed steps (the label) must not fire later
    unscramble();
    const full = !!(navLogo && navIcon && navName && navToggle);
    // the cue's soft shadow turns into the menu's thin line while it folds, so the square already looks like the menu
    if (!cueShadow) { cueShadow = getComputedStyle(c).boxShadow; cueBg = getComputedStyle(c).backgroundColor; }
    // the border is a color-mix(): browsers report it as color(srgb r g b / a), which GSAP can't tween, so as rgba()
    const toRgba = v => { const m = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(v); return m ? `rgba(${Math.round(m[1] * 255)}, ${Math.round(m[2] * 255)}, ${Math.round(m[3] * 255)}, ${m[4] === undefined ? 1 : +m[4]})` : v; };
    const lineColor = toRgba(getComputedStyle(navInner).borderTopColor);
    const line = `${lineColor} 0px 0px 0px 1px inset, rgba(0, 0, 0, 0) 0px 0px 0px 0px`;
    // on the way back the line stays while the soft shadow returns (fading one out before the other made the box vanish)
    const drop = (cueShadow.match(/rgba?\([^)]*\)[^,]*$/) || ['rgba(0, 0, 0, 0.14) 0px 12px 32px 0px'])[0].trim();
    const lineAndDrop = `${lineColor} 0px 0px 0px 1px inset, ${drop}`;
    const tick = (tl, at, back) => {   // one Keeper tick; back = the other way. Ends where main.js's own ticks expect it
      if (sp) {
        const r = starRest ? starRest.r : G.getProperty(sp.ring, 'rotation'), i = starRest ? starRest.i : G.getProperty(sp.inner, 'rotation');
        starRest = { r, i };
        // the turning centre goes in from the very first step (and never changes): a centre that only arrives with the
        // 'to' half, after the star is already turned, makes GSAP shift it to compensate, and the star stays off-centre
        tl.fromTo(sp.ring, { rotation: back ? r : r - 45, ...STAR_ORIGIN }, { rotation: back ? r - 45 : r, duration: .6, ease: 'osmo', ...STAR_ORIGIN }, at)
          .fromTo(sp.inner, { rotation: back ? i : i + 45, ...STAR_ORIGIN }, { rotation: back ? i + 45 : i, duration: .6, ease: 'osmo', ...STAR_ORIGIN }, at);
      } else {
        tl.fromTo(navIcon, { rotation: back ? 0 : -45 }, { rotation: back ? -45 : 0, duration: .6, ease: 'osmo' }, at);
      }
    };
    // the bar as it rests, closed. The star is put back where it was before the tick only when a tick went the other way
    // or was cut short (a forward tick already ends there)
    const settle = resetStar => {
      G.set(parts, { clearProps: 'transform,opacity' });
      if (stingW && nav.getAttribute('data-bottom-nav-open') !== 'true') G.set(navInner, { width: stingW });
      stingW = 0;
      G.set(navBar, { clearProps: 'width' });
      if (resetStar && starRest && sp) { G.set(sp.ring, { rotation: starRest.r, ...STAR_ORIGIN }); G.set(sp.inner, { rotation: starRest.i, ...STAR_ORIGIN }); }
      starRest = null;
    };
    settle(true);
    if (show) {
      const cr = c.getBoundingClientRect(), nr = navInner.getBoundingClientRect();
      if (!cueSize) cueSize = { w: cr.width, h: cr.height };
      const glass = navGlass(), radius = getComputedStyle(navInner).borderTopLeftRadius;
      navTl = G.timeline().set(c, { width: cr.width, height: cr.height, xPercent: -50, x: 0 });
      if (!full) {
        navTl.to(c, { width: nr.width, height: nr.height, y: `+=${nr.bottom - cr.bottom}`, backgroundColor: glass, borderRadius: radius, boxShadow: line, duration: .6, ease: 'osmo' }, .28)
          .set(nav, { visibility: 'visible', opacity: 1 }, .85).set(c, { opacity: 0 }, .86);
        return;
      }
      // the logo sting: "Continue" rolls out, the box folds into a square round the star, the star ticks once, the box
      // opens into the bar while the star slides to its place, the name scrambles in, the button comes last
      const lr = navIcon.getBoundingClientRect();
      const dx = (nr.left + nr.width / 2) - (lr.left + lr.width / 2), sq = nr.height;
      stingW = nr.width;
      navTl
        .to(c, { width: sq, height: nr.height, y: `+=${nr.bottom - cr.bottom}`, backgroundColor: glass, borderRadius: radius, duration: .55, ease: 'osmo' }, .28)
        .to(c, { boxShadow: lineAndDrop, duration: .22, ease: 'none' }, .28)     // the line comes in first,
        .to(c, { boxShadow: line, duration: .3, ease: 'none' }, .53)            // then the soft shadow goes
        .set(navBar, { width: nr.width }, 0)                 // the bar keeps its layout while the box is narrower
        .set(navInner, { width: sq }, 0)
        .set(navLogo, { x: dx }, 0).set(navIcon, { opacity: 0, scale: .72 }, 0).set(navName, { opacity: 0 }, 0).set(navToggle, { opacity: 0, scale: .6 }, 0)
        .set(nav, { visibility: 'visible', opacity: 1 }, .83)
        .set(c, { opacity: 0 }, .84)
        .to(navIcon, { opacity: 1, scale: 1, duration: .45, ease: 'back.out(1.7)' }, .85);
      tick(navTl, 1.1, false);
      navTl
        .to(navInner, { width: nr.width, duration: .75, ease: 'osmo' }, 1.75)
        .to(navLogo, { x: 0, duration: .75, ease: 'osmo' }, 1.75)
        .set(navName, { opacity: 1 }, 2.05)
        .to({ k: 0 }, { k: 1, duration: 1.2, ease: 'none', onUpdate() { scramble(this.targets()[0].k); }, onComplete: unscramble }, 2.05)
        .to(navToggle, { opacity: 1, scale: 1, duration: .45, ease: 'back.out(1.8)' }, 2.3)
        .call(() => settle(false), null, 3.3);
    } else if (wasOpen) {
      // with the menu open it folds shut first (Osmo's close half, 0.75 s); the way back starts from the closed bar,
      // measured once it's there (measured now, the open menu's height became the square and the box grew wide)
      navTl = G.timeline().call(() => { if (navShown === false) { navShown = null; showNav(false); } }, null, .8);
    } else {
      // the same, played back: the button shrinks away, the name scrambles back into noise, the box folds into the square
      // while the star slides to the middle, the star ticks back and fades, the square grows into "Continue"
      const d = 0;
      const ir = navInner.getBoundingClientRect(), lr = navIcon ? navIcon.getBoundingClientRect() : ir;
      const W = ir.width, sq = ir.height, dx = (ir.left + ir.width / 2) - (lr.left + lr.width / 2);
      const back = { width: cueSize ? cueSize.w : 'auto', height: cueSize ? cueSize.h : 'auto', y: 0, borderRadius: 0, boxShadow: lineAndDrop, backgroundColor: cueBg || navGlass(), duration: .6, ease: 'osmo' };
      navTl = G.timeline();
      if (full) {
        stingW = W;
        navTl
          .set(navBar, { width: W }, d)
          .to(navToggle, { opacity: 0, scale: .6, duration: .3, ease: 'power2.in' }, d)
          .to({ k: 1 }, { k: 0, duration: .7, ease: 'none', onUpdate() { scramble(this.targets()[0].k); } }, d + .05)
          .set(navName, { opacity: 0 }, d + .76)
          .call(unscramble, null, d + .77)
          .to(navInner, { width: sq, duration: .7, ease: 'osmo' }, d + .45)
          .to(navLogo, { x: dx, duration: .7, ease: 'osmo' }, d + .45);
        tick(navTl, d + 1.15, true);
        navTl.to(navIcon, { opacity: 0, scale: .72, duration: .35, ease: 'power2.in' }, d + 1.75);
      }
      const t = full ? d + 1.95 : d;
      navTl
        .set(c, { width: sq, height: sq, opacity: 1 }, t)
        .set(nav, { visibility: 'hidden', opacity: 0 }, t + .01)
        .to(c, back, t + .05)
        .call(() => c.classList.remove('is-leaving'), null, t + .35)
        .call(() => settle(true), null, t + .66)
        .set(c, { clearProps: 'width,height,backgroundColor,opacity,transform,borderRadius,boxShadow' }, t + .66);
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
     2. "2,555 Hours A Year."  the row breaks into its four sixes (up one, stay, down one, down two), they slide
                               together into one 6×4 day tile (the last bit by a magnet, with the soft lock), and the
                               year fills in with the scroll; the number rolls up once (Osmo's odometer) as soon as the
                               line appears
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
  if (countEl) { countEl.textContent = '7'; sizeCountBox(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (!countUp) sizeCountBox(); }); }
  notes.forEach(n => split(n, 25));
  const setState = (node, state) => {
    if (!node || node.dataset.diveState === state) return;
    node.dataset.diveState = state;
    node.classList.toggle('dive-in', state === 'in');
    node.classList.toggle('dive-out', state === 'out');
  };

  /* the number: one smooth roll from 7 to the year total with Osmo's Number Odometer (window.dfsOdometer, set in the
     page code as  window.dfsOdometer = initNumberOdometer()), new columns opening up the Osmo way. It isn't tied to the
     scroll on purpose: the grid shows the year filling, the number just needs to be seen, so it starts the moment its
     line appears and takes its own time, however fast you scroll (the same roll as dive-v0.3.12). Back above the line,
     it resets to 7 once the line is gone, ready to roll again. Without the odometer (or with reduced motion) it simply
     switches. */
  const finalCount = countFinal;
  let countTimer = 0, countUp = false;
  function rollCount(up) {
    if (!countEl || up === countUp) return;
    countUp = up;
    clearTimeout(countTimer);
    if (!window.dfsOdometer || reduce) { drawCount(up ? finalCount : '7'); return; }
    countTimer = setTimeout(() => {
      // always start from a clean 7 (a roll that was cut short leaves its strips behind)
      if (window.gsap) gsap.killTweensOf([countEl, ...countEl.querySelectorAll('*')]);
      countEl.style.width = countEl.style.overflow = '';
      drawCount('7');
      if (!up) return;
      window.dfsOdometer(countEl, finalCount, { duration: 2.2 });
      // the box already has the final width: drop the odometer's width squeeze (it clipped the digits)
      if (window.gsap) gsap.killTweensOf(countEl);
      countEl.style.width = countEl.style.overflow = '';
      // the comma waits for the thousands digit instead of floating in alone
      const statics = countEl.querySelectorAll('[data-odometer-part="static"]');
      if (window.gsap && statics.length) { gsap.killTweensOf(statics); gsap.fromTo(statics, { opacity: 0 }, { opacity: 1, duration: .35, delay: .3, ease: 'power2.out' }); }
    }, up ? 380 : 700);   // up: once the words have risen; down: quietly, once the line has left
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
    // one hour-pixel in whole device pixels (a day is 6×4 of them, 2 between days), so the year is a crisp microgrid:
    // every hour its own square with a one-pixel seam, never a soft blob
    const U = Math.max(2, Math.floor(W * dpr / (cols * 8 - 2))), u = U / dpr;
    const gridW = (cols * 8 - 2) * u, gridH = rows * 6 * u - 2 * u;
    const big = Math.min(W / 31, 28);                            // one hour in beat 1 (the strip of 24)
    const H = Math.ceil(Math.max(gridH, big * 5.6));             // room for the four levels of the fold
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const snap = v => Math.round(v * dpr) / dpr;
    const ox = snap((W - gridW) / 2), oy = snap((H - gridH) / 2);
    const cell = d => cols === 53
      ? { x: ox + Math.floor(d / 7) * 8 * u, y: oy + (d % 7) * 6 * u }
      : { x: ox + (d % cols) * 8 * u, y: oy + Math.floor(d / cols) * 6 * u };
    const rowX = h => W / 2 - 15 * big + h * big * 1.25;          // the strip, centred
    const blockX = h => W / 2 - 3.75 * big + (h % 6) * big * 1.25; // the sixes slid together
    L = { W, H, u, U, dpr, big, cell, rowX, blockX, rowY: H / 2 - big * 1.25 * .5 - big / 2 };
  }
  new ResizeObserver(layout).observe(gridHost);
  layout();

  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  let P = PAL[isNight() ? 'night' : 'day'];

  /* the dither: one fixed layer behind the time story AND what we stand for (clipped to those two sections), so it
     never stops at a hard edge. In the time story it's the dither around the edges; as the cards come up it fades out,
     quietly turns into calm ripples, and fades back in. At night it leaves the dive's black early in the time story and
     settles on the site's dark navy. ([data-time-canvas] is no longer drawn into; it can stay or go in Webflow.) */
  const NAVY = '#0e1628';
  const standEl = document.querySelector('[data-stand]');
  const lastEl = document.querySelector('[data-mission]') || standEl;   // the layer runs on to the end of the mission
  const bgEl = document.createElement('div'); bgEl.className = 'dive-bg'; bgEl.setAttribute('aria-hidden', 'true');
  const shaderEl = document.createElement('div'); shaderEl.className = 'dive-bg-shader'; bgEl.append(shaderEl);
  document.body.append(bgEl);
  if (ditherHost) ditherHost.style.display = 'none';
  let mount = null;
  try {
    mount = new ShaderMount(shaderEl, ditheringFragmentShader, {
      u_fit: 0, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0,
      u_colorBack: col(P.back), u_colorFront: col(P.back), u_shape: 2, u_type: 3, u_pxSize: 2, u_scale: .7,
    }, undefined, 0, 0);
  } catch (e) { console.warn('[time] dither did not start', e); }
  // mixes two colours, each '#rrggbb' or 'rgb(r,g,b)'
  const parseCol = c => c[0] === '#' ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).slice(0, 3).map(Number);
  const hexLerp = (a, b, t) => { const A = parseCol(a), B = parseCol(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

  function progress() {
    const r = root.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }

  // the year fills with the scroll: every bit of scroll adds days (and the odometer rolls with them), a little
  // smoothed so a fast flick doesn't jump; scrolling back takes them away again
  let fillT = 0;
  let soundLit = null, soundWeek = null;   // for the ticks: hours lit, weeks filled
  /* the snap (Rim, 19 Oct 2026, after the snap lab): the scroll brings the four rows most of the way, slowing a little
     as they near; then a magnet takes over, pulls them in by itself (faster and faster) and they stop dead in one
     square, with the soft lock (dfsSound.snap) and a tiny press. Scrolling back past the lock lets go (the soft tick). */
  const MAG = .8, PULL_MS = 120, PRESS_MS = 140;
  let locked = null, lockT = -1e9, lockFrom = 0, slideNow = 0;
  const drift = x => MAG * (1 - Math.pow(1 - Math.min(x, MAG) / MAG, 1.6));
  const pressAt = t => { const k = t / PRESS_MS; return k < 0 || k > 1 ? 0 : k < .3 ? k / .3 : 1 - (k - .3) / .7; };
  let visible = false, p = 0, lastSpeed = -1, lastHole = -1, lastShape = 2, lastBack = '', bgOn = null;
  let orangeNow = 0, blueNow = 0, heatNow = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);

  function bgFrame(now) {
    const tr = root.getBoundingClientRect(), sr = standEl ? standEl.getBoundingClientRect() : tr, br = lastEl ? lastEl.getBoundingClientRect() : tr, vh = innerHeight;
    const on = br.bottom > 0 && tr.top < vh;
    if (on !== bgOn) { bgOn = on; bgEl.style.visibility = on ? 'visible' : 'hidden'; if (!on && mount) { mount.setSpeed(0); lastSpeed = 0; } }
    if (on && mount) {
      bgEl.style.clipPath = `inset(${Math.max(0, tr.top).toFixed(1)}px 0 ${Math.max(0, vh - br.bottom).toFixed(1)}px 0)`;
      const t = now / 1000, P = PAL[isNight() ? 'night' : 'day'];
      const tp = Math.min(1, Math.max(0, -tr.top / Math.max(1, tr.height - vh)));
      const back = isNight() ? hexLerp(P.back, NAVY, sm(.02, .14, tp)) : P.back;
      // 0 while the cards are still below the screen, 1 once their section reaches the top
      const tS = standEl ? Math.min(1, Math.max(0, 1 - sr.top / vh)) : 0;
      let front, shape, u = {}, spd, hole;
      if (tS < .5) {
        const vis = 1 - sm(.15, .5, tS), heat = heatNow, orange = orangeNow, blue = blueNow;
        // nothing at first; with the orange it turns into restless noise, speeds up, shakes and closes in;
        // with the blue it goes back to an ordered pattern, slows down and pulls back to the edges
        front = blue > 0 ? hexLerp(P.tense, P.calm, blue) : hexLerp(back, P.tense, orange);
        front = hexLerp(back, front, vis);
        shape = 2; u = { u_type: heat > .35 ? 1 : 3, u_scale: .7 + orange * .7 - blue * .45, u_rotation: tp * 120 + (reduce ? 0 : heat * Math.sin(t * 9) * 6) };
        spd = reduce ? 0 : Math.max(.12, .35 + heat * 1.8 - blue * .22);
        hole = 42 - heat * 30 + blue * 22;
      } else {
        // by the cards: calm ripples, the middle kept clear
        const vis = sm(.5, .85, tS);
        front = hexLerp(back, P.calm, .75 * vis);
        shape = 5; u = { u_type: 3, u_scale: .85, u_rotation: 0 };
        spd = reduce ? 0 : .18;
        hole = 50;
      }
      if (shape !== lastShape) { lastShape = shape; u.u_shape = shape; }
      mount.setUniforms({ u_colorBack: col(back), u_colorFront: col(front), ...u });
      if (back !== lastBack) { lastBack = back; bgEl.style.background = back; }
      if (Math.abs(spd - lastSpeed) > .05 || (spd === 0) !== (lastSpeed === 0)) { lastSpeed = spd; mount.setSpeed(spd); }
      if (Math.abs(hole - lastHole) > .5) {
        lastHole = hole;
        const m = `radial-gradient(ellipse 72% 64% at 50% 50%,transparent ${hole.toFixed(1)}%,#000 100%)`;
        shaderEl.style.webkitMaskImage = m; shaderEl.style.maskImage = m;
      }
    }
    requestAnimationFrame(bgFrame);
  }
  requestAnimationFrame(bgFrame);

  function frame(now) {
    if (visible && L) {
      P = PAL[isNight() ? 'night' : 'day'];
      p = progress();
      const t = now / 1000;
      // words
      setState(lines[0], p < .03 ? 'pre' : p < .43 ? 'in' : 'out');
      setState(lines[1], p < .45 ? 'pre' : p < .6 ? 'in' : 'out');
      setState(lines[2], p < .62 ? 'pre' : p < .78 ? 'in' : 'out');
      setState(lines[3], p < .8 ? 'pre' : 'in');
      setState(notes[0], p < .08 ? 'pre' : p < .43 ? 'in' : 'out');
      setState(notes[1], p < .5 ? 'pre' : p < .6 ? 'in' : 'out');
      setState(notes[2], p < .65 ? 'pre' : p < .78 ? 'in' : 'out');
      setState(notes[3], p < .85 ? 'pre' : 'in');
      // the beats: the strip lights up, breaks into four levels, slides together, shrinks into day one; the year fills
      const rowIn = sm(.04, .09, p), litN = Math.floor(sm(.08, .22, p) * 7.999);
      const levels = sm(.26, .33, p), pushed = sm(.33, .4, p), shrink = sm(.4, .46, p);
      const pull = reduce ? .5 : MAG;
      if (locked === null) locked = pushed >= pull;            // the first frame: as it is, silent
      else if (!locked && pushed >= pull) {
        locked = true; lockT = now; lockFrom = slideNow;
        if (shrink < .5) window.dfsSound?.snap(reduce ? 0 : PULL_MS / 1000);   // lands on the stop
      } else if (locked && pushed < pull - .06) { locked = false; window.dfsSound?.point(); }
      let slide;
      if (reduce) slide = locked ? 1 : 0;
      else if (locked) { const k = Math.min(1, (now - lockT) / PULL_MS); slide = lockFrom + (1 - lockFrom) * k * k * k; }
      else slide = drift(pushed);
      slideNow = slide;
      const press = reduce || !locked ? 1 : 1 - .018 * pressAt(now - lockT - PULL_MS);   // the square's scale
      const target = sm(.46, .6, p);
      fillT = reduce ? target : fillT + (target - fillT) * .2;
      if (Math.abs(target - fillT) < .0005) fillT = target;
      const shown = shrink < 1 ? 0 : Math.max(1, Math.round(fillT * 365));
      // sound: a clear tick for each hour that lights up, then for each week as the year fills (silent while sound is off)
      const week = Math.ceil(shown / 7);
      if (soundLit !== null && (litN !== soundLit || week !== soundWeek)) window.dfsSound?.look();
      soundLit = litN; soundWeek = week;
      rollCount(p >= .45);
      const orange = sm(.62, .7, p), blue = sm(.8, .92, p);
      const heat = orange * (1 - blue) * P.calmTo;         // how hectic it is right now (a little softer at night)
      orangeNow = orange; blueNow = blue; heatNow = heat;   // the dither layer (bgFrame) follows these
      // pixels
      const { u, U, dpr, big, cell, rowX, blockX, rowY } = L;
      g.clearRect(0, 0, L.W, L.H);
      const seam = U >= 3 ? 1 / dpr : 0;                // one device pixel between hours
      for (let d = 0; d < 365; d++) {
        if (d > 0 && d >= shown) continue;
        if (d === 0 && shown === 0 && shrink >= 1) continue;
        const day = days[d], c = cell(d);
        const isO = orange > day.tOrange, isB = blue > day.tBlue;
        for (let h = 0; h < 24; h++) {
          const litIdx = day.lit.indexOf(h);
          let x, y, s;
          const hx = c.x + (h % 6) * u, hy = c.y + Math.floor(h / 6) * u;
          const strip = d === 0 && shrink < 1;
          if (strip) {                                   // beat 1: the strip of 24 → four levels → one block → day one
            const lv = reduce ? (levels > .5 ? 1 : 0) : levels, sl = slide, sh = reduce ? (shrink > .5 ? 1 : 0) : shrink;
            const seg = Math.floor(h / 6);
            let bx = rowX(h) + (blockX(h) - rowX(h)) * sl, by = rowY + (seg - 1) * big * 1.25 * lv, bs = big;
            if (press < 1) {                               // the press, around the square's middle
              const cx = (blockX(0) + blockX(5) + big) / 2, cy = rowY + big * 1.125;
              bx = cx + (bx - cx) * press; by = cy + (by - cy) * press; bs = big * press;
            }
            x = bx + (hx - bx) * sh; y = by + (hy - by) * sh; s = bs + (u - bs) * sh;
          } else { x = hx; y = hy; s = u; }
          const inset = strip ? s * .14 * (1 - shrink) + seam * shrink : seam;
          let fill;
          if (litIdx === -1 || (strip && levels === 0 && litIdx >= litN)) {
            fill = rgba(P.text, strip ? .14 : .1);
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
            fill = rgba(P.text, .86);
          }
          if (strip && levels === 0 && rowIn < 1) g.globalAlpha = rowIn; else g.globalAlpha = 1;
          g.fillStyle = fill;
          if (strip) g.fillRect(x + inset / 2, y + inset / 2, s - inset, s - inset);
          else g.fillRect(x, y, s - inset, s - inset);   // snapped: the square, then the seam
        }
      }
      g.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   Section 3 — what we stand for
   The heading and three cards come up together and lock in the screen. Each card is a small 24×12 pixel grid that
   tells its idea, all three on one timeline, so they charge up together and spark at the same moment:
     flow   attention scattered over the field flows into a heart, then slowly turns blue and starts to glow
     depth  eight scattered hours a day; six fade, the two that stay close up into one beam in the middle
     chosen a crowded feed with a few orange badges thins out to the few you chose
   Webflow:
     [data-stand]                section (same background as the time story)
       [data-stand-pin]          the scroll length while it's locked (e.g. 250vh; on phones auto)
         [data-stand-rise]       the heading, words rise in
         [data-stand-card="flow|depth|chosen"]  a card; its h3 rises too
           [data-stand-canvas]   the pixel grid (canvas is added here)
   ========================================================= */
function initStand(root) {
  const pin = root.querySelector('[data-stand-pin]') || root;
  const cards = [...root.querySelectorAll('[data-stand-card]')].map(el => {
    const host = el.querySelector('[data-stand-canvas]');
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%';
    if (host) host.append(cv);
    return { el, cv, g: cv.getContext('2d'), kind: el.getAttribute('data-stand-card'), y: 0, k: 0, sparked: false, sparkAt: 0 };
  });
  if (!cards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNight = () => document.documentElement.classList.contains('dfs-night');
  const PAL = { night: { ink: [241, 237, 226], blue: [29, 171, 250], orange: [240, 110, 40] }, day: { ink: [61, 58, 53], blue: [2, 151, 219], orange: [216, 67, 2] } };
  injectCSS();

  // words rise in once they're in view (the heading and the card titles)
  const rise = [...root.querySelectorAll('[data-stand-rise], [data-stand-card] h3')];
  // in the heading every sentence gets its own line ("Technology Should Work For You." / "Not On You."); phones let them flow
  rise.forEach(node => {
    const text = node.textContent.trim(), heading = node.hasAttribute('data-stand-rise');
    const lines = heading ? text.split(/(?<=[.!?])\s+/) : [text];
    let n = 0;
    node.setAttribute('aria-label', text);
    node.innerHTML = lines.map(line => `<span class="dive-txt" aria-hidden="true">${line.split(/\s+/).map(w => `<span class="dive-w"><span class="dive-wi" style="transition-delay:${reduce ? 0 : n++ * 55}ms">${w}</span></span>`).join(' ')}</span>`).join(' ');
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('dive-in'); }), { threshold: .4 });
  rise.forEach(n => io.observe(n));

  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const hr = (i, s) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
  // depth: per day eight scattered hours; two of them stay and close up into one focused stretch
  const DEPTH = Array.from({ length: 12 }, (_, d) => { const set = new Set(); let i = 0; while (set.size < 8) set.add(Math.floor(hr(d * 31 + i++, 7) * 24)); return [...set].sort((a, b) => a - b); });
  const HEART = ['.##..##.', '########', '########', '########', '########', '.######.', '..####..', '...##...']
    .flatMap((row, y) => [...row].map((c, x) => c === '#' ? [8 + x, 2 + y] : null)).filter(Boolean);

  function motif(c, W, H, k, t, spark) {
    const g = c.g, P = PAL[isNight() ? 'night' : 'day'];
    const cols = 24, rows = 12, u = Math.min(W / cols, H / rows), ox = (W - cols * u) / 2, oy = (H - rows * u) / 2;
    const ink = rgb(P.ink), blue = rgb(P.blue), dim = `rgba(${P.ink.join(',')},${isNight() ? .09 : .11})`;
    // the final moment. At night the blue flares up nearly white with a neon glow, then settles; by day it stays the same
    // blue and only the glow swells a little (lighter pixels look wrong on cream), and the glow itself is about half
    const night = isNight();
    const charge = sm(.5, .97, k), chargeCol = rgb(mixc(P.ink, P.blue, charge));
    const flare = night && spark > 0 ? rgb(mixc(P.blue, [255, 255, 255], .75 * spark)) : null;
    const glowCol = night ? blue : `rgba(${P.blue.join(',')},.55)`, gl = night ? [1.6, 3.2] : [.8, 1.4];
    const glow = on => { g.shadowColor = glowCol; g.shadowBlur = on ? u * gl[0] * charge + u * gl[1] * spark : 0; };
    const px = (x, y, col, a = 1, lit = false) => {
      g.globalAlpha = a; g.fillStyle = lit && flare ? flare : col;
      g.fillRect(ox + x * u + u * .1, oy + y * u + u * .1, u * .8, u * .8);
    };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) px(x, y, dim);
    if (c.kind === 'flow') {
      const back = sm(.02, .62, k);
      HEART.forEach(([hx, hy]) => px(hx, hy, dim, .9));                    // the heart, barely there
      HEART.forEach(([hx, hy], i) => {
        const sx = 1 + hr(i, 11) * 22, sy = 1 + hr(i, 12) * 10;               // where your attention is: all over
        const land = sm(hr(i, 15) * .45, .55 + hr(i, 15) * .45, back);        // it arrives bit by bit
        const home = land > .97;
        glow(home);
        px(Math.round(lerp(sx, hx, land)), Math.round(lerp(sy, hy, land)), home ? chargeCol : ink, home ? .75 + .25 * charge : .5 + .3 * land, home);
        glow(false);
      });
    } else if (c.kind === 'depth') {
      const fade = sm(.04, .45, k), close = sm(.2, .62, k);
      DEPTH.forEach((hrs, d) => hrs.forEach((h, j) => {
        const keep = j === 2 || j === 3;
        if (!keep) { if (fade < 1) px(h, d, ink, (1 - fade) * .8); return; }
        const there = close > .95;
        glow(there);
        px(Math.round(lerp(h, j === 2 ? 11 : 12, close)), d, there ? chargeCol : ink, .8 + .2 * close, there);   // the exact middle of 24
        glow(false);
      }));
    } else {
      // chosen: a crowded feed, a few orange badges; it thins to the handful you chose
      for (let i = 0; i < 18; i++) {
        const x = 1 + (i % 6) * 4, y = 1 + Math.floor(i / 6) * 4, keep = i % 5 === 0;
        const a = keep ? 1 : 1 - sm(.06 + hr(i, 5) * .35, .4 + hr(i, 5) * .35, k);
        if (a <= .02) continue;
        glow(keep);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) px(x + dx, y + dy, keep ? chargeCol : ink, a, keep);
        glow(false);
        if ((i === 3 || i === 8 || i === 13) && k < .55 && (reduce || Math.sin(t * 6 + i) > 0)) px(x + 2, y - 1 < 0 ? y : y - 1, rgb(P.orange), a);
      }
    }
    g.globalAlpha = 1;
  }

  function targets() {
    const vh = innerHeight, narrow = innerWidth < 768;
    if (!narrow) {
      // u: 0 when the locked stage starts to come up, 1 when it locks, and on while it stays locked
      const u = (vh - pin.getBoundingClientRect().top) / vh;
      return cards.map((c, i) => ({ y: reduce ? 0 : (1 - sm(.35 + i * .1, 1 + i * .1, u)) * (120 + i * 40), k: reduce ? 1 : sm(.8, 2, u) }));
    }
    return cards.map(c => { const p = (vh - c.el.getBoundingClientRect().top) / (vh * .9); return { y: reduce ? 0 : (1 - sm(0, .62, p)) * 60, k: reduce ? 1 : sm(.3, 1.05, p) }; });
  }

  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(root);
  function frame(now) {
    if (visible) {
      const tg = targets(), t = now / 1000, dpr = Math.min(devicePixelRatio || 1, 2);
      cards.forEach((c, i) => {
        c.y += (tg[i].y - c.y) * .14; c.k += (tg[i].k - c.k) * .1;
        c.el.style.transform = `translate3d(0,${c.y.toFixed(1)}px,0)`;
        const W = c.cv.clientWidth, H = c.cv.clientHeight;
        if (!W || !H) return;
        if (c.cv.width !== Math.round(W * dpr) || c.cv.height !== Math.round(H * dpr)) { c.cv.width = Math.round(W * dpr); c.cv.height = Math.round(H * dpr); }
        c.g.setTransform(dpr, 0, 0, dpr, 0, 0); c.g.clearRect(0, 0, W, H);
        // once a card's story is complete: one short spark (and again if you come back to it)
        if (c.k > .985 && !c.sparked) { c.sparked = true; c.sparkAt = now; }
        if (c.k < .9) c.sparked = false;
        const se = c.sparked && !reduce ? (now - c.sparkAt) / 1000 : 9;
        const spark = se < 1.1 ? Math.sin(Math.min(1, se / .18) * Math.PI / 2) * Math.pow(1 - se / 1.1, 2) : 0;
        motif(c, W, H, c.k, t, spark);
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   Section 4 — the mission
   A pixel world: one dot per million people (about 8,240 of them), the ones online lit, the rest dim. Five beats:
     1 the online ones light up                 "Six Billion Of Us Live Online."
     2 they turn orange and restless            "Over Six Hours A Day, On Average."
     3 the restlessness pulls harder            "And Nobody Ever Taught Us How."
     4 one dot in the middle turns blue, and a ripple from it turns every dot it passes steady blue
                                                "We Want To Be The Guiding Voice."
     5 the whole world calm and blue, not one dot switched off   "Working With Technology, Not Against It."
   Figures: DataReportal, Digital 2026 (6.04 bn online, 2.2 bn offline, 6 h 38 min a day for adults 16 to 64).
   Webflow (the time story's classes, its own attributes):
     [data-mission]              section (height = scroll length, e.g. 520vh)
       [data-mission-sticky]     sticky 100vh
         [data-mission-line="1-5"]  the big lines (stacked, words rise in/out)
         [data-mission-globe]    the world (canvas is added here; make it square)
         [data-mission-note="1-5"]  the small line under each beat
   ========================================================= */
function initMission(root) {
  const host = root.querySelector('[data-mission-globe]');
  if (!host) return;
  const byNum = attr => [...root.querySelectorAll(`[${attr}]`)].sort((a, b) => +a.getAttribute(attr) - +b.getAttribute(attr));
  const lines = byNum('data-mission-line'), notes = byNum('data-mission-note');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNight = () => document.documentElement.classList.contains('dfs-night');
  const PAL = { night: { ink: [241, 237, 226], blue: [29, 171, 250], orange: [240, 110, 40] }, day: { ink: [61, 58, 53], blue: [2, 151, 219], orange: [216, 67, 2] } };
  injectCSS();
  const split = (node, step) => {
    const text = node.textContent.trim(); node.setAttribute('aria-label', text);
    node.innerHTML = `<span class="dive-txt" aria-hidden="true">${text.split(/\s+/).map((w, i) => `<span class="dive-w"><span class="dive-wi" style="transition-delay:${reduce ? 0 : i * step}ms">${w}</span></span>`).join(' ')}</span>`;
  };
  lines.forEach(l => split(l, 70)); notes.forEach(n => split(n, 25));
  const setState = (node, state) => {
    if (!node || node.dataset.diveState === state) return;
    node.dataset.diveState = state;
    node.classList.toggle('dive-in', state === 'in'); node.classList.toggle('dive-out', state === 'out');
  };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;

  // the world: a disc of dots; about 6.04 of every 8.24 online; the one in the middle always is (the voice starts there)
  const MD = 104, MR = 51.3, c0 = (MD - 1) / 2, world = [];
  for (let y = 0; y < MD; y++) for (let x = 0; x < MD; x++) { const d = Math.hypot(x - c0, y - c0); if (d <= MR) world.push({ x, y, r: d / MR }); }
  { let s2 = 11; const r2 = () => { s2 = (s2 * 16807) % 2147483647; return (s2 - 1) / 2147483646; };
    const idx = world.map((_, i) => i).sort(() => r2() - .5), onN = Math.round(world.length * 6.04 / 8.24);
    idx.forEach((i, n) => { const c = world[i]; c.on = n < onN || c.r < .02; c.t = r2(); c.ph = r2() * 6.28; c.sp = 2 + r2() * 5; c.o = r2(); }); }

  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%';
  host.append(cv);
  const g = cv.getContext('2d');
  let visible = false, size = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
  const progress = () => { const r = root.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };
  const win = (p, a, b) => p < a ? 'pre' : p < b ? 'in' : 'out';

  function frame(now) {
    if (visible) {
      const p = progress(), t = now / 1000, P = PAL[isNight() ? 'night' : 'day'];
      setState(lines[0], win(p, .02, .28)); setState(lines[1], win(p, .3, .48)); setState(lines[2], win(p, .5, .64));
      setState(lines[3], win(p, .66, .84)); setState(lines[4], p < .86 ? 'pre' : 'in');
      setState(notes[0], win(p, .05, .28)); setState(notes[1], win(p, .33, .48)); setState(notes[2], win(p, .53, .64));
      setState(notes[3], win(p, .69, .84)); setState(notes[4], p < .89 ? 'pre' : 'in');
      const W = host.clientWidth, dpr = Math.min(devicePixelRatio || 1, 2);
      if (W && W !== size) { size = W; cv.width = cv.height = Math.round(W * dpr); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      // whole device pixels per dot, so the rows stay even
      const up = Math.max(2, Math.floor(cv.width / MD)), s = Math.max(1, Math.round(up * .78)), o0 = Math.floor((cv.width - up * MD) / 2);
      const light = sm(.03, .22, p), rest = sm(.3, .42, p), pull = sm(.5, .6, p), rr = sm(.66, .86, p) * 1.12;
      const white = [255, 255, 255], dim = `rgba(${P.ink.join(',')},${isNight() ? .09 : .11})`;
      for (const c of world) {
        let x = o0 + c.x * up, y = o0 + c.y * up;
        if (!c.on || light < c.t) { g.globalAlpha = 1; g.fillStyle = dim; g.fillRect(x, y, s, s); continue; }
        const calm = sm(0, .14, rr - c.r), front = rr > 0 && rr < 1.1 ? Math.max(0, 1 - Math.abs(c.r - rr) / .035) : 0;
        const restless = rest * (.55 + .45 * c.o) * (1 - calm);
        let col = mixc(P.ink, P.orange, restless), a = .85;
        if (!reduce && restless > 0) {
          a = .85 - restless * (.25 + pull * .4) * (.5 + .5 * Math.sin(t * c.sp + c.ph));
          const j = pull * (1 - calm) * up * .35; x += Math.sin(t * 7 + c.ph * 3) * j; y += Math.cos(t * 6 + c.ph * 5) * j;
        }
        col = mixc(col, P.blue, calm); a = a + (1 - a) * calm;
        if (front > 0) col = mixc(col, white, front * .6);
        g.globalAlpha = a; g.fillStyle = rgb(col); g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* =========================================================
   Section 5 — our solutions (what we teach, what we build)
   Here the experience hands over to the normal site: the section is the site's own background and slides up over the
   dark mission, which moves on at about a third of the speed behind it (parallax); the site's side lines start at its top edge.
     Fundamentals, Tinko and Rhythms each show what they do: see dive/solutions.js (loaded only on this page).
     Rhythms is the real app, the "Rhythms App Window" component, brought to life by main.js (dfsRhythmsApp).
   Webflow:
     [data-sol]                  the section (z-index above the mission, site background)
       [data-sol-lines]          .page_side-lines (fixed); clipped here so the lines start where the section starts
       [data-sol-rise]           the heading, words rise in
       [data-sol-path]           01 Learn it — 02 Set it up — 03 Protect it (.sol_seg lines draw in)
       [data-course-demo], [data-tinko-demo], [data-sol-rhythms]   the three demos (dive/solutions.js)
   ========================================================= */
function initSol(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  injectCSS();
  // the app icons. main.js's Rhythms app takes them from the Rhythms page's marquee chips; on this page there are
  // none, so a hidden set goes in now (dive.js runs before main.js's DOMContentLoaded start). Tinko's Dock uses them too.
  const CDN = 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/';
  const ICONS = [
    ['Instagram', CDN + '6ac8de5911e382a414a9e78c_rhythms-icon-instagram.png'],
    ['TikTok', CDN + '6ac8de5b08422163a5999814_rhythms-icon-tiktok.png'],
    ['YouTube', CDN + '6ac8de5d7bfdc43ba814b89d_rhythms-icon-youtube.png'],
    ['Reddit', CDN + '6ac8de5a63ab4f776e9138f1_rhythms-icon-reddit.png'],
    ['X (Twitter)', CDN + '6ac8de5cba765999ae0804c9_rhythms-icon-x.png'],
    ['Netflix', CDN + '6ac8de596ae1942412de144c_rhythms-icon-netflix.png'],
    ['Facebook', CDN + '6ac8de596ae1942412de1406_rhythms-icon-facebook.png'],
    ['Amazon', CDN + '6ac8de588b55c5ad693413d6_rhythms-icon-amazon.png'],
    ['Temu', CDN + '6ac8de5bfd45b280fff03bf4_rhythms-icon-temu.png'],
    ['CNN', CDN + '6ac8de5811d114640a3c42cf_rhythms-icon-cnn.png'],
    ['The New York Times', CDN + '6ac8de599d1e4163a8f5c5e9_rhythms-icon-nytimes.png'],
    ['Slack', CDN + '6ac8de5a11e382a414a9e88c_rhythms-icon-slack.png'],
    ['Messages', CDN + '6ac8de59bb2072d45c37fa8d_rhythms-icon-messages.png'],
    ['WhatsApp', CDN + '6ac8de5c11e382a414a9e946_rhythms-icon-whatsapp.png'],
    ['Discord', CDN + '6ac8de5908610c5688634232_rhythms-icon-discord.png'],
    ['Twitch', CDN + '6ac8de5c137df461d838e865_rhythms-icon-twitch.png']
  ];
  if (!document.querySelector('.rhythms-chip')) {
    const src = document.createElement('div'); src.hidden = true; src.setAttribute('aria-hidden', 'true');
    src.innerHTML = ICONS.map(([n, u]) => `<div class="rhythms-chip"><img src="${u}" alt="" loading="lazy"><span class="rhythms-chip_name">${n}</span></div>`).join('');
    root.append(src);
  }

  // the hand-over: side lines from the section's top edge down; the mission behind moves on at about a third of the
  // scroll, so the site slides over it quickly
  const lines = root.querySelector('[data-sol-lines]');
  const behind = document.querySelector('[data-mission-sticky]');
  // the section after this one opens on a full-width field that this one slides off ([data-found-field], see
  // dive/solutions.js): there the lines stop at this section's bottom edge, and come back once the field has gone by
  const field = document.querySelector('[data-found-field]');
  // and the close ([data-close], the dive's colours) at the end: the lines stop where it begins
  const close = document.querySelector('[data-close]');
  let last = '';
  function handover() {
    const r = root.getBoundingClientRect(), top = r.top, vh = innerHeight;
    let t = Math.max(0, Math.min(vh, top)), b = 0;
    if (field) {
      b = Math.max(0, Math.min(vh, vh - r.bottom));
      const fb = field.getBoundingClientRect().bottom;
      if (fb < vh) { t = Math.max(0, fb); b = 0; }
    }
    if (close) b = Math.max(b, Math.min(vh, vh - close.getBoundingClientRect().top));
    const clip = `inset(${t.toFixed(1)}px 0 ${b.toFixed(1)}px 0)`;
    if (lines && clip !== last) { last = clip; lines.style.clipPath = clip; }
    if (behind && !reduce) { const d = Math.max(0, Math.min(vh, vh - top)); behind.style.transform = d > 0 && d < vh ? `translate3d(0,${(d * .7).toFixed(1)}px,0)` : ''; }
    requestAnimationFrame(handover);
  }
  requestAnimationFrame(handover);

  // the heading rises in; the path draws its lines once it's in view
  const rise = root.querySelector('[data-sol-rise]');
  if (rise) {
    const text = rise.textContent.trim(); rise.setAttribute('aria-label', text);
    rise.innerHTML = `<span class="dive-txt" aria-hidden="true">${text.split(/\s+/).map((w, i) => `<span class="dive-w"><span class="dive-wi" style="transition-delay:${reduce ? 0 : i * 55}ms">${w}</span></span>`).join(' ')}</span>`;
  }
  const path = root.querySelector('[data-sol-path]');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add(e.target === path ? 'is-in' : 'dive-in'); }), { threshold: .5 });
  [rise, path].filter(Boolean).forEach(n => io.observe(n));

  // the three products show what they do (dive/solutions.js, loaded only here)
  import('./solutions.js').then(m => m.initSolutions(root)).catch(e => console.warn('[sol] demos did not load', e));
}

function injectCSS() {
  if (document.getElementById('dive-css')) return;
  const css = `
/* Only what the Designer can't hold lives here: the canvases and SVGs the script makes, the word and label
   animations, keyframes, and states the script switches. Colours, backgrounds, glass and spacing of the dive,
   time story, stand, mission and solutions sections are on their Webflow classes (dive_*, time_*, stand_*,
   mission_section, sol_*), using the --dive-* colour variables set above. */
[data-dive-canvas] canvas{width:100%!important;height:100%!important;display:block}
[data-dive-logo] svg{display:block;width:100%;height:auto}
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
[data-time-canvas] canvas{width:100%!important;height:100%!important;display:block}
[data-time-grid] canvas{display:block;margin:0 auto}
.time-count-box{display:inline-flex;justify-content:flex-end;vertical-align:top;white-space:nowrap}
.time-count-box [data-odometer-part="mask"]{width:var(--time-digit,auto);text-align:center}
.dive-bg{position:fixed;inset:0;z-index:0;pointer-events:none;visibility:hidden}
.dive-bg-shader{position:absolute;inset:0}
.dive-bg-shader canvas{width:100%!important;height:100%!important;display:block}
@media (max-width:767px){[data-sol-path]{flex-wrap:wrap;gap:.6rem 1.2rem}[data-sol-path] .sol_seg{display:none}}
[data-sol-path] .sol_seg{background:linear-gradient(90deg,var(--brand-colors--blue) 50%,transparent 0) 0 0/6px 2px;transform-origin:left;transform:scaleX(0);transition:transform 1.1s cubic-bezier(.625,.05,0,1)}
[data-sol-path].is-in .sol_seg{transform:none}[data-sol-path].is-in .sol_seg:nth-of-type(4){transition-delay:.5s}
[data-sol-rhythms] .rhythms-window{box-shadow:0 0 0 1px var(--brand-colors--dark-bage)}
@media (max-width:767px){[data-stand-rise] .dive-txt{display:inline}}
@media (prefers-reduced-motion: reduce){[data-dive-cue-text],[data-dive-cue-line]::after{animation:none}[data-dive-cue-line]::after{transform:scaleY(1)}.dive-wi,.dive-ra,.dive-rb{transition:none}}
`;
  const s = document.createElement('style'); s.id = 'dive-css'; s.textContent = css; document.head.append(s);
}
