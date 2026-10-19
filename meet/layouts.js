/* =========================================================
   Meet Tinko: the feature layouts lab (Rim, 19 Oct: "I want to think about multiple ways of showing this")
   Four ways to show what he does, on the real page with the real demos, to compare. Loaded by tinko.js only with
   ?layout= in the address (tinko/docs/meet-tinko-page.md, "Feature layouts to compare"):
     rows    the seven rows, as built in Webflow
     run     one big Mac, all seven parts in turn, a line with a diamond per part (the homepage's way)
     stages  three rows: stage 1 five parts in turn with a checklist that ticks off, then the inbox, then the setup
     scroll  the Mac stays put while the seven steps scroll past it; the step in the middle plays its part
   &you=1 (any layout): the demos wait for your Space or ⌫. A sketch: the one Rim picks gets built in Webflow.
   ========================================================= */
import { buildDemo, initDemo, ABORT, YOU, snapAll } from './tinko.js';

const ORDER = ['dock', 'desk', 'files', 'apps', 'settings', 'inbox', 'setup'];
const SHORT = { dock: 'Dock', desk: 'Desktop', files: 'Files', apps: 'Apps', settings: 'Settings', inbox: 'Inbox', setup: 'Setup' };
const LAYOUTS = [['rows', 'Rows'], ['run', 'One run'], ['stages', 'Three stages'], ['scroll', 'Scroll story']];
// how long each part plays (its clock only runs on screen), for the line in One run; corrected after each play
const DUR = { dock: 24000, desk: 20000, files: 18000, apps: 19000, settings: 21000, inbox: 22000, setup: 17000 };
const DIAMOND = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .6 9.4 5 5 9.4.6 5z"/></svg>';
const TICK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2l2.2 2.2 3.9-4.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const pause = ms => new Promise(r => setTimeout(r, ms));

export function initLayouts(name) {
  const rows = Object.fromEntries(ORDER.map(k => [k, document.getElementById(k)]));
  let L = LAYOUTS.some(l => l[0] === name) ? name : 'rows';
  panel(L);
  if (L === 'rows') return;   // tinko.js built them as they are
  if (ORDER.some(k => !rows[k]?.querySelector('.tinko-feature_text'))) { document.querySelectorAll('[data-tinko-demo]').forEach(initDemo); return; }
  if (L === 'scroll' && innerWidth < 992) L = 'run';   // a sticky Mac leaves no room on a phone
  injectCSS();
  const copy = Object.fromEntries(ORDER.map(k => [k, rows[k].querySelector('.tinko-feature_text').innerHTML]));
  ({ run, stages, scroll })[L](rows, copy);
  // the trails behind the demos: on whole squares again, and the Osmo code measures them again
  snapAll(); setTimeout(() => dispatchEvent(new Event('resize')), 60);
}

// a row out of the way, and the band under it
function hide(row) {
  row.style.display = 'none';
  const d = row.nextElementSibling; if (d?.classList.contains('divider_horizontal')) d.style.display = 'none';
}
// new words in a box: out, swap, back in
function swap(box, html, first) {
  if (first) { box.innerHTML = html; return; }
  box.classList.add('is-out');
  setTimeout(() => { box.innerHTML = html; box.classList.remove('is-out'); }, 260);
}

/* Several parts in one frame, one at a time: the Mac of the next part fades in over the last, he arrives (Outline,
   as in the app between stages), it plays, holds, and the next one comes. go(i) jumps; then: 'repeat' plays the same
   part again instead of the next (Scroll story, where you choose by scrolling). */
function sequence(cell, keys, { onPart, onEnd, then = 'next' } = {}) {
  const frame = document.createElement('div'); frame.className = 'tkl-frame';
  frame.innerHTML = keys.map(k => `<div class="tinko-demo tkl-part" data-part="${k}"></div>`).join('');
  cell.querySelector('.tinko-demo').replaceWith(frame);
  const parts = keys.map(k => buildDemo(frame.querySelector(`[data-part="${k}"]`), k));
  parts.forEach(p => { p.active = false; p.tinko.sleep(); });
  let cur = -1, run = 0;
  async function go(i) {
    const my = ++run, was = parts[cur], p = parts[i];
    if (was) {
      was.stop();
      if (was !== p) { was.active = false; was.host.classList.remove('is-on'); setTimeout(() => { if (parts[cur] !== was) was.tinko.sleep(); }, 450); }
    }
    cur = i;
    try { await p.reset(); } catch (e) {}
    p.clock = 0; p.host.classList.add('is-on'); p.active = true;
    onPart?.(i, keys[i]);
    p.tinko.sleep(); p.tinko.wakeUp(1, 'outline');
    try {
      await p.until(); await p.wait(1300);
      await p.play();
      DUR[keys[i]] = p.clock;
      await p.wait(p.D.hold || 3200);
    } catch (e) { if (e === ABORT || my !== run) return; throw e; }
    if (my !== run) return;
    if (then === 'repeat') return go(i);
    if (i + 1 === keys.length && onEnd) { onEnd(); await pause(1800); if (my !== run) return; }
    go((i + 1) % keys.length);
  }
  return { go, parts, keys, get cur() { return cur; } };
}

/* One run: the dock row grows into the one big Mac; the words beside it are the part he's in */
function run(rows, copy) {
  ORDER.slice(1).forEach(k => hide(rows[k]));
  const row = rows.dock, cell = row.querySelector('.tinko-feature_demo'), text = row.querySelector('.tinko-feature_text');
  row.querySelector('.tinko-feature_grid').classList.add('tkl-wide');
  text.innerHTML = '<div class="tkl-copy"></div>';
  const box = text.firstChild;
  const prog = document.createElement('div'); prog.className = 'tkl-prog';
  prog.innerHTML = `<div class="tkl-line"><i class="tkl-fill"></i>${ORDER.map((k, i) => `<button class="tkl-dia" type="button" data-i="${i}" style="left:${i / ORDER.length * 100}%" title="${SHORT[k]}">${DIAMOND}<span>${SHORT[k]}</span></button>`).join('')}</div>`;
  cell.append(prog);
  let first = true;
  const seq = sequence(cell, ORDER, { onPart: (i, k) => {
    prog.querySelectorAll('.tkl-dia').forEach((d, j) => { d.classList.toggle('is-done', j < i); d.classList.toggle('is-now', j === i); });
    swap(box, copy[k], first); first = false;
  } });
  prog.addEventListener('click', e => { const d = e.target.closest('.tkl-dia'); if (d) seq.go(+d.dataset.i); });
  // the line fills at the part's own pace, only while it's on screen
  const fill = prog.querySelector('.tkl-fill'); let iv = 0;
  const paint = () => { const p = seq.parts[seq.cur]; if (p) fill.style.width = (seq.cur + Math.min(1, p.clock / DUR[ORDER[seq.cur]])) / ORDER.length * 100 + '%'; };
  new IntersectionObserver(([e]) => { clearInterval(iv); if (e.isIntersecting) iv = setInterval(paint, 250); }).observe(cell);
  seq.go(0);
}

/* Three stages: the dock row is stage 1 (five parts in turn, a checklist), then the inbox row and the setup row */
function stages(rows, copy) {
  const ONE = ORDER.slice(0, 5);
  ONE.slice(1).forEach(k => hide(rows[k]));
  const row = rows.dock, cell = row.querySelector('.tinko-feature_demo'), text = row.querySelector('.tinko-feature_text');
  const title = k => rows[k].querySelector('.tinko-feature_title').textContent.trim();
  const stage = text.querySelector('.tinko-feature_stage').outerHTML, keys = text.querySelector('.tinko-feature_keys').outerHTML;
  text.innerHTML = `${stage}<h3 class="tinko-feature_title">Your Whole Mac,<br>Part By Part.</h3><p class="tinko-feature_body">First your Dock, then your desktop, Documents and Downloads, the apps you forgot and the settings you set once. One thing at a time, and Tinko waits for your key.</p><ol class="tkl-list">${ONE.map((k, i) => `<li data-i="${i}"><i>${TICK}</i><span>${title(k)}</span></li>`).join('')}</ol>${keys}`;
  const items = [...text.querySelectorAll('.tkl-list li')];
  const mark = n => items.forEach((li, j) => { li.classList.toggle('is-done', j < n); li.classList.toggle('is-now', j === n); });
  const seq = sequence(cell, ONE, { onPart: i => mark(i), onEnd: () => mark(ONE.length) });
  text.querySelector('.tkl-list').addEventListener('click', e => { const li = e.target.closest('li'); if (li) seq.go(+li.dataset.i); });
  initDemo(rows.inbox.querySelector('[data-tinko-demo]'));
  initDemo(rows.setup.querySelector('[data-tinko-demo]'));
  seq.go(0);
}

/* Scroll story: the Mac (with its grid and trail) sticks; the seven steps scroll past; the one in the middle plays */
function scroll(rows, copy) {
  ORDER.slice(1).forEach(k => hide(rows[k]));
  const row = rows.dock, cell = row.querySelector('.tinko-feature_demo'), text = row.querySelector('.tinko-feature_text');
  row.classList.add('tkl-scroll');
  const stick = document.createElement('div'); stick.className = 'tkl-sticky';
  [...cell.children].forEach(c => stick.append(c)); cell.append(stick);
  text.innerHTML = `<div class="tkl-steps">${ORDER.map((k, i) => `<div class="tkl-step" data-i="${i}">${copy[k]}</div>`).join('')}</div>`;
  const steps = [...text.querySelectorAll('.tkl-step')];
  const seq = sequence(stick, ORDER, { then: 'repeat', onPart: i => steps.forEach((s, j) => s.classList.toggle('is-now', j === i)) });
  const place = () => { stick.style.top = Math.max(84, (innerHeight - stick.offsetHeight) / 2) + 'px'; };
  addEventListener('resize', place); new ResizeObserver(place).observe(stick); place();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && +e.target.dataset.i !== seq.cur) seq.go(+e.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  seq.go(0);
}

/* the switch: a layout, and you-mode; it reloads on the features (a link to a section skips the intro) */
function panel(L) {
  const el = document.createElement('div'); el.className = 'tkh-tune is-layouts';
  el.style.bottom = 16 + document.querySelectorAll('.tkh-tune').length * 46 + 'px';
  el.innerHTML = `<b>Layout</b>${LAYOUTS.map(([k, n]) => `<button data-l="${k}" aria-pressed="${k === L}">${n}</button>`).join('')}<i></i><button data-you aria-pressed="${YOU}">You press the keys</button>`;
  document.body.append(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const u = new URL(location.href);
    if (b.dataset.l) u.searchParams.set('layout', b.dataset.l); else if (YOU) u.searchParams.delete('you'); else u.searchParams.set('you', '1');
    u.hash = 'features'; location.href = u.href;
  });
}

function injectCSS() {
  const s = document.createElement('style'); s.id = 'tkl-css';
  s.textContent = `
.tkl-frame{display:grid}
.tkl-frame>.tkl-part{grid-area:1/1;opacity:0;visibility:hidden;transition:opacity .45s cubic-bezier(.33,1,.68,1),visibility 0s linear .45s}
.tkl-frame>.tkl-part.is-on{opacity:1;visibility:visible;transition:opacity .45s cubic-bezier(.33,1,.68,1)}
@media (min-width:992px){.tinko-feature_grid.tkl-wide{grid-template-columns:minmax(0,1.6fr) auto minmax(0,1fr)}}
.tkl-prog{position:relative;margin:1.75rem 6px 0;height:2.6rem}
.tkl-line{position:relative;height:2px;border-radius:2px;background:color-mix(in srgb,currentColor 14%,transparent)}
.tkl-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:2px;background:var(--brand-colors--blue,#0297db);transition:width .25s linear}
.tkl-dia{all:unset;cursor:pointer;position:absolute;top:1px;transform:translate(-50%,-50%);display:grid;justify-items:center;padding:5px}
.tkl-dia svg{width:11px;height:11px;fill:var(--brand-colors--light-bage,#fbf7ee);stroke:color-mix(in srgb,currentColor 35%,transparent);stroke-width:1.2px;overflow:visible;transition:fill .3s,stroke .3s}
.tkl-dia span{position:absolute;top:24px;white-space:nowrap;font-size:.6875rem;letter-spacing:.1em;text-transform:uppercase;opacity:.5;transition:opacity .3s,color .3s}
.tkl-dia:hover span{opacity:.9}
.tkl-dia.is-done svg,.tkl-dia.is-now svg{fill:var(--brand-colors--blue,#0297db);stroke:var(--brand-colors--blue,#0297db)}
.tkl-dia.is-now span{opacity:1;color:var(--brand-colors--blue,#0297db)}
@media (max-width:767px){.tkl-dia span{display:none}.tkl-dia.is-now span{display:block}}
.tkl-copy{transition:opacity .26s,transform .26s cubic-bezier(.33,1,.68,1)}
.tkl-copy.is-out{opacity:0;transform:translateY(8px)}
.tkl-list{list-style:none;margin:1.75rem 0 0;padding:0;display:grid;gap:2px;width:100%;max-width:30rem}
.tkl-list li{display:flex;align-items:center;gap:.8rem;padding:.6rem .75rem;margin-left:-.75rem;border-radius:4px;cursor:pointer;font-size:.9375rem;line-height:1.3;opacity:.45;transition:opacity .3s,background-color .3s}
.tkl-list li:hover{opacity:.8}
.tkl-list li.is-done{opacity:.75}
.tkl-list li.is-now{opacity:1;background:color-mix(in srgb,currentColor 6%,transparent)}
.tkl-list i{flex:none;width:16px;height:16px;box-sizing:border-box;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 40%,transparent);border-radius:3px;color:transparent;transition:background-color .3s,border-color .3s,color .3s}
.tkl-list svg{width:10px;height:10px}
.tkl-list li.is-now i{border-color:var(--brand-colors--blue,#0297db)}
.tkl-list li.is-done i{background:var(--brand-colors--blue,#0297db);border-color:var(--brand-colors--blue,#0297db);color:#fff}
.tkl-scroll .tinko-feature_demo{justify-content:flex-start}
.tkl-sticky{position:sticky;top:96px;padding:3rem;margin:-3rem}
.tkl-steps{display:grid;width:100%}
.tkl-step{min-height:72vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;opacity:.25;transition:opacity .5s}
.tkl-step.is-now{opacity:1}
`;
  document.head.append(s);
}
