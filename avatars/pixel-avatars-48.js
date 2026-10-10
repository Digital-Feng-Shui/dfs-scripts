/*
  DFS pixel avatars — calm pixel portraits, five tones, 48×48 cells (64 works too).
  Standalone: window.dfsPixelAvatar = { svg(seed, opts), cells(seed, opts), palettes }

  A seed (member id, name, anything) always gives the same face. Tones are indexes
  0..4 (ink → lightest) into a palette picked at render time.
*/
(function () {
  'use strict';

  var G = 48;

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

  // ---------- masks (Uint8Array G*G) ----------
  function mask() { return new Uint8Array(G * G); }
  function inside(x, y) { return x >= 0 && y >= 0 && x < G && y < G; }
  function ellipse(cx, cy, rx, ry) {
    var m = mask();
    for (var y = 0; y < G; y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      var w = rx * Math.sqrt(1 - dy * dy);
      for (var x = 0; x < G; x++) if (Math.abs(x + 0.5 - cx) <= w) m[y * G + x] = 1;
    }
    return m;
  }
  function rect(x0, y0, x1, y1) {
    var m = mask();
    for (var y = Math.max(0, Math.round(y0)); y <= Math.min(G - 1, Math.round(y1)); y++)
      for (var x = Math.max(0, Math.round(x0)); x <= Math.min(G - 1, Math.round(x1)); x++) m[y * G + x] = 1;
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
  function erode(a, n) {
    var m = a;
    for (var k = 0; k < (n || 1); k++) {
      var o = mask();
      for (var y = 1; y < G - 1; y++) for (var x = 1; x < G - 1; x++) {
        var i = y * G + x;
        if (m[i] && m[i - 1] && m[i + 1] && m[i - G] && m[i + G]) o[i] = 1;
      }
      m = o;
    }
    return m;
  }
  function edge(a) { return subtract(a, erode(a)); }   // inner outline, 1 cell
  function topEdge(a) { return where(function (x, y) { return a[y * G + x] && !(y > 0 && a[(y - 1) * G + x]); }); }
  function rowBelow(a) { return subtract(where(function (x, y) { return y > 0 && a[(y - 1) * G + x]; }), a); } // first row under a mask

  // Head: upper half an ellipse, lower half follows a jaw profile; lean shifts the chin sideways
  function headMask(cx, cy, rx, ry, jaw, lean) {
    var m = mask();
    for (var y = 0; y < G; y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      var w, ox = 0;
      if (dy <= 0) w = rx * Math.sqrt(1 - dy * dy);
      else {
        var ell = Math.sqrt(1 - dy * dy);
        if (jaw === 'round') w = rx * ell * (1 - 0.15 * dy);
        else if (jaw === 'pointed') w = rx * Math.min(ell, 1.3 * (1 - dy));
        else if (jaw === 'square') w = rx * (dy < 0.8 ? 1 - 0.1 * dy : Math.min(0.92, 4.4 * (1 - dy)));
        else w = rx * Math.min(ell * 0.98, 1.7 * (1 - dy));            // 'long'
        ox = lean * dy;
      }
      for (var x = 0; x < G; x++) if (Math.abs(x + 0.5 - cx - ox) <= w) m[y * G + x] = 1;
    }
    return m;
  }

  // ---------- canvas of tone indexes (-1 = background) ----------
  function Canvas() { this.t = new Int8Array(G * G).fill(-1); }
  Canvas.prototype.paint = function (m, tone) { for (var i = 0; i < G * G; i++) if (m[i]) this.t[i] = tone; return this; };
  Canvas.prototype.set = function (x, y, tone) { x = Math.round(x); y = Math.round(y); if (inside(x, y)) this.t[y * G + x] = tone; };
  Canvas.prototype.hline = function (x0, x1, y, tone) { x0 = Math.round(x0); x1 = Math.round(x1); for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, tone); };
  Canvas.prototype.vline = function (x, y0, y1, tone) { y0 = Math.round(y0); y1 = Math.round(y1); for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, tone); };
  Canvas.prototype.checker = function (m, a, b, size) {
    var k = size || 1;
    for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (m[y * G + x]) this.t[y * G + x] = ((Math.floor(x / k) + Math.floor(y / k)) & 1) ? a : b;
  };

  // ---------- the portrait ----------
  function portrait(seed, grid) {
    G = grid || 48;
    var u = G / 48;                                        // everything below is designed on 48 cells
    var R = Math.round;
    var rand = mulberry(hashSeed(seed));
    var c = new Canvas();
    var f = chance(rand, 0.5) ? 1 : -1;                   // facing: +1 looks to the viewer's right
    var skin = pick(rand, [4, 4, 3, 3, 3, 2, 2, 1]);
    var shade = skin - 1, hi = Math.min(4, skin + 1);
    var hairTone = pick(rand, [0, 0, 0, 1, 1, 2, 3]);
    if (hairTone >= skin) hairTone = pick(rand, [0, 1]);  // hair always darker than the face
    var style = pick(rand, ['short', 'short', 'short', 'quiff', 'side', 'side', 'bob', 'long', 'bun', 'buzz', 'curly', 'bald', 'cap', 'beanie']);
    var clothes = pick(rand, [0, 1, 1, 2, 2, 3]);
    if (clothes === skin) clothes = skin > 2 ? 1 : 3;
    var collar = pick(rand, ['crew', 'crew', 'v', 'turtle']);
    var look = chance(rand, 0.5) ? 1 : -1;
    var jaw = pick(rand, ['round', 'round', 'pointed', 'square', 'square', 'long']);
    var brows = pick(rand, ['flat', 'flat', 'flat', 'stern', 'worried', 'raised', 'thick']);
    var eyes = pick(rand, ['normal', 'normal', 'normal', 'normal', 'narrow', 'closed']);
    var mouth = pick(rand, ['line', 'line', 'smile', 'smile', 'grin', 'smirk', 'small', 'frown']);
    if (eyes === 'closed') mouth = pick(rand, ['smile', 'grin']);
    var beard = pick(rand, ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'stubble', 'moustache', 'beard', 'goatee']);
    var glasses = pick(rand, ['none', 'none', 'none', 'none', 'none', 'none', 'rect', 'round']);
    if (eyes === 'closed') glasses = 'none';
    var earring = pick(rand, ['none', 'none', 'none', 'none', 'none', 'hoop', 'stud']);
    var freckles = skin > 1 && chance(rand, 0.12), mole = chance(rand, 0.12);
    var bgTone = pick(rand, [3, 3, 2]);
    if (bgTone === skin) bgTone = skin === 3 ? 2 : 3;
    if (bgTone === clothes) bgTone = bgTone === 3 ? 2 : 3;
    if (bgTone === skin) bgTone = 4;

    // --- geometry ---
    var cx = 24 * u, cy = (19 + rand() * 1.5) * u;
    var rx = (11 + rand() * 3) * u, ry = (13.5 + rand() * 2.5) * u;
    if (jaw === 'long') { rx = Math.min(rx, 12 * u); ry = Math.max(ry, 15.5 * u); }
    if (jaw === 'square') rx = Math.max(rx, 12.2 * u);
    var head = headMask(cx, cy, rx, ry, jaw, f * (1 + rand() * 1.5) * u);
    var chinY = R(cy + ry) - 1;
    var ey = R(cy + 1.5 * u);
    var farX = R(cx - f * 3.5 * u), nearX = R(cx + f * (rx > 12.5 * u ? 6 : 5) * u);
    var mouthY = R(ey + (chinY - ey) * 0.6);
    var hairBase = ey - R((8 - Math.floor(rand() * 3)) * u);
    function hairline(x) { var d = (x + 0.5 - cx) / rx; return hairBase + R(d * d * 4 * u); }
    var t = Math.max(1, R(u));                            // line thickness

    // --- torso + neck ---
    var torso = ellipse(cx + f * 0.5 * u, 55 * u, 23 * u, 14.5 * u);
    c.paint(torso, clothes);
    var neck = rect(cx - 4 * u + f * u, chinY - 3 * u, cx + 4 * u + f * u, 44 * u);
    c.paint(neck, skin);
    c.paint(intersect(neck, rect(0, chinY + 1, G, chinY + 3 * u)), shade);         // shadow under the chin
    c.paint(intersect(neck, rect(f > 0 ? cx - 4 * u + f * u : cx + 4 * u + f * u - t + 1, chinY + 1, f > 0 ? cx - 4 * u + f * u + t - 1 : cx + 4 * u + f * u, 44 * u)), shade);
    if (collar === 'v') c.paint(intersect(torso, where(function (x, y) { return y >= 40 * u && Math.abs(x + 0.5 - cx - f * u) <= (44 * u - y) * 1.1; })), skin);
    if (collar === 'turtle') { c.paint(intersect(neck, rect(0, chinY + 3 * u, G, G)), clothes); c.hline(cx - 4 * u + f * u, cx + 4 * u + f * u, chinY + 4 * u, clothes === 0 ? 1 : clothes - 1); }
    c.paint(topEdge(subtract(torso, neck)), 0);                                       // collar line
    if (collar === 'turtle') c.paint(topEdge(intersect(neck, rect(0, chinY + 3 * u, G, G))), 0);

    // --- hair behind the head (long) ---
    var hairMask = mask();
    if (style === 'long') {
      // a mane with volume: wide around the head, falling past the shoulders at both sides
      var mane = union(intersect(dilate(head, R(5 * u)), rect(0, 0, G, 44 * u)),
        rect(cx - 17 * u, 24 * u, cx - 11 * u, 43 * u), rect(cx + 11 * u, 24 * u, cx + 17 * u, 43 * u));
      hairMask = subtract(mane, union(head, neck, rect(cx - 9 * u, chinY - 2 * u, cx + 9 * u, G)));
    }

    // --- head ---
    c.paint(head, skin);
    var farSide = where(function (x, y) { return (x + 0.5 - cx) * -f >= rx - 3.2 * u && y >= ey - 4 * u; });
    if (skin > 1) c.paint(intersect(head, farSide), shade);
    else { c.hline(nearX - 2 * u, nearX + 2 * u, ey + 3 * u, hi); c.hline(nearX - u, nearX + 2 * u, ey + 4 * u, hi); c.hline(cx + f * u, cx + f * 6 * u, hairBase + u, hi); }
    if (jaw === 'square' && skin > 1) c.paint(intersect(head, where(function (x, y) { return y >= chinY - 2 * u && (x + 0.5 - cx) * -f >= rx - 5 * u; })), shade);
    var earX = R(cx - f * (rx + 0.5 * u));
    var ear = ellipse(earX - f * 0.5 * u, ey + 1 * u, 1.8 * u, 2.8 * u);
    c.paint(ear, skin > 1 ? shade : skin);
    c.paint(edge(union(head, ear)), 0);

    // --- eyes ---
    function eye(ex) {
      var x0 = ex - 1 * u, x1 = ex + 2 * u;                                          // 4 cells wide at 48
      if (eyes === 'closed') { c.hline(x0, x1, ey, 0); c.hline(x0 + u, x1 - u, ey + 1, shade); return; }
      if (glasses === 'none') c.hline(x0, x1, ey - 1 * u, 0);                         // upper lid
      c.hline(x0, x1, ey, 4);                                                          // white
      var px = look > 0 ? ex + 1 * u : ex - 1 * u;                                     // 2-cell pupil on the looking side
      c.hline(px, px + u, ey, 0);
      if (u >= 1.3) c.hline(px, px + u, ey + 1, 0);
      c.hline(x0, x1, ey + R(u), shade === skin ? 0 : shade);                         // lower lid, soft
      if (eyes === 'narrow') { c.hline(x0, x1, ey, skin); c.hline(px, px + u, ey, 0); }
    }
    eye(farX); eye(nearX);
    // --- brows ---
    function brow(ex, dir, near) {
      var y = ey - R((brows === 'thick' ? 3 : 4) * u);
      if (brows === 'raised' && near) y -= R(u);
      var len = R(5 * u);
      for (var i = 0; i < len; i++) {
        var x = ex - dir * R(1.5 * u) + i * dir, yy = y;                               // from the inner end outward
        var q = i / (len - 1);
        if (brows === 'stern') yy = y + R((0.5 - q) * 2 * u);
        if (brows === 'worried') yy = y - R((0.5 - q) * 2 * u);
        c.set(x, yy, 0);
        if (brows === 'thick' && q >= 0.3) c.set(x, yy - 1, 0);
      }
    }
    brow(farX, -f, false); brow(nearX, f, true);
    // --- nose: an L toward the near side, with a soft shadow ---
    var nx = R(cx + f * 1.5 * u), nb = ey + R(4 * u);
    c.vline(nx, ey + R(1.5 * u), nb, 0); c.hline(nx + f, nx + f * R(2 * u), nb, 0);
    if (skin > 1) { c.vline(nx - f, ey + R(2 * u), nb - 1, shade); c.hline(nx, nx + f * R(2 * u), nb + 1, shade); }
    // --- mouth ---
    var mx = R(cx + f * 1.5 * u), mw = R(2 * u);
    if (mouth === 'line') c.hline(mx - mw, mx + mw, mouthY, 0);
    if (mouth === 'small') c.hline(mx - R(u), mx + R(u), mouthY, 0);
    if (mouth === 'smile') { c.hline(mx - mw, mx + mw, mouthY, 0); c.set(mx - mw - 1, mouthY - 1, 0); c.set(mx + mw + 1, mouthY - 1, 0); if (u >= 1.3) { c.set(mx - mw - 2, mouthY - 2, 0); c.set(mx + mw + 2, mouthY - 2, 0); } }
    if (mouth === 'frown') { c.hline(mx - mw, mx + mw, mouthY, 0); c.set(mx - mw - 1, mouthY + 1, 0); c.set(mx + mw + 1, mouthY + 1, 0); }
    if (mouth === 'smirk') { c.hline(mx - mw, mx + mw - (f > 0 ? 0 : 0), mouthY, 0); c.set(mx + f * (mw + 1), mouthY - 1, 0); }
    if (mouth === 'grin') { c.hline(mx - mw - 1, mx + mw + 1, mouthY - 1, 0); c.hline(mx - mw, mx + mw, mouthY, 4); c.set(mx - mw - 1, mouthY, 0); c.set(mx + mw + 1, mouthY, 0); c.hline(mx - mw, mx + mw, mouthY + 1, 0); c.set(mx - mw - 2, mouthY - 2, 0); c.set(mx + mw + 2, mouthY - 2, 0); }
    if (skin > 1 && mouth !== 'grin') c.hline(mx - mw + 1, mx + mw - 1, mouthY + 1, shade);   // lip shadow
    if (skin === 1 && mouth !== 'grin') c.hline(mx - mw + 1, mx + mw - 1, mouthY + 1, hi);
    if (freckles) { c.set(farX - f * u, ey + 4 * u, shade); c.set(farX + f * u, ey + 5 * u, shade); c.set(nearX + f * 2 * u, ey + 4 * u, shade); c.set(nearX, ey + 5 * u, shade); }
    if (mole) c.set(mx + f * 5 * u, mouthY + 2 * u, 0);
    // --- facial hair ---
    var jawM = intersect(head, where(function (x, y) { return y >= mouthY - 1; }));
    var lips = rect(mx - mw - 2 * u, mouthY - 3 * u, mx + mw + 2 * u, mouthY + 1.5 * u);
    if (beard === 'moustache' || beard === 'goatee') { c.hline(mx - mw - 1, mx + mw + 1, mouthY - 2, 0); c.hline(mx - mw - 1, mx + mw + 1, mouthY - 2 - (u >= 1.3 ? 1 : 0), 0); c.set(mx - mw - 2, mouthY - 1, 0); c.set(mx + mw + 2, mouthY - 1, 0); }
    if (beard === 'goatee') c.paint(intersect(jawM, rect(mx - mw, mouthY + 2.5 * u, mx + mw, chinY)), 0);
    if (beard === 'beard') { c.paint(subtract(jawM, union(lips, erode(jawM, R(4 * u)))), 0); c.hline(mx - mw - 1, mx + mw + 1, mouthY - 2, 0); }
    if (beard === 'stubble') c.checker(intersect(subtract(jawM, union(lips, erode(jawM, R(2 * u)))), where(function (x, y) { return y >= mouthY + 1; })), skin, shade === skin ? 0 : shade);

    // --- hair ---
    var cap = union(intersect(dilate(head, R(2 * u)), where(function (x, y) { return y < hairline(x); })),
      intersect(dilate(head, R(3 * u)), where(function (x, y) { return y < hairBase - 8 * u; })));
    cap = intersect(cap, where(function (x, y) { return y >= 0; }));
    var rim = intersect(subtract(dilate(head), erode(head, R(1.5 * u))), where(function (x, y) { return y < ey - 1 && (x + 0.5 - cx) * -f > 3 * u; })); // sideburn, far side
    var parting = chance(rand, 0.4) ? rect(cx - f * 5 * u, hairBase - 2 * u, cx - f * 5 * u, hairBase + 2 * u) : null;
    var bangs = intersect(head, where(function (x, y) { return y < Math.min(ey - 2.5 * u, hairBase + 3 * u - f * (x + 0.5 - cx) * 0.6); }));
    var texture = null, hairShadow = true;
    if (style === 'short') { hairMask = union(hairMask, cap, rim); if (parting) hairMask = subtract(hairMask, intersect(parting, head)); }
    if (style === 'quiff') hairMask = union(hairMask, cap, rim, intersect(ellipse(cx + f * 4 * u, hairBase - 7 * u, 8 * u, 5 * u), where(function (x, y) { return y >= 0; })));
    if (style === 'side') hairMask = union(hairMask, cap, rim, bangs);
    if (style === 'bob') hairMask = union(hairMask, cap, intersect(subtract(dilate(head, R(3 * u)), erode(head, R(2 * u))), where(function (x, y) { return y < mouthY + 2 * u && y > 8 * u; })), chance(rand, 0.5) ? intersect(head, rect(0, 0, G, hairBase + 2 * u)) : bangs);
    if (style === 'long') hairMask = union(hairMask, cap, chance(rand, 0.5) ? intersect(head, rect(0, 0, G, hairBase + 2 * u)) : bangs);
    if (style === 'bun') hairMask = union(hairMask, cap, rim, ellipse(cx - f * 8 * u, hairBase - 7 * u, 4.5 * u, 4 * u));
    if (style === 'buzz') { hairMask = intersect(cap, head); texture = [hairTone, skin]; hairShadow = false; }
    if (style === 'curly') { hairMask = union(hairMask, intersect(dilate(head, R(3 * u)), where(function (x, y) { return y < hairline(x) + 2 * u && y >= 0; })), dilate(rim)); texture = [hairTone, hairTone + 1]; }
    if (style === 'cap' || style === 'beanie') {
      hairMask = union(hairMask, rim);
      c.paint(hairMask, hairTone);
      var dome = intersect(dilate(head, R(1.5 * u)), where(function (x, y) { return y >= 0 && y < hairline(x) - u; }));
      var capTone = pick(rand, [0, 1, 2, 3]); if (capTone === skin) capTone = 1;
      var bandY = hairBase - R(u);
      if (style === 'cap') {
        c.paint(dome, capTone);
        var brim = rect(cx + f * 2 * u, bandY + 1, cx + f * 15 * u, bandY + R(2 * u));
        c.paint(brim, capTone); c.paint(subtract(dilate(brim), union(brim, dome)), 0);
        c.hline(cx - 9 * u, cx + 9 * u, bandY, capTone === 0 ? 1 : 0);
        c.paint(edge(dome), 0);
        if (capTone !== 3) { c.paint(rect(cx + f * u - 1.5 * u, bandY - 7 * u, cx + f * u + 1.5 * u, bandY - 5 * u), capTone === 0 ? 3 : 4); }
      } else {
        var beanie = union(dome, intersect(dilate(head, R(1.5 * u)), rect(0, bandY - 2 * u, G, bandY + u)));
        c.paint(beanie, capTone);
        c.hline(cx - 12 * u, cx + 12 * u, bandY - 2 * u, capTone === 0 ? 1 : capTone - 1);
        c.paint(edge(beanie), 0);
        c.paint(ellipse(cx, 2 * u, 2.2 * u, 2 * u), capTone); c.paint(edge(ellipse(cx, 2 * u, 2.2 * u, 2 * u)), 0);
      }
      hairMask = mask(); hairShadow = false;
    } else if (style !== 'bald') {
      if (texture) c.checker(hairMask, texture[0], texture[1], texture[0] === hairTone && style === 'curly' ? R(2 * u) : 1);
      else c.paint(hairMask, hairTone);
      if (hairTone !== 0 || texture) c.paint(edge(hairMask), 0);
      if (!texture && chance(rand, 0.7)) {                                           // highlight on the lit side
        var hl = hairTone + 1;
        c.hline(cx - 6 * u, cx - 3 * u, hairBase - 6 * u, hl); c.hline(cx - 7 * u, cx - 5 * u, hairBase - 5 * u, hl);
      }
    }
    if (hairShadow && style !== 'bald') c.paint(intersect(subtract(rowBelow(hairMask), hairMask), head), shade);   // hair shadow on the forehead
    if (style === 'bald') c.paint(intersect(erode(head), where(function (x, y) { return y < hairBase - 2 * u; })), skin);

    // --- glasses ---
    if (glasses !== 'none') {
      [farX, nearX].forEach(function (ex) {
        var x0 = ex - 2 * u, x1 = ex + 3 * u;
        if (glasses === 'round') {
          c.hline(x0 + 1, x1 - 1, ey - R(1.5 * u), 0); c.hline(x0 + 1, x1 - 1, ey + R(1.5 * u), 0);
          c.vline(x0, ey - R(0.5 * u), ey + R(0.5 * u), 0); c.vline(x1, ey - R(0.5 * u), ey + R(0.5 * u), 0);
        } else {
          c.hline(x0, x1, ey - R(1.5 * u), 0); c.hline(x0, x1, ey + R(1.5 * u), 0);
          c.vline(x0, ey - R(u), ey + R(u), 0); c.vline(x1, ey - R(u), ey + R(u), 0);
        }
      });
      c.hline(farX + f * 3 * u, nearX - f * 2 * u, ey, 0);                            // bridge
      c.hline(farX - f * 2 * u, earX + f * 2 * u, ey - R(0.5 * u), 0);                 // temple to the far ear
    }
    // --- earring on the far ear ---
    if (earring === 'stud') c.set(earX, ey + 3 * u, 4);
    if (earring === 'hoop') { var hy = ey + R(4.5 * u); c.set(earX, hy, 0); c.set(earX - 1, hy + 1, 0); c.set(earX + 1, hy + 1, 0); c.set(earX, hy + 2, 0); c.set(earX, hy + 1, bgTone); }

    // --- outline around the whole figure ---
    var fig = where(function (x, y) { return c.t[y * G + x] !== -1; });
    c.paint(edge(fig), 0);
    return { tones: c.t, bg: bgTone, facing: f, grid: G };
  }

  var PALETTES = {
    beige: ['#3d3a35', '#8a7a62', '#b9af9b', '#dfd5c9', '#fbf7ee'],
    cream: ['#1e1e1e', '#6f6a62', '#a9a49a', '#dcd3c4', '#fbf7ee'],
    blue: ['#143a5e', '#0297db', '#7cc8f0', '#bfe8fa', '#eff9fd'],
    night: ['#0e1628', '#1a97d7', '#5db6ea', '#8fd3ff', '#e7f3ff']
  };

  function cells(seed, opts) { return portrait(seed, (opts || {}).grid); }

  function svg(seed, opts) {
    opts = opts || {};
    var pal = Array.isArray(opts.palette) ? opts.palette : (PALETTES[opts.palette] || PALETTES.beige);
    var p = portrait(seed, opts.grid);
    var N = p.grid;
    var bg = opts.background === undefined ? pal[p.bg] : opts.background;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N + '" shape-rendering="crispEdges" role="img" aria-label="pixel avatar">';
    if (bg) s += '<rect width="' + N + '" height="' + N + '" fill="' + bg + '"/>';
    for (var y = 0; y < N; y++) {
      var x = 0;
      while (x < N) {
        var t = p.tones[y * N + x];
        if (t < 0) { x++; continue; }
        var w = 1;
        while (x + w < N && p.tones[y * N + x + w] === t) w++;
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + pal[t] + '"/>';
        x += w;
      }
    }
    return s + '</svg>';
  }

  window.dfsPixelAvatar = { svg: svg, cells: cells, palettes: PALETTES };
})();
