/* =========================================================
   dfs-sound: Timer's sounds on the homepage (test: /rimbo-home-test, loaded by dive/dive.js, which maps the parts)

   Sound means something answered you (Rim, 18 Oct 2026; the rule comes from his Timer app,
   timer/Sources/Feedback.swift). On the web it is mostly hover: people click little, and a click is usually a link
   that leaves the page. Elements opt in with one of four cases:

     data-sound="look"     data that shows what it holds as the pointer runs over it: the clear tick on hover
     data-sound="point"    links, buttons, cards, the menu: the soft tick on hover (touch: on the tap)
     data-sound="do"       the main calls to action: the soft tick on hover, the press on click
     data-sound="choose"   quiet on hover, the soft tick on click (for long lists you cross on the way somewhere else)
     data-sound="off"      silent (also inside a wrapper)

   A wrapper gives every link and button inside it (and every [data-sound-item]) one case:
     data-sound-each="point"
   Or a page script maps selectors to cases (works for parts built later): dfsSound.map({ '.journal_card': 'point' })
   The nearest one wins. Keyboard focus counts as the pointer arriving.

   Off until the visitor turns it on with the toggle ([data-sound-toggle], a button; when the page has none, one is
   built: a twin of the night toggle, the same square left of it, with a pixel speaker). Remembered in localStorage
   'dfs-sound'. Browsers keep audio locked until the first click, tap or key, so the sound wakes on that gesture.
   Hover sounds only where a mouse can hover, one per 40 ms, and only when the pointer moves (not the page under it).
   Nothing runs while the tab is hidden.

   The ticks are drawn once into tiny buffers, no audio files: an exponential pitch sweep with a 2 ms attack and an
   exponential fade, a few pitch variants picked at random. Timer's values.

   Ambience (a soft bed under the page) is off until a page asks for it: dfsSound.ambience({ src: url }) loops a file,
   dfsSound.ambience({ wind: true }) plays a wind-and-water bed made in the browser. It never starts by itself: only
   once the visitor turns sound on; it fades in, and rests while the tab is hidden.

   Other scripts can play the ticks: window.dfsSound.look() / .point() / .choose() / .do() (silent while sound is off),
   e.g. the time story ticking as the year fills.
   ========================================================= */
(() => {
  if (window.dfsSound) return;
  const KEY = 'dfs-sound';
  // clear tick (look), soft tick (point, choose, the hover of do), press (do)
  const T = {
    master: 1,
    look:  { from: 1300, spread: 40, n: 6, to: 800, dur: .020, gain: .022, pitch: 1 },
    point: { from: 760,  spread: 30, n: 4, to: 460, dur: .014, gain: .013, pitch: 1 },
    press: { from: 620,  spread: 0,  n: 1, to: 330, dur: .045, gain: .032, pitch: 1 },
  };
  const read = () => { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
  const write = v => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} };
  const now = () => performance.now();
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');

  let on = read(), ctx = null, out = null, bufs = null;
  let lastHover = -1e9, lastDown = { type: '', t: -1e9 }, px = null, py = null;
  const toggles = new Set();

  /* ---- the ticks ---- */
  function blip(rate, from, to, dur, gain) {
    const frames = Math.ceil((dur + .01) * rate), buf = ctx.createBuffer(1, frames, rate), s = buf.getChannelData(0), floor = 1e-4;
    let phase = 0;
    for (let n = 0; n < frames; n++) {
      const t = n / rate;
      phase += 2 * Math.PI * from * Math.pow(to / from, Math.min(t / dur, 1)) / rate;
      const env = t < .002 ? floor * Math.pow(gain / floor, t / .002)
        : t < dur ? gain * Math.pow(floor / gain, (t - .002) / (dur - .002)) : 0;
      s[n] = Math.sin(phase) * env;
    }
    return buf;
  }
  function render() {
    if (!ctx) return;
    const set = k => { const t = T[k]; return Array.from({ length: t.n }, (_, i) => blip(ctx.sampleRate, (t.from + i * t.spread) * t.pitch, t.to * t.pitch, t.dur, t.gain)); };
    bufs = { look: set('look'), point: set('point'), press: set('press') };
    out.gain.value = T.master;
  }

  /* ---- audio wakes on a gesture (browsers allow nothing before) ---- */
  function wake() {
    if (!on || document.hidden) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
      out = ctx.createGain(); out.connect(ctx.destination);
      render();
      // older iPhones unlock the output only once something plays inside the gesture
      const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start();
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    bedStart();
  }

  // a hover only sounds once the audio runs; a click that woke it waits a moment for it
  function play(kind, gesture) {
    if (!on || !ctx || !bufs) return;
    const go = () => {
      const list = bufs[kind], s = ctx.createBufferSource();
      s.buffer = list[Math.random() * list.length | 0]; s.connect(out); s.start();
    };
    if (ctx.state === 'running') go();
    else if (gesture) { const t = now(); ctx.resume().then(() => { if (now() - t < 400) go(); }).catch(() => {}); }
  }
  const throttled = kind => { const n = now(); if (n - lastHover < 40) return; lastHover = n; play(kind); };

  /* ---- which case an element is: the nearest data-sound, map rule or data-sound-each wrapper wins ---- */
  const EACH = 'a, button, [role="button"], input[type="submit"], [data-sound-item]';
  let rules = [];   // [selector, case] pairs from dfsSound.map(), for parts other scripts build later
  function find(node) {
    let item = null;
    for (let el = node instanceof Element ? node : node && node.parentElement; el; el = el.parentElement) {
      const own = el.getAttribute('data-sound');
      if (own) return own === 'off' ? null : { el, kind: own };
      for (const [sel, kind] of rules) if (el.matches(sel)) return kind === 'off' ? null : { el, kind };
      if (!item && el.matches(EACH)) item = el;
      const each = item && el.getAttribute('data-sound-each');
      if (each) return each === 'off' ? null : { el: item, kind: each };
    }
    return null;
  }
  const arrive = hit => {
    if (!hit) return;
    if (hit.kind === 'look') throttled('look');
    else if (hit.kind === 'point' || hit.kind === 'do') throttled('point');
  };

  // hover: the pointer arrives (a mouse). The page scrolling under a still pointer doesn't count: browsers then send
  // hover events too, but at the spot where the pointer already was
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true, capture: true });
  document.addEventListener('pointerover', e => {
    const moved = px === null || e.clientX !== px || e.clientY !== py;
    px = e.clientX; py = e.clientY;
    if (!on || e.pointerType === 'touch' || !mouse.matches || !moved) return;
    const hit = find(e.target);
    if (!hit || (e.relatedTarget instanceof Node && hit.el.contains(e.relatedTarget))) return;
    arrive(hit);
  }, { passive: true });
  document.addEventListener('focusin', e => {
    if (on && e.target instanceof Element && e.target.matches(':focus-visible')) arrive(find(e.target));
  });
  // click: a mouse answers on the press; a tap (a drag is not a tap) or a key on the click
  document.addEventListener('pointerdown', e => {
    lastDown = { type: e.pointerType, t: now() };
    wake();
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const hit = find(e.target);
    if (hit && hit.kind === 'do') play('press', true);
    else if (hit && hit.kind === 'choose') play('point', true);
  }, true);
  document.addEventListener('click', e => {
    wake();
    const tap = e.detail === 0 || (lastDown.type === 'touch' && now() - lastDown.t < 1500);
    const hit = tap && find(e.target);
    if (!hit) return;
    if (hit.kind === 'do') play('press', true);
    else if (hit.kind === 'choose' || hit.kind === 'point') play('point', true);
  }, true);
  addEventListener('keydown', wake, true);
  addEventListener('touchend', wake, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend().catch(() => {}); return; }
    if (on) { ctx.resume().catch(() => {}); if (bed) bed.fadeIn(); }
  });

  /* ---- ambience ---- */
  let bedWant = null, bed = null;
  function bedStart() {
    if (!bedWant || bed || !on || !ctx) return;
    const level = bedWant.level || .01;
    const vol = ctx.createGain(); vol.gain.value = 0; vol.connect(ctx.destination);
    const nodes = [];
    const fadeIn = () => { vol.gain.cancelScheduledValues(ctx.currentTime); vol.gain.setValueAtTime(0, ctx.currentTime); vol.gain.setTargetAtTime(level, ctx.currentTime + .05, 1.2); };
    bed = {
      fadeIn,
      fadeOut() { vol.gain.cancelScheduledValues(ctx.currentTime); vol.gain.setTargetAtTime(0, ctx.currentTime, .08); },
      stop() { this.fadeOut(); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 600); },
    };
    if (bedWant.src) {
      fetch(bedWant.src).then(r => r.arrayBuffer()).then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).then(buf => {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; nodes.push(src);
        src.connect(vol); src.start(); fadeIn();
      }).catch(e => console.warn('[sound] ambience did not load', e));
      return;
    }
    // wind and water: pink noise (8 s, seam crossfaded), through a filter that drifts slowly, with a slow swell
    const rate = ctx.sampleRate, len = rate * 8, X = rate, buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const raw = new Float32Array(len + X);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < raw.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362; b6 = w * .115926;
      }
      const d = buf.getChannelData(c);
      let sq = 0;
      for (let i = 0; i < len; i++) { d[i] = i < X ? raw[i] * (i / X) + raw[len + i] * (1 - i / X) : raw[i]; sq += d[i] * d[i]; }
      const k = 1 / Math.sqrt(sq / len);
      for (let i = 0; i < len; i++) d[i] *= k;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .3;
    const drift = ctx.createOscillator(); drift.frequency.value = .045;
    const driftG = ctx.createGain(); driftG.gain.value = 450; drift.connect(driftG).connect(lp.frequency);
    const body = ctx.createGain(); body.gain.value = .75;
    const swell = ctx.createOscillator(); swell.frequency.value = .08;
    const swellG = ctx.createGain(); swellG.gain.value = .25; swell.connect(swellG).connect(body.gain);
    src.connect(lp).connect(body).connect(vol);
    nodes.push(src, drift, swell);
    nodes.forEach(n => n.start());
    fadeIn();
  }

  /* ---- the toggle: a twin of the night toggle (night/night.js), the same square with a 9x9 pixel speaker ---- */
  const pixels = (rows, cls) => `<svg class="${cls}" viewBox="0 0 9 9" fill="currentColor" aria-hidden="true">`
    + rows.map((row, y) => [...row].map((c, x) => c === 'X' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '').join('')).join('') + '</svg>';
  const SPEAKER_ON = pixels(['...X.....', '..XX..X..', '..XX...X.', 'XXXX.X..X', 'XXXX.X..X', 'XXXX.X..X', '..XX...X.', '..XX..X..', '...X.....'], 'sound-on');
  const SPEAKER_OFF = pixels(['...X.....', '..XX.....', '..XX.....', 'XXXX..X.X', 'XXXX...X.', 'XXXX..X.X', '..XX.....', '..XX.....', '...X.....'], 'sound-off');
  function setOn(v) {
    on = !!v; write(on);
    document.documentElement.classList.toggle('sound-on', on);
    toggles.forEach(paint);
    if (on) { wake(); play('press', true); if (bed) bed.fadeIn(); }
    else if (ctx) {
      if (bed) bed.fadeOut();
      setTimeout(() => { if (!on && ctx) ctx.suspend().catch(() => {}); }, bed ? 350 : 0);
    }
    dispatchEvent(new CustomEvent('dfs-sound', { detail: { on } }));
  }
  function paint(b) {
    const label = on ? 'Turn sound off' : 'Turn sound on';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', label); b.title = label;
    b.classList.toggle('is-on', on);
  }
  const CSS = `
.sound-toggle{position:fixed;z-index:9000;top:1rem;right:4.25rem;width:2.75rem;height:2.75rem;display:flex;align-items:center;justify-content:center;
margin:0;padding:0;border:1px solid var(--brand-colors--dark-bage,#dfd5c9);border-radius:.25rem;background-color:var(--brand-colors--bage,#f1ede2);
color:var(--brand-colors--dark_gray,#3d3a35);cursor:pointer;-webkit-tap-highlight-color:transparent}
.sound-toggle:focus-visible{outline:1px solid var(--brand-colors--blue,#0297db);outline-offset:-4px}
.sound-toggle svg{width:18px;height:18px;shape-rendering:crispEdges;display:block}
.sound-toggle .sound-on,.sound-toggle.is-on .sound-off{display:none}
.sound-toggle.is-on .sound-on{display:block}`;
  function build() {
    if (!document.getElementById('dfs-sound-css')) {
      const st = document.createElement('style'); st.id = 'dfs-sound-css'; st.textContent = CSS; document.head.append(st);
    }
    let list = [...document.querySelectorAll('[data-sound-toggle]')];
    if (!list.length) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sound-toggle'; b.setAttribute('data-sound-toggle', '');
      document.body.append(b); list = [b];
    }
    list.forEach(b => {
      if (!b.children.length) b.innerHTML = SPEAKER_OFF + SPEAKER_ON;
      b.addEventListener('click', () => setOn(!on));
      toggles.add(b); paint(b);
    });
    document.documentElement.classList.toggle('sound-on', on);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();

  window.dfsSound = {
    look: () => throttled('look'),
    point: () => throttled('point'),
    choose: () => play('point'),
    do: () => play('press'),
    get on() { return on; },
    set: setOn,
    // a page gives its parts a case without attributes: { '.journal_card': 'point', ... }
    map(m) { rules = rules.concat(Object.entries(m)); },
    // a bed under the page: { src: url } or { wind: true }, with an optional level (0.01 = soft); false stops it
    ambience(opts) {
      if (bed) { bed.stop(); bed = null; }
      bedWant = opts || null;
      bedStart();
    },
    // for the sound lab: change the values ({ master, look: { gain, pitch }, ... }) and redraw the ticks
    tune(patch) {
      if ('master' in patch) T.master = patch.master;
      ['look', 'point', 'press'].forEach(k => { if (patch[k]) Object.assign(T[k], patch[k]); });
      render();
    },
    get values() { return JSON.parse(JSON.stringify(T)); },
    audio: () => (ctx ? { ctx, out } : null),
  };
})();
