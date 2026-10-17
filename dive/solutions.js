/* =========================================================
   dfs-dive — Our Solutions demos (test: /rimbo-home-test)
   Loaded by dive.js only when the page has [data-sol]. Each product shows what it does, not what it looks like:

     Fundamentals  [data-course-demo]   the course player, built from the course's own markup and classes, with the
                                        course's first two lessons (0.1 Course Intro, 0.2 Roadmap) from its video host;
                                        starts on the cover with the play button. Modules open and close.
     Tinko         [data-tinko-demo]    a crop of a Mac screen (menu bar, glass Dock with the real icons, Tinko's
                                        window at its real size): Tinko clears the cluttered Dock down to the daily
                                        drivers, then the desktop. The app's own lines and steps.
     Rhythms       [data-sol-rhythms]   around the real app window (main.js brings it to life): the menu bar clock
                                        reaches 21:30, Evenings switches on, the toast says what closed, and a browser
                                        that tries YouTube gets the calm page instead. Pauses while you use the app.
   And the sections after it: Who's behind it ([data-found], see initFounders), the journal ([data-journal], see
   initJournal), the close ([data-close], see initClose) and the footer ([data-foot], see initFooter).

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
  const found = document.querySelector('[data-found]');
  if (found) initFounders(found);
  const journal = document.querySelector('[data-journal]');
  if (journal) initJournal(journal);
  const close = document.querySelector('[data-close]');
  if (close) initClose(close, journal);
  const foot = document.querySelector('[data-foot]');
  if (foot) initFooter(foot);
}

/* ---------------------------------------------------------
   Fundamentals: the course player, built from the course's own pieces
   The markup and classes of /courses/fundamentals (the Bunny player, the navigation bar, the course title with its
   progress, the module accordion), so it looks and moves like the course, night mode included (night.css styles
   them). It's a demo: 20 seconds of each of the course's first two lessons, 0.1 Course Intro and 0.2 Roadmap, cut
   and cropped to the slide, without sound (dive/media; the full lessons stay on the course's own video host). It
   starts on the lesson cover with the play button, like the course; at the end of a clip the course's own
   Complete-and-Continue overlay fades in and opens the course in a new tab. Modules open and close.
   Laid out at a fixed size (1000 wide, the course's own proportions) and scaled to the column, like the Rhythms window; on phones without the list.
   --------------------------------------------------------- */
const CLIP = name => new URL(`./media/${name}`, import.meta.url).href;
const COVER = 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/';
const LESSONS = [
  { id: '0.1', src: CLIP('fundamentals-0.1-preview.mp4'), cover: COVER + '6a108d4ac20ca7593cd6572a_PIMG_1.avif', dur: '00:20' },
  { id: '0.2', src: CLIP('fundamentals-0.2-preview.mp4'), cover: COVER + '6a108c903b165a99aabd81e0_PIMG_2.avif', dur: '00:20' },
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
const TOTAL_LESSONS = 35;

const SVG = {
  pause: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__pause-svg"><path d="M16 5V19" stroke="currentColor" stroke-width="3" stroke-miterlimit="10"></path><path d="M8 5V19" stroke="currentColor" stroke-width="3" stroke-miterlimit="10"></path></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__play-svg"><path d="M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z" fill="currentColor"></path></svg>',
  volUp: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__volume-up-svg"><path d="M3 8.99998V15H7L12 20V3.99998L7 8.99998H3ZM16.5 12C16.5 10.23 15.48 8.70998 14 7.96998V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.22998V5.28998C16.89 6.14998 19 8.82998 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.71998 18.01 4.13998 14 3.22998Z" fill="currentColor"></path></svg>',
  volMute: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__volume-mute-svg"><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.76C15.38 20.45 16.63 19.81 17.69 18.95L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z" fill="currentColor"></path></svg>',
  full: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__fullscreen-scale-svg"><rect x="3" y="14" width="2" height="7" fill="currentColor"></rect><rect x="3" y="3" width="2" height="7" fill="currentColor"></rect><rect x="19" y="3" width="2" height="7" fill="currentColor"></rect><rect x="19" y="14" width="2" height="7" fill="currentColor"></rect><rect x="3" y="19" width="7" height="2" fill="currentColor"></rect><rect x="14" y="19" width="7" height="2" fill="currentColor"></rect><rect x="3" y="3" width="7" height="2" fill="currentColor"></rect><rect x="14" y="3" width="7" height="2" fill="currentColor"></rect></svg>',
  shrink: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="bunny-player__fullscreen-shrink-svg"><rect x="7" y="2" width="2" height="7" fill="currentColor"></rect><rect x="15" y="2" width="2" height="7" fill="currentColor"></rect><rect x="15" y="15" width="2" height="7" fill="currentColor"></rect><rect x="8" y="15" width="2" height="7" fill="currentColor"></rect><rect x="2" y="7" width="7" height="2" fill="currentColor"></rect><rect x="3" y="15" width="7" height="2" fill="currentColor"></rect><rect x="15" y="7" width="7" height="2" fill="currentColor"></rect><rect x="15" y="15" width="7" height="2" fill="currentColor"></rect></svg>',
  loading: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" fill="none" class="bunny-player__loading-svg"><path fill="currentColor" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"><animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 50 50" to="360 50 50" repeatCount="indefinite"></animateTransform></path></svg>',
  chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 36 36" fill="none" class="accordion-css__item-icon-svg"><path d="M28.5 22.5L18 12L7.5 22.5" stroke="currentColor" stroke-width="3" stroke-miterlimit="10"></path></svg>',
  lesson: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 8 8"><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width=".5" d="M2.914 4V2.396l1.336.802L5.587 4l-1.337.802-1.336.802z"/><rect width="7.75" height="7.75" x=".125" y=".125" stroke="currentColor" stroke-width=".25" rx="1.875"/></svg>',
  prev: '<svg viewBox="0 0 12 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="100%" preserveAspectRatio="xMidYMid meet"> <path d="M4.64681 6.50671L4.64681 6.01342L4.09787 6.01342L3.54894 6.01342L3.54894 5.50839L3.54894 5.00336L3 5.00336L2.45106 5.00336L2.45617 4.50537L2.46383 4.00503L7.23319 3.99799L12 3.99329L12 3.5L12 3.00671L7.23319 3.00201L2.46383 2.99497L2.45617 2.49698L2.45106 1.99664L3 1.99664L3.54894 1.99664L3.54894 1.49161L3.54894 0.986577L4.09787 0.986577L4.64681 0.986577L4.64681 0.493288L4.64681 0L4.09787 0L3.54894 0L3.54894 0.493288L3.54894 0.986577L3.00511 0.991275L2.46383 0.998321L2.45617 1.49866L2.45106 1.99664L1.91489 1.99664L1.37872 1.99664L1.37362 2.49698L1.36596 2.99497L0.681703 3.00201L0 3.00671L0 3.5L0 3.99329L0.681703 3.99799L1.36596 4.00503L1.37362 4.50537L1.37872 5.00336L1.91489 5.00336L2.45106 5.00336L2.45617 5.50369L2.46383 6.00168L3.00511 6.00873L3.54894 6.01342L3.54894 6.50671L3.54894 7L4.09787 7L4.64681 7L4.64681 6.50671Z" fill="#3D3A35"/> </svg>',
  next: '<svg viewBox="0 0 12 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="100%" preserveAspectRatio="xMidYMid meet"> <path d="M7.35319 0.493288V0.986576H7.90213H8.45106V1.49161V1.99664H9H9.54894L9.54383 2.49463L9.53617 2.99497L4.76681 3.00201L0 3.00671L0 3.5L0 3.99329L4.76681 3.99799L9.53617 4.00503L9.54383 4.50302L9.54894 5.00336H9H8.45106V5.50839V6.01342H7.90213H7.35319V6.50671V7H7.90213H8.45106V6.50671V6.01342L8.99489 6.00872L9.53617 6.00168L9.54383 5.50134L9.54894 5.00336L10.0851 5.00336H10.6213L10.6264 4.50302L10.634 4.00503L11.3183 3.99799L12 3.99329V3.5V3.00671L11.3183 3.00201L10.634 2.99497L10.6264 2.49463L10.6213 1.99664H10.0851H9.54894L9.54383 1.49631L9.53617 0.998321L8.99489 0.991274L8.45106 0.986576V0.493288V0H7.90213H7.35319V0.493288Z"/> </svg>',
};
const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

function initCourse(host) {
  const W = 1000;
  host.innerHTML = `<div class="cpr">
    <div class="cpr-left">
      <div class="next_lesson_container"><a href="/" target="_blank" rel="noopener" class="lesson-complete_overlay w-inline-block" data-cp="continue"><div class="inherit_txt_cl">Continue in the course</div><div class="svg_arrow w-embed">${SVG.next}</div></a>
      <div class="bunny-player" data-player-status="idle" data-player-activated="false" data-player-hover="idle" data-player-muted="true" data-player-fullscreen="false">
        <div class="bunny-player__before" style="padding-top:56.25%"></div>
        <video class="bunny-player__video" playsinline muted preload="none"></video>
        <img class="bunny-player__placeholder" src="${LESSONS[0].cover}" alt="">
        <div class="bunny-player__dark"></div>
        <div data-player-control="playpause" class="bunny-player__playpause"><div class="bunny-player__big-btn">${SVG.pause}${SVG.play}</div></div>
        <div class="bunny-player__interface"><div class="bunny-player__interface-fade"></div>
          <div class="bunny-player__interface-bottom">
            <div data-player-control="playpause" class="bunny-player__toggle-playpause">${SVG.pause}${SVG.play}</div>
            <div class="bunny-player__time"><p data-player-time-progress class="bunny-player__text">00:00</p><p class="bunny-player__text is--transparent">/</p><p data-player-time-duration class="bunny-player__text is--transparent">${LESSONS[0].dur}</p></div>
            <div data-player-timeline class="bunny-player__timeline"><div class="bunny-player__timeline-bar"><div class="bunny-player__timeline-bg"></div><div data-player-buffered class="bunny-player__timeline-buffered"></div><div data-player-progress class="bunny-player__timeline-progress"></div></div><div class="bunny-player__timeline-handle"></div></div>
            <div class="bunny-player__interface-btns"><div data-player-control="speed" class="speed_controls"><div data-player-speed-label class="speed_mode">1.0x</div></div>
              <div data-player-control="mute" class="bunny-player__toggle-mute">${SVG.volUp}${SVG.volMute}</div>
              <div data-player-control="fullscreen" class="bunny-player__toggle-fullscreen">${SVG.full}${SVG.shrink}</div></div>
          </div></div>
        <div class="bunny-player__loading">${SVG.loading}</div>
      </div></div>
      <div class="course_navigation_bar"><a href="#" class="cnb_option is-outline w-inline-block" data-cp="prev"><div class="svg_arrow w-embed">${SVG.prev}</div><div class="inherit_txt_cl">Previous Lesson</div></a><a href="#" class="cnb_option is-dark w-inline-block" data-cp="next"><div class="inherit_txt_cl is-right">Next Lesson</div><div class="svg_arrow w-embed">${SVG.next}</div></a></div>
    </div>
    <div class="cpr-right">
      <div class="cpr-title"><div class="course_progrpess_wrap"><div class="course_prog_title"><div class="logo_icon w-embed">${STAR}</div><div class="course_h1">Fundamentals</div></div><div class="cpr-pct"><span>0</span>%</div></div><div class="progression_bar"><div class="progress_juice"></div></div></div>
      <div class="accordion-css" data-lenis-prevent><ul class="accordion-css__list">${COURSE.map(([t, ls], m) => `<li data-accordion-status="${m === 0 ? 'active' : 'not-active'}" class="accordion-css__item is-course">
        <div data-accordion-toggle class="course_module"><h3 class="course_item_title">${t}</h3><div class="accordion-css__item-icon">${SVG.chevron}</div></div>
        <div class="accordion-css__item-bottom"><div class="overflowhide_this">${ls.map(([n, name, d]) => `<div class="c_item${n === '0.1' ? ' is-active' : ''}" data-l="${n}"><div class="left_content"><div class="check_box"><div class="check_fill"></div></div><p class="accordion-css__item-p">${n}: ${name}</p></div><div class="lesson_duration"><div class="code-embed-4 w-embed">${SVG.lesson}</div><div class="c_time">${d}</div></div></div>`).join('')}</div></div>
      </li>`).join('')}</ul></div>
    </div>
  </div>`;
  const $ = s => host.querySelector(s), $$ = s => [...host.querySelectorAll(s)];
  const cpr = $('.cpr'), player = $('.bunny-player'), v = $('video'), cover = $('.bunny-player__placeholder');
  const timeP = $('[data-player-time-progress]'), timeD = $('[data-player-time-duration]'), prog = $('[data-player-progress]'), buf = $('[data-player-buffered]'), speedL = $('[data-player-speed-label]');
  const pctEl = $('.cpr-pct span'), juice = $('.progress_juice'), overlay = $('[data-cp="continue"]');
  v.muted = true; v.defaultMuted = true;   // a preview on the homepage: never with sound
  const ending = on => overlay.classList.toggle('is-on', on);
  const st = (k, val) => player.setAttribute('data-player-' + k, val);
  // fit: the course's own sizes, scaled to the column; phones get the player and its buttons only
  const fit = () => {
    const w = host.clientWidth, phone = w < 560, size = phone ? 690 : W;   // phones: the player and its buttons only
    host.classList.toggle('is-phone', phone);
    cpr.style.transform = `scale(${w / size})`;
    host.style.height = (cpr.offsetHeight * w / size) + 'px';
  };
  new ResizeObserver(fit).observe(host);

  let at = 0, loaded = false, done = new Set(), hoverT = 0;
  function progress() {
    const t = v.currentTime || 0, d = v.duration || 0;
    timeP.textContent = mmss(t);
    if (d) timeD.textContent = mmss(d);
    prog.style.transform = `translateX(${d ? (t / d * 100 - 100).toFixed(2) : -100}%)`;
    if (d && v.buffered.length) buf.style.transform = `translateX(${(v.buffered.end(v.buffered.length - 1) / d * 100 - 100).toFixed(2)}%)`;
  }
  function course() {
    const pct = Math.round(done.size / TOTAL_LESSONS * 100);
    pctEl.textContent = pct; juice.style.width = pct + '%';
    $$('.c_item').forEach(el => {
      el.classList.toggle('is-active', el.dataset.l === LESSONS[at].id);
      const f = el.querySelector('.check_fill'); if (f) f.classList.toggle('is-complete', done.has(el.dataset.l));
    });
  }
  function unload() {
    try { v.pause(); } catch (_) {}
    v.removeAttribute('src'); try { v.load(); } catch (_) {}
    loaded = false;
  }
  function select(i, autoplay) {
    unload();
    at = (i + LESSONS.length) % LESSONS.length;
    const L = LESSONS[at];
    cover.src = L.cover;
    timeP.textContent = '00:00'; timeD.textContent = L.dur; prog.style.transform = 'translateX(-100%)'; buf.style.transform = 'translateX(-100%)';
    st('status', 'idle'); st('activated', 'false'); ending(false);
    course();
    if (autoplay) play();
  }
  function play() {
    const L = LESSONS[at];
    if (v.ended) v.currentTime = 0;
    ending(false); st('activated', 'true');
    if (!loaded) { loaded = true; st('status', 'loading'); v.src = L.src; }
    const p = v.play(); if (p) p.catch(() => { if (v.paused) st('status', 'paused'); });
  }
  const toggle = () => { if (!loaded || v.paused) play(); else v.pause(); };
  v.addEventListener('playing', () => st('status', 'playing'));
  v.addEventListener('waiting', () => { if (!v.paused) st('status', 'loading'); });
  v.addEventListener('pause', () => { if (loaded) st('status', 'paused'); });
  v.addEventListener('timeupdate', progress);
  v.addEventListener('progress', progress);
  v.addEventListener('loadedmetadata', progress);
  // the end of a clip: the lesson is ticked off and the course's overlay fades in; going back on the bar takes it away
  v.addEventListener('ended', () => { done.add(LESSONS[at].id); course(); st('status', 'paused'); ending(true); });
  v.addEventListener('seeking', () => { if (v.duration && v.currentTime < v.duration - .3) ending(false); });
  $$('[data-player-control="playpause"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggle(); }));
  player.addEventListener('click', e => { if (!e.target.closest('.bunny-player__interface-bottom')) toggle(); });
  const SPEEDS = [1, 1.25, 1.5, 2];
  $('[data-player-control="speed"]').addEventListener('click', () => { const s = SPEEDS[(SPEEDS.indexOf(v.playbackRate) + 1) % SPEEDS.length]; v.playbackRate = s; speedL.textContent = (Number.isInteger(s) ? s.toFixed(1) : s) + 'x'; });
  $('[data-player-control="fullscreen"]').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else if (player.requestFullscreen) player.requestFullscreen(); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  });
  document.addEventListener('fullscreenchange', () => st('fullscreen', String(document.fullscreenElement === player)));
  $('[data-player-timeline]').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); if (v.duration) { v.currentTime = (e.clientX - r.left) / r.width * v.duration; progress(); } });
  // the interface shows while the pointer moves over the playing video, and goes after a moment of rest
  player.addEventListener('pointermove', () => { st('hover', 'active'); clearTimeout(hoverT); hoverT = setTimeout(() => st('hover', 'idle'), 2200); });
  player.addEventListener('pointerleave', () => { clearTimeout(hoverT); st('hover', 'idle'); });
  host.querySelector('[data-cp="prev"]').addEventListener('click', e => { e.preventDefault(); select(at - 1, !v.paused && loaded); });
  host.querySelector('[data-cp="next"]').addEventListener('click', e => { e.preventDefault(); done.add(LESSONS[at].id); select(at + 1, !v.paused && loaded); });
  // the modules open and close (the course's own accordion styles do the motion)
  host.querySelector('.accordion-css').addEventListener('click', e => {
    const t = e.target.closest('[data-accordion-toggle]');
    if (t) { const item = t.closest('[data-accordion-status]'); item.setAttribute('data-accordion-status', item.getAttribute('data-accordion-status') === 'active' ? 'not-active' : 'active'); return; }
    const les = e.target.closest('.c_item');
    if (les) { const i = LESSONS.findIndex(L => L.id === les.dataset.l); if (i > -1 && i !== at) select(i, loaded && !v.paused); }
  });
  let seen = false;
  watch(host, on => { seen = on; if (!on && loaded && !v.paused) v.pause(); }, '0px');
  tilt(host, 2.5, () => seen && !document.fullscreenElement);
  select(0, false);
  fit();
}

// a card that leans a few degrees toward the pointer (anywhere on the page), easing back when it leaves the window
function tilt(el, max, active) {
  if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  el.parentElement.style.perspective = '1800px';
  let tx = 0, ty = 0, rx = 0, ry = 0, raf = 0;
  const step = () => {
    rx += (tx - rx) * .1; ry += (ty - ry) * .1;
    el.style.transform = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
    raf = Math.abs(tx - rx) + Math.abs(ty - ry) > .01 ? requestAnimationFrame(step) : 0;
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(step); };
  window.addEventListener('pointermove', e => {
    if (!active()) { tx = ty = 0; go(); return; }
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    tx = -ny * max; ty = nx * max; go();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { tx = ty = 0; go(); });
}

/* ---------------------------------------------------------
   Tinko on a Mac
   A 1000 x 650 crop of a Mac screen (scaled to the column): Tinko's own wallpaper, the menu bar, the glass Dock with
   the real icons (as macOS draws them, dive/media/mac), the desk, and Tinko's window. It starts before Tinko: a Mac
   in the middle of things (the desk's files open in Finder, Preview and TextEdit). Then Tinko opens (his Dock icon
   bounces), floats in the middle and goes through it the way the app does (tinko/Sources: QuitPass, PinPass,
   DockViews, DeskViews, Desk): what's open, one app at a time behind him; what's pinned, down to the daily drivers
   (he and Rhythms stay); then he hides the rest, glides to the bottom left corner and clears the desk. A bar under
   the screen fills at one steady pace with how far he is (a diamond where each part starts) and starts him over. Space, the delete key, S
   and Cmd+Z work too; doing something yourself takes over from the autoplay for a while.
   --------------------------------------------------------- */
const MAC = name => new URL(`./media/mac/${name}.avif`, import.meta.url).href;
const TK_BITMAP = ['....######....', '..##########..', '.############.', '.#############', '##############', '##############', '##############', '.############.', '.############.', '..##########..', '....#####.....'];
const DEL = '<svg viewBox="0 0 22 18" aria-hidden="true"><path d="M7 2h13v14H7L1 9z"/><path d="M11 6l6 6M17 6l-6 6"/></svg>';
const DIAMOND = '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M0 5.656 5.657 0l5.657 5.657-5.657 5.657z"/></svg>';
const TK = .86;                     // Tinko's window (614 x 540) a little smaller than life, so the desk has room
const TKW = 614 * TK, TKH = 540 * TK;
// the Dock as it often is: the default apps plus what piled up. keep = a daily driver; run = open right now
const DOCK = [
  ['apps', 'Apps', '6 months ago'], ['safari', 'Safari', '2 months ago'], ['messages', 'Messages', 'yesterday'], ['mail', 'Mail', '3 weeks ago'],
  ['maps', 'Maps', '8 months ago'], ['photos', 'Photos', '4 months ago'], ['facetime', 'FaceTime', 'a year ago'], ['calendar', 'Calendar', '5 days ago'],
  ['contacts', 'Contacts', '7 months ago'], ['reminders', 'Reminders', '9 months ago'], ['notes', 'Notes', '2 weeks ago'], ['freeform', 'Freeform', 'a year ago'],
  ['tv', 'TV', '11 months ago'], ['music', 'Music', '3 months ago'], ['news', 'News', 'a year ago'], ['appstore', 'App Store', '2 weeks ago'],
  ['settings', 'System Settings', '4 days ago'], ['arc', 'Arc', 'run', 1], ['figma', 'Figma', 'today', 1], ['claude', 'Claude', 'run', 1],
  ['slack', 'Slack', '2 months ago'], ['chrome', 'Google Chrome', '5 months ago'], ['spotify', 'Spotify', 'run', 1], ['zoom', 'zoom.us', '6 weeks ago'],
  ['tinko', 'Tinko', 'self'], ['rhythms', 'Rhythms', 'run', 1],
].map(([id, name, when, keep]) => ({ id, name, when, keep: !!keep, run: when === 'run' }));
// open but not pinned: they sit after the pinned apps while they run (Preview and TextEdit, opened from the desk)
const EXTRA = [['preview', 'Preview'], ['textedit', 'TextEdit']];
// what's open, in the order it was opened: the quit pass (Finder can't be quit and Tinko is Tinko)
const OPEN = [
  { id: 'arc', name: 'Arc', pinned: true, keep: true }, { id: 'claude', name: 'Claude', pinned: true, keep: true },
  { id: 'spotify', name: 'Spotify', pinned: true, keep: true }, { id: 'rhythms', name: 'Rhythms', pinned: true, keep: true },
  { id: 'preview', name: 'Preview', pinned: false, keep: false, win: 'pv' }, { id: 'textedit', name: 'TextEdit', pinned: false, keep: false, win: 'te' },
];
// the bar under the screen runs at one steady pace: when each step starts on the autoplay, in seconds from Tinko's
// first screen (measured on a run; end = the loop starts over). Doing things yourself only makes it wait or catch up
const PACE = { quitAsk: 0, quit: 2.2, quitDone: 8.1, pinsAsk: 10.2, pin: 12.3, pinsDone: 21.4, dockDone: 24.5, scan: 27.2, desk: 28.9, fixes: 30.5, moved: 34.6, leftover: 36.2, binned: 38.5, left: 39.5, empty: 44.8, end: 48.3 };
const PACE_ORDER = Object.keys(PACE);
// the menus of the app in front
const MENUS = {
  finder: ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help'], preview: ['Preview', 'File', 'Edit', 'View', 'Go', 'Tools', 'Window', 'Help'],
  textedit: ['TextEdit', 'File', 'Edit', 'Format', 'View', 'Window', 'Help'], tinko: ['Tinko', 'File', 'Edit', 'View', 'Window', 'Help'],
};
// the desk, as in the real recording (test mode, demo files); where they lie is in LAYOUT (scatter)
const FILES = [
  { id: 's1', kind: 'shot', img: 'shot-1', name: 'Screenshot 2026-10-12 at 09.41.22' },
  { id: 's2', kind: 'shot', img: 'shot-2', name: 'Screenshot 2026-10-13 at 16.07.51' },
  { id: 'dmg', kind: 'dmg', name: 'zoomusInstallerFull.dmg' },
  { id: 'zip', kind: 'zip', name: 'photos-export.zip' },
  { id: 's3', kind: 'shot', img: 'shot-3', name: 'Screenshot 2026-10-14 at 11.22.09' },
  { id: 's4', kind: 'shot', img: 'shot-4', name: 'Screenshot 2026-10-15 at 22.51.40' },
  { id: 'txt', kind: 'txt', name: 'Notes for Monday.txt' },
  { id: 'old', kind: 'folder', name: 'Old stuff' },
];
const SHOTS = { id: 'shots', kind: 'folder', name: 'Screenshots' };   // the new folder
// mid / corner: where Tinko's window sits in the middle (the Dock part) and in the bottom left corner (the desk part,
// 24 points from the edge and the Dock, as Desk.swift has it). wins: the open windows of the mess. scatter: where
// the desk's files lie before the desk sorts itself (all over, out of the way of Tinko in his corner)
const LAYOUT = {
  mac: {
    W: 1000, H: 650, mid: [236, 74], corner: [24, 99],
    wins: { old: [36, 44], dl: [500, 340], pv: [520, 58], te: [80, 300] },   // each peeks out from behind Tinko
    scatter: { s1: [905, 34], old: [745, 58], s2: [612, 128], dmg: [838, 162], s3: [700, 268], zip: [925, 300], txt: [606, 408], s4: [790, 412], shots: [930, 462] },
    // sorted: in columns from the top right, as macOS lines them up (slot i: column i / 5 from the right, row i % 5)
    spot: f => [932 - f.at[0] * 108, 38 + f.at[1] * 104], slot: i => ({ at: [Math.floor(i / 5), i % 5] }),
  },
  phone: {
    W: 660, H: 800, mid: [66, 40], corner: [66, 40],
    wins: { old: [10, 44], dl: [250, 330], pv: [200, 70], te: [20, 300] },
    scatter: { s1: [70, 520], old: [190, 548], s2: [330, 516], dmg: [455, 540], s3: [590, 522], zip: [120, 628], s4: [270, 640], txt: [420, 622], shots: [560, 632] },
    spot: f => [66 + (f.ph % 5) * 132, 528 + Math.floor(f.ph / 5) * 100], slot: i => ({ ph: i }),
  },
};
// a desktop label the way Finder sets it: two lines at most, the second cut in the middle ("2026-10…09.41.22")
let measure;
function deskLabel(name, max = 98) {
  measure = measure || Object.assign(document.createElement('canvas').getContext('2d'), { font: '12px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif' });
  const w = t => measure.measureText(t).width, words = name.split(' ');
  let one = words.shift();
  while (words.length && w(one + ' ' + words[0]) <= max) one += ' ' + words.shift();
  if (w(one) > max) {   // a long word: break after a hyphen if one fits, else where the line runs out
    let i = one.length; while (i > 1 && w(one.slice(0, i)) > max) i--;
    const h = one.slice(0, i).lastIndexOf('-'); if (h > 0) i = h + 1;
    words.unshift(one.slice(i)); one = one.slice(0, i);
  }
  let two = words.join(' ');
  if (w(two) > max) { let a = Math.ceil(two.length / 2), b = Math.floor(two.length / 2); while (a > 1 && w(two.slice(0, a) + '…' + two.slice(two.length - b)) > max) { a--; if (w(two.slice(0, a) + '…' + two.slice(two.length - b)) > max) b--; } two = two.slice(0, a) + '…' + two.slice(two.length - b); }
  return two ? one + '<br>' + two : one;
}
const deskFile = f => `<div class="ms-file is-${f.kind}${f === SHOTS ? ' is-shots' : ''}" data-id="${f.id}"><div class="ms-art">${fileArt(f)}</div><span>${deskLabel(f.name)}</span></div>`;
const fileArt = f => f.kind === 'shot' ? `<img class="ms-thumb" src="${MAC(f.img)}" alt="">` : `<img class="ms-ficon" src="${MAC('file-' + f.kind)}" alt="">`;
const SVGI = {
  apple: '<svg viewBox="0 0 170 170" aria-hidden="true"><path fill="currentColor" d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.93.21-9.84-1.96-14.75-6.52-3.13-2.73-7.05-7.41-11.74-14.04-5.03-7.08-9.17-15.29-12.41-24.65-3.47-10.11-5.21-19.9-5.21-29.38 0-10.86 2.35-20.22 7.04-28.07 3.69-6.3 8.61-11.27 14.77-14.92s12.81-5.51 19.97-5.63c3.92 0 9.06 1.21 15.43 3.6 6.36 2.39 10.44 3.6 12.23 3.6 1.34 0 5.88-1.42 13.57-4.24 7.27-2.62 13.41-3.7 18.44-3.28 13.63 1.1 23.87 6.47 30.68 16.15-12.19 7.39-18.22 17.73-18.1 31 .11 10.34 3.86 18.94 11.23 25.77 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.1-2.96 15.67-8.86 22.67-7.12 8.32-15.73 13.13-25.07 12.37a25.2 25.2 0 0 1-.19-3.07c0-7.78 3.39-16.1 9.4-22.91 3-3.44 6.82-6.31 11.45-8.6 4.62-2.25 8.99-3.5 13.1-3.71.12 1.08.17 2.17.17 3.25z"/></svg>',
  search: '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="5.8" cy="5.8" r="4.75" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.3 9.3l3.9 3.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  cc: '<svg viewBox="0 0 18 14" aria-hidden="true"><rect x=".75" y=".75" width="16.5" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="4.2" cy="3.25" r="1.6" fill="currentColor"/><rect x=".75" y="8.25" width="16.5" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="13.8" cy="10.75" r="1.6" fill="currentColor"/></svg>',
  wifi: '<svg viewBox="0 0 18 13" aria-hidden="true"><path fill="currentColor" d="M9 12.6l2.3-2.9a3.6 3.6 0 0 0-4.6 0zM9 3a10.6 10.6 0 0 1 7.6 3.2l1.2-1.5A12.6 12.6 0 0 0 9 1 12.6 12.6 0 0 0 .2 4.7l1.2 1.5A10.6 10.6 0 0 1 9 3zm0 3.7a6.9 6.9 0 0 1 4.9 2l1.2-1.5A8.9 8.9 0 0 0 9 4.7a8.9 8.9 0 0 0-6.1 2.5l1.2 1.5a6.9 6.9 0 0 1 4.9-2z"/></svg>',
  battery: '<svg viewBox="0 0 27 13" aria-hidden="true"><rect x=".6" y=".6" width="22.8" height="11.8" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.2"/><rect x="2.3" y="2.3" width="15.6" height="8.4" rx="1.9" fill="currentColor"/><path d="M25 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2z" fill="currentColor" fill-opacity=".45"/></svg>',
  // start over: the site's own pixel loop (the spinner on the login page)
  reset: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M.165.279C.083.472.055 3.642.083 7.335l.082 6.698h14.057l.083-1.682.083-1.681H7.194V7.087h3.583V3.504H21.25v3.583h3.583v3.583h3.583v10.474h-3.583v3.583H21.25v3.583H10.777v-3.583H7.194v-3.583H3.61V19.49c0-.91-.083-1.654-.193-1.681-.138 0-.91-.028-1.737-.056l-1.516-.055-.082 1.71L0 21.143h3.61v3.583h3.584v3.583h3.583v1.654c0 .91.11 1.654.276 1.654.165 0 2.397.027 4.96.027 2.592 0 4.824-.027 4.962-.027.165 0 .276-.745.276-1.654V28.31h3.583v-3.583h3.583v-3.583H32V10.67h-3.583V7.087h-3.583V3.504H21.25V1.85c0-.91-.11-1.654-.276-1.654-.138 0-2.37-.027-4.961-.027-2.563 0-4.796.027-4.961.027s-.276.744-.276 1.654v1.654H7.194v3.583H3.61V3.642c0-1.902-.083-3.446-.193-3.446C3.28.17 2.536.114 1.736.031.716-.052.248.03.166.279"/></svg>',
};
/* the open windows: Finder (a folder and Downloads), Preview (a screenshot) and TextEdit (a note), drawn the way
   macOS 26 draws them, small */
const SIDE = {
  recents: '<path d="M8 3.2v5l3 1.8"/><circle cx="8" cy="8" r="6.2"/>',
  apps: '<path d="M8 1.8l2 5.4M8 1.8L6 7.2M3.4 12.6L8 1.8l4.6 10.8M4.6 9.6h6.8"/>',
  desk: '<rect x="1.8" y="2.6" width="12.4" height="8.6" rx="1.4"/><path d="M5.6 14h4.8M8 11.2V14"/>',
  docs: '<path d="M4 1.8h5.2L12.4 5v9.2H4z"/><path d="M9 1.8V5.2h3.4"/>',
  dl: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.4v6.2M5.4 8l2.6 2.6L10.6 8"/>',
};
const lights = '<div class="ma-lights"><i></i><i></i><i></i></div>';
const finderSide = on => `<div class="ma-side">${lights}<p>Favourites</p>${[['recents', 'Recents'], ['apps', 'Applications'], ['desk', 'Desktop'], ['docs', 'Documents'], ['dl', 'Downloads']].map(([k, t]) => `<span${k === on ? ' class="is-on"' : ''}><svg viewBox="0 0 16 16" aria-hidden="true">${SIDE[k]}</svg>${t}</span>`).join('')}</div>`;
const finderNav = '<span class="ma-nav"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg></span>';
const WINS = {
  old: { app: 'finder', w: 430, h: 270, html: () => `${finderSide()}<div class="ma-main"><div class="ma-tool">${finderNav}<b>Old stuff</b></div><div class="ma-icons">${[['folder', 'Taxes 2023'], ['png', 'logo-final-v3.png'], ['zip', 'backup.zip'], ['txt', 'ideas.txt'], ['folder', 'untitled folder'], ['png', 'IMG_2041.png'], ['dmg', 'Figma-old.dmg']].map(([k, t]) => `<figure><img src="${MAC('file-' + k)}" alt=""><span>${t}</span></figure>`).join('')}</div></div>` },
  dl: { app: 'finder', w: 400, h: 220, html: () => `${finderSide('dl')}<div class="ma-main"><div class="ma-tool">${finderNav}<b>Downloads</b></div><div class="ma-list"><div class="ma-head"><span>Name</span><span>Date Modified</span><span>Size</span></div>${[['dmg', 'Spotify.dmg', 'Today at 09:12', '182 MB'], ['zip', 'fonts-2026.zip', 'Yesterday at 17:40', '24 MB'], ['png', 'IMG_2041.png', '14 Oct 2026', '3.1 MB'], ['folder', 'photos-export', '11 Oct 2026', '--'], ['txt', 'invoice-notes.txt', '9 Oct 2026', '2 KB'], ['zip', 'Archive.zip', '2 Oct 2026', '611 KB']].map(([k, n, d, s]) => `<div class="ma-row"><span><img src="${MAC('file-' + k)}" alt="">${n}</span><span>${d}</span><span>${s}</span></div>`).join('')}</div></div>` },
  pv: { app: 'preview', w: 470, h: 330, html: () => `<div class="ma-bar">${lights}<b>Screenshot 2026-10-14 at 11.22.09</b><i class="ma-gap"></i><span class="ma-tools"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 7.2v4M8 4.6v.2"/></svg><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14M5 7h4"/></svg><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14M5 7h4M7 5v4"/></svg><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8v8.4M5.2 4.4 8 1.6l2.8 2.8M4.6 7H3.4v7.2h9.2V7h-1.2"/></svg></span></div><div class="ma-img"><img src="${new URL('./media/mac/preview-shot.jpg', import.meta.url).href}" alt=""></div>` },
  te: { app: 'textedit', w: 320, h: 240, html: () => `<div class="ma-bar is-centre">${lights}<b>Notes for Monday.txt</b></div><div class="ma-page"><p>call the dentist before 12</p><p>pay the parking fine</p><p>back up the photos</p><p>send Sam the files</p><p>tidy the desktop (for real this time)</p></div>` },
};
const MESS = ['old', 'dl', 'pv', 'te'];   // the order they were opened in

function initTinko(host) {
  if (!document.querySelector('link[href*="Space+Mono"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Space+Mono&display=swap'; document.head.append(l);
  }
  let L = LAYOUT.mac, W = L.W, H = L.H;
  host.tabIndex = 0;
  host.setAttribute('aria-label', 'Tinko tidying a Mac: the open apps, the Dock, then the desktop. Space keeps, Delete quits, unpins or moves to the Bin, S skips.');
  const dapp = (id, cls = '') => `<div class="ms-dapp${cls}" data-app="${id}"><img src="${MAC(id)}" alt=""><i></i></div>`;
  host.innerHTML = `<div class="ms">
    <div class="ms-wall"></div>
    <div class="ms-bar"><span class="ms-apple">${SVGI.apple}</span><span class="ms-menu"></span>
      <i class="ms-gap"></i><span class="ms-extra is-star">${STAR}</span><span class="ms-extra">${SVGI.battery}</span><span class="ms-extra">${SVGI.wifi}</span><span class="ms-extra is-search">${SVGI.search}</span><span class="ms-extra">${SVGI.cc}</span><span class="ms-clock">Fri 16 Oct  10:24</span></div>
    <div class="ms-desk">${FILES.map(deskFile).join('')}${deskFile(SHOTS)}</div>
    <div class="ms-apps">${MESS.map(id => `<div class="ms-app is-${WINS[id].app} is-shut" data-win="${id}" style="width:${WINS[id].w}px;height:${WINS[id].h}px">${WINS[id].html()}</div>`).join('')}</div>
    <div class="ms-win is-off"><div class="tkw">
      <div class="tkw-grain" aria-hidden="true"></div>
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
    <div class="ms-dock">${dapp('finder', ' is-run')}${DOCK.map(a => dapp(a.id, a.run ? ' is-run' : '')).join('')}${EXTRA.map(([id]) => dapp(id, ' is-out')).join('')}<b class="ms-dsep"></b><div class="ms-dapp ms-trash"><img class="is-empty" src="${MAC('trash-empty')}" alt=""><img class="is-full" src="${MAC('trash-full')}" alt=""></div></div>
  </div>`;
  // under the screen: how far he is (a diamond where each part starts: what's open, the Dock, the desk, done) and start over
  const PARTS = [['What’s open', 0], ['What’s pinned', PACE.pinsAsk / PACE.end], ['Your desktop', PACE.scan / PACE.end], ['Done', PACE.empty / PACE.end]];
  const bar = document.createElement('div');
  bar.className = 'tk-prog';
  bar.innerHTML = `<div class="tk-line" role="progressbar" aria-label="How far Tinko is" aria-valuemin="0" aria-valuemax="100"><i class="tk-fill"></i>${PARTS.map(([t, f]) => `<span class="tk-dia" title="${t}" style="left:calc(6px + (100% - 12px) * ${f})">${DIAMOND}</span>`).join('')}</div><button class="tk-reset" type="button" title="Start over" aria-label="Start over">${SVGI.reset}</button>`;
  host.after(bar);
  const ms = host.querySelector('.ms'), screen = host.querySelector('.tkw-screen'), tinkoEl = host.querySelector('.tkw-tinko'), win = host.querySelector('.ms-win');
  const $ = s => host.querySelector(s), fileEl = id => host.querySelector(`.ms-file[data-id="${id}"]`), dockEl = id => host.querySelector(`.ms-dapp[data-app="${id}"]`), winEl = id => host.querySelector(`.ms-app[data-win="${id}"]`);
  let scale = 1;
  // a crop of a wide screen on a desktop, a tall one on a phone (the window keeps its size either way)
  const fit = () => {
    const next = host.clientWidth < 560 ? LAYOUT.phone : LAYOUT.mac;
    if (next !== L || !fit.done) {
      L = next; W = L.W; H = L.H; fit.done = true;
      Object.assign(ms.style, { width: W + 'px', height: H + 'px' });
      ms.classList.toggle('is-phone', L === LAYOUT.phone);
      placeWin(cornered ? L.corner : L.mid, false);
      MESS.forEach(id => Object.assign(winEl(id).style, { left: L.wins[id][0] + 'px', top: L.wins[id][1] + 'px' }));
      arrange(false);
      dockFit();
    }
    scale = host.clientWidth / W; ms.style.transform = `scale(${scale})`; host.style.height = (H * scale + host.offsetWidth - host.clientWidth) + 'px';
  };
  new ResizeObserver(fit).observe(host);   // (the first fit is at the end, once everything below exists)
  // a point on the scene (unscaled), e.g. the middle of a Dock icon
  const centre = el => { const r = el.getBoundingClientRect(), m = ms.getBoundingClientRect(); return { x: (r.left + r.width / 2 - m.left) / scale, y: (r.top + r.height / 2 - m.top) / scale }; };
  // Tinko's window: in the middle or in the corner, gliding there like Desk.glide
  let cornered = false;
  function placeWin([x, y], glide = true) {
    win.classList.toggle('is-glide', glide && !reduce);
    Object.assign(win.style, { left: x + 'px', top: y + 'px' });
  }
  // the app in front owns the menu bar
  function front(app) { const [name, ...items] = MENUS[app]; $('.ms-menu').innerHTML = `<b>${name}</b>${items.map(t => `<span>${t}</span>`).join('')}`; }

  /* his eyes, after Tinko.swift: blinks, and where he looks depends on what he's doing */
  const eyeL = $('.tkw-eye.is-l'), eyeR = $('.tkw-eye.is-r'), CELL = 6;
  const E = (x, y, w = 1, h = 2) => ({ x, y, w, h });
  let eyes = [E(-1.5, -.5), E(1.5, -.5)], blinking = false, mood = 'idle', moodTimer = 0;
  const place = (el, e, dur) => { el.style.transitionDuration = dur + 's'; Object.assign(el.style, { left: (7 + e.x - e.w / 2) * CELL + 'px', top: (5.5 + e.y - e.h / 2) * CELL + 'px', width: e.w * CELL + 'px', height: e.h * CELL + 'px' }); };
  const setEyes = (l, r, dur = .6) => { eyes = [l, r]; place(eyeL, l, dur); place(eyeR, r, dur); };
  const LOOKS = {
    side: [[.3, -.5, 1, 2, 3.3, -.5, 1, 2], [.4, -1.2, 1, 1.8, 3.4, -1.2, 1, 1.8], [.3, .4, 1, 1.8, 3.3, .4, 1, 1.8], [.5, 1, 1.1, 1.4, 3.5, 1, 1.1, 1.4]],
    down: [[-1.5, 1.6, 1, 1.5, 1.5, 1.6, 1, 1.5], [-2.7, 1.7, 1, 1.4, .3, 1.7, 1, 1.4], [-.3, 1.7, 1, 1.4, 2.7, 1.7, 1, 1.4], [-1.5, 1.9, 1.2, 1, 1.5, 1.9, 1.2, 1], [-3.3, 1.6, 1, 1.5, -.3, 1.6, 1, 1.5], [.3, 1.6, 1, 1.5, 3.3, 1.6, 1, 1.5]],
    working: [[-1.6, -1.4, 1, 2, 1.6, .6, 1, 2], [-1.3, -.5, 2, 2, 1.3, -.5, 2, 2], [-1.5, -.3, 2, .4, 1.5, -.3, 2, .4], [.4, 1.2, 1, 2, 3.4, 1.2, 1, 2], [-1.8, -.5, 2.2, 2.2, 1.9, -.3, .9, 1.4]],
    cheer: [[-1.5, -.7, 1.4, 2.2, 1.5, -.7, 1.4, 2.2]],
    idle: [[-1.5, -.5, 1, 2, 1.5, -.5, 1, 2]],
  };
  const look = n => { const set = LOOKS[mood], a = set[n % set.length]; setEyes(E(a[0], a[1], a[2], a[3]), E(a[4], a[5], a[6], a[7]), mood === 'working' ? .45 : .6); };
  function setMood(m) {
    if (m === mood) return;
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

  /* the screens (Views.swift Screen: tag, words, content, buttons, ⌘Z under them) */
  const roll = t => `<span class="tkw-roll">${[...t.toUpperCase()].map(c => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('')}</span>`;
  const btn = (act, title, key, light) => `<button class="tkw-btn${light ? ' is-light' : ''}" data-tk="${act}" type="button"><span class="tkw-key${key === 'del' ? ' is-del' : ''}">${key === 'del' ? DEL : key}</span>${roll(title)}</button>`;
  const stat = (n, label) => `<div class="tkw-stat"><b>${n}</b><span>${label}</span></div>`;
  const tag = t => `<div class="tkw-tag"><span>${t}</span></div>`;
  const words = t => `<div class="tkw-words">${t}</div>`;
  const undo = '<button class="tkw-undo" data-tk="undo" type="button">⌘Z  UNDO</button>';
  const list = n => n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : (n[0] || 'nothing');
  const PINS = DOCK.filter(a => a.when !== 'self');   // Tinko leaves himself out of the pass
  const running = id => dockEl(id).classList.contains('is-run');
  let state = 'mess', qfate = {}, qAt = 0, fate = {}, pinAt = 0, gone = new Set(), binned = new Set(), queue = [], lAt = 0, ticks = 0;
  function render(key, html) {
    const swap = screen.dataset.key !== key; screen.dataset.key = key;
    screen.innerHTML = html;
    if (swap && !reduce) { screen.classList.add('is-swap'); requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('is-swap'))); }
  }
  // the rows (QuitPass.swift OpenAppsRow, PinPass.swift PinsRow): the one that's up is full size with a dot, the
  // ones to come a little faded, kept ones faint, quit or unpinned ones shrink away
  const rowItem = (id, name, cls) => `<div class="tkw-pin ${cls}" title="${name}"><img src="${MAC(id)}" alt=""><i></i></div>`;
  const openRow = () => `<div class="tkw-pins is-open"><div class="tkw-pins-in">${OPEN.map((a, i) => rowItem(a.id, a.name, qfate[a.id] === 'quit' ? 'is-gone' : i === qAt ? 'is-now' : qfate[a.id] === 'kept' ? 'is-kept' : 'is-wait')).join('')}</div></div>`;
  const pinsRow = () => `<div class="tkw-pins"><div class="tkw-pins-in">${PINS.map((a, i) => rowItem(a.id, a.name, fate[a.id] === 'unpin' ? 'is-gone' : i === pinAt ? 'is-now' : fate[a.id] === 'kept' ? 'is-kept' : 'is-wait')).join('')}</div></div>`;
  // where the pins row sits so the current app is in the middle (worked out, not measured: the unpinned ones are still closing)
  function centrePins() {
    const inn = screen.querySelector('.tkw-pins:not(.is-open) .tkw-pins-in');
    if (!inn) return;
    const before = PINS.slice(0, pinAt).filter(a => fate[a.id] !== 'unpin').length;
    inn.style.transform = `translateX(${210 - (before * 36 + 14)}px)`;
  }
  function draw() {
    const files = FILES.filter(f => !gone.has(f.id));
    if (state === 'mess') render('mess', '');
    else if (state === 'quitAsk') render('quitAsk', tag('What’s open') + words('Now the apps that are on but don’t need to be. I’ll show them one by one; quit anything you’re not using today.') + `<div class="tkw-btns">${btn('space', 'Start', 'SPACE')}</div>`);
    else if (state === 'quit') {
      const a = OPEN[qAt];
      render('quit', tag('What’s open') + words(`${a.name}. ${a.pinned ? 'Pinned, so its icon stays either way.' : 'Not pinned: quit it and it leaves your Dock.'} Using it today?`) + openRow() + `<div class="tkw-btns">${btn('space', 'Keep', 'SPACE')}${btn('del', 'Quit', 'del', true)}</div>`);
    }
    else if (state === 'quitDone') {
      const q = OPEN.filter(a => qfate[a.id] === 'quit').length, k = OPEN.length - q;
      render('quitDone', tag('What’s open') + words(q ? `${q} ${q === 1 ? 'app' : 'apps'} quit${k ? `, ${k} still open` : ''}. Anywhere else, that’s ⌘Q: when you’re done with an app, not the red button.` : 'Everything stays. That’s fine: you know what you’re using today.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>`);
    }
    else if (state === 'pinsAsk') render('pinsAsk', tag('What’s pinned') + words('Now what stays in your Dock for good. Keep your daily drivers, unpin the rest. They’re still one ⌘Space away.') + `<div class="tkw-btns">${btn('space', 'Start', 'SPACE')}</div>`);
    else if (state === 'pin') {
      const a = PINS[pinAt], when = running(a.id) ? 'Open right now. Unpin it and it leaves the Dock once you quit it.' : `Last opened ${a.run ? 'today' : a.when}.`;
      render('pin', tag('What’s pinned') + words(`${a.name}. ${when} Daily driver?`) + pinsRow() + `<div class="tkw-btns">${btn('space', 'Keep', 'SPACE')}${btn('del', 'Unpin', 'del', true)}</div>`);
      centrePins();
    }
    else if (state === 'pinsDone') {
      const out = PINS.filter(a => fate[a.id] === 'unpin').length, stay = PINS.filter(a => fate[a.id] !== 'unpin').map(a => a.name);
      render('pinsDone', tag('What’s pinned') + words(out ? `${out} unpinned. Your Dock keeps ${list(stay)}. That’s the lot.` : 'Everything stays pinned. Your daily drivers, your call.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>` + (out ? undo : ''));
    }
    else if (state === 'dockDone') render('dockDone', tag('Your Dock') + words(`${PINS.some(a => fate[a.id] === 'unpin') ? 'Dock done. Lighter already.' : 'Dock done, as it was.'} I’ll stay in it myself until the course is through. Now the desktop.`) + `<div class="tkw-btns">${btn('space', 'On to the desktop', 'SPACE')}</div>`);
    else if (state === 'scan') render('scan', tag('Your desktop') + words('One moment…') + '<div class="tkw-progress"><i></i></div><div class="tkw-count">0 THINGS</div>');
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
      const f = queue[lAt];
      render('left-' + f.id, tag('What’s left') + words('Into Documents, to sort later? Or the Bin?')
        + `<div class="tkw-file"><div class="tkw-file-art">${fileArt(f)}</div><div><b>${f.name}</b><span>Here since today · ${lAt + 1} of ${queue.length}</span></div></div>`
        + `<div class="tkw-btns">${btn('space', 'Sort later', 'SPACE')}${btn('del', 'Bin', 'del', true)}</div>`);
    }
    else if (state === 'empty') render('empty', tag('Your desktop') + words('An empty desk. New screenshots go to their own folder now, so it stays that way.') + `<div class="tkw-btns">${btn('space', 'On to Documents', 'SPACE')}</div>`);
    else if (state === 'skipped') render('skipped', tag('Your desktop') + words('Your desktop stays as it is.') + `<div class="tkw-btns">${btn('space', 'Next', 'SPACE')}</div>`);
    progress();
  }
  // the bar under the screen: at each step it heads for the next step's start at the autoplay's pace, in a straight line,
  // so it fills at one speed; the steps within a step (the next app, the next file) leave it alone
  let paced = null;
  function progress() {
    const base = state === 'skipped' ? 'empty' : state;
    if (base === paced) return;
    paced = base;
    const fill = bar.querySelector('.tk-fill'), at = PACE[base];
    const set = (f, dur) => { fill.style.transition = dur ? `width ${dur.toFixed(2)}s linear` : 'none'; fill.style.width = `calc((100% - 12px) * ${f.toFixed(4)})`; };
    if (at === undefined) set(0);
    else {
      const next = PACE[PACE_ORDER[PACE_ORDER.indexOf(base) + 1]], from = at / PACE.end, to = next / PACE.end;
      const now = parseFloat(getComputedStyle(fill).width) / (bar.querySelector('.tk-line').clientWidth - 12) || 0;
      // a step that came sooner (or an undo) than the pace: catch up to where it starts, then on at the pace
      if (reduce || Math.abs(now - from) > .01) { set(from); fill.offsetWidth; }
      if (!reduce) set(to, next - at);
    }
    bar.querySelector('.tk-line').setAttribute('aria-valuenow', Math.round((at || 0) / PACE.end * 100));
    bar.querySelectorAll('.tk-dia').forEach((d, i) => d.classList.toggle('is-on', at !== undefined && at / PACE.end >= PARTS[i][1] - .001));
  }

  /* what happens on the screen */
  function fly(id, to, { scale: sc = .2, arc = 0, dur = 750 } = {}) {
    const el = fileEl(id);
    if (!el) return Promise.resolve();
    gone.add(id);
    const r = el.getBoundingClientRect(), m = ms.getBoundingClientRect();
    const from = { x: (r.left + r.width / 2 - m.left) / scale, y: (r.top + 30 - m.top) / scale };
    const dx = to.x - from.x, dy = to.y - from.y;
    if (reduce) { el.classList.add('is-gone'); if (sorted) arrange(); return Promise.resolve(); }
    const a = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .5}px,${dy * .5 - arc}px) scale(${(1 + sc) / 2})`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px,${dy}px) scale(${sc})`, opacity: 0 },
    ], { duration: dur, easing: EASE, fill: 'forwards' });
    return a.finished.then(() => { el.classList.add('is-gone'); a.cancel(); if (sorted) arrange(); });
  }
  const bump = el => { if (el && !reduce) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.33,1,.68,1)' }); };
  // an app opening: its Dock icon bounces (twice for a slow one) and gets its dot
  function launch(id, times = 1) {
    const d = dockEl(id); d.classList.remove('is-out'); d.classList.add('is-run');
    if (reduce) return Promise.resolve();
    const up = `translateY(-${(parseFloat(getComputedStyle(ms).getPropertyValue('--ds')) * .5).toFixed(1)}px)`, k = [];
    for (let i = 0; i < times; i++) k.push({ transform: 'none', easing: 'cubic-bezier(.33,1,.68,1)' }, { transform: up, easing: 'cubic-bezier(.32,0,.67,0)' });
    k.push({ transform: 'none' });
    return d.animate(k, { duration: 450 * times, delay: 100 }).finished;
  }
  const select = id => host.querySelectorAll('.ms-file').forEach(el => el.classList.toggle('is-sel', el.dataset.id === id));
  const trash = () => $('.ms-trash'), finder = () => dockEl('finder');
  function setTrash(full) { trash().classList.toggle('is-full', full); }
  // windows: opened (in front), brought forward, hidden (Cmd+H), or closed with their app
  let zTop = 1;
  function openWin(id) { const w = winEl(id); w.classList.remove('is-shut', 'is-hid'); w.style.zIndex = ++zTop; if (!reduce) w.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.33,1,.68,1)' }); }
  function raise(id) { const w = winEl(id); w.classList.remove('is-hid'); w.style.zIndex = ++zTop; }
  const hideWin = id => winEl(id).classList.add('is-hid');
  const shutWin = id => winEl(id).classList.add('is-shut');
  // the Dock: decided ones dim during the pass; at the end the unpinned ones leave together (the Dock restarts)
  function dockDim() { PINS.forEach(a => { const d = dockEl(a.id); if (d) d.classList.toggle('is-going', fate[a.id] === 'unpin'); }); }
  async function dockUnpin() {
    const out = PINS.filter(a => fate[a.id] === 'unpin');
    out.forEach((a, i) => { const d = dockEl(a.id); if (d) setTimeout(() => d.classList.add('is-out'), reduce ? 0 : i * 35); });
    await wait(reduce ? 0 : out.length * 35 + 250);
    dockFit();
    await wait(reduce ? 0 : 450);
  }
  function dockRestore() { PINS.forEach(a => dockEl(a.id).classList.remove('is-out', 'is-going')); dockFit(); }
  // like macOS: the icons keep their set size (44) unless the Dock would run off the screen, then they all shrink
  function dockFit() {
    const n = host.querySelectorAll('.ms-dapp:not(.is-out)').length;
    ms.style.setProperty('--ds', Math.min(44, Math.floor((W - 40 - 14) / (n * 1.06 + .24))) + 'px');
  }
  async function scan() {
    setMood('working'); select(null);
    const meter = screen.querySelector('.tkw-progress i'), count = screen.querySelector('.tkw-count');
    const order = [...FILES].sort((a, b) => L.scatter[a.id][1] - L.scatter[b.id][1] || L.scatter[b.id][0] - L.scatter[a.id][0]);
    for (let i = 0; i < order.length; i++) {
      const el = fileEl(order[i].id); if (el) { el.classList.add('is-seen'); setTimeout(() => el.classList.remove('is-seen'), 420); }
      if (meter) meter.style.width = ((i + 1) / order.length * 100) + '%';
      if (count) count.textContent = `${i + 1} ${i ? 'THINGS' : 'THING'}`;
      await wait(reduce ? 0 : 160);
    }
    await wait(reduce ? 0 : 300);
  }
  async function doFixes() {
    setMood('side');
    for (ticks = 0; ticks < 4; ticks++) {
      draw();
      if (ticks === 0) { fileEl('shots').classList.add('is-in'); }
      if (ticks === 1) {
        const into = centre(fileEl('shots').querySelector('.ms-art'));
        for (const id of ['s1', 's3', 's2', 's4']) { fly(id, into, { scale: .3, dur: 640 }); await wait(110); }
        await wait(560); bump(fileEl('shots'));
      }
      if (ticks === 3) { sorted = true; arrange(); await wait(reduce ? 0 : 250); }
      await wait(reduce ? 0 : 430);
    }
    ticks = 4; draw();
    await wait(reduce ? 0 : 400);
    // the Screenshots folder goes to Documents (into Finder)
    await fly('shots', centre(finder()), { scale: .25, dur: 720, arc: 40 }); bump(finder());
  }
  // where the icons sit: wherever they were dropped until the desk sorts itself (the last quick fix), then, like Finder's
  // Sort By Date Added, the ones left close up from the top right, newest first, every time one leaves
  let sorted = false;
  function arrange(animate = true) {
    ms.classList.toggle('is-sorting', animate && !reduce);
    const all = [SHOTS, ...FILES], live = all.filter(f => !gone.has(f.id) && (f !== SHOTS || fileEl('shots').classList.contains('is-in')));
    all.forEach(f => {
      const i = live.indexOf(f), [x, y] = sorted && i > -1 ? L.spot(L.slot(i)) : L.scatter[f.id];
      Object.assign(fileEl(f.id).style, { left: x - 50 + 'px', top: y + 'px' });
    });
  }
  function restore(ids) {
    ids.forEach(id => { gone.delete(id); binned.delete(id); const el = fileEl(id); if (el) { el.classList.remove('is-gone'); if (!reduce) el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, easing: EASE }); } });
    setTrash(binned.size > 0);
    if (sorted) arrange();
  }
  // back to the mess: everything as it was before Tinko opened
  function reset() {
    clearTimeout(autoT);
    gone = new Set(); binned = new Set(); ticks = 0; fate = {}; pinAt = 0; qfate = {}; qAt = 0; sorted = false; cornered = false;
    host.querySelectorAll('.ms-file').forEach(el => el.classList.remove('is-gone', 'is-sel', 'is-in'));
    arrange(false);
    setTrash(false); dockRestore();
    OPEN.forEach(a => dockEl(a.id).classList.toggle('is-run', a.pinned));
    EXTRA.forEach(([id]) => { dockEl(id).classList.add('is-out'); dockEl(id).classList.remove('is-run'); });
    dockEl('tinko').classList.remove('is-run');
    MESS.forEach(id => { winEl(id).classList.add('is-shut'); winEl(id).classList.remove('is-hid'); });
    win.classList.add('is-off'); placeWin(L.mid, false);
    dockFit(); front('finder');
    state = 'mess'; draw();
  }

  /* the flow: every action is the same whether the autoplay or you do it */
  let busy = false, manual = false, autoT = 0, started = false, visible = false, again = false;
  // before Tinko: the desk's files get opened one after another, then he opens and floats in the middle
  async function mess() {
    state = 'mess'; draw(); setMood('idle');
    await wait(reduce ? 0 : 350);
    for (const id of MESS) {
      const app = WINS[id].app;
      if (EXTRA.some(([e]) => e === app) && !running(app)) { launch(app); dockFit(); await wait(reduce ? 0 : 300); }
      openWin(id); front(app);
      await wait(reduce ? 0 : 400);
    }
    await wait(reduce ? 0 : 1000);
    await launch('tinko', 2);
    front('tinko'); win.classList.remove('is-off');
    if (!reduce) win.animate([{ opacity: 0, transform: `translate(${TKW * .03}px,${TKH * .03}px) scale(${TK * .94})` }, { opacity: 1, transform: `scale(${TK})` }], { duration: 300, easing: 'cubic-bezier(.33,1,.68,1)' });
    // and tucks what's open away behind him: the desk shows, each app comes back when it's up
    await wait(reduce ? 0 : 250);
    MESS.slice().reverse().forEach((id, i) => setTimeout(() => hideWin(id), reduce ? 0 : i * 70));
    await wait(reduce ? 0 : 450);
  }
  // he hides the rest and glides to the bottom left corner, out of the way of the desk (Desk.toDeskCorner)
  async function toCorner() {
    MESS.forEach(id => { if (!winEl(id).classList.contains('is-shut')) hideWin(id); });
    cornered = true; placeWin(L.corner);
    await wait(reduce ? 0 : 850);
  }
  async function go(next) {
    state = next; draw();
    // where he looks (Views.swift): down at the Dock through what's open and what's pinned
    if (['quitAsk', 'quit', 'quitDone', 'pinsAsk', 'pin', 'pinsDone'].includes(next)) setMood('down');
    if (next === 'quit') { const a = OPEN[qAt]; if (a.win && !winEl(a.win).classList.contains('is-shut')) raise(a.win); }
    if (next === 'dockDone') setMood('idle');
    if (next === 'scan') { await scan(); return go('desk'); }
    if (next === 'desk') setMood('side');
    if (next === 'fixes') { await doFixes(); return go('moved'); }
    if (next === 'leftover') { setMood('side'); select('dmg'); }
    if (next === 'left') { setMood('side'); select(queue[lAt].id); }
    if (next === 'empty') { setMood('cheer'); select(null); }
    if (next === 'skipped') setMood('idle');
    planAuto();
  }
  // a step holds the lock until it's done; a start-over asked for meanwhile happens right after
  async function step(fn) {
    if (busy) return;
    busy = true;
    try { await fn(); } finally { busy = false; }
    if (again) { again = false; reset(); step(async () => { await mess(); return go('quitAsk'); }); }
  }
  const act = key => step(async () => {
    const b = screen.querySelector(`[data-tk="${key}"]`);
    if (b) { b.classList.add('is-press'); setTimeout(() => b.classList.remove('is-press'), 260); }
    if (state === 'quitAsk') { if (key === 'space') { qAt = 0; return go('quit'); } }
    else if (state === 'quit') {
      if (key === 'space' || key === 'del') {
        const a = OPEN[qAt];
        if (key === 'space') { qfate[a.id] = 'kept'; if (a.win) hideWin(a.win); }
        else {
          // quit: its windows close, the dot goes, and an app that isn't pinned leaves the Dock; a beat to see it go
          qfate[a.id] = 'quit'; draw();
          if (a.win) shutWin(a.win);
          const d = dockEl(a.id); d.classList.remove('is-run'); if (!a.pinned) { d.classList.add('is-out'); setTimeout(dockFit, 200); }
          await wait(reduce ? 0 : 350);
        }
        qAt++;
        return go(qAt < OPEN.length ? 'quit' : 'quitDone');
      }
    }
    else if (state === 'quitDone') { if (key === 'space') return go('pinsAsk'); }
    else if (state === 'pinsAsk') { if (key === 'space') { pinAt = 0; return go('pin'); } }
    else if (state === 'pin') {
      if (key === 'space' || key === 'del') {
        fate[PINS[pinAt].id] = key === 'del' ? 'unpin' : 'kept'; dockDim();
        pinAt++;
        if (pinAt < PINS.length) return go('pin');
        state = 'pinsDone'; draw(); await dockUnpin();
        return go('pinsDone');
      }
    }
    else if (state === 'pinsDone') { if (key === 'space') return go('dockDone'); if (key === 'undo') { dockRestore(); fate = {}; pinAt = 0; return go('pinsAsk'); } }
    else if (state === 'dockDone') { if (key === 'space') { await toCorner(); return go('scan'); } }
    else if (state === 'desk') { if (key === 'space') return go('fixes'); if (key === 's') return go('skipped'); }
    else if (state === 'moved') { if (key === 'space') return go('leftover'); if (key === 'undo') { sorted = false; gone.delete('shots'); fileEl('shots').classList.remove('is-in', 'is-gone'); restore(['s1', 's2', 's3', 's4']); arrange(); return go('desk'); } }
    else if (state === 'leftover') {
      if (key === 'del') { select(null); setMood('down'); await fly('dmg', centre(trash()), { scale: .2, arc: 60, dur: 720 }); binned.add('dmg'); setTrash(true); bump(trash()); return go('binned'); }
      if (key === 'space') { select(null); return startLeft(); }
    }
    else if (state === 'binned') { if (key === 'space') return startLeft(); if (key === 'undo') { restore(['dmg']); return go('leftover'); } }
    else if (state === 'left') {
      const f = queue[lAt];
      if (key === 'space' || key === 'del') {
        select(null);
        if (key === 'del') { setMood('down'); await fly(f.id, centre(trash()), { scale: .2, arc: 60, dur: 680 }); binned.add(f.id); setTrash(true); bump(trash()); }
        else { await fly(f.id, centre(finder()), { scale: .25, arc: 40, dur: 680 }); bump(finder()); }
        lAt++;
        return go(lAt < queue.length ? 'left' : 'empty');
      }
    }
    else if (state === 'empty' || state === 'skipped') { if (key === 'space') { reset(); await mess(); return go('quitAsk'); } }
  });
  function startLeft() { queue = FILES.filter(f => !gone.has(f.id) && f.kind !== 'shot'); lAt = 0; return queue.length ? go('left') : go('empty'); }
  // what the autoplay presses, and after how long
  // (the Dock pass: slow for the first two, then a quick run once it's clear what's going on; a screen with a line: as
  // long as it takes to read; the empty desk a little longer, it's the end)
  function autoKey() {
    if (state === 'quit') { const a = OPEN[qAt]; return [a.keep ? 'space' : 'del', a.win ? 1300 : 650]; }
    if (state === 'pin') { const a = PINS[pinAt]; return [a.keep ? 'space' : 'del', pinAt === 0 ? 1100 : pinAt === 1 ? 750 : 320]; }
    const key = ({ leftover: 'del', empty: 'space' })[state] || 'space';
    if (!['quitAsk', 'quitDone', 'pinsAsk', 'pinsDone', 'dockDone', 'desk', 'moved', 'leftover', 'binned', 'left', 'empty', 'skipped'].includes(state)) return null;
    if (state === 'empty') return [key, 3400];
    if (state === 'left' && lAt > 0) return [key, 950];
    const n = ((screen.querySelector('.tkw-words') || {}).textContent || '').split(/\s+/).length;
    return [key, Math.min(2500, Math.max(1000, 800 + n * 62))];
  }
  function planAuto() {
    clearTimeout(autoT);
    const a = autoKey();
    if (!a || reduce || manual || !visible) return;
    autoT = setTimeout(() => act(a[0]), a[1]);
  }
  let idleT = 0;
  const takeOver = () => { manual = true; clearTimeout(autoT); clearTimeout(idleT); idleT = setTimeout(() => { manual = false; planAuto(); }, 9000); };
  screen.addEventListener('click', e => { const b = e.target.closest('[data-tk]'); if (b) { takeOver(); act(b.dataset.tk); host.focus({ preventScroll: true }); } });
  host.addEventListener('keydown', e => {
    const k = e.key === ' ' ? 'space' : (e.key === 'Backspace' || e.key === 'Delete') ? 'del' : e.key.toLowerCase() === 's' && !e.metaKey ? 's' : (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) ? 'undo' : null;
    if (k) { e.preventDefault(); takeOver(); act(k); }
  });
  // start over: back to the mess, the autoplay on again
  bar.querySelector('.tk-reset').addEventListener('click', () => {
    manual = false; clearTimeout(idleT);
    if (busy) { again = true; return; }
    reset(); step(async () => { await mess(); return go('quitAsk'); });
  });
  watch(host, on => { visible = on; if (on && !started) { started = true; step(async () => { await mess(); return go('quitAsk'); }); } else planAuto(); }, '0px 0px -20% 0px');
  tilt(host, 2.5, () => visible);
  fit();
  reset();
}

/* ---------------------------------------------------------
   Rhythms: the moment it keeps your hours
   --------------------------------------------------------- */
const CALM = 'https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/6ac7e64e4bdd7583341f6ea4_rhythms-calm-mountains.webp';

function initRhythms(host) {
  const layer = document.createElement('div');
  layer.className = 'rs-layer'; layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
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
  const typed = $('.rs-btyped'), title = $('.rs-btitle');
  let run = 0, visible = false, hovered = false;
  const set = (cls, on) => layer.classList.toggle(cls, on);
  const ping = () => {
    const card = [...host.querySelectorAll('.rhythms-app_card')].find(c => /Evenings/.test(c.textContent));
    if (card && !reduce) card.animate([{ boxShadow: '0 0 0 0 rgba(2,151,219,.0)' }, { boxShadow: '0 0 0 3px rgba(2,151,219,.55)' }, { boxShadow: '0 0 0 0 rgba(2,151,219,0)' }], { duration: 1400, easing: 'ease-out' });
  };
  function rest() {
    typed.textContent = ''; title.textContent = 'New Tab';
    ['is-on', 'is-toast', 'is-browser', 'is-loading', 'is-calm', 'is-typing'].forEach(c => set(c, false));
  }
  async function cycle() {
    const me = ++run, alive = () => me === run && visible && !hovered;
    rest(); await wait(1600); if (!alive()) return;
    set('is-on', true); ping(); await wait(900); if (!alive()) return;
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
  // the app's main screen: the list on its own (Settings and the editor open beside it on a click)
  const listOnly = () => { if (window.dfsRhythms && window.dfsRhythms.close) window.dfsRhythms.close(); };
  if (window.dfsRhythms && window.dfsRhythms.close) listOnly(); else window.addEventListener('dfs-rhythms-ready', listOnly, { once: true });
  tilt(host, 2.5, () => visible);
  if (reduce) { set('is-on', true); set('is-toast', true); }
}

/* ---------------------------------------------------------
   Who's behind it ([data-found], the section after this one): "Made By People Who Needed It First".
     [data-found-field]   the dive's dither comes back as a field under the page. The solutions slide off over it, the
                          way they came in over the mission (it moves at a third of the scroll while their bottom edge
                          crosses the screen; the side lines stop at that edge, see dive.js). Then it holds still
                          (sticky): the heading steps aside and a small box, like the dive's Continue box, opens up
                          into the founders film's player. Until the film is there, play says it's coming.
     [data-found-parked]  B and C, hidden for now (Rim may go over them with Thomas):
       B  the Fundamentals page's "Your Instructor" block, with a play button (main.js does the pixel reveal).
       C  [data-found-duo]  the two ends: they come in from the sides, the line between them draws.
   --------------------------------------------------------- */
const PAPER = 'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.81/+esm';   // the dive's Paper Shaders (already loaded)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// a dither field mounted in host, paused while it's off screen; pal() gives [back, front], read again when night flips
async function dither(host, uniforms, speed, pal) {
  let lib;
  try { lib = await import(PAPER); } catch (e) { console.warn('[found] shader did not load', e); return null; }
  const { ShaderMount, ditheringFragmentShader, getShaderColorFromString: col } = lib;
  const [back, front] = pal();
  let mount;
  try {
    mount = new ShaderMount(host, ditheringFragmentShader, {
      u_fit: 0, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0,
      u_colorBack: col(back), u_colorFront: col(front), u_type: 3, u_pxSize: 2, ...uniforms,
    }, undefined, 0, 0);
  } catch (e) { console.warn('[found] shader did not start', e); return null; }
  let seen = false;
  const go = () => mount.setSpeed(seen && !reduce ? speed : 0);
  watch(host, v => { seen = v; go(); }, '10% 0px');
  new MutationObserver(() => { const [b, f] = pal(); mount.setUniforms({ u_colorBack: col(b), u_colorFront: col(f) }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return { setSpeed: s => { speed = s; go(); }, set: u => mount.setUniforms(u) };
}

// the heading's words rise in (the dive's own word boxes)
function riseWords(node) {
  const text = node.textContent.trim(); node.setAttribute('aria-label', text);
  node.innerHTML = `<span class="dive-txt" aria-hidden="true">${text.split(/\s+/).map((w, i) => `<span class="dive-w"><span class="dive-wi" style="transition-delay:${reduce ? 0 : i * 70}ms">${w}</span></span>`).join(' ')}</span>`;
}

function initFounders(host) {
  const field = host.querySelector('[data-found-field]');
  if (field) {
    const sticky = field.querySelector('.found_field-sticky') || field;
    const shader = field.querySelector('[data-found-shader]'), box = field.querySelector('[data-found-box]');
    const rise = field.querySelector('[data-found-rise]'), sol = document.querySelector('[data-sol]');
    if (shader) dither(shader, { u_shape: 2, u_scale: .7 }, .35, () => isNight() ? ['#0e1628', '#46557c'] : ['#f1ede2', '#c2b9aa']);
    if (rise) riseWords(rise);
    // the box grows (so its glass edge and blur go along), from the small label to the player's size; --open is how far
    // it's open (the heading steps aside with it), --dark how far it's the player (early, so it reads as a screen coming)
    let full = null;
    const open = e => {
      sticky.style.setProperty('--open', e.toFixed(3));
      sticky.style.setProperty('--dark', smooth(.05, .45, e).toFixed(3));
      if (!box) return;
      if (!full) { box.style.width = box.style.height = ''; full = [box.offsetWidth, box.offsetHeight]; }
      const [W, H] = full, w0 = Math.min(W, 250), h0 = 52;
      box.style.width = (w0 + (W - w0) * e).toFixed(1) + 'px';
      box.style.height = (h0 + (H - h0) * e).toFixed(1) + 'px';
      box.style.borderRadius = (h0 / 2 - (h0 / 2 - 20) * e).toFixed(1) + 'px';   // a pill, rounding off into the player's 20px
      box.classList.toggle('is-open', e > .75);
    };
    if (reduce) { open(1); if (rise) rise.classList.add('dive-in'); }
    else {
      let on = false, raf = 0, lastE = -1, lastY = '';
      const frame = () => {
        raf = 0; if (!on) return;
        const vh = innerHeight, r = field.getBoundingClientRect();
        // the hand-over: while the solutions' bottom edge crosses the screen the field lags behind, at a third of the scroll
        const sb = sol ? Math.max(0, Math.min(vh, sol.getBoundingClientRect().bottom)) : 0;
        const ty = sb > 0 ? `translate3d(0,${(-.7 * sb).toFixed(1)}px,0)` : '';
        if (ty !== lastY) { lastY = ty; sticky.style.transform = ty; }
        if (rise) rise.classList.toggle('dive-in', sb < vh * .55);
        // then, while it holds still: a little in, the box starts opening; at 70% through it's the player
        const e = smooth(.08, .7, -r.top / Math.max(1, r.height - vh));
        if (Math.abs(e - lastE) > .0005) { lastE = e; open(e); }
        raf = requestAnimationFrame(frame);
      };
      // (until the first frame, as if the solutions were still covering it; the frame puts it where it really is)
      if (sol) sticky.style.transform = lastY = `translate3d(0,${(-.7 * innerHeight).toFixed(1)}px,0)`;
      open(0);
      watch(field, v => { on = v; if (on && !raf) raf = requestAnimationFrame(frame); });
      addEventListener('resize', () => { full = null; lastE = -1; lastY = ''; });
    }
  }

  // C: once, on the way in
  const duo = host.querySelector('[data-found-duo]');
  if (duo) {
    if (reduce) duo.classList.add('is-in');
    else {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { duo.classList.add('is-in'); io.disconnect(); } }, { threshold: .3 });
      io.observe(duo);
    }
  }

  // B's circles turn like on the Fundamentals page (Webflow wouldn't take the rotate360 attribute here)
  if (!reduce && window.gsap) host.querySelectorAll('.instructor_circle:not([rotate360])').forEach(el => !el.closest('[data-found-parked]') && gsap.to(el, { rotation: 360, repeat: -1, ease: 'none', duration: 40, transformOrigin: 'center center' }));

  // there's no film yet: play says so, for a moment
  host.querySelectorAll('[data-found-play]').forEach(b => {
    b.setAttribute('role', 'button'); if (!b.hasAttribute('href')) b.setAttribute('tabindex', '0');
    let t = 0;
    const soon = e => {
      e.preventDefault();
      b.classList.add('is-soon'); clearTimeout(t); t = setTimeout(() => b.classList.remove('is-soon'), 2400);
    };
    b.addEventListener('click', soon);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') soon(e); });
  });
}

/* ---------------------------------------------------------
   Journal ([data-journal]): "Updates & Insights", the latest three articles. There are no articles yet, so each
   card's cover ([data-journal-art]) is the dive's moving dither (Paper Shaders, fine 8x8 pattern), in its own shape
   and colours. It comes into focus from big pixels as it scrolls into view, runs slowly while it's on screen and
   picks up while you hover. When the articles come (CMS), a real image takes the cover's place.
   --------------------------------------------------------- */
const COVERS = {
  stack: { shape: 3, scale: .8, back: ['#16181d', '#16181d'], front: ['#e9e3d6', '#c9c3b6'] },   // dots: columns of busy little lights
  flow:  { shape: 4, scale: .7, back: ['#e3dccf', '#1b2236'], front: ['#0297db', '#1dabfa'] },   // a sine wave: the current you never chose
  sun:   { shape: 7, scale: .62, back: ['#0e1628', '#0e1628'], front: ['#7f90bb', '#8a9bc6'] },  // a sphere with the light going round it
};

function initJournal(host) {
  const REST = .25, HOVER = .9, FINE = 2, COARSE = 14;
  host.querySelectorAll('[data-journal-art]').forEach((cover, n) => {
    const c = COVERS[cover.dataset.journalArt];
    if (!c || cover.querySelector('img')) return;
    const pal = () => { const k = isNight() ? 1 : 0; return [c.back[k], c.front[k]]; };
    cover.style.backgroundColor = pal()[0];
    const card = cover.closest('[data-journal-card]') || cover;
    dither(cover, { u_shape: c.shape, u_scale: c.scale, u_type: 4, u_pxSize: reduce ? FINE : COARSE }, REST, pal).then(fx => {
      if (!fx) return;
      new MutationObserver(() => { cover.style.backgroundColor = pal()[0]; }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      if (reduce) return;
      // into focus: the pixels shrink to fine, one cover after the other
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now() + n * 120;
        const step = now => {
          const k = Math.min(1, Math.max(0, (now - t0) / 700)), e = 1 - Math.pow(1 - k, 3);
          fx.set({ u_pxSize: COARSE + (FINE - COARSE) * e });
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: .35 });
      io.observe(cover);
      card.addEventListener('pointerenter', () => fx.setSpeed(HOVER));
      card.addEventListener('pointerleave', () => fx.setSpeed(REST));
    });
  });
  // no articles yet: the placeholder links stay where they are
  host.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
}

/* ---------------------------------------------------------
   The close ([data-close]): the answer to the dive. The page opened on "The Only Question Is Whether You Chose
   Where."; here the dive's swirl comes back, restless, and settles as you scroll: it slows, turns from noise to an
   ordered pattern and pulls back, and a veil of calm opens behind the words. End frame: "Choose Where.", the two
   doors (the course, Rhythms) and, quieter, the newsletter. The journal slides off over it on the way in, the way
   the solutions slid off over the founders' field.
   --------------------------------------------------------- */
function initClose(host, above) {
  const sticky = host.querySelector('[data-close-sticky]'), pin = host.querySelector('[data-close-pin]') || host;
  const shader = host.querySelector('[data-close-shader]'), rise = host.querySelector('[data-close-rise]');
  const kicker = host.querySelector('[data-close-kicker]'), foot = document.querySelector('[data-foot]');
  let shade = null;
  if (foot && !reduce) { shade = document.createElement('div'); shade.className = 'close-shade'; shade.setAttribute('aria-hidden', 'true'); sticky.append(shade); }
  if (rise) riseWords(rise);
  if (kicker) riseWords(kicker);
  // the dive's own colours
  const pal = () => isNight() ? ['#0e1628', '#5f719c'] : ['#f1ede2', '#3d3a35'];
  let fx = null, lastSpd = -1, lastScale = -1, lastType = 0;
  if (shader) dither(shader, { u_shape: 6, u_scale: 1.5, u_type: 1, u_pxSize: 2 }, reduce ? 0 : 1.3, pal).then(f => { fx = f; if (reduce && fx) fx.set({ u_scale: .7, u_type: 4 }); });
  const settle = e => {
    sticky.style.setProperty('--settle', e.toFixed(3));
    host.classList.toggle('is-titled', e > .3);
    host.classList.toggle('is-open', e > .5);
    if (rise) rise.classList.toggle('dive-in', e > .3);
    if (!fx) return;
    const spd = +(1.3 - 1.22 * e).toFixed(2), scale = +(1.5 - .8 * e).toFixed(3), type = e > .4 ? 4 : 1;
    if (spd !== lastSpd) { lastSpd = spd; fx.setSpeed(spd); }
    if (scale !== lastScale || type !== lastType) { lastScale = scale; lastType = type; fx.set({ u_scale: scale, u_type: type }); }
  };
  if (reduce) { settle(1); if (kicker) kicker.classList.add('dive-in'); return; }
  let on = false, raf = 0, lastY = '', lastE = -1;
  const frame = () => {
    raf = 0; if (!on) return;
    const vh = innerHeight, r = pin.getBoundingClientRect();
    // the hand-over: while the journal's bottom edge crosses the screen this lags behind, at a third of the scroll
    const ab = above ? Math.max(0, Math.min(vh, above.getBoundingClientRect().bottom)) : 0;
    // and at the end the footer slides up over it: it stays behind at a third of the scroll, a little dimmer
    const fo = foot ? Math.max(0, Math.min(vh, vh - foot.getBoundingClientRect().top)) : 0;
    const ty = ab > 0 ? `translate3d(0,${(-.7 * ab).toFixed(1)}px,0)` : fo > 0 ? `translate3d(0,${(.67 * fo).toFixed(1)}px,0)` : '';
    if (ty !== lastY) { lastY = ty; sticky.style.transform = ty; }
    if (shade) shade.style.opacity = (fo / vh * .28).toFixed(3);
    // (the question comes in as the journal's last edge goes, the answer as it settles)
    if (kicker) kicker.classList.toggle('dive-in', ab < vh * .25);
    // then, while it holds still, it settles: done at 75% through
    const e = smooth(0, .75, -r.top / Math.max(1, r.height - vh));
    if (Math.abs(e - lastE) > .002) { lastE = e; settle(e); }
    raf = requestAnimationFrame(frame);
  };
  if (above) sticky.style.transform = lastY = `translate3d(0,${(-.7 * innerHeight).toFixed(1)}px,0)`;
  settle(0);
  watch(host, v => { on = v; if (on && !raf) raf = requestAnimationFrame(frame); });
  addEventListener('resize', () => { lastY = ''; lastE = -1; });
}

/* ---------------------------------------------------------
   The footer ([data-foot]): the ground comes up. It slides up over the close (which stays behind, see initClose)
   and over the bottom nav; the course page's mountains rise a little slower than the text. Then the site's lines
   come back, drawn in: the side lines and the dashed ones between the columns down from the top edge, the dashed
   one across from the left; then the columns, left to right; a beat later the row under them (the socials and Log
   in), whose lines run out to the page edge. Log in knows if you're signed in (My courses) and fills like a load.
   Its look is on the Webflow classes (foot_*); the dashes and the motion are here.
   --------------------------------------------------------- */
function initFooter(host) {
  const ground = host.querySelector('[data-foot-ground]'), frameEl = host.querySelector('[data-foot-frame]');
  const lines = [...host.querySelectorAll('[data-foot-line]')], hline = host.querySelector('[data-foot-hline]');
  const cols = [...host.querySelectorAll('[data-foot-col]')];
  const cells = [...host.querySelectorAll('[data-foot-cell]')].map(c => ({
    lines: [...c.querySelectorAll('[data-foot-cline]')], inner: c.querySelector('[data-foot-in]'), fromRight: c.dataset.footCell === 'left' }));
  const nav = document.querySelector('[data-bottom-nav-init]');

  // the links that go somewhere on this page, and the ones that have nowhere to go yet
  host.querySelectorAll('[data-foot-to]').forEach(a => a.addEventListener('click', e => {
    const to = document.querySelector(a.dataset.footTo); if (!to) return;
    e.preventDefault();
    const y = to.getBoundingClientRect().top + scrollY - innerHeight * .12;
    window.lenis ? window.lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }));
  host.querySelectorAll('[data-foot-soon]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // Log in, or My courses when you're signed in (Memberstack if it's on the page, otherwise its token)
  const login = host.querySelector('[data-foot-login]'), loginText = host.querySelector('[data-foot-login-text]');
  if (login) {
    const signedIn = () => {
      try { if (localStorage.getItem('_ms-mid')) return true; } catch (e) {}
      return /(?:^|;\s*)_ms-mid=/.test(document.cookie);
    };
    const mark = yes => { if (!yes) return; login.setAttribute('href', '/dashboard'); if (loginText) loginText.textContent = 'My courses'; };
    mark(signedIn());
    if (window.$memberstackDom) window.$memberstackDom.getCurrentMember().then(r => mark(!!(r && r.data))).catch(() => {});
    login.addEventListener('click', e => {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      login.classList.add('is-loading');
      setTimeout(() => { location.href = login.getAttribute('href'); }, 650);
    });
    addEventListener('pageshow', () => login.classList.remove('is-loading'));
  }

  const cut = k => ((1 - k) * 100).toFixed(2) + '%';
  const draw = p => {
    if (ground) ground.style.transform = `translate3d(0,${((1 - p) * 16).toFixed(2)}vh,0)`;
    lines.forEach((l, i) => { l.style.clipPath = `inset(0 0 ${cut(smooth(.35 + i * .03, .85 + i * .03, p))} 0)`; });
    if (hline) hline.style.clipPath = `inset(0 ${cut(smooth(.35, .85, p))} 0 0)`;
    cols.forEach((c, i) => {
      const k = smooth(.6 + i * .05, Math.min(.98, .88 + i * .02), p);
      c.style.opacity = k.toFixed(3); c.style.transform = `translate3d(0,${((1 - k) * 14).toFixed(1)}px,0)`;
    });
    cells.forEach((c, i) => {
      c.lines.forEach((l, j) => {
        const k = smooth(.66 + i * .04 + j * .03, .9 + i * .03 + j * .02, p);
        l.style.clipPath = c.fromRight ? `inset(0 0 0 ${cut(k)})` : `inset(0 ${cut(k)} 0 0)`;
      });
      if (c.inner) { const f = smooth(.8 + i * .03, .97 + i * .01, p); c.inner.style.opacity = f.toFixed(3); c.inner.style.transform = `translate3d(0,${((1 - f) * 10).toFixed(1)}px,0)`; }
    });
  };
  // on phones the dashed lines between the columns start under the brand row
  const size = () => {
    const b = cols[0] && frameEl ? cols[0].getBoundingClientRect().bottom - frameEl.getBoundingClientRect().top + 18 : 0;
    if (frameEl) frameEl.style.setProperty('--b', Math.max(0, b).toFixed(0) + 'px');
  };
  size(); addEventListener('resize', size);
  if (reduce) { draw(1); return; }

  let on = false, raf = 0, last = -1, lastNav = '';
  const frame = () => {
    raf = 0; if (!on) return;
    const vh = innerHeight, top = host.getBoundingClientRect().top;
    const p = Math.max(0, Math.min(vh, vh - top)) / vh;
    if (Math.abs(p - last) > .0005) { last = p; draw(p); }
    // the bottom nav goes behind the footer: cut away whatever the footer covers
    if (nav) {
      const nb = nav.getBoundingClientRect().bottom, c = Math.max(0, nb - top);
      const clip = c > 0 ? `inset(0 0 ${c.toFixed(1)}px 0)` : '';
      if (clip !== lastNav) { lastNav = clip; nav.style.clipPath = clip; }
    }
    raf = requestAnimationFrame(frame);
  };
  draw(0);
  watch(host, v => {
    on = v; if (on && !raf) raf = requestAnimationFrame(frame);
    if (!v && nav && lastNav) { lastNav = ''; nav.style.clipPath = ''; }
  });
  addEventListener('resize', () => { last = -1; });
}

/* ---------------------------------------------------------
   styles
   --------------------------------------------------------- */
function injectSolCSS() {
  if (document.getElementById('dive-sol-css')) return;
  const s = document.createElement('style'); s.id = 'dive-sol-css';
  s.textContent = `
/* (the look of the solutions' text columns, lists, dividers and demo cells is on their Webflow classes and combos:
   sol_top, sol_chips, sol_card-title, sol_link, list_offer/offer_item/icon_diamond/context_item + is-quiet,
   divider_vertical is-sol, split_section is-sol-demo / is-sol-meta is-first, grid-background is-full is-demo) */
[data-sol] .icon_diamond.is-quiet svg{width:10px;height:10px}
/* the course player: the course's own classes; only the layout of this little copy and the player states
   (on the course they come with its page code) are set here */
[data-course-demo]{position:relative;width:100%;overflow:hidden;border:1px solid var(--brand-colors--dark-bage,#dfd5c9);border-radius:4px;background:var(--brand-colors--light-bage,#fbf7ee);box-shadow:rgba(61,58,53,.08) 0 0 0 1px,rgba(61,58,53,.42) 0 40px 80px -30px;transform-style:preserve-3d;will-change:transform;-webkit-user-select:none;user-select:none}
.dfs-night [data-course-demo]{box-shadow:rgba(0,0,0,.2) 0 0 0 1px,rgba(0,0,0,.55) 0 40px 80px -30px}
[data-course-demo] .next_lesson_container{position:relative}
[data-course-demo] .lesson-complete_overlay{display:flex;align-items:center;justify-content:center;text-decoration:none;opacity:0;visibility:hidden;transition:opacity .7s ease,visibility .7s ease}
[data-course-demo] .lesson-complete_overlay.is-on{opacity:1;visibility:visible}
[data-course-demo] .bunny-player__toggle-mute{cursor:default}
[data-course-demo] .cpr{position:absolute;left:0;top:0;width:1000px;display:grid;grid-template-columns:690px 310px;transform-origin:0 0}
[data-course-demo] .cpr-left{min-width:0}
[data-course-demo] .cpr-right{position:relative;min-width:0;overflow:hidden;border-left:1px dashed var(--brand-colors--dark-bage,#dfd5c9)}
[data-course-demo] .cpr-right .accordion-css{position:absolute;left:0;right:0;top:92px;bottom:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
[data-course-demo] .cpr-right .accordion-css::-webkit-scrollbar{display:none}
[data-course-demo] .cpr-right .accordion-css__item{border-left:0}
[data-course-demo] .cpr-title{height:92px;padding:18px 18px 0;box-sizing:border-box}
[data-course-demo] .cpr-title .course_progrpess_wrap{width:100%}
[data-course-demo] .cpr-title .course_prog_title{justify-content:flex-start}
[data-course-demo] .cpr-title .logo_icon{width:28px;height:28px;flex:none}
[data-course-demo] .cpr-title .logo_icon svg{width:100%;height:100%;display:block}
[data-course-demo] .cpr-title .course_h1{font-family:var(--_typography---font-styles--heading,serif);font-size:28px;line-height:28px;font-weight:400;margin:0}
[data-course-demo] .cpr-pct{font-family:var(--_typography---font-styles--heading,serif);font-size:28px;line-height:28px}
[data-course-demo] .cpr-title .progression_bar{width:100%;overflow:hidden;margin-top:9px}
[data-course-demo] .progress_juice{width:0;height:100%;border-radius:4px;background:radial-gradient(circle farthest-corner at 50% 50%,#0297db,#3fc3ff);transition:width .8s ${EASE}}
[data-course-demo] .c_item:not([data-l="0.1"]):not([data-l="0.2"]){cursor:default}
[data-course-demo] .c_item[data-l="0.1"],[data-course-demo] .c_item[data-l="0.2"]{cursor:pointer}
[data-course-demo] .course_module{cursor:pointer}
[data-course-demo] .course_navigation_bar .cnb_option{border:0;cursor:pointer}
[data-course-demo].is-phone .cpr{width:690px;grid-template-columns:690px}
[data-course-demo].is-phone .cpr-right{display:none}
[data-course-demo] .bunny-player{overflow:hidden;cursor:pointer}
[data-course-demo] .bunny-player__video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
[data-course-demo] .bunny-player__placeholder{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
[data-course-demo] :is(.bunny-player__placeholder,.bunny-player__dark,.bunny-player__playpause,.bunny-player__loading){transition:opacity .3s linear,visibility .3s linear}
[data-course-demo] [data-player-activated="true"] .bunny-player__placeholder{opacity:0;visibility:hidden}
[data-course-demo] .bunny-player__dark{opacity:0}
[data-course-demo] [data-player-status="paused"] .bunny-player__dark,[data-course-demo] [data-player-status="playing"][data-player-hover="active"] .bunny-player__dark{opacity:.3}
[data-course-demo] [data-player-status="playing"] .bunny-player__playpause,[data-course-demo] [data-player-status="loading"] .bunny-player__playpause{opacity:0}
[data-course-demo] [data-player-status="playing"][data-player-hover="active"] .bunny-player__playpause{opacity:1}
[data-course-demo] .bunny-player__pause-svg{display:none}
[data-course-demo] :is([data-player-status="playing"],[data-player-status="loading"]) .bunny-player__play-svg{display:none}
[data-course-demo] :is([data-player-status="playing"],[data-player-status="loading"]) .bunny-player__pause-svg{display:block}
[data-course-demo] .bunny-player__loading{opacity:0;visibility:hidden}
[data-course-demo] [data-player-status="loading"] .bunny-player__loading{opacity:1;visibility:visible}
[data-course-demo] .bunny-player__interface{transition:all .6s ${EASE}}
[data-course-demo] :is([data-player-status="playing"],[data-player-status="loading"]) .bunny-player__interface{opacity:0;transform:translateY(1em) rotate(.001deg)}
[data-course-demo] :is([data-player-status="playing"],[data-player-status="loading"])[data-player-hover="active"] .bunny-player__interface{opacity:1;transform:none}
[data-course-demo] .bunny-player__timeline-progress,[data-course-demo] .bunny-player__timeline-buffered{transform:translateX(-100%)}
[data-course-demo] .bunny-player__volume-mute-svg,[data-course-demo] .bunny-player__fullscreen-shrink-svg{display:none}
[data-course-demo] [data-player-muted="true"] .bunny-player__volume-mute-svg,[data-course-demo] [data-player-fullscreen="true"] .bunny-player__fullscreen-shrink-svg{display:block}
[data-course-demo] [data-player-muted="true"] .bunny-player__volume-up-svg,[data-course-demo] [data-player-fullscreen="true"] .bunny-player__fullscreen-scale-svg{display:none}
[data-course-demo] [data-player-fullscreen="true"] .bunny-player__video{left:0;top:0;width:100%;height:100%;object-fit:contain}
.dfs-night [data-course-demo]{background:var(--brand-colors--light-bage);border-color:var(--brand-colors--dark-bage)}

/* Tinko on a Mac: a 1000 x 650 crop of a screen, framed like the course player */
[data-tinko-demo]{position:relative;width:100%;aspect-ratio:1000/650;overflow:hidden;outline:none;border:1px solid var(--brand-colors--dark-bage,#dfd5c9);border-radius:4px;background:#e9e4da;box-shadow:rgba(61,58,53,.08) 0 0 0 1px,rgba(61,58,53,.42) 0 40px 80px -30px;transform-style:preserve-3d;will-change:transform;-webkit-user-select:none;user-select:none}
.dfs-night [data-tinko-demo]{background:#141b2c;box-shadow:rgba(0,0,0,.2) 0 0 0 1px,rgba(0,0,0,.55) 0 40px 80px -30px}
[data-tinko-demo]:focus-visible{box-shadow:0 0 0 2px var(--brand-colors--blue,#0297db)}
.ms{--ds:44px;position:absolute;left:0;top:0;width:1000px;height:650px;transform-origin:0 0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#1d1d1f}
.ms-wall{position:absolute;inset:0;background:url(${new URL('./media/mac/wall-day.webp', import.meta.url).href}) 30% 100%/cover no-repeat}
.dfs-night .ms-wall{background-image:linear-gradient(rgba(12,18,34,.28),rgba(12,18,34,.28)),url(${new URL('../night/HERO_BG_4-night.webp', import.meta.url).href})}
/* the menu bar (macOS 26: no bar, the wallpaper shows through) */
.ms-bar{position:absolute;left:0;right:0;top:0;height:24px;display:flex;align-items:center;gap:18px;padding:0 14px 0 16px;font-size:13px;line-height:1;letter-spacing:-.08px;z-index:5;color:rgba(0,0,0,.85)}
.ms-bar b{font-weight:700}
.ms-apple{width:14px;height:17px;margin-right:2px}.ms-apple svg{width:14px;height:17px;display:block;margin-top:-2px}
.ms-gap{flex:1}
.ms-extra{display:grid;place-items:center;height:24px;margin-left:-4px}.ms-extra svg{height:13px;width:auto;display:block}
.ms-extra.is-star svg{height:14px}.ms-extra.is-search svg{height:13px}
.ms-menu{display:contents}
.ms.is-phone .ms-bar{gap:15px}.ms.is-phone .ms-extra.is-search,.ms.is-phone .ms-menu span:last-child{display:none}
.ms-clock{margin-left:-2px;white-space:pre;font-variant-numeric:tabular-nums}
.dfs-night .ms-bar{color:rgba(255,255,255,.92)}
/* desktop icons */
.ms-desk{position:absolute;inset:0;z-index:1}
.ms-file{position:absolute;width:100px;display:grid;justify-items:center;gap:3px;text-align:center}
.ms-art{width:64px;height:64px;display:grid;place-items:center;border-radius:5px}
.ms-ficon{width:64px;height:64px;display:block}
.ms-thumb{width:62px;height:39px;object-fit:cover;display:block;border-radius:2px;box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.25)}
.ms-file span{padding:1px 4px;border-radius:4px;font-size:12px;line-height:15px;color:rgba(0,0,0,.86);white-space:nowrap}
.dfs-night .ms-file span{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6),0 0 1px rgba(0,0,0,.5)}
.ms-file.is-sel .ms-art{background:rgba(0,0,0,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.ms-file.is-sel span,.dfs-night .ms-file.is-sel span{background:#0a6cff;color:#fff;text-shadow:none}
.ms-file.is-seen .ms-art{box-shadow:0 0 0 2px rgba(63,195,255,.7),0 0 18px rgba(63,195,255,.55)}
.ms-file.is-gone{visibility:hidden}
.ms-file.is-shots{opacity:0;transform:scale(.6);transition:opacity .4s,transform .5s ${EASE}}
.ms-file.is-shots.is-in{opacity:1;transform:none}
.ms-file.is-shots.is-gone{transition:none}
.ms.is-sorting .ms-file{transition:left .6s ${EASE},top .6s ${EASE},opacity .4s,transform .5s ${EASE}}
/* the Dock (macOS 26 glass) */
/* the Dock, measured on a real macOS 26 one: corners about a fifth of its height, even padding all round */
.ms-dock{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);display:flex;align-items:center;padding:calc(var(--ds) * .145) calc(var(--ds) * .12);border-radius:calc(var(--ds) * .27);background:rgba(255,255,255,.26);-webkit-backdrop-filter:blur(18px) saturate(1.7);backdrop-filter:blur(18px) saturate(1.7);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),inset 0 1px 1px rgba(255,255,255,.65),inset 0 -1px 1px rgba(255,255,255,.2),0 10px 30px rgba(0,0,0,.14),0 0 0 .5px rgba(0,0,0,.12);z-index:4;transition:border-radius .5s ${EASE},padding .5s ${EASE}}
.dfs-night .ms-dock{background:rgba(40,46,64,.35);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),inset 0 1px 1px rgba(255,255,255,.25),0 10px 30px rgba(0,0,0,.35),0 0 0 .5px rgba(0,0,0,.4)}
.ms-dapp{position:relative;width:var(--ds);height:var(--ds);margin:0 calc(var(--ds) * .03);flex:none;transition:width .5s ${EASE},height .5s ${EASE},margin .45s ${EASE},opacity .35s,transform .45s ${EASE}}
.ms-dapp img{width:100%;height:100%;display:block}
.ms-dapp i{position:absolute;left:50%;bottom:calc(var(--ds) * -.08 - 1.5px);width:3px;height:3px;margin-left:-1.5px;border-radius:50%;background:rgba(0,0,0,.6);opacity:0}
.ms-dapp.is-run i{opacity:1}
.dfs-night .ms-dapp i{background:rgba(255,255,255,.8)}
.ms-dapp.is-going{opacity:.38}
.ms-dapp.is-out{width:0;margin:0;opacity:0;transform:scale(.2)}
.ms-dsep{width:1px;height:calc(var(--ds) * .9);margin:0 6px;transition:height .5s ${EASE};align-self:center;background:rgba(0,0,0,.18)}
.dfs-night .ms-dsep{background:rgba(255,255,255,.22)}
.ms-trash img{position:absolute;inset:0;transition:opacity .3s}.ms-trash .is-full,.ms-trash.is-full .is-empty{opacity:0}.ms-trash.is-full .is-full{opacity:1}
/* Tinko's window (614 x 540, drawn a little smaller), floating above the other windows; it glides to the corner */
.ms-win.is-off{opacity:0;visibility:hidden}
.ms-win.is-glide{transition:left .8s ${EASE},top .8s ${EASE},opacity .3s}
/* the open windows of the mess (macOS 26, light and dark) */
.ms-apps{position:absolute;inset:0;z-index:2;pointer-events:none}
.ms-app{--w-bg:#fff;--w-chrome:#f5f4f2;--w-side:#ecebe8;--w-ink:#1d1d1f;--w-soft:#86868b;--w-line:rgba(0,0,0,.09);--w-row:#f4f4f6;position:absolute;display:flex;overflow:hidden;border-radius:14px;background:var(--w-bg);color:var(--w-ink);font-size:11px;line-height:1.3;box-shadow:0 0 0 .5px rgba(0,0,0,.24),0 18px 44px rgba(0,0,0,.2),0 4px 10px rgba(0,0,0,.08);transition:opacity .25s,transform .25s cubic-bezier(.33,1,.68,1)}
.dfs-night .ms-app{--w-bg:#1f1f21;--w-chrome:#2b2b2d;--w-side:#29292b;--w-ink:#f2f2f4;--w-soft:#98989d;--w-line:rgba(255,255,255,.09);--w-row:#262628;box-shadow:0 0 0 .5px rgba(0,0,0,.6),inset 0 0 0 .5px rgba(255,255,255,.12),0 18px 44px rgba(0,0,0,.45)}
.ms-app.is-shut{opacity:0;transform:scale(.94);visibility:hidden;transition:opacity .2s,transform .2s,visibility 0s .2s}
.ms-app.is-hid{opacity:0;visibility:hidden;transition:opacity .25s,visibility 0s .25s}
.ma-lights{display:flex;gap:7px}.ma-lights i{width:11px;height:11px;border-radius:50%;background:#ff5f57;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}.ma-lights i:nth-child(2){background:#febc2e}.ma-lights i:nth-child(3){background:#28c840}
.ma-bar{position:absolute;left:0;right:0;top:0;height:36px;display:flex;align-items:center;gap:12px;padding:0 12px 0 14px;background:var(--w-chrome);border-bottom:1px solid var(--w-line);z-index:1}
.ma-bar b{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ma-bar.is-centre b{position:absolute;left:0;right:0;text-align:center;pointer-events:none}
.ma-gap{flex:1}.ma-tools{display:flex;gap:12px;color:var(--w-soft)}.ma-tools svg,.ma-nav svg,.ma-side svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.ma-img{position:absolute;left:0;right:0;top:37px;bottom:0;background:var(--w-chrome)}.ma-img img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.ma-page{position:absolute;left:0;right:0;top:37px;bottom:0;padding:12px 16px;font:12.5px/1.55 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif}.ma-page p{margin:0;font:inherit;color:inherit}
.ma-side{width:128px;flex:none;margin:6px 0 6px 6px;padding:10px 8px;border-radius:10px;background:var(--w-side);box-shadow:inset 0 0 0 .5px var(--w-line)}
.ma-side .ma-lights{margin:0 0 12px 4px}.ma-side p{margin:0 0 4px 6px;font-size:10px;font-weight:600;color:var(--w-soft)}
.ma-side span{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:6px;font-size:11px}.ma-side span svg{color:#0a84ff;flex:none}
.ma-side span.is-on{background:color-mix(in srgb,var(--w-ink) 9%,transparent)}
.ma-main{flex:1;min-width:0;display:flex;flex-direction:column}
.ma-tool{height:38px;flex:none;display:flex;align-items:center;gap:10px;padding:0 12px}.ma-tool b{font-size:12.5px;font-weight:600}
.ma-nav{display:flex;gap:6px;color:var(--w-soft)}
.ma-icons{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 4px;padding:10px 10px 0;align-content:start}
.ms-app figure,.ms-app p{font-family:inherit;letter-spacing:normal;text-transform:none}
.ma-icons figure{margin:0;display:grid;justify-items:center;gap:3px;text-align:center}.ma-icons img{width:44px;height:44px;display:block}.ma-icons span{font-size:10.5px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ma-list{padding:0 8px;font-size:10.5px}
.ma-head,.ma-row{display:grid;grid-template-columns:1.6fr 1.3fr .6fr;gap:8px;align-items:center;height:21px;padding:0 6px;border-radius:5px}
.ma-head{color:var(--w-soft);font-weight:500;border-bottom:1px solid var(--w-line);border-radius:0;margin-bottom:2px}
.ma-row:nth-child(odd){background:var(--w-row)}.ma-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ma-row span:first-child{display:flex;align-items:center;gap:5px}.ma-row img{width:16px;height:16px;flex:none}
.ma-row span:not(:first-child),.ma-head span:not(:first-child){color:var(--w-soft)}
/* the open apps row in Tinko's window: all of them fit, centred */
.tkw-pins.is-open{-webkit-mask-image:none;mask-image:none}.tkw-pins.is-open .tkw-pins-in{justify-content:center}
/* Tinko's window, at its real size (614 x 540) */
.ms-win{position:absolute;left:236px;top:74px;width:614px;height:540px;z-index:3;transform:scale(${TK});transform-origin:0 0;transition:opacity .3s;border-radius:12px;box-shadow:0 0 0 .5px rgba(0,0,0,.22),0 22px 50px rgba(0,0,0,.24),0 6px 14px rgba(0,0,0,.08)}
.ms-win .tkw{border-radius:12px;overflow:hidden}
/* Tinko's window (after the app: Views.swift, Theme.swift, Surface.swift) */
.tkw{--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;position:absolute;left:0;top:0;width:614px;height:540px;background:var(--c-card);color:var(--c-ink);font-family:"Space Mono",monospace;font-size:12px;-webkit-font-smoothing:antialiased}
.dfs-night .tkw{--c-card:#292724;--c-ink:#fbf7ef;--c-soft:#b3aca2;--c-line:#3d3a36;--c-calm:#1dabfa;--c-calmsoft:#173241}
.tkw-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
.dfs-night .tkw-grain{mix-blend-mode:screen;opacity:.05}
.tkw-lights{position:absolute;left:9px;top:8px;display:flex;gap:8px;z-index:1}
.tkw-lights i{width:12px;height:12px;border-radius:50%;background:#ff5f57;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}.tkw-lights i:nth-child(2){background:#febc2e}.tkw-lights i:nth-child(3){background:#28c840}
.tkw-dash{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px}
.tkw-col{position:absolute;left:28px;width:558px;top:28px;bottom:28px;border-inline:1px solid var(--c-line);background-image:linear-gradient(color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--c-ink) 5%,transparent) 1px,transparent 1px);background-size:32px 32px;background-position:-.5px -.5px}
.tkw-tools{position:absolute;right:16px;top:14px;display:flex;gap:8px;z-index:1}
.tkw-tools span{width:38px;height:38px;box-sizing:border-box;display:grid;place-items:center;border:1px solid var(--c-line);border-radius:4px;background:var(--c-card)}
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
.tkw-words{font-size:13px;line-height:23px;max-width:380px;margin-bottom:24px}
.tkw-btns{display:flex;gap:10px;justify-content:center}
.tkw-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:38px;box-sizing:border-box;padding:10px 16px;border-radius:4px;font-size:12px;letter-spacing:.6px;text-transform:uppercase;background:var(--c-ink);color:var(--c-card);transition:background .6s ${EASE},transform .2s}
.tkw-btn.is-light{background:var(--c-card);color:var(--c-ink);box-shadow:inset 0 0 0 1px var(--c-line)}
.tkw-btn.is-light:hover{box-shadow:inset 0 0 0 2px var(--c-line)}
.tkw-btn.is-press{transform:scale(.96)}
.tkw-key{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;box-sizing:border-box;border-radius:3px;box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 50%,transparent);font-size:10px;letter-spacing:0}
.tkw-key.is-del{padding:0}
.tkw-key svg{width:11px;height:9px;fill:none;stroke:currentColor;stroke-width:1.3}
.tkw-roll{display:inline-flex;overflow:hidden;height:16px;line-height:16px}
.tkw-roll b{font-weight:400;display:inline-block;transition:transform .6s ${EASE};text-shadow:0 16px 0 currentColor}
.tkw-btn:hover .tkw-roll b{transform:translateY(-16px)}
.tkw-undo{all:unset;cursor:pointer;margin-top:18px;font-size:10px;letter-spacing:1px;color:var(--c-soft);white-space:pre}
.tkw-progress{width:320px;height:3px;border-radius:2px;background:color-mix(in srgb,var(--c-ink) 12%,transparent);overflow:hidden}
.tkw-progress i{display:block;height:100%;width:0;background:var(--c-calm);transition:width .22s linear}
.tkw-count{margin-top:12px;font-size:11px;letter-spacing:.8px;color:var(--c-soft)}
.tkw-stats{display:flex;gap:28px;margin:-4px 0 24px}
.tkw-stat{display:grid;justify-items:center;gap:2px}
.tkw-stat b{font-weight:400;font-family:var(--_typography---font-styles--heading,serif);font-size:26px;line-height:1}
.tkw-stat span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkw-fixes{display:grid;gap:7px;width:360px;margin:-6px 0 22px;padding:10px 12px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 4%,var(--c-card));text-align:left}
.tkw-fix{display:flex;align-items:center;gap:10px;font-size:11px}
.tkw-fix i{width:12px;height:12px;flex:none;border-radius:2px;box-shadow:inset 0 0 0 1px var(--c-line);background:var(--c-card);transition:background .3s}
.tkw-fix.is-done i{background:var(--c-calm) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.4 2.4L9.6 3.6' fill='none' stroke='white' stroke-width='1.6'/%3E%3C/svg%3E") center/10px no-repeat;box-shadow:none}
.tkw-fix em{margin-left:auto;font-style:normal;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
.tkw-chip{margin:-8px 0 22px;padding:6px 10px;border-radius:4px;background:color-mix(in srgb,var(--c-ink) 6%,var(--c-card));font-size:11px}
.tkw-file{display:flex;align-items:center;gap:22px;margin:-6px 0 22px;text-align:left}
.tkw-file-art{width:78px;height:78px;display:grid;place-items:center}
.tkw-file-art .ms-ficon{width:76px;height:76px}.tkw-file-art .ms-thumb{width:76px;height:48px}
.tkw-file b{display:block;font-weight:400;font-family:var(--_typography---font-styles--heading,serif);font-size:22px;line-height:1.1;max-width:240px}
.tkw-file span{display:block;margin-top:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--c-soft)}
/* the pins row: a window onto the Dock's apps, the current one in the middle */
.tkw-pins{width:420px;height:44px;margin:-6px 0 22px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)}
.tkw-pins-in{display:flex;gap:8px;padding-top:4px;transition:transform .3s cubic-bezier(.33,1,.68,1)}
.tkw-pin{display:grid;justify-items:center;gap:4px;flex:none;width:28px;transition:opacity .35s,transform .35s cubic-bezier(.33,1,.68,1),width .35s,margin .35s}
.tkw-pin img{width:28px;height:28px;display:block;transition:transform .35s cubic-bezier(.33,1,.68,1),opacity .35s}
.tkw-pin i{width:4px;height:4px;border-radius:50%;background:var(--c-ink);opacity:0;transition:opacity .35s}
.tkw-pin.is-now img{transform:scale(1.15)}.tkw-pin.is-now i{opacity:1}
.tkw-pin.is-kept img{opacity:.3}.tkw-pin.is-wait img{opacity:.6}
.tkw-pin.is-gone{width:0;margin-inline:-4px;opacity:0;transform:scale(.2)}

/* under Tinko's screen: how far he is. The site's small diamond for each part, the course's blue on a line, and start over */
.tk-prog{display:flex;align-items:center;gap:1rem;margin-top:1.75rem;-webkit-user-select:none;user-select:none}
.tk-line{position:relative;flex:1;height:12px}
.tk-line::before{content:"";position:absolute;left:6px;right:6px;top:5px;height:2px;background:var(--brand-colors--dark-bage,#dfd5c9)}
.tk-fill{position:absolute;left:6px;top:5px;height:2px;width:0;background-image:radial-gradient(circle,#0297db,#3fc3ff)}
.tk-dia{position:absolute;top:0;width:12px;height:12px;margin-left:-6px;color:var(--brand-colors--dark-bage,#dfd5c9);transition:color .4s,transform .5s ${EASE}}
.tk-dia svg{display:block;width:12px;height:12px}
.tk-dia.is-on{color:var(--brand-colors--blue,#0297db);transform:scale(1.15)}
.tk-reset{all:unset;cursor:pointer;flex:none;width:32px;height:32px;display:grid;place-items:center;box-sizing:border-box;border:1px solid var(--brand-colors--dark-bage,#dfd5c9);border-radius:4px;background:var(--brand-colors--light-bage,#fbf7ee);color:var(--brand-colors--dark_gray,#3d3a35);transition:border-color .3s,transform .2s}
.tk-reset svg{width:13px;height:13px;display:block;transition:transform .6s ${EASE}}
.tk-reset:hover svg{transform:rotate(-180deg)}.tk-reset:active{transform:scale(.94)}
.tk-reset:focus-visible{box-shadow:0 0 0 2px var(--brand-colors--blue,#0297db)}

/* Rhythms: the moment it keeps your hours */
[data-sol-rhythms]{position:relative}
.rs-layer{position:absolute;inset:0;pointer-events:none;z-index:3;font-size:16px}
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
@media (max-width:767px){.rs-toast{left:0;width:19em;font-size:.9em}.rs-browser{right:0;width:21em}}
/* Who's behind it, the journal and the close: their look is on their Webflow classes (found_*, journal_*, close_*,
   sol_section found_section / journal_section). Here only what the Designer can't hold: what the script moves
   (--open, --dark, --settle and the is-open / dive-in states), ::before / ::after, the night versions of those,
   hovers that change a child, and the Webflow form's own inner parts. */
[data-found] .found_field-head{opacity:calc(1 - var(--open,0) * 3.5);transform:translateY(calc(var(--open,0) * -4rem))}
[data-found] .found_box::before,[data-found] .found_box::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}
[data-found] .found_box::before{background:rgba(241,237,226,.72);box-shadow:inset 0 0 0 1px rgba(61,58,53,.2),inset 0 1px 0 rgba(255,255,255,.55);opacity:calc(1 - var(--dark,0))}
[data-found] .found_box::after{background:rgba(9,10,13,.86);opacity:var(--dark,0)}
.dfs-night [data-found] .found_box::before{background:rgba(14,22,40,.62);box-shadow:inset 0 0 0 1px rgba(241,237,226,.18),inset 0 1px 0 rgba(255,255,255,.07)}
[data-found] .found_box-small{opacity:calc(1 - var(--open,0) * 4)}
.dfs-night [data-found] .found_box-small{color:#f1ede2}
[data-found] .found_box-player{opacity:0;transition:opacity .5s ease}
[data-found] .found_box.is-open .found_box-player{opacity:1}
[data-found] .found_box:not(.is-open) .found_box-player{pointer-events:none}
/* the "Film coming soon" note under play */
[data-found] .found_play::after{content:"Film coming soon";position:absolute;top:calc(100% + .75rem);left:50%;transform:translate(-50%,4px);white-space:nowrap;padding:.4rem .6rem;border-radius:2px;background:#16181d;color:#fbf7ee;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;opacity:0;pointer-events:none;transition:opacity .3s ease,transform .3s ${EASE}}
[data-found] .found_box .found_play::after{background:#f1ede2;color:#16181d;border-radius:99px;padding:.45rem .8rem}
[data-found] .found_play.is-soon::after{opacity:1;transform:translate(-50%,0)}
/* the journal covers: the shader's canvas, a hairline edge, and the lift on hover */
[data-journal] .journal_cover canvas{position:absolute;inset:0;width:100%;height:100%}
[data-journal] .journal_cover::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(61,58,53,.1);pointer-events:none}
.dfs-night [data-journal] .journal_cover::after{box-shadow:inset 0 0 0 1px rgba(241,237,226,.12)}
[data-journal] .journal_card:hover .journal_cover{transform:translateY(-4px)}
[data-journal] .journal_card:hover .journal_card-title{text-decoration-color:currentColor}
/* the close: the calm behind the words, the doors and letter coming in, the arrow on hover, the form's inner parts */
[data-close] .close_inner::before{content:"";position:absolute;left:50%;top:50%;width:140%;height:190%;transform:translate(-50%,-50%);z-index:-1;pointer-events:none;
  background:radial-gradient(closest-side,var(--dive-back,#f1ede2) 50%,transparent);opacity:calc(.35 + var(--settle,0) * .6)}
[data-close] .close_doors,[data-close] .close_letter{opacity:0;transform:translateY(14px);transition:opacity .7s ${EASE},transform .7s ${EASE}}
[data-close] .close_letter{transition-delay:.15s}
[data-close].is-open .close_doors,[data-close].is-open .close_letter{opacity:1;transform:none}
[data-close]:not(.is-open) .close_doors,[data-close]:not(.is-open) .close_letter{pointer-events:none}
[data-close] .close_door:hover .close_door-arrow{transform:translateX(4px)}
[data-close] .close_form form{display:flex;justify-content:center}
[data-close] .close_input:-webkit-autofill,[data-close] .close_input:-webkit-autofill:focus{-webkit-text-fill-color:var(--dive-text);-webkit-box-shadow:0 0 0 100px var(--dive-back) inset;caret-color:var(--dive-text)}
/* the close stays behind the footer, a little dimmer */
[data-close] .close-shade{position:absolute;inset:0;z-index:3;background:#05070d;opacity:0;pointer-events:none}
/* the footer: the dashes (Webflow can't hold a dashed gradient with a colour variable), the night mountains,
   the login cell's hover and load */
[data-foot] .foot_line.is-dash{background-image:repeating-linear-gradient(to bottom,var(--brand-colors--dark-bage) 0 4px,transparent 4px 8px)}
[data-foot] .foot_hline,[data-foot] .foot_cline{background-image:repeating-linear-gradient(to right,var(--brand-colors--dark-bage) 0 4px,transparent 4px 8px)}
[data-foot] .foot_col,[data-foot] .foot_cell-in{will-change:opacity,transform}
.dfs-night [data-foot] .foot_mtn{filter:contrast(1.45) invert(1) sepia(.55) hue-rotate(178deg) saturate(1.5) brightness(.95);mix-blend-mode:screen}
[data-foot] .foot_login-load{background:color-mix(in srgb,var(--brand-colors--blue) 12%,var(--brand-colors--light-bleu))}
[data-foot] .foot_cell.is-login:hover .foot_login-fill,[data-foot] .foot_cell.is-login:focus-visible .foot_login-fill,[data-foot] .foot_cell.is-login.is-loading .foot_login-fill{opacity:1}
[data-foot] .foot_cell.is-login.is-loading .foot_login-load{transform:scaleX(1);transition:transform .65s cubic-bezier(.625,.05,0,1)}
[data-foot] .foot_cell.is-login:hover .foot_login-label,[data-foot] .foot_cell.is-login:focus-visible .foot_login-label{color:var(--brand-colors--blue)}
[data-foot] .foot_cell.is-login:hover .foot_login-arrow{transform:translateX(4px)}
[data-foot] .foot_cell.is-login:focus-visible{outline:2px solid var(--brand-colors--blue);outline-offset:-2px}
[data-foot] a:focus-visible{outline:2px solid var(--brand-colors--blue);outline-offset:3px}
[data-close] .w-form-done,[data-close] .w-form-fail{margin-top:.25rem;padding:0;background:none;color:inherit;font-size:.82rem;text-align:center}
/* (night.css styles every Webflow field at night and loads after the Webflow classes; the close's field keeps its own) */
.dfs-night [data-close] .close_input{color:var(--dive-text);background-color:var(--dive-glass);border-color:var(--dive-nav-line);border-right-width:0}
.dfs-night [data-close] .close_input::placeholder{color:var(--dive-text);opacity:.5}
.dfs-night [data-close] .close_input:focus{border-color:color-mix(in srgb,var(--dive-text) 45%,transparent)}
.dfs-night [data-close] .close_submit{color:var(--dive-back)}
/* parked (hidden for now, [data-found-parked]): B, the instructor block, and C, the two ends */
[data-found] .sol_band-in .stand_tag{margin-left:4rem}
[data-found] .split_grid .divider_vertical{height:auto;align-self:stretch}
@media (max-width:767px){[data-found] .sol_band-in .stand_tag{margin-left:2rem}}
[data-found] .found_block{padding-left:4rem;padding-right:4rem}
@media (max-width:767px){[data-found] .found_block{padding:2.5rem 0}}
[data-found] .split_section .text-style-paragraph+.text-style-paragraph{margin-top:1rem}
@media (max-width:991px){[data-found] .heading-style-h4.is-rimbo{display:block}}
[data-found] .found_play svg{margin-left:4px}
/* B: the co-founders, as the instructor block's own tags, in a row */
[data-found] .found_team-row{gap:.5rem}
[data-found] .found_team-row .instructor_tag{position:relative;inset:auto;margin:0}
[data-found] .found_todo-tag{background:transparent;color:inherit;box-shadow:inset 0 0 0 1px var(--brand-colors--dark-bage)}
[data-found] .found_todo{opacity:.55;border-bottom:1px dashed currentColor}
/* C: the two ends */
[data-found] .found_mid{justify-self:center}
[data-found] .found_mid-line{background:var(--brand-colors--dark-bage);transform:scaleY(0);transition:transform 1s ${EASE} .35s}
[data-found] .found_mid-line:first-child{transform-origin:top}[data-found] .found_mid-line:last-child{transform-origin:bottom}
[data-found] .found_mid-text{opacity:0;transition:opacity .8s ease .7s}
[data-found] .found_side{opacity:0;transition:opacity .9s ${EASE},transform 1.1s ${EASE}}
[data-found] [data-found-side=left]{transform:translateX(-3rem)}[data-found] [data-found-side=right]{transform:translateX(3rem)}
[data-found] .found_duo.is-in .found_side{opacity:1;transform:none}
[data-found] .found_duo.is-in .found_mid-line{transform:none}[data-found] .found_duo.is-in .found_mid-text{opacity:1}
[data-found] .found_photo.is-empty{box-shadow:inset 0 0 0 1px var(--brand-colors--dark-bage);background-image:linear-gradient(var(--brand-colors--dark-bage) 1px,transparent 1px),linear-gradient(90deg,var(--brand-colors--dark-bage) 1px,transparent 1px);background-size:26px 26px;background-position:-1px -1px}
[data-found] .found_photo.is-empty .stand_tag{padding:.4rem .6rem;background:var(--brand-colors--light-bage)}
@media (max-width:767px){[data-found] [data-found-side]{transform:translateY(1.5rem)}[data-found] .found_photo{width:15rem;height:18.5rem}}
`;
  document.head.append(s);
}
