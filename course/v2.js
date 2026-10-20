/* Fundamentals V2 (/courses/fundamentals-v2, staging). Loaded only on that page (page head code):
   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@course-v2-v0.1.0/course/v2.js"></script>
   The course itself (lessons, player, cards) is dfsCourse in main.js; this adds the V2-only parts on top of it.

   Focus mode: a corner button on the video (FOCUS MODE). It slides the menu (and the progress above it) away and the video grows into the
   room it leaves, up to a height that still fits the screen (taller than that, black bars at the sides). A MENU box
   takes the menu's place; it, the button again, Esc, or opening another lesson bring the menu back. Desktop only
   (under 992px the menu is a bar above the lesson anyway) and only over a video, not over a card.
   The menu: panels a step darker than the page, the open lesson's checkbox in blue.
   The open lesson's time: while its video plays, a small blue wave runs in its place; paused, it lies flat. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 992px)');
const root = document.documentElement;
root.classList.add('dfs-v2');

const EYE = '<svg viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M1 6s2.6-4.5 7-4.5S15 6 15 6s-2.6 4.5-7 4.5S1 6 1 6Z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.9" stroke="currentColor" stroke-width="1.2"/></svg>';
const BURGER = '<svg viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" stroke-width="1.3"/></svg>';

const css = `
:root.dfs-v2 .course_module:not(.is-active){background-color:var(--brand-colors--bage)}
:root.dfs-v2 .c_item:not(.is-active){background-color:color-mix(in srgb,var(--brand-colors--light-bage) 55%,var(--brand-colors--bage))}
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
  /* gone over a card, and while the video plays with its controls hidden */
  .next_lesson_container:has(.v2-card.is-active) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player:not([data-player-src])) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player[data-player-status="playing"]:not([data-player-hover="active"])) .v2-focus-btn{
    opacity:0;visibility:hidden;transition:opacity .3s ease,visibility 0s linear .3s}

  /* the menu leaves first, then the room it had closes up, then the MENU box comes in (back out: the other way round) */
  :root.dfs-v2 .absolute_menu{transition:opacity .4s ease .5s,transform .5s cubic-bezier(.3,.7,.4,1) .45s,visibility 0s linear 0s}
  :root.v2-focus .absolute_menu{opacity:0;transform:translateX(2.5rem);visibility:hidden;pointer-events:none;
    transition:opacity .3s ease,transform .4s cubic-bezier(.6,0,.8,.4),visibility 0s linear .4s}
  :root.dfs-v2 .course_progrpess_wrap{transition:opacity .4s ease .5s,visibility 0s linear 0s}
  :root.v2-focus .course_progrpess_wrap{opacity:0;visibility:hidden;transition:opacity .3s ease,visibility 0s linear .3s}
  :root.dfs-v2 .menu_spacing{display:flex;justify-content:flex-end;align-self:stretch;
    transition:min-width .7s cubic-bezier(.65,0,.35,1) .1s}
  :root.v2-focus .menu_spacing{min-width:6.5rem;transition-delay:.2s}
  .v2-menu-box{position:sticky;top:6rem;display:flex;align-items:center;gap:.6rem;height:fit-content;
    padding:.75rem .9rem;border:1px solid var(--brand-colors--dark-bage);background-color:var(--brand-colors--bage);
    color:var(--brand-colors--dark_gray);cursor:pointer;
    font-family:var(--_typography---font-styles--mono);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;line-height:1;
    opacity:0;visibility:hidden;transform:translateX(.6rem);
    transition:opacity .2s ease,transform .25s ease,visibility 0s linear .25s,background-color .2s ease}
  .v2-menu-box svg{width:.875rem;height:.625rem;flex:none}
  .v2-menu-box:hover{background-color:var(--brand-colors--dark-bage)}
  :root.v2-focus .v2-menu-box{opacity:1;visibility:visible;transform:none;
    transition:opacity .35s ease .75s,transform .45s cubic-bezier(.3,.7,.4,1) .75s,visibility 0s linear .75s,background-color .2s ease}

  /* bigger, but never taller than the screen: past that the video keeps its height and gets black sides */
  :root.v2-focus .bunny-player{background-color:#000}
  :root.v2-focus .bunny-player__before{padding-top:min(56.25%,calc(100svh - 7rem))}
  :root.v2-focus .bunny-player__placeholder{object-fit:contain}
}
@media (prefers-reduced-motion:reduce){
  :root.dfs-v2 .absolute_menu,:root.v2-focus .absolute_menu,:root.dfs-v2 .course_progrpess_wrap,:root.v2-focus .course_progrpess_wrap,:root.dfs-v2 .menu_spacing,.v2-menu-box,:root.v2-focus .v2-menu-box{transition:none}
}`;
const style = document.createElement('style');
style.id = 'dfs-course-v2-css';
style.textContent = css;
document.head.appendChild(style);

/* ---------- focus mode ---------- */

const stage = document.querySelector('.next_lesson_container');
const spacing = document.querySelector('.menu_spacing');

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

if (stage && spacing) {
  stage.appendChild(button);
  spacing.appendChild(box);
}

let focused = false;

function setFocus(on) {
  on = !!on && desktop.matches;
  if (on === focused) return;
  focused = on;
  root.classList.toggle('v2-focus', on);
  label.textContent = on ? 'Exit focus' : 'Focus mode';
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (on) {
    // once the video has grown (.2s wait + .7s), bring all of it into view if it runs past the bottom
    setTimeout(() => {
      if (!focused) return;
      const player = document.getElementById('video-player');
      if (!player) return;
      const r = player.getBoundingClientRect();
      if (r.bottom <= innerHeight - 16 && r.top >= 0) return;
      if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(player, { offset: -24, duration: 0.8 });
      else window.scrollBy({ top: r.top - 24, behavior: reduce ? 'auto' : 'smooth' });
    }, reduce ? 0 : 950);
  }
}

button.addEventListener('click', () => setFocus(!focused));
box.addEventListener('click', () => setFocus(false));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !focused) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return; // Esc leaves fullscreen first
  setFocus(false);
});
desktop.addEventListener('change', () => { if (!desktop.matches) setFocus(false); });

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
