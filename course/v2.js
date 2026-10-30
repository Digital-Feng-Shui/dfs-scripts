/* Fundamentals V2 (/courses/fundamentals-v2, staging). Loaded only on that page (page head code):
   <script type="module" src="https://cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@course-v2-v0.20.0/course/v2.js"></script>
   The course itself (lessons, player, cards) is dfsCourse in main.js; this adds the V2-only parts on top of it.

   Focus mode: a corner button on the video (FOCUS MODE). The menu rolls up to its top and the progress block above
   the lesson folds up into the line under the top bar, so the video rises to sit right under it; then the video
   slides out into the room the menu left, sized so it and the Previous / Next bar fill the screen (never taller than
   MAX_H: past that, black bars at the sides); then a menu tab (three bars) slides out from behind the video's right
   edge and stays hanging on it. The tab, the button again or Esc play it back the other way. It stays on from lesson
   to lesson (Rim, 21 Oct): cards and actions show bigger in it, actions with more room around their two columns.
   The tab sits centred on the button's line: same job, same row (Rim, 21 Oct). Desktop only
   (under 992px the menu is a bar above the lesson anyway) and only over a video. While the pointer rests on the
   button, the video keeps its hover look (darker, controls) under it.
   The button is a viewfinder on the fullscreen icon's line: a small FOCUS in a roomy frame of thin marks (Rim, 29 Oct);
   in focus mode the word backs out letter by letter and the marks turn in, leaving an exit icon.
   Tab lab (?lab=corner, Rim choosing): the menu tab on the video's edge or a little off it; ?tab= holds the choice.
   The menu: panels a step darker than the page, lesson rows alternating darker / lighter, dashed chevron buttons
   (blue on the open module), the open lesson's checkbox in blue.
   The open lesson's time: while its video plays, a small blue wave runs in its place; paused, it lies flat.
   End of a video: the Complete and Continue field is darker, runs on behind the controls to the bottom edge, and
   speaks in the mono of Previous / Next; their arrows nudge on hover like its arrow.
   Download (0.2, Rim, 29 Oct: Tinko is notarised, the Terminal line goes): Tinko and one Download Tinko button, the
   stage cards' layout; Osmo's download button behaviour in the site's own button.
   Copy (the old install line, hidden now): a bubble over the button says it's on the clipboard.
   Big screens: the frame stops at FRAME wide and never so wide that the video and Previous / Next leave the screen;
   cards grow their contents with the card.
   Speed tip: on videos of 8+ minutes still playing at 1x, a short bubble over the speed control suggests 1.5x.
   The instructor panel in 0.1 Welcome: the photo floats, the dashed circles turn; on desktop it runs the full width.
   Lesson texts: the tag sits top right on the title's line, with the same inset as the text; extra tags (workfile ↓,
   resources ↓) stack under it and glide down to the link boxes below the text. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 992px)');
const root = document.documentElement;
root.classList.add('dfs-v2');

// three bars on whole pixels, as thick as the focus button's corner marks
const BURGER = '<svg viewBox="0 0 15 10" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><rect width="15" height="1.5"/><rect y="4" width="15" height="1.5"/><rect y="8" width="15" height="1.5"/></svg>';
const MAX_H = 820; // px, the tallest the video gets in focus mode (a big screen would otherwise be all video)
const FRAME = 1760; // px, the widest the page's frame gets (big screens get wider margins instead)
const CARD_W = 1100, CARD_MAX = 1.3; // a card wider than CARD_W px grows its contents with it, up to CARD_MAX times
const TAB_GAP = 12; // px between the video's edge and the menu tab, in the lab's "gap" variant
const WORD = 'Focus', SIDE = 14, LETTER_MS = 40; // the button's word, px of air either side, ms per letter

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
/* the text sits in a column as wide as the lesson text's, centred in its half */
.v2-instructor_body>*{width:100%;max-width:32rem}
/* on desktop the panel runs the course's full width, under the menu's column too, which is empty that far down
   (Rim, 24 Oct); only while it clears the menu (is-wide, set below). The course text's dashed right edge would run
   through it: a strip of page colour covers that stretch. In focus mode the text already has the menu's room */
@media (min-width:992px){
  :root:not(.v2-focus) .v2-instructor_panel.is-wide{position:relative;margin-right:calc(-4rem - 1px - 20rem)}
  :root:not(.v2-focus) .v2-instructor_panel.is-wide::after{content:"";position:absolute;top:1px;bottom:1px;right:20rem;width:1px;
    background-color:var(--brand-colors--light-bage);pointer-events:none}
}
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
.next_lesson_container.v2-no-video::after{content:"Video coming soon";position:absolute;inset:0;z-index:12;display:flex;
  align-items:center;justify-content:center;background-color:#f1ebe1;color:#3d3a35;
  background-image:linear-gradient(#3d3a3512 1px,#0000 1px),linear-gradient(90deg,#3d3a3512 1px,#0000 1px);background-size:32px 32px;
  border:1px solid var(--brand-colors--dark-bage);
  font-family:var(--_typography---font-styles--mono);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase}
/* the end of a video ("Complete and Continue"): a darker field that carries on, just as dark, behind the controls to
   the player's bottom edge, so field and controls are one (Rim, 30 Oct: the lighter band at the bottom went); it comes
   in with the field. Its label is the mono of PREVIOUS / NEXT, as far from its arrow as theirs (Webflow: v2-mono).
   Hover nudges the arrow instead of changing the shade, which would open a seam */
:root.dfs-v2 .lesson-complete_overlay,:root.dfs-v2 .lesson-complete_overlay:hover{background-color:rgba(24,23,22,.94);column-gap:2rem}
:root.dfs-v2 .lesson-complete_overlay .svg_arrow{transition:translate .35s cubic-bezier(.3,.7,.4,1)}
:root.dfs-v2 .lesson-complete_overlay:hover .svg_arrow{translate:6px 0}
:root.dfs-v2 .bunny-player__interface::before{content:"";position:absolute;left:0;right:0;bottom:0;height:3.5rem;pointer-events:none;
  background-color:rgba(24,23,22,.94);opacity:0;transition:opacity .2s ease}
:root.dfs-v2 .next_lesson_container:has(#finish_video[style*="flex"]) .bunny-player__interface::before{opacity:1;transition:opacity .5s ease .3s}
/* Previous / Next: the same nudge, each arrow towards where it goes */
:root.dfs-v2 .cnb_option .svg_arrow{transition:translate .35s cubic-bezier(.3,.7,.4,1)}
:root.dfs-v2 .cnb_option:hover .svg_arrow{translate:6px 0}
:root.dfs-v2 #previous.cnb_option:hover .svg_arrow{translate:-6px 0}
/* the speed tip: a small bubble over the speed control on long videos (see "speed tip" below) */
.v2-speed-tip,.v2-copy-pop{position:absolute;z-index:16;pointer-events:auto;cursor:pointer;max-width:15rem;padding:.7rem .9rem;
  background-color:#fbf7ee;color:#3d3a35;border-radius:.25rem;box-shadow:0 6px 24px rgba(0,0,0,.25);
  font-family:var(--_typography---font-styles--mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;line-height:1.5;
  opacity:0;translate:0 8px;transition:opacity .35s ease,translate .45s cubic-bezier(.3,.7,.4,1)}
.v2-speed-tip::after,.v2-copy-pop::after{content:"";position:absolute;bottom:-5px;left:var(--v2-tip-arrow,50%);width:10px;height:10px;margin-left:-5px;
  background:inherit;rotate:45deg}
.v2-speed-tip.is-in,.v2-copy-pop.is-in{opacity:1;translate:0 0}
.v2-copy-pop{z-index:60;pointer-events:none;white-space:nowrap}
/* the Download Tinko button (0.2): the site's card button with Osmo's download icon in its square. Hover lifts the
   arrow and widens its line; done (or handed to the browser), the arrow drops through the line, the line goes and
   a tick draws in (see "download" below) */
[data-download-icon-wrap]{justify-content:center}
/* (the label carries data-download-success too, as its "done" text: these are for the svg only) */
svg[data-download-icon],svg[data-download-success]{flex:none;width:.6em;height:.6em;overflow:visible}
svg[data-download-success]{position:absolute}
[data-download-arrow],[data-download-base]{transition:transform .5s cubic-bezier(.625,.05,0,1)}
[data-download-base]{transform-origin:center center}
[data-download-success] path{transition:stroke-dashoffset .4s cubic-bezier(.625,.05,0,1)}
[data-download-src][data-download-state="downloading"]{pointer-events:none}
body:has([data-download-src][data-download-state="downloading"]){cursor:progress}
[data-download-src]:is([data-download-state="ready"],[data-download-state="fallback"]) [data-download-arrow]{transform:translate(0,200%)}
[data-download-src]:is([data-download-state="ready"],[data-download-state="fallback"]) [data-download-base]{transition-delay:.1s;transform:scale(0,1)}
[data-download-src]:is([data-download-state="ready"],[data-download-state="fallback"]) [data-download-success] path{transition-delay:.25s;stroke-dashoffset:0}
@media (hover:hover) and (pointer:fine){
  [data-download-src][data-download-state="idle"]:hover [data-download-arrow]{transform:translate(0,-30%)}
  [data-download-src][data-download-state="idle"]:hover [data-download-base]{transform:scale(1.2,1)}
}
[data-download-src][data-download-state="idle"]:focus-visible [data-download-arrow]{transform:translate(0,-30%)}
[data-download-src][data-download-state="idle"]:focus-visible [data-download-base]{transform:scale(1.2,1)}
/* the player hides its controls while a video plays; under the tip they stay, so the bubble points at something */
.bunny-player.v2-tip-on[data-player-status] .bunny-player__interface{opacity:1;transform:translateY(0) rotate(.001deg)}
@media (prefers-reduced-motion:reduce){.v2-speed-tip,.v2-copy-pop{translate:none;transition:opacity .3s ease}}
html.dfs-night .next_lesson_container.v2-no-video::after{background-color:var(--brand-colors--bage);color:var(--brand-colors--dark_gray);
  background-image:linear-gradient(#ddd8cc12 1px,#0000 1px),linear-gradient(90deg,#ddd8cc12 1px,#0000 1px)}
@media (min-width:992px){
  /* the focus button is a viewfinder: a small FOCUS inside a roomy frame of thin corner marks (Rim, 29 Oct: smaller
     word, bigger square, just "focus"), so it reads apart from the player's compact, heavier fullscreen icon below.
     It keeps that icon's line: its right edge where the icon's marks end (27px in) and its middle as far down from the
     top as the controls' middle is up from the bottom (28px). In focus mode the word backs out letter by letter, the
     frame steps in to a square after it and the marks turn round to point in (see "the word" below) */
  .v2-focus-btn{position:absolute;top:14px;right:27px;z-index:15;display:flex;align-items:center;justify-content:center;
    box-sizing:border-box;width:28px;height:28px;padding:0;border:0;background:none;color:rgba(255,255,255,.92);cursor:pointer;
    font-family:var(--_typography---font-styles--mono);font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;line-height:1;
    transition:width 60ms linear,opacity .3s ease,visibility 0s linear 0s}
  /* a target as tall as the menu tab, not just the marks */
  .v2-focus-btn::before{content:"";position:absolute;inset:-4px}
  .v2-fc{position:absolute;width:6px;height:6px;pointer-events:none;border:0 solid currentColor;
    transition:scale .4s cubic-bezier(.6,0,.3,1),translate .35s cubic-bezier(.3,.7,.4,1)}
  .v2-fc.is-tl{top:0;left:0;border-top-width:1.5px;border-left-width:1.5px}
  .v2-fc.is-tr{top:0;right:0;border-top-width:1.5px;border-right-width:1.5px}
  .v2-fc.is-bl{bottom:0;left:0;border-bottom-width:1.5px;border-left-width:1.5px}
  .v2-fc.is-br{bottom:0;right:0;border-bottom-width:1.5px;border-right-width:1.5px}
  /* pointing out they step out on hover (make it big); turned in they step in (make it small again) */
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tl{translate:-3px -3px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-tr{translate:3px -3px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-bl{translate:-3px 3px}
  .v2-focus-btn:is(:hover,:focus-visible) .v2-fc.is-br{translate:3px 3px}
  .v2-focus-btn.is-in .v2-fc{scale:-1}
  .v2-focus-btn.is-in:is(:hover,:focus-visible) .v2-fc.is-tl{translate:2px 2px}
  .v2-focus-btn.is-in:is(:hover,:focus-visible) .v2-fc.is-tr{translate:-2px 2px}
  .v2-focus-btn.is-in:is(:hover,:focus-visible) .v2-fc.is-bl{translate:2px -2px}
  .v2-focus-btn.is-in:is(:hover,:focus-visible) .v2-fc.is-br{translate:-2px -2px}
  /* the button sits over the player, not in it, so reaching it counts as leaving the player: while the pointer is on
     it, hold the player's hover look (darker video, controls) so the white label keeps its ground */
  .next_lesson_container:has(.v2-focus-btn:hover) .bunny-player[data-player-status="playing"] .bunny-player__dark{opacity:.3}
  .next_lesson_container:has(.v2-focus-btn:hover) .bunny-player[data-player-status] .bunny-player__interface{opacity:1;transform:translateY(0) rotate(.001deg)}
  .v2-focus-btn:focus-visible{outline:none}
  /* the letter spacing also trails the last letter; taking it back centres the word between the marks. The capitals
     sit a fifth of a pixel high in their line, so a quarter pixel down */
  .v2-focus-btn span{margin-right:-.16em;translate:0 .25px;white-space:nowrap;text-shadow:0 1px 6px rgba(0,0,0,.35)}
  /* gone over a card, and while the video plays with its controls hidden (but never from under the pointer) */
  .next_lesson_container:has(.v2-card.is-active) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player:not([data-player-src])) .v2-focus-btn,
  .next_lesson_container:has(.bunny-player[data-player-status="playing"]:not([data-player-hover="active"])) .v2-focus-btn:not(:hover){
    opacity:0;visibility:hidden;transition:opacity .3s ease,visibility 0s linear .3s}

  /* action cards in focus mode: still top-aligned (the tag and the first link box start on one line), but with more
     room at the top and on both sides, so the two columns come in from the edges of the bigger frame */
  :root.v2-focus .v2-card:has(>.v2-card_links)>.tinko-stage_copy{padding-top:4rem;padding-left:max(2.5rem,10%)}
  :root.v2-focus .v2-card:has(>.v2-card_links)>.v2-card_links{padding-top:4rem;padding-right:max(2.5rem,10%)}
  /* every edge of a card already has a line next to it (the frame on top and left, the menu or the page's side line on
     the right, the Previous / Next bar below), so the card's own border only doubled them: one line each */
  :root.dfs-v2 .v2-card{border-width:0}
  /* a lesson without a video yet (and without a card): a quiet panel instead of the last lesson's video */
  .next_lesson_container.v2-no-video .bunny-player,.next_lesson_container.v2-no-video .v2-focus-btn{visibility:hidden}
  /* the menu tab: waits behind the video's right edge; focus mode slides it out and it stays hanging on that edge, a
     square open on the video's side, centred on the focus button's line (19 + 9 - 18) */
  .v2-menu-box{position:absolute;top:10px;left:100%;z-index:5;display:flex;align-items:center;justify-content:center;
    box-sizing:border-box;width:2.25rem;height:2.25rem;padding:0;border:1px solid var(--brand-colors--dark-bage);border-left:0;
    background-color:var(--brand-colors--bage);color:var(--brand-colors--dark_gray);cursor:pointer;visibility:hidden;
    transition:background-color .2s ease}
  .v2-menu-box svg{width:.9375rem;height:.625rem;flex:none}
  .v2-menu-box:hover{background-color:var(--brand-colors--dark-bage)}
  .v2-menu-box.is-gap{left:calc(100% + ${TAB_GAP}px);border-left-width:1px}

  /* as big as fits between the top bar and Previous / Next (--v2-fit, set by fitVideo); past that, black sides */
  :root.v2-focus .bunny-player{background-color:#000}
  :root.v2-focus .bunny-player__before{padding-top:min(56.25%,var(--v2-fit,calc(100svh - 10rem)))}
  :root.v2-focus .bunny-player__placeholder{object-fit:contain}

  /* big screens: the page's frame (side lines, top bar, course) stops growing at FRAME wide, the way the Rhythms page's
     content does, and stays narrow enough that the video and Previous / Next fit under the top bar and the progress
     block (4 + 10 + 6rem, plus a little air). Every part of the frame hangs off Webflow's stroke padding, so that's the
     one thing to move; only the menu has its own 7% */
  :root.dfs-v2{--v2-frame:min(${FRAME}px,max(1000px,calc((100vh - 21.25rem) * 16 / 9 + 20rem)));
    --_ui-styles---stroke--padding:max(7%,calc((100% - var(--v2-frame)) / 2))}
  :root.dfs-v2 .absolute_menu{right:var(--_ui-styles---stroke--padding)}
  /* on whole pixels, so every edge in the frame (and the marks on the video) lands sharp */
  @supports (width:round(1.5px,1px)){
    :root.dfs-v2{--_ui-styles---stroke--padding:round(down,max(7%,calc((100% - var(--v2-frame)) / 2)),1px)}
  }
  /* cards grow with the frame (see "big cards" below) */
  .v2-card>*{zoom:var(--v2-zoom,1)}
}
/* the corner lab (?lab=corner): a small panel to flip between the focus button's and the menu tab's variants */
.v2-lab{position:fixed;left:1rem;bottom:1rem;z-index:10000;display:grid;gap:.5rem;padding:.75rem;
  background-color:var(--brand-colors--bage);border:1px solid var(--brand-colors--dark-bage);color:var(--brand-colors--dark_gray);
  font-family:var(--_typography---font-styles--mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;line-height:1}
.v2-lab div{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem}
.v2-lab b{width:3.25rem;font-weight:400;opacity:.6}
.v2-lab button{padding:.45rem .55rem;border:1px solid var(--brand-colors--dark-bage);background:none;color:inherit;cursor:pointer;
  font:inherit;letter-spacing:inherit;text-transform:inherit}
.v2-lab button.is-on{background-color:var(--brand-colors--blue);border-color:var(--brand-colors--blue);color:#fff}`;
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
button.innerHTML = '<i class="v2-fc is-tl"></i><i class="v2-fc is-tr"></i><i class="v2-fc is-bl"></i><i class="v2-fc is-br"></i><span>' + WORD + '</span>';
const label = button.querySelector('span');

const box = document.createElement('button');
box.type = 'button';
box.className = 'v2-menu-box';
box.innerHTML = BURGER;
box.title = 'Menu';
box.setAttribute('aria-label', 'Show the course menu');

const ready = !!(stage && spacing && menu && course);
if (ready) {
  stage.appendChild(button);
  stage.appendChild(box);
}

// The menu tab's variants, still open (Rim, 21 Oct): edge = hangs on the video's edge, gap = TAB_GAP px off it
const TABS = ['edge', 'gap'];
const params = new URLSearchParams(location.search);
const corner = { tab: TABS.includes(params.get('tab')) ? params.get('tab') : 'edge' };
const tabGap = () => (corner.tab === 'gap' ? TAB_GAP : 0);
const dressTab = () => box.classList.toggle('is-gap', corner.tab === 'gap');

// The word: the marks sit SIDE px either side of it, on whole pixels; with no word they close to the 28px square
function fitWord() {
  const w = label.getBoundingClientRect().width;
  button.style.width = w ? Math.round(w - parseFloat(getComputedStyle(label).letterSpacing) + 2 * SIDE) + 'px' : '';
}
// It backs out (or types in) a letter at a time, the marks stepping with it; then() once it's there
let typing = 0, turning = 0;
function retype(to, then) {
  clearInterval(typing);
  const step = () => {
    const now = label.textContent;
    if (now === to) { clearInterval(typing); if (then) then(); return true; }
    label.textContent = to.startsWith(now) ? to.slice(0, now.length + 1) : now.slice(0, -1);
    fitWord();
    return false;
  };
  if (reduce) { while (!step()); return; }
  typing = setInterval(step, LETTER_MS);
}
// In: the word goes, then the marks turn in. Out: the marks turn out, then the word comes back
function dressButton(on) {
  button.setAttribute('aria-label', on ? 'Exit focus mode' : 'Focus mode');
  button.title = on ? 'Exit focus mode' : '';
  clearTimeout(turning);
  if (on) { retype('', () => button.classList.add('is-in')); return; }
  button.classList.remove('is-in');
  turning = setTimeout(() => retype(WORD), reduce ? 0 : 250);
}

let focused = false;
let tl = null;
if (ready) {
  dressTab();
  fitWord();
  if (document.fonts) document.fonts.ready.then(fitWord);
}

// ?lab=corner: a panel to flip through the variants; the choice goes into the address, so a link shows the same
if (ready && params.get('lab') === 'corner') {
  const lab = document.createElement('div');
  lab.className = 'v2-lab';
  const rows = [['tab', 'Menu', [['edge', 'On the edge'], ['gap', 'With a gap']]]];
  for (const [key, title, options] of rows) {
    const row = document.createElement('div');
    row.innerHTML = `<b>${title}</b>`;
    for (const [value, text] of options) {
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.textContent = text;
      pick.classList.toggle('is-on', corner[key] === value);
      pick.addEventListener('click', () => {
        corner[key] = value;
        row.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b === pick));
        params.set(key, value);
        history.replaceState(null, '', location.pathname + '?' + params + location.hash);
        dressTab();
      });
      row.appendChild(pick);
    }
    lab.appendChild(row);
  }
  document.body.appendChild(lab);
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
  toTop();
  const away = -(box.offsetWidth + tabGap());
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
  tl.to(box, { x: -(box.offsetWidth + tabGap()), duration: 0.35, ease: 'power2.in' }, 0);
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
  dressButton(on);
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  hideTip(); // the player is about to change size under it
  if (on) enter(); else leave();
}

button.addEventListener('click', () => setFocus(!focused));
box.addEventListener('click', () => setFocus(false));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !focused) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return; // Esc leaves fullscreen first
  setFocus(false);
});
desktop.addEventListener('change', () => { if (!desktop.matches) setFocus(false); else fitWord(); });
addEventListener('resize', () => { hideTip(); if (focused) fitVideo(); });

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

// A lesson with no video (and no card over the player) would keep showing the last lesson's video: hide it, pause it
function markNoVideo() {
  if (!stage) return;
  const item = openItem;
  const none = !!item && !item.hasAttribute('data-video-src') && !document.querySelector(`[data-lesson-stage="${item.id}"]`);
  stage.classList.toggle('v2-no-video', none);
  if (none) { const v = document.querySelector('#video-player video'); if (v && !v.paused) v.pause(); }
}

function onLesson() {
  const now = document.querySelector('.c_item.is-active');
  if (now === openItem) return;
  openItem = now;
  markNoVideo();
  hideTip();
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
// Full width while it starts at least CLEAR px under the menu (a long module open on a small screen can reach it)
const CLEAR = 24;
if (panel && menu) {
  const widen = () => panel.classList.toggle('is-wide',
    desktop.matches && panel.offsetHeight > 0 && panel.getBoundingClientRect().top - menu.getBoundingClientRect().bottom >= CLEAR);
  const sizes = new ResizeObserver(widen);
  sizes.observe(menu);
  sizes.observe(panel);
  addEventListener('resize', widen);
  addEventListener('load', widen);
  if (document.fonts) document.fonts.ready.then(widen); // the text above it settles, and with it where it starts
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

/* ---------- speed tip ---------- */

// Long lessons (8+ minutes) go down better a little faster. A few seconds into one, while it still plays at 1x, a small
// bubble over the speed control says so for a few seconds; a click on it sets 1.5x. Once per video per visit, and it
// leaves early on pause, a speed change or another lesson. Media events don't bubble, so this listens in the capture
// phase (the player element is swapped for every lesson).
const TIP_LONG = 8 * 60, TIP_AT = 8, TIP_FOR = 6500; // s, s, ms
const tipSeen = new Set();
let tip = null, tipTimer = 0;

function tipKey(player) { return player.getAttribute('data-player-src') || ''; }

function hideTip() {
  clearTimeout(tipTimer);
  const el = tip;
  tip = null;
  // a lesson switch copies the whole player, a showing tip included: clear those copies too, and the controls hold
  document.querySelectorAll('.v2-speed-tip').forEach((t) => { t.classList.remove('is-in'); if (t !== el) t.remove(); });
  document.querySelectorAll('.bunny-player.v2-tip-on').forEach((p) => p.classList.remove('v2-tip-on'));
  if (el) setTimeout(() => el.remove(), 450);
}

function showTip(player, video) {
  const speed = player.querySelector('[data-player-control="speed"]');
  if (!speed) return;
  tipSeen.add(tipKey(player));
  const el = document.createElement('div');
  el.className = 'v2-speed-tip';
  el.setAttribute('role', 'status');
  el.textContent = 'We recommend 1.5\u00d7 here';
  player.appendChild(el);
  player.classList.add('v2-tip-on'); // keep the controls (and the speed button) in view while it shows
  tip = el;
  // placed on the next frame, once the layout has settled, then faded in
  requestAnimationFrame(() => { if (tip !== el) return; placeTip(el, player, speed); requestAnimationFrame(() => el.classList.add('is-in')); });
  el.addEventListener('click', () => {
    for (let i = 0; i < 4 && video.playbackRate !== 1.5; i++) speed.click(); // the control steps 1, 1.2, 1.5, 2
    hideTip();
  });
  tipTimer = setTimeout(hideTip, TIP_FOR);
}

// Centred over the "x" of the speed label, its point on the x; shifted only where the player's edge would cut it
function placeTip(el, player, speed) {
  const p = player.getBoundingClientRect(), b = speed.getBoundingClientRect();
  const label = speed.querySelector('[data-player-speed-label]') || speed;
  let x = b.left + b.width / 2;
  const text = label.firstChild;
  if (text && text.nodeType === 3 && text.length) {
    const range = document.createRange();
    range.setStart(text, text.length - 1);
    range.setEnd(text, text.length);
    const r = range.getBoundingClientRect();
    if (r.width) x = r.left + r.width / 2;
  }
  const w = el.offsetWidth, at = x - p.left;
  const left = Math.min(Math.max(8, at - w / 2), p.width - w - 8);
  // the controls slide up 1em as they show, so measure where the speed control rests, not where it is right now
  // (offsets ignore that slide; the bounding box would put the bubble on top of the label)
  // (measured from the "1.0x" label itself, not its button, so the button's own padding can't bring it down)
  let top = 0, n = label;
  while (n && n !== player) { top += n.offsetTop; n = n.offsetParent; }
  if (n !== player) top = label.getBoundingClientRect().top - p.top;
  el.style.left = left + 'px';
  el.style.bottom = (player.offsetHeight - top + 18) + 'px';
  el.style.setProperty('--v2-tip-arrow', (at - left) + 'px');
}

document.addEventListener('timeupdate', (e) => {
  const video = e.target;
  if (!(video instanceof HTMLVideoElement) || tip) return;
  const player = video.closest('[data-bunny-player-init]');
  if (!player || video.paused || video.playbackRate > 1) return;
  if (!(video.duration >= TIP_LONG) || video.currentTime < TIP_AT || video.currentTime > TIP_AT + 60) return;
  if (tipSeen.has(tipKey(player))) return;
  showTip(player, video);
}, true);
document.addEventListener('pause', hideTip, true);
document.addEventListener('ratechange', (e) => { if (tip && e.target.playbackRate !== 1) hideTip(); }, true);

/* ---------- copied ---------- */

// The install line's Copy button (main.js copies it and turns the label into "Copied"): once it has, the same kind of
// bubble as the speed tip rises over the button and says so, then goes. Listens on window in the capture phase, like
// main.js, whose handler stops the click there.
const COPY_FOR = 1900; // ms
let copyPop = null, copyTimer = 0;

function showCopied(button) {
  clearTimeout(copyTimer);
  if (copyPop) copyPop.remove();
  const el = document.createElement('div');
  el.className = 'v2-copy-pop';
  el.setAttribute('role', 'status');
  el.textContent = 'Copied to clipboard';
  document.body.appendChild(el);
  const b = button.getBoundingClientRect();
  const w = el.offsetWidth;
  const x = b.left + b.width / 2 + scrollX;
  const left = Math.max(scrollX + 8, Math.min(x - w / 2, scrollX + innerWidth - w - 8));
  el.style.left = left + 'px';
  el.style.top = (b.top + scrollY - el.offsetHeight - 14) + 'px';
  el.style.setProperty('--v2-tip-arrow', (x - left) + 'px');
  copyPop = el;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  copyTimer = setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => { el.remove(); if (copyPop === el) copyPop = null; }, 450);
  }, COPY_FOR);
}

addEventListener('click', (e) => {
  const button = e.target.closest && e.target.closest('[data-helper-copy]');
  if (!button) return;
  // the clipboard answers in a moment; the bubble only comes once the label says it worked
  let tries = 0;
  const check = () => {
    if (/copied/i.test(button.textContent)) showCopied(button);
    else if (++tries < 8) setTimeout(check, 60);
  };
  setTimeout(check, 30);
}, true);

/* ---------- big cards ---------- */
// A card fills the whole video frame, which on a big screen (and in focus mode) is far bigger than the size it was set
// in, while its text stays put. Past CARD_W wide, everything in it grows with the card (padding too), up to CARD_MAX,
// so it reads as the same card, just closer. Hidden cards measure 0 and are left alone.
const cardSize = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const w = entry.contentRect.width;
    if (!w) continue;
    entry.target.style.setProperty('--v2-zoom', Math.min(CARD_MAX, Math.max(1, w / CARD_W)).toFixed(3));
  }
});
document.querySelectorAll('.v2-card').forEach((card) => cardSize.observe(card));

/* ---------- download (0.2) ---------- */
// Osmo's download button (Osmo Supply, Rim, 29 Oct), wired the same way: a click fetches [data-download-src] and saves
// it as [data-download-name]; where the host doesn't allow the fetch (CORS), the browser takes it from the link
// itself. data-download-state = idle | downloading | ready | fallback drives the icon (CSS above); the label says
// [data-download-success] for 3 s. Listens on window in the capture phase, before Webflow's href="#" scroll.
const DONE_FOR = 3000; // ms
function saveFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  if (name) a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
document.querySelectorAll('[data-download-src]').forEach((el) => { el.dataset.downloadState = 'idle'; });
addEventListener('click', async (e) => {
  const el = e.target.closest && e.target.closest('[data-download-src]');
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  if (el.dataset.downloadState === 'downloading') return;
  const src = el.getAttribute('data-download-src');
  if (!src) return;
  const name = el.getAttribute('data-download-name') || new URL(src, location.href).pathname.split('/').pop() || 'download';
  const labelEl = el.querySelector('[data-download-label]');
  if (labelEl && labelEl.dataset.downloadOriginalLabel == null) labelEl.dataset.downloadOriginalLabel = labelEl.textContent;
  el.blur();
  const done = (state) => {
    el.dataset.downloadState = state;
    const said = labelEl && labelEl.getAttribute('data-download-success');
    if (said) labelEl.textContent = said;
    clearTimeout(el._downloadReset);
    el._downloadReset = setTimeout(() => {
      el.dataset.downloadState = 'idle';
      if (labelEl && labelEl.dataset.downloadOriginalLabel != null) labelEl.textContent = labelEl.dataset.downloadOriginalLabel;
    }, DONE_FOR);
  };
  try {
    el.dataset.downloadState = 'downloading';
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('bad status');
    const url = URL.createObjectURL(await res.blob());
    saveFile(url, name);
    done('ready');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    saveFile(src, name);
    done('fallback');
  }
}, true);
