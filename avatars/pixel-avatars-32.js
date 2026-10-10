/*
  DFS pixel avatars — Game Boy style portraits: four tones, 32×32 cells.
  Standalone: window.dfsPixelAvatar = { svg(seed, opts), cells(seed, opts), palettes }

  A seed (member id, name, anything) always gives the same face. Tones are
  indexes 0..3 (dark → light) into a palette; the palette is picked at render time,
  so one face can be drawn in blue, beige or night colours.
*/
(function () {
  'use strict';

  var G = 32;

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
  function ellipse(cx, cy, rx, ry, taper, lean) {
    // taper narrows the lower half (chin), lean shifts the lower half sideways (3/4 view)
    var m = mask();
    for (var y = 0; y < G; y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      var w = rx * Math.sqrt(1 - dy * dy);
      var ox = 0;
      if (dy > 0) { w *= 1 - (taper || 0) * dy; ox = (lean || 0) * dy; }
      for (var x = 0; x < G; x++) if (Math.abs(x + 0.5 - cx - ox) <= w) m[y * G + x] = 1;
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

  // ---------- canvas of tone indexes (-1 = background) ----------
  function Canvas() { this.t = new Int8Array(G * G).fill(-1); }
  Canvas.prototype.paint = function (m, tone) { for (var i = 0; i < G * G; i++) if (m[i]) this.t[i] = tone; return this; };
  Canvas.prototype.set = function (x, y, tone) { if (inside(x, y)) this.t[y * G + x] = tone; };
  Canvas.prototype.get = function (x, y) { return inside(x, y) ? this.t[y * G + x] : -1; };
  Canvas.prototype.hline = function (x0, x1, y, tone) { for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, tone); };
  Canvas.prototype.vline = function (x, y0, y1, tone) { for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, tone); };
  Canvas.prototype.checker = function (m, a, b) { for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (m[y * G + x]) this.t[y * G + x] = ((x + y) & 1) ? a : b; };

  // ---------- the portrait ----------
  // Head shape: the upper half is an ellipse, the lower half follows a jaw profile.
  function headMask(cx, cy, rx, ry, jaw, lean) {
    var m = mask();
    for (var y = 0; y < G; y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      var w, ox = 0;
      if (dy <= 0) w = rx * Math.sqrt(1 - dy * dy);
      else {
        var ell = Math.sqrt(1 - dy * dy);
        if (jaw === 'round') w = rx * ell * (1 - 0.18 * dy);
        else if (jaw === 'pointed') w = rx * Math.min(ell, 1.25 * (1 - dy));
        else if (jaw === 'square') w = rx * (dy < 0.78 ? 1 - 0.12 * dy : Math.min(0.9, 4.2 * (1 - dy)));
        else w = rx * Math.min(ell * 0.98, 1.6 * (1 - dy));            // 'long': narrow, drops to a soft point
        ox = lean * dy;
      }
      for (var x = 0; x < G; x++) if (Math.abs(x + 0.5 - cx - ox) <= w) m[y * G + x] = 1;
    }
    return m;
  }

  function portrait(seed) {
    var rand = mulberry(hashSeed(seed));
    var c = new Canvas();
    var f = chance(rand, 0.5) ? 1 : -1;                   // facing: +1 looks to the viewer's right
    var skin = pick(rand, [3, 3, 2, 2, 2, 1]);
    var hairTone = pick(rand, [0, 0, 0, 0, 1, 1, 2]);
    var shade = Math.max(0, skin - 1);                    // shadow tone on the skin
    var style = pick(rand, ['short', 'short', 'quiff', 'side', 'side', 'bob', 'long', 'bun', 'buzz', 'bald', 'spiky', 'curly', 'cap', 'capback', 'hood', 'beanie']);
    var clothes = pick(rand, [0, 0, 1, 1, 2]);
    if (style === 'hood') { clothes = pick(rand, [0, 1]); if (skin < 2) skin = 2; shade = skin - 1; }
    var hooded = style === 'hood';
    var collar = pick(rand, ['crew', 'crew', 'v', 'turtle', 'shirt']);
    var look = chance(rand, 0.5) ? 1 : -1;
    var jaw = pick(rand, ['round', 'round', 'pointed', 'square', 'square', 'long']);
    var brows = pick(rand, ['flat', 'flat', 'stern', 'stern', 'worried', 'raised', 'thick', 'thick']);
    var eyes = hooded ? 'normal' : pick(rand, ['normal', 'normal', 'normal', 'wide', 'narrow', 'narrow', 'closed']);
    var mouth = pick(rand, ['line', 'line', 'smile', 'smile', 'grin', 'frown', 'smirk', 'small', 'open']);
    if (eyes === 'closed') mouth = pick(rand, ['smile', 'grin', 'line']);
    var beard = pick(rand, ['none', 'none', 'none', 'none', 'none', 'stubble', 'moustache', 'beard', 'goatee']);
    var glasses = pick(rand, ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'rect', 'rect', 'round', 'sun']);
    if (eyes === 'closed' || eyes === 'wide') glasses = 'none';
    if (hooded && chance(rand, 0.5)) glasses = 'sun';
    var earring = pick(rand, ['none', 'none', 'none', 'hoop', 'stud']);
    var headphones = style !== 'cap' && style !== 'capback' && style !== 'hood' && style !== 'beanie' && chance(rand, 0.12);
    var freckles = skin > 1 && chance(rand, 0.2), mole = chance(rand, 0.15);
    var noseLen = pick(rand, [2, 2, 3]);
    if (skin === 1 && clothes === 0) clothes = pick(rand, [1, 2]);
    var bgTone = pick(rand, [2, 2, 1]);
    if (bgTone === skin || bgTone === clothes) bgTone = skin === 2 ? (clothes === 1 ? 3 : 1) : 2;
    if (skin === 1) bgTone = pick(rand, [2, 3]);

    // geometry (tuned by eye on the 32 grid)
    var cx = 16, cy = 12 + rand() * 1.4;
    var rx = 7.4 + rand() * 2.2, ry = 9.2 + rand() * 1.8;
    if (jaw === 'long') { rx = Math.min(rx, 8.2); ry = Math.max(ry, 10.4); }
    if (jaw === 'square') rx = Math.max(rx, 8.2);
    var head = headMask(cx, cy, rx, ry, jaw, f * (0.6 + rand() * 1.2));
    var headD = dilate(head);
    var chinY = Math.round(cy + ry) - 1;                  // last row of the face
    var ey = 13 + Math.round(rand() * 0.8);
    var farX = cx - f * (rx > 8.6 ? 3 : 2), nearX = cx + f * (rx > 8.6 ? 4 : 3);
    var mouthY = Math.round(ey + (chinY - ey) * 0.6);
    var hairBase = ey - 5 + Math.floor(rand() * 3);         // high forehead .. low hairline
    function hairline(x) { var d = (x - cx) / rx; return hairBase + Math.round(d * d * 2.6); }

    // --- torso ---
    var torso = ellipse(cx + f * 0.5, 36, 15.5, 9.5, 0, 0);
    c.paint(torso, clothes);
    // neck
    var neck = rect(cx - 3 + f, chinY - 2, cx + 3 + f, 29);
    c.paint(neck, skin);
    c.paint(intersect(neck, rect(0, chinY + 1, G, chinY + 2)), shade);               // shadow under the chin
    c.paint(intersect(neck, rect(cx - 3 + f - (f > 0 ? 0 : 0), chinY + 1, cx - 3 + f, 29)), shade);
    if (f < 0) c.paint(intersect(neck, rect(cx + 3 + f, chinY + 1, cx + 3 + f, 29)), shade);
    // collar
    if (collar === 'v') c.paint(intersect(torso, where(function (x, y) { return y >= 27 && y <= 29 && Math.abs(x - cx - f) <= 29 - y; })), skin);
    if (collar === 'turtle') { c.paint(intersect(neck, rect(0, chinY + 2, G, 31)), clothes); c.hline(cx - 3 + f, cx + 3 + f, chinY + 3, clothes === 0 ? 1 : clothes - 1); }
    if (collar === 'shirt') { c.set(cx - 4 + f, 27, 3); c.set(cx - 4 + f, 28, 3); c.set(cx + 4 + f, 27, 3); c.set(cx + 4 + f, 28, 3); }
    c.paint(topEdge(subtract(torso, neck)), 0);                                      // collar line
    if (collar === 'turtle') c.paint(topEdge(intersect(neck, rect(0, chinY + 2, G, 31))), 0);

    // --- long hair behind the neck ---
    var hairMask = mask();
    if (style === 'long') {
      hairMask = union(hairMask, intersect(dilate(head, 2), rect(0, 12, G, 31)));
      hairMask = subtract(hairMask, erode(head));
      hairMask = union(hairMask, rect(cx - 11, 16, cx - 9, 29), rect(cx + 9, 16, cx + 11, 29));
      hairMask = subtract(hairMask, union(neck, rect(cx - 7, chinY + 1, cx + 7, 31)));
      hairMask = intersect(hairMask, where(function (x, y) { return y < 30; }));
    }

    // --- head ---
    c.paint(head, skin);
    if (skin > 1) c.paint(intersect(head, where(function (x, y) { return y >= ey - 3 && (x - cx) * -f >= rx - 2.2 - (y > mouthY ? 1.5 : 0); })), shade);
    else { c.hline(nearX - f, nearX + f, ey + 2, 2); c.hline(nearX, nearX + f, ey + 3, 2); c.hline(cx + f, cx + f * 4, hairBase, 2); c.set(cx + f * 2, hairBase + 1, 2); c.set(cx - f * 3, chinY - 1, 2); }
    if (jaw === 'square' && skin > 1) { c.set(cx - f * Math.round(rx - 2), chinY - 1, shade); c.set(cx - f * Math.round(rx - 3), chinY, shade); }
    // ear on the far side
    var earX = Math.round(cx - f * rx);
    var ear = rect(Math.min(earX, earX - f), ey - 1, Math.max(earX, earX - f), ey + 2);
    c.paint(ear, skin > 1 ? shade : skin);
    c.paint(edge(union(head, ear)), 0);                                              // the face gets its own outline (chin included)

    // --- eyes, brows, nose, mouth ---
    function eye(ex) {
      if (eyes === 'closed') { c.hline(ex - 1, ex + 1, ey, 0); return; }
      if (eyes === 'wide') { c.hline(ex - 1, ex + 1, ey - 2, 0); c.hline(ex - 1, ex + 1, ey - 1, 3); c.set(ex + look, ey, 3); c.set(ex, ey, 0); c.set(ex - look, ey, 3); return; }
      if (glasses === 'none') c.hline(ex - 1, ex + 1, ey - 1, 0);                   // upper lid
      c.set(ex + look, ey, 3); c.set(ex, ey, 0);                                    // white + pupil, both eyes looking the same way
      if (eyes === 'narrow') { c.set(ex + look, ey, skin > 1 ? skin : 2); c.hline(ex - 1, ex + 1, ey + 1, shade === skin ? 0 : shade); }
    }
    eye(farX); eye(nearX);
    // brows
    function brow(ex, dir, near) {
      var y = ey - (brows === 'thick' ? 2 : 3);
      if (brows === 'raised' && near) y -= 1;
      for (var i = -1; i <= 2; i++) {
        var x = ex + i * dir, yy = y;                                                 // dir: +1 draws outward from the inner end
        if (brows === 'stern') yy = i === -1 ? y + 1 : (i === 2 ? y - 1 : y);
        if (brows === 'worried') yy = i === -1 ? y - 1 : (i === 2 ? y + 1 : y);
        c.set(x, yy, 0);
        if (brows === 'thick' && i >= 0) c.set(x, yy - 1, 0);
      }
    }
    brow(farX, -f, false); brow(nearX, f, true);
    // nose: a small L toward the near side
    c.vline(cx + f, ey + 1, ey + noseLen, 0); c.set(cx + f * 2, ey + noseLen, 0);
    if (skin > 1) { c.set(cx, ey + 2, shade); c.set(cx + f, ey + noseLen + 1, shade); }
    // mouth
    var mx = cx + f;
    if (mouth === 'line') c.hline(mx - 1, mx + 2, mouthY, 0);
    if (mouth === 'small') c.hline(mx, mx + 1, mouthY, 0);
    if (mouth === 'smile') { c.hline(mx - 1, mx + 2, mouthY, 0); c.set(mx - 2, mouthY - 1, 0); c.set(mx + 3, mouthY - 1, 0); }
    if (mouth === 'frown') { c.hline(mx - 1, mx + 2, mouthY, 0); c.set(mx - 2, mouthY + 1, 0); c.set(mx + 3, mouthY + 1, 0); }
    if (mouth === 'smirk') { c.hline(mx - 1, mx + 1, mouthY, 0); c.set(mx + f * 2, mouthY - 1, 0); }
    if (mouth === 'open') { c.hline(mx - 1, mx + 2, mouthY - 1, 0); c.hline(mx, mx + 1, mouthY, 3); c.set(mx - 1, mouthY, 0); c.set(mx + 2, mouthY, 0); c.hline(mx - 1, mx + 2, mouthY + 1, 0); }
    if (mouth === 'grin') { c.hline(mx - 2, mx + 3, mouthY - 1, 0); c.hline(mx - 1, mx + 2, mouthY, 3); c.set(mx - 2, mouthY, 0); c.set(mx + 3, mouthY, 0); c.hline(mx - 1, mx + 2, mouthY + 1, 0); }
    if (skin === 1 && mouth !== 'grin' && mouth !== 'open') c.hline(mx - 1, mx + 2, mouthY + 1, 2);  // lower lip highlight
    // freckles / mole
    if (freckles) { c.set(farX - f, ey + 3, shade); c.set(farX + f, ey + 4, shade); c.set(nearX + f * 2, ey + 3, shade); c.set(nearX, ey + 4, shade); }
    if (mole) c.set(mx + f * 4, mouthY + 1, 0);
    // facial hair
    var jawM = intersect(head, where(function (x, y) { return y >= mouthY - 1; }));
    var lips = rect(mx - 3, mouthY - 2, mx + 4, mouthY + 1);
    if (beard === 'moustache' || beard === 'goatee') { c.hline(mx - 2, mx + 3, mouthY - 2, 0); c.set(mx - 3, mouthY - 1, 0); c.set(mx + 4, mouthY - 1, 0); }
    if (beard === 'goatee') c.paint(intersect(jawM, rect(mx - 1, mouthY + 2, mx + 2, chinY)), 0);
    if (beard === 'beard') { c.paint(subtract(jawM, union(lips, erode(jawM, 3))), 0); c.hline(mx - 2, mx + 3, mouthY - 2, 0); }
    if (beard === 'stubble') c.checker(subtract(jawM, union(lips, erode(jawM, 2))), skin, shade === skin ? 0 : shade);

    // --- hair ---
    var cap = union(intersect(headD, where(function (x, y) { return y >= 1 && y < hairline(x); })), intersect(dilate(head, 2), where(function (x, y) { return y >= 1 && y < hairBase - 5; })));
    var parting = chance(rand, 0.35) ? intersect(cap, where(function (x, y) { return x === cx - f * 3 && y >= hairline(x) - 3; })) : null;
    var rim = intersect(subtract(headD, erode(head)), where(function (x, y) { return y < ey - 1 && (x - cx) * -f > 2; })); // sideburn on the far side
    var texture = null;
    if (style === 'short') { hairMask = union(hairMask, cap, rim); if (parting) hairMask = subtract(hairMask, parting); }
    if (style === 'quiff') hairMask = union(hairMask, cap, rim, intersect(ellipse(cx + f * 3, hairBase - 5, 5.5, 3.4, 0, 0), where(function (x, y) { return y >= 1; })));
    if (style === 'side') hairMask = union(hairMask, cap, rim, intersect(head, where(function (x, y) { return y < Math.min(ey - 1, hairBase + 1.5 - f * (x - cx) * 0.55); })));
    if (style === 'bob') hairMask = union(hairMask, cap, intersect(subtract(dilate(head, 2), erode(head, 3)), where(function (x, y) { return y < mouthY + 1 && y > 5; })), intersect(head, rect(0, 0, G, hairBase + 1)));
    if (style === 'long') hairMask = union(hairMask, cap, intersect(subtract(dilate(head, 2), erode(head, 3)), where(function (x, y) { return y > 5; })), chance(rand, 0.5) ? intersect(head, rect(0, 0, G, hairBase + 1)) : intersect(head, where(function (x, y) { return y < Math.min(ey - 1, hairBase + 1.5 - f * (x - cx) * 0.55); })));
    if (style === 'bun') hairMask = union(hairMask, cap, rim, ellipse(cx - f * 5, hairBase - 5, 3, 2.6, 0, 0));
    if (style === 'buzz') { hairMask = union(hairMask, cap); texture = [0, skin]; }
    if (style === 'spiky') {
      var tall = union(cap, intersect(dilate(head, 3), where(function (x, y) { return y >= 0 && y < hairBase - 6; })));
      var capTop = 32; for (var yy = 0; yy < G; yy++) { if (tall.slice(yy * G, yy * G + G).some(Boolean)) { capTop = yy; break; } }
      hairMask = union(hairMask, subtract(tall, where(function (x, y) { var k = (x + f + 64) % 4; return (y === capTop && k !== 1) || (y === capTop + 1 && k === 3); })), rim);
    }
    if (style === 'curly') { hairMask = union(hairMask, intersect(dilate(head, 2), where(function (x, y) { return y < hairline(x) + 1 && y >= 0; })), dilate(rim)); texture = [hairTone, hairTone < 2 ? hairTone + 1 : 1]; }
    if (style === 'cap' || style === 'capback' || style === 'beanie') {
      hairMask = union(hairMask, rim);                               // hair peeks out under the cap
      var dome = intersect(headD, where(function (x, y) { return y >= 0 && y < hairline(x) - 1; }));
      var capTone = pick(rand, [0, 1, 2]);
      c.paint(hairMask, hairTone);
      var bandY = hairBase - 1;
      if (style === 'cap' || style === 'capback') {
        c.paint(dome, capTone);
        var dir = style === 'cap' ? f : -f;
        c.hline(cx + dir * 2, cx + dir * 10, bandY + 1, capTone); c.hline(cx + dir * 2, cx + dir * 10, bandY + 2, 0);  // brim
        c.hline(cx - 6, cx + 6, bandY, 0);                                                                         // band
        if (style === 'cap') { var lx = cx + f * 1 - 1; c.hline(lx, lx + 2, bandY - 4, capTone === 3 ? 0 : 3); c.hline(lx, lx + 2, bandY - 3, capTone === 3 ? 0 : 3); c.set(lx + 1, bandY - 4, capTone); } // logo
        else c.set(cx - f, bandY - 3, 0);                                                                           // button
      } else {
        c.paint(union(dome, intersect(headD, rect(0, bandY - 1, G, bandY + 1))), capTone);
        c.hline(cx - 8, cx + 8, bandY + 1, 0); c.hline(cx - 8, cx + 8, bandY, capTone === 0 ? 1 : capTone - 1); // folded band
        c.paint(ellipse(cx, 1.5, 1.6, 1.4, 0, 0), capTone);
      }
      c.paint(edge(union(dome, intersect(headD, rect(0, bandY - 1, G, bandY + 1)))), 0);
      hairMask = mask();
    } else if (style === 'hood') {
      var hood = subtract(intersect(dilate(head, 3), rect(0, 0, G, mouthY + 4)), erode(head));
      c.paint(hood, clothes);
      c.paint(edge(hood), 0);
      c.paint(intersect(head, where(function (x, y) { return y < hairline(x) - 1; })), shade);     // face in the hood's shadow
      c.set(cx - 2, 28, 3); c.set(cx + 3, 28, 3); c.vline(cx - 2, 29, 30, 3); c.vline(cx + 3, 29, 30, 3); // drawstrings
      hairMask = mask();
    } else if (style !== 'bald') {
      if (texture) c.checker(hairMask, texture[0], texture[1]); else c.paint(hairMask, hairTone);
      if (hairTone !== 0) c.paint(edge(hairMask), 0);
      // a highlight stroke on the lit side
      var hl = hairTone < 2 ? hairTone + 1 : 1;
      if (!texture && chance(rand, 0.7)) { c.set(cx - 4, hairBase - 5, hl); c.set(cx - 3, hairBase - 5, hl); c.set(cx - 5, hairBase - 4, hl); if (style === 'quiff') { c.set(cx + f * 2, hairBase - 7, hl); c.set(cx + f * 3, hairBase - 7, hl); } }
    }
    if (style === 'bald') c.paint(intersect(erode(head), where(function (x, y) { return y < hairBase - 2; })), skin);

    // --- headphones over everything ---
    if (headphones) {
      var band = intersect(subtract(dilate(head, 2), head), where(function (x, y) { return y < hairBase - 3; }));
      c.paint(band, 0);
      [cx - Math.round(rx) - 1, cx + Math.round(rx) + 1].forEach(function (x) { c.paint(rect(x - 1, ey - 2, x + 1, ey + 2), 0); c.vline(x, ey - 1, ey + 1, 1); });
    }
    // --- glasses ---
    if (glasses !== 'none') {
      var gTone = 0;
      [farX, nearX].forEach(function (ex) {
        if (glasses === 'round') {
          c.hline(ex - 1, ex + 1, ey - 1, gTone); c.hline(ex - 1, ex + 1, ey + 1, gTone);
          c.set(ex - 2, ey, gTone); c.set(ex + 2, ey, gTone);
        } else {
          c.hline(ex - 2, ex + 2, ey - 1, gTone); c.hline(ex - 2, ex + 2, ey + 1, gTone);
          c.set(ex - 2, ey, gTone); c.set(ex + 2, ey, gTone);
          if (glasses === 'sun') c.hline(ex - 1, ex + 1, ey, 1);
        }
      });
      c.hline(farX + f * 2, nearX - f * 2, ey, gTone);                         // bridge
      c.hline(farX - f * 2, cx - f * Math.round(rx) + f, ey, gTone);           // temple to the far ear
    }
    // --- earring on the far ear ---
    if (earring === 'stud') c.set(earX, ey + 2, 3);
    if (earring === 'hoop') { c.set(earX, ey + 3, 0); c.set(earX - 1, ey + 4, 0); c.set(earX + 1, ey + 4, 0); c.set(earX, ey + 5, 0); c.set(earX, ey + 4, bgTone); }

    // --- outline pass: dark line around the whole figure ---
    var fig = where(function (x, y) { return c.t[y * G + x] !== -1; });
    var sil = edge(fig);
    for (var i = 0; i < G * G; i++) if (sil[i]) c.t[i] = 0;
    return { tones: c.t, bg: bgTone, facing: f };
  }

  var PALETTES = {
    cream: ['#1e1e1e', '#7b766d', '#dcd3c4', '#fbf7ee'],
    blue: ['#143a5e', '#0297db', '#9bd9f7', '#eff9fd'],
    ink: ['#1e1e1e', '#0297db', '#bfe8fa', '#fbf7ee'],
    night: ['#0e1628', '#1a97d7', '#8fd3ff', '#e7f3ff'],
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']
  };

  function cells(seed) { return portrait(seed); }

  function svg(seed, opts) {
    opts = opts || {};
    var pal = Array.isArray(opts.palette) ? opts.palette : (PALETTES[opts.palette] || PALETTES.cream);
    var p = portrait(seed);
    var bg = opts.background === undefined ? pal[p.bg] : opts.background;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + G + ' ' + G + '" shape-rendering="crispEdges" role="img" aria-label="pixel avatar">';
    if (bg) s += '<rect width="' + G + '" height="' + G + '" fill="' + bg + '"/>';
    for (var y = 0; y < G; y++) {
      var x = 0;
      while (x < G) {
        var t = p.tones[y * G + x];
        if (t < 0) { x++; continue; }
        var w = 1;
        while (x + w < G && p.tones[y * G + x + w] === t) w++;
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + pal[t] + '"/>';
        x += w;
      }
    }
    return s + '</svg>';
  }

  window.dfsPixelAvatar = { svg: svg, cells: cells, palettes: PALETTES, grid: G };
})();
