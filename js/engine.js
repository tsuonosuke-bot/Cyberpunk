/* FIXER'S CUT — 状態、d10判定、夜の進行 */

const SAVE_KEY = 'fixers-cut-save-v1';
const RENT = 200;
const LAZARUS_FEE = 100;
const BROKER_RATE = 0.2;
const ROSTER_MAX = 8;
const LANE = { field: '現場', support: '支援', net: 'ネット' };
const LANE_MAX = { field: 3, support: 2, net: 1 };
/* 通常兵の基準値。ランク2の依頼は交戦ごとに enemyDV を持つ（data.js） */
const RANK_ENEMY = {
  1: { dv: 17, atk: 16, dice: 3, plus: 2 },
  2: { dv: 18, atk: 16, dice: 3, plus: 3 },
  3: { dv: 17, atk: 16, dice: 4, plus: 3 },
};
const ROLE_CYBER = {
  solo: ['arm', 'optics', 'synapse', 'plating', 'painblock'],
  net: ['jack', 'coproc', 'ears', 'painblock'],
  tech: ['toolfinger', 'coproc', 'plating', 'ears'],
  med: ['medkit', 'coproc', 'plating', 'voice'],
  driver: ['steering', 'synapse', 'plating', 'optics'],
};

const rnd = Math.random;
const d = (n) => 1 + Math.floor(rnd() * n);
const roll = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt = (n) => Math.round(n).toLocaleString('ja-JP');
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let G = null;

/* ───────── ランナー ───────── */

function cyberMods(r) {
  const m = {};
  for (const id of r.cyber) for (const k in CYBER[id].mods) m[k] = (m[k] || 0) + CYBER[id].mods[k];
  return m;
}
function gearMods(r) {
  const m = {};
  for (const id of Object.values(r.gear || {})) if (GEAR[id]) for (const k in GEAR[id].mods) m[k] = (m[k] || 0) + GEAR[id].mods[k];
  return m;
}
const allMods = (r) => { const m = cyberMods(r), g = gearMods(r); for (const k in g) m[k] = (m[k] || 0) + g[k]; return m; };
const stat = (r, k) => r.base[k] + (allMods(r)[k] || 0);
const skill = (r, k) => Math.max(0, (r.skills[k] || 0) + (allMods(r)[k] || 0));
const maxHp = (r) => 11 + stat(r, 'BODY') * 4;
const maxHum = (r) => r.base.EMP * 10;
const armorMax = (r) => r.armorBase + (allMods(r).armor || 0);

/* 使った技能は少しずつ伸びる。素の技能 n→n+1 に n+4 回の判定が要る（上限10） */
const SKILL_CAP = 10;
const xpNeed = (raw) => raw + 4;
function gainXp(r, sk, n) {
  r.xp ||= {};
  const ups = [];
  r.xp[sk] = (r.xp[sk] || 0) + n;
  while ((r.skills[sk] || 0) < SKILL_CAP && r.xp[sk] >= xpNeed(r.skills[sk] || 0)) {
    r.xp[sk] -= xpNeed(r.skills[sk] || 0);
    r.skills[sk] = (r.skills[sk] || 0) + 1;
    ups.push(r.skills[sk]);
  }
  if ((r.skills[sk] || 0) >= SKILL_CAP) r.xp[sk] = 0;
  return ups;
}
/* 本業の技能：ロールの技能表でいちばん高い上限を持つもの */
const mainSkill = (role) => Object.entries(ROLES[role].skills).sort((a, b) => b[1][1] - a[1][1])[0][0];
const getR = (id) => G.runners.find((r) => r.id === id);
const available = (r) => r.status === 'idle' && r.hp > 0;

function power(r) {
  let best = 0;
  for (const k of SKILLS) best = Math.max(best, stat(r, SKILL_STAT[k]) + skill(r, k));
  return best;
}
function stipendFor(r) {
  return clamp(Math.round(((power(r) - 8) * 40 + 100) / 50) * 50, 100, 400);
}
function demand(r) {
  const v = (300 + (power(r) - 10) * 100) * (r.origin === 'drifter' ? 0.8 : 1) * (r.humanity <= 30 ? 1.3 : 1);
  return Math.max(200, Math.round(v / 50) * 50);
}
function humZone(h) {
  if (h <= 0) return { key: 'gone', name: '喪失' };
  if (h <= 15) return { key: 'sign', name: '兆候' };
  if (h <= 30) return { key: 'unstable', name: '不安定' };
  return { key: 'stable', name: '安定' };
}

function usedNames() {
  const s = new Set();
  if (!G) return s;
  for (const r of G.runners) s.add(r.name);
  for (const r of G.scouts) s.add(r.name);
  for (const r of G.memorial) s.add(r.name);
  return s;
}
function freshName() {
  const used = usedNames();
  const free = NAMES.filter((n) => !used.has(n));
  return free.length ? pick(free) : pick(NAMES) + rint(2, 9);
}

function pickGender() {
  const x = rnd();
  return x < 0.42 ? 'm' : x < 0.84 ? 'f' : 'x';
}

function makeRunner(role, opt = {}) {
  const R = ROLES[role];
  const origin = opt.origin || pick(Object.keys(ORIGINS));
  const O = ORIGINS[origin];
  const base = {};
  for (const k of STATS) base[k] = opt.base ? opt.base[k] : clamp(rint(...R.base[k]) + (O.mods[k] || 0), 2, 10);
  const skills = {};
  for (const k of SKILLS) skills[k] = 0;
  if (opt.skills) Object.assign(skills, opt.skills);
  else {
    for (const k in R.skills) skills[k] = rint(...R.skills[k]);
    for (const k in O.skills) skills[k] = Math.min(10, skills[k] + O.skills[k]);
  }
  const contact = opt.contact || (origin === 'corp' ? pick(CORPS) : origin === 'street' ? 'gang' : 'resident');
  const r = {
    id: G.nextId++, name: opt.name || freshName(), gender: opt.gender || pickGender(), role, origin, contact, base, skills,
    cyber: (opt.cyber || []).slice(), gear: {}, xp: {}, armorBase: R.armor, story: opt.story || null, bio: opt.bio || '',
    contract: 'commission', stipend: 0, pref: opt.pref || pick(['any', 'any', 'any', 'commission', 'exclusive']),
    loyalty: 50, discontent: 0, wallet: rint(0, 600), lazarus: false,
    status: 'idle', therapy: 0, elite: 0, perk: false, jobs: 0, kills: 0, joined: G.night,
  };
  r.hp = maxHp(r);
  r.armor = armorMax(r);
  r.humanity = maxHum(r) - r.cyber.reduce((s, c) => s + CYBER[c].hl, 0);
  return r;
}

function makeStory(key) {
  const s = STORY_RUNNERS[key];
  return makeRunner(s.role, { ...s, story: key });
}

/* ───────── 新規ゲーム・保存 ───────── */

function newGame() {
  G = {
    v: 1, night: 1, money: 3000, negStreak: 0, cred: 0, rank: 1,
    heat: { mitsukane: 5, verde: 5, hakurou: 5 },
    chapter: 1, successes: 0, flags: {}, runners: [], scouts: [], board: [], missions: [], memorial: [],
    loans: [{ id: 'debt', label: '前任ハシバの借金', perNight: 150, nightsLeft: 40, runnerId: null }],
    repeats: {}, vouchers: { cyber: 0, intel: 0 }, pending: [], archive: [], nextId: 1,
    storyQueue: ['intro'], awaitEnding: false, ended: null, lastReport: null,
  };
  const a = makeRunner('solo', { name: 'ジロウ', gender: 'm', origin: 'street', pref: 'any' });
  const b = makeRunner('driver', { name: 'サエ', gender: 'f', origin: 'drifter', pref: 'any' });
  a.wallet = 200; b.wallet = 100;
  G.runners.push(a, b);
  World.init(G);
  World.nextNight();
  refreshScouts();
  refreshBoard();
  return G;
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 保存できない環境では無視 */ }
}
/* 古いセーブに足りない項目を補う */
function migrate(g) {
  const story = { kagerou: 'x', yoru: 'm', haruka: 'f' };
  for (const r of [...g.runners, ...g.scouts]) {
    r.gear ||= {};
    r.xp ||= {};
    if (r.gender) continue;
    let h = 0;
    for (const ch of r.name + r.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    r.gender = story[r.story] || ['m', 'f', 'x'][h % 3];
  }
  return g;
}

function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) { const g = JSON.parse(s); if (g && g.v === 1 && !g.ended) { World.init(g); return migrate(g); } }
  } catch (e) { /* 読めなければ新規 */ }
  return null;
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
}

/* ───────── スカウトと依頼盤 ───────── */

function refreshScouts() {
  G.scouts = [];
  const hiredOrGone = (k) => G.runners.some((r) => r.story === k) || G.memorial.some((r) => r.story === k) || G.flags['story_' + k];
  if (G.chapter >= 2 && !hiredOrGone('kagerou')) G.scouts.push(makeStory('kagerou'));
  else if (G.night >= 3 && rnd() < 0.2) {
    const k = pick(['yoru', 'haruka'].filter((x) => !hiredOrGone(x)) || []);
    if (k) G.scouts.push(makeStory(k));
  }
  const roles = shuffle(Object.keys(ROLES));
  while (G.scouts.length < 3) G.scouts.push(makeRunner(roles.pop(), World.scoutOptions()));
}

const hasJob = (tplId) => G.board.some((j) => j.tpl === tplId) || G.missions.some((m) => m.job.tpl === tplId);

function addJob(tpl, special) {
  const j = clone(tpl);
  j.uid = G.nextId++;
  j.tpl = tpl.id;
  World.prepareJob(j);
  j.special = !!special;
  j.expires = special ? 9999 : G.night + rint(2, 3);
  j.intel = false;
  const cnt = G.repeats[tpl.id] || 0;
  j.repeat = cnt;
  if (!special && cnt >= 2) j.payout = Math.round((tpl.payout * Math.pow(0.8, cnt - 1)) / 50) * 50;
  G.board.push(j);
  return j;
}

function campaignJob() {
  const c = G.chapter;
  if (G.flags['camp' + c] || !CAMPAIGN_JOBS[c]) return null;
  if (c === 2) {
    const ok = G.rank >= 2 && G.runners.some((r) => r.role === 'net' && skill(r, 'インターフェース') >= 6);
    return ok ? CAMPAIGN_JOBS[2] : null;
  }
  if (c === 4 && G.rank < 3) return null;
  return CAMPAIGN_JOBS[c];
}

function refreshBoard(specialsOnly) {
  G.board = G.board.filter((j) => j.expires >= G.night);
  if (G.rank < 3 && G.cred >= RANK_CRED[G.rank] && !hasJob('intro' + G.rank)) addJob(INTRO_JOBS[G.rank], true);
  const cj = campaignJob();
  if (cj && !hasJob(cj.id)) addJob(cj, true);
  if (specialsOnly) { World.refreshBoard(); return; }
  const pool = JOBS.filter((t) => t.rank <= G.rank && !hasJob(t.id));
  let normals = G.board.filter((j) => !j.special).length;
  while (normals < 5 && pool.length) {
    const weights = pool.map((t) => (t.rank === G.rank ? 3 : 1));
    let x = rnd() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while ((x -= weights[i]) > 0) i++;
    addJob(pool.splice(i, 1)[0], false);
    normals++;
  }
  World.refreshBoard();
  G.board.sort((a, b) => (b.special - a.special) || (b.rank - a.rank) || (b.payout - a.payout));
}

/* ───────── 編成 ───────── */

const teamIds = (t) => [...t.field, ...t.support, ...t.net];

function validateTeam(job, team) {
  if (!team || !['field', 'support', 'net'].every((k) => Array.isArray(team[k]))) return ['編成が正しくありません'];
  const errs = [], ids = teamIds(team);
  if (new Set(ids).size !== ids.length) errs.push('同じランナーを複数の枠には入れられません');
  if (ids.some((id) => !getR(id))) errs.push('離脱済みのランナーが含まれています');
  for (const lane of ['field', 'support', 'net']) if (team[lane].length > LANE_MAX[lane]) errs.push(`${LANE[lane]}の枠が上限を超えています`);
  if (team.net.some((id) => getR(id) && getR(id).role !== 'net')) errs.push('ネット枠にはネットランナーが必要です');
  if(job.runnerId && !teamIds(team).includes(job.runnerId)) errs.push('個人依頼には本人の参加が必要です');
  if (!team.field.length) errs.push('現場に1人以上必要です');
  const all = teamIds(team).map(getR).filter(Boolean);
  if (all.some((r) => !available(r))) errs.push('出せないランナーが含まれています');
  for (const role of job.req) {
    if (role === 'net') { if (!team.net.length) errs.push('ネット枠にネットランナーが必要です'); }
    else if (!all.some((r) => r.role === role)) errs.push(`${ROLES[role].name}が必要です`);
  }
  return errs;
}

function snap(r) {
  const st = {}, sk = {};
  for (const k of STATS) st[k] = stat(r, k);
  for (const k of SKILLS) sk[k] = skill(r, k);
  const gm = gearMods(r), gearOf = {};
  for (const id of Object.values(r.gear || {})) if (GEAR[id]) for (const k in GEAR[id].mods) if (GEAR[id].mods[k] > 0) gearOf[k] = GEAR[id].name;
  return {
    id: r.id, name: r.name, role: r.role, st, sk, hp: r.hp, maxHp: maxHp(r), armor: r.armor, armorMax: armorMax(r),
    cy: cyberMods(r), gm, gearOf, ap: Object.values(r.gear || {}).some((id) => GEAR[id] && GEAR[id].ap),
    pain: r.cyber.includes('painblock'), medkit: r.cyber.includes('medkit'),
    perk: r.perk ? ROLES[r.role].perk.id : null, lazarus: r.lazarus, humanity: r.humanity,
    down: r.hp <= 0, dead: false, kills: 0, rescued: false,
  };
}
const snapTeam = (team) => ({ field: team.field.map((id) => snap(getR(id))), support: team.support.map((id) => snap(getR(id))), net: team.net.map((id) => snap(getR(id))) });

function estimate(job, routeIdx, team, n = 240) {
  const base = snapTeam(team);
  const cp = (a) => a.map((m) => ({ ...m }));
  let ok = 0, death = 0;
  const checks = {}, fails = {};
  for (let i = 0; i < n; i++) {
    const t = { field: cp(base.field), support: cp(base.support), net: cp(base.net) };
    const res = resolveMission(job, routeIdx, t, true);
    if (res.success) ok++;
    else fails[res.reason] = (fails[res.reason] || 0) + 1;
    if (teamIds(t).some((m) => m.dead)) death++;
    for (const k in res.checks) {
      const c = checks[k] || (checks[k] = { ok: 0, n: 0, who: {} });
      c.ok += res.checks[k].ok; c.n += res.checks[k].n;
      for (const w in res.checks[k].who) c.who[w] = (c.who[w] || 0) + res.checks[k].who[w];
    }
  }
  const skills = Object.entries(checks).map(([sk, c]) => ({
    sk, p: c.ok / c.n, per: c.n / n,
    who: Object.entries(c.who).sort((a, b) => b[1] - a[1])[0][0],
  })).sort((a, b) => a.p - b.p);
  const causes = Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([reason, c]) => ({ reason, p: c / n }));
  return { p: ok / n, death: death / n, skills, causes };
}

function payPreview(job, team) {
  const ids = teamIds(team);
  const n = ids.length || 1;
  const payout = Math.round((job.basePayout ?? job.payout) * World.payoutMultiplier(job));
  const fee = Math.round(payout * BROKER_RATE);
  const per = Math.round((payout - fee) / n);
  const rows = ids.map(getR).filter(Boolean).map((r) => ({ r, per, excl: r.contract === 'exclusive', short: r.contract !== 'exclusive' && per < demand(r) }));
  const excl = rows.filter((x) => x.excl).length * per;
  return { fee, per, excl, rows, total: fee + excl };
}

function intelCost(job) {
  if (G.vouchers.intel > 0) return 0;
  const half = G.runners.some((r) => r.contact === job.client);
  return Math.round(INTEL_COST[job.rank] * (half ? 0.5 : 1) * World.intelMultiplier(job) / 10) * 10;
}
function buyIntel(uid) {
  const job = G.board.find((j) => j.uid === uid);
  if (!job || job.intel) return '情報はもう買ってあります';
  const cost = intelCost(job);
  if (cost > G.money) return '所持金が足りません';
  if (cost === 0 && G.vouchers.intel > 0) G.vouchers.intel--;
  G.money -= cost;
  job.intel = true;
  return null;
}

function dispatch(uid, routeIdx, team) {
  if(G.nightInProgress) return ['判断待ちの通信を完了してください'];
  const job = G.board.find((j) => j.uid === uid);
  if (!job) return ['依頼が見つかりません'];
  const errs = validateTeam(job, team);
  if (errs.length) return errs;
  job.basePayout ??= job.payout;
  job.payout = Math.round(job.basePayout * World.payoutMultiplier(job));
  G.board = G.board.filter((j) => j !== job);
  for (const id of teamIds(team)) getR(id).status = 'mission';
  G.missions.push({ uid, job, routeIdx, team: clone(team), start: G.night, result: null });
  G.lastTeam = clone(team);
  return null;
}
function recall(uid) {
  const ms = G.missions.find((m) => m.uid === uid);
  if (!ms || ms.result) return;
  G.missions = G.missions.filter((m) => m !== ms);
  for (const id of teamIds(ms.team)) { const r = getR(id); if (r) r.status = 'idle'; }
  G.board.unshift(ms.job);
}

/* ───────── 判定（d10） ───────── */

const alive = (m) => !m.down && !m.dead;
function best(list, sk) {
  const c = list.filter(alive);
  if (!c.length) return null;
  return c.reduce((a, b) => (b.st[SKILL_STAT[sk]] + b.sk[sk] > a.st[SKILL_STAT[sk]] + a.sk[sk] ? b : a));
}
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function L(ctx, who, text, kind = '', calc = '', lane = ctx.lane) {
  if (ctx.sim) return;
  ctx.clock += rint(1, 4);
  ctx.log.push({ night: ctx.night, ph: ctx.ph, t: hhmm(ctx.clock), who, text, kind, calc, lane });
}
function sub(ctx, text, kind = '') {
  if (ctx.sim) return;
  ctx.log.push({ night: ctx.night, ph: ctx.ph, lane: ctx.lane, t: '', who: '', text, kind, calc: '', sub: true });
}
function addHeat(ctx, corp, v) {
  if (!corp || !CLIENTS[corp] || CLIENTS[corp].kind !== 'corp') return;
  ctx.heat[corp] = (ctx.heat[corp] || 0) + v;
}
function abort(ctx, reason) {
  ctx.aborted = true;
  ctx.reason = reason;
  L(ctx, '', reason, 'ng');
}

/* 判定に効いたもの（技能・装備・義体・設備）を、成功に変えた回数として数える */
function credit(ctx, m, label) {
  if (ctx.sim) return;
  const c = ctx.credit || (ctx.credit = {});
  const k = m.id + '|' + label;
  c[k] = (c[k] || 0) + 1;
}

function check(ctx, m, sk, dv) {
  const stK = SKILL_STAT[sk];
  const sv = m.st[stK], kv = m.sk[sk] || 0;
  const parts = World.checkParts(ctx, m, sk);
  if (m.perk === 'backdoor' && sk === 'インターフェース') parts.push({ label: ROLES.net.perk.name, v: 2, perk: true });
  if (m.perk === 'getaway' && sk === '運転') parts.push({ label: ROLES.driver.perk.name, v: 3, perk: true });
  const bonus = parts.reduce((a, p) => a + p.v, 0);
  const wound = !m.pain && m.hp < m.maxHp / 2 ? 2 : 0;
  const r = d(10);
  let ex = 0, rs = `d10(${r})`;
  if (r === 10) { ex = d(10); rs = `d10(10, +${ex})`; }
  else if (r === 1) { ex = -d(10); rs = `d10(1, −${-ex})`; }
  const total = sv + kv + bonus - wound + r + ex;
  const ok = total >= dv;
  const gear = (m.gm && m.gm[sk]) || 0, cyber = ((m.cy && m.cy[sk]) || 0) + ((m.cy && m.cy[stK]) || 0);
  if (ctx.sim) {
    const c = ctx.checks[sk] || (ctx.checks[sk] = { ok: 0, n: 0, who: {} });
    c.n++; if (ok) c.ok++;
    c.who[m.name] = (c.who[m.name] || 0) + 1;
    return { ok, total, calc: '' };
  }
  const xp = ctx.xp || (ctx.xp = {});
  (xp[m.id] ||= {})[sk] = (xp[m.id][sk] || 0) + 1;
  if (ok) {
    for (const p of parts) if (p.v > 0 && total - p.v < dv) credit(ctx, m, p.label);
    if (gear > 0 && total - gear < dv) credit(ctx, m, m.gearOf[sk] || '装備');
    if (cyber > 0 && total - cyber < dv) credit(ctx, m, '義体');
  }
  const inner = [gear ? `装備${gear > 0 ? '+' : '−'}${Math.abs(gear)}` : '', cyber ? `義体+${cyber}` : ''].filter(Boolean).join(' ');
  const extra = parts.map((p) => `${p.v >= 0 ? '＋' : '－'}${p.label} ${Math.abs(p.v)}`).join('');
  const calc = `${stK} ${sv}＋${sk} ${kv}${inner ? `〈${inner}〉` : ''}${extra}${wound ? '－重傷 2' : ''}＋${rs}＝${total} ${ok ? '≧' : '＜'} DV${dv}`;
  return { ok, total, calc };
}

function hit(ctx, m, dmg, pierce) {
  const a = m.armor;
  const pen = pierce ? dmg : Math.max(0, dmg - a);
  let note = '';
  if (!pierce && dmg > a && a > 0) { m.armor = a - 1; note = `   防具 ${a}→${a - 1}`; }
  m.hp = Math.max(0, m.hp - pen);
  sub(ctx, pierce
    ? `${m.name} 被弾 ${dmg}（防具無視）   HP ${m.hp}/${m.maxHp}`
    : `被弾 ${dmg} − 防具 ${a} ＝ ${pen}   HP ${m.hp}/${m.maxHp}${note}`, pen > 0 ? 'ng' : '');
  if (m.hp <= 0 && !m.down) deathSave(ctx, m);
  if (!m.dead && ((ctx.team.field.includes(m) && m.hp < m.maxHp / 2) || (m.down && !m.rescued))) requestDecision(ctx, m.down ? '死亡セーブを生き延びた仲間が動けない' : '現場の仲間が重傷になった');
}

function deathSave(ctx, m) {
  m.down = true;
  let bonus = ctx.all.some((x) => x !== m && alive(x) && x.role === 'med') ? 1 : 0;
  if (ctx.all.some((x) => x !== m && alive(x) && x.perk === 'surgeon')) bonus += 2;
  const r = d(10), need = m.st.BODY + bonus;
  if (r < need) {
    const surgeon = ctx.all.find((x) => x !== m && alive(x) && x.perk === 'surgeon');
    if (surgeon && r >= need - 2) credit(ctx, surgeon, ROLES.med.perk.name);
    L(ctx, m.name, `死亡セーブ d10(${r}) ＜ BODY ${m.st.BODY}${bonus ? `＋${bonus}` : ''}　生きているが動けない`, 'warn');
    return;
  }
  if (m.lazarus) {
    m.rescued = true; m.hp = 1; ctx.lazarus.push(m.id);
    L(ctx, m.name, `死亡セーブ d10(${r}) 失敗。ラザロ救急隊が回収（回収費は報酬額の30%）`, 'warn');
    return;
  }
  m.dead = true;
  L(ctx, m.name, `死亡セーブ d10(${r}) ≧ ${need}　応答なし`, 'dead');
}

function combat(ctx, n, label, o = {}) {
  const E = RANK_ENEMY[ctx.rank], type = o.enemyType || 'standard';
  const fighters = () => (o.chase ? ctx.team.field.concat(ctx.team.support) : ctx.team.field).filter(alive);
  let s = ctx.combatState;
  if (!s) {
    const count = type === 'swarm' ? n + 2 : n;
    const foes = o.boss ? [{...o.boss}] : Array.from({length:count},()=>({
      name:World.enemies[type] || label, hits:type==='armored'?2:1,
      dv:o.dv ?? E.dv+(type==='swarm'?-1:type==='standard'?0:2),
      atk:E.atk+(type==='swarm'?-1:type==='standard'?0:2),
      dice:type==='swarm'?2:E.dice,plus:E.plus}));
    s = ctx.combatState = {n,label,o,foes,round:0,stage:'start',enemy:0,player:0,shot:0,hacked:false};
    L(ctx,'',label+'と交戦：'+(World.enemies[type]||label)+' '+count+'体','info');
  }
  const end = (ok, reason) => { ctx.combatState=null; if(reason)abort(ctx,reason); else L(ctx,'',label+'を制圧','ok'); return ok; };
  while (true) {
    if (s.stage==='start') {
      s.stage=o.ambush?'enemy':'player';
      s.ambush=!!o.ambush;
      if(type==='sniper') {
        const scout=best(ctx.all,'知覚'),c=scout&&check(ctx,scout,'知覚',18);
        if(c&&c.ok)L(ctx,scout.name,'狙撃手を先に発見。先制射撃を防いだ','ok',c.calc);
        else if(fighters().length){const t=pick(fighters());L(ctx,t.name,'狙撃手の先制射撃','ng');hit(ctx,t,roll(3,6)+5,false);}
        if(ctx.alert)return null;
      }
    }
    if(s.stage==='player') {
      const list=o.chase?ctx.team.field.concat(ctx.team.support):ctx.team.field;
      while(s.player<list.length) {
        const m=list[s.player];
        if(!alive(m)){s.player++;s.shot=0;continue;}
        while(s.shot<(m.perk==='double'?2:1)) {
          s.shot++;
          const foe=s.foes.find(f=>f.hits>0);if(!foe)return end(true);
          const c=check(ctx,m,'射撃',foe.dv);L(ctx,m.name,foe.name+'を攻撃',c.ok?'ok':'ng',c.calc);
          if(c.ok){const weak=type==='armored'&&(ctx.all.some(x=>alive(x)&&x.role==='tech')||m.ap);
            if(weak&&m.ap&&!ctx.all.some(x=>alive(x)&&x.role==='tech'))credit(ctx,m,'徹甲ライフル');
            foe.hits-=weak?2:1;
            if(foe.hits<=0){m.kills++;if(s.shot===2)credit(ctx,m,ROLES.solo.perk.name);if(m.humanity<=15&&rnd()<.35){addHeat(ctx,ctx.job.target,4);sub(ctx,m.name+'が過剰な暴力をふるった','ng');}}
            else sub(ctx,'装甲兵はまだ動く。テックか徹甲ライフルがあれば弱点を突ける','warn');}
        }
        s.player++;s.shot=0;
      }
      if(!s.foes.some(f=>f.hits>0))return end(true);
      s.stage='enemy';s.enemy=0;s.hacked=false;
    }
    if(s.stage==='enemy') {
      if(type==='hacker'&&!s.hacked&&s.foes.some(f=>f.hits>0)) {
        s.hacked=true;const nr=ctx.team.net.find(alive);
        if(nr){const c=check(ctx,nr,'インターフェース',18);L(ctx,nr.name,'敵ネットランナーのICE攻撃',c.ok?'ok':'ng',c.calc,'net');if(!c.ok)hit(ctx,nr,roll(2,6),true);}
        else {ctx.mods.extraEnemy=Math.max(1,ctx.mods.extraEnemy);L(ctx,'','敵ネットランナーが増援を呼んだ','ng');}
        if(ctx.alert)return null;
      }
      while(s.enemy<s.foes.length) {
        const foe=s.foes[s.enemy++];if(foe.hits<=0)continue;
        const targets=fighters();if(!targets.length)break;
        const t=pick(targets),c=check(ctx,t,'回避',foe.atk);
        if(!c.ok){L(ctx,t.name,foe.name+'の攻撃をかわせない','ng',c.calc);hit(ctx,t,roll(foe.dice,6)+foe.plus,false);}
        if(ctx.alert)return null;
      }
      if(!fighters().length)return end(false,label+'との交戦で全員が倒れた。撤退');
      if(!s.ambush)s.round++;s.ambush=false;
      if(s.round>=3)return end(false,label+'を押し切れず撤退');
      s.stage='player';s.player=0;s.shot=0;
    }
  }
}

function rest(ctx, p) {
  const medics = ctx.all.filter((x) => alive(x) && x.role === 'med');
  const medic = best(medics, '医療');
  const parts = [];
  for (const m of ctx.all.filter(alive)) {
    const before = m.hp;
    const h = d(6) + 2 + (medic ? Math.floor(medic.sk.医療 / 2) : 0) + (m.medkit ? 5 : 0);
    m.hp = Math.min(m.maxHp, m.hp + h);
    if (m.hp > before) parts.push(`${m.name} ${before}→${m.hp}`);
  }
  const patcher = ctx.all.find((x) => alive(x) && x.perk === 'patch');
  if (patcher) {
    let fixed = 0;
    for (const m of ctx.all) { const a = m.armor; m.armor = Math.min(m.armorMax, m.armor + 2); fixed += m.armor - a; }
    if (fixed) credit(ctx, patcher, ROLES.tech.perk.name);
  }
  L(ctx, medic ? medic.name : '', `${p.l}　HP回復${medic ? '（手当て）' : ''}`, 'ok', parts.join('　'));
}

function fieldPhase(ctx, p) {
  const F = ctx.team.field, SUP = ctx.team.support, tgt = ctx.job.target;
  const tName = tgt ? CLIENTS[tgt].short : '';
  switch (p.t) {
    case 'sneak': {
      const m = best(F, '隠密'); if (!m) return;
      const c = check(ctx, m, '隠密', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) { ctx.mods.extraEnemy++; addHeat(ctx, tgt, 4); sub(ctx, `見つかった。次の交戦で敵+1${tgt ? `　${tName}のヒート +4` : ''}`, 'ng'); }
      break;
    }
    case 'trap': {
      const m = best(F, '知覚'); if (!m) return;
      const c = check(ctx, m, '知覚', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) {
        addHeat(ctx, tgt, 8); ctx.mods.extraEnemy++;
        requestDecision(ctx, '罠の警報が鳴った');
        sub(ctx, `警報${tgt ? `　${CLIENTS[tgt].name}のヒート +8` : ''}　次の交戦で敵+1`, 'ng');
        hit(ctx, m, roll(2, 6), false);
      }
      break;
    }
    case 'combat': {
      const n = p.n + ctx.mods.extraEnemy;
      ctx.mods.extraEnemy = 0;
      combat(ctx, n, p.l, { ambush: p.hidden && !ctx.job.intel, enemyType: p.enemyType, dv:p.enemyDV });
      break;
    }
    case 'rest': rest(ctx, p); break;
    case 'gate': {
      const dv = p.dv + ctx.mods.gateUp;
      ctx.mods.gateUp = 0;
      for (let k = 0; k < 3; k++) {
        const m = best(F.concat(SUP), '電子'); if (!m) break;
        const c = check(ctx, m, '電子', dv);
        L(ctx, m.name, k ? `${p.l}（やり直し）` : p.l, c.ok ? 'ok' : 'ng', c.calc);
        if (c.ok) return;
      }
      abort(ctx, `${p.l}を開けられず撤退`);
      break;
    }
    case 'goal': ctx.goals++; L(ctx, '', `${p.l}　確保`, 'goal'); break;
    case 'escape': {
      if (ctx.mods.chase) {
        ctx.mods.chase = false;
        ctx.afterCombat = 'escapeDrive';
        L(ctx, '', '警報で追手がかかった。追撃戦', 'ng');
        if (!combat(ctx, 2, '追手', { chase: true })) return;
        ctx.afterCombat = null;
      }
      const m = best(SUP.concat(F), '運転'); if (!m) return;
      const c = check(ctx, m, '運転', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) { ctx.afterCombat = null; sub(ctx, '振り切れない', 'ng'); combat(ctx, 2, '追いすがる追手', { chase: true }); }
      break;
    }
    case 'drive': {
      const m = best(SUP.concat(F), '運転'); if (!m) return;
      const c = check(ctx, m, '運転', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) { ctx.rewardMult -= 0.2; ctx.mods.extraEnemy++; sub(ctx, '足止めを食った。報酬−20%　次の交戦で敵+1', 'ng'); }
      break;
    }
    case 'talk': {
      const m = best(F.concat(SUP), '説得'); if (!m) return;
      const c = check(ctx, m, '説得', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) { sub(ctx, '話がこじれた', 'ng'); combat(ctx, 2, '交渉決裂'); }
      break;
    }
    case 'med': {
      for (let k = 0; k < 2; k++) {
        const m = best(F.concat(SUP), '医療'); if (!m) break;
        const c = check(ctx, m, '医療', p.dv);
        L(ctx, m.name, k ? `${p.l}（やり直し）` : p.l, c.ok ? 'ok' : 'ng', c.calc);
        if (c.ok) return;
      }
      ctx.rewardMult -= 0.4;
      sub(ctx, 'うまくいかなかった。報酬−40%', 'ng');
      break;
    }
    case 'boss': combat(ctx, 1, p.l, { boss: ctx.job.boss }); break;
  }
}

function netPhase(ctx, p) {
  const nr = ctx.team.net.find(alive);
  if (!nr) { L(ctx, '', `${p.l}　ネットの担当がいない`, 'ng', '', 'net'); netFail(ctx, p); return; }
  const tries = p.fx === 'data' ? 2 : 1;
  for (let k = 0; k < tries; k++) {
    const c = check(ctx, nr, 'インターフェース', p.dv);
    L(ctx, nr.name, `${p.l}${k ? '（再侵入）' : ''}`, c.ok ? 'ok' : 'ng', c.calc, 'net');
    if (c.ok) { if (p.fx === 'data') ctx.goals++; return; }
    if (p.dv >= 17) { sub(ctx, '黒ICEの逆流', 'ng'); hit(ctx, nr, roll(2, 6), true); }
    if (!alive(nr)) break;
  }
  netFail(ctx, p);
}

function netFail(ctx, p) {
  const tgt = ctx.job.target;
  switch (p.fx) {
    case 'cam': ctx.mods.extraEnemy++; sub(ctx, 'カメラに捕捉された。次の交戦で敵+1', 'ng'); break;
    case 'door': ctx.mods.gateUp += 4; sub(ctx, '扉の制御を奪えない。次の扉のDV+4', 'ng'); break;
    case 'alarm': requestDecision(ctx, 'ネットの警報が鳴った'); ctx.mods.chase = true; sub(ctx, '警報が作動。逃走は追撃戦になる', 'ng'); break;
    case 'trace': addHeat(ctx, tgt, 6); sub(ctx, `逆探知された${tgt ? `　${CLIENTS[tgt].short}のヒート +6` : ''}`, 'ng'); break;
    case 'data': abort(ctx, `${p.l}を抜けず撤退`); break;
  }
}

// Interactive contexts contain only serializable data; no future rolls occur while waiting.
function requestDecision(ctx, reason) {
  if (ctx.interactive && !ctx.aborted && ctx.decisions < 2) ctx.alert = ctx.alert || reason;
}
function missionContext(job, routeIdx, team, sim, interactive = false) {
  World.prepareJob(job);
  const route = job.routes[routeIdx];
  const ctx = { job, routeIdx, rank: job.rank, team, sim, interactive,
    log: [], heat: {}, lazarus: [], mods: {extraEnemy:0, gateUp:0, chase:false},
    rewardMult:1, aborted:false, reason:'', goals:0, need:0, night:1, clock:1320, checks:{}, xp:{}, credit:{},
    ph:0, lane:'net', stage:0, decisions:0, alert:null, waiting:false };
  ctx.all = teamIds(team);
  World.context(ctx);
  ctx.environmentNight = G.night;
  for (const p of [...route.field,...route.net])
    if (p && (p.t === 'goal' || p.fx === 'data') && !(sim && !job.intel && p.hidden)) ctx.need++;
  return ctx;
}
function runMission(ctx, nightLimit = Infinity) {
  // Rebind aliases after JSON load so HP and armour remain shared with the team.
  ctx.all = teamIds(ctx.team);
  const route = ctx.job.routes[ctx.routeIdx];
  if (ctx.waiting) return ctx;
  while (ctx.ph < route.field.length && !ctx.aborted) {
    ctx.night = Math.floor(ctx.ph / 5) + 1;
    if (ctx.night > nightLimit) return ctx;
    if (ctx.stage === 0) ctx.clock = 1320 + (ctx.ph % 5) * 78 + rint(2,20);
    ctx.lane = ctx.stage === 0 ? 'net' : 'field';
    let p = (ctx.stage === 0 ? route.net : route.field)[ctx.ph];
    if (ctx.sim && !ctx.job.intel && p && p.hidden) p = null;
    if (ctx.combatState) {
      const s=ctx.combatState;
      const ok=combat(ctx,s.n,s.label,s.o);
      if(ok && ctx.afterCombat === 'escapeDrive') { ctx.afterCombat=null; fieldPhase(ctx,p); }
    } else if (p) { if (ctx.stage === 0) netPhase(ctx,p); else fieldPhase(ctx,p); }
    // Combat keeps its own cursor if interrupted immediately after a hit.
    if (!ctx.combatState) {
      if (ctx.stage === 0) ctx.stage = 1;
      else { ctx.stage = 0; ctx.ph++; }
    }
    if (ctx.alert && !ctx.aborted) { ctx.waiting = true; ctx.decisions++; return ctx; }
    if (ctx.team.field.length && ctx.team.field.every(m=>!alive(m))) abort(ctx,'現場の全員が動けない。撤退');
  }
  ctx.success = !ctx.aborted && ctx.goals >= ctx.need;
  if (!ctx.aborted && !ctx.success) ctx.reason = '目標に届かなかった';
  ctx.endNight = ctx.aborted ? ctx.night : Math.ceil(route.field.length / 5);
  ctx.finished = true;
  return ctx;
}
function resolveMission(job, routeIdx, team, sim) {
  return runMission(missionContext(job,routeIdx,team,sim));
}
function missionDecision(uid, proceed) {
  const ms = G.missions.find(m=>m.uid===uid);
  if (!ms || !ms.progress || !ms.progress.waiting) return;
  const ctx = ms.progress;
  ctx.all=teamIds(ctx.team);
  ms.shownLog = ctx.log.length;
  ctx.waiting = false; ctx.alert = null;
  L(ctx,'',proceed ? 'フィクサーの指示：続行' : 'フィクサーの指示：撤退', 'warn');
  if (!proceed) { abort(ctx,'フィクサーの判断で撤退'); ctx.combatState = null; }
  save();
}

/* ───────── 精算 ───────── */

function killRunner(r, cause) {
  G.runners = G.runners.filter((x) => x !== r);
  G.memorial.push({ name: r.name, role: r.role, story: r.story, night: G.night, cause, jobs: r.jobs });
}
function leaveRunner(r) {
  G.runners = G.runners.filter((x) => x !== r);
  if (r.story) G.flags['story_' + r.story] = true;
}

function makeBonus(job) {
  return {
    title: job.title,
    opts: [
      { kind: 'cyber', title: '義体', text: '闇医者の割引券。次の義体化が半額になる' },
      { kind: 'intel', title: '情報', text: '情報屋のツケ。次の下調べ2回が無料になる' },
      rnd() < 0.5
        ? { kind: 'cred', title: '人脈', text: '顔役に名前を売る。評判 +4' }
        : { kind: 'cool', title: '人脈', text: '知り合いの記者に握りつぶしてもらう。いちばん高いヒート −15' },
    ],
  };
}
function applyBonus(i) {
  const b = G.pending.shift();
  if (!b) return;
  const o = b.opts[i];
  if (o.kind === 'cyber') G.vouchers.cyber++;
  if (o.kind === 'intel') G.vouchers.intel += 2;
  if (o.kind === 'cred') { G.cred += 4; refreshBoard(true); }
  if (o.kind === 'cool') { const c = CORPS.reduce((a, b) => (G.heat[b] > G.heat[a] ? b : a)); G.heat[c] = Math.max(0, G.heat[c] - 15); }
  save();
}

function campaignDone(n, out) {
  G.flags['camp' + n] = true;
  if (n === 5) { G.awaitEnding = true; return; }
  G.chapter = n + 1;
  out.story.push(n + 1);
}

function settle(ms, out) {
  const job = ms.job, res = ms.result;
  const s = { title: job.title, route: job.routes[ms.routeIdx].name, success: res.success, reason: res.reason, lines: [], net: 0, deaths: [], deadRunners: [], notes: [], cred: 0, growth: [], credits: [] };
  const members = res.members;
  const n = members.length || 1;
  for (const m of members) {
    const r = getR(m.id);
    if (!r) continue;
    if (m.dead) { s.deadRunners.push(clone(r)); killRunner(r, job.title); s.deaths.push(r.name); continue; }
    r.hp = m.hp; r.armor = m.armor; r.status = 'idle'; r.jobs++; r.kills += m.kills;
    for (const [sk, n] of Object.entries((res.xp || {})[m.id] || {})) {
      const ups = gainXp(r, sk, n);
      if (ups.length) s.growth.push(`${r.name}の${sk}が ${ups[0] - 1}→${ups[ups.length - 1]} に上がった`);
    }
    if (m.down && !m.rescued) s.notes.push(`${r.name}は重体で戻った（HP 0）`);
    if (m.rescued) s.notes.push(`${r.name}はラザロに回収された（HP 1）`);
    if (job.rank >= 2 && res.success) {
      r.elite++;
      if (!r.perk && r.elite >= 3) { r.perk = true; s.notes.push(`${r.name}が「${ROLES[r.role].perk.name}」を覚えた：${ROLES[r.role].perk.desc}`); }
    }
  }
  for (const [k, n] of Object.entries(res.credit || {})) {
    const [id, label] = k.split('|');
    const m = members.find((x) => String(x.id) === id);
    if (!m) continue;
    s.credits.push({ name: m.name, label, n });
    const r = getR(m.id);
    if (r && label === ROLES[r.role].perk.name) r.perkUses = (r.perkUses || 0) + n;
  }
  s.credits.sort((a, b) => b.n - a.n);
  if (res.lazarus.length) {
    const fee = Math.round(Math.max(job.payout, 2000) * 0.3) * res.lazarus.length;
    G.money -= fee; s.net -= fee;
    s.lines.push([`ラザロ回収費 ×${res.lazarus.length}`, -fee]);
  }
  if (res.success) {
    const amount = Math.round(job.payout * Math.max(0.2, res.rewardMult));
    const fee = Math.round(amount * BROKER_RATE);
    const per = Math.round((amount - fee) / n);
    let excl = 0;
    if (amount > 0) s.lines.push([`仲介料（依頼額 ${fmt(amount)}cr の20%）`, fee]);
    for (const m of members) {
      const r = getR(m.id);
      if (!r) { excl += per; continue; }
      if (r.contract === 'exclusive') { excl += per; r.loyalty = clamp(r.loyalty + 5, 0, 100); continue; }
      r.wallet += per;
      const dm = demand(r);
      if (per < dm) { r.discontent++; s.notes.push(`${r.name}（歩合）の分け前 ${fmt(per)}cr は本人へ。希望の ${fmt(dm)}cr に届かず、不満がたまった`); }
      else { r.discontent = Math.max(0, r.discontent - 1); s.notes.push(`${r.name}（歩合）の分け前 ${fmt(per)}cr は本人へ`); }
    }
    if (excl) s.lines.push(['専属ランナーの分け前', excl]);
    G.money += fee + excl; s.net += fee + excl;
    const cnt = G.repeats[job.tpl] || 0;
    s.cred = job.special ? job.cred : cnt === 0 ? job.cred : cnt === 1 ? Math.ceil(job.cred / 2) : 0;
    if (!job.special && cnt >= 1) s.notes.push(cnt === 1 ? '同じ仕事は2回目。評判の伸びは半分' : '同じ仕事の繰り返し。評判は上がらない');
    G.cred += s.cred;
    if (!job.special) G.repeats[job.tpl] = cnt + 1;
    G.successes++;
    if (job.intro) { G.rank++; s.notes.push(`評判ランク ${G.rank}「${RANK_NAME[G.rank]}」に上がった。上の依頼が回ってくる`); }
    if (job.campaign) campaignDone(job.campaign, out);
    if (job.campaign !== 5) { G.pending.push(makeBonus(job)); s.bonus = true; }
  } else {
    G.cred = Math.max(0, G.cred - 2); s.cred = -2;
    for (const m of members) { const r = getR(m.id); if (r && r.contract === 'exclusive') r.loyalty = clamp(r.loyalty - 3, 0, 100); }
  }
  const heat = { ...res.heat };
  if (job.target && CLIENTS[job.target].kind === 'corp') heat[job.target] = (heat[job.target] || 0) + Math.round(job.heat * (res.success ? 1 : 0.5));
  if (CLIENTS[job.client].kind === 'corp') for (const c of CORPS) if (c !== job.client && c !== job.target) heat[c] = (heat[c] || 0) + job.rank * 4;
  for (const c in heat) {
    G.heat[c] = clamp(G.heat[c] + heat[c], 0, 100);
    if (heat[c] > 0) out.touched[c] = true;
  }
  s.heat = heat;
  World.settle(ms, s, out);
  return s;
}

/* ───────── 夜の終わり ───────── */

function upkeepItems() {
  const items = [['隠れ家の家賃', RENT], ...World.upkeep()];
  for (const r of G.runners) if (r.contract === 'exclusive') items.push([`${r.name}の手当`, r.stipend]);
  const laz = G.runners.filter((r) => r.lazarus).length;
  if (laz) items.push([`ラザロ会費 ×${laz}`, laz * LAZARUS_FEE]);
  for (const l of G.loans) items.push([`${l.label}（残り${l.nightsLeft}夜）`, l.perNight]);
  return items;
}

function desert(r, out) {
  out.deserted.push(clone(r));
  leaveRunner(r);
  const boss = {
    name: r.name, hits: 3,
    dv: clamp(stat(r, 'REF') + skill(r, '回避') + 3, 13, 21),
    atk: clamp(stat(r, 'REF') + skill(r, '射撃') + 3, 13, 21), dice: 4, plus: 2,
  };
  const rank = Math.max(2, G.rank);
  const tpl = {
    id: 'deserter_' + r.id, rank, title: `元部下の${r.name}を止める`, client: 'resident', target: null, deserter: true,
    nights: 1, payout: 9000, cred: 8, heat: 0, req: ['solo'], boss,
    desc: `ヒューマニティが尽きた${r.name}が、屋台街で暴れている。義体を入れたのは、あなただ。`,
    routes: [
      { name: '屋台街', note: '人混みの中で', field: [S(15, '足取りを追う'), H(C(2, '巻き込まれた用心棒')), _, B(r.name), O('決着')], net: N5() },
      { name: '寝床', note: '帰ってくるのを待つ', field: [_, H(T(15, '仕掛けられた罠')), R('向かいの部屋'), B(r.name), O('決着')], net: N5() },
    ],
  };
  const j = addJob(tpl, true);
  j.expires = G.night + 5;
  out.events.push({ kind: 'ng', text: `${r.name}のヒューマニティが0になった。隠れ家から姿を消し、依頼盤に「${r.name}を止める」依頼が載った` });
}

function raid(corp, out) {
  const defenders = G.runners.filter(available).sort((a, b) => power(b) - power(a)).slice(0, 3);
  const job = { title: `${CLIENTS[corp].name}の襲撃`, rank: G.rank, district: 'street', tags: ['defense'], target: null, routes: [{ field: [C(Math.max(1, 2 + G.rank - World.securityReduction()), `${CLIENTS[corp].short}の襲撃部隊`)], net: [_] }] };
  let ok = false, log = [{ t: '', who: '', text: '隠れ家には動けるランナーがいなかった', kind: 'ng' }];
  if (defenders.length) {
    const team = { field: defenders.map(snap), support: [], net: [] };
    const res = resolveMission(job, 0, team, false);
    ok = !res.aborted;
    log = res.log;
    for (const m of team.field) {
      const r = getR(m.id);
      if (m.dead) { killRunner(r, '隠れ家の防衛'); continue; }
      r.hp = m.hp; r.armor = m.armor;
    }
    if (res.lazarus.length) G.money -= 600 * res.lazarus.length;
  }
  out.comms.push({ title: job.title, route: '隠れ家の防衛', k: 1, of: 1, lines: log, ends: true, success: ok, raid: true, corp });
  if (ok) { G.heat[corp] = 60; out.events.push({ kind: 'ok', text: `${CLIENTS[corp].short}の襲撃を退けた。ヒートは60まで下がった` }); }
  else {
    const loss = Math.max(1000, Math.round(Math.max(0, G.money) * 0.3));
    G.money -= loss; G.heat[corp] = 50;
    out.events.push({ kind: 'ng', text: `${CLIENTS[corp].short}に隠れ家を荒らされ、${fmt(loss)}cr を奪われた` });
  }
}

function endNight() {
  G.nightInProgress = true;
  const out = { night: G.night, comms: [], settle: [], upkeep: [], upkeepTotal: 0, events: [], story: [], touched: {}, heat: [], deserted: [] };
  for (const ms of G.missions) {
    if (ms.result) continue;
    const ctx = ms.progress || (ms.progress = missionContext(ms.job, ms.routeIdx, snapTeam(ms.team), false, true));
    if (ctx.environmentNight !== G.night) {
      World.context(ctx); ctx.environmentNight=G.night;
    }
    runMission(ctx, G.night - ms.start + 1);
    if (ctx.waiting) {
      const rt = ms.job.routes[ms.routeIdx];
      out.pending = true;
      out.comms.push({uid:ms.uid, title:ms.job.title, route:rt.name, k:ctx.night, of:ms.job.nights,
        phases:rt, intel:ms.job.intel, pending:true, reason:ctx.alert,
        lines:ctx.log.slice(ms.shownLog || 0), ends:false});
      save(); return out;
    }
    if (ctx.finished) ms.result = {success:ctx.success,reason:ctx.reason,log:ctx.log,heat:ctx.heat,
      lazarus:ctx.lazarus,rewardMult:ctx.rewardMult,endNight:ctx.endNight,members:teamIds(ctx.team),xp:ctx.xp,credit:ctx.credit};
  }
  World.beforeNight(out);
  const heatBefore = { ...G.heat };
  const tonight = new Set(G.missions.flatMap((m) => teamIds(m.team)));

  // 1. 派遣
  const done = [];
  for (const ms of G.missions) {
    const partial = ms.progress;
    const result = ms.result || {log:partial.log,endNight:Infinity};
    const k = G.night - ms.start + 1;
    const ends = k >= result.endNight;
    const rt = ms.job.routes[ms.routeIdx];
    out.comms.push({
      title: ms.job.title, route: rt.name, k, of: ms.job.nights,
      phases: { field: rt.field, net: rt.net }, intel: ms.job.intel, client: ms.job.client,
      lines: result.log.filter((l) => l.night === k), visibleLines: result.log.slice(ms.shownLog || 0).filter(l=>l.night===k), ends, success: ends ? result.success : null,
    });
    if (ends) { out.settle.push(settle(ms, out)); done.push(ms); }
  }
  G.missions = G.missions.filter((m) => !done.includes(m));
  if (G.chapter === 1 && G.successes >= 3) { G.chapter = 2; out.story.push(2); }

  // 2. 固定費
  out.upkeep = upkeepItems();
  out.upkeepTotal = out.upkeep.reduce((a, b) => a + b[1], 0);
  G.money -= out.upkeepTotal;
  for (const l of G.loans) l.nightsLeft--;
  for (const l of G.loans.filter((x) => x.nightsLeft <= 0)) out.events.push({ kind: 'ok', text: `${l.label}を払い終えた` });
  G.loans = G.loans.filter((l) => l.nightsLeft > 0);

  // 3. ランナーの夜
  for (const r of G.runners.slice()) {
    if (r.status === 'therapy') {
      r.therapy--;
      if (r.therapy <= 0) {
        r.status = 'idle';
        r.humanity = Math.min(maxHum(r), r.humanity + 15);
        out.events.push({ kind: 'ok', text: `${r.name}のセラピーが終わった。ヒューマニティ +15` });
      }
    }
    const busy = tonight.has(r.id);
    if (r.status !== 'mission' && !busy) {
      r.hp = Math.min(maxHp(r), r.hp + 3);
      if (r.contract === 'exclusive') r.loyalty = clamp(r.loyalty + 1, 0, 100);
    }
    if (busy && r.humanity <= 30 && r.humanity > 0) {
      r.loyalty = clamp(r.loyalty - 3, 0, 100);
    }
    if (r.humanity <= 0) { desert(r, out); continue; }
    if (r.contract === 'commission' && r.status === 'idle') {
      const opts = ROLE_CYBER[r.role].filter((c) => !r.cyber.includes(c) && cyberPrice(c) <= r.wallet);
      const wish = gearWish(r);
      if (wish.length && rnd() < 0.3) {
        const id = pick(wish);
        r.wallet -= gearPrice(id);
        r.wallet += equipGear(r, id);
        out.events.push({ kind: 'ok', text: `${r.name}が自腹で「${GEAR[id].name}」を買った（${GEAR[id].desc}）` });
      } else if (opts.length && rnd() < 0.25) {
        const c = pick(opts);
        r.wallet -= cyberPrice(c);
        installCyber(r, c);
        out.events.push({ kind: 'warn', text: `${r.name}が自腹で「${CYBER[c].name}」を入れた。ヒューマニティ −${CYBER[c].hl}` });
      }
      if (rnd() < 0.02 + 0.05 * Math.min(r.discontent, 4)) {
        leaveRunner(r);
        out.events.push({ kind: 'ng', text: `${r.name}（歩合）が${World.poached(r)}に引き抜かれた` });
        continue;
      }
    }
    if (r.contract === 'exclusive' && r.status === 'idle' && r.loyalty < 15 && rnd() < 0.3) {
      const take = Math.min(Math.max(0, Math.round(G.money * 0.1)), 1500);
      G.money -= take;
      leaveRunner(r);
      out.events.push({ kind: 'ng', text: `${r.name}が姿を消した。金庫から ${fmt(take)}cr がなくなっている` });
    }
  }

  World.afterNight(out, tonight);
  // 4. ヒートと襲撃
  // 手を出した企業は冷めない。第4章からは全社が毎夜+3
  for (const c of CORPS) {
    if (G.chapter >= 4) G.heat[c] = clamp(G.heat[c] + 3, 0, 100);
    else if (!out.touched[c]) G.heat[c] = clamp(G.heat[c] - 1, 0, 100);
  }
  for (const c of CORPS) if (G.heat[c] >= 100) raid(c, out);
  out.heat = CORPS.map((c) => [c, G.heat[c], G.heat[c] - heatBefore[c]]);

  // 5. 赤字判定
  if (G.money < 0) {
    G.negStreak++;
    out.events.push({ kind: 'ng', text: `所持金がマイナス。${G.negStreak}夜目（3夜続くと廃業）` });
  } else G.negStreak = 0;
  if (G.negStreak >= 3) G.ended = { type: 'bankrupt' };

  // 6. 翌夜の準備
  G.nightInProgress = false;
  G.night++;
  World.nextNight();
  refreshScouts();
  refreshBoard();
  G.archive.unshift({ night: out.night, comms: out.comms });
  G.archive = G.archive.slice(0, 15);
  G.lastReport = { night: out.night, upkeepTotal: out.upkeepTotal };
  save();
  return out;
}

/* ───────── 契約・闇医者 ───────── */

function hire(i, contract) {
  const r = G.scouts[i];
  if (!r) return '候補が見つかりません';
  if (G.runners.length >= ROSTER_MAX) return `抱えられるのは${ROSTER_MAX}人までです`;
  if (contract === 'exclusive' && r.pref === 'commission') return `${r.name}は歩合でしか組まない`;
  if (contract === 'commission' && r.pref === 'exclusive') return `${r.name}は専属契約でなければ組まない`;
  r.contract = contract;
  r.stipend = contract === 'exclusive' ? stipendFor(r) : 0;
  r.joined = G.night;
  G.runners.push(r);
  G.scouts.splice(i, 1);
  refreshBoard(true);
  return null;
}
function setContract(r, contract) {
  if (contract === 'exclusive') {
    if (r.pref === 'commission') return `${r.name}は専属を嫌がっている`;
    r.contract = 'exclusive'; r.stipend = stipendFor(r); r.discontent = 0;
  } else {
    if (r.pref === 'exclusive') return `${r.name}は歩合では組まない`;
    r.contract = 'commission'; r.stipend = 0; r.loyalty = clamp(r.loyalty - 10, 0, 100);
  }
  return null;
}
function fire(r) {
  if (r.status === 'mission') return '仕事中のランナーは切れません';
  leaveRunner(r);
  return null;
}

const cyberPrice = (c) => Math.round((CYBER[c].loan[0] * CYBER[c].loan[1] * 0.8 * World.priceMultiplier()) / 50) * 50;
function installCyber(r, c) {
  const hpRatio = r.hp / maxHp(r);
  r.cyber.push(c);
  r.humanity -= CYBER[c].hl;
  r.hp = Math.round(maxHp(r) * hpRatio);
  if (CYBER[c].mods.armor) r.armor += CYBER[c].mods.armor;
}
function buyCyber(r, c, pay) {
  if (r.status === 'mission') return '仕事中です';
  if (r.cyber.includes(c)) return 'もう入っています';
  const half = G.vouchers.cyber > 0 ? 0.5 : 1;
  if (pay === 'loan') {
    if (r.contract !== 'exclusive') return '歩合のランナーには立て替えられません';
    G.loans.push({ id: 'loan' + G.nextId++, label: `${r.name}の${CYBER[c].name}`, perNight: Math.round(CYBER[c].loan[0] * half * World.priceMultiplier()), nightsLeft: CYBER[c].loan[1], runnerId: r.id });
  } else if (pay === 'cash') {
    if (r.contract !== 'exclusive') return '歩合のランナーには立て替えられません';
    const p = Math.round(cyberPrice(c) * half);
    if (p > G.money) return '所持金が足りません';
    G.money -= p;
  } else if (pay === 'wallet') {
    const p = Math.round(cyberPrice(c) * half);
    if (p > r.wallet) return `${r.name}の手持ちが足りません`;
    r.wallet -= p;
  }
  if (half < 1) G.vouchers.cyber--;
  installCyber(r, c);
  return null;
}
const gearPrice = (id) => Math.round((GEAR[id].price * World.gearMultiplier()) / 50) * 50;
const gearRefund = (id) => Math.round(GEAR[id].price / 2 / 50) * 50;
/* 同じ部位の装備は入れ替え。前の装備は半額で下取りし、払った側に戻す */
function equipGear(r, id) {
  const g = GEAR[id], old = r.gear[g.slot];
  const hpRatio = r.hp / maxHp(r), armorLost = armorMax(r) - r.armor;
  r.gear[g.slot] = id;
  r.hp = Math.round(maxHp(r) * hpRatio);
  r.armor = Math.max(0, armorMax(r) - armorLost);
  return old ? gearRefund(old) : 0;
}
function buyGear(r, id) {
  const g = GEAR[id];
  if (!g) return '装備が見つかりません';
  if (r.status === 'mission') return '仕事中です';
  if (r.gear[g.slot] === id) return 'もう持っています';
  const p = gearPrice(id);
  if (r.contract === 'exclusive') {
    if (p > G.money) return '所持金が足りません';
    G.money -= p;
    G.money += equipGear(r, id);
  } else {
    if (p > r.wallet) return `${r.name}の手持ちが足りません`;
    r.wallet -= p;
    r.wallet += equipGear(r, id);
  }
  return null;
}
/* 歩合のランナーが自腹で買う候補：相性がよく、今の装備より高いもの */
function gearWish(r) {
  return Object.keys(GEAR).filter((id) => {
    const g = GEAR[id], cur = r.gear[g.slot];
    return g.roles.includes(r.role) && cur !== id && (!cur || GEAR[cur].price < g.price) && gearPrice(id) <= r.wallet;
  });
}

const treatCost = (r) => (maxHp(r) - r.hp) * 20;
const repairCost = (r) => Math.round((armorMax(r) - r.armor) * 40 * World.repairMultiplier());
const THERAPY_COST = 600;
function treat(r) {
  const c = treatCost(r);
  if (r.status !== 'idle') return '今は治療できません';
  if (c > G.money) return '所持金が足りません';
  G.money -= c; r.hp = maxHp(r);
  return null;
}
function repair(r) {
  const c = repairCost(r);
  if (r.status === 'mission') return '仕事中です';
  if (c > G.money) return '所持金が足りません';
  G.money -= c; r.armor = armorMax(r);
  return null;
}
function therapy(r) {
  if (r.status !== 'idle') return '今は受けられません';
  if (r.humanity >= maxHum(r)) return 'ヒューマニティは減っていません';
  if (THERAPY_COST > G.money) return '所持金が足りません';
  G.money -= THERAPY_COST; r.status = 'therapy'; r.therapy = World.therapyNights();
  return null;
}

function chooseEnding(key) {
  G.awaitEnding = false;
  if (key === 'publish') { G.cred += 50; for (const c of CORPS) G.heat[c] = 100; }
  if (key === 'sell') G.money += 40000;
  G.ended = { type: key };
  clearSave();
}
