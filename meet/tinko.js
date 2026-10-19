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
   [data-tinko-demo="dock|desk|files|apps|settings|inbox|setup"]: one row each under "What he does". A small Mac
   (wallpaper, menu bar, Dock) with his window on it, playing that part with his real lines (from the app's
   Views files) while the Mac beside him changes: Dock icons leave, files fly, rows in Finder and Mail go, switches
   flip. Each plays only while it's on screen, then loops. Demo names and sizes are made up; the lines are his. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const TUNE = new URLSearchParams(location.search).has('tune');   // /meet-tinko?tune: replay the intro, slowed down, with a clock

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
  const cells = [...host.querySelectorAll('mask rect')].map(el => { const x = +el.getAttribute('x') - .5, y = +el.getAttribute('y') - .5; return { el, x, y, d: Math.hypot(x + .5 - CX, (y + .5 - CY) * 1.25) }; });
  const far = Math.max(...cells.map(c => c.d));
  let reveal = null;   // { t0, spread, grow } while the pixels are coming in
  const sizeCell = (c, k) => { const w = 2.1 * out(Math.max(0, Math.min(1, k))); c.el.setAttribute('x', (c.x + .5 - w / 2).toFixed(3)); c.el.setAttribute('y', (c.y + .5 - w / 2).toFixed(3)); c.el.setAttribute('width', w.toFixed(3)); c.el.setAttribute('height', w.toFixed(3)); };
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
  body.setAttribute('d', pathOf(reduce ? base : variants[0]));

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
  let raf = 0, visible = false; const t0 = shared?.t0 ?? (shared ? (shared.t0 = performance.now()) : performance.now());
  function frame(now) {
    raf = 0;
    if (!reduce) body.setAttribute('d', pathOf(morphAt((((now - t0) / 11000) % 1 + 1) % 1)));   // a frame's time can be a hair before t0
    if (reveal) {   // each pixel opens in turn, eased, a little bigger than its cell so they close up with no seams
      let open = true;
      for (const c of cells) { const k = (now - reveal.t0 - c.d / far * reveal.spread) / reveal.grow; if (k < 1) open = false; sizeCell(c, k); }
      if (open) { reveal = null; masked(false); }
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
  // a win: happy slits and a double hop with a squash on landing (Tinko.swift cheer)
  function cheer(times = 1) {
    mood = 'cheering';
    set({ ...CHEER[0] }, { ...CHEER[1] }, .25, 'out');
    const c = parseFloat(getComputedStyle(host).getPropertyValue('--tkh-cell')) || 16;
    const hop = blob.animate([
      { transform: 'translateY(0) scaleY(1)', offset: 0, easing: 'ease-out' }, { transform: `translateY(${-2.2 * c}px) scaleY(1.06)`, offset: .14 / .56, easing: 'ease-in' },
      { transform: 'translateY(0) scaleY(.9)', offset: .28 / .56, easing: 'ease-out' }, { transform: `translateY(${-1.1 * c}px) scaleY(1.03)`, offset: .38 / .56, easing: 'ease-in' },
      { transform: 'translateY(0) scaleY(.94)', offset: .49 / .56 }, { transform: 'translateY(0) scaleY(1)', offset: 1 },
    ], { duration: 1120, iterations: times });
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
    reveal = null; cells.forEach(c => sizeCell(c, 0)); masked(true);
    eyes = HOME.map(e => ({ ...e, y: e.y + .8, h: .25 })); tween = null; drawEyes();
  }
  // k < 1 runs it faster (the page-load intro)
  function wakeUp(k = 1) {
    return new Promise(done => {
      if (reduce) { awakeNow(); return done(); }
      reveal = { t0: performance.now() + 60 * k, spread: 560 * k, grow: 420 * k }; wake();
      later(() => { host.classList.remove('is-asleep'); host.classList.add('is-awake'); }, 640 * k);
      later(() => set(E(-1.5, -.6, 1, 2.1), E(1.5, -.6, 1, 2.1), .26, 'out'), 1000 * k);
      later(() => { blinking = false; blink(); }, 1450 * k);
      later(() => set(E(-1.5, -.7, 1.4, 2.2), E(1.5, -.7, 1.4, 2.2), .38, 'out'), 1800 * k);
      later(() => { mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 }; done(); }, 2500 * k);
    });
  }
  // straight to awake, eyes home (the hand-over at the end of the intro)
  function awakeNow() {
    timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false;
    reveal = null; cells.forEach(c => sizeCell(c, 1)); masked(false); host.classList.remove('is-asleep'); host.classList.add('is-awake');
    eyes = HOME.map(e => ({ ...e })); tween = null; drawEyes();
    mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 };
  }
  function home(dur = .3) { if (mood !== 'asleep') set({ ...HOME[0] }, { ...HOME[1] }, dur); }

  svg.addEventListener('click', bwoop);
  return { show, sleep, wakeUp, awakeNow, home, cheer, squint, bwoop, get mood() { return mood; } };
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

  // the window comes in with the hero (as soon as any of it shows, after the title); he wakes up the first
  // time it's well in view, and his screen follows him in. On the first screen at load: the intro instead.
  let started = false, shown = false, introOn = false;
  tinko.sleep(); screen.classList.add('is-hidden');
  const r0 = win.getBoundingClientRect();
  if (!reduce && scrollY < 40 && r0.top < innerHeight * .92 && r0.bottom > 0) { started = shown = true; queueMicrotask(() => intro()); }   // once the rest below is set up
  else heroTitle.play(120);
  const born = performance.now();
  function appear() {
    if (shown) return; shown = true;
    setTimeout(() => win.classList.add('is-on'), reduce ? 0 : Math.max(0, 900 - (performance.now() - born)));
  }
  /* The page-load intro (Rim, 19 Oct): Tinko on his own in the middle of the screen, larger. His pixels come in,
     he wakes up and says hello, then he glides down to his place while his box opens out around him and the
     title rises. Any scroll, click or key skips to the end. */
  // the intro's beats, in ms at full speed (Rim, 19 Oct: calmer, a slower wake, a longer hello before the glide)
  const BEAT = { wake: .85, glide: 2250, glideDur: 1150, title: 150, box: 2650, boxDur: 1200 };
  function intro(f = 1) {
    const cell = tinkoEl.offsetWidth / 16;
    const ov = document.createElement('div'); ov.className = 'tkh-intro'; ov.innerHTML = '<div class="tkh-tinko"></div>';
    ov.style.setProperty('--tkh-cell', cell + 'px');
    document.body.append(ov);
    const it = ov.firstChild, twin = makeTinko(it, shared);
    it.querySelector('.tkh-sway').style.animationDelay = `-${((performance.now() - swayBorn) / 1000).toFixed(3)}s`;
    twin.sleep(); twin.show(true);
    tinkoEl.style.visibility = 'hidden'; tinko.awakeNow(); introOn = true; tinkoEl.style.translate = '';
    const BIG = Math.max(1.2, Math.min(1.6, innerWidth / 3.2 / it.offsetWidth + .4));
    it.style.transform = `scale(${BIG})`;
    win.classList.add('is-on', 'is-boxed'); win.style.transition = 'none';
    const anims = [], timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms * f));
    tune.start(f);
    let done = false;
    function finish() {
      if (done) return; done = true;
      timers.forEach(clearTimeout); anims.forEach(a => a.cancel());   // their end state is the page's own state, so nothing stays stuck on (a replay starts clean)
      removeEventListener('wheel', skip); removeEventListener('touchstart', skip); removeEventListener('keydown', skip, true); removeEventListener('pointerdown', skip, true);
      win.style.clipPath = ''; win.classList.remove('is-boxed', 'is-clipping'); win.style.opacity = ''; win.style.transition = '';
      tinko.awakeNow(); tinko.show(true); tinkoEl.style.visibility = ''; twin.show(false); ov.remove(); introOn = false;
      heroTitle.play(0, true);
      screen.classList.remove('is-hidden');
      running = null; tune.stop();
    }
    running = finish;
    const skip = e => { if (e?.target?.closest?.('.tkh-tune')) return; finish(); };
    addEventListener('wheel', skip, { passive: true }); addEventListener('touchstart', skip, { passive: true });
    addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true);
    twin.wakeUp(BEAT.wake * f);
    // the glide down into his place, with the box opening out from around him
    at(BEAT.glide, () => {
      twin.home(.45);
      const a = it.getBoundingClientRect(), b = tinkoEl.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      anims.push(it.animate([{ transform: `translate(0,0) scale(${BIG})` }, { transform: `translate(${dx}px,${dy}px) scale(1)` }], { duration: BEAT.glideDur * f, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' }));
      heroTitle.play(BEAT.title * f, false, f);
    });
    at(BEAT.box, () => {
      const w = win.getBoundingClientRect(), b = tinkoEl.getBoundingClientRect(), pad = cell * 1.2;
      const from = `inset(${b.top - w.top - pad}px ${w.right - b.right - pad}px ${w.bottom - b.bottom - pad}px ${b.left - w.left - pad}px round 8px)`;
      win.classList.add('is-clipping'); win.style.opacity = '1';
      anims.push(win.animate([{ clipPath: from, opacity: 0 }, { clipPath: from, opacity: 1, offset: .32 }, { clipPath: 'inset(0px 0px 0px 0px round 14px)', opacity: 1 }], { duration: BEAT.boxDur * f, easing: 'cubic-bezier(.625,.05,0,1)', fill: 'forwards' }));
    });
    at(Math.max(BEAT.box + BEAT.boxDur, BEAT.glide + BEAT.glideDur) + 50, () => finish());   // once everything has landed
  }
  let running = null;
  // ?tune: the intro again from the top, at any speed
  const tune = TUNE ? tunePanel(f => {
    if (running) running();
    if (window.lenis?.scrollTo) window.lenis.scrollTo(0, { immediate: true }); else scrollTo(0, 0);
    screen.classList.add('is-hidden'); tinko.sleep(); tinko.show(false);
    win.classList.add('is-boxed'); heroTitle.reset();
    setTimeout(() => intro(f), 350);
  }) : { start() {}, stop() {} };

  async function start() {
    started = true; appear();
    await new Promise(r => setTimeout(r, reduce ? 0 : Math.max(450, 1300 - (performance.now() - born))));
    await tinko.wakeUp();
    screen.classList.remove('is-hidden');
  }
  new IntersectionObserver(([e]) => {
    tinko.show(e.isIntersecting);
    if (e.isIntersecting) appear();
    if (e.isIntersecting && e.intersectionRatio > .35 && !started) start();
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
      const hero = host.closest('[data-tinko-hero]'), next = document.querySelector('#features') || hero?.nextElementSibling;
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
  el.innerHTML = '<b>Intro</b><button data-f="1">Replay</button><button data-f="2">Slow ×½</button><button data-f="4">Slower ×¼</button><span class="tkh-tune-clock">0.00 s</span>';
  document.body.append(el);
  const clock = el.querySelector('.tkh-tune-clock');
  let t0 = 0, f = 1, raf = 0;
  const tick = () => { clock.textContent = ((performance.now() - t0) / 1000 / f).toFixed(2) + ' s' + (f > 1 ? `  (×1/${f})` : ''); raf = requestAnimationFrame(tick); };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) replay(+b.dataset.f); });
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
const say = t => 900 + wordsOf(t) * 75;   // how long a line stays up before the key, like the homepage demo

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

function initDemo(host) {
  const D = DEMOS[host.dataset.tinkoDemo];
  if (!D) return;
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
  // the clock only runs while the demo is on screen, so a loop never plays to nobody
  let visible = false, wakeups = [];
  const wait = ms => new Promise(res => {
    let left = reduce ? Math.min(ms, 400) : ms, last = performance.now();
    const tick = () => { const now = performance.now(); if (visible) left -= now - last; last = now; if (left <= 0) res(); else setTimeout(tick, Math.min(120, left)); };
    setTimeout(tick, Math.min(120, left));
  });
  const until = () => visible ? Promise.resolve() : new Promise(r => wakeups.push(r));
  const api = {
    ctx, scene, tinko, wait, S,
    get layout() { return L; },
    show(html) { screen.classList.add('is-swap'); screen.innerHTML = html; requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('is-swap'))); },
    async press(key) {   // the key goes down on its button, and the screen moves on
      const b = screen.querySelector(`[data-k="${key}"]`);
      if (b) { b.classList.add('is-press'); await wait(170); b.classList.remove('is-press'); }
      await wait(120);
    },
    app(name) { host.querySelector('.tkd-app').textContent = name; },
    winAt(x, y) { win.style.left = x + 'px'; win.style.top = y + 'px'; },
  };
  D.build(api);
  new ResizeObserver(fit).observe(host); fit();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; tinko.show(visible); if (visible) { wakeups.splice(0).forEach(r => r()); } }, { threshold: .15 }).observe(host);
  tinko.sleep(); tinko.wakeUp();
  (async () => { await until(); await wait(600); for (;;) { await D.play(api); await wait(D.hold || 3200); await D.reset?.(api); await wait(500); } })();
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
        await api.wait(slow ? 1500 : 300); await api.press(key);
        this.fate[i] = key; if (key === 'del') d.dim(id);
      }
      const out = this.pass.filter((a, i) => this.fate[i] === 'del');
      d.leave(out.map(a => a[0]));
      t = `${out.length} unpinned. Your Dock keeps Finder, Messages, Calendar, Notes, Arc, Figma, Claude and Spotify. That’s the lot.`;
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
        await api.wait(1400); await api.press(key);
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
      for (const [id, name, line, key] of this.apps) {
        head.querySelector('img').src = MAC(id); head.querySelector('b').textContent = name; set.querySelector('.tkd-mw-bar b').textContent = name;
        sw.classList.add('is-on'); set.classList.add('is-flip'); requestAnimationFrame(() => requestAnimationFrame(() => set.classList.remove('is-flip')));
        api.show(S.tag('Notifications') + S.title(name) + S.words(line) + S.btns(S.btn('Keep', 'space'), S.btn('Turn off', 'del', true)));
        await api.wait(say(line) * .75); await api.press(key);
        if (key === 'del') { sw.classList.remove('is-on'); await api.wait(650); }
      }
      t = '4 apps can’t interrupt you any more. Calendar and the people in Messages still can.';
      api.show(S.tag('Notifications') + S.words(t) + S.btns(S.btn('Next', 'space')));
      api.tinko.cheer(1);
    },
    hold: 3400,
    async reset() {},
  },

  /* 6. The inbox (MailViews.swift, MailNewsletters.swift): the newsletters one by one, ⌫ unsubscribes; their old
        mails go too, and the unread count falls */
  inbox: {
    label: 'Tinko going through the newsletters in Apple Mail one by one, unsubscribing with one key while the unread count falls.',
    senders: [['Weekly Wins', 'Your 5 wins for the week', 47, 'del'], ['Shop Daily', 'Last chance: 40% off everything', 36, 'del'], ['Studio Notes', 'What we learned building in public', 22, 'space'], ['Deal Radar', 'Prices dropped on 12 items', 31, 'del'], ['The Long Read', 'Sunday edition', 9, 'space'], ['App Digest', 'New this week in apps', 19, 'del']],
    build(api) {
      api.app('Tinko');
      const mails = this.senders.flatMap(([n, s], i) => [[n, s, i], [n, s.split(':')[0] + ' (2)', i]]);
      api.ctx.insertAdjacentHTML('beforeend', macWin('is-mail', 'Inbox', `<div class="tkd-mail-head"><b>Inbox</b><span class="tkd-unread">8,214 unread</span></div><div class="tkd-mails">${mails.map(([n, s, i]) => `<div class="tkd-mrow" data-s="${i}"><i></i><b>${n}</b><span>${s}</span></div>`).join('')}</div>`));
    },
    layout(api, L) {
      api.winAt(L === 'tall' ? 33 : 250, L === 'tall' ? 50 : 50);
      Object.assign(api.ctx.querySelector('.is-mail').style, L === 'tall' ? { left: '33px', top: '480px', width: '454px', height: '280px' } : { left: '16px', top: '74px', width: '360px', height: '400px' });
    },
    async play(api) {
      const { S } = api, unread = api.ctx.querySelector('.tkd-unread');
      let n = 8214; const count = to => { const from = n; n = to; const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / 900); unread.textContent = Math.round(from + (to - from) * out(k)).toLocaleString('en') + ' unread'; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
      let t = 'These 6 senders send newsletters, busiest first. Does each one earn its place?';
      api.show(S.tag('Newsletters') + S.words(t) + S.stats([[6, 'newsletters'], [164, 'mails in 3 months']]) + S.btns(S.btn('One by one', 'space')));
      await api.wait(say(t)); await api.press('space');
      for (let i = 0; i < this.senders.length; i++) {
        const [name, , mails, key] = this.senders[i];
        api.ctx.querySelectorAll(`.tkd-mrow[data-s="${i}"]`).forEach(r => r.classList.add('is-seen'));
        api.show(S.tag('Newsletters') + S.title(name) + S.words(`${mails} mails in three months. Does it earn its place?`) + S.btns(S.btn('Keep', 'space'), S.btn('Unsubscribe', 'del', true)) + S.count(`${i + 1} OF ${this.senders.length} · AN UNSUBSCRIBE CAN’T BE UNDONE`));
        await api.wait(i < 2 ? 1700 : 900); await api.press(key);
        api.ctx.querySelectorAll(`.tkd-mrow[data-s="${i}"]`).forEach(r => { r.classList.remove('is-seen'); if (key === 'del') r.classList.add('is-gone'); });
      }
      t = 'You unsubscribed from 4. Clear their old mails too? 133 mails, 38 MB. Only from these exact addresses: other mail from the same company stays.';
      api.show(S.tag('Newsletters') + S.words(t) + S.btns(S.btn('Keep them', 'space'), S.btn('Move to Bin', 'del', true)));
      await api.wait(say(t) * .8); await api.press('del'); count(8081);
      await api.wait(900);
      t = '8,081 mails older than three weeks are still unread. Mark them as read? The last three weeks stay as they are, for you to look through.';
      api.show(S.tag('Your inbox') + S.words(t) + S.btns(S.btn('Mark them read', 'space'), S.btn('Skip', 's', true)));
      await api.wait(say(t) * .8); await api.press('space'); count(37);
      await api.wait(1000);
      api.show(S.tag('Inbox, done') + S.words('Your inbox, cleared out. That’s a big one.') + S.fixes(['4 newsletters unsubscribed', '133 mails to the Bin', '8,214 unread → 37'], 3));
      api.tinko.cheer(1);
    },
    hold: 3600,
    async reset(api) { api.ctx.querySelectorAll('.tkd-mrow').forEach(r => r.classList.remove('is-gone', 'is-seen')); api.ctx.querySelector('.tkd-unread').textContent = '8,214 unread'; },
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
.tkd{position:relative;width:100%;overflow:hidden;border-radius:12px;box-shadow:0 0 0 1px rgba(61,58,53,.1),0 30px 70px -36px rgba(61,58,53,.55)}
.dfs-night .tkd{box-shadow:0 0 0 1px rgba(251,247,239,.08),0 30px 70px -36px rgba(0,0,0,.8)}
.tkd-scene{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#1d1d1f}
.tkd-wall{position:absolute;inset:0;background:url(${WALL_DAY}) 30% 100%/cover no-repeat}
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
.tkd-mail-head{display:flex;flex-direction:column;gap:3px;padding:10px 14px 8px;border-bottom:1px solid rgba(0,0,0,.06)}
.tkd-mw.is-mail .tkd-mw-body{flex-direction:column}
.tkd-mail-head b{font-size:15px}.tkd-unread{font-size:10px;color:rgba(127,127,127,1);font-variant-numeric:tabular-nums}
.tkd-mails{flex:1;overflow:hidden}
.tkd-mrow{display:grid;grid-template-columns:8px auto 1fr;gap:8px;align-items:center;height:30px;padding:0 14px;border-bottom:1px solid rgba(0,0,0,.05);white-space:nowrap;overflow:hidden;transition:height .4s cubic-bezier(.625,.05,0,1),opacity .3s,background .3s}
.dfs-night .tkd-mrow{border-color:rgba(255,255,255,.05)}
.tkd-mrow i{width:7px;height:7px;border-radius:50%;background:#0a84ff}.tkd-mrow b{font-weight:600}.tkd-mrow span{overflow:hidden;text-overflow:ellipsis;opacity:.6}
.tkd-mrow.is-seen{background:rgba(10,108,255,.12)}.tkd-mrow.is-gone{height:0;opacity:0;border-width:0}
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
.tkh-intro{--c-card:#fbf7ef;--c-ink:#3d3a36;position:fixed;inset:0;z-index:60;display:grid;place-items:center;pointer-events:none}
.dfs-night .tkh-intro{--c-card:#292724;--c-ink:#fbf7ef}
.tkh-intro .tkh-tinko{transform-origin:50% 50%}
.tkh-win.is-boxed{opacity:0}
.tkh-tune{position:fixed;left:16px;bottom:16px;z-index:70;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:rgba(29,29,31,.88);color:#fff;font:11px/1 "Space Mono",monospace;letter-spacing:.04em;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.tkh-tune b{font-weight:400;opacity:.6;margin-right:4px;text-transform:uppercase}
.tkh-tune button{all:unset;cursor:pointer;padding:5px 8px;border-radius:4px;background:rgba(255,255,255,.12)}.tkh-tune button:hover{background:rgba(255,255,255,.22)}
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
  s.textContent += DEMO_CSS;
  document.head.append(s);
}

/* ---------- start ---------- */

function init() {
  injectCSS();
  introTitle();
  document.querySelectorAll('[data-tinko-stage]').forEach(initStage);
  if (!document.querySelector('[data-tinko-stage]')) heroTitle.play(120);
  document.querySelectorAll('[data-tinko-demo]').forEach(initDemo);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
