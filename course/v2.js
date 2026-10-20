/* Fundamentals V2 (/courses/fundamentals-v2, staging). Loaded only on that page (page head code):
   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@course-v2-v0.2.0/course/v2.js"></script>
   The course itself (lessons, player, cards) is dfsCourse in main.js; this adds the V2-only parts on top of it.

   Focus mode: a corner button on the video (FOCUS MODE). The menu rolls up to its top (the progress above it too),
   then the video slides out into the room it left, up to a height that still fits the screen (taller than that,
   black bars at the sides), then a MENU box slides out from behind the video's right edge into the page margin
   (just the burger where the margin is narrow). The box, the button again, Esc or opening another lesson play it
   back the other way. Desktop only (under 992px the menu is a bar above the lesson anyway) and only over a video.
   The menu: panels a step darker than the page, lesson rows alternating darker / lighter, dashed chevron buttons
   (blue on the open module), the open lesson's checkbox in blue.
   The open lesson's time: while its video plays, a small blue wave runs in its place; paused, it lies flat. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 992px)');
const root = document.documentElement;
root.classList.add('dfs-v2');

const EYE = '<svg viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M1 6s2.6-4.5 7-4.5S15 6 15 6s-2.6 4.5-7 4.5S1 6 1 6Z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.9" stroke="currentColor" stroke-width="1.2"/></svg>';
const BURGER = '<svg viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" stroke-width="1.3"/></svg>';
const GAP = 12; // px between the video's edge and the MENU box

const css = `
:root.dfs-v2 .course_module:not(.is-active){background-color:var(--brand-colors--bage)}
/* lesson rows take turns: a shade darker, a shade lighter, so a long module still reads row by row */
:root.dfs-v2 .c_item:not(.is-active){background-color:color-mix(in srgb,var(--brand-colors--light-bage) 35%,var(--brand-colors--bage))}
:root.dfs-v2 .c_item:nth-child(even):not(.is-active){background-color:color-mix(in srgb,var(--brand-colors--light-bage) 90%,var(--brand-colors--bage))}
/* the chevron buttons: a dashed outline; blue on the open module, and on a closed one under the pointer */
:root.dfs-v2 .accordion-css__item-icon{border:1px dashed color-mix(in srgb,var(--brand-colors--dark_gray) 40%,transparent);
  transition:transform .6s cubic-bezier(.625,.05,0,1),border-color .2s ease,color .2s ease,background-color .2s ease}
:root.dfs-v2 .course_module.is-active .accordion-css__item-icon,
:root.dfs-v2 .course_module:hover .accordion-css__item-icon{border-color:var(--brand-colors--blue);color:var(--brand-colors--blue)}
:root.dfs-v2 .course_module.is-active .accordion-css__item-icon{background-color:transparent}
:root.dfs-v2 .c_item .check_box{transition:border-color .25s ease}
:root.dfs-v2 .c_item.is-active .check_box{border-color:var(--brand-colors--blue)}
:root.dfs-v2 .c_item.is-active .check_fill{background-color:var(--brand-colors--blue)}

.v2-wave{display:none;width:2.4rem;height:.8rem;color:var(--brand-colors--blue)}
.v2-wave svg{display:block;width:100%;height:100%;overflow:visible}
.c_item.v2-wave-on .c_time{display:none}
.c_item.v2-wave-on .v2-wave{display:block}

.v2-focus-btn,.v2-menu-box{display:none}
@media (min-width:992px){
  .v2-focus-btn{position:absolute;top:1.25rem;right:1.25rem;z-index:15;display:flex;align-items:center;gap:.6rem;
    padding:.7rem 1rem;border:0;background:none;color:#fff;cursor:pointer;
    font-family:var(--_typography---font-styles--mono);font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;line-height:1;
    transition:opacity .3s ease,visibility 0s linear 0s}
  .v2-focus-btn::before{content:"";position:absolute;inset:0;pointer-events:none;
    --c:rgba(255,255,255,.9);--l:9px;--t:1.5px;
    background:linear-gradient(var(--c),var(--c)) top left/var(--l) var(--t),linear-gradient(var(--c),var(--c)) top left/var(--t) var(--l),
      linear-gradient(var(--c),var(--c)) top right/var(--l) var(--t),linear-gradient(var(--c),var(--c)) top right/var(--t) var(--l),
      linear-gradient(var(--c),var(--c)) bottom left/var(--l) var(--t),linear-gradient(var(--c),var(--c)) bottom left/var(--t) var(--l),
      linear-gradient(var(--c),var(--c)) bottom right/var(--l) var(--t),linear-gradient(var(--c),var(--c)) bottom right/var(--t) var(--l);
    background-repeat:no-repeat;transition:inset .35s cubic-bezier(.3,.7,.4,1)}
  .v2-focus-btn:hover::before,.v2-focus-btn:focus-visible::before{inset:-4px}
  .v2-focus-btn:focus-visible{outline:none}
  .v2-focus-btn svg{width:1rem;height:.75rem;flex:none}
  .v2-focus-btn span{text-shadow:0 1px 6px rgba(0,0,0,.35)}
  /* gone over a card, and while the video plays with its controls hidden (but never from under the pointer) */
  .next_lesson_container:has(.v2-card.is-active) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player:not([data-player-src])) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player[data-player-status="playing"]:not([data-player-hover="active"])) .v2-focus-btn:not(:hover){
    opacity:0;visibility:hidden;transition:opacity .3s ease,visibility 0s linear .3s}

  /* waits behind the video's right edge; focus mode slides it out into the margin */
  .v2-menu-box{position:absolute;top:0;left:calc(100% + ${GAP}px);z-index:5;display:flex;align-items:center;gap:.6rem;
    padding:.75rem .9rem;border:1px solid var(--brand-colors--dark-bage);background-color:var(--brand-colors--bage);
    color:var(--brand-colors--dark_gray);cursor:pointer;visibility:hidden;white-space:nowrap;
    font-family:var(--_typography---font-styles--mono);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;line-height:1;
    transition:background-color .2s ease}
  .v2-menu-box svg{width:.875rem;height:.625rem;flex:none}
  .v2-menu-box:hover{background-color:var(--brand-colors--dark-bage)}
  .v2-menu-box.is-compact{padding:.75rem}
  .v2-menu-box.is-compact span{display:none}

  /* bigger, but never taller than the screen: past that the video keeps its height and gets black sides */
  :root.v2-focus .bunny-player{background-color:#000}
  :root.v2-focus .bunny-player__before{padding-top:min(56.25%,calc(100svh - 7rem))}
  :root.v2-focus .bunny-player__placeholder{object-fit:contain}
}`;
const style = document.createElement('style');
style.id = 'dfs-course-v2-css';
style.textContent = css;
document.head.appendChild(style);

/* ---------- focus mode ---------- */

const stage = document.querySelector('.next_lesson_container');
const spacing = document.querySelector('.menu_spacing');
const menu = document.querySelector('.absolute_menu');
const progress = document.querySelector('.course_progrpess_wrap');
const course = document.querySelector('.course');

const button = document.createElement('button');
button.type = 'button';
button.className = 'v2-focus-btn';
button.innerHTML = EYE + '<span>Focus mode</span>';
const label = button.querySelector('span');

const box = document.createElement('button');
box.type = 'button';
box.className = 'v2-menu-box';
box.innerHTML = '<span>Menu</span>' + BURGER;
box.setAttribute('aria-label', 'Show the course menu');

const ready = !!(stage && spacing && menu && course);
if (ready) {
  stage.appendChild(button);
  stage.appendChild(box);
}

let focused = false;
let tl = null;

// The full box needs the margin right of the course; where that's narrow, the burger alone
function fitBox() {
  box.classList.remove('is-compact');
  const room = root.clientWidth - course.getBoundingClientRect().right;
  if (room < box.offsetWidth + GAP + 12) box.classList.add('is-compact');
}

// Rolling an element up to its top (or back down) only over the part that's on screen, so it starts moving at once
function rollRange(el) {
  const r = el.getBoundingClientRect();
  const shown = Math.min(r.height, Math.max(0, innerHeight - r.top)); // from its top down to the screen's bottom
  const gone = r.height - Math.max(0, Math.min(r.height, -r.top));    // its bottom edge up at its top (or the screen's)
  return { open: `inset(0px 0px ${r.height - shown}px 0px)`, shut: `inset(0px 0px ${gone}px 0px)` };
}

function bringVideoIntoView() {
  const player = document.getElementById('video-player');
  if (!player) return;
  const r = player.getBoundingClientRect();
  if (r.bottom <= innerHeight - 16 && r.top >= 0) return;
  if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(player, { offset: -24, duration: 0.8 });
  else window.scrollBy({ top: r.top - 24, behavior: reduce ? 'auto' : 'smooth' });
}

function enter() {
  const g = window.gsap;
  if (tl) tl.kill();
  root.classList.add('v2-focus');
  fitBox();
  const away = -(box.offsetWidth + GAP);
  const from = spacing.getBoundingClientRect().width;
  if (!g || reduce) {
    if (g) g.set([menu, progress], { visibility: 'hidden' });
    else { menu.style.visibility = 'hidden'; if (progress) progress.style.visibility = 'hidden'; }
    spacing.style.minWidth = '0px';
    box.style.visibility = 'visible';
    box.style.transform = 'none';
    bringVideoIntoView();
    return;
  }
  const m = rollRange(menu);
  tl = g.timeline();
  // 1. the menu rolls up to its top, the progress above it after
  tl.fromTo(menu, { clipPath: m.open }, { clipPath: m.shut, duration: 0.55, ease: 'power2.inOut' }, 0);
  if (progress) tl.fromTo(progress, { clipPath: 'inset(0px 0px 0px 0px)' },
    { clipPath: `inset(0px 0px ${progress.offsetHeight}px 0px)`, duration: 0.3, ease: 'power2.in' }, 0.3);
  tl.set([menu, progress].filter(Boolean), { visibility: 'hidden' });
  // 2. the video slides out into the room
  tl.fromTo(spacing, { minWidth: from }, { minWidth: 0, duration: 0.75, ease: 'power3.inOut' }, 0.45);
  // 3. the MENU box comes out from behind it
  tl.fromTo(box, { x: away, visibility: 'visible' }, { x: 0, duration: 0.5, ease: 'power3.out' }, 1.1);
  tl.add(bringVideoIntoView, 1.2);
}

function leave() {
  const g = window.gsap;
  if (tl) tl.kill();
  const done = () => {
    root.classList.remove('v2-focus');
    if (g) g.set([menu, progress, spacing, box].filter(Boolean), { clearProps: 'clipPath,visibility,minWidth,transform' });
    else [menu, progress, spacing, box].filter(Boolean).forEach((el) => el.removeAttribute('style'));
  };
  if (!g || reduce) { done(); return; }
  // where the room goes back to: the spacing's own width, measured without the tween's value
  const now = spacing.getBoundingClientRect().width;
  spacing.style.minWidth = '';
  const to = spacing.getBoundingClientRect().width;
  spacing.style.minWidth = now + 'px';
  g.set([menu, progress].filter(Boolean), { visibility: 'visible' });
  const m = rollRange(menu);
  if (!menu.style.clipPath) g.set(menu, { clipPath: m.shut });
  if (progress && !progress.style.clipPath) g.set(progress, { clipPath: `inset(0px 0px ${progress.offsetHeight}px 0px)` });
  tl = g.timeline({ onComplete: done });
  // the same three steps backwards: the box slides back in behind the video, the video draws in, the menu rolls down
  tl.to(box, { x: -(box.offsetWidth + GAP), duration: 0.35, ease: 'power2.in' }, 0);
  tl.set(box, { visibility: 'hidden' });
  tl.fromTo(spacing, { minWidth: now }, { minWidth: to, duration: 0.7, ease: 'power3.inOut' }, 0.25);
  if (progress) tl.to(progress, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.3, ease: 'power2.out' }, 0.8);
  tl.to(menu, { clipPath: m.open, duration: 0.55, ease: 'power2.inOut' }, 0.85);
}

function setFocus(on) {
  on = !!on && desktop.matches && ready;
  if (on === focused) return;
  focused = on;
  label.textContent = on ? 'Exit focus' : 'Focus mode';
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (on) enter(); else leave();
}

button.addEventListener('click', () => setFocus(!focused));
box.addEventListener('click', () => setFocus(false));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !focused) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return; // Esc leaves fullscreen first
  setFocus(false);
});
desktop.addEventListener('change', () => { if (!desktop.matches) setFocus(false); });
addEventListener('resize', () => { if (focused) fitBox(); });

/* ---------- the open lesson ---------- */

const W = 40, H = 12, MID = H / 2, AMP = 3.6, WAVELENGTH = 13, PERIOD = 1300; // svg units, ms per wave

let openItem = document.querySelector('.c_item.is-active');
let waveItem = null, path = null;
let amp = 0, target = 0, phase = 0, last = 0, raf = 0;

function waveIn(item) {
  let wave = item.querySelector('.v2-wave');
  if (!wave) {
    wave = document.createElement('div');
    wave.className = 'v2-wave';
    wave.setAttribute('aria-hidden', 'true');
    wave.innerHTML = `<svg viewBox="0 0 ${W} ${H}" fill="none"><path stroke="currentColor" stroke-width="1.3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
    const duration = item.querySelector('.lesson_duration') || item;
    duration.appendChild(wave);
  }
  return wave.querySelector('path');
}

function draw() {
  let d = '';
  for (let x = 0; x <= W; x += 1) {
    const y = MID + amp * AMP * Math.sin((x / WAVELENGTH) * Math.PI * 2 - phase);
    d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(2);
  }
  path.setAttribute('d', d);
}

function tick(now) {
  const dt = Math.min(64, now - (last || now));
  last = now;
  amp += (target - amp) * Math.min(1, dt / 160);
  if (Math.abs(target - amp) < 0.005) amp = target;
  if (!reduce) phase += (dt / PERIOD) * Math.PI * 2 * Math.max(amp, 0.15);
  if (!focused) draw(); // the menu is away in focus mode, nothing to see
  if (amp === target && target === 0) { raf = 0; last = 0; draw(); return; }
  raf = requestAnimationFrame(tick);
}

function run() { if (!raf && path) raf = requestAnimationFrame(tick); }

function setPlaying(playing) {
  if (playing && openItem) {
    if (waveItem !== openItem) {
      if (waveItem) waveItem.classList.remove('v2-wave-on');
      waveItem = openItem;
      path = waveIn(waveItem);
      amp = 0;
    }
    waveItem.classList.add('v2-wave-on');
  }
  target = playing ? 1 : 0;
  if (waveItem) run();
}

function onStatus(player) {
  const s = player.getAttribute('data-player-status');
  if (s === 'playing') setPlaying(true);
  else if (s === 'paused' || s === 'idle' || s === 'ready') setPlaying(false);
  // loading (buffering) keeps the wave as it is
}

function onLesson() {
  const now = document.querySelector('.c_item.is-active');
  if (now === openItem) return;
  openItem = now;
  setFocus(false); // focus mode is for one video, not the course
  if (waveItem && waveItem !== openItem) {
    waveItem.classList.remove('v2-wave-on');
    waveItem = null; path = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0; amp = 0; target = 0;
  }
}

new MutationObserver((records) => {
  let lesson = false;
  for (const r of records) {
    const el = r.target;
    if (r.attributeName === 'data-player-status' && el.matches('[data-bunny-player-init]')) onStatus(el);
    else if (r.attributeName === 'class' && el.classList.contains('c_item')) lesson = true;
  }
  if (lesson) onLesson();
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-player-status', 'class'] });
