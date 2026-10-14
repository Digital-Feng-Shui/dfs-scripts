/* =========================================================
   dfs-dive — the scroll dive opening (test: /rimbo-home-test)

   Separate from main.js on purpose: one page loads it in its own
   page custom code, nothing else on the site knows it exists.

   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@dive-v0.1.4/dive/dive.js"></script>

   Webflow structure (classes are free, the attributes matter):
     [data-dive]                 section, its height sets the scroll length (e.g. 380vh)
       [data-dive-sticky]        position: sticky; top: 0; height: 100vh; overflow: hidden
         [data-dive-canvas]      the dithered swirl (Paper Shaders) is mounted here
         [data-dive-fade]        colour layer the swirl drains into
         [data-dive-logo]        the DFS star (SVG is added here), Keeper tick
         [data-dive-title]       first line, words rise in
         [data-dive-end]         line on the empty page at the end
         [data-dive-end2]        optional second end line
         [data-dive-cue]         square glass box with dashed guide lines; hover/click rolls the label to
                                 "Continue" (data-dive-cue-alt), which stays during the dive; click 1 = glide
                                 to the first sentence, click 2 = to the closing sentence

   Optional settings on [data-dive] (defaults = the hero lab):
     data-zoom="2.4" data-spin="420" data-pixel="2" data-pixel-grow="2"
     data-start-zoom="0.9" data-speed="0.5" data-pattern="4x4"
     data-fade="0.42" data-title-in="0.1" data-word-step="70"
     data-logo="keeper|spin|still"

   Colours follow the site's night mode (html.dfs-night):
   night = Mist (navy + dusk blue, ends in black), day = Ink (bage + dark grey, ends in bage).
   Shader: Paper Shaders Dithering, @paper-design/shaders 0.0.81, Apache 2.0.
   ========================================================= */

import { ShaderMount, ditheringFragmentShader, getShaderColorFromString as col } from 'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.81/+esm';

const root = document.querySelector('[data-dive]');
if (root) init(root);

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
             glass: 'rgba(14,22,40,.42)', glassHover: 'rgba(14,22,40,.62)', glassHi: 'rgba(255,255,255,.07)', dash: 'rgba(241,237,226,.26)' },
    day:   { back: '#f1ede2', front: '#3d3a35', text: '#3d3a35', accent: '#0297db', end: '#f1ede2', endText: '#3d3a35',
             glass: 'rgba(241,237,226,.5)', glassHover: 'rgba(241,237,226,.78)', glassHi: 'rgba(255,255,255,.55)', dash: 'rgba(61,58,53,.24)' },
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
    const s = root.style;
    s.setProperty('--dive-back', P.back); s.setProperty('--dive-text', P.text); s.setProperty('--dive-accent', P.accent);
    s.setProperty('--dive-end', P.end); s.setProperty('--dive-endtext', P.endText);
    s.setProperty('--dive-glass', P.glass); s.setProperty('--dive-glass-hover', P.glassHover); s.setProperty('--dive-glass-hi', P.glassHi); s.setProperty('--dive-dash', P.dash);
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
      // stays through the dive as "Continue", leaves once the closing sentence is there
      const o = 1 - sm(endAt - .05, endAt, p); el.cue.style.opacity = o; el.cue.style.pointerEvents = o > .3 ? 'auto' : 'none';
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

  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paint();
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
[data-dive-cue]:hover{background:var(--dive-glass-hover)}
[data-dive-cue]:focus-visible{outline:1px solid var(--dive-text);outline-offset:4px}
[data-dive-cue]::before,[data-dive-cue]::after{content:"";position:absolute;z-index:-1;pointer-events:none}
[data-dive-cue]::before{top:-1px;bottom:-1px;left:-10rem;right:-10rem;background:repeating-linear-gradient(90deg,var(--dive-dash) 0 10px,transparent 10px 18px) top/100% 1px no-repeat,repeating-linear-gradient(90deg,var(--dive-dash) 0 10px,transparent 10px 18px) bottom/100% 1px no-repeat;-webkit-mask-image:linear-gradient(90deg,transparent,#000 34%,#000 66%,transparent);mask-image:linear-gradient(90deg,transparent,#000 34%,#000 66%,transparent)}
[data-dive-cue]::after{left:-1px;right:-1px;top:-7.5rem;bottom:-7.5rem;background:repeating-linear-gradient(180deg,var(--dive-dash) 0 10px,transparent 10px 18px) left/1px 100% no-repeat,repeating-linear-gradient(180deg,var(--dive-dash) 0 10px,transparent 10px 18px) right/1px 100% no-repeat;-webkit-mask-image:linear-gradient(180deg,transparent,#000 42%,#000 58%,transparent);mask-image:linear-gradient(180deg,transparent,#000 42%,#000 58%,transparent)}
.dive-roll{display:inline-grid;justify-items:center}
.dive-roll>span{grid-area:1/1;white-space:nowrap}
.dive-ra,.dive-rb{display:inline-block;transition:transform .55s cubic-bezier(.625,.05,0,1)}
.dive-rb{transform:translateY(110%)}
[data-dive-cue]:hover .dive-ra,[data-dive-cue]:focus-visible .dive-ra,[data-dive-cue].is-alt .dive-ra{transform:translateY(-110%)}
[data-dive-cue]:hover .dive-rb,[data-dive-cue]:focus-visible .dive-rb,[data-dive-cue].is-alt .dive-rb{transform:none}
[data-dive-cue-text]{animation:dive-pulse 2.4s ease-in-out infinite}
[data-dive-cue-line]{position:relative;overflow:hidden;background:color-mix(in srgb,currentColor 25%,transparent)}
[data-dive-cue-line]::after{content:"";position:absolute;inset:0;background:currentColor;transform:scaleY(0);transform-origin:top;animation:dive-draw 2.4s cubic-bezier(.625,.05,0,1) infinite}
@keyframes dive-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes dive-draw{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.dive-txt{display:block}
.dive-w{display:inline-block;overflow:hidden;vertical-align:top;padding:.06em .02em .12em;margin:-.06em -.02em -.12em}
.dive-wi{display:inline-block;transform:translateY(110%);transition:transform .8s cubic-bezier(.625,.05,0,1)}
.dive-in .dive-wi{transform:none}
.dive-out .dive-wi{transform:translateY(-110%)}
@media (prefers-reduced-motion: reduce){[data-dive-cue-text],[data-dive-cue-line]::after{animation:none}[data-dive-cue-line]::after{transform:scaleY(1)}.dive-wi,.dive-ra,.dive-rb{transition:none}}
`;
  const s = document.createElement('style'); s.id = 'dive-css'; s.textContent = css; document.head.append(s);
}
