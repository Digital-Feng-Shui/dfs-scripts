/* DFS night mode, part 2 (end of <body>): the toggle button and the shift. */
(function () {
  var root = document.documentElement;
  // The night images sit next to this script (dfs-scripts/night/ on jsDelivr).
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
  var NIGHT_HERO = BASE + 'HERO_BG_4-night.webp';
  var NIGHT_OVERVIEW = BASE + 'BG_v5-night.webp';
  var THEME = { day: '#201A1A', night: '#0e1628' };

  // Pixel icons, drawn on a 9x9 grid so they match the pixel-zen look.
  function pixels(rows, cls) {
    var r = '';
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) if (row[x] === 'X') r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    });
    return '<svg class="' + cls + '" viewBox="0 0 9 9" fill="currentColor" aria-hidden="true">' + r + '</svg>';
  }
  var MOON = pixels(['...XXXX..', '.XXXX....', '.XXX.....', 'XXX......', 'XXX......', 'XXX......', '.XXX.....', '.XXXX....', '...XXXX..'], 'dfs-moon');
  var SUN = pixels(['....X....', '.X.....X.', '...XXX...', '..XXXXX..', 'X.XXXXX.X', '..XXXXX..', '...XXX...', '.X.....X.', '....X....'], 'dfs-sun');

  var isNight = function () { return root.classList.contains('dfs-night'); };

  // Hero is an <img>, so swap its source (backgrounds are handled in CSS).
  var heroes = [].slice.call(document.querySelectorAll('.hero_background-image'));
  heroes.forEach(function (img) { img.dataset.daySrc = img.getAttribute('src'); img.dataset.daySrcset = img.getAttribute('srcset') || ''; });
  function applyImages(night) {
    heroes.forEach(function (img) {
      if (night) { img.removeAttribute('srcset'); img.src = NIGHT_HERO; }
      else { img.src = img.dataset.daySrc; if (img.dataset.daySrcset) img.setAttribute('srcset', img.dataset.daySrcset); }
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', night ? THEME.night : THEME.day);
  }
  // Warm the night images up so the first switch has nothing to wait for.
  [NIGHT_HERO, NIGHT_OVERVIEW].forEach(function (u) { new Image().src = u; });
  applyImages(isNight());

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dfs-night-toggle';
  btn.innerHTML = MOON + SUN;
  function label() {
    var t = isNight() ? 'Switch to day mode' : 'Switch to night mode';
    btn.setAttribute('aria-label', t); btn.title = t;
    btn.setAttribute('aria-pressed', isNight() ? 'true' : 'false');
  }
  label();
  // Always right next to the nav's right-hand button (Login / Logout / My courses).
  // Pages without a nav get a small button in the bottom-left corner instead.
  var group = document.querySelector('.navbar_account');
  var bar = document.querySelector('.navbar_container');
  var lone = bar && bar.querySelector(':scope > .btn-animate-chars');
  if (group) group.insertBefore(btn, group.firstChild);
  else if (lone) { btn.classList.add('is-pushed'); lone.parentNode.insertBefore(btn, lone); }
  else { btn.classList.add('is-floating'); document.body.appendChild(btn); }

  function set(night) {
    if (night === isNight()) return;
    var flip = function () { root.classList.toggle('dfs-night', night); applyImages(night); label(); };
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || document.visibilityState === 'hidden') return flip();
    if (document.startViewTransition) {
      root.classList.toggle('dfs-dawn', !night);
      var vt = document.startViewTransition(flip);
      var done = function () { root.classList.remove('dfs-dawn'); };
      // A transition can be cut short (double click, tab hidden): the flip still
      // happens, so just tidy up quietly.
      vt.ready.catch(function () {});
      vt.finished.then(done, done);
    } else {
      root.classList.add('dfs-shifting');
      flip();
      setTimeout(function () { root.classList.remove('dfs-shifting'); }, 1300);
    }
  }

  btn.addEventListener('click', function () {
    var night = !isNight();
    try { localStorage.setItem('dfs-theme', night ? 'night' : 'day'); } catch (e) {}
    set(night);
  });

  // In 'system' mode, follow the device live (until the visitor picks by hand).
  if ((window.DFS_NIGHT_AUTO || 'system') === 'system' && window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var follow = function (e) { var s = null; try { s = localStorage.getItem('dfs-theme'); } catch (x) {} if (!s) set(e.matches); };
    mq.addEventListener ? mq.addEventListener('change', follow) : mq.addListener(follow);
  }

  window.dfsNight = { set: set, isNight: isNight };
})();
