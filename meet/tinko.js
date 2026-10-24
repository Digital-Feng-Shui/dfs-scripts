/* Meet Tinko (/meet-tinko). One module, loaded only on that page (page head code):
   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@meet-tinko-v0.1.0/meet/tinko.js"></script>
   The sections are Webflow elements and classes; this script builds the moving parts inside them.

   [data-tinko-stage]: Tinko large, in his own window, on his real first screen (tinko Views.swift, step .hello).
   He is drawn and moves the way the app has him (tinko Tinko.swift): one outline whose edges drift (the morph),
   a slow sway, blinks, a goof now and then, eyes that follow the pointer, the click "bwoop" (eyes big, then out,
   never touching) and the cheer (happy slits, a double hop). On the first screen at load he gets an intro: alone
   and larger in the middle, his pixels come in, he wakes, then glides into place while his box opens around
   him and the title rises (any scroll, click or key skips it). Further down the page he wakes when he's seen.
   Space (or the button) is his "Take a look": he cheers and the page moves on. The moon / sun in his toolbar
   is the site's own day/night switch.
   [data-tinko-title]: the hero title's lines rise in; [data-tinko-intro] follow.
   [data-tinko-mess]: the opener after the hero. The homepage's file storm drifting behind "Years Of Clutter.",
   pulled into the Bin beside Tinko as you scroll, then the result card with its firework (example figures).
   [data-tinko-demo="dock|desk|files|documents|apps|settings|inbox|setup"]: one row each under "What he does". A small Mac
   (wallpaper, menu bar, Dock) with his window on it, playing that part with his real lines (from the app's
   Views files) while the Mac beside him changes: Dock icons leave, files fly, rows in Finder and Mail go, switches
   flip. Each plays only while it's on screen, then loops. Demo names and sizes are made up; the lines are his. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const TUNE = new URLSearchParams(location.search).has('tune');   // /meet-tinko?tune: replay the intro, slowed down, with a clock
// the feature layouts lab (meet/layouts.js): ?layout=rows|run|stages|scroll, and &you=1 = you press the keys
const LAB = new URLSearchParams(location.search).get('layout');
export const YOU = new URLSearchParams(location.search).get('you') === '1';

/* ---------- Tinko, after Tinko.swift ---------- */

// The body, drawn by hand in cells. # = body. (Tinko.bitmap)
const BITMAP = ['....######....', '..##########..', '.############.', '.#############', '##############', '##############', '##############', '.############.', '.############.', '..##########..', '....#####.....'];
const COLS = 14, ROWS = 11, CX = COLS / 2, CY = ROWS / 2;

// The outline of the bitmap as one clockwise polygon (y down), in cells, corners only (Tinko.outline)
function outline() {
  const on = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && BITMAP[y][x] === '#';
  const next = new Map(), add = (a, b) => next.set(a.join(','), b);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!on(x, y)) continue;
    if (!on(x, y - 1)) add([x, y], [x + 1, y]);
    if (!on(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
    if (!on(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
    if (!on(x - 1, y)) add([x, y + 1], [x, y]);
  }
  const start = [...next.keys()].sort()[0].split(',').map(Number);
  const loop = []; let p = start;
  do { loop.push(p); p = next.get(p.join(',')); } while (p && (p[0] !== start[0] || p[1] !== start[1]) && loop.length < 1000);
  return loop.filter((b, i) => {
    const a = loop[(i + loop.length - 1) % loop.length], c = loop[(i + 1) % loop.length];
    return !((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]));
  });
}
// The same polygon with every edge moved a little along its outward normal; corners follow (Tinko.deformed)
function deformed(corners) {
  const n = corners.length, off = corners.map(() => -0.3 + Math.random() * 0.75);
  return corners.map((p, i) => {
    const prev = corners[(i + n - 1) % n], nxt = corners[(i + 1) % n], q = [...p];
    for (const [a, b, o] of [[prev, p, off[(i + n - 1) % n]], [p, nxt, off[i]]]) {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(Math.abs(dx), Math.abs(dy));
      q[0] += dy / len * o; q[1] += -dx / len * o;   // clockwise, y down: outward = (dy, -dx)
    }
    return q;
  });
}
const pathOf = c => 'M' + c.map(p => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join('L') + 'Z';
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // Core Animation's ease-in-ease-out, near enough
const out = t => 1 - Math.pow(1 - t, 3);
const inn = t => t * t * t;
const EASES = { inOut, out, in: inn, linear: t => t };

// Eyes, in cells from the body's centre (y down). (Eye, and the poses from Tinko.swift)
const E = (x, y, w = 1, h = 2) => ({ x, y, w, h });
const HOME = [E(-1.5, -.5), E(1.5, -.5)];
const GOOFS = [
  [E(-4.2, -.3), E(4.2, -.3)], [E(-4.0, .8), E(3.8, -1.6)], [E(-1.8, -.5, 2.2, 2.2), E(1.9, -.3, .9, 1.6)],
  [E(-3.6, -2.2), E(3.6, -2.2)], [E(-.7, -.5), E(.7, -.5)],
];
const CHEER = [E(-1.6, -1, 1.8, .5), E(1.6, -1, 1.8, .5)];

/* His arrivals (Rim, 19 Oct, from the load-in lab): Outline (his outline is drawn block by block, the inside
   fills ring by ring, then the eyes open: drawn, then brought to life), Rings (from the middle out, a whole ring per
   beat, fast) and Bloom (blocks grow open, slow). Each says when every pixel switches on (0..1 of the arrival); in
   Outline and Rings a pixel is on or off, nothing fades. Every arrival ends on his exact grid, and his outline only
   starts to drift after that, so the end never jumps. The page always uses Outline (Rim, 19 Oct: "for simplicity
   just the outline one"); ?arrive=rings|bloom shows the others, for testing. */
const PIX = []; BITMAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') PIX.push({ x, y }); }));
const isOn = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && BITMAP[y][x] === '#';
const pdist = c => Math.hypot(c.x + .5 - CX, (c.y + .5 - CY) * 1.2), PFAR = Math.max(...PIX.map(pdist));
const RING = (() => {   // depth from the edge (0 = the outline), and the angle round the middle
  const depth = new Map(), key = c => c.x + ',' + c.y, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let layer = PIX.filter(c => N4.some(([dx, dy]) => !isOn(c.x + dx, c.y + dy))), d = 0;
  const left = new Set(PIX.map(key));
  while (layer.length) { layer.forEach(c => { depth.set(key(c), d); left.delete(key(c)); }); d++; layer = PIX.filter(c => left.has(key(c)) && N4.some(([dx, dy]) => depth.get((c.x + dx) + ',' + (c.y + dy)) === d - 1)); }
  const maxD = Math.max(...depth.values());
  return c => ({ d: depth.get(key(c)), maxD, ang: (Math.atan2(c.y + .5 - CY, c.x + .5 - CX) + Math.PI * 1.5) % (Math.PI * 2) / (Math.PI * 2) });
})();
const ARRIVALS = {
  outline: { dur: 1250, at: c => { const r = RING(c); return r.d === 0 ? r.ang * .58 : .6 + r.d / r.maxD * .4; } },
  rings: { dur: 620, at: c => Math.round(pdist(c) / PFAR * 7) / 7 },
  bloom: { dur: 1500, smooth: true, at: c => pdist(c) / PFAR * .62 },
};
const ARRIVE = (() => {
  const q = new URLSearchParams(location.search).get('arrive');
  return ARRIVALS[q] ? q : 'outline';
})();

function wakeTimes(k, style) {
  const A = ARRIVALS[style].dur * k, start = 60 * k, end = start + A;
  return { A, start, end, open: end + 220 * k, blink: end + 640 * k, hello: end + 900 * k, idle: end + 1550 * k };
}

let tinkoIds = 0;
function makeTinko(host, shared) {
  // His body and eyes sit behind a mask of his own pixels. Waking up, each pixel grows open (a wave from the
  // middle out); once all are open the mask goes, so the body is never swapped for something else (no flash).
  const mid = `tkh-mask-${++tinkoIds}`;
  host.innerHTML = `<div class="tkh-sway"><div class="tkh-jig"><div class="tkh-blob">
    <svg class="tkh-svg" viewBox="-1 -1 ${COLS + 2} ${ROWS + 2}" aria-hidden="true">
      <defs><mask id="${mid}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${COLS + 4}" height="${ROWS + 4}">${BITMAP.map((r, y) => [...r].map((c, x) => c === '#' ? `<rect fill="#fff" x="${x + .5}" y="${y + .5}" width="0" height="0"/>` : '').join('')).join('')}</mask></defs>
      <g class="tkh-me"><path class="tkh-body"/><rect class="tkh-eye"/><rect class="tkh-eye"/></g>
    </svg></div></div></div>`;
  const svg = host.querySelector('svg'), body = host.querySelector('.tkh-body'), me = host.querySelector('.tkh-me');
  const cells = [...host.querySelectorAll('mask rect')].map(el => { const x = +el.getAttribute('x') - .5, y = +el.getAttribute('y') - .5, at = {}; for (const k in ARRIVALS) at[k] = ARRIVALS[k].at({ x, y }); return { el, x, y, at, w: -1 }; });
  let reveal = null;   // { t0, A (ms), style } while his pixels are coming in
  // a pixel of the mask: w = 0 shut, 1.04 open (a hair over its cell, so neighbours close up with no seams)
  const sizeCell = (c, w) => { if (Math.abs(w - c.w) < .001) return; c.w = w; c.el.setAttribute('x', (c.x + .5 - w / 2).toFixed(3)); c.el.setAttribute('y', (c.y + .5 - w / 2).toFixed(3)); c.el.setAttribute('width', w.toFixed(3)); c.el.setAttribute('height', w.toFixed(3)); };
  const S = shared || {};   // shared by the intro's two Tinkos: the morph, its clock, and when the drift starts
  const masked = on => on ? me.setAttribute('mask', `url(#${mid})`) : me.removeAttribute('mask');
  const eyeEls = [...host.querySelectorAll('.tkh-eye')], blob = host.querySelector('.tkh-blob'), jig = host.querySelector('.tkh-jig');

  // the morph: four drifted outlines and back to the first, 11 s round, eased per leg (body.add(morph))
  const base = outline();
  const variants = shared?.variants || [deformed(base), deformed(base), deformed(base), deformed(base)];
  if (variants.length === 4) variants.push(variants[0]);
  if (shared && !shared.variants) shared.variants = variants;
  const morphAt = t => {
    const leg = Math.min(3, Math.floor(t * 4)), k = inOut(t * 4 - leg), a = variants[leg], b = variants[leg + 1];
    return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
  };
  body.setAttribute('d', pathOf(base));

  // eyes: each moves from where it is to a target, eased (TinkoView.set)
  let eyes = HOME.map(e => ({ ...e })), tween = null;
  const drawEyes = () => eyes.forEach((e, i) => {
    const el = eyeEls[i];
    el.setAttribute('x', (CX + e.x - e.w / 2).toFixed(3)); el.setAttribute('y', (CY + e.y - e.h / 2).toFixed(3));
    el.setAttribute('width', Math.max(0, e.w).toFixed(3)); el.setAttribute('height', Math.max(0, e.h).toFixed(3));
  });
  function set(l, r, dur = .45, ease = 'inOut') {
    if (reduce) dur = Math.min(dur, .12);
    tween = { from: eyes.map(e => ({ ...e })), to: [l, r], t0: performance.now(), dur: dur * 1000, ease: EASES[ease] };
    wake();
  }
  drawEyes();

  // one frame loop while he's on screen: the morph and any eye move
  let raf = 0, visible = false; const t0 = S.t0 ?? (S.t0 = performance.now());
  if (S.driftFrom === undefined) S.driftFrom = -1e9;
  function frame(now) {
    raf = 0;
    if (!reduce) {   // the morph, faded in from his exact grid once he has arrived
      const amp = inOut(Math.max(0, Math.min(1, (now - S.driftFrom) / 1800)));
      if (amp <= 0) body.setAttribute('d', pathOf(base));
      else { const m = morphAt((((now - t0) / 11000) % 1 + 1) % 1); body.setAttribute('d', pathOf(amp >= 1 ? m : base.map((p, i) => [p[0] + (m[i][0] - p[0]) * amp, p[1] + (m[i][1] - p[1]) * amp]))); }
    }
    if (reveal) {
      const A = ARRIVALS[reveal.style], k = (now - reveal.t0) / reveal.A;
      for (const c of cells) {
        const s = c.at[reveal.style];
        if (reveal.back) sizeCell(c, k >= 1 - s ? 0 : 1.04);   // leaving: the last pixel in is the first out
        else if (A.smooth) { const g = Math.max(0, Math.min(1, (k - s) / .38)); sizeCell(c, 2.1 * out(g)); }
        else sizeCell(c, k >= s ? 1.04 : 0);
      }
      if (k >= 1) { if (!reveal.back) masked(false); reveal = null; }
    }
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur), f = tween.ease(k);
      eyes = tween.from.map((a, i) => { const b = tween.to[i]; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, h: a.h + (b.h - a.h) * f }; });
      drawEyes();
      if (k >= 1) tween = null;
    }
    if (visible && (!reduce || tween || reveal)) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  function show(on) { visible = on; if (on) wake(); }

  // moods and little acts
  let mood = 'idle', goofing = false, blinking = false, nextBlink = performance.now() + 2000, nextGoof = performance.now() + 6000, gaze = { x: 0, y: 0 }, lookDownUntil = 0;
  const timers = new Set(), later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  function blink() {
    if (blinking) return;
    blinking = true;
    const [l, r] = (tween ? tween.to : eyes).map(e => ({ ...e }));
    set({ ...l, y: l.y + .8, h: .25 }, { ...r, y: r.y + .8, h: .25 }, .07, 'in');
    later(() => { set(l, r, .16, 'out'); blinking = false; }, 130);
  }
  function goof() {
    goofing = true;
    const g = GOOFS[Math.floor(Math.random() * GOOFS.length)];
    set({ ...g[0] }, { ...g[1] }, .9);
    later(() => {
      if (mood !== 'idle') { goofing = false; return; }
      gaze = { x: 0, y: 0 }; set({ ...HOME[0] }, { ...HOME[1] }, .7);
      later(() => { goofing = false; }, 700);
    }, 1200 + Math.random() * 800);
  }
  // where the pointer is, relative to him, as -1…1 (TinkoView.mouseDirection, scaled to his size here)
  let pointer = null;
  addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  function follow() {
    const r = svg.getBoundingClientRect();
    let g;
    if (performance.now() < lookDownUntil) g = { x: 0, y: 1 };
    else if (!pointer) g = { x: 0, y: 0 };
    else {
      const reach = Math.max(260, r.width * 1.35);
      g = { x: Math.max(-1, Math.min(1, (pointer.x - (r.left + r.width / 2)) / reach)), y: Math.max(-1, Math.min(1, (pointer.y - (r.top + r.height * .45)) / reach)) };
    }
    if (Math.abs(g.x - gaze.x) <= .04 && Math.abs(g.y - gaze.y) <= .04) return;
    gaze = g;
    const dx = g.x * 1.8, dy = g.y * 1.1;
    set(E(HOME[0].x + dx, HOME[0].y + dy), E(HOME[1].x + dx, HOME[1].y + dy), .25, 'out');
  }
  // the 10 Hz tick (TinkoView.step) for the idle life: blinks, goofs, following
  setInterval(() => {
    if (!visible || reduce) return;
    const now = performance.now();
    if (mood === 'idle') {
      if (now >= nextGoof && !goofing && !blinking) { nextGoof = now + 6000 + Math.random() * 8000; goof(); }
      if (!goofing && !blinking) follow();
    }
    if (mood !== 'asleep' && now >= nextBlink && !blinking) { nextBlink = now + 2500 + Math.random() * 3500; blink(); }
  }, 100);
  // as you scroll away he glances down after you
  let lastY = scrollY;
  addEventListener('scroll', () => { if (scrollY > lastY + 4 && mood === 'idle') lookDownUntil = performance.now() + 900; lastY = scrollY; }, { passive: true });

  // a click: bwoop. He swells, wobbles, tilts; the eyes go big with a gap, then out towards his edges, a little
  // lopsided, then home (Tinko.swift mouseDown, 19 Oct)
  function bwoop() {
    if (mood === 'asleep') return;
    blob.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: .18 }, { transform: 'scale(.92)', offset: .42 }, { transform: 'scale(1.06)', offset: .62 }, { transform: 'scale(.98)', offset: .82 }, { transform: 'scale(1)' }], { duration: 700, easing: 'ease-in-out' });
    jig.animate([0, 6, -5, 3, -1.5, 0].map((d, i) => ({ transform: `rotate(${d}deg)`, offset: [0, .18, .42, .62, .82, 1][i] })), { duration: 700, easing: 'ease-in-out' });
    goofing = true; const was = mood;
    set(E(-2.1, -.6, 2, 2.2), E(2.1, -.6, 2, 2.2), .12, 'out');
    later(() => set(E(-3.7, -.9, 1, 2), E(3.5, .2, 1, 1.8), .2, 'out'), 280);
    later(() => { if (mood === was && mood !== 'cheering') set({ ...HOME[0] }, { ...HOME[1] }, .3); gaze = { x: 0, y: 0 }; goofing = false; }, 750);
  }
  // a win: happy slits and a double hop with a squash on landing (Tinko.swift cheer); once: one hop, for a goodbye
  function cheer(times = 1, once = false) {
    mood = 'cheering';
    set({ ...CHEER[0] }, { ...CHEER[1] }, .25, 'out');
    const c = parseFloat(getComputedStyle(host).getPropertyValue('--tkh-cell')) || 16;
    const hop = blob.animate(once ? [
      { transform: 'translateY(0) scaleY(1)', offset: 0, easing: 'ease-out' }, { transform: `translateY(${-2.2 * c}px) scaleY(1.06)`, offset: .4, easing: 'ease-in' },
      { transform: 'translateY(0) scaleY(.9)', offset: .78, easing: 'ease-out' }, { transform: 'translateY(0) scaleY(1)', offset: 1 },
    ] : [
      { transform: 'translateY(0) scaleY(1)', offset: 0, easing: 'ease-out' }, { transform: `translateY(${-2.2 * c}px) scaleY(1.06)`, offset: .14 / .56, easing: 'ease-in' },
      { transform: 'translateY(0) scaleY(.9)', offset: .28 / .56, easing: 'ease-out' }, { transform: `translateY(${-1.1 * c}px) scaleY(1.03)`, offset: .38 / .56, easing: 'ease-in' },
      { transform: 'translateY(0) scaleY(.94)', offset: .49 / .56 }, { transform: 'translateY(0) scaleY(1)', offset: 1 },
    ], { duration: once ? 620 : 1120, iterations: times });
    return hop.finished.then(() => { mood = 'idle'; gaze = { x: 9, y: 9 }; });
  }
  function squint() {   // ⌫ on his first screen: nothing to remove yet
    if (mood !== 'idle') return;
    goofing = true;
    set(E(-1.5, -.3, 2, .4), E(1.5, -.3, 2, .4), .18, 'out');
    later(() => { set({ ...HOME[0] }, { ...HOME[1] }, .3); gaze = { x: 0, y: 0 }; goofing = false; }, 650);
  }

  // waking up: asleep (eyes shut), the pixels come in, the eyes open, a blink, big eyes: hello
  function sleep() {
    mood = 'asleep'; timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false;
    host.classList.add('is-asleep'); host.classList.remove('is-awake');
    reveal = null; cells.forEach(c => sizeCell(c, 0)); masked(true); S.driftFrom = Infinity;
    eyes = HOME.map(e => ({ ...e, y: e.y + .8, h: .25 })); tween = null; drawEyes();
  }
  // he arrives (the style's pixels switch on), and only once he's whole do the eyes open: a blink, the big hello.
  // k < 1 runs it faster. The times after the arrival are the same for every style (wakeTimes).
  function wakeUp(k = 1, style = 'rings') {
    return new Promise(done => {
      if (reduce) { awakeNow(); return done(); }
      const W = wakeTimes(k, style), now = performance.now();
      reveal = { t0: now + W.start, A: W.A, style }; S.driftFrom = now + W.end + 350 * k; wake();
      later(() => { host.classList.remove('is-asleep'); host.classList.add('is-awake'); }, W.end);
      later(() => set(E(-1.5, -.6, 1, 2.1), E(1.5, -.6, 1, 2.1), .26, 'out'), W.open);
      later(() => { blinking = false; blink(); }, W.blink);
      later(() => set(E(-1.5, -.7, 1.4, 2.2), E(1.5, -.7, 1.4, 2.2), .38, 'out'), W.hello);
      later(() => { mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 }; done(); }, W.idle);
    });
  }
  // straight to awake, eyes home (the hand-over at the end of the intro); keepDrift leaves the shared drift clock
  function awakeNow(keepDrift = false) {
    timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false;
    if (!keepDrift) S.driftFrom = -1e9;
    reveal = null; cells.forEach(c => sizeCell(c, 1.04)); masked(false); host.classList.remove('is-asleep'); host.classList.add('is-awake');
    eyes = HOME.map(e => ({ ...e })); tween = null; drawEyes();
    mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 };
  }
  function home(dur = .3) { if (mood !== 'asleep') set({ ...HOME[0] }, { ...HOME[1] }, dur); }
  // leaving: his arrival backwards. The eyes shut, then his pixels go, the middle first and the outline last
  function goAway(k = 1, style = 'outline') {
    return new Promise(done => {
      timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false; mood = 'asleep';
      set({ ...HOME[0], y: HOME[0].y + .8, h: .25 }, { ...HOME[1], y: HOME[1].y + .8, h: .25 }, .12, 'in');
      cells.forEach(c => sizeCell(c, 1.04)); masked(true);
      if (reduce) { cells.forEach(c => sizeCell(c, 0)); return done(); }
      const A = ARRIVALS[style].dur * .55 * k;
      reveal = { t0: performance.now() + 160 * k, A, style, back: true }; wake();
      later(() => { host.classList.add('is-asleep'); host.classList.remove('is-awake'); done(); }, 160 * k + A + 40);
    });
  }

  svg.addEventListener('click', bwoop);
  return { show, sleep, wakeUp, awakeNow, home, cheer, squint, bwoop, goAway, get mood() { return mood; } };
}

/* ---------- the hero window: his first screen ---------- */

const DEL = '<svg viewBox="0 0 22 18" aria-hidden="true"><path d="M7 2h13v14H7L1 9z"/><path d="M11 6l6 6M17 6l-6 6"/></svg>';
const MENU = '<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="1" width="9" height="1"/><rect x="0" y="4" width="9" height="1"/><rect x="0" y="7" width="9" height="1"/></svg>';
// Day / night: the site's own pixel moon and sun (night.js), so it reads as what it does: it switches the page
const px = rows => `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">${rows.map((r, y) => [...r].map((c, x) => c === 'X' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '').join('')).join('')}</svg>`;
const MOON = px(['...XXXX..', '.XXXX....', '.XXX.....', 'XXX......', 'XXX......', 'XXX......', '.XXX.....', '.XXXX....', '...XXXX..']);
const SUN = px(['....X....', '.X.....X.', '...XXX...', '..XXXXX..', 'X.XXXXX.X', '..XXXXX..', '...XXX...', '.X.....X.', '....X....']);
const isNight = () => document.documentElement.classList.contains('dfs-night');
const roll = t => `<span class="tkh-roll">${[...t.toUpperCase()].map(c => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('')}</span>`;

function initStage(host) {
  host.innerHTML = `<div class="tkh"><div class="tkh-tilt"><div class="tkh-win">
    <div class="tkh-grain" aria-hidden="true"></div>
    <div class="tkh-lights" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="tkh-dash is-top"></div><div class="tkh-dash is-bottom"></div>
    <div class="tkh-col">
      <div class="tkh-tools"><span aria-hidden="true">${MENU}</span><button type="button" class="tkh-tool" data-tkh="theme"><span class="tkh-moon">${MOON}</span><span class="tkh-sun">${SUN}</span></button></div>
      <div class="tkh-stage">
        <div class="tkh-tinko" role="img" aria-label="Tinko, a white pixel creature with two eyes. Click him."></div>
        <div class="tkh-screen">
          <div class="tkh-tag"><span>Hi there</span></div>
          <p class="tkh-words">I’m Tinko, and I’ll be helping with your Digital Feng Shui setup. Let me take a look at what you’re working with.</p>
          <button type="button" class="tkh-btn" data-tkh="look"><span class="tkh-key">SPACE</span>${roll('Take a look')}</button>
        </div>
      </div>
    </div>
  </div></div></div>`;
  const win = host.querySelector('.tkh-win'), screen = host.querySelector('.tkh-screen'), btn = host.querySelector('[data-tkh="look"]');
  const tinkoEl = host.querySelector('.tkh-tinko'), shared = {};
  const tinko = makeTinko(tinkoEl, shared);
  const swayBorn = performance.now();

  // On the first screen at load: the intro. A page that opens further down (a link to a section) keeps it for
  // later: it plays the first time you stop with his window in view (Rim, 20 Oct: always Tinko first, never the
  // title first). With reduced motion: the window and the title come in, and he wakes up in his place.
  let started = false, shown = false, introOn = false;
  tinko.sleep(); screen.classList.add('is-hidden');
  const r0 = win.getBoundingClientRect();
  if (!reduce && scrollY < 40 && !location.hash && r0.top < innerHeight * .92 && r0.bottom > 0) { started = shown = true; heroTitle.reset(); queueMicrotask(() => intro()); }   // once the rest below is set up (the title hidden again, if the page's safety net already showed it)
  else if (reduce) heroTitle.play(120);
  let idle = 0;
  const later = () => {   // once the scrolling has stopped, with his window well in view
    clearTimeout(idle);
    idle = setTimeout(() => {
      const r = win.getBoundingClientRect();
      if (started || r.top > innerHeight * .8 || r.bottom < innerHeight * .25) return;
      started = shown = true; heroTitle.reset(); intro();
    }, 300);
  };
  if (!started && !reduce) addEventListener('scroll', () => { if (!started) later(); }, { passive: true });
  const born = performance.now();
  function appear() {
    if (shown) return; shown = true;
    setTimeout(() => win.classList.add('is-on'), reduce ? 0 : Math.max(0, 900 - (performance.now() - born)));
  }
  /* The page-load intro (Rim, 19 Oct): Tinko on his own in the middle of the screen, larger. His pixels come in,
     he wakes up and says hello, then he glides down to his place while his box opens out around him and the
     title rises. A click, Space, Enter or Esc skips to the end; scrolling lets it play on (he scrolls with the page). */
  // the intro's beats, in ms at full speed (Rim, 19 Oct: calmer, a longer hello before the glide). The glide waits
  // for his arrival and his hello, whichever arrival it is: hold = how long he looks at you before he goes
  const BEAT = { wake: .85, hold: 650, glideDur: 1150, title: 150, box: 400, boxDur: 1200 };
  function intro(f = 1, style = ARRIVE) {
    const W = wakeTimes(BEAT.wake, style), glide = W.hello + 380 * BEAT.wake + BEAT.hold;
    const cell = tinkoEl.offsetWidth / 16;
    const ov = document.createElement('div'); ov.className = 'tkh-intro'; ov.innerHTML = '<div class="tkh-tinko"></div>';
    ov.style.setProperty('--tkh-cell', cell + 'px');
    // on the page, not on the screen: if you scroll, he scrolls with the page and still lands in his box
    ov.style.top = scrollY + 'px'; ov.style.height = innerHeight + 'px';
    document.body.append(ov);
    const it = ov.firstChild, twin = makeTinko(it, shared);
    it.querySelector('.tkh-sway').style.animationDelay = `-${((performance.now() - swayBorn) / 1000).toFixed(3)}s`;
    twin.sleep(); twin.show(true);
    tinkoEl.style.visibility = 'hidden'; tinko.awakeNow(true); introOn = true; tinkoEl.style.translate = '';
    const BIG = Math.max(1.2, Math.min(1.6, innerWidth / 3.2 / it.offsetWidth + .4));
    it.style.transform = `scale(${BIG})`;
    win.classList.add('is-on', 'is-boxed'); win.style.transition = 'none';
    const anims = [], timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms * f));
    tune.start(f);
    let done = false;
    function finish() {
      if (done) return; done = true;
      timers.forEach(clearTimeout); anims.forEach(a => a.cancel());   // their end state is the page's own state, so nothing stays stuck on (a replay starts clean)
      removeEventListener('keydown', skip, true); removeEventListener('pointerdown', skip, true);
      win.style.clipPath = ''; win.classList.remove('is-boxed', 'is-clipping'); win.style.opacity = ''; win.style.transition = '';
      tinko.awakeNow(true); tinko.show(true); tinkoEl.style.visibility = ''; twin.show(false); ov.remove(); introOn = false;
      heroTitle.play(0, true);
      screen.classList.remove('is-hidden');
      running = null; tune.stop();
    }
    running = finish;
    // a click, Space, Enter or Esc skips to the end; scrolling doesn't (Rim, 20 Oct: it cut the intro short)
    const skip = e => {
      if (e?.target?.closest?.('.tkh-tune')) return;
      if (e.type === 'keydown' && ![' ', 'Enter', 'Escape'].includes(e.key)) return;
      if (e.type === 'pointerdown' && e.pointerType !== 'mouse') return;   // a finger on a phone is a scroll
      finish();
    };
    addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true);
    twin.wakeUp(BEAT.wake * f, style);
    // the glide down into his place, with the box opening out from around him
    at(glide, () => {
      twin.home(.45);
      const a = it.getBoundingClientRect(), b = tinkoEl.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      anims.push(it.animate([{ transform: `translate(0,0) scale(${BIG})` }, { transform: `translate(${dx}px,${dy}px) scale(1)` }], { duration: BEAT.glideDur * f, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' }));
      heroTitle.play(BEAT.title * f, false, f);
    });
    at(glide + BEAT.box, () => {
      const w = win.getBoundingClientRect(), b = tinkoEl.getBoundingClientRect(), pad = cell * 1.2;
      const from = `inset(${b.top - w.top - pad}px ${w.right - b.right - pad}px ${w.bottom - b.bottom - pad}px ${b.left - w.left - pad}px round 8px)`;
      win.classList.add('is-clipping'); win.style.opacity = '1';
      anims.push(win.animate([{ clipPath: from, opacity: 0 }, { clipPath: from, opacity: 1, offset: .32 }, { clipPath: 'inset(0px 0px 0px 0px round 14px)', opacity: 1 }], { duration: BEAT.boxDur * f, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' }));
    });
    at(glide + Math.max(BEAT.box + BEAT.boxDur, BEAT.glideDur) + 50, () => finish());   // once everything has landed
  }
  let running = null;
  // ?tune: the intro again from the top, at any speed
  const tune = TUNE ? tunePanel((f, style) => {
    if (running) running();
    if (window.lenis?.scrollTo) window.lenis.scrollTo(0, { immediate: true }); else scrollTo(0, 0);
    screen.classList.add('is-hidden'); tinko.sleep(); tinko.show(false);
    win.classList.add('is-boxed'); heroTitle.reset();
    setTimeout(() => intro(f, style), 350);
  }) : { start() {}, stop() {} };

  async function start() {
    started = true; appear();
    await new Promise(r => setTimeout(r, reduce ? 0 : Math.max(450, 1300 - (performance.now() - born))));
    await tinko.wakeUp(1, ARRIVE);
    screen.classList.remove('is-hidden');
  }
  new IntersectionObserver(([e]) => {
    tinko.show(e.isIntersecting);
    if (e.isIntersecting && (reduce || started)) appear();   // (a later intro opens the window itself)
    if (e.isIntersecting && e.intersectionRatio > .35 && !started) reduce ? start() : later();
  }, { threshold: [0, .01, .35] }).observe(win);
  document.addEventListener('visibilitychange', () => tinko.show(document.visibilityState === 'visible' && inView()));
  const inView = () => { const r = win.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  // "Take a look": the press, a cheer, and on to what he does
  let looking = false;
  async function look() {
    if (looking || tinko.mood === 'asleep') return;
    looking = true;
    btn.classList.add('is-press'); setTimeout(() => btn.classList.remove('is-press'), 160);
    const hop = tinko.cheer(1);
    setTimeout(() => {
      const hero = host.closest('[data-tinko-hero]');
      let next = hero?.nextElementSibling; while (next && !next.id) next = next.nextElementSibling;   // the next section (dividers have no id)
      const y = next ? next.getBoundingClientRect().top + scrollY : (hero ? hero.getBoundingClientRect().bottom + scrollY : innerHeight);
      if (window.lenis?.scrollTo) window.lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: 'smooth' });
    }, reduce ? 0 : 520);
    await hop; looking = false;
  }
  btn.addEventListener('click', look);
  // day / night: the site's own switch (so the choice is remembered), and he blinks at the change
  const themeBtn = host.querySelector('[data-tkh="theme"]');
  const label = () => { const t = isNight() ? 'Switch to day mode' : 'Switch to night mode'; themeBtn.title = t; themeBtn.setAttribute('aria-label', t); };
  label(); new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  themeBtn.addEventListener('click', () => {
    const site = document.querySelector('.dfs-night-toggle');
    if (site) site.click(); else if (window.dfsNight) window.dfsNight.set(!isNight()); else document.documentElement.classList.toggle('dfs-night');
    tinko.bwoop();
  });
  // his keys, while his window is the thing you're looking at: Space = Take a look, ⌫ = a squint
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const t = e.target; if (t.closest && t.closest('input, textarea, select, [contenteditable], button, a')) { if (!(t === btn && e.key === ' ')) return; }
    const r = win.getBoundingClientRect(); if (r.top > innerHeight * .6 || r.bottom < innerHeight * .4) return;
    if (e.key === ' ') { e.preventDefault(); look(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); tinko.squint(); }
  });

  // a gentle tilt towards the pointer (fine pointers only), like the Rhythms window
  if (finePointer && !reduce) {
    const tilt = host.querySelector('.tkh-tilt'), MAXT = 5; let tx = 0, ty = 0, cx = 0, cy = 0, run = 0;
    const step = () => {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      tilt.style.transform = `rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
      tinkoEl.style.translate = `${(cx * 2.2).toFixed(2)}px ${(-cy * 2.2).toFixed(2)}px`;
      run = Math.abs(tx - cx) + Math.abs(ty - cy) > .01 ? requestAnimationFrame(step) : 0;
    };
    addEventListener('pointermove', e => {
      if (introOn) return;   // he lands exactly where he belongs, then the tilt joins in
      const r = tilt.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2))) * MAXT;
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / innerHeight)) * -MAXT;
      if (!run) run = requestAnimationFrame(step);
    }, { passive: true });
  }
}

/* ?tune: a small panel for working on the intro together: replay at full, half or quarter speed, and a clock
   (in real seconds at full speed) so a moment can be named ("at 1.4 s"). Only with ?tune in the address. */
function tunePanel(replay) {
  const el = document.createElement('div'); el.className = 'tkh-tune';
  el.innerHTML = `<b>Intro</b>${Object.keys(ARRIVALS).map(a => `<button data-a="${a}" aria-pressed="${a === ARRIVE}">${a[0].toUpperCase() + a.slice(1)}</button>`).join('')}<i></i><button data-f="1">Replay</button><button data-f="2">Slow ×½</button><button data-f="4">Slower ×¼</button><span class="tkh-tune-clock">0.00 s</span>`;
  document.body.append(el);
  const clock = el.querySelector('.tkh-tune-clock');
  let t0 = 0, f = 1, raf = 0, style = ARRIVE;
  const tick = () => { clock.textContent = ((performance.now() - t0) / 1000 / f).toFixed(2) + ' s' + (f > 1 ? `  (×1/${f})` : ''); raf = requestAnimationFrame(tick); };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a) { style = b.dataset.a; el.querySelectorAll('[data-a]').forEach(o => o.setAttribute('aria-pressed', o === b)); replay(1, style); }
    else replay(+b.dataset.f, style);
  });
  return {
    start(speed) { f = speed; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); clock.textContent = 'done at ' + ((performance.now() - t0) / 1000 / f).toFixed(2) + ' s'; },
  };
}

/* ---------- the title: lines rise out of their masks, then the rest ---------- */

const heroTitle = { play() {} };
function introTitle() {
  const h = document.querySelector('[data-tinko-title]'), rest = [...document.querySelectorAll('[data-tinko-intro]')];
  if (!h) { document.documentElement.classList.add('tinko-ready'); return; }
  // one mask per line (the <br> splits them)
  const lines = []; let cur = [];
  [...h.childNodes].forEach(n => { if (n.nodeName === 'BR') { lines.push(cur); cur = []; } else cur.push(n); });
  lines.push(cur);
  h.textContent = '';
  const inner = lines.filter(l => l.some(n => n.textContent.trim())).map(l => {
    const mask = document.createElement('span'); mask.className = 'tkh-line-mask';
    const line = document.createElement('span'); line.className = 'tkh-line';
    l.forEach(n => line.append(n)); mask.append(line); h.append(mask); return line;
  });
  let played = false, anims = [];
  heroTitle.play = (delay = 0, now = false, f = 1) => {
    if (played) { if (now) anims.forEach(a => a.finish()); return; }
    played = true;
    document.documentElement.classList.add('tinko-ready');
    if (reduce || now) return;
    inner.forEach((l, i) => anims.push(l.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 1100 * f, delay: delay + i * 110 * f, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'backwards' })));
    rest.forEach((el, i) => anims.push(el.animate([{ opacity: 0, transform: 'translateY(.75rem)' }, { opacity: 1, transform: 'none' }], { duration: 900 * f, delay: delay + (i === 0 ? 0 : 380 + i * 90) * f, easing: 'cubic-bezier(.33,1,.68,1)', fill: 'backwards' })));
  };
  heroTitle.reset = () => { anims.forEach(a => a.cancel()); anims = []; played = false; document.documentElement.classList.remove('tinko-ready'); };
}

/* ---------- the feature demos: his window, his real lines, and the part of the Mac they change ---------- */

const MAC = n => new URL(`../dive/media/mac/${n}.avif`, import.meta.url).href;
const WALL_DAY = new URL('../dive/media/mac/wall-day.webp', import.meta.url).href;
const WALL_NIGHT = new URL('../night/HERO_BG_4-night.webp', import.meta.url).href;
const APPLE = '<svg viewBox="0 0 170 170" aria-hidden="true"><path fill="currentColor" d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.93.21-9.84-1.96-14.75-6.52-3.13-2.73-7.05-7.41-11.74-14.04-5.03-7.08-9.17-15.29-12.41-24.65-3.47-10.11-5.21-19.9-5.21-29.38 0-10.86 2.35-20.22 7.04-28.07 3.69-6.3 8.61-11.27 14.77-14.92s12.81-5.51 19.97-5.63c3.92 0 9.06 1.21 15.43 3.6 6.36 2.39 10.44 3.6 12.23 3.6 1.34 0 5.88-1.42 13.57-4.24 7.27-2.62 13.41-3.7 18.44-3.28 13.63 1.1 23.87 6.47 30.68 16.15-12.19 7.39-18.22 17.73-18.1 31 .11 10.34 3.86 18.94 11.23 25.77 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.1-2.96 15.67-8.86 22.67-7.12 8.32-15.73 13.13-25.07 12.37a25.2 25.2 0 0 1-.19-3.07c0-7.78 3.39-16.1 9.4-22.91 3-3.44 6.82-6.31 11.45-8.6 4.62-2.25 8.99-3.5 13.1-3.71.12 1.08.17 2.17.17 3.25z"/></svg>';
const LIGHTS = '<div class="tkd-lights"><i></i><i></i><i></i></div>';
const wordsOf = t => t.split(/\s+/).length;
const say = t => YOU ? 500 : 900 + wordsOf(t) * 75;   // how long a line stays up before the key, like the homepage demo (you-mode: you decide)
const and = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l.join('');

// screen parts (Views.swift Screen: tag, words, content, buttons, ⌘Z under them)
const S = {
  tag: t => `<div class="tkd-tag"><span>${t}</span></div>`,
  words: t => `<p class="tkd-words">${t}</p>`,
  title: t => `<div class="tkd-title">${t}</div>`,
  btn: (label, key, light) => `<span class="tkd-btn${light ? ' is-light' : ''}" data-k="${key}"><span class="tkd-key">${key === 'del' ? DEL : key === 'space' ? 'SPACE' : key.toUpperCase()}</span>${label.toUpperCase()}</span>`,
  btns: (...b) => `<div class="tkd-btns">${b.join('')}</div>`,
  stats: s => `<div class="tkd-stats">${s.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`,
  fixes: (rows, done) => `<div class="tkd-fixes">${rows.map((t, i) => `<div class="${i < done ? 'is-done' : ''}"><i></i><span>${t}</span></div>`).join('')}</div>`,
  note: t => `<div class="tkd-note">${t}</div>`,
  undo: '<div class="tkd-undo">⌘Z  UNDO</div>',
  count: t => `<div class="tkd-count">${t}</div>`,
};

/* The hero window's tilt for the other Macs too (Rim, 20 Oct: "I'd like to have that effect on every Tinko"): each
   leans a few degrees towards the pointer while it's on screen. One pointer listener and one easing loop for all of
   them, which stops once they're still. Holding the slider's handle keeps its Mac where it is while you drag. */
const tilts = new Set();
let tiltRun = 0, ptrX = -1, ptrY = -1;
function tiltStep() {
  let moving = false;
  tilts.forEach(t => {
    if (!t.on || t.hold) return;
    let tx = 0, ty = 0;
    if (ptrX >= 0) {
      const r = t.el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (ptrX - (r.left + r.width / 2)) / (innerWidth / 2))) * t.max;
      ty = Math.max(-1, Math.min(1, (ptrY - (r.top + r.height / 2)) / innerHeight)) * -t.max;
    }
    t.cx += (tx - t.cx) * .08; t.cy += (ty - t.cy) * .08;
    if (Math.abs(tx - t.cx) + Math.abs(ty - t.cy) > .01) moving = true;
    t.el.style.transform = `perspective(${t.p}px) rotateX(${t.cy.toFixed(3)}deg) rotateY(${t.cx.toFixed(3)}deg)`;
  });
  tiltRun = moving ? requestAnimationFrame(tiltStep) : 0;
}
const tiltKick = () => { if (!tiltRun) tiltRun = requestAnimationFrame(tiltStep); };
function tilt(el, { max = 4, p = 1800 } = {}) {
  if (!el || !finePointer || reduce) return;
  if (!tilts.size) {
    addEventListener('pointermove', e => { ptrX = e.clientX; ptrY = e.clientY; tiltKick(); }, { passive: true });
    addEventListener('scroll', tiltKick, { passive: true });
  }
  const t = { el, max, p, cx: 0, cy: 0, on: false, hold: false };
  tilts.add(t);
  new IntersectionObserver(([e]) => { t.on = e.isIntersecting; if (t.on) tiltKick(); }).observe(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('[data-splitter="handle"]')) t.hold = true; });
  addEventListener('pointerup', () => { if (t.hold) { t.hold = false; tiltKick(); } });
  return t;   // (max = 0 and a kick settles it flat)
}

/* A demo, ready to play: its scene, its Tinko, and a clock that only runs while it's on screen and switched on.
   initDemo loops one for the rows; the layouts lab (meet/layouts.js) plays several in turn in one frame, so it can
   switch one off, stop it mid-way (stop(): the running play gives up at its next wait) and start it over. */
export const ABORT = Symbol('stopped');
const KEYS = { space: [' '], del: ['Backspace', 'Delete'], s: ['s', 'S'], 1: ['1'] };
const live = new Set();   // every demo built, to find the one your keys go to (you-mode): the one nearest the middle
let focused = null;
function refocus() {
  let best = null, bd = Infinity;
  live.forEach(d => { if (!d.on) return; const r = d.host.getBoundingClientRect(), m = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (m < bd) { bd = m; best = d; } });
  focused = best;
}
if (YOU) addEventListener('scroll', () => requestAnimationFrame(refocus), { passive: true });

export function buildDemo(host, key = host.dataset.tinkoDemo) {
  const P = DEMOS[key];
  if (!P) return null;
  const D = Object.create(P);   // its own state (its Dock, your calls), so a part can be built more than once
  host.innerHTML = `<div class="tkd" aria-hidden="true"><div class="tkd-scene">
    <div class="tkd-wall"></div>
    <div class="tkd-bar"><span class="tkd-apple">${APPLE}</span><b class="tkd-app">Tinko</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><i></i><span class="tkd-clock">Mon 10:24</span></div>
    <div class="tkd-ctx"></div>
    <div class="tkd-win"><div class="tkd-grain"></div>${LIGHTS}<div class="tkd-dash is-top"></div><div class="tkd-dash is-bottom"></div>
      <div class="tkd-col"><div class="tkd-stage"><div class="tkh-tinko tkd-tinko"></div><div class="tkd-screen"></div></div></div></div>
  </div></div>`;
  host.setAttribute('role', 'img'); host.setAttribute('aria-label', D.label);
  const wrap = host.querySelector('.tkd'), scene = host.querySelector('.tkd-scene'), screen = host.querySelector('.tkd-screen'), ctx = host.querySelector('.tkd-ctx'), win = host.querySelector('.tkd-win');
  const tinko = makeTinko(host.querySelector('.tkd-tinko'));
  let L = 'wide', scale = 1;
  const fit = () => {
    const narrow = host.clientWidth < 500;
    if ((narrow ? 'tall' : 'wide') !== L || !fit.done) { L = narrow ? 'tall' : 'wide'; fit.done = true; scene.classList.toggle('is-tall', narrow); D.layout?.(api, L); }
    const W = L === 'tall' ? 520 : 720, H = L === 'tall' ? 800 : 520;
    scale = host.clientWidth / W; scene.style.width = W + 'px'; scene.style.height = H + 'px'; scene.style.transform = `scale(${scale})`; wrap.style.height = H * scale + 'px';
  };
  // the clock only runs while the demo is on screen (and switched on), so a loop never plays to nobody
  let visible = false, active = true, wakeups = [], gen = 0, clock = 0;
  const on = () => visible && active;
  const wait = ms => { const g = gen; return new Promise((res, rej) => {
    let left = reduce ? Math.min(ms, 400) : ms, last = performance.now();
    const tick = () => { if (g !== gen) return rej(ABORT); const now = performance.now(); if (on()) { left -= now - last; clock += now - last; } last = now; if (left <= 0) res(); else setTimeout(tick, Math.min(120, left)); };
    setTimeout(tick, Math.min(120, left));
  }); };
  const until = () => { const g = gen; return (on() ? Promise.resolve() : new Promise(r => wakeups.push(r))).then(() => { if (g !== gen) throw ABORT; }); };
  // you-mode: his buttons glow and wait for your key (or a click); in the Dock, notifications and newsletters your
  // call is the one that counts
  const ask = keys => { const g = gen; return new Promise((res, rej) => {
    const btns = keys.map(k => screen.querySelector(`[data-k="${k}"]`)).filter(Boolean);
    const hint = document.createElement('div'); hint.className = 'tkd-your';
    hint.textContent = 'Your turn · ' + ['space', '1', 'del', 's'].filter(k => keys.includes(k)).map(k => k === 'del' ? '⌫' : k === 'space' ? 'Space' : k.toUpperCase()).join(' or ');
    btns.forEach(b => b.classList.add('is-ask')); screen.append(hint);
    const end = () => { clearInterval(poll); removeEventListener('keydown', onKey, true); screen.removeEventListener('click', onClick); btns.forEach(b => b.classList.remove('is-ask')); hint.remove(); };
    const onKey = e => {
      if (focused !== me || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.find(k => KEYS[k].includes(e.key));
      if (k || e.key === ' ') e.preventDefault();
      if (k && !e.repeat) { end(); res(k); }
    };
    const onClick = e => { const b = e.target.closest('[data-k]'); if (b && keys.includes(b.dataset.k)) { end(); res(b.dataset.k); } };
    const poll = setInterval(() => { if (g !== gen) { end(); rej(ABORT); } }, 150);
    addEventListener('keydown', onKey, true); screen.addEventListener('click', onClick);
  }); };
  const api = {
    ctx, scene, tinko, wait, S,
    get layout() { return L; },
    show(html) { screen.classList.add('is-swap'); screen.innerHTML = html; requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('is-swap'))); },
    // the key goes down on its button, and the screen moves on; `or` = the other key you may press in you-mode
    async press(key, or) {
      const k = YOU ? await ask([key, ...[or ?? []].flat()]) : key;
      const b = screen.querySelector(`[data-k="${k}"]`);
      if (b) { b.classList.add('is-press'); await wait(170); b.classList.remove('is-press'); }
      await wait(120);
      return k;
    },
    app(name) { host.querySelector('.tkd-app').textContent = name; },
    winAt(x, y) { win.style.left = x + 'px'; win.style.top = y + 'px'; },
  };
  D.build(api);
  new ResizeObserver(fit).observe(host); fit();
  tilt(wrap);
  const me = {
    host, D, api, tinko, wait, until,
    get on() { return on(); },
    get clock() { return clock; }, set clock(v) { clock = v; },
    set active(a) { active = a; tinko.show(on()); if (on()) wakeups.splice(0).forEach(r => r()); refocus(); },
    play: () => until().then(() => D.play(api)),   // rejects with ABORT once stopped
    stop() { gen++; },
    reset: () => D.reset?.(api),
  };
  live.add(me);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; tinko.show(on()); if (on()) wakeups.splice(0).forEach(r => r()); refocus(); }, { threshold: .15 }).observe(host);
  return me;
}

export function initDemo(host) {
  const d = buildDemo(host);
  if (!d) return;
  d.tinko.sleep(); d.tinko.wakeUp();
  (async () => { await d.until(); await d.wait(600); for (;;) { await d.D.play(d.api); await d.wait(d.D.hold || 3200); await d.reset(); await d.wait(500); } })();
}

/* the Dock and its icons, for the demos that need one */
function dock(ctx, apps, { trash = true } = {}) {
  const el = document.createElement('div'); el.className = 'tkd-dock';
  el.innerHTML = apps.map(([id, run]) => `<div class="tkd-dapp${run ? ' is-run' : ''}" data-app="${id}"><img src="${MAC(id)}" alt=""><i></i></div>`).join('') + (trash ? `<b class="tkd-dsep"></b><div class="tkd-dapp tkd-trash"><img class="is-empty" src="${MAC('trash-empty')}" alt=""><img class="is-full" src="${MAC('trash-full')}" alt=""></div>` : '');
  ctx.append(el);
  return {
    el,
    icon: id => el.querySelector(`[data-app="${id}"]`),
    dim(id, on = true) { el.querySelector(`[data-app="${id}"]`)?.classList.toggle('is-going', on); },
    leave(ids) { ids.forEach(id => el.querySelector(`[data-app="${id}"]`)?.classList.add('is-out')); },
    add(id) { const d = document.createElement('div'); d.className = 'tkd-dapp is-out is-new'; d.dataset.app = id; d.innerHTML = `<img src="${MAC(id)}" alt=""><i></i>`; const sep = el.querySelector('.tkd-dsep'); sep ? sep.before(d) : el.append(d); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.remove('is-out'))); },
    full(on) { el.classList.toggle('is-full', on); },
    reset() { el.querySelectorAll('.tkd-dapp').forEach(d => { d.classList.remove('is-going', 'is-out'); if (d.classList.contains('is-new')) d.remove(); }); el.classList.remove('is-full'); },
  };
}
// a file flies from where it is to a point on the scene, shrinking (the desk's fly())
function fly(api, el, to, { sc = .2, dur = 750, arc = 40 } = {}) {
  const r = el.getBoundingClientRect(), m = api.scene.getBoundingClientRect(), k = m.width / api.scene.offsetWidth;
  const from = { x: (r.left + r.width / 2 - m.left) / k, y: (r.top + r.height / 2 - m.top) / k };
  const dx = to.x - from.x, dy = to.y - from.y;
  const a = el.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy * .5 - arc}px) scale(${(1 + sc) / 2})`, opacity: 1, offset: .55 }, { transform: `translate(${dx}px,${dy}px) scale(${sc})`, opacity: 0 }], { duration: reduce ? 1 : dur, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' });
  return a.finished.then(() => el.classList.add('is-gone'));
}
const centreOf = (api, el) => { const r = el.getBoundingClientRect(), m = api.scene.getBoundingClientRect(), k = m.width / api.scene.offsetWidth; return { x: (r.left + r.width / 2 - m.left) / k, y: (r.top + r.height / 2 - m.top) / k }; };
const macWin = (cls, title, body) => `<div class="tkd-mw ${cls}"><div class="tkd-mw-bar">${LIGHTS}<b>${title}</b></div><div class="tkd-mw-body">${body}</div></div>`;

const DEMOS = {
  /* 1. What's pinned (PinPass.swift, DockViews.swift): each app with when you last opened it, Space keeps, ⌫ unpins;
        the unpinned ones leave together at the end (one Dock restart) */
  dock: {
    label: 'Tinko going through a full Dock, app by app: the apps you never open are unpinned and the Dock shrinks.',
    build(api) {
      api.app('Tinko');
      const apps = [['finder', 1], ['safari'], ['messages'], ['mail'], ['maps'], ['photos'], ['facetime'], ['calendar'], ['contacts'], ['reminders'], ['notes'], ['tv'], ['music'], ['news'], ['appstore'], ['settings'], ['arc', 1], ['figma', 1], ['claude', 1], ['slack'], ['chrome'], ['spotify', 1], ['zoom'], ['tinko', 1]];
      this.dock = dock(api.ctx, apps);
    },
    layout(api, L) { api.winAt(L === 'tall' ? 33 : 133, L === 'tall' ? 70 : 40); },
    pass: [
      ['safari', 'Safari', 'Last opened 2 months ago.', 'del'], ['messages', 'Messages', 'Last opened yesterday.', 'space'], ['maps', 'Maps', 'Last opened 8 months ago.', 'del'],
      ['photos', 'Photos', 'Last opened 4 months ago.', 'del'], ['facetime', 'FaceTime', 'Last opened a year ago.', 'del'], ['calendar', 'Calendar', 'Last opened 5 days ago.', 'space'],
      ['contacts', 'Contacts', 'Last opened 7 months ago.', 'del'], ['reminders', 'Reminders', 'Last opened 9 months ago.', 'del'], ['notes', 'Notes', 'Last opened 2 weeks ago.', 'space'],
      ['tv', 'TV', 'Last opened 11 months ago.', 'del'], ['music', 'Music', 'Last opened 3 months ago.', 'del'], ['news', 'News', 'Last opened a year ago.', 'del'],
      ['appstore', 'App Store', 'Last opened 2 weeks ago.', 'del'], ['settings', 'System Settings', 'Last opened 4 days ago.', 'del'], ['arc', 'Arc', 'Open right now. Unpin it and it leaves the Dock once you quit it.', 'space'],
      ['figma', 'Figma', 'Last opened today.', 'space'], ['claude', 'Claude', 'Open right now. Unpin it and it leaves the Dock once you quit it.', 'space'], ['slack', 'Slack', 'Last opened 2 months ago.', 'del'],
      ['chrome', 'Google Chrome', 'Last opened 5 months ago.', 'del'], ['spotify', 'Spotify', 'Open right now. Unpin it and it leaves the Dock once you quit it.', 'space'], ['zoom', 'zoom.us', 'Last opened 6 weeks ago.', 'del'],
    ],
    async play(api) {
      const { S } = api, d = this.dock, row = i => `<div class="tkd-pins"><div class="tkd-pins-in" style="transform:translateX(${150 - i * 30}px)">${this.pass.map((a, j) => `<i class="${j === i ? 'is-now' : j < i ? (this.fate[j] === 'del' ? 'is-gone' : 'is-kept') : ''}"><img src="${MAC(a[0])}" alt=""></i>`).join('')}</div></div>`;
      this.fate = [];
      let t = 'Now what stays in your Dock for good. Keep your daily drivers, unpin the rest. They’re still one ⌘Space away.';
      api.show(S.tag('What’s pinned') + S.words(t) + S.btns(S.btn('Start', 'space')));
      await api.wait(say(t)); await api.press('space');
      for (let i = 0; i < this.pass.length; i++) {
        const [id, name, when, key] = this.pass[i], slow = i < 3;
        api.show(S.tag('What’s pinned') + S.words(`${name}. ${when} Daily driver?`) + row(i) + S.btns(S.btn('Keep', 'space'), S.btn('Unpin', 'del', true)));
        await api.wait(YOU ? 0 : slow ? 1500 : 300); const k = await api.press(key, key === 'del' ? 'space' : 'del');
        this.fate[i] = k; if (k === 'del') d.dim(id);
      }
      const out = this.pass.filter((a, i) => this.fate[i] === 'del'), kept = ['Finder', ...this.pass.filter((a, i) => this.fate[i] !== 'del').map(a => a[1])];
      d.leave(out.map(a => a[0]));
      t = `${out.length ? out.length + ' unpinned' : 'Nothing unpinned'}. Your Dock keeps ${and(kept)}. That’s the lot.`;
      api.show(S.tag('What’s pinned') + S.words(t) + S.btns(S.btn('Next', 'space')) + S.undo);
      await api.wait(say(t) + 600);
      t = 'Dock done. Lighter already. I’ll stay in it myself until the course is through. Now the desktop.';
      api.show(S.tag('Your Dock') + S.words(t) + S.btns(S.btn('On to the desktop', 'space')));
      api.tinko.cheer(1);
    },
    hold: 3400,
    async reset(api) { this.dock.reset(); },
  },

  /* 2. The desktop (DeskViews.swift + the homepage scene): quick fixes, the screenshots into their folder,
        the installer to the Bin, what's left one by one */
  desk: {
    label: 'Tinko clearing a messy desktop: screenshots fly into their own folder, the installer goes to the Bin, the rest into Documents.',
    files: [
      ['s1', 'shot', 'shot-1', 'Screenshot 2026-10-12 at 09.41.22', [622, 36]], ['old', 'folder', 'file-folder', 'Old stuff', [500, 58]], ['s2', 'shot', 'shot-2', 'Screenshot 2026-10-13 at 16.07.51', [530, 160]],
      ['dmg', 'dmg', 'file-dmg', 'zoomusInstallerFull.dmg', [628, 172]], ['s3', 'shot', 'shot-3', 'Screenshot 2026-10-14 at 11.22.09', [496, 270]], ['zip', 'zip', 'file-zip', 'photos-export.zip', [620, 290]],
      ['txt', 'txt', 'file-txt', 'Notes for Monday.txt', [520, 372]], ['s4', 'shot', 'shot-4', 'Screenshot 2026-10-15 at 22.51.40', [628, 384]],
    ],
    build(api) {
      api.app('Tinko');
      api.ctx.insertAdjacentHTML('beforeend', `<div class="tkd-desk">${this.files.map(([id, kind, img, name]) => `<div class="tkd-file is-${kind}" data-id="${id}">${kind === 'shot' ? `<img class="tkd-thumb" src="${MAC(img)}" alt="">` : `<img class="tkd-ficon" src="${MAC(img)}" alt="">`}<span>${name.length > 22 ? name.slice(0, 11) + '…' + name.slice(-8) : name}</span></div>`).join('')}<div class="tkd-file is-folder is-new" data-id="shots"><img class="tkd-ficon" src="${MAC('file-folder')}" alt=""><span>Screenshots</span></div></div>`);
      this.dock = dock(api.ctx, [['finder', 1], ['mail'], ['arc', 1], ['figma'], ['tinko', 1]]);
    },
    layout(api, L) {
      api.winAt(L === 'tall' ? 33 : 18, L === 'tall' ? 50 : 50);
      const tall = L === 'tall', spots = tall ? [[50, 520], [150, 520], [250, 520], [350, 520], [50, 610], [150, 610], [250, 610], [350, 610]] : this.files.map(f => f[4]);
      this.files.forEach(([id], i) => Object.assign(api.ctx.querySelector(`[data-id="${id}"]`).style, { left: spots[i][0] + 'px', top: spots[i][1] + 'px' }));
      Object.assign(api.ctx.querySelector('[data-id="shots"]').style, tall ? { left: '434px', top: '565px' } : { left: '540px', top: '446px' });
    },
    async play(api) {
      const { S } = api, f = id => api.ctx.querySelector(`.tkd-file[data-id="${id}"]`);
      let t = 'Now we’re looking at the desktop. A proper pile, but nothing I can’t handle.';
      api.show(S.tag('Your desktop') + S.words(t) + S.stats([[7, 'files'], [1, 'folder'], [4, 'screenshots']]) + S.btns(S.btn('Clean up', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      const fixes = ['A Screenshots folder in Documents', 'New screenshots go there', 'No floating thumbnail', 'The desk sorts itself, by date added'];
      for (let i = 0; i <= 4; i++) { api.show(S.tag('Quick fixes') + S.words('A home for your screenshots, and a desk that keeps itself in order.') + S.fixes(fixes, i) + S.btns(S.btn('Next', 'space'))); await api.wait(i === 0 ? 900 : 380); }
      f('shots').classList.add('is-in');
      await api.wait(700); await api.press('space');
      const folder = centreOf(api, f('shots'));
      for (const id of ['s1', 's2', 's3', 's4']) { fly(api, f(id), folder, { sc: .3, dur: 700 }); await api.wait(170); }
      await api.wait(700);
      t = '4 screenshots moved into Screenshots. From now on they land there by themselves.';
      api.show(S.tag('Screenshots') + S.words(t) + S.btns(S.btn('Next', 'space')) + S.undo);
      await api.wait(say(t)); await api.press('space');
      t = 'An installer that did its job. Move it to the Bin?';
      api.show(S.tag('Leftovers') + S.words(t) + S.note('zoomusInstallerFull.dmg') + S.btns(S.btn('Leave it', 'space'), S.btn('Move to Bin', 'del', true)));
      await api.wait(say(t)); await api.press('del');
      await fly(api, f('dmg'), centreOf(api, this.dock.el.querySelector('.tkd-trash')), { sc: .25, arc: 80 }); this.dock.full(true);
      for (const [id, name, key] of [['zip', 'photos-export.zip', 'del'], ['txt', 'Notes for Monday.txt', 'space'], ['old', 'Old stuff', 'space']]) {
        const kind = this.files.find(x => x[0] === id);
        api.show(S.tag('What’s left') + S.words('Into Documents, to sort later? Or the Bin?') + `<div class="tkd-filecard"><img src="${MAC(kind[2])}" alt=""><div><b>${name}</b><span>Here since today</span></div></div>` + S.btns(S.btn('Sort later', 'space'), S.btn('Bin', 'del', true)));
        await api.wait(YOU ? 0 : 1400); await api.press(key);
        await fly(api, f(id), key === 'del' ? centreOf(api, this.dock.el.querySelector('.tkd-trash')) : centreOf(api, this.dock.icon('finder')), { sc: .25, arc: 70, dur: 650 });
      }
      await fly(api, f('shots'), centreOf(api, this.dock.icon('finder')), { sc: .25, arc: 70, dur: 650 });
      t = 'An empty desk. New screenshots go to their own folder now, so it stays that way.';
      api.show(S.tag('Your desktop') + S.words(t) + S.btns(S.btn('On to Documents', 'space')));
      api.tinko.cheer(1);
    },
    hold: 3600,
    async reset(api) {
      api.ctx.querySelectorAll('.tkd-file').forEach(el => { el.getAnimations().forEach(a => a.cancel()); el.classList.remove('is-gone', 'is-in'); });
      this.dock.full(false);
    },
  },

  /* 3. Downloads (DownloadsViews.swift): Finder tucked behind Tinko with only its list showing (Desk.listPeek),
        emptied in steps from sure to less sure */
  files: {
    label: 'Tinko emptying the Downloads folder in steps: the downloads that never finished and old installers, then the zips, then the rest.',
    rows: [
      ['dmg', 'Spotify.dmg', '182 MB', 'junk'], ['part', 'Final-cut.mov.crdownload', '1.4 GB', 'junk'], ['zip', 'fonts-2026.zip', '24 MB', 'zips'], ['png', 'IMG_2041.png', '3.1 MB', 'rest'],
      ['zip', 'Archive.zip', '611 KB', 'zips'], ['txt', 'invoice-notes.txt', '2 KB', 'named'], ['png', 'IMG_2047.png', '2.8 MB', 'rest'], ['dmg', 'Figma-old.dmg', '96 MB', 'junk'], ['zip', 'photos-export.zip', '38 MB', 'zips'],
    ],
    build(api) {
      api.app('Tinko');
      api.ctx.insertAdjacentHTML('beforeend', macWin('is-finder', 'Downloads', `<div class="tkd-fside"></div><div class="tkd-list"><div class="tkd-lhead"><span>Name</span><span>Size</span></div>${this.rows.map(([k, n, s, part], i) => `<div class="tkd-lrow" data-i="${i}" data-part="${part}"><span><img src="${MAC(k === 'part' ? 'file-txt' : 'file-' + k)}" alt="">${n}</span><span>${s}</span></div>`).join('')}</div>`));
    },
    layout(api, L) {
      api.winAt(L === 'tall' ? 33 : 16, L === 'tall' ? 50 : 50);
      Object.assign(api.ctx.querySelector('.is-finder').style, L === 'tall' ? { left: '33px', top: '470px', width: '454px', height: '290px' } : { left: '330px', top: '50px', width: '374px', height: '420px' });
    },
    async play(api) {
      const { S } = api, gone = part => api.ctx.querySelectorAll(`.tkd-lrow[data-part="${part}"]`);
      const clear = async part => { for (const r of gone(part)) { r.classList.add('is-gone'); await api.wait(220); } };
      let t = 'Now Downloads: a waiting room. Things land here, you use them, they stay behind.';
      api.show(S.tag('Downloads') + S.words(t) + S.stats([[9, 'things'], ['1.7 GB', 'together'], [9, 'older than a week']]) + S.btns(S.btn('Let’s look', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      const steps = [
        ['junk', '1 unfinished download and 2 installers: 1.7 GB. They did their job. To the Bin?'],
        ['zips', '3 zips in your Downloads: 63 MB. Usually opened once and done with. To the Bin too?'],
        ['rest', '2 images (5.9 MB) with names a camera or website gave them. Only in your Downloads: to the Bin? The ones with real names come next, one by one.'],
      ];
      for (const [part, line] of steps) {
        api.show(S.tag('Downloads') + S.words(line) + S.btns(S.btn('Keep them', 'space'), S.btn('Move to Bin', 'del', true)));
        gone(part).forEach(r => r.classList.add('is-seen'));
        await api.wait(say(line)); await api.press('del'); await clear(part);
        await api.wait(300);
      }
      t = 'This one has a real name, so maybe worth keeping. Into Documents to sort later, or the Bin?';
      api.show(S.tag('Downloads') + S.words(t) + `<div class="tkd-filecard"><img src="${MAC('file-txt')}" alt=""><div><b>invoice-notes.txt</b><span>2 KB</span></div></div>` + S.btns(S.btn('Sort later', 'space'), S.btn('Bin', 'del', true)));
      gone('named').forEach(r => r.classList.add('is-seen'));
      await api.wait(say(t)); await api.press('space'); await clear('named');
      t = '1.7 GB in the Bin. Downloads is a waiting room again.';
      api.show(S.tag('Downloads') + S.words(t) + S.btns(S.btn('Next', 'space')) + S.undo);
      api.tinko.cheer(1);
    },
    hold: 3400,
    async reset(api) { api.ctx.querySelectorAll('.tkd-lrow').forEach(r => r.classList.remove('is-gone', 'is-seen')); },
  },

  /* 4. Applications (AppsViews.swift + the side panel, AppLeftovers): big and unused, ⌫ shows what goes with it */
  apps: {
    label: 'Tinko removing a big app you have not opened in months, together with the files it left in your Library.',
    build(api) {
      api.app('Tinko');
      const rows = [['Application Support/Google/Chrome', '486 MB'], ['Caches/Google/Chrome', '212 MB'], ['Saved Application State', '1.2 MB'], ['Preferences/com.google.Chrome.plist', '24 KB'], ['LaunchAgents/com.google.keystone.agent.plist', '4 KB']];
      api.ctx.insertAdjacentHTML('beforeend', `<div class="tkd-panel"><div class="tkd-ph">TO THE BIN</div><div class="tkd-prow is-app"><span><img src="${MAC('chrome')}" alt="">Google Chrome</span><b>1.2 GB</b></div><div class="tkd-ph">WHAT IT LEFT BEHIND · GOES TOO</div>${rows.map(([p, s]) => `<div class="tkd-prow"><span>~/Library/${p}</span><b>${s}</b></div>`).join('')}<div class="tkd-ptotal"><span>TOTAL</span><b>1.9 GB</b></div></div>`);
      this.dock = dock(api.ctx, [['finder', 1], ['mail'], ['arc', 1], ['chrome'], ['figma'], ['tinko', 1]]);
    },
    layout(api, L) { api.winAt(L === 'tall' ? 33 : 100, L === 'tall' ? 40 : 44); api.ctx.querySelector('.tkd-panel').classList.toggle('is-tall', L === 'tall'); },
    async play(api) {
      const { S } = api, panel = api.ctx.querySelector('.tkd-panel');
      let t = '68 apps. These 2 are big and haven’t been opened in three months: 2.1 GB together. One by one, like the Dock.';
      api.show(S.tag('Applications') + S.words(t) + S.btns(S.btn('One by one', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      t = 'Google Chrome: 1.2 GB, last opened 5 months ago. Still using it?';
      api.show(S.tag('Applications') + S.words(t) + S.btns(S.btn('Keep', 'space'), S.btn('Remove', 'del', true)) + S.count('1 OF 2'));
      await api.wait(say(t)); await api.press('del');
      panel.classList.add('is-open'); if (api.layout === 'wide') api.winAt(16, 44);
      await api.wait(900);
      [...panel.querySelectorAll('.tkd-prow, .tkd-ptotal')].forEach((r, i) => setTimeout(() => r.classList.add('is-in'), i * 110));
      t = 'Google Chrome and what it left behind: 1.9 GB. All of it to the Bin?';
      api.show(S.tag('Applications') + S.words(t) + S.btns(S.btn('Remove all', 'space'), S.btn('Keep it', 's', true)));
      await api.wait(say(t) + 600); await api.press('space');
      panel.classList.add('is-going'); await api.wait(500);
      this.dock.leave(['chrome']); this.dock.full(true);
      panel.classList.remove('is-open'); if (api.layout === 'wide') api.winAt(100, 44);
      t = 'Zoom: 410 MB, last opened 6 weeks ago. Still using it?';
      api.show(S.note('GOOGLE CHROME REMOVED (1.9 GB) · ⌘Z PUTS IT BACK') + S.tag('Applications') + S.words(t) + S.btns(S.btn('Keep', 'space'), S.btn('Remove', 'del', true)) + S.count('2 OF 2'));
      await api.wait(say(t)); await api.press('space');
      t = '1 app gone, 1.9 GB back. For the rest of your storage: System Settings › General › Storage.';
      api.show(S.tag('Applications') + S.words(t) + S.btns(S.btn('Next', 'space')) + S.undo);
      api.tinko.cheer(1);
    },
    hold: 3400,
    async reset(api) { const p = api.ctx.querySelector('.tkd-panel'); p.classList.remove('is-open', 'is-going'); p.querySelectorAll('.is-in').forEach(r => r.classList.remove('is-in')); this.dock.reset(); },
  },

  /* 5. Notifications (Notifications.swift, WrapUpViews.swift): each app's page in System Settings beside him, ⌫ flips it */
  settings: {
    label: 'Tinko opening each app’s notification page in System Settings and switching off the ones that can wait. Calendar stays on.',
    apps: [['calendar', 'Calendar', 'The one I’d keep: a meeting can’t wait. Worth a look at recurring events you don’t need.', 'space'], ['messages', 'Messages', 'People, not an app. Do they need to reach you right away, or can it wait until you look?', 'space'], ['news', 'News', 'Can it wait until you open it? Then it doesn’t get to interrupt you.', 'del'], ['slack', 'Slack', 'Can it wait until you open it? Then it doesn’t get to interrupt you.', 'del'], ['photos', 'Photos', 'Can it wait until you open it? Then it doesn’t get to interrupt you.', 'del'], ['appstore', 'App Store', 'Can it wait until you open it? Then it doesn’t get to interrupt you.', 'del']],
    build(api) {
      api.app('Tinko');
      api.ctx.insertAdjacentHTML('beforeend', macWin('is-settings', 'Notifications', `<div class="tkd-set"><div class="tkd-set-head"><img alt=""><b></b></div><div class="tkd-set-row"><span>Allow notifications</span><i class="tkd-switch is-on"></i></div><div class="tkd-set-row is-soft"><span>Show previews</span><em>When unlocked</em></div><div class="tkd-set-row is-soft"><span>Badge application icon</span><i class="tkd-switch is-on is-small"></i></div><div class="tkd-set-row is-soft"><span>Play sound for notifications</span><i class="tkd-switch is-on is-small"></i></div></div>`));
    },
    layout(api, L) {
      api.winAt(L === 'tall' ? 33 : 16, L === 'tall' ? 50 : 50);
      Object.assign(api.ctx.querySelector('.is-settings').style, L === 'tall' ? { left: '33px', top: '480px', width: '454px', height: '270px' } : { left: '440px', top: '84px', width: '266px', height: '360px' });
    },
    async play(api) {
      const { S } = api, set = api.ctx.querySelector('.is-settings'), head = set.querySelector('.tkd-set-head'), sw = set.querySelector('.tkd-switch');
      let t = 'Last part of the cleanup: notifications. If it’s not time-sensitive or a person who needs you, it doesn’t get to interrupt you. 6 apps may right now.';
      api.show(S.tag('Notifications') + S.words(t) + S.btns(S.btn('One by one', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      const off = [];
      for (const [id, name, line, key] of this.apps) {
        head.querySelector('img').src = MAC(id); head.querySelector('b').textContent = name; set.querySelector('.tkd-mw-bar b').textContent = name;
        sw.classList.add('is-on'); set.classList.add('is-flip'); requestAnimationFrame(() => requestAnimationFrame(() => set.classList.remove('is-flip')));
        api.show(S.tag('Notifications') + S.title(name) + S.words(line) + S.btns(S.btn('Keep', 'space'), S.btn('Turn off', 'del', true)));
        await api.wait(say(line) * .75); const k = await api.press(key, key === 'del' ? 'space' : 'del');
        if (k === 'del') { off.push(name); sw.classList.remove('is-on'); await api.wait(650); }
      }
      const still = this.apps.filter(a => !off.includes(a[1])).map(a => a[0] === 'messages' ? 'the people in Messages' : a[1]);
      t = off.length ? `${off.length} ${off.length === 1 ? 'app' : 'apps'} can’t interrupt you any more.${still.length ? ` ${and(still).replace(/^the/, 'The')} still can.` : ''}` : 'All 6 can still reach you.';
      api.show(S.tag('Notifications') + S.words(t) + S.btns(S.btn('Next', 'space')));
      api.tinko.cheer(1);
    },
    hold: 3400,
    async reset() {},
  },

  /* 6. The inbox (MailViews.swift, MailNewsletters.swift), in the app's order: one read of every inbox (seconds),
        the overview, mail older than two years to the Bin (flagged stays), the newsletters one by one (⌫ unsubscribes)
        and their old mails, then the unread from before the last three weeks marked read. The unread count falls at
        every step (Tinko, 24 Oct: "Show the 8,214 dropping. That's the pain people feel every morning"). */
  inbox: {
    label: 'Tinko reading a whole inbox in seconds, moving mail older than two years to the Bin, unsubscribing newsletters with one key and marking old unread mail as read, while the unread count falls from 8,214 to 37.',
    total: 28600, unread: 8214, old: [16930, '4.2 GB', 2706], left: 37,
    // the senders from Tinko's own newsletter round (Rim's screen, 14 Oct, as on the upsell): name, subject, preview,
    // mails in three months, the key, an older subject. Personal mail sits between them and stays.
    senders: [
      ['Daily Crypto Picks', '3 coins to watch this week', 'Not financial advice. Markets opened higher this morning and', 31, 'del', 'Breaking: one coin up 40% overnight'],
      ['Shop Restock Alerts', 'It’s back: the item on your wishlist', 'Hurry, only a few left in your size. Free returns until', 27, 'del', 'Price drop on 2 items you viewed'],
      ['Flash Sale Friday', '48 hours only: up to 60% off', 'Your favourites are back. Ends Sunday at midnight, so', 24, 'del', 'Last call: the sale ends tonight'],
      ['The Productivity Letter', 'Issue 212: the three-minute reset', 'This week: why your to-do list keeps growing, and what to', 12, 'space', 'Issue 211: inbox zero is a myth'],
      ['Webinar Invites', 'Save your seat: Thursday, 4 pm', 'Join 2,000 others for a free live session on', 18, 'del', 'Starting in 1 hour: your free session'],
      ['Your Running Club', 'Sunday long run, 8:00 at the bridge', 'Route attached. Coffee after, as always. Bring a', 4, 'space', 'Results from Sunday, and a new route'],
    ],
    people: [['Lisa', 'Photos from Saturday', 'Finally sorted them, here’s the link. The one with the dog'], ['Calendar', 'Tomorrow: dentist at 9:30', 'Reminder: Dr. Smit, Kerkstraat 12. Bring your card.']],
    build(api) {
      api.app('Tinko');
      const AV = ['#e2725b', '#5b8de2', '#e0ad45', '#8bbf86', '#a57fd4', '#59b3ab', '#d48aa6', '#7e8a99'];
      const ini = n => n.split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('') || n[0];
      const row = (key, name, sub, pre, time, c) => `<div class="tkd-mrow" data-s="${key}"><i class="tkd-mdot"></i><span class="tkd-mav" style="background:${c}">${ini(name)}</span><div class="tkd-mtxt"><div class="tkd-mtop"><b>${name}</b><time>${time}</time></div><div class="tkd-msub">${sub}</div><div class="tkd-mpre">${pre}</div></div></div>`;
      const T = ['09:41', '09:12', '08:30', '07:55', '07:02', 'Yesterday', 'Yesterday', 'Yesterday', 'Mon', 'Mon', 'Mon', 'Sun', 'Sun', 'Sat'];
      const rows = []; let t = 0;
      this.senders.forEach(([name, sub, pre], i) => { rows.push(row(i, name, sub, pre, T[t++] || 'Fri', AV[i])); if (i === 1) rows.push(row('p', ...this.people[0], T[t++], AV[6])); if (i === 3) rows.push(row('p', ...this.people[1], T[t++], AV[7])); });
      this.senders.forEach(([name, , pre, , , older], i) => rows.push(row(i, name, older, pre, T[t++] || 'Fri', AV[i])));
      const box = (name, icon, on, n) => `<div class="tkd-mbox${on ? ' is-on' : ''}"><svg viewBox="0 0 12 12" aria-hidden="true">${icon}</svg>${name}${n ? `<b>${n}</b>` : ''}</div>`;
      const I = { inbox: '<path d="M1.5 7.5h2.6l.9 1.4h2l.9-1.4h2.6"/><path d="M2.6 2.5h6.8l1.1 5v2.5h-9V7.5z"/>', flag: '<path d="M3 10.5V1.8M3 2.2h6l-1.4 2.3L9 6.8H3"/>', draft: '<path d="M2 10h8M3.2 7.8l5.2-5.2 1.1 1.1-5.2 5.2H3.2z"/>', sent: '<path d="M1.6 5.6l8.8-3.8-3.8 8.8-1.2-3.8z"/>', junk: '<path d="M2 2.5h8v7H2zM2 2.5l4 3.5 4-3.5"/>', bin: '<path d="M2.5 3.2h7M4.6 3.2V2h2.8v1.2M3.4 3.2l.5 7h4.2l.5-7"/>' };
      api.ctx.insertAdjacentHTML('beforeend', macWin('is-mail', 'Inbox', `<div class="tkd-mside"><span class="tkd-mside-h">Favourites</span>${box('Inbox', I.inbox, true, '8,214')}${box('Flagged', I.flag)}${box('Drafts', I.draft)}${box('Sent', I.sent)}${box('Junk', I.junk)}${box('Bin', I.bin, false, ' ')}</div><div class="tkd-mlist"><div class="tkd-mlist-h"><b>Inbox</b><span><em>8,214</em> unread</span><i class="tkd-mtoast"></i></div><div class="tkd-mails">${rows.join('')}</div><i class="tkd-mthumb"></i></div>`));
    },
    layout(api, L) {
      // his window a little smaller here, low on the right, so the inbox has room to be read
      const win = api.ctx.closest('.tkd-scene')?.querySelector('.tkd-win');
      if (win) win.style.transform = L === 'tall' ? '' : 'scale(.64)';
      api.winAt(L === 'tall' ? 33 : 318, L === 'tall' ? 40 : 150);
      Object.assign(api.ctx.querySelector('.is-mail').style, L === 'tall' ? { left: '16px', top: '458px', width: '488px', height: '326px' } : { left: '14px', top: '34px', width: '452px', height: '472px' });
    },
    async play(api) {
      const { S } = api, badge = api.ctx.querySelector('.tkd-mbox.is-on b'), head = api.ctx.querySelector('.tkd-mlist-h em'), toast = api.ctx.querySelector('.tkd-mtoast');
      const bin = [...api.ctx.querySelectorAll('.tkd-mbox')].pop().querySelector('b'), thumb = api.ctx.querySelector('.tkd-mthumb'), fmt = v => v.toLocaleString('en');
      let n = this.unread, all = this.total;
      const show = v => { badge.textContent = fmt(v); head.textContent = fmt(v); };
      // the unread count rolls down, blue while it falls
      const count = to => { const from = n; n = to; const t0 = performance.now(); head.parentElement.classList.add('is-tick'); const step = now => { const k = Math.min(1, (now - t0) / 1100); show(Math.round(from + (to - from) * out(k))); if (k < 1) requestAnimationFrame(step); else head.parentElement.classList.remove('is-tick'); }; requestAnimationFrame(step); };
      const mails = v => { all = v; thumb.style.height = Math.min(60, Math.max(3, 9e4 / Math.max(1, v))) + '%'; };
      mails(all);
      // one read of every inbox: nothing changes yet
      let t = 'First I read your whole inbox, every mail. Nothing changes yet.';
      api.show(S.tag('Your inbox') + S.words(t) + '<div class="tkd-progress"><i style="transition:none"></i></div>' + S.count('0 MAILS READ'));
      const bar = api.scene.querySelector('.tkd-screen .tkd-progress i'), read = api.scene.querySelector('.tkd-screen .tkd-count');
      await api.wait(700);
      await new Promise(done => { const t0 = performance.now(), D = reduce ? 1 : 2000; const step = now => { const k = Math.min(1, (now - t0) / D); bar.style.width = k * 100 + '%'; read.textContent = `${fmt(Math.round(this.total * k))} MAILS READ · ${Math.round(9 * k)} S`; if (k < 1) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); });
      await api.wait(500);
      t = `${fmt(this.total)} mails, ${fmt(this.unread)} of them unread. The oldest is from 2011. Let’s make it light again.`;
      api.show(S.tag('Your inbox') + S.words(t) + S.stats([[fmt(this.total), 'mails'], [fmt(this.unread), 'unread'], [2011, 'the oldest']]) + S.btns(S.btn('Let’s go', 'space')));
      await api.wait(say(t)); await api.press('space');
      // mail older than two years, to the Bin; flagged mail stays
      const [oldN, oldSize, oldUnread] = this.old;
      t = `${fmt(oldN)} of them are older than two years: ${oldSize}. Clear them out? They go to the Bin. Flagged mail stays.`;
      api.show(S.tag('Old mail') + S.words(t) + S.btns(S.btn('Keep them', 'space'), S.btn('Move to Bin', 'del', true)));
      await api.wait(say(t) * .8);
      if (await api.press('del', 'space') === 'del') {
        toast.textContent = `Moving ${fmt(oldN)} to the Bin`; toast.classList.add('is-on');
        count(n - oldUnread); mails(all - oldN); bin.textContent = fmt(oldN);
        await api.wait(1300); toast.textContent = `${fmt(oldN)} in the Bin · ${oldSize}`; await api.wait(900); toast.classList.remove('is-on');
      }
      // the newsletters, one by one
      t = `These ${this.senders.length} senders send newsletters, busiest first. Does each one earn its place?`;
      api.show(S.tag('Newsletters') + S.words(t) + S.stats([[this.senders.length, 'newsletters'], [this.senders.reduce((a, r) => a + r[3], 0), 'mails in 3 months']]) + S.btns(S.btn('One by one', 'space')));
      await api.wait(say(t) * .8); await api.press('space');
      const gone = [];
      for (let i = 0; i < this.senders.length; i++) {
        const [name, , , m, key] = this.senders[i];
        api.ctx.querySelectorAll(`.tkd-mrow[data-s="${i}"]`).forEach(r => r.classList.add('is-seen'));
        api.show(S.tag('Newsletters') + S.title(name) + S.words(`${m} mails in three months. Does it earn its place?`) + S.btns(S.btn('Keep', 'space'), S.btn('Unsubscribe', 'del', true)) + S.count(`${i + 1} OF ${this.senders.length} · AN UNSUBSCRIBE CAN’T BE UNDONE`));
        await api.wait(YOU ? 0 : i < 2 ? 1500 : 750); const k = await api.press(key, key === 'del' ? 'space' : 'del');
        api.ctx.querySelectorAll(`.tkd-mrow[data-s="${i}"]`).forEach(r => { r.classList.remove('is-seen'); if (k === 'del') r.classList.add('is-gone'); });
        if (k === 'del') gone.push(m);
      }
      const old = gone.reduce((a, b) => a + b, 0); let binned = 0;
      if (gone.length) {
        t = `You unsubscribed from ${gone.length}. Clear their old mails too? ${old} mails, ${Math.round(old * 38 / 133)} MB. Only from these exact addresses: other mail from the same company stays.`;
        api.show(S.tag('Newsletters') + S.words(t) + S.btns(S.btn('Keep them', 'space'), S.btn('Move to Bin', 'del', true)));
        await api.wait(say(t) * .7);
        if (await api.press('del', 'space') === 'del') { binned = old; count(n - old); mails(all - old); bin.textContent = fmt(oldN + old); }
        await api.wait(1100);
      }
      // the unread from before the last three weeks, marked read
      t = `${fmt(n)} mails older than three weeks are still unread. Mark them as read? The last three weeks stay as they are, for you to look through.`;
      api.show(S.tag('Your inbox') + S.words(t) + S.btns(S.btn('Mark them read', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t) * .8);
      const marked = await api.press('space', 's') === 'space'; if (marked) { count(this.left); api.ctx.querySelector('.tkd-mails').classList.add('is-read'); }
      await api.wait(1300);
      api.show(S.tag('Inbox, done') + S.words('Your inbox, light again. That’s a big one.') + S.fixes([`${fmt(oldN)} old mails to the Bin`, `${gone.length} newsletter${gone.length === 1 ? '' : 's'} unsubscribed, ${binned} of their mails gone`, `${fmt(this.unread)} unread → ${marked ? this.left : fmt(n)}`], 3));
      api.tinko.cheer(1);
    },
    hold: 3600,
    async reset(api) {
      api.ctx.querySelectorAll('.tkd-mrow').forEach(r => r.classList.remove('is-gone', 'is-seen'));
      api.ctx.querySelector('.tkd-mails').classList.remove('is-read');
      api.ctx.querySelector('.tkd-mbox.is-on b').textContent = '8,214'; api.ctx.querySelector('.tkd-mlist-h em').textContent = '8,214';
      [...api.ctx.querySelectorAll('.tkd-mbox')].pop().querySelector('b').textContent = ' '; api.ctx.querySelector('.tkd-mtoast').classList.remove('is-on');
    },
  },

  /* 8. Documents (DocumentsSort.swift, DocumentsViews.swift): the loose files at the top into 00_Sort later (made the
        first time) or the Bin; each folder a main folder, into 99_Other (made when it's needed) or the Bin; then you
        drag the main folders into your own order and Tinko numbers them, 00_Sort later on top, 99_Other at the bottom */
  documents: {
    label: 'Tinko sorting Documents: loose files into 00_Sort later, each folder kept as a main folder, moved into 99_Other or binned, then the main folders dragged into your own order and numbered.',
    items: [
      ['f1', 'txt', 'Invoice March.pdf', 'PDF document', 'later', '120 KB · here since March'], ['f2', 'png', 'IMG_3312.png', 'PNG image', 'later', '3.1 MB · here since July'], ['f3', 'txt', 'notes old.txt', 'Plain text', 'bin', '2 KB · here since 2023'],
      ['work', 'folder', 'Work', 'Folder', 'main'], ['old', 'folder', 'Old stuff', 'Folder', 'other'], ['tax', 'folder', 'Taxes', 'Folder', 'main'],
      ['untitled', 'folder', 'Untitled folder', 'Folder', 'bin'], ['family', 'folder', 'Family', 'Folder', 'main'], ['side', 'folder', 'Side projects', 'Folder', 'main'],
    ],
    build(api) {
      api.app('Tinko');
      const row = ([id, icon, name, kind]) => `<div class="tkd-drow" data-id="${id}"><span><img src="${MAC('file-' + icon)}" alt=""><em></em><b>${name}</b></span><span>${kind}</span></div>`;
      const all = [['later', 'folder', '00_Sort later', 'Folder'], ...this.items, ['other', 'folder', '99_Other', 'Folder']];
      api.ctx.insertAdjacentHTML('beforeend', macWin('is-finder is-docs', 'Documents', `<div class="tkd-fside"></div><div class="tkd-list"><div class="tkd-lhead"><span>Name</span><span>Kind</span></div><div class="tkd-drows">${all.map(row).join('')}<svg class="tkd-cursor" viewBox="0 0 14 20" aria-hidden="true"><path d="M1 1v15.5l4-3.6 2.7 6 2.6-1.2-2.6-5.8h5.5z" fill="#000" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg></div></div>`));
      this.place(api, this.items.map(i => i[0]));
    },
    // the rows stand where their place in the list says (so a new folder or a drag slides the others along)
    place(api, order) {
      this.order = order;
      api.ctx.querySelectorAll('.tkd-drow').forEach(r => { const i = order.indexOf(r.dataset.id); r.classList.toggle('is-out', i < 0); r.classList.toggle('is-odd', i % 2 === 1); if (i >= 0) r.style.top = i * 26 + 'px'; });
    },
    // a drag in Finder: the pointer takes the row, the row lifts and slides to its new place, the rest make room
    async drag(api, id, to) {
      const r = api.ctx.querySelector(`.tkd-drow[data-id="${id}"]`), cur = api.ctx.querySelector('.tkd-cursor'), from = this.order.indexOf(id);
      cur.style.transition = 'none'; cur.style.top = from * 26 + 30 + 'px'; cur.classList.add('is-on');
      await api.wait(60); cur.style.transition = ''; cur.style.top = from * 26 + 9 + 'px';
      await api.wait(500); r.classList.add('is-drag'); await api.wait(220);
      const order = this.order.filter(x => x !== id); order.splice(to, 0, id); this.place(api, order);
      cur.style.top = to * 26 + 9 + 'px';
      await api.wait(900); r.classList.remove('is-drag'); await api.wait(250); cur.classList.remove('is-on');
    },
    layout(api, L) {
      api.winAt(L === 'tall' ? 33 : 16, L === 'tall' ? 50 : 50);
      Object.assign(api.ctx.querySelector('.is-docs').style, L === 'tall' ? { left: '33px', top: '470px', width: '454px', height: '290px' } : { left: '330px', top: '50px', width: '374px', height: '420px' });
    },
    async play(api) {
      const { S } = api, r = id => api.ctx.querySelector(`.tkd-drow[data-id="${id}"]`);
      let order = this.items.map(i => i[0]); this.place(api, order);
      let t = 'Now Documents. 3 loose files at the top and 6 folders without a plan. One by one, then they get your order.';
      api.show(S.tag('Documents') + S.words(t) + S.stats([[3, 'loose files'], [6, 'folders']]) + S.btns(S.btn('One by one', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      // the loose files: into 00_Sort later, or the Bin
      for (const [id, icon, name, , fate, note] of this.items.slice(0, 3)) {
        r(id).classList.add('is-seen');
        api.show(S.tag('Loose files') + S.words('Loose at the top of Documents. Into 00_Sort later, or the Bin?') + `<div class="tkd-filecard"><img src="${MAC('file-' + icon)}" alt=""><div><b>${name}</b><span>${note}</span></div></div>` + S.btns(S.btn('Sort later', 'space'), S.btn('Bin', 'del', true)));
        await api.wait(YOU ? 0 : id === 'f1' ? 1500 : 650);
        const k = await api.press(fate === 'bin' ? 'del' : 'space', fate === 'bin' ? 'space' : 'del');
        r(id).classList.remove('is-seen');
        if (k === 'space' && !order.includes('later')) { order = ['later', ...order]; this.place(api, order); await api.wait(500); }
        order = order.filter(x => x !== id); this.place(api, order);
        if (k === 'space') { r('later').classList.add('is-bump'); setTimeout(() => r('later').classList.remove('is-bump'), 400); }
        await api.wait(400);
      }
      // the folders: a main folder, into 99_Other, or the Bin
      for (const [id, , name, , fate] of this.items.slice(3)) {
        r(id).classList.add('is-seen');
        api.show(S.tag('Your folders') + S.title(name) + S.words('A main folder? Or into 99_Other, or the Bin?') + S.btns(S.btn('Main folder', 'space'), S.btn('99_Other', '1', true), S.btn('Bin', 'del', true)));
        await api.wait(YOU ? 0 : id === 'work' ? 1500 : 600);
        const want = fate === 'main' ? 'space' : fate === 'other' ? '1' : 'del';
        const k = await api.press(want, ['space', '1', 'del'].filter(x => x !== want));
        r(id).classList.remove('is-seen');
        if (k === 'space') r(id).classList.add('is-main');
        else { order = order.filter(x => x !== id); if (k === '1' && !order.includes('other')) order.push('other'); if (k === '1') { r('other').classList.add('is-bump'); setTimeout(() => r('other').classList.remove('is-bump'), 400); } }
        this.place(api, order); await api.wait(450);
      }
      // your order: two drags, then the numbers
      t = 'Now put your main folders in the order you think in. Drag them in Finder, I’ll wait.';
      api.show(S.tag('Your order') + S.words(t) + S.btns(S.btn('Done', 'space')));
      await api.wait(say(t) * .6);
      await this.drag(api, 'family', 1); await api.wait(200);
      await this.drag(api, 'side', 3); await api.wait(300);
      await api.press('space');
      t = 'Numbers on? I’ll put 01, 02 and so on in front. 00_Sort later stays on top, 99_Other at the bottom.';
      api.show(S.tag('Your order') + S.words(t) + S.btns(S.btn('Number them', 'space'), S.btn('Leave them', 's', true)));
      await api.wait(say(t) * .8);
      if (await api.press('space', 's') === 'space') {
        const mains = this.order.filter(x => x !== 'later' && x !== 'other');
        for (let i = 0; i < mains.length; i++) { r(mains[i]).querySelector('em').textContent = String(i + 1).padStart(2, '0') + '_'; r(mains[i]).classList.add('is-num'); await api.wait(260); }
      }
      await api.wait(500);
      t = 'Your Documents, in your order. 00_Sort later on top for what can wait, 99_Other at the bottom for the rest.';
      api.show(S.tag('Documents, done') + S.words(t) + S.btns(S.btn('Next', 'space')));
      api.tinko.cheer(1);
    },
    hold: 3800,
    async reset(api) {
      api.ctx.querySelectorAll('.tkd-drow').forEach(r => { r.classList.remove('is-main', 'is-num', 'is-seen', 'is-drag'); r.querySelector('em').textContent = ''; });
      this.place(api, this.items.map(i => i[0]));
    },
  },

  /* 7. Instant setup (SetupViews.swift, Essentials.swift): both downloaded from their makers, each checked, into Applications */
  setup: {
    label: 'Tinko installing Arc and Raycast in one go, each checked against its maker before it goes into Applications.',
    build(api) { api.app('Tinko'); this.dock = dock(api.ctx, [['finder', 1], ['mail'], ['notes'], ['figma', 1], ['tinko', 1]]); },
    layout(api, L) { api.winAt(L === 'tall' ? 33 : 133, L === 'tall' ? 90 : 40); },
    async play(api) {
      const { S } = api;
      const list = (a, r) => `<div class="tkd-fixes">${[['Arc: the browser the course works in', a], ['Raycast: open anything with a few keys', r]].map(([t, s]) => `<div class="${s === 'done' ? 'is-done' : ''}"><i></i><span>${t}</span>${s === 'done' ? '<em>Installed</em>' : ''}</div>`).join('')}</div>`;
      let t = 'Last stage: your essentials, the tools the course works with. I’ll install both in one go; the course explains them later.';
      api.show(S.tag('Instant setup') + S.words(t) + list() + S.btns(S.btn('Install both', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t)); await api.press('space');
      const bar = (label, a, r) => S.tag('Instant setup') + S.words('Downloading straight from their makers, and checking each one is really theirs…') + list(a, r) + `<div class="tkd-progress"><i style="width:${label[1]}%"></i></div>` + S.count(label[0]);
      const steps = [['DOWNLOADING ARC · 120 OF 454 MB', 24], ['DOWNLOADING ARC · 318 OF 454 MB', 62], ['CHECKING ARC · THE BROWSER COMPANY', 80]];
      for (const s of steps) { api.show(bar(s, '', '')); await api.wait(900); }
      this.dock.add('arc');
      const steps2 = [['DOWNLOADING RAYCAST · 40 OF 138 MB', 88], ['DOWNLOADING RAYCAST · 88 OF 138 MB', 94], ['CHECKING RAYCAST · RAYCAST TECHNOLOGIES', 99]];
      for (const s of steps2) { api.show(bar(s, 'done', '')); await api.wait(900); }
      this.dock.add('raycast');
      t = 'All in Applications. They’ll be there when the course gets to them.';
      api.show(S.tag('Instant setup') + S.words(t) + list('done', 'done') + S.btns(S.btn('Next', 'space')));
      await api.wait(say(t)); await api.press('space');
      api.show(S.tag('Instant setup, done') + S.words('Your essentials are ready. The course shows how to make each one yours.') + `<div class="tkd-fixes"><div class="is-done"><i></i><span>Arc installed</span></div><div class="is-done"><i></i><span>Raycast installed</span></div><div class="is-done"><i></i><span>Arc is your default browser</span></div></div>`);
      api.tinko.cheer(1);
    },
    hold: 3600,
    async reset() { this.dock.reset(); },
  },
};

const DEMO_CSS = `
.tkd{position:relative;width:100%;overflow:hidden;text-align:left;border-radius:12px;box-shadow:0 0 0 1px rgba(61,58,53,.1),0 30px 70px -36px rgba(61,58,53,.55)}
.dfs-night .tkd{box-shadow:0 0 0 1px rgba(251,247,239,.08),0 30px 70px -36px rgba(0,0,0,.8)}
.tkd-scene{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#1d1d1f}
.tkd-wall{position:absolute;inset:0;background:url(${WALL_DAY}) 30% 100%/cover no-repeat;opacity:.66}
.dfs-night .tkd-wall{opacity:1}
.dfs-night .tkd-wall{background-image:linear-gradient(rgba(12,18,34,.28),rgba(12,18,34,.28)),url(${WALL_NIGHT})}
.tkd-bar{position:absolute;left:0;right:0;top:0;height:22px;display:flex;align-items:center;gap:15px;padding:0 12px 0 14px;font-size:12px;line-height:1;z-index:6;color:rgba(0,0,0,.85)}
.tkd-bar i{flex:1}.tkd-bar b{font-weight:700}.tkd-apple svg{width:12px;height:12px;display:block;margin-top:-2px}
.dfs-night .tkd-bar{color:rgba(255,255,255,.92)}
.tkd-scene.is-tall .tkd-bar span:not(.tkd-clock):not(.tkd-apple){display:none}
.tkd-ctx{position:absolute;inset:0}
/* Tinko's window: the app's own, 614 x 540, drawn smaller */
.tkd-win{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;--tkh-cell:6px;position:absolute;z-index:3;width:614px;height:540px;transform:scale(.74);transform-origin:0 0;border-radius:12px;overflow:hidden;background:var(--c-card);color:var(--c-ink);font-family:"Space Mono",monospace;font-size:12px;-webkit-font-smoothing:antialiased;
  box-shadow:0 0 0 1px rgba(0,0,0,.12),0 22px 50px -12px rgba(0,0,0,.45);transition:left .6s cubic-bezier(.33,1,.68,1),top .6s cubic-bezier(.33,1,.68,1)}
.dfs-night .tkd-win{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241}
.tkd-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
.dfs-night .tkd-grain{mix-blend-mode:screen;opacity:.05}
.tkd-lights{position:absolute;left:9px;top:8px;display:flex;gap:8px;z-index:2}
.tkd-lights i{width:12px;height:12px;border-radius:50%;background:#ff5f57;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}.tkd-lights i:nth-child(2){background:#febc2e}.tkd-lights i:nth-child(3){background:#28c840}
.tkd-dash{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px}.tkd-dash.is-top{top:28px}.tkd-dash.is-bottom{bottom:28px}
.tkd-col{position:absolute;left:28px;right:28px;top:28px;bottom:28px;border-inline:1px solid var(--c-line);background-image:linear-gradient(color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px}
.tkd-stage{position:absolute;inset:0;display:grid;justify-items:center;align-content:center;gap:20px}
.tkd-tinko{cursor:default}
.tkd-screen{display:grid;justify-items:center;text-align:center;width:100%;min-height:236px;align-content:start;transition:opacity .35s cubic-bezier(.33,1,.68,1),transform .35s cubic-bezier(.33,1,.68,1)}
.tkd-screen.is-swap{opacity:0;transform:translateY(6px);transition:none}
.tkd-tag{height:20px;margin-bottom:12px;display:flex;align-items:center}
.tkd-tag span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-calm);background:var(--c-calmsoft);border-radius:2px;padding:3px 7px;line-height:1.2}
.tkd-title{font-family:var(--_typography---font-styles--heading,"PP Mondwest",serif);font-size:26px;line-height:1.1;margin:-2px 0 10px}
.tkd-words{font-size:14px;line-height:24px;max-width:430px;margin:0 0 22px;padding:0 14px}
.tkd-btns{display:flex;gap:10px;justify-content:center}
.tkd-btn{display:inline-flex;align-items:center;gap:8px;min-height:38px;box-sizing:border-box;padding:10px 16px;border-radius:4px;font-size:12px;letter-spacing:.6px;background:var(--c-ink);color:var(--c-card);transition:transform .18s}
.tkd-btn.is-light{background:var(--c-card);color:var(--c-ink);box-shadow:inset 0 0 0 1px var(--c-line)}
.tkd-btn.is-press{transform:scale(.93);box-shadow:0 0 0 3px color-mix(in srgb,var(--c-calm) 45%,transparent)}
.tkd-btn.is-light.is-press{box-shadow:inset 0 0 0 1px var(--c-line),0 0 0 3px color-mix(in srgb,var(--c-calm) 45%,transparent)}
.tkd-btn.is-ask{cursor:pointer;animation:tkdAsk 1.3s ease-in-out infinite}
.tkd-btn.is-light.is-ask{animation-name:tkdAskL}
@keyframes tkdAsk{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--c-calm) 40%,transparent)}}
@keyframes tkdAskL{0%,100%{box-shadow:inset 0 0 0 1px var(--c-line),0 0 0 0 transparent}50%{box-shadow:inset 0 0 0 1px var(--c-line),0 0 0 4px color-mix(in srgb,var(--c-calm) 40%,transparent)}}
.tkd.tkd-ba{height:100%;border-radius:0;box-shadow:none}
.dfs-night .tkd-ba .tkd-wall{background-color:#0e1628}
.tkd-scene.is-ba:not(.is-tall) .tkd-dock{--ds:32px}
.tkb-badge{position:absolute;top:calc(var(--ds) * -.12);right:calc(var(--ds) * -.2);min-width:calc(var(--ds) * .46);height:calc(var(--ds) * .46);padding:0 calc(var(--ds) * .13);box-sizing:border-box;border-radius:calc(var(--ds) * .23);background:#ff453a;color:#fff;font-weight:600;font-size:calc(var(--ds) * .3);line-height:calc(var(--ds) * .46);text-align:center;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.tkb-dl svg{position:absolute;left:28%;top:34%;width:44%;height:44%;color:rgba(14,76,150,.7)}
.tkb-note{position:absolute;z-index:5;display:flex;align-items:center;gap:10px;box-sizing:border-box;padding:10px 54px 10px 12px;border-radius:14px;background:rgba(246,246,246,.82);-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6);box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 8px 24px rgba(0,0,0,.16);font-size:11px;line-height:1.35;color:#1d1d1f}
.dfs-night .tkb-note{background:rgba(44,44,48,.8);color:#ececec;box-shadow:0 0 0 .5px rgba(255,255,255,.12),0 8px 24px rgba(0,0,0,.4)}
.tkb-note img{width:30px;height:30px;flex:none}.tkb-note b{display:block;font-size:11.5px}.tkb-note span{display:block;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tkb-note em{position:absolute;right:12px;top:10px;font-style:normal;font-size:10px;opacity:.5}
.tkb-st{display:flex;align-items:center;gap:12px}.tkb-st svg{height:14px;width:auto;display:block}
.tkb-rec{display:grid;place-items:center;width:28px;height:16px;border-radius:8px;background:#ff9f0a;color:#fff}.tkb-rec svg{height:11px}
.tkb-timer{display:flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums}.tkb-timer svg{height:12px}
/* on a phone the menus go (as in the demos), the status items stay: the busy ones fewer */
.tkd.tkd-ba .tkd-scene.is-ba.is-tall .tkd-bar span.tkb-st{display:flex;gap:9px}.tkd.tkd-ba .tkd-scene.is-tall .tkd-bar span.tkb-rec{display:grid}.tkd.tkd-ba .tkd-scene.is-tall .tkd-bar span.tkb-timer{display:flex}
.tkd-scene.is-before.is-tall .tkb-st>:nth-child(n+4):nth-child(-n+8){display:none!important}
.tkb-desk{position:absolute;left:0;top:0;z-index:1;display:block}
.tkd-your{margin-top:12px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--c-calm)}
.tkd-key{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;box-sizing:border-box;border-radius:3px;box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 50%,transparent);font-size:10px;letter-spacing:0}
.tkd-key svg{width:11px;height:9px;fill:none;stroke:currentColor;stroke-width:1.3}
.tkd-undo{margin-top:16px;font-size:10px;letter-spacing:1px;color:var(--c-soft);white-space:pre}
.tkd-count{margin-top:14px;font-size:10px;letter-spacing:1px;color:var(--c-soft)}
.tkd-note{margin:-8px 0 18px;padding:6px 10px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 6%,var(--c-card));font-size:10px;letter-spacing:.5px}
.tkd-note:first-child{margin:0 0 14px;background:none;color:var(--c-calm);letter-spacing:1px}
.tkd-stats{display:flex;gap:28px;margin:-4px 0 22px}
.tkd-stats>div{display:grid;justify-items:center;gap:2px}
.tkd-stats b{font-weight:400;font-family:var(--_typography---font-styles--heading,"PP Mondwest",serif);font-size:26px;line-height:1}
.tkd-stats span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkd-fixes{display:grid;gap:7px;width:370px;margin:-6px 0 22px;padding:10px 12px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 4%,var(--c-card));text-align:left}
.tkd-fixes>div{display:flex;align-items:center;gap:10px;font-size:11px}
.tkd-fixes i{width:12px;height:12px;flex:none;border-radius:2px;box-shadow:inset 0 0 0 1px var(--c-line);background:var(--c-card);transition:background .3s}
.tkd-fixes .is-done i{background:var(--c-calm) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.4 2.4L9.6 3.6' fill='none' stroke='white' stroke-width='1.6'/%3E%3C/svg%3E") center/10px no-repeat;box-shadow:none}
.tkd-fixes em{margin-left:auto;font-style:normal;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkd-filecard{display:flex;align-items:center;gap:18px;margin:-6px 0 20px;text-align:left}
.tkd-filecard img{width:58px;height:58px}
.tkd-filecard b{display:block;font-weight:400;font-family:var(--_typography---font-styles--heading,"PP Mondwest",serif);font-size:20px;line-height:1.1;max-width:240px}
.tkd-filecard span{display:block;margin-top:5px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkd-pins{width:420px;height:40px;margin:-6px 0 20px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)}
.tkd-pins-in{display:flex;gap:6px;padding-top:4px}
.tkd-pins-in i{flex:none;width:24px;height:24px;opacity:.55;transition:opacity .3s,transform .3s}
.tkd-pins-in i img{width:100%;height:100%;display:block}
.tkd-pins-in i.is-now{opacity:1;transform:scale(1.2)}.tkd-pins-in i.is-kept{opacity:.3}.tkd-pins-in i.is-gone{opacity:.08;transform:scale(.7)}
.tkd-progress{width:320px;height:3px;border-radius:2px;background:color-mix(in srgb,var(--c-ink) 12%,transparent);overflow:hidden;margin:-4px 0 0}
.tkd-progress i{display:block;height:100%;background:var(--c-calm);transition:width .8s linear}
/* the Dock */
.tkd-dock{--ds:25px;position:absolute;z-index:4;left:50%;bottom:6px;transform:translateX(-50%);display:flex;align-items:center;padding:calc(var(--ds) * .145) calc(var(--ds) * .12);border-radius:calc(var(--ds) * .27);background:rgba(255,255,255,.26);-webkit-backdrop-filter:blur(18px) saturate(1.7);backdrop-filter:blur(18px) saturate(1.7);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 10px 30px rgba(0,0,0,.18),0 0 0 .5px rgba(0,0,0,.18)}
.dfs-night .tkd-dock{background:rgba(40,46,64,.35);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 10px 30px rgba(0,0,0,.35)}
.tkd-scene.is-tall .tkd-dock{--ds:17px}
.tkd-dapp{position:relative;width:var(--ds);height:var(--ds);margin:0 calc(var(--ds) * .03);flex:none;transition:width .5s cubic-bezier(.625,.05,0,1),margin .45s cubic-bezier(.625,.05,0,1),opacity .35s,transform .45s cubic-bezier(.625,.05,0,1)}
.tkd-dapp img{width:100%;height:100%;display:block}
.tkd-dapp i{position:absolute;left:50%;bottom:calc(var(--ds) * -.1 - 1px);width:3px;height:3px;margin-left:-1.5px;border-radius:50%;background:rgba(0,0,0,.6);opacity:0}
.tkd-dapp.is-run i{opacity:1}.dfs-night .tkd-dapp i{background:rgba(255,255,255,.8)}
.tkd-dapp.is-going{opacity:.35}
.tkd-dapp.is-out{width:0;margin:0;opacity:0;transform:scale(.4)}
.tkd-dsep{width:1px;height:calc(var(--ds) * .9);margin:0 calc(var(--ds) * .18);background:rgba(0,0,0,.18);flex:none}
.dfs-night .tkd-dsep{background:rgba(255,255,255,.25)}
.tkd-trash .is-full,.tkd-dock.is-full .tkd-trash .is-empty{display:none}.tkd-dock.is-full .tkd-trash .is-full{display:block}
/* the desk */
.tkd-desk{position:absolute;inset:0;z-index:1}
.tkd-file{position:absolute;width:84px;display:grid;justify-items:center;gap:3px;text-align:center}
.tkd-file img{display:block}.tkd-ficon{width:52px;height:52px}.tkd-thumb{width:52px;height:33px;margin:9px 0 10px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.25)}
.tkd-file span{padding:1px 3px;border-radius:3px;font-size:10px;line-height:13px;color:rgba(0,0,0,.86);text-shadow:0 0 6px rgba(255,255,255,.6)}
.dfs-night .tkd-file span{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.tkd-file.is-gone{visibility:hidden}
.tkd-file.is-new{opacity:0;transform:scale(.6);transition:opacity .4s,transform .5s cubic-bezier(.625,.05,0,1)}.tkd-file.is-new.is-in{opacity:1;transform:none}
/* macOS windows beside him: Finder, System Settings, Mail */
.tkd-mw{position:absolute;z-index:2;border-radius:10px;overflow:hidden;background:#fff;color:#1d1d1f;box-shadow:0 0 0 .5px rgba(0,0,0,.2),0 18px 44px -10px rgba(0,0,0,.4);display:flex;flex-direction:column;font-size:11px}
.dfs-night .tkd-mw{background:#2a2a2d;color:#ececec;box-shadow:0 0 0 .5px rgba(255,255,255,.12),0 18px 44px -10px rgba(0,0,0,.6)}
.tkd-mw-bar{position:relative;height:30px;flex:none;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(0,0,0,.08);font-size:12px}
.dfs-night .tkd-mw-bar{border-color:rgba(255,255,255,.08)}
.tkd-mw-bar .tkd-lights{left:10px;top:9px;gap:6px}.tkd-mw-bar .tkd-lights i{width:10px;height:10px}
.tkd-mw-body{flex:1;display:flex;min-height:0}
.tkd-fside{width:140px;flex:none;background:rgba(0,0,0,.035)}
.dfs-night .tkd-fside{background:rgba(255,255,255,.03)}
.tkd-scene.is-tall .tkd-fside{display:none}
.tkd-list{flex:1;min-width:0;padding:4px 0}
.tkd-lhead,.tkd-lrow{display:flex;justify-content:space-between;gap:10px;padding:0 14px;height:26px;align-items:center;white-space:nowrap}
.tkd-lhead{font-size:10px;color:rgba(0,0,0,.45);border-bottom:1px solid rgba(0,0,0,.06)}.dfs-night .tkd-lhead{color:rgba(255,255,255,.45);border-color:rgba(255,255,255,.06)}
.tkd-lrow:nth-child(odd){background:rgba(0,0,0,.025)}.dfs-night .tkd-lrow:nth-child(odd){background:rgba(255,255,255,.025)}
.tkd-lrow span:first-child{display:flex;align-items:center;gap:7px;overflow:hidden;text-overflow:ellipsis}.tkd-lrow img{width:16px;height:16px}
.tkd-lrow span:last-child{color:rgba(0,0,0,.5)}.dfs-night .tkd-lrow span:last-child{color:rgba(255,255,255,.5)}
.tkd-lrow{transition:height .4s cubic-bezier(.625,.05,0,1),opacity .3s,background .3s;overflow:hidden}
.tkd-lrow.is-seen{background:rgba(10,108,255,.12)!important}
.tkd-lrow.is-gone{height:0;opacity:0}
.tkd-set{flex:1;padding:16px 18px}
.tkd-set-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.tkd-set-head img{width:30px;height:30px}.tkd-set-head b{font-size:15px}
.tkd-set-row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,.035);margin-bottom:6px}
.dfs-night .tkd-set-row{background:rgba(255,255,255,.05)}
.tkd-set-row.is-soft{opacity:.55}.tkd-set-row em{font-style:normal;color:rgba(127,127,127,1)}
.tkd-switch{width:30px;height:18px;border-radius:9px;background:rgba(0,0,0,.18);position:relative;transition:background .25s}
.tkd-switch::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .25s cubic-bezier(.33,1,.68,1)}
.tkd-switch.is-on{background:#34c759}.tkd-switch.is-on::after{transform:translateX(12px)}
.tkd-switch.is-small{transform:scale(.85)}
.tkd-mw.is-settings{transition:opacity .25s}.tkd-mw.is-settings.is-flip{opacity:.4}
.tkd-mw.is-mail .tkd-mw-body{flex-direction:row}
.tkd-mside{width:98px;flex:none;display:flex;flex-direction:column;gap:1px;padding:10px 6px;background:rgba(0,0,0,.035);border-right:1px solid rgba(0,0,0,.07);font-size:10.5px}
.tkd-mside-h{padding:1px 6px 5px;font-size:9px;font-weight:600;color:rgba(0,0,0,.4)}
.tkd-mbox{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;color:rgba(0,0,0,.72)}
.tkd-mbox svg{width:12px;height:12px;flex:none;fill:none;stroke:#0a84ff;stroke-width:1.1;stroke-linejoin:round;stroke-linecap:round}
.tkd-mbox.is-on{background:rgba(0,0,0,.07);color:#1d1d1f;font-weight:500}
.tkd-mbox b{margin-left:auto;font-weight:500;font-size:9.5px;color:rgba(0,0,0,.45);font-variant-numeric:tabular-nums}
.tkd-mlist{flex:1;min-width:0;display:flex;flex-direction:column}
.tkd-mlist-h{display:flex;flex-direction:column;gap:1px;padding:9px 12px 7px;border-bottom:1px solid rgba(0,0,0,.07)}
.tkd-mlist-h b{font-size:14px;font-weight:700}.tkd-mlist-h span{font-size:9.5px;color:rgba(0,0,0,.45);font-variant-numeric:tabular-nums}
.tkd-mails{flex:1;overflow:hidden}
.tkd-mrow{display:grid;grid-template-columns:7px 24px minmax(0,1fr);gap:7px;align-items:start;height:57px;padding:8px 12px 0 7px;border-bottom:1px solid rgba(0,0,0,.055);overflow:hidden;transition:height .45s cubic-bezier(.625,.05,0,1),padding .45s cubic-bezier(.625,.05,0,1),opacity .3s,background .3s}
.tkd-mdot{width:7px;height:7px;margin-top:5px;border-radius:50%;background:#0a84ff;transition:opacity .4s}
.tkd-mav{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:9px;font-weight:600;letter-spacing:.02em}
.tkd-mtxt{min-width:0}.tkd-mtop{display:flex;justify-content:space-between;gap:6px}
.tkd-mtop b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:600}
.tkd-mtop time{flex:none;font-size:9.5px;color:rgba(0,0,0,.42)}
.tkd-msub,.tkd-mpre{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
.tkd-msub{font-size:10.5px}.tkd-mpre{font-size:10px;color:rgba(0,0,0,.45)}
.tkd-mrow.is-seen{background:rgba(10,132,255,.1)}.tkd-mrow.is-gone{height:0;padding-top:0;padding-bottom:0;opacity:0;border-width:0}
.tkd-mails.is-read .tkd-mdot{opacity:0}
.dfs-night .tkd-mside{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}.dfs-night .tkd-mside-h,.dfs-night .tkd-mbox b,.dfs-night .tkd-mlist-h span,.dfs-night .tkd-mtop time,.dfs-night .tkd-mpre{color:rgba(255,255,255,.45)}
.dfs-night .tkd-mrow{border-color:rgba(255,255,255,.06)}.dfs-night .tkd-mbox{color:rgba(255,255,255,.75)}.dfs-night .tkd-mbox.is-on{background:rgba(255,255,255,.1);color:#ececec}.dfs-night .tkd-mlist-h{border-color:rgba(255,255,255,.08)}
.tkd-mlist{position:relative}
.tkd-mlist-h{position:relative}.tkd-mlist-h span{transition:color .3s}.tkd-mlist-h em{font-style:normal;font-size:12px;font-weight:600;color:rgba(0,0,0,.7)}
.tkd-mlist-h span.is-tick,.tkd-mlist-h span.is-tick em{color:#0a84ff}
.dfs-night .tkd-mlist-h em{color:rgba(255,255,255,.8)}.dfs-night .tkd-mlist-h span.is-tick em{color:#4aa3ff}
.tkd-mtoast{position:absolute;right:10px;top:10px;padding:3px 7px;border-radius:4px;background:#0a84ff;color:#fff;font-style:normal;font-size:9px;font-weight:600;opacity:0;transform:translateY(-4px);transition:opacity .3s,transform .3s}
.tkd-mtoast.is-on{opacity:1;transform:none}
.tkd-mthumb{position:absolute;right:2px;top:52px;width:4px;height:3%;border-radius:2px;background:rgba(0,0,0,.25);transition:height .9s cubic-bezier(.625,.05,0,1)}
.dfs-night .tkd-mthumb{background:rgba(255,255,255,.3)}
.tkd-drows{position:relative}
.tkd-drow{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;gap:10px;padding:0 14px;height:26px;align-items:center;white-space:nowrap;transition:top .5s cubic-bezier(.625,.05,0,1),opacity .35s,background .3s,box-shadow .3s,transform .3s}
.tkd-drow.is-odd{background:rgba(0,0,0,.025)}.dfs-night .tkd-drow.is-odd{background:rgba(255,255,255,.025)}
.tkd-drow span:first-child{display:flex;align-items:center;gap:7px;overflow:hidden;text-overflow:ellipsis}.tkd-drow img{width:16px;height:16px}
.tkd-drow span:last-child{color:rgba(0,0,0,.5)}.dfs-night .tkd-drow span:last-child{color:rgba(255,255,255,.5)}
.tkd-drow b{font-weight:400}.tkd-drow.is-main b{font-weight:600}
.tkd-drow em{display:inline-block;max-width:0;overflow:hidden;margin-right:-7px;font-style:normal;font-weight:600;color:#0a84ff;transition:max-width .45s cubic-bezier(.625,.05,0,1),margin .45s}
.tkd-drow.is-num em{max-width:28px;margin-right:-7px}
.tkd-drow[data-id="later"] b,.tkd-drow[data-id="other"] b{font-weight:600}
.tkd-drow.is-out{opacity:0;transform:scale(.97);pointer-events:none}
.tkd-drow.is-seen{background:rgba(10,108,255,.12)!important}
.tkd-drow.is-bump{background:rgba(10,108,255,.2)!important}
.tkd-drow.is-drag{z-index:2;background:#fff!important;box-shadow:0 8px 20px -6px rgba(0,0,0,.35),0 0 0 .5px rgba(0,0,0,.12);transform:scale(1.02);transition-duration:.85s}
.dfs-night .tkd-drow.is-drag{background:#3a3a3e!important}
.tkd-cursor{position:absolute;left:58%;top:0;z-index:3;width:13px;height:19px;opacity:0;transition:top .85s cubic-bezier(.625,.05,0,1),opacity .25s;pointer-events:none}
.tkd-cursor.is-on{opacity:1}
/* the side panel (SidePanel: what goes with an app) */
.tkd-panel{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;position:absolute;z-index:2;left:384px;top:62px;width:322px;padding:18px 18px 14px;border-radius:10px;background:var(--c-card);color:var(--c-ink);font-family:"Space Mono",monospace;font-size:10px;box-shadow:0 0 0 1px rgba(0,0,0,.1),0 18px 40px -12px rgba(0,0,0,.4);opacity:0;transform:translateX(-120px);transition:transform .7s cubic-bezier(.625,.05,0,1),opacity .4s}
.dfs-night .tkd-panel{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa}
.tkd-panel.is-tall{left:33px;top:440px;width:454px;transform:translateY(-60px)}
.tkd-panel.is-open{opacity:1;transform:none}.tkd-panel.is-going{opacity:0;transform:scale(.96)}
.tkd-ph{letter-spacing:1px;color:var(--c-soft);margin:6px 0 8px}
.tkd-prow,.tkd-ptotal{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-bottom:1px dashed var(--c-line);opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}
.tkd-prow.is-in,.tkd-ptotal.is-in,.tkd-prow.is-app{opacity:1;transform:none}
.tkd-prow span{display:flex;align-items:center;gap:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tkd-prow img{width:22px;height:22px}
.tkd-prow b,.tkd-ptotal b{font-weight:400;white-space:nowrap}
.tkd-ptotal{border:0;margin-top:6px;letter-spacing:1px}.tkd-ptotal b{font-size:13px}
`;

/* ---------- before and after (Osmo's Before/After Split Slider, built in Webflow): the same Mac twice ----------
   Rim, 20 Oct: crazier before, a calm after. [data-tinko-ba="before"]: the desk packed with screenshots the way macOS
   piles them (columns from the top right, about three times his own 64; the thumbnails are real screenshots of the
   DFS site, meet/media/shots), a busy menu bar, three banners in the corner, a 24-app Dock with badges.
   [data-tinko-ba="after"]: the same Mac after Tinko: nothing on the desk, a quiet menu bar (the menu bar manager's •••, the
   Personal Hotspot link, the battery), a Dock of Finder and Arc, then the Bin (full: he moves things to the Bin,
   nothing is deleted). No badges. (Rim, 20 Oct: no Raycast, no Downloads: people use their software of choice.) Wide 3:2 on a desktop, tall 4:5 on a phone (by the slider's shape). */
const SHOT = n => new URL(`./media/shots/s${String(n).padStart(2, '0')}.webp`, import.meta.url).href;
const G = (d, w = 16) => `<svg viewBox="0 0 ${w} 16" aria-hidden="true">${d}</svg>`;
const ST = {   // menu bar status items, drawn like SF Symbols (currentColor)
  rec: `<span class="tkb-rec">${G('<path d="M8 2.2a2 2 0 0 1 2 2v3.6a2 2 0 0 1-4 0V4.2a2 2 0 0 1 2-2zM4.6 7.6a3.4 3.4 0 0 0 6.8 0M8 11v2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')}</span>`,
  video: G('<rect x="1.5" y="4.5" width="9" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 7.2l4-2v5.6l-4-2z" fill="currentColor"/>'),
  cloud: G('<path d="M4.6 12.4h6.9a2.9 2.9 0 0 0 .3-5.8 3.9 3.9 0 0 0-7.5 1 2.4 2.4 0 0 0 .3 4.8z" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  note: G('<path d="M6 12.4V3.6l7-1.4v8.9" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="4.4" cy="12.4" r="1.8" fill="currentColor"/><circle cx="11.4" cy="11.1" r="1.8" fill="currentColor"/>'),
  plus: G('<rect x="2.5" y="2.5" width="11" height="11" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 5.2v5.6M5.2 8h5.6" stroke="currentColor" stroke-width="1.3"/>'),
  timer: `<span class="tkb-timer">${G('<path d="M8 2.4l5.2 5.6L8 13.6 2.8 8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>')}0:00</span>`,
  diamond: G('<path d="M8 2.4l5.2 5.6L8 13.6 2.8 8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
  bt: G('<path d="M5 5.2l6 5.6-3 2.6V2.6l3 2.6-6 5.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'),
  wifi: G('<path d="M2 6.6a9 9 0 0 1 12 0M4.2 8.9a6 6 0 0 1 7.6 0M6.4 11.1a3 3 0 0 1 3.2 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="13.1" r="1" fill="currentColor"/>'),
  battery: G('<rect x=".8" y="3.3" width="21" height="9.4" rx="3.2" fill="none" stroke="currentColor" stroke-width="1" opacity=".45"/><rect x="2.4" y="4.9" width="5.4" height="6.2" rx="1.7" fill="currentColor"/><path d="M23.5 6.3v3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>', 25),
  search: G('<circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.2 10.2L13.8 13.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  cc: G('<rect x="1.5" y="2.8" width="13" height="4.6" rx="2.3" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12.2" cy="5.1" r="1.4" fill="currentColor"/><rect x="1.5" y="8.6" width="13" height="4.6" rx="2.3" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="3.8" cy="10.9" r="1.4" fill="currentColor"/>'),
  siri: G('<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4.6 8.4c1.4-2 2.4 2 3.4 0s2-2 3.4 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'),
  dots: G('<circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/>'),
  link: G('<rect x="1.4" y="4.6" width="11.2" height="6.8" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9.4" y="4.6" width="11.2" height="6.8" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/>', 22),
};
const BA_BAR = { before: ['rec', 'video', 'cloud', 'note', 'plus', 'timer', 'bt', 'wifi', 'battery', 'search', 'cc', 'siri'], after: ['dots', 'link', 'battery'] };
const BA_NOTES = [['slack', 'Slack', '#general · 3 new messages', 'now'], ['news', 'News', 'Top stories for you', '2m ago'], ['appstore', 'App Store', '12 updates available', '5m ago']];
const BA_BEFORE = [['finder', 1], ['safari'], ['messages', 0, 2], ['mail', 1, '8,214'], ['maps'], ['photos'], ['facetime'], ['calendar'], ['contacts'], ['reminders'], ['notes'], ['tv'], ['music'], ['news', 0, 5], ['appstore', 0, 12], ['settings', 0, 1], ['arc', 1], ['figma', 1], ['claude', 1], ['slack', 1, 3], ['chrome', 1], ['spotify', 1], ['zoom'], ['tinko', 1]];
const BA_AFTER = [['finder', 1], ['arc', 1]];
const DL_ARROW = G('<path d="M8 4.2v6.6M5.2 8.2L8 11l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>');
const baDock = (apps, full) => `<div class="tkd-dock">${apps.map(([id, run, badge]) => `<div class="tkd-dapp${run ? ' is-run' : ''}"><img src="${MAC(id)}" alt="">${badge ? `<b class="tkb-badge">${badge}</b>` : ''}<i></i></div>`).join('')}<b class="tkd-dsep"></b>${full ? '' : `<div class="tkd-dapp tkb-dl"><img src="${MAC('file-folder')}" alt="">${DL_ARROW}</div>`}<div class="tkd-dapp tkd-trash"><img src="${MAC(full ? 'trash-full' : 'trash-empty')}" alt=""></div></div>`;
// the desk, the way macOS piles it: columns from the top right, each one full before the next
const BA_GRID = { wide: { W: 960, cols: 18, rows: 10, n: 176 }, tall: { W: 520, cols: 9, rows: 10, n: 86 } };
const PITCH = [52, 56], SHOTS = 18;
// one canvas for the whole pile instead of 176 elements (Rim, 20 Oct: "did this become a really heavy element?"),
// drawn once the slider is near the screen, again as the thumbnails come in, on a new size and on day/night
const shotImgs = [];
const loadShots = () => { if (!shotImgs.length) for (let n = 1; n <= SHOTS; n++) { const im = new Image(); im.decoding = 'async'; im.src = SHOT(n); shotImgs.push(im); } return shotImgs; };
function drawDesk(cv, L, k) {
  const g = BA_GRID[L], W = g.W, H = L === 'tall' ? 650 : 640, imgs = loadShots(), night = document.documentElement.classList.contains('dfs-night');
  cv.width = Math.round(W * k); cv.height = Math.round(H * k); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d');
  c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, W, H);
  c.textAlign = 'center'; c.font = '6.4px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
  // a shuffled order of the thumbnails, so no two neighbours repeat in stripes (a fixed Park-Miller sequence: the same pile every visit)
  let seed = 7;
  for (let n = 0; n < g.n; n++) {
    const col = Math.floor(n / g.rows), r = n % g.rows, x = W - 6 - (col + 1) * PITCH[0] + 26, y = 28 + r * PITCH[1];
    const im = imgs[(seed = seed * 16807 % 2147483647) % SHOTS];
    if (im.complete && im.naturalWidth) {
      const f = Math.min(36 / im.naturalWidth, 34 / im.naturalHeight), w = im.naturalWidth * f, h = im.naturalHeight * f, ix = x - w / 2, iy = y + 17 - h / 2;
      c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 2 * k; c.shadowOffsetY = k; c.drawImage(im, ix, iy, w, h); c.restore();
      c.lineWidth = .5; c.strokeStyle = 'rgba(0,0,0,.22)'; c.strokeRect(ix, iy, w, h);
    }
    const time = `${(n * 7 + 2) % 10}.${String((n * 37 + 11) % 60).padStart(2, '0')}`;
    c.save(); c.fillStyle = night ? '#fff' : 'rgba(0,0,0,.86)'; c.shadowColor = night ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.8)'; c.shadowBlur = (night ? 2 : 4) * k; c.shadowOffsetY = night ? k : 0;
    c.fillText('Screenshot', x, y + 42); c.fillText(`2026…${time}.png`, x, y + 50); c.restore();
  }
}

function initBA(host) {
  const after = host.dataset.tinkoBa === 'after';
  const bar = BA_BAR[after ? 'after' : 'before'].map(k => ST[k]).join('');
  host.innerHTML = `<div class="tkd tkd-ba" aria-hidden="true"><div class="tkd-scene is-ba is-${after ? 'after' : 'before'}">
    <div class="tkd-wall"></div>
    <div class="tkd-bar"><span class="tkd-apple">${APPLE}</span><b class="tkd-app">Finder</b><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span><i></i><span class="tkb-st">${bar}</span><span class="tkd-clock">Tue 20 Oct  10:24</span></div>
    <div class="tkd-ctx"></div>
  </div></div>`;
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', after ? 'The same Mac after Tinko: nothing on the desktop, a quiet menu bar, a Dock of Finder and Arc and a full Bin.' : 'A cluttered Mac: the desktop packed with screenshots, a busy menu bar, three notifications and a Dock of 24 apps with badges.');
  const scene = host.querySelector('.tkd-scene'), ctx = host.querySelector('.tkd-ctx');
  let L = '', k = 0, near = false, queued = 0, cv = null;
  const draw = () => { queued = 0; if (cv && near) drawDesk(cv, L, k); };
  const redraw = () => { if (!queued) queued = requestAnimationFrame(draw); };
  const fit = () => {
    const tall = host.clientHeight > host.clientWidth, W = tall ? 520 : 960, H = tall ? 650 : 640;
    if ((tall ? 'tall' : 'wide') !== L) {
      L = tall ? 'tall' : 'wide'; scene.classList.toggle('is-tall', tall);
      ctx.innerHTML = after ? baDock(BA_AFTER, true) : `${BA_NOTES.slice(0, tall ? 2 : 3).map(([id, app, line, when], i) => `<div class="tkb-note" style="${tall ? `left:12px;right:12px;top:${86 + i * 58}px` : `right:12px;width:268px;top:${32 + i * 66}px`}"><img src="${MAC(id)}" alt=""><div><b>${app}</b><span>${line}</span></div><em>${when}</em></div>`).join('')}<canvas class="tkb-desk"></canvas>${baDock(BA_BEFORE, false)}`;
      cv = ctx.querySelector('canvas'); k = 0;
    }
    const scale = host.clientWidth / W, nk = Math.min(3, scale * (devicePixelRatio || 1));
    scene.style.width = W + 'px'; scene.style.height = H + 'px'; scene.style.transform = `scale(${scale})`;
    if (cv && Math.abs(nk - k) > .05) { k = nk; redraw(); }
  };
  new ResizeObserver(fit).observe(host); fit();
  if (!after) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !near) { near = true; loadShots().forEach(im => { if (!im.complete) im.addEventListener('load', redraw, { once: true }); }); redraw(); } }, { rootMargin: '800px 0px' }).observe(host);
    let night = document.documentElement.classList.contains('dfs-night');   // (the smooth scroll toggles classes on <html> too: only day/night counts)
    new MutationObserver(() => { const n = document.documentElement.classList.contains('dfs-night'); if (n !== night) { night = n; redraw(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
}

/* ---------- the pixel cursor (Osmo's Interactive Pixel Grid, its script in the page footer code) ----------
   Rim, 19 Oct: playful, keep the colour, but find the palette. His pick: Mac lights (the window buttons and our
   blue), in the hero only; Tinko ink read too heavy, like a drawing. The Osmo code reads window.tinkoPixels.colors on
   every square it lights, so a palette can change on the fly; a grid with data-grid-off stays dark. Here: the
   palettes, the squares snapped to the 32px grid (the grid's width is set to whole squares before Osmo starts),
   a second grid inside Tinko's window, and with ?tune (or ?pixels) a panel to try them. ?pixels=<name>&win=1
   opens on a palette, so a link can show Marco one. */
const PALETTES = {
  rainbow: { name: 'Osmo rainbow', day: ['#C5D4FF', '#B7B0FF', '#FF5FCE', '#4136FF', '#FFF751', '#87FEFF', '#C4FF3F'] },
  mixed: { name: 'Rainbow, our blue', day: ['#C5E8F8', '#7FD0F5', '#FF5FCE', '#0297DB', '#FFF751', '#00ACFF', '#C4FF3F'] },
  blues: { name: 'Our blues', day: ['#0297DB', '#00ACFF', '#1DABFA', '#7FD0F5', '#C5E8F8', '#EFF9FD'] },
  mac: { name: 'Mac lights', day: ['#FF5F57', '#FEBC2E', '#28C840', '#0297DB'] },
  accents: { name: 'Mac accents', day: ['#007AFF', '#953D96', '#F74F9E', '#E0383E', '#F7821B', '#FFC726', '#62BA46', '#989898'] },
  ink: { name: 'Tinko ink', day: ['#3D3A36'], night: ['#FBF7EF'] },
};
// whole 32px squares, from the same corner as the grid lines behind them
// (rounded up, and the last part column clipped: rounding down left a strip on the right with no trail, Rim, 21 Oct)
function snapGrid(g, w) {
  const cols = Math.max(4, Math.ceil(w / 32)), over = cols * 32 - w;
  g.style.right = 'auto'; g.style.width = cols * 32 + 'px'; g.style.clipPath = over > .5 ? `inset(0 ${over}px 0 0)` : '';
  g.setAttribute('data-grid-size-desktop', cols); g.setAttribute('data-grid-size-mobile', cols);
}
// the hero's, and one behind each feature demo (Rim: the homepage's grid behind its demos, with the trail)
export function snapAll() { document.querySelectorAll('.tinko-pixel-grid:not(.is-win)').forEach(g => snapGrid(g, g.parentElement.offsetWidth)); }
function initPixels() {
  const q = new URLSearchParams(location.search);
  let pal = PALETTES[q.get('pixels')] ? q.get('pixels') : 'mac', inWin = q.get('win') === '1';
  const colors = () => { const P = PALETTES[pal]; return (document.documentElement.classList.contains('dfs-night') && P.night) || P.day; };
  window.tinkoPixels = { colors: colors() };
  new MutationObserver(() => { window.tinkoPixels.colors = colors(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  snapAll();
  const hero = document.querySelector('.tinko-hero_component .tinko-pixel-grid');
  const col = document.querySelector('.tkh-col');
  let win = null;
  if (hero && col) {
    win = document.createElement('div'); win.className = 'tinko-pixel-grid is-win';
    for (const a of ['data-grid', 'data-grid-background', 'data-grid-border-size', 'data-grid-border-color']) win.setAttribute(a, hero.getAttribute(a) ?? '');
    snapGrid(win, col.clientWidth);
    if (!inWin) win.setAttribute('data-grid-off', '');
    col.prepend(win);
  }
  if (!(TUNE || q.has('pixels'))) return;
  // the panel: a palette to pick (its swatches on the button), and the window switch
  const el = document.createElement('div'); el.className = 'tkh-tune is-pixels';
  el.innerHTML = `<b>Pixels</b>${Object.entries(PALETTES).map(([k, P]) => `<button data-p="${k}" aria-pressed="${k === pal}" title="${P.name}"><span class="tkh-sw">${P.day.slice(0, 6).map(c => `<i style="background:${c}"></i>`).join('')}</span>${P.name}</button>`).join('')}<i></i><button data-w aria-pressed="${inWin}">In his window too</button>`;
  document.body.append(el);
  const keepInUrl = () => { const u = new URL(location.href); u.searchParams.set('pixels', pal); inWin ? u.searchParams.set('win', '1') : u.searchParams.delete('win'); history.replaceState(null, '', u); };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { pal = b.dataset.p; window.tinkoPixels.colors = colors(); el.querySelectorAll('[data-p]').forEach(o => o.setAttribute('aria-pressed', o === b)); }
    if ('w' in b.dataset) { inWin = !inWin; b.setAttribute('aria-pressed', inWin); win?.toggleAttribute('data-grid-off', !inWin); }
    keepInUrl();
  });
}

/* ---------- the outro: on into Fundamentals (Rim, 24 Oct: "box opens", and the nav goes with the page) ----------
   The page's last screen is pinned while you scroll through it: his window over one big SPACE key. The scroll draws
   the key's outline (Osmo's Scroll to Next Page, its ring as the key's edge), then pushes the key down; at the bottom
   it clicks. Space or a click on the key scrolls there for you. He cheers and goes, his box opens out over the whole
   screen (over the nav too), and the key's own link opens Fundamentals. Right before, a one-time note in the tab
   (sessionStorage, HAND_OFF) asks Fundamentals to open out of the same colour: its head code plays that half and
   wipes the note, so a refresh or any other way in shows Fundamentals as it always is. Webflow holds the section,
   its sticky pin, the copy and the link; this builds his window round the copy and makes the key press. */
const HAND_OFF = 'dfs-hand-off';
const clamp01 = v => Math.max(0, Math.min(1, v));
function initOutro(host) {
  const win = host.querySelector('[data-tinko-outro-win]'), key = host.querySelector('[data-tinko-outro-key]'), hint = host.querySelector('[data-tinko-outro-hint]');
  if (!win || !key) return;
  const href = key.getAttribute('href') || '/';
  // how the page changes: his box (default), or ?outro=cube / data-tinko-outro="cube": Osmo's 3D cube (Rim, 24 Oct),
  // which lives in the page's footer code as window.tinkoCube (Osmo's code stays out of this public repo)
  const mode = new URLSearchParams(location.search).get('outro') || host.dataset.tinkoOutro || 'box';
  const cubeOn = () => mode === 'cube' && !reduce && window.tinkoCube;
  // his window, the hero's look, round the copy from Webflow
  const copy = [...win.childNodes];
  win.innerHTML = `<div class="tkh tko"><div class="tko-tilt"><div class="tkh-win is-on">
    <div class="tkh-grain" aria-hidden="true"></div>
    <div class="tkh-lights" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="tkh-dash is-top"></div><div class="tkh-dash is-bottom"></div>
    <div class="tkh-col"><div class="tkh-stage"><div class="tkh-tinko" role="img" aria-label="Tinko, a white pixel creature with two eyes"></div><div class="tkh-screen tko-screen"></div></div></div>
  </div></div></div>`;
  win.querySelector('.tko-screen').append(...copy);
  const box = win.querySelector('.tkh-win'), tinkoEl = win.querySelector('.tkh-tinko'), tinko = makeTinko(tinkoEl, {});
  tinko.sleep();
  const lean = tilt(win.querySelector('.tko-tilt'));
  // the key: its words in a cap that travels down, and the ring round it, sized to the key so the corners stay round
  key.classList.add('tko-key');
  const cap = document.createElement('span'); cap.className = 'tko-cap'; cap.append(...key.childNodes);
  key.innerHTML = '<svg class="tko-ring" aria-hidden="true"><rect pathLength="100" rx="11"/></svg>'; key.append(cap);
  const svg = key.querySelector('svg'), ring = svg.firstChild;
  const fit = () => { const w = svg.clientWidth, h = svg.clientHeight; svg.setAttribute('viewBox', `0 0 ${w} ${h}`); ring.setAttribute('x', 1); ring.setAttribute('y', 1); ring.setAttribute('width', Math.max(0, w - 2)); ring.setAttribute('height', Math.max(0, h - 2)); };
  fit(); new ResizeObserver(fit).observe(key);

  const touch = !finePointer, first = hint?.textContent.trim() || 'Scroll to press Space';
  const words = p => p < .06 ? (touch ? 'Scroll to press the key' : first) : p < .78 ? (touch ? 'Keep going, or tap the key' : 'Keep going, or press Space') : p < .97 ? 'Almost there' : '';
  let fired = false, armed = false, auto = false, cover = null, shown = '';
  const progress = () => { const r = host.getBoundingClientRect(), run = r.height - innerHeight; return run > 0 ? clamp01(-r.top / run) : 0; };
  function paint(p) {
    const drawn = clamp01((p - .06) / .7), travel = clamp01((p - .78) / .18);
    ring.style.strokeDashoffset = (100 * (1 - inOut(drawn))).toFixed(2);
    key.style.setProperty('--travel', (6 - 5 * inOut(travel)).toFixed(2) + 'px');
    const w = words(p); if (hint && w !== shown) { shown = w; hint.textContent = w || ' '; }
    if (p < .95) armed = true;   // only a press you scrolled through counts (not a page that opens at its end)
    if (p >= .985 && armed && !fired) fire();
  }
  let tick = 0;
  addEventListener('scroll', () => { if (!tick && !fired) tick = requestAnimationFrame(() => { tick = 0; if (!fired) paint(progress()); }); }, { passive: true });
  addEventListener('resize', () => { if (!fired) paint(progress()); });

  // he wakes as his window comes into view; Fundamentals is fetched ahead while you're on the way
  let woke = false, fetched = false;
  new IntersectionObserver(([e]) => {
    tinko.show(e.isIntersecting);
    if (e.isIntersecting && e.intersectionRatio > .35 && !woke) { woke = true; tinko.wakeUp(1, 'outline'); }
  }, { threshold: [0, .35] }).observe(box);
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || fetched) return; fetched = true;
    if (cubeOn()) return window.tinkoCube.preload(href);   // the cube's far face: the page itself, loading in a frame
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.append(l);
  }, { rootMargin: '0px' }).observe(host);   // once the outro is on screen, not 1.5 screens ahead: the cube's frame runs the
  // whole page it loads (its trackers too), so only visitors who reach the outro load it (audit, 24 Oct)

  // Space, or a click on the key: the page scrolls itself to the end, so it's the same press as scrolling
  function autoPress() {
    if (fired || auto) return;
    const to = host.getBoundingClientRect().bottom + scrollY - innerHeight;
    auto = armed = true;
    const done = () => { auto = false; paint(progress()); };
    if (reduce) { scrollTo(0, to); window.lenis?.scrollTo?.(to, { immediate: true }); return done(); }
    if (window.lenis?.scrollTo) { window.lenis.scrollTo(to, { duration: 1.1, easing: inOut, force: true, onComplete: done }); setTimeout(() => { if (auto) done(); }, 1400); return; }
    const from = scrollY, t0 = performance.now();
    const step = now => { const k = clamp01((now - t0) / 1100); scrollTo(0, from + (to - from) * inOut(k)); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }
  key.addEventListener('click', e => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); autoPress(); });   // ⌘-click still opens a tab
  addEventListener('keydown', e => {
    if (e.key !== ' ' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || fired) return;
    const t = e.target; if (t.closest?.('input, textarea, select, [contenteditable]')) return;
    // a focused button or link you can see keeps its Space; one scrolled away (Take a look, clicked earlier) doesn't
    if (t !== key && t.closest?.('button, a')) { const b = t.getBoundingClientRect(); if (b.bottom > 0 && b.top < innerHeight) return; }
    const r = host.getBoundingClientRect(); if (r.top > innerHeight * .5 || r.bottom < innerHeight * .5) return;
    e.preventDefault(); if (t !== key) t.blur?.(); autoPress();
  });

  // the click: he hops. In the cube he stays on the page while it turns away and Fundamentals turns in; with the box he
  // goes, and his window, empty now, opens out to the whole screen (over the nav too), taking the page's own colour as
  // it grows, the colour Fundamentals then opens out of (day or night)
  let viaNav = false;
  async function fire() {
    fired = true; if (hint) hint.textContent = '\u00a0';
    key.style.setProperty('--travel', '0px'); key.classList.add('is-down');
    if (lean) { lean.max = 0; tiltKick(); }   // he leans back to straight while he says goodbye
    if (tinko.mood === 'asleep' || tinko.mood === 'cheering') tinko.awakeNow();
    if (!reduce) await tinko.cheer(1, true);
    if (cubeOn() && await turn()) return;
    if (!reduce) { win.querySelector('.tko-screen').classList.add('is-hidden'); await tinko.goAway(.8); await new Promise(r => setTimeout(r, 180)); }
    const cs = getComputedStyle(box);
    await openBox(box.getBoundingClientRect(), cs.backgroundColor, parseFloat(cs.borderTopLeftRadius) || 14);
  }
  // the cube (page code): the page as it is now turns away; true once Fundamentals faces you, and then it opens
  async function turn() {
    const bg = pageColour();
    if (!await window.tinkoCube.play({ bg, voidColour: isNight() ? '#070c18' : '#e2dbcf', night: isNight() })) return false;
    try { sessionStorage.setItem(HAND_OFF, JSON.stringify({ t: Date.now(), bg, mode: 'cube' })); } catch (e) {}
    location.assign(href);
    return true;
  }
  // the box: an empty window of his, growing from r to the whole screen
  async function openBox(r, card, round) {
    const bg = pageColour();
    cover = document.createElement('div'); cover.className = 'tkh tko-cover';
    cover.innerHTML = `<div class="tkh-win is-on"><div class="tkh-grain"></div><div class="tkh-lights"><i></i><i></i><i></i></div><div class="tkh-dash is-top"></div><div class="tkh-dash is-bottom"></div><div class="tkh-col"></div></div>`;
    Object.assign(cover.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.append(cover);
    const shell = cover.firstChild;
    if (reduce) shell.style.background = bg;
    else {
      const D = 950, opts = { duration: D, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' };
      const grow = cover.animate([{ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }, { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight + 'px' }], opts);
      shell.animate([{ backgroundColor: card, borderRadius: round + 'px' }, { backgroundColor: card, offset: .2 }, { backgroundColor: bg, borderRadius: '0px' }], opts);
      shell.querySelectorAll('.tkh-grain, .tkh-lights, .tkh-dash, .tkh-col').forEach(el => {
        const o = getComputedStyle(el).opacity;
        el.animate([{ opacity: o }, { opacity: o, offset: .3 }, { opacity: 0, offset: .85 }, { opacity: 0 }], { duration: D, fill: 'forwards' });
      });
      await grow.finished;
      await new Promise(r => setTimeout(r, 60));
    }
    try { sessionStorage.setItem(HAND_OFF, JSON.stringify({ t: Date.now(), bg })); } catch (e) {}
    location.assign(href);
  }
  // the nav's Fundamentals button: the same change from wherever you are (Rim, 24 Oct: a plain jump felt odd there).
  // The cube turns the page as it is; the box opens from the button. Hovering it starts loading the cube's far face.
  document.querySelectorAll('[data-tinko-to-fund]').forEach(a => {
    const early = () => { if (cubeOn()) window.tinkoCube.preload(href); };
    a.addEventListener('pointerenter', early); a.addEventListener('focus', early);
    a.addEventListener('click', async e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || fired) return;
      e.preventDefault(); fired = viaNav = true; early();
      if (cubeOn() && await turn()) return;
      const cs = getComputedStyle(box);
      await openBox(a.getBoundingClientRect(), cs.backgroundColor, 4);
    });
  });
  // the page's colour here (the section wears the site's background), the same one Fundamentals is drawn on
  function pageColour() {
    for (const el of [host, document.body, document.documentElement]) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; }
    return isNight() ? '#0e1628' : '#f1ede2';
  }
  // back from Fundamentals (the page kept in the browser's memory): no cover, he's back, the key half way up again
  addEventListener('pageshow', e => {
    if (!e.persisted || !fired) return;
    window.tinkoCube?.undo(); cover?.remove(); cover = null; fired = auto = armed = false; key.classList.remove('is-down'); win.querySelector('.tko-screen').classList.remove('is-hidden');
    try { sessionStorage.removeItem(HAND_OFF); } catch (err) {}
    tinko.awakeNow(); tinko.show(true);
    if (!viaNav) {   // from the key: back to half way up the press (from the nav you're where you were)
      const y = host.getBoundingClientRect().top + scrollY + (host.offsetHeight - innerHeight) * .5;
      scrollTo(0, y); window.lenis?.scrollTo?.(y, { immediate: true });
    }
    viaNav = false; paint(progress());
  });
  paint(progress());
}

/* ---------- Tinko peeking over the safety box (Rim, 24 Oct: "make Tinko peek over a section, hiding behind it") ----------
   The box sits above him (Webflow: .tinko-safe z-index 1, his spot behind its top edge), so its edge hides his lower half.
   He waits fully hidden and rises when the box comes into view; then he's himself: eyes after the pointer, blinks,
   a bwoop on a click. His eyes take the section's colour, so they read as holes, day or night. */
// a number that rolls in like an odometer: one column of digits per place, the right ones turning a little longer
function odometer(el, text) {
  const digits = [...text].filter(c => /\d/.test(c)).map(Number);
  el.innerHTML = [...text].map(c => /\d/.test(c) ? `<span class="tkr-dig"><span>${[...'01234567890123456789'].map(d => `<i>${d}</i>`).join('')}</span></span>` : `<span class="tkr-sep">${c}</span>`).join('');
  const cols = [...el.querySelectorAll('.tkr-dig > span')];
  // each window as wide as its own last digit (the heading font's figures aren't all one width), in em so it scales
  const fit = () => cols.forEach((col, i) => {
    const probe = document.createElement('span'); probe.textContent = digits[i]; probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    el.append(probe); col.parentElement.style.width = probe.offsetWidth / (parseFloat(getComputedStyle(el).fontSize) || 16) + .02 + 'em'; probe.remove();   // layout width (the card may be scaled), a hair over
  });
  document.fonts?.ready.then(fit);
  return dur => { fit(); cols.forEach((col, i) => {
    const to = `translateY(${-(10 + digits[i]) * 5}%)`;   // twenty digits a column: one is 5% of it
    if (!dur) { col.style.transform = to; return; }
    col.animate([{ transform: 'translateY(0)' }, { transform: to }], { duration: dur * (.7 + .3 * i / Math.max(1, cols.length - 1)), easing: 'cubic-bezier(.16,.84,.3,1)', fill: 'forwards' });
  }); };
}
// his celebration: square pixels in the window lights' colours, flying out and falling away
function burst(at, dir) {   // dir: fly away that way, within 100 degrees of it (else all round)
  const C = ['#FF5F57', '#FEBC2E', '#28C840', '#0297DB'];
  for (let i = 0; i < 30; i++) {
    const px = document.createElement('i'), a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - .5) * Math.PI * 100 / 180, d = 60 + Math.random() * 100, sz = 4 + Math.round(Math.random() * 4);
    Object.assign(px.style, { background: C[i % 4], width: sz + 'px', height: sz + 'px' }); at.append(px);
    px.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 24}px)`, opacity: 1, offset: .65 }, { transform: `translate(${Math.cos(a) * d * 1.12}px,${Math.sin(a) * d + 14}px)`, opacity: 0 }], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished.then(() => px.remove());
  }
}
/* ---------- The mess, slurped (Rim, 24 Oct: front-load the value. The homepage's file storm, the pain of the chaos,
   then all of it pulled into the Bin; the result card with the firework) ----------
   A pinned section (Webflow: .section_tinko-mess with its sticky pin and head, tall so the card holds a while). A
   canvas behind the pin carries the storm: the homepage strip's nine icons as sheets of paper (filled, so one hides
   the one behind it; Rim: "if it was paper, you couldn't see the other paper behind it"), more of the sad one, drifting
   both ways. Scrolling pulls them into the Bin beside Tinko, the bottom rows first; the Bin chews, the counter adds up.
   Then the head's second line comes in and the card opens: the result, not the work (Rim: sell Fire Mario, not the
   Fire Flower). The space you get back, your Mac's line going from busy to the course player's calm wave, and what
   stops bothering you. The site's own grid with its blue zips, and a firework flying away from the card. Example
   figures. Scrolling back lets the files fly out again. */
const FILE_STRIP = new URL('./media/file-strip.svg', import.meta.url).href;
const FILE_BOX = [[0, 25.8, 48, 55.5], [66.3, 9.3, 51.3, 56.5], [137.8, 25.8, 48, 55.5], [208.3, 14.5, 41, 35.8], [285, 1.8, 51, 58.8], [360.8, 5, 59.5, 56.8], [438, 8.3, 36, 42.5], [493, 15.5, 52.3, 49.8], [552.5, 4.8, 42.3, 49.3]];
const SAD = 6;   // the strip's one sad file
const MESS = { gb: '104.6', time: '8 min 40 s', stats: [['10', 'background jobs that no longer run'], ['11', 'apps that can’t ping you any more'], ['50', 'newsletters you’ll never get again']] };   // Rim, 24 Oct: the jobs as a third; the time back ("juicy"), in one element with All done
let stripImg = null;
const loadStrip = () => stripImg || (stripImg = new Promise(done => { const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.onload = () => done(im); im.onerror = () => done(null); im.src = FILE_STRIP; }));
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// the nine icons as sheets of paper, drawn once at the size they're shown (sharp on retina): the outline in ink, the
// paper inside it (whatever a fill from the edges can't reach, the outline grown a pixel so its corner steps don't
// leak), and a soft shadow under it
function fileSprites(im, h, ink, paper, shade, dpr) {
  const [ir, ig, ib] = rgbOf(ink), [pr, pg, pb] = rgbOf(paper);
  return FILE_BOX.map(([x, y, w, bh]) => {
    const k = h / 56, u = (im.naturalWidth || 597) / 597, W = Math.ceil(w * k * dpr), H = Math.ceil(bh * k * dpr);
    const o = document.createElement('canvas'); o.width = W; o.height = H; const og = o.getContext('2d');
    og.drawImage(im, x * u, y * u, w * u, bh * u, 0, 0, W, H);
    const d = og.getImageData(0, 0, W, H), px = d.data, n = W * H, wall = new Uint8Array(n), out = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (px[i * 4 + 3] > 40) wall[i] = 1;
    const grown = wall.slice();
    for (let i = 0; i < n; i++) if (wall[i]) { const xx = i % W; if (xx) grown[i - 1] = 1; if (xx < W - 1) grown[i + 1] = 1; if (i >= W) grown[i - W] = 1; if (i < n - W) grown[i + W] = 1; }
    const q = [], go = i => { if (!out[i] && !grown[i]) { out[i] = 1; q.push(i); } };
    for (let xx = 0; xx < W; xx++) { go(xx); go(n - W + xx); } for (let yy = 0; yy < H; yy++) { go(yy * W); go(yy * W + W - 1); }
    while (q.length) { const i = q.pop(), xx = i % W; if (xx) go(i - 1); if (xx < W - 1) go(i + 1); if (i >= W) go(i - W); if (i < n - W) go(i + W); }
    const edge = i => { const xx = i % W; return (xx && out[i - 1]) || (xx < W - 1 && out[i + 1]) || (i >= W && out[i - W]) || (i < n - W && out[i + W]); };
    for (let i = 0; i < n; i++) { if (!grown[i] || wall[i]) continue; if (edge(i)) out[i] = 2; }   // the grown rim on the outside stays outside
    for (let i = 0; i < n; i++) {
      const j = i * 4, a = px[j + 3] / 255;
      if (out[i]) { px[j] = ir; px[j + 1] = ig; px[j + 2] = ib; continue; }   // outside: the outline's soft edge, in ink
      px[j] = ir * a + pr * (1 - a); px[j + 1] = ig * a + pg * (1 - a); px[j + 2] = ib * a + pb * (1 - a); px[j + 3] = 255;
    }
    og.putImageData(d, 0, 0);
    const P = Math.ceil(4 * dpr), c = document.createElement('canvas'); c.width = W + 2 * P; c.height = H + 2 * P;
    const g = c.getContext('2d'); g.shadowColor = shade; g.shadowBlur = 5 * dpr; g.shadowOffsetY = 1.5 * dpr; g.drawImage(o, P, P);
    return { c, w: c.width / dpr, h: c.height / dpr };
  });
}
// a seeded random, so the storm is the same on every visit (and between a resize and the next)
const seeded = n => () => (n = n * 16807 % 2147483647) / 2147483647;
// a smooth random line, for the busy Mac (value noise: a fixed table, eased between its steps)
const NOISE = (() => { const r = seeded(11); return Array.from({ length: 256 }, () => r()); })();
const noise = u => { const i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f); return NOISE[i & 255] * (1 - s) + NOISE[(i + 1) & 255] * s; };
function initMess(host) {
  const section = host.closest('section') || host, pin = host.parentElement, head = pin.querySelector('.tinko-mess_head'), then = pin.querySelector('[data-tinko-mess-then]') || pin.querySelector('.tinko-mess_head em');
  host.innerHTML = `<div class="tkm-dock"><div class="tkm-tinko"><div class="tkh-tinko" role="img" aria-label="Tinko"></div></div><div class="tkm-bin"><img alt="" src="${MAC('trash-empty')}"><img alt="" src="${MAC('trash-full')}"></div><div class="tkm-count"><b>0.0</b> GB<span>into the Bin</span></div></div>
    <div class="tkm-card" role="img" aria-label="An example result: all done in ${MESS.time}. ${MESS.gb} GB free again, and your Mac runs smoother. ${MESS.stats.map(([n, t]) => n + ' ' + t).join(', ')}.">
      ${LIGHTS}<div class="tkd-dash is-top"></div><div class="tkd-dash is-bottom"></div><div class="tkm-col" aria-hidden="true"></div>
      <div class="tkm-body"><div class="tkm-head">
      <div class="tkm-top"><span class="tkm-chip">All done <b>in ${MESS.time}</b></span></div>
      <div class="tkm-gb"><span class="tkr-odo" aria-hidden="true"></span><small>GB</small></div><div class="tkm-label">free again</div></div>
      <div class="tkm-mac"><span class="tkm-mac_name">Your Mac</span><svg class="tkm-wave" viewBox="0 0 600 44" preserveAspectRatio="none" aria-hidden="true"><path/></svg><span class="tkm-mac_state"><i>Busy</i><i>Runs smoother</i></span></div>
      <div class="tkm-stats">${MESS.stats.map(([n, t]) => `<div><b data-to="${n}">0</b><span>${t}</span></div>`).join('')}</div></div></div>
    <div class="tkm-fx" aria-hidden="true"></div>`;
  pin.classList.add('tkm-pin'); host.classList.add('tkm-stage');
  const cv = document.createElement('canvas'); cv.className = 'tkm-storm'; cv.setAttribute('aria-hidden', 'true'); pin.prepend(cv);
  const g = cv.getContext('2d'), dock = host.querySelector('.tkm-dock'), bin = host.querySelector('.tkm-bin'), count = host.querySelector('.tkm-count b');
  const card = host.querySelector('.tkm-card'), fx = host.querySelector('.tkm-fx'), roll = odometer(card.querySelector('.tkr-odo'), MESS.gb);
  const tinko = makeTinko(host.querySelector('.tkh-tinko'), {}); tinko.awakeNow();
  if (then) then.classList.add('tkm-then');
  const TOTAL = parseFloat(MESS.gb);
  // the scroll's beats: the files leave between LEAVE[0] and LEAVE[1], the card comes at UP and holds to the end
  const LEAVE = [.06, .4], UP = .46, DOWN = .42;

  // the storm: rows across the pin, each sheet with its own icon, tilt, size and moment to leave
  let W = 0, H = 0, dpr = 1, sprites = [], files = [], binAt = { x: 0, y: 0 }, im = null, night = isNight(), headBand = [0, 0];
  function layout() {
    dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const phone = W < 600, ih = phone ? 28 : 40, gap = phone ? 46 : 62, top = phone ? 64 : 84, bottom = H - (phone ? 140 : 150);
    const rows = Math.max(4, Math.floor((bottom - top) / gap) + 1);
    // beige sheets, as on the homepage's storm (Rim: the text's colour was too loud), the paper a shade lighter than the page
    if (im) sprites = night ? fileSprites(im, ih, '#3a4662', '#141d33', 'rgba(0,0,0,.3)', dpr) : fileSprites(im, ih, '#d3c8ba', '#fbf7ee', 'rgba(61,58,53,.07)', dpr);
    const r = bin.getBoundingClientRect(), pr = cv.getBoundingClientRect(); binAt = { x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height * .42 };
    if (head) { const hr = head.getBoundingClientRect(); headBand = [hr.top - pr.top - 10, hr.bottom - pr.top + 10]; }
    placeCard();
    const rnd = seeded(7), step = ih * 1.5, cols = Math.ceil(W / step) + 2, old = new Map(files.map(f => [f.id, f.fl]));
    files = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const down = (row + .5) / rows, y = top + row * (bottom - top) / Math.max(1, rows - 1) + (rnd() - .5) * gap * .75;
      const pick = rnd(), s = pick < .26 ? SAD : [0, 1, 2, 3, 4, 5, 7, 8][Math.floor(rnd() * 8)], k = .7 + rnd() * .55 + (rnd() < .07 ? .65 : 0) + (s === SAD ? .12 : 0);
      const thin = y > headBand[0] && y < headBand[1] && rnd() < .6;   // fewer sheets behind the title
      const f = { id: row * 1000 + col, x0: col * step + (row % 2) * step * .5 + rnd() * step * .3, y, span: cols * step, dir: row % 2 ? 1 : -1, v: 14 + (row % 3) * 9 + rnd() * 6,
        s, k, tilt: (rnd() - .5) * .6, ph: rnd() * 6.3,
        // the bottom rows (nearest the Bin) go first, then the ones above, each a little earlier or later
        t: LEAVE[0] + (1 - down) * (LEAVE[1] - LEAVE[0] - .08) + rnd() * .08, lift: 20 + rnd() * 70, spin: (rnd() - .5) * 7, mb: .3 + rnd(), fl: 0 };
      if (!thin) files.push(f);
    }
    files.forEach(f => { f.fl = old.get(f.id) || 0; });   // keep where each one was on its way (a resize mid-slurp)
    files.sort((a, b) => a.k - b.k);   // the small ones behind, the big ones on top
    // their share of the GB: the big ones count more
    const sum = files.reduce((a, f) => a + f.mb, 0); files.forEach(f => { f.mb /= sum; });
  }
  // the card sits between the head and the dock, as big as fits there
  function placeCard() {
    const pr = pin.getBoundingClientRect(), hb = head ? head.getBoundingClientRect().bottom - pr.top : 0, dt = dock.getBoundingClientRect().top - pr.top;
    const room = dt - hb - 28, ch = card.offsetHeight || 1;
    card.style.setProperty('--fit', Math.min(1, Math.max(.55, room / ch)).toFixed(3));
    card.style.top = Math.round(hb + 14 + Math.max(0, room - ch) / 2) + 'px';
  }
  // a file leaves once the scroll is past its moment and comes back if you scroll back above it; the flight itself
  // takes its own time (it doesn't stop mid-air when you stop scrolling)
  const FLY = .75;
  let p = 0, shown = false, gulp = 0, run = 0, visible = false, before = 0, fired = false;
  const progress = () => { const r = section.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp01(-r.top / span) : 0; };
  function frame(now) {
    run = 0; if (!visible) return;
    const T = reduce ? 0 : now / 1000, P = reduce ? 1 : p, dt = Math.min(.05, (now - (before || now)) / 1000); before = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    let gb = 0, landed = 0, moving = false, flying = 0;
    for (const f of files) {
      const to = P >= f.t ? 1 : 0, was = f.fl;
      f.fl = reduce ? to : to ? Math.min(1, f.fl + dt / FLY) : Math.max(0, f.fl - dt / FLY);
      if (was < 1 && f.fl >= 1) gulp = 1;
      if (f.fl !== was) moving = true;
      gb += f.mb * f.fl;
      if (f.fl >= 1) { landed++; continue; }
      if (!sprites.length) continue;
      if (f.fl > 0) flying++;
      const sp = sprites[f.s], w = sp.w * f.k, h = sp.h * f.k;
      let x = ((f.x0 + f.dir * f.v * T) % f.span + f.span) % f.span - w, y = f.y + Math.sin(T * 1.1 + f.ph) * 3, rot = f.tilt + Math.sin(T * .7 + f.ph) * .06, sc = 1;
      if (f.fl > 0) {   // on its way: pulled, slow to let go and then fast, in a low arc into the Bin's mouth, shrinking and turning
        const e = Math.pow(f.fl, 1.7), cx = x + (binAt.x - x) * .35, cy = Math.min(y, binAt.y) - f.lift, u = 1 - e;
        x = u * u * x + 2 * u * e * cx + e * e * (binAt.x - w / 2); y = u * u * y + 2 * u * e * cy + e * e * (binAt.y - h / 2);
        // the last stretch spirals into the Bin's mouth, like water down a drain
        if (e > .5) { const q = (e - .5) / .5, r = 22 * Math.sin(q * Math.PI) * (1 - q * .5), an = q * 10 + f.ph; x += Math.cos(an) * r; y += Math.sin(an) * r * .4; }
        rot += f.spin * e; sc = 1 - .78 * e;
      }
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.scale(sc, sc); g.drawImage(sp.c, -w / 2, -h / 2, w, h); g.restore();
    }
    // the Bin chews while they land
    gulp *= .84; bin.style.transform = `translateY(${gulp * 3}px) scale(${1 + gulp * .16},${1 - gulp * .08}) rotate(${Math.sin(now / 40) * gulp * 4}deg)`;
    bin.classList.toggle('is-full', gb > .02);
    count.textContent = (TOTAL * gb).toFixed(1);
    dock.classList.toggle('is-busy', flying > 0);
    if (flying && !fired) { fired = true; tinko.bwoop?.(); }
    if (!flying && gb < .001) fired = false;
    // the card: once you're far enough and all of it is in; it holds until the section ends
    const done = P >= UP && landed === files.length;
    if (done !== shown && (done || P < DOWN)) { shown = done; show(done); }
    if (then) then.classList.toggle('is-on', P >= DOWN);
    dock.classList.toggle('is-done', shown);
    // the drift needs every frame while any of the storm is still out; once it's all in, only a scroll wakes it
    if (landed < files.length || moving || gulp > .01) run = requestAnimationFrame(frame);
  }

  // the card: the odometer, your Mac's line settling, the stats, the zips and the firework
  const mac = card.querySelector('.tkm-mac'), wave = card.querySelector('.tkm-wave path'), gridEl = card.querySelector('.tkm-head');
  let upAt = 0, waveRun = 0, zipT = 0, zips = 0, cols = null;
  function show(on) {
    card.classList.toggle('is-on', on);
    if (!on) { mac.classList.remove('is-calm'); return; }
    upAt = performance.now(); roll(reduce ? 0 : 2200);
    const css = getComputedStyle(card); cols = [css.getPropertyValue('--c-soft'), css.getPropertyValue('--c-calm')].map(c => rgbOf(c.trim()));
    card.querySelectorAll('.tkm-stats b').forEach((b, i) => { if (reduce) { b.textContent = b.dataset.to; return; } const to = +b.dataset.to, t0 = performance.now() + 900 + i * 260; const step = now => { const k = clamp01((now - t0) / 900); b.textContent = Math.round(to * out(k)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
    if (!reduce) {
      setTimeout(() => tinko.cheer(2), 300);
      // five bursts around the card's edge, each flying away from it (the TINKO session's win screen: the numbers stay clear)
      [[0, .2], [1, .26], [.08, 1], [.92, 1], [.5, 0]].forEach(([fxp, fyp], i) => setTimeout(() => {
        if (!card.classList.contains('is-on')) return;
        const a = document.createElement('div'), r = card.getBoundingClientRect(), hr = host.getBoundingClientRect();
        a.className = 'tkm-boom'; a.style.left = r.left - hr.left + r.width * fxp + 'px'; a.style.top = r.top - hr.top + r.height * fyp + 'px';
        fx.append(a); burst(a, Math.atan2((fyp - .5) * r.height, (fxp - .5) * r.width)); setTimeout(() => a.remove(), 2000);
      }, 650 + i * 170));
    }
    if (!waveRun) waveRun = requestAnimationFrame(tickWave);
  }
  // your Mac's line: busy and jagged (all those jobs), settling into the course player's wave (course/v2.js: a sine,
  // blue, one wave every 1.3 s) as the card comes up; then it keeps flowing while it's on screen
  const mid = 22;
  function drawWave(c, t) {
    let d = '';
    for (let x = 0; x <= 600; x += 4) {
      const busy = (noise(x * .11 + t * 9) - .5) * 30 + (noise(x * .37 + t * 17 + 50) - .5) * 16 + Math.max(0, noise(x * .045 + t * 4 + 99) - .7) * 60 * (noise(x * .9 + 7) > .5 ? 1 : -1);
      const calm = 12 * Math.sin(x / 80 * Math.PI * 2 - t / 1.3 * Math.PI * 2);
      d += (x ? 'L' : 'M') + x + ' ' + (mid + busy * (1 - c) + calm * c).toFixed(1);
    }
    wave.setAttribute('d', d);
    if (cols) wave.style.stroke = `rgb(${cols[0].map((v, i) => Math.round(v + (cols[1][i] - v) * c)).join(',')})`;
  }
  function tickWave(now) {
    waveRun = 0; if (!card.classList.contains('is-on') || !visible) return;
    const age = (now - upAt) / 1000, c = reduce ? 1 : inOut(clamp01((age - .7) / 2.4));
    mac.classList.toggle('is-calm', c > .65);
    drawWave(c, reduce ? 0 : now / 1000);
    // the site's grid zips (main.js dfsGridZips): now and then one thin blue line glides down a line of the head's grid
    if (!reduce && now > zipT && zips < 4) {
      zipT = now + 300 + Math.random() * 700;
      const cw = gridEl.clientWidth, ch = gridEl.clientHeight, n = Math.floor(cw / 32), len = 56 + Math.random() * 100, travel = Math.min(140 + Math.random() * 220, ch - len - 10);
      if (n > 2 && travel > 60) {
        const z = document.createElement('span'); z.className = 'dfs-grid-zip';
        Object.assign(z.style, { left: (1 + Math.floor(Math.random() * (n - 1))) * 32 + 'px', top: Math.random() * (ch - len - travel) + 'px', height: len + 'px' });
        gridEl.append(z); zips++;
        z.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: .33 }, { opacity: 1, offset: .66 }, { transform: `translateY(${travel}px)`, opacity: 0 }], { duration: 1400 + Math.random() * 1200, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' }).finished.then(() => { z.remove(); zips--; });
      }
    }
    waveRun = requestAnimationFrame(tickWave);
  }
  drawWave(0, 0);
  const kick = () => { if (!run && visible) run = requestAnimationFrame(frame); };
  addEventListener('scroll', () => { p = progress(); kick(); }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; tinko.show(visible); if (visible) { p = progress(); kick(); if (shown && !waveRun) waveRun = requestAnimationFrame(tickWave); } }).observe(section);
  new ResizeObserver(() => { layout(); kick(); }).observe(pin);
  new MutationObserver(() => { const n = isNight(); if (n !== night) { night = n; layout(); kick(); if (shown) { const css = getComputedStyle(card); cols = [css.getPropertyValue('--c-soft'), css.getPropertyValue('--c-calm')].map(c => rgbOf(c.trim())); } } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  loadStrip().then(i => { im = i; layout(); kick(); });
  layout();
}

/* ---------- Tinko comes with a course (Rim, 24 Oct: the course as it really runs: "a welcome, the install step, Tinko
   pops up, a new video, then Tinko activates again; the main thing is Tinko actually open on top of it"; the menu opens
   each lesson smoothly, as in the real course) ----------
   Webflow: .tinko-course_flow [data-tinko-course] with .tinko-course_player (its .tinko-course_step children, in order:
   a lesson, data-step-video = the lesson on Bunny, data-from / -to = the seconds that play; data-step="install"; or
   data-step="tinko") and .tinko-course_menu. The player plays them in turn: 0.1 Welcome (Rim, muted); 0.2 Install
   Tinko, and his window opens on top of the course with his hello, then closes; 1.1 (a stand-in clip until the real one
   is recorded); 1.2 Clear your Mac, "Start stage 1", and his window opens on top again, on the desktop. The V2 menu
   beside it opens the playing module and lights its lesson with the course wave. Only while it's on screen. */
const BUNNY = id => `https://vz-87a2c68f-2a7.b-cdn.net/${id}`;
// the seconds that play, cut ahead as their own small files (meet/media/course, 720p, ~100 KB each): streaming the whole
// lesson from Bunny to loop 8 s buffered 3 to 11 MB (audit, 24 Oct). Keyed by the step's video id and data-from; a
// step whose id or seconds change in Webflow plays from Bunny again until its clip is cut (ffmpeg -ss from -t length).
const CLIPS = { 'dcf95851-4ac1-4e1a-b9a8-de42d1b05d05@28': ['lesson-0.1.mp4', 8], '6694a1e6-f506-4519-85b8-49cae1648096@9': ['lesson-1.1.mp4', 9] };
// the course player's wave (course/v2.js: a sine, 3.6 high in 12, one wave every 13): drawn long, slid along one wave
const wave = () => { let d = ''; for (let x = 0; x <= 66; x++) d += (x ? 'L' : 'M') + x + ' ' + (6 + 3.6 * Math.sin(x / 13 * Math.PI * 2)).toFixed(2); return `<svg class="tkc-wave" viewBox="0 0 40 12" fill="none" aria-hidden="true"><path d="${d}"/></svg>`; };
const CHEV = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>';
// the V2 menu (courses/fundamentals-v2, 24 Oct), a few lessons per module
const COURSE = [
  ['0: Start', [['0.1', 'Welcome', '3:09'], ['0.2', 'Install Tinko', 'Action']]],
  ['1: Clear', [['1.1', 'What Tinko does', '3:00'], ['1.2', 'Clear your Mac', 'Tinko'], ['1.3', 'Distractions purge', '3:00']]],
  ['2: Setup', [['2.1', 'What’s inside', '3:00'], ['2.2', 'Set up your tools', 'Tinko']]],
  ['3: Tend', [['3.1', 'The invisible clutter', '3:59'], ['3.2', 'Clarity principles', '6:00']]],
  ['4: Flow', [['4.1', 'How I navigate', '10:00'], ['4.2', 'One-key capture', 'Action']]],
];
const lessonName = n => COURSE.flatMap(m => m[1]).find(l => l[0] === n)?.[1] || '';
function initCourse(host) {
  const player = host.querySelector('.tinko-course_player'), menu = host.querySelector('.tinko-course_menu');
  if (!player || !menu) return;
  const corner = n => `<div class="tkc-stage_corner"><b>Digital<br>Feng Shui</b><span>Lesson ${n}<br>${lessonName(n)}</span></div>`;
  const steps = [...player.querySelectorAll('.tinko-course_step')].map(el => {
    const st = { el, mod: +el.dataset.module || 0, lesson: el.dataset.lesson || '', kind: el.dataset.step || 'video' };
    if (st.kind === 'install') {
      el.innerHTML = `<div class="tkc-stage">${corner(st.lesson)}<div class="tkc-install"><span class="tkc-install_tag">Action</span><b>Install Tinko</b><div class="tkc-bar"><i></i></div><span class="tkc-install_note">Installing Tinko…</span></div></div>`;
    } else if (st.kind === 'tinko') {
      el.innerHTML = `<div class="tkc-stage">${corner(st.lesson)}<div class="tkc-start">Start stage 1 <i><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5"/></svg></i></div><div class="tkc-path">Open menu › Stage 1</div></div>`;
    } else {
      st.from = +el.dataset.from || 0; st.to = +el.dataset.to || st.from + 8;
      const clip = CLIPS[`${el.dataset.stepVideo}@${st.from}`];
      const src = clip ? new URL(`./media/course/${clip[0]}`, import.meta.url).href : `${BUNNY(el.dataset.stepVideo)}/play_360p.mp4#t=${st.from}`;
      if (clip) { st.to = Math.min(st.to - st.from, clip[1]); st.from = 0; }
      const v = st.v = document.createElement('video');
      v.className = 'tkc-video'; v.muted = v.defaultMuted = v.playsInline = v.disablePictureInPicture = true; v.preload = 'none'; v.tabIndex = -1;
      ['muted', 'playsinline', 'aria-hidden'].forEach(a => v.setAttribute(a, a === 'aria-hidden' ? 'true' : ''));
      v.addEventListener('loadeddata', () => el.classList.add('is-in'));
      // its seconds, over and over if it's still on (no end in the #t: an end there pauses it for good)
      v.addEventListener('timeupdate', () => { if (v.currentTime >= st.to - .06 || v.currentTime < st.from - .5) v.currentTime = st.from; });
      el.append(v);
      st.load = () => { if (!v.src) { v.preload = 'auto'; v.src = src; } };
    }
    return st;
  });
  if (!steps.length) return;
  player.setAttribute('role', 'img');
  player.setAttribute('aria-label', 'The Fundamentals course: the welcome lesson, Tinko installing and saying hello, the next lesson, then Tinko starting the Mac cleanup.');

  // his window, on top of the course (his real window: lights, the dashed lines, the column, his screens)
  const wrap = document.createElement('div'); wrap.className = 'tkc-wrap';
  player.before(wrap); wrap.append(player);
  const win = document.createElement('div'); win.className = 'tkd-win tkc-win'; win.setAttribute('aria-hidden', 'true');
  win.innerHTML = `<div class="tkd-grain"></div>${LIGHTS}<div class="tkd-dash is-top"></div><div class="tkd-dash is-bottom"></div><div class="tkd-col"><div class="tkd-stage"><div class="tkh-tinko tkd-tinko"></div><div class="tkd-screen"></div></div></div>`;
  wrap.append(win);
  const tinko = makeTinko(win.querySelector('.tkd-tinko')), screen = win.querySelector('.tkd-screen');
  const showScreen = html => { screen.classList.add('is-swap'); screen.innerHTML = html; requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('is-swap'))); };
  const press = k => { const b = screen.querySelector(`[data-k="${k}"]`); if (b) { b.classList.add('is-press'); setTimeout(() => b.classList.remove('is-press'), 200); } };
  const fitWin = () => win.style.setProperty('--k', Math.min(1, wrap.clientWidth * (innerWidth < 768 ? .84 : .62) / 614).toFixed(3));
  new ResizeObserver(fitWin).observe(wrap); fitWin();
  const openWin = on => { win.classList.toggle('is-open', on); tinko.show(on); };

  // the menu, built once: a module opens and closes like the course's own accordion, the lit row moves
  menu.innerHTML = `<div class="tkc-menu">${COURSE.map(([title, rows], m) => `<div class="tkc-modwrap" data-m="${m}"><div class="tkc-mod"><b>${title}</b><i class="tkc-chev">${CHEV}</i></div><div class="tkc-lessons"><div class="tkc-lessons_in">${rows.map(([n, name, tail]) => `<div class="tkc-row" data-l="${n}"><span class="tkc-box"></span><b>${n}: ${name}</b><em>${tail}</em>${wave()}</div>`).join('')}</div></div></div>`).join('')}</div>`;
  const setMenu = (mod, lesson) => {
    menu.querySelectorAll('.tkc-modwrap').forEach(w => w.classList.toggle('is-open', +w.dataset.m === mod));
    menu.querySelectorAll('.tkc-row').forEach(r => r.classList.toggle('is-now', r.dataset.l === lesson));
  };

  // the sequence; each step's beats run on a token, so leaving the screen (or the next step) cancels them
  let i = -1, token = 0, visible = false;
  const later = (fn, ms) => { const t = token; setTimeout(() => { if (t === token && visible) fn(); }, ms); };
  const BEATS = {
    video: st => { st.load(); try { st.v.currentTime = st.from; } catch (e) {} st.v.play().catch(() => {}); return (st.to - st.from) * 1000; },
    install: st => {
      const bar = st.el.querySelector('.tkc-bar'), note = st.el.querySelector('.tkc-install_note');
      bar.classList.remove('is-run'); note.textContent = 'Installing Tinko…'; requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-run')));
      later(() => { note.textContent = 'Tinko is ready'; }, 2100);
      later(() => {
        tinko.sleep();
        showScreen(S.tag('Hi there') + S.words('I’m Tinko, and I’ll be helping with your Digital Feng Shui setup. Let me take a look at what you’re working with.') + S.btns(S.btn('Take a look', 'space')));
        openWin(true); tinko.wakeUp(.6);
      }, 2400);
      later(() => { press('space'); tinko.cheer(1); }, 6200);
      later(() => openWin(false), 7100);
      return 7900;
    },
    tinko: st => {
      const b = st.el.querySelector('.tkc-start');
      later(() => { b.classList.add('is-press'); setTimeout(() => b.classList.remove('is-press'), 220); }, 1100);
      later(() => {
        tinko.awakeNow();
        showScreen(S.tag('Your desktop') + S.words('Now we’re looking at the desktop. A proper pile, but nothing I can’t handle.') + S.stats([[7, 'files'], [1, 'folder'], [4, 'screenshots']]) + S.btns(S.btn('Clean up', 'space'), S.btn('Skip', 's', true)));
        openWin(true); tinko.bwoop?.();
      }, 1500);
      const fixes = ['A Screenshots folder in Documents', 'New screenshots go there', 'No floating thumbnail', 'The desk sorts itself, by date added'];
      later(() => press('space'), 4600);
      // the quick fixes come in once, then tick one by one in place (no new screen per tick, so nothing blinks)
      later(() => showScreen(S.tag('Quick fixes') + S.words('A home for your screenshots, and a desk that keeps itself in order.') + S.fixes(fixes, 0) + S.btns(S.btn('Next', 'space'))), 4900);
      for (let f = 0; f < 4; f++) later(() => screen.querySelectorAll('.tkd-fixes > div')[f]?.classList.add('is-done'), 5500 + f * 380);
      later(() => tinko.cheer(1), 6900);
      later(() => openWin(false), 8600);
      return 9400;
    },
  };
  const play = k => {
    token++; i = k % steps.length; const st = steps[i];
    steps.forEach((o, j) => { o.el.classList.toggle('is-on', j === i); if (o.v && j !== i) o.v.pause(); });
    if (st.kind !== 'install' && st.kind !== 'tinko') openWin(false);
    setMenu(st.mod, st.lesson);
    steps[(i + 1) % steps.length].load?.();
    const dur = BEATS[st.kind](st);
    later(() => play(i + 1), dur);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (reduce) return;
    if (visible) play(i < 0 ? 0 : i);
    else { token++; steps.forEach(st => st.v?.pause()); openWin(false); }
  }, { threshold: .25 }).observe(wrap);
  new IntersectionObserver(([e]) => { if (e.isIntersecting) steps[0].load?.(); }, { rootMargin: '600px 0px' }).observe(wrap);
  setMenu(steps[0].mod, steps[0].lesson); steps[0].el.classList.add('is-on');
}

/* ---------- The overview's tiles as one row that keeps moving, inside the page's side lines (Rim, 24 Oct: "one row,
   a marquee that keeps moving within the sidelines") ----------
   Webflow: .tinko-tiles with its tile links. The row gets a copy of itself to run seamlessly (the copy hidden from
   screen readers and the keyboard) and a window as wide as the space between the side lines. It never stops (Rim). */
function initTiles(row) {
  if (row.closest('.tkt-view')) return;
  const view = document.createElement('div'); view.className = 'tkt-view';
  row.parentNode.insertBefore(view, row); view.append(row);
  [...row.children].forEach(t => { const c = t.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; c.classList.add('is-copy'); row.append(c); });
  row.classList.add('is-marquee');
  const fit = () => {
    const lines = document.querySelector('.page_side-lines'), pr = view.parentElement.getBoundingClientRect();
    if (lines) { const r = lines.getBoundingClientRect(); view.style.marginLeft = r.left + 1 - pr.left + 'px'; view.style.marginRight = pr.right - r.right + 1 + 'px'; }
    row.style.setProperty('--tkt-d', (row.scrollWidth / 2 / 40).toFixed(1) + 's');   // 40 px a second
  };
  new ResizeObserver(fit).observe(view.parentElement); fit();
}

/* ---------- The safety sticker (Rim, 24 Oct: the peeking Tinko "feels generated"; a small box, framed stronger, with a
   badge like the Echo sticker; Apple-approved is where it's heading, not yet: Tinko isn't notarized, so the ring says
   only what's true today) ----------
   Webflow: .tinko-safebox with [data-tinko-badge]. A scalloped sticker, tilted a little, the whole edge with its words
   turning slowly (as on Echo's); the Apple mark in the middle (Rim, 24 Oct). A staging exploration: on live only once
   Tinko is notarized, with "NOTARIZED BY APPLE" on the ring, and only if Apple's rules allow the mark. */
// Rim asked for a certificate-like line ("Apple Certified", "Safe Certified"): not true yet, and Apple doesn't allow
// implying its approval, so a stamp of what's true; "NOTARIZED BY APPLE" once it is
const BADGE_WORDS = 'SAFE BY DESIGN • SAFE BY DESIGN • SAFE BY DESIGN • ';
function initBadge(host) {
  const N = 26, R = 100, A = 4.2;   // bumps, radius, bump depth (in a 220 box)
  let d = '';
  for (let i = 0; i <= 360; i++) { const t = i / 180 * Math.PI, r = R + A * Math.cos(N * t); d += (i ? 'L' : 'M') + (110 + r * Math.cos(t)).toFixed(2) + ' ' + (110 + r * Math.sin(t)).toFixed(2); }
  const id = 'tkb-' + Math.random().toString(36).slice(2, 7);
  host.innerHTML = `<div class="tkb"><svg class="tkb-svg" viewBox="0 0 220 220" aria-hidden="true">
      <defs><path id="${id}" d="M110 110m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0"/></defs>
      <g class="tkb-spin"><path class="tkb-edge" d="${d}Z"/><circle class="tkb-ring" cx="110" cy="110" r="60"/>
        <text class="tkb-words"><textPath href="#${id}" textLength="476" lengthAdjust="spacing">${BADGE_WORDS}</textPath></text></g>
      </svg>
    <div class="tkb-apple">${APPLE}</div></div>`;
  host.setAttribute('role', 'img'); host.setAttribute('aria-label', 'A sticker: safe by design.');
}

// the first colour behind an element (sections can be see-through), for eyes that should read as holes
function backdrop(el) {
  for (let n = el.parentElement; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; }
  return isNight() ? '#0e1628' : '#f1ede2';
}
function initPeek(host) {
  host.classList.add('tko-peek');
  host.innerHTML = '<div class="tkh-tinko" role="img" aria-label="Tinko, peeking over the edge of the box"></div>';
  const tinko = makeTinko(host.firstChild, {});
  tinko.awakeNow();
  const tone = () => host.style.setProperty('--c-card', backdrop(host));
  tone(); new MutationObserver(tone).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const box = host.parentElement.querySelector('.tinko-safe') || host;
  let up = false;
  new IntersectionObserver(([e]) => {
    tinko.show(e.isIntersecting);
    if (e.isIntersecting && e.intersectionRatio > .45 && !up) { up = true; setTimeout(() => host.classList.add('is-up'), reduce ? 0 : 250); }
  }, { threshold: [0, .45] }).observe(box);
}

const OUTRO_CSS = `
.tkm-pin{isolation:isolate}.tkm-pin .tinko-mess_head{position:relative;z-index:2}
.tkm-storm{position:absolute;top:0;left:var(--_ui-styles---stroke--padding,0px);width:calc(100% - 2 * var(--_ui-styles---stroke--padding,0px));height:100%;z-index:0;pointer-events:none}
/* the sheets behind the title soften (a blur that fades out at its edges) */
.tkm-pin .tinko-mess_head::before{content:"";position:absolute;inset:-1.5rem -5rem;z-index:-1;pointer-events:none;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);-webkit-mask-image:radial-gradient(closest-side,#000 50%,transparent);mask-image:radial-gradient(closest-side,#000 50%,transparent)}
.tkm-stage{position:absolute!important;inset:0;z-index:1;pointer-events:none}.tkm-stage .tinko-ph{display:none!important}.tkm-dock,.tkm-card{pointer-events:auto}
.tkm-then{display:inline-block;clip-path:inset(0 100% 0 0);transition:clip-path .9s cubic-bezier(.625,.05,0,1)}.tkm-then.is-on{clip-path:inset(0 -5% 0 0)}
.tkm-dock{--c-ink:#3d3a36;--c-card:#f1ede2;--tkh-cell:6px;position:absolute;left:50%;bottom:1.5rem;display:flex;align-items:flex-end;gap:1rem;transform:translateX(-50%);transition:opacity .5s,transform .6s cubic-bezier(.625,.05,0,1)}
.dfs-night .tkm-dock{--c-ink:#fbf7ef;--c-card:#0e1628}
.tkm-bin{position:relative;width:64px;height:64px;transform-origin:50% 90%}.tkm-bin img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .25s}.tkm-bin img+img{opacity:0}.tkm-bin.is-full img{opacity:0}.tkm-bin.is-full img+img{opacity:1}
.tkm-count{min-width:7.5rem;padding-bottom:.6rem;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-ink)}
.tkm-count b{font-family:var(--_typography---font-styles--heading),Georgia,serif;font-size:2rem;font-weight:400;letter-spacing:0;font-variant-numeric:tabular-nums}
.tkm-count span{display:block;margin-top:.2rem;font-size:10px;letter-spacing:.1em;opacity:.6}
.tkm-count{transition:opacity .4s,min-width .6s cubic-bezier(.625,.05,0,1),max-width .6s cubic-bezier(.625,.05,0,1);max-width:12rem;overflow:hidden;white-space:nowrap}
.tkm-dock.is-done .tkm-count{opacity:0;min-width:0;max-width:0}.tkm-dock.is-done{gap:1.25rem}
.tkm-card{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;--fr:28px;position:absolute;left:50%;top:30%;width:min(48rem,calc(100% - 2rem));overflow:hidden;padding:var(--fr);border:0;border-radius:12px;background:var(--c-card);color:var(--c-ink);text-align:center;font-family:"Space Mono",monospace;-webkit-font-smoothing:antialiased;box-shadow:0 0 0 1px rgba(0,0,0,.1),0 50px 100px -40px rgba(61,58,53,.55);opacity:0;transform:translateX(-50%) translateY(24px) scale(calc(var(--fit,1) * .88));transform-origin:50% 0;pointer-events:none;transition:opacity .45s,transform .8s cubic-bezier(.34,1.45,.64,1)}
.tkm-card.is-on{opacity:1;transform:translateX(-50%) scale(var(--fit,1));pointer-events:auto}
.dfs-night .tkm-card{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241;box-shadow:0 50px 100px -40px rgba(0,0,0,.8)}
.tkm-card .tkd-dash.is-top{top:var(--fr)}.tkm-card .tkd-dash.is-bottom{bottom:var(--fr)}
.tkm-col{position:absolute;left:var(--fr);right:var(--fr);top:var(--fr);bottom:var(--fr);border-inline:1px solid var(--c-line);pointer-events:none}
.tkm-body{position:relative}
.tkm-head{position:relative;overflow:hidden;padding:1.7rem 1.5rem 1.4rem;background-image:linear-gradient(color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px}
.tkm-head>:not(.dfs-grid-zip){position:relative;z-index:1}.tkm-head .dfs-grid-zip{z-index:0}
.tkm-top{display:flex;justify-content:center}
.tkm-chip{display:inline-flex;align-items:center;gap:.5em;padding:.4em .8em;border-radius:3px;background:var(--c-calmsoft);color:var(--c-calm);font-size:11px;letter-spacing:.1em;text-transform:uppercase}.tkm-chip b{font-weight:400;color:var(--c-ink)}
.tkm-gb{display:flex;justify-content:center;align-items:baseline;gap:.5rem;margin-top:.5rem;font-family:var(--_typography---font-styles--heading),Georgia,serif;font-size:clamp(4rem,11vw,8.5rem);line-height:1}
.tkm-gb small{font-size:.38em}.tkr-odo{display:inline-flex}
.tkr-dig{display:inline-block;height:1.25em;line-height:1.25;overflow:hidden}.tkr-sep{display:inline-block;height:1.25em;line-height:1.25}.tkr-dig>span{display:block}.tkr-dig i{display:block;height:1.25em;font-style:normal;text-align:center}
.tkm-label{margin-top:.4rem;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:var(--c-calm)}
.tkm-mac{display:grid;grid-template-columns:minmax(0,1fr) min(22rem,46%) minmax(0,1fr);grid-template-areas:"name wave state";align-items:center;gap:1.1rem;padding:1.1rem 1.5rem;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px repeat-x;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--c-soft);text-align:left}
.tkm-mac_name{grid-area:name;justify-self:end;color:var(--c-ink);white-space:nowrap}.tkm-wave{grid-area:wave;display:block;width:100%;height:44px;overflow:visible}
.tkm-wave path{fill:none;stroke:var(--c-soft);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.tkm-mac_state{grid-area:state;justify-self:start;position:relative;width:9.5em;height:1.3em}.tkm-mac_state i{position:absolute;left:0;top:0;font-style:normal;white-space:nowrap;transition:opacity .45s,transform .45s cubic-bezier(.625,.05,0,1)}
.tkm-mac_state i+i{opacity:0;transform:translateY(8px);color:var(--c-calm)}.tkm-mac.is-calm .tkm-mac_state i:first-child{opacity:0;transform:translateY(-8px)}.tkm-mac.is-calm .tkm-mac_state i+i{opacity:1;transform:none}
.tkm-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px repeat-x}
.tkm-stats div{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:1.15rem .75rem 1.25rem}.tkm-stats div+div{background:linear-gradient(var(--c-line) 50%,transparent 0) 0 0/1px 6px repeat-y}
.tkm-stats b{font-family:var(--_typography---font-styles--heading),Georgia,serif;font-size:2.75rem;font-weight:400;line-height:1;font-variant-numeric:tabular-nums}
.tkm-stats span{max-width:13em;font-size:11px;line-height:1.5;letter-spacing:.08em;text-transform:uppercase;color:var(--c-soft)}
.tkm-fx{position:absolute;inset:0;pointer-events:none;z-index:2}.tkm-boom{position:absolute;width:0;height:0}.tkm-boom i{position:absolute;left:-4px;top:-4px}
@media (max-width:767px){.tkm-card{--fr:18px}.tkm-card .tkd-lights{left:6px;top:4px;gap:5px}.tkm-card .tkd-lights i{width:9px;height:9px}.tkm-head{padding:1.5rem .9rem 1.3rem}.tkm-mac{grid-template-columns:1fr auto;grid-template-areas:"name state" "wave wave";gap:.7rem 1rem;padding:1rem .9rem}.tkm-mac_name{justify-self:start}.tkm-mac_state{justify-self:end;width:8.5rem}.tkm-mac_state i{left:auto;right:0}.tkm-wave{height:36px}.tkm-stats{grid-template-columns:1fr;padding:.4rem 0 .9rem}.tkm-stats div{flex-direction:row;justify-content:center;gap:.75rem;padding:.6rem .9rem 0}.tkm-stats div+div{background:none}.tkm-stats b{font-size:2rem}.tkm-stats span{text-align:left}.tkm-dock{bottom:1rem}.tkm-bin{width:52px;height:52px}}
@media (prefers-reduced-motion:reduce){.tkm-card,.tkm-then{transition:none}}
/* the safety box (Webflow: .tinko-safebox): its corner brackets, like the course player's focus frame */
.tinko-safebox::before{content:"";position:absolute;inset:-5px;pointer-events:none;--k:#3d3a35;background:linear-gradient(var(--k),var(--k)) 0 0/18px 2px,linear-gradient(var(--k),var(--k)) 0 0/2px 18px,linear-gradient(var(--k),var(--k)) 100% 0/18px 2px,linear-gradient(var(--k),var(--k)) 100% 0/2px 18px,linear-gradient(var(--k),var(--k)) 0 100%/18px 2px,linear-gradient(var(--k),var(--k)) 0 100%/2px 18px,linear-gradient(var(--k),var(--k)) 100% 100%/18px 2px,linear-gradient(var(--k),var(--k)) 100% 100%/2px 18px;background-repeat:no-repeat;transition:inset .55s cubic-bezier(.625,.05,0,1)}
.tinko-safebox:hover::before{inset:-12px}
.dfs-night .tinko-safebox{background-color:rgba(251,247,239,.025);border-color:#2a3550}.dfs-night .tinko-safebox::before{--k:#fbf7ef}
.dfs-night .tinko-safebox_item{color:#b3aca2}.dfs-night .tinko-safebox_name,.dfs-night .tinko-safebox_icon{color:#fbf7ef}
.tinko-safebox_badge .tinko-ph{display:none!important}
.tinko-safebox{background-image:linear-gradient(rgba(61,58,54,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(61,58,54,.055) 1px,transparent 1px);background-size:32px 32px;background-position:-1px -1px}
.dfs-night .tinko-safebox{background-image:linear-gradient(rgba(251,247,239,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(251,247,239,.045) 1px,transparent 1px)}
.tkb{--edge:#0297db;--words:#fbf7ee;--tkh-cell:5px;position:absolute;inset:0;transform:rotate(-8deg);filter:drop-shadow(0 10px 14px rgba(61,58,53,.18));transition:transform .5s cubic-bezier(.34,1.5,.64,1)}
.tinko-safebox:hover .tkb{transform:rotate(-2deg) scale(1.04)}
.tkb-svg{display:block;width:100%;height:100%;overflow:visible}
.tkb-edge{fill:var(--edge)}.tkb-ring{fill:none;stroke:var(--words);stroke-width:1;stroke-dasharray:2 3;opacity:.5}
.tkb-words{fill:var(--words);font-family:"Space Mono",monospace;font-size:12px;letter-spacing:.08em}
.tkb-spin{transform-origin:110px 110px;animation:tkbSpin 28s linear infinite}
@keyframes tkbSpin{to{transform:rotate(360deg)}}
.tkb-apple{position:absolute;left:50%;top:50%;width:24%;color:var(--words);transform:translate(-50%,-56%)}.tkb-apple svg{display:block;width:100%;height:auto}
.dfs-night .tkb{filter:drop-shadow(0 10px 14px rgba(0,0,0,.4))}
@media (prefers-reduced-motion:reduce){.tkb-spin{animation:none}}

/* the overview's tiles, one moving row (Webflow: .tinko-tiles) */
.tkt-view{align-self:stretch;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)}
.tinko-tiles.is-marquee{display:flex;flex-wrap:nowrap;width:max-content;max-width:none;gap:1rem;padding-right:1rem;grid-template-columns:none;animation:tktRun var(--tkt-d,40s) linear infinite}
.tinko-tiles.is-marquee .tinko-tile{flex:none;text-align:left}
@keyframes tktRun{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.tinko-tiles.is-marquee{animation:none}.tkt-view{overflow-x:auto}}

/* the course (Webflow: .tinko-course_flow): one player frame playing its steps, the course menu beside it */
.tkc-wave{display:block;flex:none;width:2.4rem;height:.8rem;overflow:hidden;color:#1a97d7}
.tkc-wave path{stroke:currentColor;stroke-width:1.3;stroke-linecap:round;vector-effect:non-scaling-stroke;animation:tkcWave 1.3s linear infinite}
@keyframes tkcWave{to{transform:translateX(-13px)}}
.tinko-course_player .tinko-ph{display:none!important}
.tkc-wrap{position:relative;min-width:0}
.tkc-win{left:56%;top:55%;z-index:4;transform-origin:50% 50%;transform:translate(-50%,-50%) scale(calc(var(--k,.6) * .9));opacity:0;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 40px 80px -24px rgba(0,0,0,.5);transition:opacity .35s,transform .6s cubic-bezier(.34,1.45,.64,1)}
.tkc-win.is-open{opacity:1;transform:translate(-50%,-50%) scale(var(--k,.6))}
.dfs-night .tkc-win{box-shadow:0 0 0 1px rgba(251,247,239,.16),0 40px 80px -24px rgba(0,0,0,.85)}
@media (max-width:767px){.tkc-win{left:50%;top:50%}}
.tkc-install{display:grid;justify-items:center;gap:.75rem;width:min(18rem,70%)}
.tkc-install_tag{padding:.25em .6em;border-radius:2px;background:#e8f1f6;color:#1a97d7;font-size:.6rem;letter-spacing:.1em;text-transform:uppercase}
.tkc-install b{font-family:var(--_typography---font-styles--heading),Georgia,serif;font-weight:400;font-size:1.6rem;line-height:1}
.tkc-bar{width:100%;height:3px;border-radius:2px;background:color-mix(in srgb,var(--c-ink) 12%,transparent);overflow:hidden}.tkc-bar i{display:block;width:0;height:100%;background:#1a97d7}.tkc-bar.is-run i{width:100%;transition:width 2s cubic-bezier(.4,0,.2,1)}
.tkc-install_note{font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--c-soft)}
.dfs-night .tkc-install_tag{background:#173241;color:#1dabfa}
.tinko-course_step{opacity:0;transition:opacity .6s}.tinko-course_step.is-on{opacity:1}
.tkc-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s}.tinko-course_step.is-in .tkc-video{opacity:1}
.dfs-night .tinko-course_player{background-color:#1b2338;box-shadow:0 0 0 1px rgba(251,247,239,.08),0 34px 70px -36px rgba(0,0,0,.85)}
.tkc-stage{--c-card:#f6f2ea;--c-ink:#3d3a36;--c-soft:#7d776f;--c-mod:#ebe6dc;--tkh-cell:8px;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;background-color:var(--c-card);background-image:linear-gradient(rgba(61,58,54,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(61,58,54,.05) 1px,transparent 1px);background-size:32px 32px;color:var(--c-ink);font-family:"Space Mono",monospace}
.tkc-stage_corner{position:absolute;left:4%;right:4%;top:6%;display:flex;justify-content:space-between;font-size:.55rem;line-height:1.35;letter-spacing:.08em;text-transform:uppercase;color:var(--c-soft)}
.tkc-stage_corner b{font-weight:400;color:var(--c-ink)}.tkc-stage_corner span{text-align:right}
.tkc-start{display:flex;align-items:center;gap:.8rem;padding:.7rem .7rem .7rem 1.1rem;border-radius:4px;background:var(--c-mod);font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;transition:transform .18s,box-shadow .18s}
.tkc-start.is-press{transform:scale(.93);box-shadow:0 0 0 3px rgba(26,151,215,.4)}
.tkc-start i{display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:3px;background:var(--c-ink);color:var(--c-card)}
.tkc-start svg,.tkc-chev svg{width:.75rem;height:.75rem;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.tkc-path{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--c-soft)}
.dfs-night .tkc-stage{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-mod:#33302c;background-image:linear-gradient(rgba(251,247,239,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(251,247,239,.045) 1px,transparent 1px)}
.tkc-menu{--c-card:#f6f2ea;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#e8f1f6;--c-mod:#ebe6dc;overflow:hidden;border:1px solid var(--c-line);border-radius:6px;background:var(--c-card);color:var(--c-ink);text-align:left;box-shadow:0 30px 60px -36px rgba(61,58,53,.5)}
.tkc-mod{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;background:var(--c-mod);font-family:var(--_typography---font-styles--heading),Georgia,serif;font-size:1.35rem;line-height:1}
.tkc-modwrap+.tkc-modwrap{border-top:1px solid var(--c-line)}
.tkc-mod{transition:background .5s}.tkc-mod b{font-weight:400}.tkc-modwrap.is-open .tkc-mod{background:var(--c-calmsoft)}
.tkc-chev{display:grid;place-items:center;width:1.9rem;height:1.9rem;border:1px dashed var(--c-soft);border-radius:4px;color:var(--c-soft);transition:color .5s,border-color .5s}.tkc-modwrap.is-open .tkc-chev{border-color:var(--c-calm);color:var(--c-calm)}
.tkc-chev svg{transition:transform .55s cubic-bezier(.625,.05,0,1)}.tkc-modwrap.is-open .tkc-chev svg{transform:rotate(180deg)}
.tkc-lessons{display:grid;grid-template-rows:0fr;transition:grid-template-rows .6s cubic-bezier(.625,.05,0,1)}.tkc-modwrap.is-open .tkc-lessons{grid-template-rows:1fr}.tkc-lessons_in{min-height:0;overflow:hidden}
.tkc-row .tkc-wave{display:none}.tkc-row.is-now .tkc-wave{display:block}.tkc-row.is-now em{display:none}
.tkc-row{display:flex;align-items:center;gap:.75rem;padding:.75rem 1.1rem;border-top:1px dashed var(--c-line);font-size:.78rem;letter-spacing:.02em;transition:background .4s,color .4s}
.tkc-row b{flex:1;min-width:0;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tkc-row em{font-style:normal;font-size:.7rem;color:var(--c-soft)}
.tkc-row.is-now{background:var(--c-calmsoft);color:var(--c-calm)}.tkc-row .tkc-wave{color:var(--c-calm)}
.tkc-box{display:grid;place-items:center;flex:none;width:1rem;height:1rem;box-sizing:border-box;border:1.5px solid currentColor;border-radius:2px}.tkc-box::after{content:"";width:.4rem;height:.4rem;background:currentColor}
.dfs-night .tkc-menu{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241;--c-mod:#33302c;box-shadow:0 30px 60px -36px rgba(0,0,0,.85)}
@media (max-width:767px){.tkc-stage{--tkh-cell:5px;gap:.7rem}.tkc-start{font-size:.65rem;padding:.45rem .45rem .45rem .8rem}.tkc-start i{width:1.2rem;height:1.2rem}.tkc-stage_corner{font-size:.42rem}}
@media (prefers-reduced-motion:reduce){.tkc-wave path{animation:none}}

/* the key legend (Webflow: .tinko-legend, his two buttons copied): it sits on a strip of his window's paper, the
   column with its side lines, his 32px grid and the dashed line under the buttons, fading up into the page (Rim, 24 Oct) */
.tinko-legend{isolation:isolate}
.tinko-legend::before{content:"";position:absolute;inset:-2.5rem 0 0;z-index:-1;border-inline:1px solid #dfd5ca;background-color:#fbf7ef;background-image:linear-gradient(rgba(61,58,54,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(61,58,54,.05) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 80%);mask-image:linear-gradient(to bottom,transparent,#000 80%)}
.tinko-legend::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;z-index:-1;background:linear-gradient(90deg,#dfd5ca 50%,transparent 0) 0 0/6px 1px}
.dfs-night .tinko-legend::before{border-color:rgba(251,247,239,.1);background-color:rgba(41,39,36,.45);background-image:linear-gradient(rgba(251,247,239,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(251,247,239,.05) 1px,transparent 1px)}
.dfs-night .tinko-legend::after{background-image:linear-gradient(90deg,#3d3a36 50%,transparent 0)}
.dfs-night .tinko-legend_btn{background-color:#fbf7ef;color:#292724}.dfs-night .tinko-legend_key{border-color:rgba(41,39,36,.45)}
.dfs-night .tinko-legend_btn.is-light{background-color:#292724;color:#fbf7ef;border-color:#3d3a36}.dfs-night .tinko-legend_key.is-light{border-color:rgba(251,247,239,.5)}

.tko-peek{--tkh-cell:7px;--c-ink:#3d3a36;transform:translateY(70%);transition:transform .9s cubic-bezier(.34,1.5,.64,1)}
.tko-peek.is-up{transform:none}
.dfs-night .tko-peek{--c-ink:#fbf7ef}
@media (max-width:479px){.tko-peek{--tkh-cell:6px}}
@media (prefers-reduced-motion:reduce){.tko-peek{transition:none}}
.tko{width:min(100%,calc((100svh - 17rem) * 1.67));margin-inline:auto}
.tko-tilt{transform-origin:50% 50%;will-change:transform}
.tko .tkh-win{aspect-ratio:720/430;--tkh-cell:clamp(7px,1.45cqw,12px)}
.tko .tkh-stage{gap:clamp(14px,2.4cqw,26px)}
@container (max-width:600px){.tko .tkh-win{aspect-ratio:4/4.3;min-height:0;--tkh-cell:clamp(7px,2.5cqw,10px)}.tko .tkh-stage{position:absolute;min-height:0;padding:2.5rem 1.25rem}}
.tko .tinko-outro_tag{display:inline-block;margin:0 0 clamp(10px,1.4cqw,14px);font-size:clamp(10px,1.4cqw,12px);line-height:1.2;letter-spacing:.1em;text-transform:uppercase;color:var(--c-calm);background:var(--c-calmsoft);border-radius:2px;padding:.3em .7em}
.tko .tinko-outro_line{margin:0;font-size:clamp(13px,2cqw,16px);line-height:1.7;max-width:30em;text-wrap:balance}
.tko-key{position:relative;display:block;width:min(20rem,100%);height:4rem;margin-inline:auto;color:#3d3a36;text-decoration:none;-webkit-tap-highlight-color:transparent;cursor:pointer}
.tko-cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:.75rem;background:#fbf7ef;border:1px solid #dfd5ca;border-radius:8px;box-shadow:0 var(--travel,6px) 0 #dfd5ca;transform:translateY(calc(6px - var(--travel,6px)));text-transform:uppercase;letter-spacing:.1em;font-size:.875rem;line-height:1}
.tko-cap .tinko-outro_key-label{font-size:.6875rem;padding:.3rem .5rem;border:1px solid #dfd5ca;border-radius:4px;letter-spacing:.08em}
.tko-ring{position:absolute;left:-6px;top:-6px;width:calc(100% + 12px);height:calc(100% + 18px);overflow:visible;pointer-events:none}
.tko-ring rect{fill:none;stroke:#1a97d7;stroke-width:2;stroke-dasharray:100;stroke-dashoffset:100}
.tko-key:focus-visible{outline:none}.tko-key:focus-visible .tko-cap{outline:2px solid #1a97d7;outline-offset:4px}
.tko-key.is-down .tko-cap{transition:transform .12s,box-shadow .12s}
.dfs-night .tko-key{color:#fbf7ef}.dfs-night .tko-cap{background:#292724;border-color:#3d3a36;box-shadow:0 var(--travel,6px) 0 #3d3a36}
.dfs-night .tko-cap .tinko-outro_key-label{border-color:#4a4640}.dfs-night .tko-ring rect{stroke:#1dabfa}
.tko-cover{position:fixed;z-index:2147483000;pointer-events:none;perspective:none;container-type:inline-size}
.tko-cover .tkh-win{position:absolute;inset:0;aspect-ratio:auto;min-height:0;opacity:1;transform:none;transition:none;box-shadow:none}
@media (prefers-reduced-motion:reduce){.tko-tilt{transform:none!important}}
`;

/* ---------- styles for what the script builds ---------- */

function injectCSS() {
  if (!document.querySelector('link[href*="Space+Mono"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Space+Mono&display=swap'; document.head.append(l);
  }
  const s = document.createElement('style'); s.id = 'meet-tinko-css';
  s.textContent = `
.tkh-line-mask{display:block;overflow:clip;padding-bottom:.06em;margin-bottom:-.06em}.tkh-line{display:block}
.tinko-cta_price{border-left-color:color-mix(in srgb,currentColor 32%,transparent)!important}
.tkh{container-type:inline-size;position:relative;perspective:2000px}
.tkh-tilt{transform-origin:50% 0;will-change:transform}
.tkh-win{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;--tkh-cell:clamp(10px,1.85cqw,19px);--chrome:clamp(22px,3.2cqw,34px);
  position:relative;aspect-ratio:1000/620;border-radius:clamp(10px,1.3cqw,14px);overflow:hidden;background:var(--c-card);color:var(--c-ink);font-family:"Space Mono",monospace;-webkit-font-smoothing:antialiased;
  box-shadow:0 0 0 1px rgba(61,58,53,.1),0 2px 4px rgba(61,58,53,.06),0 40px 90px -40px rgba(61,58,53,.55);opacity:0;transform:translateY(1.5rem);transition:opacity .9s cubic-bezier(.33,1,.68,1),transform 1.1s cubic-bezier(.625,.05,0,1),box-shadow .8s cubic-bezier(.33,1,.68,1)}
.tkh-win.is-on{opacity:1;transform:none}
.dfs-night .tkh-win{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241;box-shadow:0 0 0 1px rgba(251,247,239,.08),0 40px 90px -40px rgba(0,0,0,.75)}
@container (max-width:600px){.tkh-win{aspect-ratio:auto;min-height:31rem;--tkh-cell:clamp(9px,3.4cqw,14px)}}
.tkh-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
.dfs-night .tkh-grain{mix-blend-mode:screen;opacity:.05}
.tkh-lights{position:absolute;left:clamp(10px,1.4cqw,14px);top:clamp(8px,1.2cqw,12px);display:flex;gap:clamp(6px,.8cqw,8px);z-index:2}
.tkh-lights i{width:clamp(10px,1.2cqw,12px);aspect-ratio:1;border-radius:50%;background:#ff5f57;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}.tkh-lights i:nth-child(2){background:#febc2e}.tkh-lights i:nth-child(3){background:#28c840}
.tkh-dash{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px}.tkh-dash.is-top{top:var(--chrome)}.tkh-dash.is-bottom{bottom:var(--chrome)}
.tkh-col{position:absolute;left:var(--chrome);right:var(--chrome);top:var(--chrome);bottom:var(--chrome);border-inline:1px solid var(--c-line);
  background-image:linear-gradient(color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px}
.tkh-tools{position:absolute;right:clamp(10px,1.6cqw,16px);top:clamp(10px,1.4cqw,14px);display:flex;gap:8px;z-index:2}
.tkh-tools>*{all:unset;width:clamp(30px,3.8cqw,38px);aspect-ratio:1;box-sizing:border-box;display:grid;place-items:center;border:1px solid var(--c-line);border-radius:4px;background:var(--c-card)}
.tkh-tools svg{width:36%;height:36%;display:block;fill:var(--c-ink)}
.tkh-sun{display:none}.dfs-night .tkh-sun{display:block}.dfs-night .tkh-moon{display:none}.tkh-moon,.tkh-sun{width:100%;height:100%;place-items:center}.tkh-moon{display:grid}.dfs-night .tkh-sun{display:grid}
.tkh-intro{--c-card:#fbf7ef;--c-ink:#3d3a36;position:absolute;left:0;width:100%;z-index:60;display:grid;place-items:center;pointer-events:none}
.dfs-night .tkh-intro{--c-card:#292724;--c-ink:#fbf7ef}
.tkh-intro .tkh-tinko{transform-origin:50% 50%}
.tkh-win.is-boxed{opacity:0}
.tkh-tune{position:fixed;left:16px;bottom:16px;z-index:70;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:rgba(29,29,31,.88);color:#fff;font:11px/1 "Space Mono",monospace;letter-spacing:.04em;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.tkh-tune b{font-weight:400;opacity:.6;margin-right:4px;text-transform:uppercase}
.tkh-tune button{all:unset;cursor:pointer;padding:5px 8px;border-radius:4px;background:rgba(255,255,255,.12)}.tkh-tune button:hover{background:rgba(255,255,255,.22)}
.tkh-tune button[aria-pressed="true"]{background:#1dabfa;color:#0e1628}
.tkh-tune.is-pixels{bottom:62px;flex-wrap:wrap;max-width:calc(100vw - 32px)}
.tkh-tune button{display:inline-flex;align-items:center;gap:6px}
.tkh-sw{display:inline-flex}.tkh-sw i{width:6px;height:10px;display:block}
.tinko-pixel-grid.is-win{z-index:0}.tkh-tune i{width:1px;height:16px;background:rgba(255,255,255,.2);margin:0 2px}
.tkh-tune-clock{min-width:7.5em;margin-left:4px;opacity:.8;white-space:pre}
.tkh-win.is-clipping{box-shadow:none}
.tkh-tool{cursor:pointer;transition:border-color .3s}.tkh-tool:hover{border-color:color-mix(in srgb,var(--c-ink) 35%,var(--c-line))}.tkh-tool:focus-visible{outline:2px solid var(--c-calm);outline-offset:2px}
.tkh-stage{position:absolute;inset:0;display:grid;justify-items:center;align-content:center;gap:clamp(18px,3cqw,34px);padding:clamp(48px,6cqw,64px) 1.25rem}
@container (max-width:600px){.tkh-stage{position:relative;min-height:calc(31rem - 2 * var(--chrome))}}
.tkh-tinko{width:calc(var(--tkh-cell) * 16);height:calc(var(--tkh-cell) * 13);position:relative;cursor:pointer}
.tkh-sway{position:absolute;inset:0;transform-origin:50% 60%;animation:tkhSway 1.85s ease-in-out infinite alternate}
@keyframes tkhSway{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg)}}
.tkh-jig,.tkh-blob{position:absolute;inset:0;transform-origin:50% 60%}
.tkh-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;display:block}
.tkh-body{fill:var(--c-ink)}
.tkh-tinko.is-asleep .tkh-sway{animation-play-state:paused}
.tkh-eye{fill:var(--c-card)}
.tkh-screen{display:grid;justify-items:center;text-align:center;transition:opacity .6s cubic-bezier(.33,1,.68,1),transform .7s cubic-bezier(.33,1,.68,1)}
.tkh-screen.is-hidden{opacity:0;transform:translateY(8px);pointer-events:none}
.tkh-tag{margin-bottom:clamp(10px,1.4cqw,14px)}
.tkh-tag span{display:inline-block;font-size:clamp(10px,1.1cqw,12px);letter-spacing:.1em;text-transform:uppercase;color:var(--c-calm);background:var(--c-calmsoft);border-radius:2px;padding:.3em .7em;line-height:1.2}
.tkh-words{margin:0 0 clamp(20px,2.6cqw,28px);font-size:clamp(13px,1.6cqw,17px);line-height:1.75;max-width:30em;text-wrap:balance}
.tkh-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:.7em;box-sizing:border-box;padding:.95em 1.4em;border-radius:4px;font-size:clamp(11px,1.25cqw,13px);letter-spacing:.06em;text-transform:uppercase;background:var(--c-ink);color:var(--c-card);transition:transform .2s}
.tkh-btn:focus-visible{outline:2px solid var(--c-calm);outline-offset:3px}.tkh-btn.is-press{transform:scale(.96)}
.tkh-key{display:inline-flex;align-items:center;justify-content:center;height:1.55em;padding:0 .45em;border-radius:3px;box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 50%,transparent);font-size:.85em;letter-spacing:0}
.tkh-roll{display:inline-flex;overflow:hidden;height:1.35em;line-height:1.35em}
.tkh-roll b{font-weight:400;display:inline-block;transition:transform .6s cubic-bezier(.625,.05,0,1);text-shadow:0 1.35em 0 currentColor}
.tkh-btn:hover .tkh-roll b{transform:translateY(-1.35em)}
.tkh-roll b:nth-child(2){transition-delay:.01s}.tkh-roll b:nth-child(3){transition-delay:.02s}.tkh-roll b:nth-child(4){transition-delay:.03s}.tkh-roll b:nth-child(5){transition-delay:.04s}.tkh-roll b:nth-child(6){transition-delay:.05s}.tkh-roll b:nth-child(7){transition-delay:.06s}.tkh-roll b:nth-child(8){transition-delay:.07s}.tkh-roll b:nth-child(9){transition-delay:.08s}.tkh-roll b:nth-child(10){transition-delay:.09s}.tkh-roll b:nth-child(11){transition-delay:.1s}
@media (prefers-reduced-motion:reduce){.tkh-sway{animation:none}.tkh-win{transition:opacity .3s}}
`;
  s.textContent += DEMO_CSS + OUTRO_CSS;
  document.head.append(s);
}

/* ---------- start ---------- */

function init() {
  clearTimeout(window.tinkoReadyTimer);   // the page head's safety net (shows the title if this script never runs): it does run
  // a refresh starts at the top (no scroll kept from before), so the intro plays; a link to a section still goes there
  // (ScrollTrigger, on every page, keeps its own scroll memory and sets the browser's back to auto: its own switch)
  if (!location.hash && 'scrollRestoration' in history) {
    if (window.ScrollTrigger?.clearScrollMemory) ScrollTrigger.clearScrollMemory('manual'); else history.scrollRestoration = 'manual';
    if (scrollY) { scrollTo(0, 0); window.lenis?.scrollTo?.(0, { immediate: true }); }
  }
  injectCSS();
  introTitle();
  document.querySelectorAll('[data-tinko-stage]').forEach(initStage);
  if (!document.querySelector('[data-tinko-stage]')) heroTitle.play(120);
  document.querySelectorAll('[data-tinko-ba]').forEach(initBA);
  document.querySelectorAll('[data-tinko-outro]').forEach(initOutro);
  document.querySelectorAll('[data-tinko-peek]').forEach(initPeek);
  document.querySelectorAll('[data-tinko-mess]').forEach(initMess);
  document.querySelectorAll('[data-tinko-course]').forEach(initCourse);
  document.querySelectorAll('.tinko-tiles').forEach(initTiles);
  document.querySelectorAll('[data-tinko-badge]').forEach(initBadge);
  tilt(document.querySelector('.splitter-wrapper'), { max: 3, p: 2200 });
  initPixels();   // before the Osmo script in the footer starts (it waits for DOMContentLoaded)
  const rows = () => document.querySelectorAll('[data-tinko-demo]').forEach(initDemo);
  if (!LAB || LAB === 'rows') rows();
  if (LAB) import('./layouts.js').then(m => m.initLayouts(LAB)).catch(e => { console.error(e); if (LAB !== 'rows') rows(); });
  pauseOffscreen('section, [data-tinko-demo]');
}

/* the looping CSS and SVG animations (Tinko's sway in every demo, the tiles marquee, the course wave, the spinners) keep the main thread busy every frame even out of view: they hold
   still while their part of the page is off screen (audit, 24 Oct). Only pauses what it paused itself, so a spinner
   another script stopped stays stopped. */
function pauseOffscreen(sel) {
  const st = document.createElement('style');
  st.textContent = '.dfs-off,.dfs-off *,.dfs-off *::before,.dfs-off *::after{animation-play-state:paused!important}';
  document.head.append(st);
  const held = new WeakSet();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const off = !e.isIntersecting;
    e.target.classList.toggle('dfs-off', off);
    e.target.querySelectorAll('svg').forEach(s => {
      if (!s.pauseAnimations || !s.querySelector('animate, animateTransform, animateMotion')) return;
      if (off && !s.animationsPaused()) { s.pauseAnimations(); held.add(s); } else if (!off && held.has(s)) { s.unpauseAnimations(); held.delete(s); }
    });
  }), { rootMargin: '10% 0px' });
  document.querySelectorAll(sel).forEach(el => io.observe(el));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
