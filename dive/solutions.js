/* =========================================================
   dfs-dive — Our Solutions demos (test: /rimbo-home-test)
   Loaded by dive.js only when the page has [data-sol]. Each product shows what it does, not what it looks like:

     Fundamentals  [data-course-demo]   the course player, playing two talking lessons from the course (0.1 and 1.1,
                                        the footage of /look-inside), each from its own cover; the module menu opens
                                        on the lesson that plays.
     Tinko         [data-tinko-demo]    Tinko's window on a small Mac desktop, doing the real desktop pass on its own:
                                        it counts the desk, the screenshots fly into their folder, an installer goes
                                        to the Bin, the rest goes to Documents one by one, and the desk is empty.
                                        Lines and steps from the app and its recording (tinko/Sources, /tinko).
                                        Space, ⌫ and S work too; doing something yourself takes over from the autoplay.
     Rhythms       [data-sol-rhythms]   around the real app window (main.js brings it to life): the menu bar clock
                                        reaches 21:30, Evenings switches on, the toast says what closed, and a browser
                                        that tries YouTube gets the calm page instead. Pauses while you use the app.

   Everything only runs while it's on screen. With reduced motion nothing plays by itself.
   ========================================================= */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNight = () => document.documentElement.classList.contains('dfs-night');
const wait = ms => new Promise(r => setTimeout(r, ms));
const EASE = 'cubic-bezier(.625,.05,0,1)';
const STAR = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M21.127 5.125H26.873V10.876L26.874 10.875L32 16.001L26.874 21.126L26.873 21.125V26.8691H21.126L21.127 26.8701L16.001 31.9961L10.875 26.8701L10.876 26.8691H5.12598V21.126L0 16.001L5.12598 10.875V5.125H10.875L16.001 0L21.127 5.125ZM12.375 12.374H6.625L10.252 16.001L6.63184 19.6201H12.375V25.3701L16.001 21.7451L19.624 25.3672V19.6201H25.3682L21.748 16.001L25.375 12.374H19.624V6.62793L16.001 10.251L12.375 6.625V12.374Z"/></svg>';
const iconOf = name => { const c = [...document.querySelectorAll('.rhythms-chip')].find(c => (c.querySelector('.rhythms-chip_name') || {}).textContent === name); const i = c && c.querySelector('img'); return i ? i.src : ''; };
// runs fn(true/false) whenever the element comes into or leaves the screen
const watch = (el, fn, margin = '0px') => new IntersectionObserver(es => fn(es[0].isIntersecting), { rootMargin: margin }).observe(el);

export function initSolutions(root) {
  injectSolCSS();
  const course = root.querySelector('[data-course-demo]');
  if (course) initCourse(course);
  const tinko = root.querySelector('[data-tinko-demo]');
  if (tinko) initTinko(tinko);
  const rhythms = root.querySelector('[data-sol-rhythms]');
  if (rhythms) initRhythms(rhythms);
}

/* ---------------------------------------------------------
   Fundamentals: the course player
   After /courses/fundamentals: the header, the video with its controls, Previous / Next in mono capitals, and the
   module accordion (Mondwest titles, chevron tiles; the open module lists its lessons, the one playing in light
   blue). It plays two talking lessons from the course (the same footage as /look-inside): 0.1 Course Intro and
   1.1 The Shift. Each starts on its own cover; when one ends its lesson is ticked off and the menu closes that
   module and opens the next. The video is cropped above its subtitles (they're not in the course).
   --------------------------------------------------------- */
const VIDEO = 'https://dfs-sample-media.thomas-aukema.workers.dev/look-inside-2026-10-14.mp4';
const COVER = 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/';
const CHAPTERS = [
  { from: 3.6, to: 25.0, lesson: '0.1', module: 0, cover: COVER + '6a108d4ac20ca7593cd6572a_PIMG_1.avif' },
  { from: 26.0, to: 45.8, lesson: '1.1', module: 1, cover: COVER + '6a108d4b0285e01a30db8f02_PIMG_3.avif' },
];
// the course as it is (0.3, the Tinko add-on, only shows for its owners)
const COURSE = [
  ['0: Intro', [['0.1', 'Course Intro', '3:09'], ['0.2', 'Roadmap', '4:34']]],
  ['1: Why You Can’t Focus', [['1.1', 'The Shift', '2:38'], ['1.2', 'The Art of DFS', '2:04'], ['1.3', 'Flow Physics', '7:52'], ['1.4', 'Masters of Flow', '4:00']]],
  ['2: The Big Clean Up', [['2.1', 'Surface Cleanse', '9:33'], ['2.2', 'Distractions Purge', '10:05']]],
  ['3: Mobile Feng Shui', [['3.1', 'Mobile Cleanse', '16:04'], ['3.2', 'ScreenZen Setup', '5:39'], ['3.3', 'Extra Measures', '6:52']]],
  ['4: Browser Feng Shui', [['4.1', 'Browsing to Operating', '7:04'], ['4.2', 'Arc Browser Setup', '9:55'], ['4.3', 'Your New Workspace', '11:13'], ['4.4', 'Browser Essentials', '7:37']]],
  ['5: Essential Tools', [['5.1', 'Distraction Blockers', '6:55'], ['5.2', 'Quality of life', '9:21'], ['5.3', 'Secure Back-up', '3:55'], ['5.4', 'Hardware Tips', '8:10']]],
  ['6: Shortcut Mastery', [['6.1', 'Shortcut Intro', '2:10'], ['6.2', 'Raycast Intro', '14:16'], ['6.3', 'Raycast Setup', '15:53'], ['6.4', 'Shortcut Masterclass', '14:13']]],
  ['7: Clarity Systems', [['7.1', 'The Invisible Clutter', '3:59'], ['7.2', 'Clarity Fundamentals', '9:16'], ['7.3', 'Planning', '10:17'], ['7.4', 'Vision', '2:11'], ['7.5', 'Personal OS', '7:10']]],
  ['8: Flow-state by Design', [['8.1', 'The Final Layer', '1:44'], ['8.2', 'The Art of Doing Nothing', '5:48'], ['8.3', 'Rituals For Flow', '8:27'], ['8.4', 'Thank You', '1:33']]],
];
const ICON = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
  mute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.6a6 6 0 0 1 0 8.8" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  chevron: '<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M28.5 22.5L18 12L7.5 22.5" stroke="currentColor" stroke-width="3" fill="none"/></svg>',
  lesson: '<svg viewBox="0 0 8 8" aria-hidden="true"><path fill="currentColor" d="M2.914 4V2.396l1.336.802L5.587 4l-1.337.802-1.336.802z"/><rect width="7.75" height="7.75" x=".125" y=".125" stroke="currentColor" stroke-width=".25" rx="1.875" fill="none"/></svg>',
};
const mmss = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

function initCourse(host) {
  host.innerHTML = `<div class="cp">
    <div class="cp-top"><div class="cp-brand">${STAR}<span>Fundamentals</span></div>
      <div class="cp-prog"><span>8 modules · 35 lessons</span><div class="cp-bar"><i></i></div></div></div>
    <div class="cp-main">
      <div class="cp-stage">
        <div class="cp-video">
          <video muted playsinline preload="none" aria-label="Lessons 0.1 and 1.1 of the course"></video>
          ${CHAPTERS.map((c, i) => `<img class="cp-cover${i ? '' : ' is-on'}" src="${c.cover}" alt="">`).join('')}
          <span class="cp-big" aria-hidden="true">${ICON.play}</span>
          <button class="cp-sound" type="button">${ICON.sound}<span>Sound on</span></button>
          <div class="cp-ctrl">
            <button class="cp-play" type="button" aria-label="Play">${ICON.play}</button>
            <span class="cp-time">00:00 / 00:00</span>
            <div class="cp-scrub" aria-hidden="true"><i></i></div>
            <button class="cp-speed" type="button" aria-label="Speed">1.0x</button>
            <button class="cp-mute" type="button" aria-label="Sound">${ICON.mute}</button>
          </div>
        </div>
        <div class="cp-nav"><button class="cp-prev" type="button"><span aria-hidden="true">←</span> Previous lesson</button><button class="cp-next" type="button">Next lesson <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="cp-list"><div class="cp-list-in">${COURSE.map(([t, ls], m) => `<div class="cp-mod" data-m="${m}">
        <div class="cp-mhead"><span>${t}</span><i>${ICON.chevron}</i></div>
        <div class="cp-lessons"><div>${ls.map(([n, name, d]) => `<div class="cp-les" data-l="${n}"><i class="cp-check"></i><span>${n}: ${name}</span><em>${ICON.lesson}${d}</em></div>`).join('')}</div></div>
      </div>`).join('')}</div></div>
    </div>
  </div>`;
  const $ = s => host.querySelector(s);
  const v = $('video'), stage = $('.cp-video'), playB = $('.cp-play'), timeEl = $('.cp-time'), fill = $('.cp-scrub i'), bar = $('.cp-bar i');
  const muteB = $('.cp-mute'), soundB = $('.cp-sound'), speedB = $('.cp-speed'), covers = [...host.querySelectorAll('.cp-cover')];
  let at = 0, userPaused = reduce, started = false, raf = 0, coverT = 0;
  const total = CHAPTERS.reduce((s, c) => s + (c.to - c.from), 0);
  function menu() {
    const c = CHAPTERS[at];
    host.querySelectorAll('.cp-mod').forEach((m, n) => m.classList.toggle('is-open', n === c.module));
    host.querySelectorAll('.cp-les').forEach(l => l.classList.toggle('is-now', l.dataset.l === c.lesson));
  }
  function done(i, on) { const l = host.querySelector(`.cp-les[data-l="${CHAPTERS[i].lesson}"]`); if (l) l.classList.toggle('is-done', on); }
  // a lesson starts on its cover, then the video comes through
  function cover(i, hold) {
    clearTimeout(coverT);
    // the new cover is there at once (no crossfade over the moving video); it fades out to reveal the lesson
    covers.forEach((c, n) => { c.classList.add('is-snap'); c.classList.toggle('is-on', n === i); c.offsetWidth; c.classList.remove('is-snap'); });
    if (!hold) coverT = setTimeout(() => covers[i].classList.remove('is-on'), reduce ? 0 : 1500);
  }
  function show(i, { seek = true, fromEnd = false } = {}) {
    if (fromEnd) done(at, true);
    at = (i + CHAPTERS.length) % CHAPTERS.length;
    if (at === 0 && fromEnd) CHAPTERS.forEach((_, n) => done(n, false));   // round again: nothing ticked yet
    menu();
    cover(at, v.paused);
    if (seek && v.readyState > 0) v.currentTime = CHAPTERS[at].from;
    tick();
  }
  function tick() {
    const c = CHAPTERS[at], t = Math.min(c.to, Math.max(c.from, v.currentTime || c.from));
    if (v.currentTime >= c.to - .05 && !v.paused) { show(at + 1, { fromEnd: true }); return; }
    const before = CHAPTERS.slice(0, at).reduce((s, k) => s + (k.to - k.from), 0);
    fill.style.width = ((t - c.from) / (c.to - c.from) * 100).toFixed(2) + '%';
    bar.style.width = ((before + t - c.from) / total * 100).toFixed(2) + '%';
    timeEl.textContent = `${mmss(t - c.from)} / ${mmss(c.to - c.from)}`;
  }
  function loop() { tick(); raf = requestAnimationFrame(loop); }
  const sync = () => {
    stage.classList.toggle('is-paused', v.paused);
    playB.innerHTML = v.paused ? ICON.play : ICON.pause; playB.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
  };
  function play() {
    if (!started) { started = true; v.src = VIDEO; v.addEventListener('loadedmetadata', () => { v.currentTime = CHAPTERS[at].from; }, { once: true }); }
    const p = v.play(); if (p) p.catch(() => {});
  }
  v.addEventListener('play', () => { sync(); cover(at, false); cancelAnimationFrame(raf); loop(); });
  v.addEventListener('pause', () => { sync(); cancelAnimationFrame(raf); });
  const toggle = () => { if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); } };
  playB.addEventListener('click', toggle);
  stage.addEventListener('click', e => { if (!e.target.closest('.cp-ctrl, .cp-sound')) toggle(); });
  $('.cp-prev').addEventListener('click', () => { show(at - 1); if (!userPaused) play(); });
  $('.cp-next').addEventListener('click', () => { show(at + 1); if (!userPaused) play(); });
  host.querySelectorAll('.cp-les').forEach(l => l.addEventListener('click', () => { const i = CHAPTERS.findIndex(c => c.lesson === l.dataset.l); if (i > -1) { show(i); if (!userPaused) play(); } }));
  const sound = on => { v.muted = !on; muteB.innerHTML = on ? ICON.sound : ICON.mute; soundB.classList.add('is-gone'); if (on) { userPaused = false; play(); } };
  muteB.addEventListener('click', () => sound(v.muted));
  soundB.addEventListener('click', () => sound(true));
  const SPEEDS = [1, 1.5, 2];
  speedB.addEventListener('click', () => { const s = SPEEDS[(SPEEDS.indexOf(v.playbackRate) + 1) % SPEEDS.length]; v.playbackRate = s; speedB.textContent = s.toFixed(1) + 'x'; });
  $('.cp-scrub').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(), c = CHAPTERS[at]; if (v.readyState > 0) v.currentTime = c.from + (e.clientX - r.left) / r.width * (c.to - c.from); tick(); });
  watch(host, on => { if (on && !userPaused) play(); else if (!on) v.pause(); }, '0px 0px -15% 0px');
  show(0, { seek: false });
  sync();
}

/* ---------------------------------------------------------
   Tinko on a small Mac desktop
   --------------------------------------------------------- */
const TK_BITMAP = ['....######....', '..##########..', '.############.', '.#############', '##############', '##############', '##############', '.############.', '.############.', '..##########..', '....#####.....'];
const DEL = '<svg viewBox="0 0 22 18" aria-hidden="true"><path d="M7 2h13v14H7L1 9z"/><path d="M11 6l6 6M17 6l-6 6"/></svg>';
const WALL = { day: 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/691db9dc168bceec0fea78a2_HERO_BG_4.avif', night: 'https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@v1.7.67/night/HERO_BG_4-night.webp' };
// the desk, as in the real recording (test mode, demo files)
const FILES = [
  { id: 's1', kind: 'shot', name: 'Screenshot 2026-10-12 at 09.41', x: 572, y: 46, hue: 'linear-gradient(135deg,#9db4c4,#e3d8c2)' },
  { id: 's2', kind: 'shot', name: 'Screenshot 2026-10-13 at 16.07', x: 660, y: 58, hue: 'linear-gradient(135deg,#3d3a35,#7a8a99)' },
  { id: 's3', kind: 'shot', name: 'Screenshot 2026-10-14 at 11.22', x: 578, y: 150, hue: 'linear-gradient(135deg,#f1ede2,#0297db)' },
  { id: 'dmg', kind: 'dmg', name: 'zoomusInstallerFull.dmg', x: 664, y: 164 },
  { id: 's4', kind: 'shot', name: 'Screenshot 2026-10-15 at 22.51', x: 586, y: 254, hue: 'linear-gradient(135deg,#c9a27e,#4f5d6b)' },
  { id: 'zip', kind: 'zip', name: 'photos-export.zip', x: 668, y: 264 },
  { id: 'txt', kind: 'txt', name: 'Notes for Monday.txt', x: 574, y: 356 },
  { id: 'old', kind: 'folder', name: 'Old stuff', x: 662, y: 364 },
];
const fileArt = (kind, hue) => kind === 'shot' ? `<div class="ts-shot" style="background:${hue}"></div>`
  : kind === 'folder' ? '<svg class="ts-art" viewBox="0 0 48 40"><path d="M2 8a3 3 0 0 1 3-3h13l4 4h21a3 3 0 0 1 3 3v3H2z" fill="#5aa9e8"/><rect x="2" y="12" width="44" height="26" rx="3" fill="#7cc0f5"/><rect x="2" y="12" width="44" height="3" fill="#a6d4f8"/></svg>'
  : kind === 'dmg' ? '<svg class="ts-art" viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" rx="4" fill="#d9d6d0"/><rect x="6" y="10" width="36" height="28" rx="4" fill="none" stroke="#a9a49b"/><rect x="10" y="30" width="28" height="3" rx="1.5" fill="#a9a49b"/><circle cx="35" cy="17" r="2" fill="#7fbf6a"/></svg>'
  : kind === 'zip' ? '<svg class="ts-art" viewBox="0 0 40 48"><path d="M4 2h22l10 10v34H4z" fill="#f4f2ee" stroke="#c9c4ba"/><path d="M26 2v10h10" fill="#e3dfd7" stroke="#c9c4ba"/><path d="M17 4v24" stroke="#6b665e" stroke-width="3" stroke-dasharray="2 2"/><rect x="14.5" y="27" width="5" height="7" rx="1.5" fill="#6b665e"/><text x="20" y="43" font-size="7" text-anchor="middle" fill="#8a857c" font-family="Arial">ZIP</text></svg>'
  : '<svg class="ts-art" viewBox="0 0 40 48"><path d="M4 2h22l10 10v34H4z" fill="#fff" stroke="#c9c4ba"/><path d="M26 2v10h10" fill="#eceae5" stroke="#c9c4ba"/><path d="M9 20h22M9 25h22M9 30h18M9 35h20" stroke="#cfcac1" stroke-width="1.5"/></svg>';

function initTinko(host) {
  if (!document.querySelector('link[href*="Space+Mono"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Space+Mono&display=swap'; document.head.append(l);
  }
  host.tabIndex = 0;
  host.setAttribute('aria-label', 'Tinko cleaning up a desktop. Space is the safe choice, Delete moves something to the Bin, S skips.');
  const dockApps = ['Messages', 'Slack', 'WhatsApp', 'Discord'];
  host.innerHTML = `<div class="ts">
    <div class="ts-wall"></div>
    <div class="ts-bar"><b>Tinko</b><span>File</span><span>Edit</span><span>Window</span><i class="ts-clock">Thu 10:24</i></div>
    <div class="ts-desk">${FILES.map(f => `<div class="ts-file" data-id="${f.id}" style="left:${f.x}px;top:${f.y}px">${fileArt(f.kind, f.hue)}<span>${f.name}</span></div>`).join('')}
      <div class="ts-file is-folder-shots" data-id="shots" style="left:654px;top:432px">${fileArt('folder')}<span>Screenshots</span></div></div>
    <div class="ts-scan"></div>
    <div class="ts-dock"><div class="ts-dapp is-finder">${fileArt('folder')}</div>${dockApps.map(n => `<img class="ts-dapp" src="${iconOf(n)}" alt="">`).join('')}<i class="ts-dsep"></i>
      <div class="ts-dapp ts-bin"><svg viewBox="0 0 40 40"><path d="M9 11h22l-2 25H11z" fill="rgba(255,255,255,.55)" stroke="#8d8880"/><path d="M14 15l1 18M20 15v18M26 15l-1 18" stroke="#b5b0a7"/><g class="ts-papers"><path d="M12 12l3-6 5 2 4-3 4 5z" fill="#efe9dd" stroke="#8d8880"/><path d="M17 12l2-4 4 1" fill="none" stroke="#8d8880"/></g><path d="M7 11h26" stroke="#8d8880" stroke-width="2" stroke-linecap="round"/></svg></div></div>
    <div class="ts-win"><div class="tkw">
      <div class="tkw-lights" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="tkw-dash" style="top:28px"></div><div class="tkw-dash" style="bottom:28px"></div>
      <div class="tkw-col">
        <div class="tkw-tools" aria-hidden="true"><span><svg viewBox="0 0 9 9" shape-rendering="crispEdges"><rect x="0" y="1" width="9" height="1"/><rect x="0" y="4" width="9" height="1"/><rect x="0" y="7" width="9" height="1"/></svg></span><span><svg viewBox="0 0 9 9" shape-rendering="crispEdges"><rect x="3" y="0" width="4" height="1"/><rect x="1" y="1" width="3" height="1"/><rect x="0" y="2" width="3" height="5"/><rect x="1" y="7" width="3" height="1"/><rect x="3" y="8" width="4" height="1"/><rect x="4" y="7" width="3" height="1"/></svg></span></div>
        <div class="tkw-stage">
          <div class="tkw-tinko" aria-hidden="true"><div class="tkw-sway"><svg class="tkw-body" viewBox="0 0 14 11" shape-rendering="crispEdges">${TK_BITMAP.map((r, y) => [...r].map((c, x) => c === '#' ? `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>` : '').join('')).join('')}</svg><div class="tkw-eye is-l"></div><div class="tkw-eye is-r"></div></div></div>
          <div class="tkw-screen" aria-live="polite"></div>
        </div>
      </div>
    </div></div>
  </div>`;
  const ts = host.querySelector('.ts'), screen = host.querySelector('.tkw-screen'), wall = host.querySelector('.ts-wall'), tinkoEl = host.querySelector('.tkw-tinko');
  const fileEl = id => host.querySelector(`.ts-file[data-id="${id}"]`);
  new ResizeObserver(() => { ts.style.transform = `scale(${host.clientWidth / 760})`; }).observe(host);
  const paintWall = () => { wall.style.backgroundImage = `url(${WALL[isNight() ? 'night' : 'day']})`; };
  paintWall();
  new MutationObserver(paintWall).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* his eyes, after Tinko.swift: blinks, and where he looks depends on what he's doing */
  const eyeL = host.querySelector('.tkw-eye.is-l'), eyeR = host.querySelector('.tkw-eye.is-r'), CELL = 6;
  const E = (x, y, w = 1, h = 2) => ({ x, y, w, h });
  let eyes = [E(-1.5, -.5), E(1.5, -.5)], blinking = false, mood = 'idle', moodTimer = 0;
  const place = (el, e, dur) => { el.style.transitionDuration = dur + 's'; Object.assign(el.style, { left: (7 + e.x - e.w / 2) * CELL + 'px', top: (5.5 + e.y - e.h / 2) * CELL + 'px', width: e.w * CELL + 'px', height: e.h * CELL + 'px' }); };
  const setEyes = (l, r, dur = .6) => { eyes = [l, r]; place(eyeL, l, dur); place(eyeR, r, dur); };
  const LOOKS = {
    // at the desktop on his right, reading down it
    side: [[.3, -.5, 1, 2, 3.3, -.5, 1, 2], [.4, -1.2, 1, 1.8, 3.4, -1.2, 1, 1.8], [.3, .4, 1, 1.8, 3.3, .4, 1, 1.8], [.5, 1, 1.1, 1.4, 3.5, 1, 1.1, 1.4]],
    down: [[-1.5, 1.6, 1, 1.5, 1.5, 1.6, 1, 1.5], [-.3, 1.7, 1, 1.4, 2.7, 1.7, 1, 1.4], [.3, 1.6, 1, 1.5, 3.3, 1.6, 1, 1.5]],
    working: [[-1.6, -1.4, 1, 2, 1.6, .6, 1, 2], [-1.3, -.5, 2, 2, 1.3, -.5, 2, 2], [-1.5, -.3, 2, .4, 1.5, -.3, 2, .4], [.4, 1.2, 1, 2, 3.4, 1.2, 1, 2], [-1.8, -.5, 2.2, 2.2, 1.9, -.3, .9, 1.4]],
    cheer: [[-1.5, -.7, 1.4, 2.2, 1.5, -.7, 1.4, 2.2]],
    idle: [[-1.5, -.5, 1, 2, 1.5, -.5, 1, 2]],
  };
  const look = n => { const set = LOOKS[mood], a = set[n % set.length]; setEyes(E(a[0], a[1], a[2], a[3]), E(a[4], a[5], a[6], a[7]), mood === 'working' ? .45 : .6); };
  function setMood(m) {
    mood = m; clearInterval(moodTimer); let n = 0; look(n);
    tinkoEl.classList.toggle('is-cheer', m === 'cheer');
    if (!reduce && LOOKS[m].length > 1) moodTimer = setInterval(() => { if (!blinking) look(++n); }, m === 'working' ? 1100 : 1600);
  }
  if (!reduce) {
    const blink = () => {
      const [l, r] = eyes; blinking = true;
      setEyes({ ...l, y: l.y + .8, h: .25 }, { ...r, y: r.y + .8, h: .25 }, .07);
      setTimeout(() => { setEyes(l, r, .16); blinking = false; }, 130);
      setTimeout(blink, 2500 + Math.random() * 3500);
    };
    setTimeout(blink, 2000);
  }

  /* the screens */
  const roll = t => `<span class="tkw-roll">${[...t.toUpperCase()].map(c => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('')}</span>`;
  const btn = (act, title, key, light) => `<button class="tkw-btn${light ? ' is-light' : ''}" data-tk="${act}" type="button"><span class="tkw-key${key === 'del' ? ' is-del' : ''}">${key === 'del' ? DEL : key}</span>${roll(title)}</button>`;
  const stat = (n, label) => `<div class="tkw-stat"><b>${n}</b><span>${label}</span></div>`;
  let state = 'scan', gone = new Set(), binned = new Set(), queue = [], qAt = 0, ticks = 0;
  const left = () => FILES.filter(f => !gone.has(f.id) && f.kind !== 'shot');
  function render(key, html) {
    const swap = screen.dataset.key !== key; screen.dataset.key = key;
    screen.innerHTML = html;
    if (swap && !reduce) { screen.classList.add('is-swap'); requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('is-swap'))); }
  }
  const tag = t => `<div class="tkw-tag"><span>${t}</span></div>`;
  const words = t => `<div class="tkw-words">${t}</div>`;
  const undo = '<button class="tkw-undo" data-tk="undo" type="button">⌘Z  UNDO</button>';
  function draw() {
    const files = FILES.filter(f => !gone.has(f.id));
    if (state === 'scan') render('scan', tag('Your desktop') + words('One moment…') + '<div class="tkw-progress"><i></i></div><div class="tkw-count">0 THINGS</div>');
    else if (state === 'desk') render('desk', tag('Your desktop') + words('Now we’re looking at the desktop. A proper pile, but nothing I can’t handle.')
      + `<div class="tkw-stats">${stat(files.filter(f => f.kind !== 'folder').length, 'files')}${stat(files.filter(f => f.kind === 'folder').length, 'folder')}${stat(4, 'screenshots')}</div>`
      + `<div class="tkw-btns">${btn('space', 'Clean up', 'SPACE')}${btn('s', 'Skip', 'S', true)}</div>`);
    else if (state === 'fixes') render('fixes', tag('Quick fixes') + words('A home for your screenshots, and a desk that keeps itself in order.')
      + `<div class="tkw-fixes">${['A Screenshots folder in Documents', 'New screenshots go there', 'No floating thumbnail', 'The desk sorts itself, by date added'].map((t, i) => `<div class="tkw-fix${i < ticks ? ' is-done' : ''}"><i></i><span>${t}</span>${i > 1 ? '<em>Already</em>' : ''}</div>`).join('')}</div>`
      + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>`);
    else if (state === 'moved') render('moved', tag('Screenshots') + words('4 screenshots moved into Screenshots. From now on they land there by themselves.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>` + undo);
    else if (state === 'leftover') render('leftover', tag('Leftovers') + words('An installer that did its job. Move it to the Bin?') + '<div class="tkw-chip">zoomusInstallerFull.dmg</div>'
      + `<div class="tkw-btns">${btn('space', 'Leave it', 'SPACE')}${btn('del', 'Move to Bin', 'del', true)}</div>`);
    else if (state === 'binned') render('binned', tag('Leftovers') + words('1 in the Bin.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>` + undo);
    else if (state === 'left') {
      const f = queue[qAt];
      render('left-' + f.id, tag('What’s left') + words('Into Documents, to sort later? Or the Bin?')
        + `<div class="tkw-file"><div class="tkw-file-art">${fileArt(f.kind, f.hue)}</div><div><b>${f.name}</b><span>Here since today · ${qAt + 1} of ${queue.length}</span></div></div>`
        + `<div class="tkw-btns">${btn('space', 'Sort later', 'SPACE')}${btn('del', 'Bin', 'del', true)}</div>`);
    }
    else if (state === 'empty') render('empty', tag('Your desktop') + words('An empty desk. New screenshots go to their own folder now, so it stays that way.') + `<div class="tkw-btns">${btn('space', 'On to Documents', 'SPACE')}</div>`);
    else if (state === 'skipped') render('skipped', tag('Your desktop') + words('Your desktop stays as it is.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>`);
  }

  /* what happens on the desk */
  const SHOTS = { x: 654, y: 432 };
  const at = id => { const f = FILES.find(k => k.id === id); return f ? { x: f.x, y: f.y } : SHOTS; };
  const BIN = { x: 464, y: 500 }, DOCS = { x: 140, y: 250 };   // the Bin in the Dock; Documents: into Tinko's window
  function fly(id, to, { scale = .2, arc = 0, dur = 750, fade = true } = {}) {
    const el = fileEl(id), from = at(id);
    if (!el) return Promise.resolve();
    gone.add(id);
    const dx = to.x - from.x, dy = to.y - from.y;
    if (reduce) { el.classList.add('is-gone'); return Promise.resolve(); }
    const a = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .5}px,${dy * .5 - arc}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: fade ? 0 : 1 },
    ], { duration: dur, easing: EASE, fill: 'forwards' });
    return a.finished.then(() => { el.classList.add('is-gone'); a.cancel(); });
  }
  const bump = sel => { const el = host.querySelector(sel); if (el && !reduce) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' }); };
  const select = id => host.querySelectorAll('.ts-file').forEach(el => el.classList.toggle('is-sel', el.dataset.id === id));
  async function scan() {
    setMood('working'); select(null);
    const bar = screen.querySelector('.tkw-progress i'), count = screen.querySelector('.tkw-count'), sweep = host.querySelector('.ts-scan');
    if (!reduce) sweep.animate([{ transform: 'translateX(0)', opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .9 }, { transform: 'translateX(200px)', opacity: 0 }], { duration: 2000, easing: 'ease-in-out' });
    const order = [...FILES].sort((a, b) => a.y - b.y);
    for (let i = 0; i < order.length; i++) {
      const el = fileEl(order[i].id); if (el) { el.classList.add('is-seen'); setTimeout(() => el.classList.remove('is-seen'), 420); }
      if (bar) bar.style.width = ((i + 1) / order.length * 100) + '%';
      if (count) count.textContent = `${i + 1} ${i ? 'THINGS' : 'THING'}`;
      await wait(reduce ? 0 : 240);
    }
    await wait(reduce ? 0 : 420);
  }
  async function doFixes() {
    setMood('side');
    for (ticks = 0; ticks < 4; ticks++) {
      draw();
      if (ticks === 0) { fileEl('shots').classList.add('is-in'); bump('.is-folder-shots'); }
      if (ticks === 1) {
        for (const id of ['s1', 's2', 's3', 's4']) { fly(id, SHOTS, { scale: .35, dur: 700 }); await wait(140); }
        await wait(640); bump('.is-folder-shots');
      }
      await wait(reduce ? 0 : 520);
    }
    ticks = 4; draw();
    await wait(reduce ? 0 : 500);
    // the Screenshots folder goes to Documents
    await fly('shots', DOCS, { scale: .3, dur: 800, arc: 40 });
  }
  function restore(ids) {
    ids.forEach(id => { gone.delete(id); binned.delete(id); const el = fileEl(id); if (el) { el.classList.remove('is-gone'); if (!reduce) el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, easing: EASE }); } });
    host.querySelector('.ts-bin').classList.toggle('is-full', binned.size > 0);
  }
  function reset() {
    gone = new Set(); binned = new Set(); ticks = 0;
    host.querySelectorAll('.ts-file').forEach(el => el.classList.remove('is-gone', 'is-sel', 'is-in'));
    host.querySelector('.ts-bin').classList.remove('is-full');
    if (!reduce) host.querySelectorAll('.ts-file:not(.is-folder-shots)').forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: i * 60, easing: EASE, fill: 'backwards' }));
  }

  /* the flow: every action is the same whether the autoplay or you do it */
  let busy = false, manual = false, autoT = 0, running = false, visible = false;
  async function go(next) {
    state = next; draw();
    if (next === 'scan') { await scan(); return go('desk'); }
    if (next === 'desk') setMood('side');
    if (next === 'fixes') { busy = true; await doFixes(); busy = false; return go('moved'); }
    if (next === 'leftover') { setMood('side'); select('dmg'); }
    if (next === 'left') { setMood('side'); select(queue[qAt].id); }
    if (next === 'empty') { setMood('cheer'); select(null); }
    if (next === 'skipped') setMood('idle');
    planAuto();
  }
  async function act(key) {
    if (busy) return;
    busy = true;
    const b = screen.querySelector(`[data-tk="${key}"]`);
    if (b) { b.classList.add('is-press'); setTimeout(() => b.classList.remove('is-press'), 260); }
    try {
      if (state === 'desk') { if (key === 'space') { busy = false; return go('fixes'); } if (key === 's') { busy = false; return go('skipped'); } }
      else if (state === 'moved') { if (key === 'space') { busy = false; return go('leftover'); } if (key === 'undo') { restore(['s1', 's2', 's3', 's4']); fileEl('shots').classList.remove('is-in'); busy = false; return go('desk'); } }
      else if (state === 'leftover') {
        if (key === 'del') { select(null); setMood('down'); await fly('dmg', BIN, { scale: .25, arc: 60, dur: 800 }); binned.add('dmg'); host.querySelector('.ts-bin').classList.add('is-full'); bump('.ts-bin'); busy = false; return go('binned'); }
        if (key === 'space') { select(null); busy = false; return startLeft(); }
      }
      else if (state === 'binned') { if (key === 'space') { busy = false; return startLeft(); } if (key === 'undo') { restore(['dmg']); busy = false; return go('leftover'); } }
      else if (state === 'left') {
        const f = queue[qAt];
        if (key === 'space' || key === 'del') {
          select(null);
          if (key === 'del') { setMood('down'); await fly(f.id, BIN, { scale: .25, arc: 60, dur: 750 }); binned.add(f.id); host.querySelector('.ts-bin').classList.add('is-full'); bump('.ts-bin'); }
          else await fly(f.id, DOCS, { scale: .3, arc: 30, dur: 700 });
          qAt++; busy = false;
          return qAt < queue.length ? go('left') : go('empty');
        }
      }
      else if (state === 'empty' || state === 'skipped') { if (key === 'space') { busy = false; reset(); return go('scan'); } }
    } finally { busy = false; }
  }
  function startLeft() { queue = left(); qAt = 0; return queue.length ? go('left') : go('empty'); }
  const AUTO = { desk: ['space', 2600], moved: ['space', 2200], leftover: ['del', 2400], binned: ['space', 1500], left: ['space', 1500], empty: ['space', 4200], skipped: ['space', 2000] };
  function planAuto() {
    clearTimeout(autoT);
    const a = AUTO[state];
    if (!a || reduce || manual || !visible) return;
    autoT = setTimeout(() => act(a[0]), a[1]);
  }
  // your own input takes over; leave it alone for a while and it carries on by itself
  let idleT = 0;
  const takeOver = () => { manual = true; clearTimeout(autoT); clearTimeout(idleT); idleT = setTimeout(() => { manual = false; planAuto(); }, 9000); };
  screen.addEventListener('click', e => { const b = e.target.closest('[data-tk]'); if (b) { takeOver(); act(b.dataset.tk); host.focus({ preventScroll: true }); } });
  host.addEventListener('keydown', e => {
    const k = e.key === ' ' ? 'space' : (e.key === 'Backspace' || e.key === 'Delete') ? 'del' : e.key.toLowerCase() === 's' && !e.metaKey ? 's' : (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) ? 'undo' : null;
    if (k) { e.preventDefault(); takeOver(); act(k); }
  });
  watch(host, on => {
    visible = on;
    if (on && !running) { running = true; go(reduce ? 'desk' : 'scan'); }
    else planAuto();
  }, '0px 0px -20% 0px');
  setMood('idle');
  state = 'desk'; draw();
}

/* ---------------------------------------------------------
   Rhythms: the moment it keeps your hours
   --------------------------------------------------------- */
const CALM = 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/6ac7e64e4bdd7583341f6ea4_rhythms-calm-mountains.webp';

function initRhythms(host) {
  const layer = document.createElement('div');
  layer.className = 'rs-layer'; layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="rs-menu">
      <div class="rs-menubar"><span class="rs-mstar">${STAR}</span><span class="rs-clock">Wed 21:29</span></div>
      <div class="rs-mlist"><div class="rs-mlabel">Right now, with these rhythms</div>
        <div class="rs-mitems"><div class="rs-mitem">Peace of mind · all day, every day</div><div class="rs-mitem is-new">Evenings · until tomorrow 07:00</div></div>
        <div class="rs-mdiv"></div><div class="rs-mitem is-action">Open Rhythms…</div></div>
    </div>
    <div class="rs-toast"><span class="rs-tstar">${STAR}</span><div><div class="rs-ttag">Closed by Evenings</div><div class="rs-tmsg">YouTube is resting until tomorrow 07:00.</div></div><span class="rs-tx">✕</span><i class="rs-tbar"></i></div>
    <div class="rs-browser">
      <div class="rs-bbar"><span class="rs-bdots"><i></i><i></i><i></i></span><span class="rs-btab"><span class="rs-bfav">${STAR}</span><span class="rs-btitle">New Tab</span></span><span class="rs-baddr"><span class="rs-btyped"></span><i class="rs-bcaret"></i></span></div>
      <div class="rs-bview"><i class="rs-bprog"></i>
        <div class="rs-bstart"><b>Favorites</b><div>${'<i></i>'.repeat(6)}</div></div>
        <div class="rs-calm" style="background-image:url(${CALM})"><div class="rs-calm-in"><div class="rs-calm-mark">${STAR}</div><div class="rs-calm-h">Not now.</div>
          <div class="rs-calm-m">YouTube is resting until 07:00.</div><div class="rs-calm-s">You designed it this way.</div><div class="rs-calm-chip">Blocked by your “Evenings” rhythm</div></div></div>
      </div>
    </div>`;
  host.append(layer);
  const $ = s => layer.querySelector(s);
  new ResizeObserver(() => { layer.style.fontSize = (host.clientWidth / 740 * 16).toFixed(2) + 'px'; }).observe(host);
  const clock = $('.rs-clock'), typed = $('.rs-btyped'), title = $('.rs-btitle');
  let run = 0, visible = false, hovered = false;
  const set = (cls, on) => layer.classList.toggle(cls, on);
  const ping = () => {
    const card = [...host.querySelectorAll('.rhythms-app_card')].find(c => /Evenings/.test(c.textContent));
    if (card && !reduce) card.animate([{ boxShadow: '0 0 0 0 rgba(2,151,219,.0)' }, { boxShadow: '0 0 0 3px rgba(2,151,219,.55)' }, { boxShadow: '0 0 0 0 rgba(2,151,219,0)' }], { duration: 1400, easing: 'ease-out' });
  };
  function rest() {
    clock.textContent = 'Wed 21:29'; typed.textContent = ''; title.textContent = 'New Tab';
    ['is-on', 'is-toast', 'is-browser', 'is-loading', 'is-calm', 'is-typing'].forEach(c => set(c, false));
  }
  async function cycle() {
    const me = ++run, alive = () => me === run && visible && !hovered;
    rest(); await wait(1600); if (!alive()) return;
    clock.textContent = 'Wed 21:30'; set('is-on', true); ping(); await wait(900); if (!alive()) return;
    set('is-toast', true); await wait(1100); if (!alive()) return;
    set('is-browser', true); await wait(700); set('is-typing', true);
    for (const ch of 'youtube.com') { if (!alive()) return; typed.textContent += ch; await wait(85); }
    await wait(350); if (!alive()) return;
    set('is-typing', false); set('is-loading', true); await wait(650); if (!alive()) return;
    set('is-loading', false); set('is-calm', true); title.textContent = 'Blocked'; typed.textContent = 'focus.localhost/youtube.com';
    await wait(5200); if (!alive()) return;
    set('is-browser', false); set('is-toast', false); await wait(1600); if (!alive()) return;
    cycle();
  }
  const kick = () => { if (visible && !hovered && !reduce) cycle(); else { run++; if (!reduce) rest(); } };
  // using the app pauses the moment and gets it out of the way
  host.addEventListener('pointerenter', () => { hovered = true; kick(); });
  host.addEventListener('pointerleave', () => { hovered = false; setTimeout(() => { if (!hovered) kick(); }, 1200); });
  watch(host, on => { visible = on; kick(); }, '0px 0px -20% 0px');
  if (reduce) { set('is-on', true); clock.textContent = 'Wed 21:30'; set('is-toast', true); }
}

/* ---------------------------------------------------------
   styles
   --------------------------------------------------------- */
function injectSolCSS() {
  if (document.getElementById('dive-sol-css')) return;
  const s = document.createElement('style'); s.id = 'dive-sol-css';
  s.textContent = `
[data-sol] .is-sol-meta .sol_top{flex-direction:column;align-items:flex-start;gap:.5rem}
/* stacked (tablet and phone): every product reads text first, then its demo */
@media (max-width:991px){[data-sol] .is-flip .is-sol-meta{order:-1}[data-sol] .is-sol-row .divider_vertical{display:none}}
/* the course player (after /courses/fundamentals) */
.cp{--ink:var(--brand-colors--dark_gray,#3d3a35);--line:var(--brand-colors--dark-bage,#dfd5c9);--card:var(--brand-colors--light-bage,#fbf7ee);--blue:var(--brand-colors--blue,#0297db);--tint:var(--brand-colors--light-bleu,#eff9fd);
  border:1px solid var(--line);border-radius:6px;background:var(--card);overflow:hidden;color:var(--ink);box-shadow:0 30px 60px -36px rgba(61,58,53,.45);font-family:var(--_typography---font-styles--body,monospace)}
.cp button{all:unset;cursor:pointer;box-sizing:border-box}
.cp-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;border-bottom:1px solid var(--line)}
.cp-brand{display:flex;align-items:center;gap:.5rem;font-family:var(--_typography---font-styles--heading,serif);font-size:1.3rem;line-height:1}
.cp-brand svg{width:1.25rem;height:1.25rem}
.cp-prog{display:flex;align-items:center;gap:.8rem;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase}
.cp-bar{width:7rem;height:3px;border-radius:2px;background:color-mix(in srgb,var(--ink) 12%,transparent);overflow:hidden}
.cp-bar i{display:block;height:100%;width:0;background:radial-gradient(circle,#0297db,#3fc3ff)}
/* the stage sets the height; the list is cut off at the bottom of Previous / Next */
.cp-main{display:grid;grid-template-columns:minmax(0,1fr) 11.25rem}
.cp-stage{min-width:0;border-right:1px solid var(--line)}
/* the footage has subtitles under the slide: show the slide only, centred */
.cp-video{position:relative;aspect-ratio:16/9;background:#5f5c58;overflow:hidden;cursor:pointer}
.cp-video video{position:absolute;left:-8.39%;top:-3.68%;width:116.79%;height:auto;display:block}
.cp-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .8s ease;pointer-events:none}
.cp-cover.is-on{opacity:1}
.cp-cover.is-snap{transition:none}
.cp-big{position:absolute;left:50%;top:50%;width:3.6rem;height:3.6rem;margin:-1.8rem 0 0 -1.8rem;display:grid;place-items:center;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);color:#fff;opacity:0;transition:opacity .4s;pointer-events:none}
.cp-big svg{width:1.2rem;height:1.2rem;margin-left:.15rem}
.cp-video.is-paused .cp-big{opacity:1}
.cp-sound{position:absolute;right:.6rem;top:.6rem;display:flex!important;align-items:center;gap:.4rem;padding:.3rem .5rem!important;border-radius:2px;background:rgba(20,18,16,.55);color:#fff;font-size:.54rem;letter-spacing:.12em;text-transform:uppercase;transition:opacity .4s}
.cp-sound svg{width:.85rem;height:.85rem}
.cp-sound.is-gone{opacity:0;pointer-events:none}
.cp-ctrl{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:.8rem;padding:1.4rem .9rem .65rem;background:linear-gradient(transparent,rgba(0,0,0,.5));color:#fff;font-size:.62rem;letter-spacing:.06em;opacity:0;transition:opacity .35s}
.cp-video:hover .cp-ctrl,.cp-video.is-paused .cp-ctrl,.cp-video:focus-within .cp-ctrl{opacity:1}
.cp-ctrl svg{width:.95rem;height:.95rem;display:block}
.cp-time{white-space:nowrap;font-variant-numeric:tabular-nums}
.cp-scrub{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.35);cursor:pointer;position:relative}
.cp-scrub i{position:absolute;left:0;top:0;bottom:0;width:0;background:#fff;border-radius:2px}
.cp-nav{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}
.cp .cp-nav button{display:flex;align-items:center;justify-content:center;gap:.6rem;padding:.8rem .8rem;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;transition:background-color .4s}
.cp .cp-nav span{font-size:.8rem;letter-spacing:0}
.cp .cp-prev:hover{background:color-mix(in srgb,var(--ink) 5%,transparent)}
.cp .cp-next{background:var(--ink);color:var(--card)}
.cp .cp-next:hover{background:color-mix(in srgb,var(--ink) 88%,var(--blue))}
.cp-list{position:relative;min-width:0}
.cp-list-in{position:absolute;inset:0;overflow:hidden}
.cp-mod{border-bottom:1px solid var(--line)}
.cp-mhead{display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.7rem .7rem .7rem .85rem;font-family:var(--_typography---font-styles--heading,serif);font-size:.88rem;line-height:1.1}
.cp-mhead span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-mhead i{width:1.3rem;height:1.3rem;flex:none;display:grid;place-items:center;border-radius:3px;background:var(--line)}
.cp-mhead svg{width:.7rem;height:.7rem;transform:rotate(180deg);transition:transform .5s ${EASE}}
.cp-mod.is-open .cp-mhead svg{transform:none}
.cp-lessons{display:grid;grid-template-rows:0fr;transition:grid-template-rows .6s ${EASE}}
.cp-mod.is-open .cp-lessons{grid-template-rows:1fr}
.cp-lessons>div{overflow:hidden}
.cp-les{display:flex;align-items:center;gap:.45rem;padding:.42rem .7rem .42rem .85rem;border-top:1px dashed var(--line);font-size:.56rem;letter-spacing:.04em;cursor:default;transition:background-color .4s,color .4s}
.cp-les span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-les em{display:flex;align-items:center;gap:.25rem;font-style:normal;font-size:.5rem;opacity:.8}
.cp-les em svg{width:.42rem;height:.42rem}
.cp-check{width:.62rem;height:.62rem;flex:none;border:1px solid currentColor;border-radius:2px;opacity:.85;transition:background-color .3s}
.cp-les.is-done .cp-check{background:var(--blue) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.4 2.4L9.6 3.6' fill='none' stroke='white' stroke-width='1.8'/%3E%3C/svg%3E") center/90% no-repeat;border-color:var(--blue)}
.cp-les.is-now{background:var(--tint);color:var(--blue)}
.cp-les[data-l="0.1"],.cp-les[data-l="1.1"]{cursor:pointer}
@media (max-width:767px){.cp-main{grid-template-columns:1fr}.cp-list{display:none}.cp-stage{border-right:0}.cp-prog span{display:none}.cp-time{display:none}}

/* Tinko's desktop: a 760 x 560 scene, scaled to the column */
[data-tinko-demo]{position:relative;width:100%;aspect-ratio:760/560;outline:none;border-radius:8px}
[data-tinko-demo]:focus-visible{box-shadow:0 0 0 2px var(--brand-colors--blue,#0297db)}
.ts{position:absolute;left:0;top:0;width:760px;height:560px;transform-origin:0 0;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px rgba(61,58,53,.18),0 30px 60px -30px rgba(61,58,53,.5);font-family:"Space Mono",var(--_typography---font-styles--body,monospace)}
.ts-wall{position:absolute;inset:0;background:#e9e3d6 center/cover no-repeat}
.dfs-night .ts-wall{background-color:#141b2c}
.ts-bar{position:absolute;left:0;right:0;top:0;height:24px;display:flex;align-items:center;gap:16px;padding:0 14px;background:rgba(251,247,238,.6);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font:12px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#2b2926;z-index:3}
.ts-bar b{font-weight:600}.ts-clock{margin-left:auto;font-style:normal}
.dfs-night .ts-bar{background:rgba(20,27,44,.6);color:#ecebe8}
.ts-desk{position:absolute;inset:0;z-index:1}
.ts-file{position:absolute;width:84px;display:grid;justify-items:center;gap:4px;text-align:center}
.ts-file .ts-art{width:48px;height:44px;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.18))}
.ts-shot{width:52px;height:34px;margin:5px 0;border:2px solid #fff;border-radius:2px;box-shadow:0 2px 5px rgba(0,0,0,.25)}
.ts-file span{max-width:84px;padding:1px 4px;border-radius:4px;font:10px/1.2 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#2b2926;text-shadow:0 0 6px rgba(255,255,255,.9);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.dfs-night .ts-file span{color:#f1ede2;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.ts-file.is-sel .ts-art,.ts-file.is-sel .ts-shot{outline:3px solid rgba(2,151,219,.35);outline-offset:3px;border-radius:4px}
.ts-file.is-sel span{background:#0a84ff;color:#fff;text-shadow:none}
.ts-file.is-seen{filter:drop-shadow(0 0 10px rgba(2,151,219,.8))}
.ts-file.is-gone{visibility:hidden}
.ts-file.is-folder-shots{opacity:0;transform:scale(.6);transition:opacity .4s,transform .5s ${EASE}}
.ts-file.is-folder-shots.is-in{opacity:1;transform:none}
.ts-file.is-folder-shots.is-gone{transition:none}
.ts-scan{position:absolute;left:556px;top:30px;bottom:96px;width:2px;background:linear-gradient(transparent,#3fc3ff,transparent);box-shadow:0 0 14px #3fc3ff;opacity:0;z-index:2}
.ts-dock{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:flex-end;gap:8px;padding:6px 10px;border-radius:16px;background:rgba(251,247,238,.5);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 0 0 1px rgba(255,255,255,.35),0 10px 24px -12px rgba(0,0,0,.35);z-index:2}
.dfs-night .ts-dock{background:rgba(30,38,60,.55)}
.ts-dapp{width:40px;height:40px;display:block;border-radius:10px}
.ts-dapp.is-finder{display:grid;place-items:center;background:#fbf7ee}.ts-dapp.is-finder .ts-art{width:30px;height:26px}
.ts-dsep{width:1px;align-self:stretch;margin:2px 2px;background:rgba(61,58,53,.25)}
.ts-bin svg{width:40px;height:40px;display:block}
.ts-papers{opacity:0;transition:opacity .3s}.ts-bin.is-full .ts-papers{opacity:1}
.ts-win{position:absolute;left:28px;top:36px;width:516px;height:454px;z-index:2;border-radius:10px;box-shadow:0 0 0 1px rgba(61,58,53,.2),0 24px 48px -18px rgba(0,0,0,.45)}
.ts-win .tkw{transform:scale(.84);border-radius:12px;overflow:hidden}
/* Tinko's window (after the app: Views.swift, Theme.swift) */
.tkw{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;position:absolute;left:0;top:0;width:614px;height:540px;transform-origin:0 0;background:var(--c-card);color:var(--c-ink);font-family:"Space Mono",monospace;font-size:12px;-webkit-font-smoothing:antialiased}
.dfs-night .tkw{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241}
.tkw-lights{position:absolute;left:12px;top:9px;display:flex;gap:8px}
.tkw-lights i{width:12px;height:12px;border-radius:50%;background:#ed6a5e}.tkw-lights i:nth-child(2){background:#f5bf4f}.tkw-lights i:nth-child(3){background:#61c554}
.tkw-dash{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px}
.tkw-col{position:absolute;left:28px;width:558px;top:28px;bottom:28px;border-inline:1px solid var(--c-line);background-image:linear-gradient(color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px}
.tkw-tools{position:absolute;right:14px;top:14px;display:flex;gap:6px}
.tkw-tools span{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--c-line);border-radius:4px;background:var(--c-card)}
.tkw-tools svg{width:13.5px;height:13.5px;display:block;fill:var(--c-ink)}
.tkw-stage{position:absolute;inset:0;display:grid;justify-items:center;align-content:center;gap:22px}
.tkw-tinko{width:96px;height:78px;position:relative}
.tkw-tinko.is-cheer{animation:tkHop .9s ${EASE} 2}
@keyframes tkHop{0%,100%{transform:none}40%{transform:translateY(-10px)}}
.tkw-sway{position:absolute;left:6px;top:6px;width:84px;height:66px;transform-origin:50% 60%;animation:tkSway 1.85s ease-in-out infinite alternate}
@keyframes tkSway{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg)}}
.tkw-body{position:absolute;inset:0;fill:var(--c-ink);animation:tkBreathe 5.5s ease-in-out infinite alternate;transform-origin:50% 60%}
@keyframes tkBreathe{from{transform:scale(1,1)}to{transform:scale(1.03,.975)}}
.tkw-eye{position:absolute;background:var(--c-card);transition:all .5s cubic-bezier(.37,0,.63,1)}
.tkw-screen{display:grid;justify-items:center;text-align:center;width:100%;min-height:210px;align-content:start;transition:opacity .35s cubic-bezier(.33,1,.68,1),transform .35s cubic-bezier(.33,1,.68,1)}
.tkw-screen.is-swap{opacity:0;transform:translateY(6px);transition:none}
.tkw-tag{height:20px;margin-bottom:12px;display:flex;align-items:center}
.tkw-tag span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-calm);background:var(--c-calmsoft);border-radius:2px;padding:3px 7px;line-height:1.2}
.tkw-words{font-size:13px;line-height:23px;max-width:380px;margin-bottom:22px}
.tkw-btns{display:flex;gap:10px;justify-content:center}
.tkw-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:38px;box-sizing:border-box;padding:10px 16px;border-radius:4px;font-size:12px;letter-spacing:.6px;text-transform:uppercase;background:var(--c-ink);color:var(--c-card);transition:background .6s ${EASE},transform .2s}
.tkw-btn.is-light{background:var(--c-card);color:var(--c-ink);box-shadow:inset 0 0 0 1px var(--c-line)}
.tkw-btn.is-light:hover{box-shadow:inset 0 0 0 2px var(--c-line)}
.tkw-btn.is-press{transform:scale(.95);background:var(--c-calm);color:#fff}
.tkw-key{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;box-sizing:border-box;border-radius:3px;box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 50%,transparent);font-size:10px;letter-spacing:0}
.tkw-key.is-del{padding:0}
.tkw-key svg{width:11px;height:9px;fill:none;stroke:currentColor;stroke-width:1.3}
.tkw-roll{display:inline-flex;overflow:hidden;height:16px;line-height:16px}
.tkw-roll b{font-weight:400;display:inline-block;transition:transform .6s ${EASE};text-shadow:0 16px 0 currentColor}
.tkw-btn:hover .tkw-roll b{transform:translateY(-16px)}
.tkw-undo{all:unset;cursor:pointer;margin-top:16px;font-size:10px;letter-spacing:1px;color:var(--c-soft);white-space:pre}
.tkw-progress{width:300px;height:3px;border-radius:2px;background:color-mix(in srgb,var(--c-ink) 12%,transparent);overflow:hidden}
.tkw-progress i{display:block;height:100%;width:0;background:var(--c-calm);transition:width .24s linear}
.tkw-count{margin-top:12px;font-size:11px;letter-spacing:.8px;color:var(--c-soft)}
.tkw-stats{display:flex;gap:30px;margin:-4px 0 22px}
.tkw-stat{display:grid;justify-items:center;gap:2px}
.tkw-stat b{font-weight:400;font-family:var(--_typography---font-styles--heading,serif);font-size:26px;line-height:1}
.tkw-stat span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkw-fixes{display:grid;gap:7px;width:360px;margin:-6px 0 20px;padding:10px 12px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 4%,var(--c-card));text-align:left}
.tkw-fix{display:flex;align-items:center;gap:10px;font-size:11px}
.tkw-fix i{width:12px;height:12px;flex:none;border-radius:2px;box-shadow:inset 0 0 0 1px var(--c-line);background:var(--c-card);transition:background .3s}
.tkw-fix.is-done i{background:var(--c-calm) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.4 2.4L9.6 3.6' fill='none' stroke='white' stroke-width='1.6'/%3E%3C/svg%3E") center/10px no-repeat;box-shadow:none}
.tkw-fix em{margin-left:auto;font-style:normal;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkw-chip{margin:-8px 0 20px;padding:6px 10px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 6%,var(--c-card));font-size:11px}
.tkw-file{display:flex;align-items:center;gap:22px;margin:-6px 0 20px;text-align:left}
.tkw-file-art{width:78px;height:78px;display:grid;place-items:center}
.tkw-file-art .ts-art{width:70px;height:70px}.tkw-file-art .ts-shot{width:70px;height:46px}
.tkw-file b{display:block;font-weight:400;font-family:var(--_typography---font-styles--heading,serif);font-size:22px;line-height:1.1;max-width:240px}
.tkw-file span{display:block;margin-top:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}

/* Rhythms: the moment it keeps your hours */
[data-sol-rhythms]{position:relative}
.rs-layer{position:absolute;inset:0;pointer-events:none;z-index:3;font-size:16px}
.rs-menu{position:absolute;right:-.6em;top:-1.6em;width:16em;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#2b2926}
.rs-menubar{width:fit-content;margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:.6em;height:1.6em;padding:0 .5em 0 .4em;border-radius:.5em;background:rgba(251,247,238,.82);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 0 0 1px rgba(61,58,53,.1),0 10px 24px -12px rgba(61,58,53,.35);font-size:.8em}
.rs-mstar{width:1.5em;height:1.25em;display:grid;place-items:center;border-radius:.3em;background:rgba(61,58,53,.08);transition:background .4s,color .4s}
.rs-mstar svg{width:.95em;height:.95em}
.rs-layer.is-on .rs-mstar{background:#0297db;color:#fff}
.rs-clock{font-variant-numeric:tabular-nums}
.rs-mlist{margin-top:.35em;padding:.3em;border-radius:.6em;background:rgba(246,243,236,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 0 0 .5px rgba(0,0,0,.2),0 22px 44px -14px rgba(61,58,53,.4);font-size:.78em}
.rs-mlabel{padding:.35em .6em .2em;font-size:.85em;opacity:.5}
.rs-mitem{padding:.3em .6em;border-radius:.3em}
.rs-mitem.is-new{max-height:0;padding-block:0;opacity:0;overflow:hidden;transition:max-height .5s ${EASE},opacity .4s,padding .5s ${EASE}}
.rs-layer.is-on .rs-mitem.is-new{max-height:2em;padding-block:.3em;opacity:1}
.rs-mdiv{height:1px;margin:.3em .6em;background:rgba(0,0,0,.1)}
.rs-mitem.is-action{opacity:.85}
.dfs-night .rs-menu{color:#ecebe8}.dfs-night .rs-menubar{background:rgba(30,40,64,.85)}.dfs-night .rs-mlist{background:rgba(32,42,66,.94)}.dfs-night .rs-mdiv{background:rgba(255,255,255,.1)}
.rs-toast{position:absolute;left:-1em;bottom:2.4em;width:25.5em;display:flex;align-items:center;gap:.8em;padding:.8em .9em .8em 1em;border-radius:.25em;background:var(--brand-colors--light-bage,#fbf7ee);color:var(--brand-colors--dark_gray,#3d3a35);box-shadow:0 0 0 1px var(--brand-colors--dark-bage,#dfd5c9),0 24px 48px -20px rgba(61,58,53,.45);font-family:var(--_typography---font-styles--body,monospace);overflow:hidden;opacity:0;transform:translateY(.8em);transition:opacity .45s,transform .6s ${EASE}}
.rs-layer.is-toast .rs-toast{opacity:1;transform:none}
.rs-tstar{width:1.25em;height:1.25em;flex:none}.rs-tstar svg{width:100%;height:100%}
.rs-ttag{font-size:.62em;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-colors--blue,#0297db)}
.rs-tmsg{margin-top:.2em;font-size:.72em;letter-spacing:.06em;text-transform:uppercase}
.rs-tx{margin-left:auto;font-size:.7em;opacity:.6}
.rs-tbar{position:absolute;left:0;bottom:0;height:2px;width:100%;background:radial-gradient(circle,#0297db,#3fc3ff);transform-origin:left;transform:scaleX(1)}
.rs-layer.is-toast .rs-tbar{transform:scaleX(0);transition:transform 8s linear}
.rs-browser{position:absolute;right:-1.2em;bottom:-1.6em;width:25em;aspect-ratio:16/11;border-radius:.6em;overflow:hidden;background:#f6f3ec;box-shadow:0 0 0 1px rgba(61,58,53,.18),0 30px 60px -20px rgba(61,58,53,.55);opacity:0;transform:translateY(2em) scale(.97);transition:opacity .5s,transform .7s ${EASE};display:flex;flex-direction:column}
.rs-layer.is-browser .rs-browser{opacity:1;transform:none}
.rs-bbar{display:flex;align-items:center;gap:.5em;height:2.1em;padding:0 .6em;background:#ece8df;border-bottom:1px solid rgba(61,58,53,.12);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;font-size:.62em;color:#2b2926}
.rs-bdots{display:flex;gap:.35em}.rs-bdots i{width:.75em;height:.75em;border-radius:50%;background:#ed6a5e}.rs-bdots i:nth-child(2){background:#f5bf4f}.rs-bdots i:nth-child(3){background:#61c554}
.rs-btab{display:flex;align-items:center;gap:.4em;padding:.25em .7em;border-radius:.35em;background:#fbf9f4;min-width:7em}
.rs-bfav{width:1em;height:1em;display:none}.rs-bfav svg{width:100%;height:100%}
.rs-layer.is-calm .rs-bfav{display:block}
.rs-baddr{flex:1;display:flex;align-items:center;height:1.7em;padding:0 .7em;border-radius:.35em;background:#fbf9f4;font-family:var(--_typography---font-styles--body,monospace);overflow:hidden;white-space:nowrap}
.rs-bcaret{width:1px;height:1em;margin-left:1px;background:#2b2926;opacity:0}
.rs-layer.is-typing .rs-bcaret{opacity:1;animation:rsCaret 1s steps(1) infinite}
@keyframes rsCaret{50%{opacity:0}}
.rs-bview{position:relative;flex:1;overflow:hidden}
.rs-bprog{position:absolute;left:0;top:0;height:2px;width:0;background:#0297db;z-index:2}
.rs-layer.is-loading .rs-bprog{width:80%;transition:width .6s ease-out}
.rs-bstart{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:.8em;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;font-size:.65em;color:#2b2926}
.rs-bstart>div{display:grid;grid-template-columns:repeat(6,2.6em);gap:.7em}.rs-bstart i{aspect-ratio:1;border-radius:.6em;background:#e5e0d6}
.rs-calm{position:absolute;inset:0;display:grid;place-items:center;background-size:cover;background-position:center;opacity:0;transform:scale(1.02);transition:opacity .9s ${EASE},transform .9s ${EASE};color:#3d3a35}
.rs-calm::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(251,247,239,.92),rgba(251,247,239,.25) 60%)}
.rs-layer.is-calm .rs-calm{opacity:1;transform:none}
.rs-calm-in{position:relative;display:grid;justify-items:center;text-align:center;gap:.35em;font-family:var(--_typography---font-styles--body,monospace)}
.rs-calm-mark{width:2.4em;height:2.4em;display:grid;place-items:center;border-radius:50%;background:rgba(2,151,219,.1);margin-bottom:.2em}
.rs-calm-mark svg{width:1em;height:1em}
.rs-calm-h{font-family:var(--_typography---font-styles--heading,serif);font-size:2em;line-height:1}
.rs-calm-m{font-size:.55em;letter-spacing:.1em;text-transform:uppercase}
.rs-calm-s{font-size:.5em;letter-spacing:.1em;text-transform:uppercase;opacity:.6}
.rs-calm-chip{margin-top:.3em;padding:.35em .6em;font-size:.48em;letter-spacing:.12em;text-transform:uppercase;color:#0297db;background:rgba(2,151,219,.1)}
.dfs-night .rs-browser{background:#1b2236}.dfs-night .rs-bbar{background:#232b42;color:#ecebe8;border-color:rgba(255,255,255,.08)}.dfs-night .rs-btab,.dfs-night .rs-baddr{background:#2b3450}.dfs-night .rs-bcaret{background:#ecebe8}.dfs-night .rs-bstart{color:#ecebe8}.dfs-night .rs-bstart i{background:#2b3450}
.dfs-night .rs-calm{color:#f1ede2}.dfs-night .rs-calm-chip{color:#7fd0ff;background:rgba(29,171,250,.18)}.dfs-night .rs-calm::before{background:radial-gradient(circle at 50% 50%,rgba(14,22,40,.9),rgba(14,22,40,.55) 60%)}
@media (max-width:767px){.rs-menu{right:0;top:-1.2em}.rs-toast{left:0;width:19em;font-size:.9em}.rs-browser{right:0;width:21em}}
`;
  document.head.append(s);
}
