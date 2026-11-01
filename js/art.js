/* FIXER'S CUT — 絵：義体で変わる肖像、企業ロゴ、夜のヨミハマ、カットイン */

const ART_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ───────── 肖像（32×32 のドット絵、2色刷り） ───────── */

const PAL = {
  bg: '#0d1220', dot: '#1a2540', ink: '#06080d',
  blue: '#3f7cff', blueD: '#1e3f8a', blueL: '#9cc0ff',
  pink: '#ff4f9a', pinkD: '#9c2259', pinkL: '#ffb3d1',
  paper: '#e9ebee', chrome: '#d2d9e6', chromeM: '#8b97ad', chromeD: '#4a556b',
};
const SKINS = [
  ['#f3d9de', '#d9a2b3', '#9c5a74'],
  ['#e8c4b4', '#c38c80', '#7c4a4e'],
  ['#c8988a', '#9a675f', '#5b383a'],
  ['#9b6c62', '#6f4945', '#3c2527'],
];
const HAIR_COLORS = [PAL.ink, PAL.blueD, PAL.pink, PAL.paper, PAL.blue];
const HAIR_BY_ORIGIN = { corp: [0, 3, 5], street: [1, 4, 0], drifter: [2, 3, 5] };
const portraitCache = new Map();

function portrait(r, opt = {}) {
  const cyber = opt.cyber || r.cyber || [];
  const hm = (r.base ? r.base.EMP : 5) * 10;
  const hum = opt.humanity !== undefined ? opt.humanity : r.humanity;
  const m = Math.max(0, Math.min(1, 1 - hum / hm));
  const glitch = opt.glitch !== undefined ? opt.glitch : hum <= 0 ? 2 : hum <= 15 ? 1 : 0;
  const key = `${r.id}|${r.name}|${r.role}|${r.origin}|${cyber.join(',')}|${Math.round(m * 12)}|${glitch}`;
  if (portraitCache.has(key)) return portraitCache.get(key);

  const S = 32;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const rnd = mulberry32(hashStr(`${r.name}:${r.id}`));
  const px = (x, y, col) => { if (x < 0 || y < 0 || x >= S || y >= S) return; c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const glow = (x, y, col) => { c.globalAlpha = 0.45; px(x, y, col); c.globalAlpha = 1; };

  // 背景：右下に網点
  rect(0, 0, S, S, PAL.bg);
  for (let y = 0; y < S; y += 3) for (let x = (y / 3) % 2 ? 1 : 0; x < S; x += 3) if (x + y > 24) px(x, y, PAL.dot);

  const skin = SKINS[Math.floor(rnd() * SKINS.length)];
  const hairCol = HAIR_COLORS[Math.floor(rnd() * HAIR_COLORS.length)];
  const styles = HAIR_BY_ORIGIN[r.origin] || [0];
  const hairStyle = styles[Math.floor(rnd() * styles.length)];
  const rx = 6 + Math.floor(rnd() * 2);
  const cy = 13, ry = 8.5;
  const hw = (y) => {
    const t = (y - cy) / ry;
    if (Math.abs(t) > 1) return -1;
    let w = Math.round(rx * Math.sqrt(1 - t * t));
    if (y > 16) w -= Math.round((y - 16) * 0.5);
    return Math.max(w, 1);
  };
  const L = (y) => 16 - hw(y);
  const Rr = (y) => 15 + hw(y);
  const inFace = (x, y) => hw(y) > 0 && x >= L(y) && x <= Rr(y);

  // 胴と首
  const clothes = { solo: PAL.ink, net: PAL.blueD, tech: PAL.chromeD, med: PAL.paper, driver: PAL.ink }[r.role] || PAL.ink;
  rect(8, 24, 16, 2, clothes);
  rect(4, 26, 24, 6, clothes);
  rect(13, 19, 6, 6, skin[1]);
  rect(13, 19, 6, 1, skin[2]);

  // 顔
  for (let y = 4; y <= 22; y++) {
    if (hw(y) <= 0) continue;
    for (let x = L(y); x <= Rr(y); x++) px(x, y, x >= Rr(y) - 1 ? skin[1] : skin[0]);
  }
  for (let y = 12; y <= 15; y++) { px(L(y) - 1, y, skin[1]); px(Rr(y) + 1, y, skin[1]); }

  // 人間性が減るほど、左あごから機械が広がる
  const T = m * 17;
  const machineAt = (x, y) => m > 0.12 && inFace(x, y) && (x - L(y)) + (22 - y) * 0.7 < T;
  for (let y = 4; y <= 22; y++) {
    if (hw(y) <= 0) continue;
    for (let x = L(y); x <= Rr(y); x++) {
      if (!machineAt(x, y)) continue;
      const edge = !machineAt(x + 1, y) || !machineAt(x, y - 1);
      px(x, y, edge ? PAL.ink : (x + y) % 3 === 0 ? PAL.chromeD : PAL.chromeM);
    }
  }

  // 目・眉・鼻・口
  const eye = (x) => {
    if (machineAt(x, 13)) { rect(x, 13, 2, 2, PAL.pink); px(x, 13, PAL.pinkL); glow(x - 1, 13, PAL.pink); return; }
    px(x, 13, PAL.paper); px(x + 1, 13, PAL.ink); rect(x, 14, 2, 1, PAL.ink);
  };
  eye(12); eye(18);
  rect(11, 11, 3, 1, hairCol === PAL.paper ? skin[2] : hairCol);
  rect(18, 11, 3, 1, hairCol === PAL.paper ? skin[2] : hairCol);
  px(16, 15, skin[1]); px(16, 16, skin[2]);
  rect(14, 18, 4, 1, PAL.pinkD); px(13, 18, skin[1]); px(18, 18, skin[1]);

  // 髪
  const top = (rows) => { for (let y = 3; y < 3 + rows; y++) { const w = hw(y) > 0 ? hw(y) + 1 : 4; rect(16 - w, y, w * 2, 1, hairCol); } };
  if (hairStyle === 0) { top(5); for (let y = 8; y <= 10; y++) { px(L(y), y, hairCol); px(Rr(y), y, hairCol); } }
  if (hairStyle === 1) { for (let y = 0; y <= 8; y++) rect(14, y, 4, 1, hairCol); for (let y = 6; y <= 10; y += 2) { px(L(y) + 1, y, skin[1]); px(Rr(y) - 1, y, skin[1]); } }
  if (hairStyle === 2) { top(5); for (let y = 7; y <= 23; y++) { const l = (hw(y) > 0 ? L(y) : 10) - 2; const rr = (hw(y) > 0 ? Rr(y) : 21) + 1; rect(l, y, 2, 1, hairCol); rect(rr, y, 2, 1, hairCol); } }
  if (hairStyle === 3) { top(6); rect(L(9), 9, Rr(9) - L(9) + 1, 1, hairCol); for (let y = 9; y <= 17; y++) { px(L(y) - 1, y, hairCol); px(Rr(y) + 1, y, hairCol); } }
  if (hairStyle === 4) { for (let y = 4; y <= 7; y++) for (let x = L(y); x <= Rr(y); x += 2) px(x, y, skin[1]); rect(10, 6, 3, 1, PAL.blue); }
  if (hairStyle === 5) { top(5); for (let y = 8; y <= 11; y++) rect(L(y), y, 6 - (y - 8), 1, hairCol); }

  // ロール
  if (r.role === 'net') {
    for (let y = 2; y <= 24; y++) {
      const l = hw(y) > 0 ? L(y) - 1 : 9, rr = hw(y) > 0 ? Rr(y) + 1 : 22;
      if (y <= 4) rect(9, y, 14, 1, PAL.blueD);
      else { rect(l - 2, y, 2, 1, PAL.blueD); rect(rr + 1, y, 2, 1, PAL.blueD); px(l - 2, y, PAL.blue); px(rr + 2, y, PAL.blue); }
    }
  }
  if (r.role === 'tech') { rect(L(8), 8, Rr(8) - L(8) + 1, 2, PAL.chromeD); rect(11, 8, 3, 2, PAL.blue); rect(18, 8, 3, 2, PAL.blue); px(12, 8, PAL.blueL); px(19, 8, PAL.blueL); }
  if (r.role === 'driver') { rect(11, 13, 4, 2, PAL.pink); rect(17, 13, 4, 2, PAL.pink); rect(15, 13, 2, 1, PAL.ink); px(11, 13, PAL.pinkL); px(17, 13, PAL.pinkL); rect(4, 27, 24, 1, PAL.blue); }
  if (r.role === 'med') { rect(12, 21, 8, 2, PAL.paper); rect(20, 27, 3, 1, PAL.pink); rect(21, 26, 1, 3, PAL.pink); }
  if (r.role === 'solo') { rect(9, 22, 3, 4, PAL.ink); rect(20, 22, 3, 4, PAL.ink); px(11, 23, PAL.pink); px(20, 23, PAL.pink); }

  // 出自
  if (r.origin === 'corp') { rect(15, 25, 2, 7, PAL.pink); px(14, 24, PAL.paper); px(17, 24, PAL.paper); }
  if (r.origin === 'street') { px(L(16) - 1, 16, PAL.pinkL); px(20, 15, PAL.pinkD); px(21, 16, PAL.pinkD); px(20, 17, PAL.pinkD); }
  if (r.origin === 'drifter') { rect(11, 22, 10, 3, PAL.blue); for (let x = 11; x < 21; x += 2) px(x, 23, PAL.blueL); }

  // 義体
  const has = (k) => cyber.includes(k);
  if (has('optics')) {
    rect(17, 12, 4, 4, PAL.chromeM); rect(18, 13, 2, 2, PAL.pink); px(18, 13, PAL.pinkL);
    glow(21, 13, PAL.pink); glow(21, 14, PAL.pink); glow(22, 13, PAL.pinkL);
  }
  if (has('arm')) {
    rect(3, 25, 8, 7, PAL.chromeM);
    for (let y = 26; y < 32; y += 3) rect(3, y, 8, 1, PAL.chromeD);
    rect(3, 25, 8, 1, PAL.chrome); px(5, 28, PAL.blue); px(8, 31, PAL.blue);
  }
  if (has('plating')) { const x = L(15) + 2; for (let y = 12; y <= 19; y++) px(x, y, PAL.chromeD); px(x + 1, 13, PAL.chrome); px(x + 1, 17, PAL.chrome); }
  if (has('synapse')) { const x = Rr(10) - 1; px(x, 9, PAL.blueL); px(x + 1, 10, PAL.blueL); px(x, 11, PAL.blueL); glow(x + 2, 10, PAL.blue); }
  if (has('coproc')) { rect(15, 6, 2, 2, PAL.chromeD); px(16, 6, PAL.blue); glow(16, 5, PAL.blueL); }
  if (has('jack')) { rect(18, 21, 1, 2, PAL.chrome); px(19, 23, PAL.blue); px(20, 24, PAL.blue); px(21, 25, PAL.blue); px(21, 26, PAL.blueL); }
  if (has('toolfinger')) { rect(23, 27, 6, 5, PAL.chromeM); for (const x of [23, 25, 27]) { px(x, 26, PAL.chrome); px(x, 25, PAL.blue); } }
  if (has('ears')) { const x = L(13) - 1; rect(x, 12, 1, 4, PAL.chromeM); px(x, 13, PAL.blue); glow(x - 1, 13, PAL.blueL); }
  if (has('medkit')) { px(21, 29, PAL.pink); px(20, 29, PAL.chromeD); px(22, 29, PAL.chromeD); glow(21, 30, PAL.pinkL); }
  if (has('steering')) { for (let y = 20; y <= 24; y += 2) px(13, y, PAL.blueL); }
  if (has('painblock')) { for (let x = 12; x <= 15; x++) px(x, 22, x % 2 ? PAL.ink : PAL.paper); }
  if (has('voice')) { rect(15, 22, 2, 2, PAL.chromeD); px(15, 22, PAL.chrome); px(16, 23, PAL.chrome); }

  // 人間性15以下・0のグリッチ
  if (glitch) {
    const img = c.getImageData(0, 0, S, S);
    const d = img.data;
    const g = mulberry32(hashStr(key));
    const rows = glitch === 2 ? 10 : 3;
    for (let k = 0; k < rows; k++) {
      const y = Math.floor(g() * S);
      const sh = (g() < 0.5 ? -1 : 1) * (1 + Math.floor(g() * (glitch === 2 ? 5 : 2)));
      const row = d.slice(y * S * 4, (y + 1) * S * 4);
      for (let x = 0; x < S; x++) {
        const sx = Math.min(S - 1, Math.max(0, x - sh));
        for (let ch = 0; ch < 4; ch++) d[(y * S + x) * 4 + ch] = row[sx * 4 + ch];
      }
    }
    for (let y = 1; y < S; y += 2) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; d[i] *= 0.8; d[i + 1] *= 0.8; d[i + 2] *= 0.85; }
    c.putImageData(img, 0, 0);
    if (glitch === 2) for (let k = 0; k < 5; k++) rect(0, Math.floor(g() * S), S, 1, g() < 0.5 ? PAL.pink : PAL.blue);
  }

  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}

function portraitImg(r, cls = '', opt = {}) {
  const hum = opt.humanity !== undefined ? opt.humanity : r.humanity;
  const jitter = hum <= 15 && opt.glitch !== 0 ? ' glitchy' : '';
  return `<img class="por ${cls}${jitter}" src="${portrait(r, opt)}" alt="" width="32" height="32">`;
}

/* ───────── 企業・勢力のロゴ（currentColor の SVG） ───────── */

const LOGO_PATHS = {
  mitsukane: '<path d="M12 2l4 4-4 4-4-4zM6 11l4 4-4 4-4-4zM18 11l4 4-4 4-4-4z"/>',
  verde: '<path d="M6.3 17.7a4.5 4.5 0 0 1 0-6.4l5-5a4.5 4.5 0 0 1 6.4 6.4l-5 5a4.5 4.5 0 0 1-6.4 0z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 9l6 6" stroke="currentColor" stroke-width="2.2"/>',
  hakurou: '<circle cx="12" cy="17" r="2.6"/><path d="M12 14V4M7 9a7 7 0 0 1 10 0M4.5 6a10.5 10.5 0 0 1 15 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  gang: '<path d="M17 4c-5 0-9 2-9 5s9 2 9 6-4 5-9 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="4" r="1.6"/>',
  resident: '<rect x="7" y="5" width="10" height="14" rx="5"/><path d="M12 2v3M10 21h4" stroke="currentColor" stroke-width="2"/>',
  broker: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/>',
  self: '<path d="M12 2l9 5v10l-9 5-9-5V7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 5 9-5M12 12v10" fill="none" stroke="currentColor" stroke-width="2"/>',
};
function logo(key, cls = '') {
  const p = LOGO_PATHS[key];
  if (!p) return '';
  return `<svg class="logo-mark ${cls} lg-${key}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`;
}

/* ───────── 夜のヨミハマ（背景の Canvas） ───────── */

const SIGN_WORDS = ['義体', '質', 'ラザロ', '白蛇', '診療', 'ミツカネ', 'ヴェルデ', 'ハクロウ', '酒', '夜市', '電脳', '両替'];

const City = {
  cv: null, c: null, w: 0, h: 0, far: [], near: [], signs: [], drops: [], pat: null,
  mode: 'full', raf: 0, last: 0, t: 0,

  init() {
    this.cv = document.getElementById('city');
    if (!this.cv) return;
    this.c = this.cv.getContext('2d');
    this.resize();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => this.resize(), 150); });
    document.addEventListener('visibilitychange', () => this.loop());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.draw());
    this.loop();
  },

  setMode(mode) {
    if (!this.cv || this.mode === mode) return;
    this.mode = mode;
    this.cv.dataset.mode = mode;
    this.loop();
  },

  resize() {
    const w = innerWidth, h = innerHeight;
    this.cv.width = w; this.cv.height = h;
    this.w = w; this.h = h;
    this.build();
    this.draw();
  },

  build() {
    const rnd = mulberry32(20261102);
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const w = this.w, h = this.h;
    const hz = Math.round(h * 0.74);
    this.hz = hz;
    this.far = [];
    for (let x = -10; x < w + 10;) {
      const bw = ri(26, 64), bh = ri(Math.round(h * 0.16), Math.round(h * 0.46));
      const wins = [];
      for (let wy = hz - bh + 6; wy < hz - 4; wy += 6) for (let wx = x + 4; wx < x + bw - 4; wx += 5) if (rnd() < 0.22) wins.push([wx, wy, rnd() < 0.7 ? 0 : 1, rnd() * 6.28, 0.3 + rnd()]);
      this.far.push({ x, y: hz - bh, w: bw, h: bh, wins });
      x += bw + ri(0, 4);
    }
    this.near = []; this.signs = [];
    for (let x = -20; x < w + 20;) {
      const bw = ri(40, 96), bh = ri(Math.round(h * 0.1), Math.round(h * 0.3));
      const b = { x, y: hz - bh, w: bw, h: bh, ant: rnd() < 0.3 };
      this.near.push(b);
      if (rnd() < 0.55) {
        const word = SIGN_WORDS[Math.floor(rnd() * SIGN_WORDS.length)];
        const size = ri(12, 17);
        const sh = word.length * (size + 3) + 10;
        this.signs.push({
          x: x + ri(6, Math.max(7, bw - 26)), y: Math.max(20, b.y - ri(0, 18) - (rnd() < 0.5 ? sh * 0.4 : 0)),
          word, size, sw: size + 10, sh, col: rnd() < 0.55 ? PAL.pink : PAL.blue, seed: rnd() * 100, rate: 0.4 + rnd(),
        });
      }
      x += bw + ri(-6, 10);
    }
    const n = Math.round((w * h) / 9000);
    this.drops = Array.from({ length: n }, () => ({ x: rnd() * w, y: rnd() * h, l: 8 + rnd() * 14, v: 0.5 + rnd() * 0.6 }));
    const p = document.createElement('canvas');
    p.width = p.height = 4;
    const pc = p.getContext('2d');
    pc.fillStyle = '#ffffff'; pc.fillRect(1, 1, 1, 1);
    this.pat = this.c.createPattern(p, 'repeat');
  },

  signOn(s, t) {
    const v = Math.sin(t * 0.0013 * s.rate + s.seed) + Math.sin(t * 0.0071 * s.rate + s.seed * 3);
    return v > -1.55;
  },

  draw(t = this.t) {
    const c = this.c, w = this.w, h = this.h, hz = this.hz;
    if (!c) return;
    const sky = c.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#04060b'); sky.addColorStop(0.6, '#0c1328'); sky.addColorStop(1, '#2a1230');
    c.fillStyle = sky; c.fillRect(0, 0, w, hz);
    const haze = c.createRadialGradient(w * 0.6, hz, 10, w * 0.6, hz, w * 0.7);
    haze.addColorStop(0, 'rgba(255,79,154,0.22)'); haze.addColorStop(1, 'rgba(255,79,154,0)');
    c.fillStyle = haze; c.fillRect(0, 0, w, hz);

    // 遠景のビルと窓
    c.fillStyle = '#0b1120';
    for (const b of this.far) c.fillRect(b.x, b.y, b.w, b.h);
    for (const b of this.far) for (const [x, y, col, ph, sp] of b.wins) {
      if (Math.sin(t * 0.0004 * sp + ph) < -0.6) continue;
      c.fillStyle = col ? 'rgba(255,79,154,0.5)' : 'rgba(120,165,255,0.45)';
      c.fillRect(x, y, 2, 2);
    }
    // 近景のビル
    for (const b of this.near) {
      c.fillStyle = '#05070d'; c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = 'rgba(63,124,255,0.25)'; c.fillRect(b.x, b.y, b.w, 1);
      if (b.ant) { c.fillStyle = '#05070d'; c.fillRect(b.x + b.w / 2, b.y - 18, 2, 18); if (Math.sin(t * 0.004) > 0) { c.fillStyle = PAL.pink; c.fillRect(b.x + b.w / 2, b.y - 20, 2, 2); } }
    }
    // ネオン看板
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (const s of this.signs) {
      const on = this.signOn(s, t);
      c.fillStyle = '#05070d'; c.fillRect(s.x, s.y, s.sw, s.sh);
      c.strokeStyle = on ? s.col : 'rgba(80,90,110,0.5)'; c.lineWidth = 1.5;
      c.shadowColor = s.col; c.shadowBlur = on ? 14 : 0;
      c.strokeRect(s.x + 0.5, s.y + 0.5, s.sw - 1, s.sh - 1);
      c.fillStyle = on ? s.col : 'rgba(80,90,110,0.6)';
      c.font = `${s.size}px "Dela Gothic One", "Hiragino Sans", sans-serif`;
      [...s.word].forEach((ch, i) => c.fillText(ch, s.x + s.sw / 2, s.y + 5 + i * (s.size + 3)));
      c.shadowBlur = 0;
    }
    // 湾と映り込み
    const sea = c.createLinearGradient(0, hz, 0, h);
    sea.addColorStop(0, '#0a0d1a'); sea.addColorStop(1, '#030409');
    c.fillStyle = sea; c.fillRect(0, hz, w, h - hz);
    for (const s of this.signs) {
      if (!this.signOn(s, t)) continue;
      c.fillStyle = s.col;
      for (let y = hz + 2; y < h; y += 2) {
        const a = 0.3 * (1 - (y - hz) / (h - hz));
        if (a <= 0.02) break;
        c.globalAlpha = a;
        const off = Math.sin(y * 0.07 + t * 0.002 + s.seed) * 2.5;
        c.fillRect(s.x + off + s.sw * 0.25, y, s.sw * 0.5, 1.4);
      }
    }
    c.globalAlpha = 1;
    // 雨
    c.strokeStyle = 'rgba(156,192,255,0.22)'; c.lineWidth = 1;
    c.beginPath();
    for (const d of this.drops) { c.moveTo(d.x, d.y); c.lineTo(d.x - d.l * 0.25, d.y + d.l); }
    c.stroke();
    // 網点と周辺減光
    if (this.pat) { c.globalAlpha = 0.05; c.fillStyle = this.pat; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
    const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  },

  step(now) {
    this.raf = requestAnimationFrame((n) => this.step(n));
    const fps = this.mode === 'full' ? 30 : 10;
    if (now - this.last < 1000 / fps) return;
    const dt = Math.min(100, now - (this.last || now));
    this.last = now; this.t = now;
    for (const d of this.drops) {
      d.y += d.v * dt * 0.9; d.x -= d.v * dt * 0.2;
      if (d.y > this.h) { d.y = -d.l; d.x = Math.random() * (this.w + 60); }
    }
    this.draw(now);
  },

  loop() {
    cancelAnimationFrame(this.raf);
    if (!this.cv || ART_REDUCED || document.hidden) { this.draw(); return; }
    this.raf = requestAnimationFrame((n) => this.step(n));
  },
};

/* ───────── カットイン ───────── */

let cutinTimer = 0;
function cutin({ kicker = '', title = '', sub = '', tone = 'pink', por = '' }) {
  const fx = document.getElementById('fx');
  if (!fx || ART_REDUCED) return;
  clearTimeout(cutinTimer);
  fx.innerHTML = `<div class="cutin tone-${tone}">
    <div class="ci-band">${por ? `<img class="ci-por" src="${por}" alt="">` : ''}<div class="ci-text"><span class="ci-kick">${kicker}</span><b data-t="${title}">${title}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>
  </div>`;
  fx.hidden = false;
  cutinTimer = setTimeout(() => { fx.hidden = true; fx.innerHTML = ''; }, 2300);
}
