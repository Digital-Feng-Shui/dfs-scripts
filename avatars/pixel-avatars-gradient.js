/*
  DFS pixel avatars — organic pixel busts with soft gradient colouring.
  Standalone: window.dfsPixelAvatar = { svg(seed, opts), cells(seed, opts), options }

  Every avatar is fully determined by its seed (a string or number), so the same
  member always gets the same face. Nothing here touches the DOM.
*/
(function () {
  'use strict';

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

  // Value noise with smooth interpolation, in -1..1
  function makeNoise(rand) {
    var perm = [], vals = [], i, j, t;
    for (i = 0; i < 256; i++) { perm[i] = i; vals[i] = rand() * 2 - 1; }
    for (i = 255; i > 0; i--) { j = Math.floor(rand() * (i + 1)); t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    function lat(ix, iy) { return vals[perm[(perm[ix & 255] + iy) & 255]]; }
    function fade(x) { return x * x * (3 - 2 * x); }
    return function (x, y) {
      var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      var u = fade(fx), v = fade(fy);
      var a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
  }
  function fbm(noise, x, y, oct) {
    var s = 0, amp = 1, f = 1, n = 0;
    for (var i = 0; i < oct; i++) { s += amp * noise(x * f + i * 19.7, y * f + i * 7.3); n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  }

  // ---------- colour (OKLab / OKLCH) ----------
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function gam(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function cbrt(x) { return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3); }
  function oklabToLinear(L, a, b) {
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  function inGamut(rgb) { return rgb[0] >= -0.002 && rgb[0] <= 1.002 && rgb[1] >= -0.002 && rgb[1] <= 1.002 && rgb[2] >= -0.002 && rgb[2] <= 1.002; }
  // Pull chroma in until the colour fits sRGB, then convert to hex
  function labToHex(L, a, b) {
    L = Math.max(0, Math.min(1, L));
    var rgb = oklabToLinear(L, a, b);
    if (!inGamut(rgb)) {
      var lo = 0, hi = 1;
      for (var i = 0; i < 10; i++) {
        var mid = (lo + hi) / 2;
        if (inGamut(oklabToLinear(L, a * mid, b * mid))) lo = mid; else hi = mid;
      }
      rgb = oklabToLinear(L, a * lo, b * lo);
    }
    var out = '#';
    for (var k = 0; k < 3; k++) {
      var v = Math.round(gam(Math.max(0, Math.min(1, rgb[k]))) * 255);
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }
  function lch(L, C, h) { var r = h * Math.PI / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; }
  function mixLab(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }
  // Multi-stop gradient evaluated at t in 0..1
  function ramp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    var n = stops.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x));
    return mixLab(stops[i], stops[i + 1], x - i);
  }

  // ---------- recipe ----------
  // A colour scheme = hues + lightness for hair, face and body regions, in OKLCH.
  function scheme(rand) {
    var r = rand(), base = rand() * 360;
    var hair, face, body, stripes = false;
    function hue(h) { return ((h % 360) + 360) % 360; }
    function vivid(h, L) { return lch(L, 0.17 + rand() * 0.07, hue(h)); }
    function soft(h, L) { return lch(L, 0.06 + rand() * 0.05, hue(h)); }
    if (r < 0.28) {
      // analogous: one family, drifting across the bust
      hair = [vivid(base, 0.62), vivid(base + 25, 0.72)];
      face = [vivid(base + 55, 0.82), soft(base + 80, 0.9)];
      body = [vivid(base - 30, 0.55), vivid(base - 10, 0.45)];
    } else if (r < 0.56) {
      // warm head, cool body
      var warm = 30 + rand() * 60;           // orange .. yellow
      var cool = 200 + rand() * 80;          // teal .. violet
      hair = [vivid(warm, 0.7), vivid(warm - 40, 0.62)];
      face = [vivid(warm + 20, 0.86), soft(warm + 10, 0.92)];
      body = [vivid(cool, 0.48), vivid(cool + 30, 0.56)];
    } else if (r < 0.78) {
      // cool head, bright warm face, deep body (DFS blue family often)
      var c2 = rand() < 0.5 ? 235 + rand() * 30 : 150 + rand() * 60;
      var w2 = rand() * 70;                  // red .. yellow
      hair = [vivid(c2, 0.58), vivid(c2 + 20, 0.68)];
      face = [vivid(w2, 0.78), vivid(w2 + 40, 0.86)];
      body = [vivid(c2 - 60, 0.46), vivid(c2 - 20, 0.56)];
    } else {
      // rainbow stripes through the hair, calm body
      stripes = true;
      var h0 = rand() * 360, span = 120 + rand() * 120;
      hair = [];
      for (var i = 0; i < 6; i++) hair.push(vivid(h0 + span * i / 5, 0.62 + 0.2 * Math.sin(i * 1.7)));
      face = [vivid(h0 + span, 0.84), soft(h0 + span + 30, 0.9)];
      body = [vivid(h0 - 40, 0.55), vivid(h0 - 60, 0.5)];
    }
    // sometimes the face goes cream / sand like the reference
    if (rand() < 0.12) face = [soft(70 + rand() * 30, 0.9), soft(80, 0.95)];
    return { hair: hair, face: face, body: body, stripes: stripes };
  }

  // Silhouette blobs for one of a few bust templates. Units are grid cells,
  // tuned on a 20-cell grid and scaled from there.
  function template(rand, G) {
    var u = G / 20;
    var cx = G / 2 + (rand() - 0.5) * 2 * u;
    var cy = (8.6 + (rand() - 0.5) * 1.6) * u;
    var rx = (4.6 + rand() * 0.9) * u, ry = (5.2 + rand() * 0.9) * u;
    var side = rand() < 0.5 ? -1 : 1;     // which way the face points / hair leans
    var kind = rand();
    var blobs = [];
    function add(role, x, y, rx, ry, w) { blobs.push({ role: role, x: x, y: y, rx: rx, ry: ry, w: w || 1 }); }

    if (kind < 0.25) {
      // round head with a big hair cap, maybe a stub of body
      rx *= 1.15; ry *= 1.1;
      add('face', cx, cy + 0.6 * u, rx, ry, 1);
      add('hair', cx + side * 0.6 * u, cy - ry * 0.45, rx * 1.1, ry * 0.65, 1.15);
      if (rand() < 0.35) add('hair', cx - side * rx * 0.9, cy - ry * 0.75, 2 * u, 2 * u, 1); // bun
      if (rand() < 0.5) add('body', cx + side * 0.4 * u, cy + ry + 2.6 * u, rx * 0.8, 3 * u, 0.9);
      return { blobs: blobs, eye: { x: cx + side * 0.3 * u, y: cy + 0.3 * u }, side: side, profile: false };
    }
    if (kind < 0.55) {
      // front bust: head, hair, neck, shoulders
      add('face', cx, cy, rx, ry, 1);
      add('hair', cx + side * 0.5 * u, cy - ry * 0.62, rx * 1.18, ry * 0.68, 1.2);
      if (rand() < 0.55) add('hair', cx + side * rx * 0.95, cy + 0.2 * u, rx * 0.42, ry * 1.05, 1); // hair falling down one side
      add('neck', cx + side * 0.3 * u, cy + ry + 1.2 * u, rx * 0.5, 3 * u, 1);
      add('body', cx, cy + ry + 4.6 * u, rx * 1.5, 3.2 * u, 1.1);
      return { blobs: blobs, eye: { x: cx + side * 0.2 * u, y: cy - 0.1 * u }, side: side, profile: false };
    }
    if (kind < 0.78) {
      // profile: cranium at the back, face forward with a nose, neck set back
      var fx = cx + side * 1.6 * u;
      add('hair', cx - side * 1.2 * u, cy - 1.2 * u, rx * 1.05, ry * 0.95, 1.2);
      add('face', fx, cy + 0.8 * u, rx * 0.8, ry * 0.82, 1);
      add('face', fx + side * rx * 0.8, cy + 1.2 * u, 1.5 * u, 1.5 * u, 0.9); // nose
      if (rand() < 0.4) add('hair', cx - side * rx * 1.1, cy + 1.5 * u, 1.6 * u, 3.5 * u, 1); // ponytail down the back
      add('neck', cx - side * 0.8 * u, cy + ry + 1.2 * u, rx * 0.5, 3 * u, 1);
      if (rand() < 0.6) add('body', cx - side * 0.6 * u, cy + ry + 4.8 * u, rx * 1.45, 3 * u, 1.1);
      return { blobs: blobs, eye: { x: fx + side * 0.7 * u, y: cy - 0.1 * u }, side: side, profile: true };
    }
    // tall hair leaning to one side, narrow torso straight down
    add('face', cx, cy + 0.8 * u, rx, ry, 1);
    add('hair', cx + side * 1.8 * u, cy - ry * 0.95, rx * 0.75, ry * 1.0, 1.3);
    add('hair', cx - side * 0.3 * u, cy - ry * 0.55, rx * 1.05, ry * 0.5, 1);
    add('neck', cx, cy + ry + 1.5 * u, rx * 0.55, 3 * u, 1);
    add('body', cx + side * 0.3 * u, cy + ry + 5 * u, rx * 0.9, 3.5 * u, 1);
    return { blobs: blobs, eye: { x: cx + side * 0.2 * u, y: cy + 0.4 * u }, side: side, profile: false };
  }

  var DEFAULTS = {
    grid: 20,          // cells per side
    threshold: 0.42,   // field level that becomes a pixel (lower = fatter)
    edgeNoise: 0.34,   // how much the silhouette edge wobbles
    strays: 2,         // max loose pixels kept around the edge
    bandChance: 0.55,  // chance of the dark shadow band across the eyes
    jitter: 0.04,      // per-pixel lightness variation
    sheen: 0.07,       // light from the top-left
    eyeDark: '#1a1a1a',
    eyeLight: '#ffffff',
    background: ''     // '' = transparent; any CSS colour fills the square
  };

  // Returns { grid, cells: [{x, y, fill}], seed }
  function cells(seed, opts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (opts || {})) if (opts[k] !== undefined) o[k] = opts[k];
    var G = o.grid, u = G / 20;
    var rand = mulberry(hashSeed(seed));
    var noise = makeNoise(rand);
    var tpl = template(rand, G);
    var col = scheme(rand);

    // ---- silhouette field ----
    // (1-s)^2 crosses the base threshold at s = 1 - sqrt(T): stretch the radii so that
    // crossing sits on the blob's stated edge.
    var K = 1 / Math.sqrt(1 - Math.sqrt(0.42));
    function blobVal(b, x, y) {
      var dx = (x - b.x) / (b.rx * K), dy = (y - b.y) / (b.ry * K), s = dx * dx + dy * dy;
      return s >= 1 ? 0 : (1 - s) * (1 - s);
    }
    var nf = (0.15 + rand() * 0.06) / u;      // edge noise frequency
    var nOff = rand() * 100;
    var mask = [], field = [], x, y, i;
    for (y = 0; y < G; y++) {
      mask[y] = []; field[y] = [];
      for (x = 0; x < G; x++) {
        var px = x + 0.5, py = y + 0.5, f = 0;
        for (i = 0; i < tpl.blobs.length; i++) f += tpl.blobs[i].w * blobVal(tpl.blobs[i], px, py);
        f += o.edgeNoise * fbm(noise, px * nf + nOff, py * nf, 2);
        field[y][x] = f;
        mask[y][x] = f > o.threshold;
      }
    }
    // eyes: two pairs of [dark, light] pixels, both looking the same way
    var look = rand() < 0.5 ? -1 : 1;
    var gap = rand() < 0.6 ? 1 : 2;
    var ex = Math.round(tpl.eye.x - (4 + gap) / 2 + (tpl.profile ? tpl.side * 0.5 : 0));
    var ey = Math.round(tpl.eye.y - 0.5);
    var eyes = {};
    var pairs = [ex, ex + 2 + gap];
    for (i = 0; i < 2; i++) {
      var a = pairs[i], d = look < 0 ? a : a + 1, l = look < 0 ? a + 1 : a;
      if (d >= 0 && d < G && ey >= 0 && ey < G) { eyes[d + ',' + ey] = o.eyeDark; mask[ey][d] = true; }
      if (l >= 0 && l < G && ey >= 0 && ey < G) { eyes[l + ',' + ey] = o.eyeLight; mask[ey][l] = true; }
    }
    // tidy: fill one-cell holes, keep only a few stray pixels
    function filled(x, y) { return x >= 0 && y >= 0 && x < G && y < G && mask[y][x]; }
    var strays = [];
    for (y = 0; y < G; y++) for (x = 0; x < G; x++) {
      var n4 = filled(x - 1, y) + filled(x + 1, y) + filled(x, y - 1) + filled(x, y + 1);
      if (!mask[y][x] && n4 === 4) mask[y][x] = true;
      else if (mask[y][x] && n4 === 0 && !eyes[x + ',' + y]) strays.push([x, y]);
    }
    while (strays.length > o.strays) strays.splice(Math.floor(rand() * strays.length), 1).forEach(function (p) { mask[p[1]][p[0]] = false; });

    // ---- colour field ----
    var angle = (rand() < 0.75 ? (rand() - 0.5) * 70 : 90 + (rand() - 0.5) * 50) * Math.PI / 180;
    var dir = [Math.sin(angle), Math.cos(angle)];           // mostly top->bottom bands
    var warpAmp = (col.stripes ? 0.12 : 0.18) + rand() * 0.18;
    var warpF = (0.1 + rand() * 0.08) / u, warpOff = rand() * 100;
    var global = rand() < 0.5;                               // one gradient across everything
    var allStops = col.hair.concat(col.face, col.body);
    var band = rand() < o.bandChance;
    var bandW = (1.1 + rand() * 0.5) * u, bandS = 0.55 + rand() * 0.3;
    var bandCol = lch(0.22, 0.05, 40 + rand() * 40);
    var jitF = 0.9 / u, jitOff = rand() * 100;
    var hueDrift = (rand() - 0.5) * 60;                      // hue slowly turns across the bust

    // bounding box of the shape, to normalise the gradient coordinate
    var minT = Infinity, maxT = -Infinity;
    for (y = 0; y < G; y++) for (x = 0; x < G; x++) if (mask[y][x]) {
      var tt = (x + 0.5) * dir[0] + (y + 0.5) * dir[1];
      if (tt < minT) minT = tt; if (tt > maxT) maxT = tt;
    }
    var span = Math.max(1, maxT - minT);
    function coord(px, py) {
      var t = ((px * dir[0] + py * dir[1]) - minT) / span;
      return t + warpAmp * fbm(noise, px * warpF + warpOff, py * warpF, 2);
    }
    function regionT(role, px, py) {
      // each region spreads its own ramp across its own vertical extent
      var lo = Infinity, hi = -Infinity;
      for (var i = 0; i < tpl.blobs.length; i++) {
        var b = tpl.blobs[i]; if (b.role !== role) continue;
        lo = Math.min(lo, b.y - b.ry); hi = Math.max(hi, b.y + b.ry);
      }
      var t = (py - lo) / Math.max(1, hi - lo);
      t = t * (1 - Math.abs(dir[0])) + ((px / G)) * Math.abs(dir[0]);
      return t + warpAmp * fbm(noise, px * warpF + warpOff, py * warpF, 2);
    }
    var out = [];
    for (y = 0; y < G; y++) for (x = 0; x < G; x++) {
      if (!mask[y][x]) continue;
      var key = x + ',' + y;
      if (eyes[key]) { out.push({ x: x, y: y, fill: eyes[key] }); continue; }
      var px = x + 0.5, py = y + 0.5, c;
      if (global) {
        c = ramp(allStops, coord(px, py));
      } else {
        // blend the regions by how strongly each blob claims this pixel
        var acc = [0, 0, 0], wsum = 0;
        for (i = 0; i < tpl.blobs.length; i++) {
          var b = tpl.blobs[i];
          var dx = (px - b.x) / (b.rx * 1.35), dy = (py - b.y) / (b.ry * 1.35);
          var w = Math.exp(-(dx * dx + dy * dy) * 1.6) * b.w * (b.role === 'hair' ? 2.2 : b.role === 'neck' ? 0.7 : 1) + 1e-5;
          var stops = b.role === 'hair' ? col.hair : b.role === 'body' ? col.body : col.face;
          var rc = ramp(stops, regionT(b.role, px, py));
          acc[0] += rc[0] * w; acc[1] += rc[1] * w; acc[2] += rc[2] * w; wsum += w;
        }
        c = [acc[0] / wsum, acc[1] / wsum, acc[2] / wsum];
      }
      // hue drift + sheen + jitter
      var hd = hueDrift * ((px * dir[0] + py * dir[1] - minT) / span - 0.5) * Math.PI / 180;
      var ca = c[1] * Math.cos(hd) - c[2] * Math.sin(hd), cb = c[1] * Math.sin(hd) + c[2] * Math.cos(hd);
      c = [c[0], ca, cb];
      c[0] += o.sheen * (((G - px) + (G - py)) / (2 * G) - 0.5) * 2;
      c[0] += o.jitter * fbm(noise, px * jitF + jitOff, py * jitF, 1);
      var hj = o.jitter * 3 * fbm(noise, px * jitF + jitOff + 50, py * jitF + 50, 1);
      c = [c[0], c[1] * Math.cos(hj) - c[2] * Math.sin(hj), c[1] * Math.sin(hj) + c[2] * Math.cos(hj)];
      if (band) {
        var dBand = (py - (ey + 0.5)) + (px - tpl.eye.x) * dir[0] * 0.6;
        var s = bandS * Math.exp(-(dBand * dBand) / (bandW * bandW));
        c = mixLab(c, bandCol, s);
      }
      out.push({ x: x, y: y, fill: labToHex(c[0], c[1], c[2]) });
    }
    return { grid: G, cells: out, seed: seed, background: o.background };
  }

  function svg(seed, opts) {
    var r = cells(seed, opts), G = r.grid, s = '';
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + G + ' ' + G + '" shape-rendering="crispEdges" role="img" aria-label="pixel avatar">';
    if (r.background) s += '<rect width="' + G + '" height="' + G + '" fill="' + r.background + '"/>';
    // merge horizontal runs of one colour into one rect (eyes are single cells anyway)
    var i = 0;
    while (i < r.cells.length) {
      var c = r.cells[i], w = 1;
      while (i + w < r.cells.length && r.cells[i + w].y === c.y && r.cells[i + w].x === c.x + w && r.cells[i + w].fill === c.fill) w++;
      s += '<rect x="' + c.x + '" y="' + c.y + '" width="' + w + '" height="1" fill="' + c.fill + '"/>';
      i += w;
    }
    return s + '</svg>';
  }

  window.dfsPixelAvatar = { svg: svg, cells: cells, defaults: DEFAULTS };
})();
