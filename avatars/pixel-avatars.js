/*
  DFS pixel avatars — tiny two-tone heads, 16×16 cells, Game Boy style.
  Standalone: window.dfsPixelAvatar = { svg(seed, opts), cells(seed, opts), palettes }

  A seed (member id, name, anything) always gives the same head.
  main.js carries a copy of this file (section PIXEL AVATARS) — keep them in sync.
  Tones: 0 = ink, 1 = light; the background colour comes from the palette.
*/
(function () {
  'use strict';

  var G = 16;

  // ---------- seeded randomness ----------
  function hashSeed(seed) {
    var s = String(seed), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }
  function chance(rand, p) { return rand() < p; }

  // ---------- masks ----------
  function mask() { return new Uint8Array(G * G); }
  function inside(x, y) { return x >= 0 && y >= 0 && x < G && y < G; }
  function blob(cx, cy, rx, ry, n, taper) {
    // superellipse: n = 2 round, n = 3 squarer; taper narrows the lower half (chin)
    var m = mask();
    for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dy > 0 && taper) dx /= (1 - taper * dy);
      if (Math.pow(Math.abs(dx), n) + Math.pow(Math.abs(dy), n) <= 1) m[y * G + x] = 1;
    }
    return m;
  }
  function rect(x0, y0, x1, y1) {
    var m = mask();
    for (var y = Math.max(0, y0); y <= Math.min(G - 1, y1); y++)
      for (var x = Math.max(0, x0); x <= Math.min(G - 1, x1); x++) m[y * G + x] = 1;
    return m;
  }
  function union() { var m = mask(); for (var a = 0; a < arguments.length; a++) for (var i = 0; i < G * G; i++) if (arguments[a][i]) m[i] = 1; return m; }
  function subtract(a, b) { var m = mask(); for (var i = 0; i < G * G; i++) m[i] = a[i] && !b[i] ? 1 : 0; return m; }
  function intersect(a, b) { var m = mask(); for (var i = 0; i < G * G; i++) m[i] = a[i] && b[i] ? 1 : 0; return m; }
  function where(fn) { var m = mask(); for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (fn(x, y)) m[y * G + x] = 1; return m; }
  function dilate(a, n) {
    var m = a;
    for (var k = 0; k < (n || 1); k++) {
      var o = mask();
      for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) {
        var i = y * G + x;
        if (m[i] || (x > 0 && m[i - 1]) || (x < G - 1 && m[i + 1]) || (y > 0 && m[i - G]) || (y < G - 1 && m[i + G])) o[i] = 1;
      }
      m = o;
    }
    return m;
  }
  function erode(a) {
    var o = mask();
    for (var y = 1; y < G - 1; y++) for (var x = 1; x < G - 1; x++) {
      var i = y * G + x;
      if (a[i] && a[i - 1] && a[i + 1] && a[i - G] && a[i + G]) o[i] = 1;
    }
    return o;
  }
  function edge(a) { return subtract(a, erode(a)); }
  function topRow(a) { for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (a[y * G + x]) return y; return G; }

  function Canvas() { this.t = new Int8Array(G * G).fill(-1); }
  Canvas.prototype.paint = function (m, tone) { for (var i = 0; i < G * G; i++) if (m[i]) this.t[i] = tone; };
  Canvas.prototype.set = function (x, y, tone) { if (inside(x, y)) this.t[y * G + x] = tone; };
  Canvas.prototype.hline = function (x0, x1, y, tone) { for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, tone); };
  Canvas.prototype.vline = function (x, y0, y1, tone) { for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, tone); };

  // ---------- the head ----------
  function portrait(seed) {
    var rand = mulberry(hashSeed(seed));
    var c = new Canvas();
    var INK = 0, LIGHT = 1, WHITE = 2;
    var f = chance(rand, 0.5) ? 1 : -1;                     // hair sweeps this way; the ear sits on the other side
    var look = chance(rand, 0.5) ? 1 : -1;                  // where the eyes look
    var dark = false;                                        // (all-dark faces looked like balaclavas; dropped)
    var face = dark ? INK : LIGHT, ink = dark ? LIGHT : INK;
    var shape = pick(rand, ['round', 'round', 'square', 'square', 'tall', 'wide', 'chin']);
    var hair = pick(rand, ['cap', 'cap', 'cap', 'swept', 'swept', 'quiff', 'quiff', 'spiky', 'bun', 'bangs', 'curly', 'long', 'bowl', 'afro', 'bald', 'bald']);
    var eyes = pick(rand, ['pair', 'pair', 'pair', 'pair', 'pair', 'pair', 'closed']);
    var nose = pick(rand, ['none', 'dot', 'dot', 'L']);
    var mouth = pick(rand, ['smile', 'smile', 'smile', 'small', 'line', 'grin', 'frown', 'open', 'smirk']);
    var beard = pick(rand, ['none', 'none', 'none', 'none', 'none', 'none', 'beard', 'goatee', 'moustache']);
    if (beard !== 'none' && (hair === 'afro' || hair === 'long' || hair === 'bowl' || hair === 'bangs')) beard = 'none';
    var glasses = chance(rand, 0.08);
    var ear = chance(rand, 0.7);
    var parting = chance(rand, 0.3), peak = chance(rand, 0.3);

    // head geometry: about 10-11 cells wide and 11-12 tall, leaving 2-3 rows for hair above
    var cx = 8, cy = 9;
    var rx = 5, ry = 5.6, n = 2.4, taper = 0;
    if (shape === 'square') { n = 2.7; rx = 5; ry = 5.4; }
    if (shape === 'tall') { rx = 4.6; ry = 6; }
    if (shape === 'wide') { rx = 5.5; ry = 5.3; n = 2.5; }
    if (shape === 'chin') { rx = 5.2; ry = 5.8; taper = 0.25; }
    var head = blob(cx, cy, rx, ry, n, taper);
    var ey = 8, my = 12;                                     // eye row, mouth row
    var exL = 5, exR = 9;                                    // each eye is two cells: x and x + 1
    var hb = pick(rand, [4, 5, 5, 6]);                       // hairline row at the centre
    if (beard === 'beard' && hb > 5) hb = 5;
    if (glasses && hb > 4) hb = 4;                           // a row of face between hair and glasses
    function hairline(x) {
      var d = (x + 0.5 - cx) / rx - f * 0.25;
      return Math.min(ey - 2, hb + Math.round(d * d * 2) + (peak && (x === cx || x === cx - 1) ? 1 : 0));
    }

    // --- face + outline ---
    c.paint(head, face);
    var earM = mask(), earX = f > 0 ? Math.floor(cx - rx + 0.5) - 1 : Math.ceil(cx + rx - 0.5);
    if (ear) { earM = rect(earX - (f > 0 ? 1 : 0), ey - 1, earX + (f > 0 ? 0 : 1), ey + 1); c.paint(earM, face); }
    if (!dark) { c.paint(edge(union(head, earM)), ink); if (ear) c.set(earX, ey, face); }
    else if (ear) c.paint(earM, LIGHT);

    // --- eyes: a dark dot and a white dot side by side, both looking the same way ---
    function eye(x) {
      if (eyes === 'closed') { c.hline(x, x + 1, ey, ink); return; }
      var pupil = look < 0 ? x : x + 1, shine = look < 0 ? x + 1 : x;
      c.set(pupil, ey, dark ? LIGHT : INK);
      c.set(shine, ey, WHITE);
    }
    eye(exL); eye(exR);
    // --- nose ---
    var nx = f > 0 ? 8 : 7;
    if (!dark && nose === 'dot') c.set(nx, ey + 2, ink);
    if (!dark && nose === 'L') { c.vline(nx, ey + 1, ey + 2, ink); c.set(nx + f, ey + 2, ink); }
    // --- mouth ---
    var mx = f > 0 ? 8 : 7;                                  // three cells, a little toward the facing side
    if (mouth === 'smile') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx - 2, my - 1, ink); c.set(mx + 2, my - 1, ink); }
    if (mouth === 'frown') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx - 2, my + 1, ink); c.set(mx + 2, my + 1, ink); }
    if (mouth === 'small') c.hline(mx, mx + (f > 0 ? -1 : 1), my, ink);
    if (mouth === 'line') c.hline(mx - 1, mx + 1, my, ink);
    if (mouth === 'smirk') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx + 2 * f, my - 1, ink); }
    if (mouth === 'open') c.vline(mx, my - 1, my, ink);                                  // a small 'o'
    if (mouth === 'grin') { c.hline(mx - 2, mx + 2, my - 1, ink); c.set(mx - 2, my, ink); c.set(mx + 2, my, ink); c.hline(mx - 1, mx + 1, my, face); c.hline(mx - 1, mx + 1, my + 1, ink); }
    // --- facial hair (light faces only; on a dark face it would vanish) ---
    if (!dark && beard === 'moustache') c.hline(mx - 1, mx + 1, my - 1, ink);
    if (!dark && beard === 'goatee') { c.hline(mx - 1, mx + 1, my - 1, ink); c.paint(intersect(head, rect(mx, my + 1, mx + 1, my + 3)), ink); }
    if (!dark && beard === 'beard') {
      c.paint(intersect(head, where(function (x, y) { return y >= my; })), ink);
      c.hline(mx - 1, mx + 1, my, face);                      // the mouth stays open in the beard
    }
    // --- glasses: a ring around each eye pair ---
    if (glasses) [exL, exR].forEach(function (x) { c.hline(x, x + 1, ey - 1, ink); c.hline(x, x + 1, ey + 1, ink); c.set(x - 1, ey, ink); c.set(x + 2, ey, ink); });

    // --- hair: hugs the face at the sides, bulges only on top ---
    var cap = union(intersect(head, where(function (x, y) { return y < hairline(x); })),
      intersect(dilate(head), where(function (x, y) { return y < hb - 1; })));
    var far = function (x) { return (x + 0.5 - cx) * -f; };  // distance toward the far side
    var hm = mask();
    if (hair === 'cap') hm = cap;
    if (hair === 'bowl') hm = union(cap, intersect(head, where(function (x, y) { return y < hb + 1 || (y < ey - 1 && Math.abs(x + 0.5 - cx) > rx - 1.3); })));
    if (hair === 'swept') hm = union(cap, intersect(head, where(function (x, y) { return far(x) > -1 && y < Math.min(ey - 1, hb + 1 + far(x) * 0.5); })));
    if (hair === 'bangs') hm = union(cap, intersect(head, where(function (x, y) { return far(x) > 1 && y <= ey && y < hb + 1 + far(x) * 1.2; })));
    if (hair === 'quiff') hm = union(cap, blob(cx + f * 2.5, hb - 2.5, 3.5, 2.5, 2, 0));
    if (hair === 'bun') hm = union(cap, rect(cx - f * 4 - 1, hb - 3, cx - f * 4 + 1, hb - 1));
    if (hair === 'spiky') {
      hm = cap; var top = topRow(cap);
      [cx - 4, cx - 2, cx, cx + 2].forEach(function (x, i) { var sx = x + (f > 0 ? 1 : 0); hm = union(hm, rect(sx, top - 1 - (i % 2), sx, top)); });
    }
    if (hair === 'curly') hm = union(cap, intersect(dilate(cap), where(function (x, y) { return ((x >> 1) & 1) === 0 && y < hb - 1; })));
    if (hair === 'afro') hm = subtract(intersect(dilate(head), where(function (x, y) { return y >= 0 && y < ey; })), intersect(head, where(function (x, y) { return y >= hairline(x) + 1; })));
    if (hair === 'long') hm = union(cap, where(function (x, y) { return y >= hb && y < cy + ry - 1 && (x === Math.floor(cx - rx + 0.5) - 1 || x === Math.ceil(cx + rx - 0.5)); }));
    if (parting && (hair === 'cap' || hair === 'swept' || hair === 'bowl')) hm = subtract(hm, rect(cx - f * 2, hb - 3, cx - f * 2, hb));
    if (hair !== 'bald') c.paint(hm, INK);
    return { tones: c.t };
  }

  var PALETTES = {
    beige: { bg: '#b9af9b', ink: '#3d3a35', light: '#f3ece0', white: '#ffffff' },
    sand: { bg: '#dfd5c9', ink: '#3d3a35', light: '#f6f0e4', white: '#ffffff' },
    blue: { bg: '#0297db', ink: '#143a5e', light: '#e4f3fb', white: '#ffffff' },
    night: { bg: '#172138', ink: '#0e1628', light: '#8fd3ff', white: '#ffffff' },
    green: { bg: '#8cbf6c', ink: '#122a1e', light: '#d4e8b8', white: '#f4fbe6' }
  };

  function cells(seed) { return portrait(seed); }

  function svg(seed, opts) {
    opts = opts || {};
    var pal = (typeof opts.palette === 'object' && opts.palette) || PALETTES[opts.palette] || PALETTES.beige;
    var p = portrait(seed);
    var bg = opts.background === undefined ? pal.bg : opts.background;
    var tone = [pal.ink, pal.light, pal.white || '#ffffff'];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + G + ' ' + G + '" shape-rendering="crispEdges" role="img" aria-label="pixel avatar">';
    if (bg) s += '<rect width="' + G + '" height="' + G + '" fill="' + bg + '"/>';
    for (var y = 0; y < G; y++) {
      var x = 0;
      while (x < G) {
        var t = p.tones[y * G + x];
        if (t < 0) { x++; continue; }
        var w = 1;
        while (x + w < G && p.tones[y * G + x + w] === t) w++;
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + tone[t] + '"/>';
        x += w;
      }
    }
    return s + '</svg>';
  }

  window.dfsPixelAvatar = { svg: svg, cells: cells, palettes: PALETTES, grid: G };
})();
