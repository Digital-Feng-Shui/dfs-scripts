/* Fundamentals V2 (/courses/fundamentals-v2, staging). Loaded only on that page (page head code):
   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@course-v2-v0.9.3/course/v2.js"></script>
   The course itself (lessons, player, cards) is dfsCourse in main.js; this adds the V2-only parts on top of it.

   Focus mode: a corner button on the video (FOCUS MODE). The menu rolls up to its top and the progress block above
   the lesson folds up into the line under the top bar, so the video rises to sit right under it; then the video
   slides out into the room the menu left, sized so it and the Previous / Next bar fill the screen (never taller than
   MAX_H: past that, black bars at the sides); then a MENU box slides out from behind the video's right edge into
   the page margin (just the burger where the margin is narrow). The box, the button again, Esc or opening another
   lesson play it back the other way. The box sits on the same line as the button and is just as tall (Rim, 21 Oct):
   same job, same row. Desktop only (under 992px the menu is a bar above the lesson anyway) and only
   over a video. While the pointer rests on the button, the video keeps its hover look (darker, controls) under it.
   Its corner marks point out (bigger); in focus mode they flip to point in (smaller).
   The menu: panels a step darker than the page, lesson rows alternating darker / lighter, dashed chevron buttons
   (blue on the open module), the open lesson's checkbox in blue.
   The open lesson's time: while its video plays, a small blue wave runs in its place; paused, it lies flat.
   The instructor panel in 0.1 Welcome: the photo floats, the dashed circles turn.
   Lesson texts: the tag sits top right on the title's line, with the same inset as the text; extra tags (workfile ↓,
   resources ↓) stack under it and glide down to the link boxes below the text. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 992px)');
const root = document.documentElement;
root.classList.add('dfs-v2');

const EYE = '<svg viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M1 6s2.6-4.5 7-4.5S15 6 15 6s-2.6 4.5-7 4.5S1 6 1 6Z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.9" stroke="currentColor" stroke-width="1.2"/></svg>';
const BURGER = '<svg viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" stroke-width="1.3"/></svg>';
const GAP = 12;     // px between the video's edge and the MENU box
const MAX_H = 820; // px, the tallest the video gets in focus mode (a big screen would otherwise be all video)

const css = `
:root.dfs-v2 .course_module:not(.is-active){background-color:var(--brand-colors--bage)}
/* lesson rows take turns: a shade darker, a shade lighter, so a long module still reads row by row */
:root.dfs-v2 .c_item:not(.is-active){background-color:color-mix(in srgb,var(--brand-colors--light-bage) 35%,var(--brand-colors--bage))}
:root.dfs-v2 .c_item:nth-child(even):not(.is-active){background-color:color-mix(in srgb,var(--brand-colors--light-bage) 90%,var(--brand-colors--bage))}
/* the chevron buttons: a dashed outline, blue on the open module */
:root.dfs-v2 .accordion-css__item-icon{border:1px dashed color-mix(in srgb,var(--brand-colors--dark_gray) 40%,transparent);
  transition:transform .6s cubic-bezier(.625,.05,0,1),border-color .2s ease,color .2s ease,background-color .2s ease}
:root.dfs-v2 .course_module.is-active .accordion-css__item-icon{border-color:var(--brand-colors--blue);color:var(--brand-colors--blue)}
:root.dfs-v2 .course_module.is-active .accordion-css__item-icon{background-color:transparent}
:root.dfs-v2 .c_item .check_box{transition:border-color .25s ease}
:root.dfs-v2 .c_item.is-active .check_box{border-color:var(--brand-colors--blue)}
:root.dfs-v2 .c_item.is-active .check_fill{background-color:var(--brand-colors--blue)}

.v2-wave{display:none;width:2.4rem;height:.8rem;color:var(--brand-colors--blue)}
.v2-wave svg{display:block;width:100%;height:100%;overflow:visible}
.c_item.v2-wave-on .c_time{display:none}
.c_item.v2-wave-on .v2-wave{display:block}

/* the instructor panel (0.1): the photo floats up and down the way the homepage's does; the name tag floats on its own,
   less far and a beat behind, so the two drift against each other (depth). The two dashed circles turn slowly,
   opposite ways. All of it only moves while the panel is on screen. */
@keyframes v2-turn{to{transform:rotate(360deg)}}
@keyframes v2-float{0%,100%{translate:0 0}50%{translate:0 -12px}}
@keyframes v2-float-tag{0%,100%{translate:0 0}50%{translate:0 -5px}}
.v2-instructor_panel .instructor_circle{animation:v2-turn 70s linear infinite paused}
.v2-instructor_panel .instructor_circle.v2-circle-top{animation-duration:90s;animation-direction:reverse}
.v2-instructor_panel .instructor_image{animation:v2-float 6s ease-in-out infinite paused}
.v2-instructor_panel .instructor_tag{animation:v2-float-tag 6s ease-in-out -4.6s infinite paused}
.v2-instructor_panel.is-shown .instructor_circle,.v2-instructor_panel.is-shown .instructor_image,.v2-instructor_panel.is-shown .instructor_tag{animation-play-state:running}
/* the text sits in a narrower column, centred in its half */
.v2-instructor_body>*{width:100%;max-width:25rem}
@media (max-width:767px){.v2-instructor_body>*{max-width:none}}
@media (prefers-reduced-motion:reduce){.v2-instructor_panel .instructor_circle,.v2-instructor_panel .instructor_image,.v2-instructor_panel .instructor_tag{animation:none}}

/* lesson text: the tag sits top right on the title's line, as far in from the right as the text is from the left,
   the same on every lesson (on phones it stays above the title). Extra tags (workfile ↓, resources ↓, ...) stack
   under it, right-aligned, and lead to the link boxes below the text. Title and text never run under the tags.
   A little more room above the title and under it; body lines a touch tighter than the site's 2 */
@media (min-width:768px){
  :root.dfs-v2 .course_content.is-active{padding-top:3rem}
  :root.dfs-v2 .course_content{position:relative}
  :root.dfs-v2 .course_content>.tags_box{position:absolute;top:calc(3rem + .625rem);right:4rem;flex-direction:column;align-items:flex-end;row-gap:.5rem}
  :root.dfs-v2 .course_content:has(>.tags_box>.hero_tag+.hero_tag) .p_course{max-width:min(32rem,calc(100% - 10rem))}
  :root.dfs-v2 .course_content .heading-style-h3{max-width:calc(100% - 10rem)}
}
@media (min-width:768px) and (max-width:991px){
  :root.dfs-v2 .course_content>.tags_box{top:calc(3rem + .475rem);right:1.5rem}
}
:root.dfs-v2 .course_content .heading-style-h3{margin-bottom:.75rem}
:root.dfs-v2 .v2-welcome_flow>.heading-style-h3{margin-bottom:1.25rem}
:root.dfs-v2 .course_content .p_course{line-height:1.85}
:root.dfs-v2 .course_content .hero_tag.is-template,:root.dfs-v2 .course_content .hero_tag.is-work{cursor:pointer}
.v2-text_links .v2-link{min-height:7.5rem}

.v2-focus-btn,.v2-menu-box{display:none}
@media (min-width:992px){
  .v2-focus-btn{position:absolute;top:1.25rem;right:1.25rem;z-index:15;display:flex;align-items:center;gap:.6rem;
    box-sizing:border-box;height:2.25rem;padding:0 1rem;border:0;background:none;color:#fff;cursor:pointer;
    font-family:var(--_typography---font-styles--mono);font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;line-height:1;
    transition:opacity .3s ease,visibility 0s linear 0s}
  /* the four corners: outside focus mode they point out (bigger) and step out on hover; in focus mode they flip to
     point in (smaller), like an exit-fullscreen icon, and step in on hover */
  .v2-fc{position:absolute;width:9px;height:9px;pointer-events:none;border:0 solid rgba(255,255,255,.9);
    transition:scale .4s cubic-bezier(.6,0,.3,1),translate .35s cubic-bezier(.3,.7,.4,1)}
  .v2-fc.is-tl{top:0;left:0;border-top-width:1.5px;border-left-width:1.5px}
  .v2-fc.is-tr{top:0;right:0;border-top-width:1.5px;border-right-width:1.5px}
  .v2-fc.is-bl{bottom:0;left:0;border-bottom-width:1.5px;border-left-width:1.5px}
  .v2-fc.is-br{bottom:0;right:0;border-bottom-width:1.5px;border-right-width:1.5px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tl{translate:-4px -4px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tr{translate:4px -4px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-bl{translate:-4px 4px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-br{translate:4px 4px}
  :root.v2-focus .v2-fc{scale:-1}
  :root.v2-focus .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tl{translate:3px 3px}
  :root.v2-focus .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tr{translate:-3px 3px}
  :root.v2-focus .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-bl{translate:3px -3px}
  :root.v2-focus .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-br{translate:-3px -3px}
  /* the button sits over the player, not in it, so reaching it counts as leaving the player: while the pointer is on
     it, hold the player's hover look (darker video, controls) so the white label keeps its ground */
  .next_lesson_container:has(.v2-focus-btn:hover) .bunny-player[data-player-status="playing"] .bunny-player__dark{opacity:.3}
  .next_lesson_container:has(.v2-focus-btn:hover) .bunny-player[data-player-status] .bunny-player__interface{opacity:1;transform:translateY(0) rotate(.001deg)}
  .v2-focus-btn:focus-visible{outline:none}
  .v2-focus-btn svg{width:1rem;height:.75rem;flex:none}
  .v2-focus-btn span{text-shadow:0 1px 6px rgba(0,0,0,.35)}
  /* gone over a card, and while the video plays with its controls hidden (but never from under the pointer) */
  .next_lesson_container:has(.v2-card.is-active) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player:not([data-player-src])) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player[data-player-status="playing"]:not([data-player-hover="active"])) .v2-focus-btn:not(:hover){
    opacity:0;visibility:hidden;transition:opacity .3s ease,visibility 0s linear .3s}

  /* waits behind the video's right edge; focus mode slides it out into the margin */
  .v2-menu-box{position:absolute;top:1.25rem;left:calc(100% + ${GAP}px);z-index:5;display:flex;align-items:center;gap:.6rem;
    box-sizing:border-box;height:2.25rem;padding:0 .9rem;border:1px solid var(--brand-colors--dark-bage);background-color:var(--brand-colors--bage);
    color:var(--brand-colors--dark_gray);cursor:pointer;visibility:hidden;white-space:nowrap;
    font-family:var(--_typography---font-styles--mono);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;line-height:1;
    transition:background-color .2s ease}
  .v2-menu-box svg{width:.875rem;height:.625rem;flex:none}
  .v2-menu-box:hover{background-color:var(--brand-colors--dark-bage)}
  .v2-menu-box.is-compact{padding:0 .75rem}
  .v2-menu-box.is-compact span{display:none}

  /* as big as fits between the top bar and Previous / Next (--v2-fit, set by fitVideo); past that, black sides */
  :root.v2-focus .bunny-player{background-color:#000}
  :root.v2-focus .bunny-player__before{padding-top:min(56.25%,var(--v2-fit,calc(100svh - 10rem)))}
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
const block = document.querySelector('.progress_top');          // the progress block above the lesson (grid, title, bar)
const blockInner = document.querySelector('.course_title_box');
const course = document.querySelector('.course');

const button = document.createElement('button');
button.type = 'button';
button.className = 'v2-focus-btn';
button.innerHTML = '<i class="v2-fc is-tl"></i><i class="v2-fc is-tr"></i><i class="v2-fc is-bl"></i><i class="v2-fc is-br"></i>' + EYE + '<span>Focus mode</span>';
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

// The room between the top bar and the Previous / Next bar, so the two fill the screen together
function fitVideo() {
  const nav = document.querySelector('.navbar_component');
  const bar = document.querySelector('.course_navigation_bar');
  const room = innerHeight - (nav ? nav.offsetHeight : 0) - (bar ? bar.offsetHeight : 0) - 2;
  root.style.setProperty('--v2-fit', Math.round(Math.min(MAX_H, Math.max(320, room))) + 'px');
}

// Focus mode starts at the top of the page, with the video right under the top bar
function toTop() {
  if (window.scrollY < 1) return;
  if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(0, { duration: reduce ? 0 : 0.7 });
  else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

function enter() {
  const g = window.gsap;
  if (tl) tl.kill();
  root.classList.add('v2-focus');
  fitVideo();
  fitBox();
  toTop();
  const away = -(box.offsetWidth + GAP);
  const from = spacing.getBoundingClientRect().width;
  if (!g || reduce) {
    menu.style.visibility = 'hidden';
    if (block) block.style.height = '0px';
    spacing.style.minWidth = '0px';
    box.style.visibility = 'visible';
    box.style.transform = 'none';
    return;
  }
  const m = rollRange(menu);
  tl = g.timeline();
  // 1. the menu rolls up to its top, and the progress block folds up into the line under the top bar
  tl.fromTo(menu, { clipPath: m.open }, { clipPath: m.shut, duration: 0.55, ease: 'power2.inOut' }, 0);
  tl.set(menu, { visibility: 'hidden' }, 0.55);
  if (block) {
    if (blockInner) tl.to(blockInner, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0);
    tl.to(block, { height: 0, duration: 0.6, ease: 'power2.inOut' }, 0.05);
  }
  // 2. the video slides out into the room
  tl.fromTo(spacing, { minWidth: from }, { minWidth: 0, duration: 0.75, ease: 'power3.inOut' }, 0.55);
  // 3. the MENU box comes out from behind it
  tl.fromTo(box, { x: away, visibility: 'visible' }, { x: 0, duration: 0.5, ease: 'power3.out' }, 1.2);
}

function leave() {
  const g = window.gsap;
  if (tl) tl.kill();
  const parts = [menu, block, blockInner, spacing, box].filter(Boolean);
  const done = () => {
    root.classList.remove('v2-focus');
    if (g) g.set(parts, { clearProps: 'clipPath,visibility,minWidth,transform,height,opacity' });
    else parts.forEach((el) => el.removeAttribute('style'));
  };
  if (!g || reduce) { done(); return; }
  // what the room and the progress block go back to: their own sizes, measured without the tweens' values
  const now = spacing.getBoundingClientRect().width;
  spacing.style.minWidth = '';
  const to = spacing.getBoundingClientRect().width;
  spacing.style.minWidth = now + 'px';
  let blockH = 0;
  if (block) {
    const h = block.style.height;
    block.style.height = '';
    blockH = block.offsetHeight;
    block.style.height = h;
  }
  g.set(menu, { visibility: 'visible' });
  const m = rollRange(menu);
  if (!menu.style.clipPath) g.set(menu, { clipPath: m.shut });
  tl = g.timeline({ onComplete: done });
  // the same steps backwards: the box slides back in behind the video, the video draws in, then the progress
  // block opens out of the line and the menu rolls down
  tl.to(box, { x: -(box.offsetWidth + GAP), duration: 0.35, ease: 'power2.in' }, 0);
  tl.set(box, { visibility: 'hidden' });
  tl.fromTo(spacing, { minWidth: now }, { minWidth: to, duration: 0.7, ease: 'power3.inOut' }, 0.25);
  if (block) {
    tl.to(block, { height: blockH, duration: 0.6, ease: 'power2.inOut' }, 0.8);
    if (blockInner) tl.to(blockInner, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 1.1);
  }
  tl.to(menu, { clipPath: m.open, duration: 0.55, ease: 'power2.inOut' }, 0.95);
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
addEventListener('resize', () => { if (focused) { fitVideo(); fitBox(); } });

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

/* ---------- the instructor (0.1) ---------- */

const panel = document.querySelector('.v2-instructor_panel');
if (panel && !reduce) {
  new IntersectionObserver((entries) => {
    for (const e of entries) panel.classList.toggle('is-shown', e.isIntersecting); // moves only while it can be seen
  }, { threshold: 0.1 }).observe(panel);
}

/* ---------- lesson tags ---------- */

// workfile ↓, resources ↓ and the like point at the link boxes under the text: a click glides there
document.addEventListener('click', (e) => {
  const tag = e.target.closest && e.target.closest('.course_content .hero_tag.is-template, .course_content .hero_tag.is-work');
  if (!tag) return;
  const links = tag.closest('.course_content').querySelector('.v2-text_links');
  if (!links) return;
  if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(links, { offset: -96, duration: reduce ? 0 : 0.9 });
  else links.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});
