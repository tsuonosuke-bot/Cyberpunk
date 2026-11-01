/* FIXER'S CUT — 状態、d10判定、夜の進行 */

const SAVE_KEY = 'fixers-cut-save-v1';
const RENT = 200;
const LAZARUS_FEE = 100;
const BROKER_RATE = 0.2;
const ROSTER_MAX = 8;
const RANK_ENEMY = {
  1: { dv: 13, atk: 14, dice: 2, plus: 1 },
  2: { dv: 16, atk: 16, dice: 3, plus: 3 },
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
const stat = (r, k) => r.base[k] + (cyberMods(r)[k] || 0);
const skill = (r, k) => (r.skills[k] || 0) + (cyberMods(r)[k] || 0);
const maxHp = (r) => 11 + stat(r, 'BODY') * 4;
const maxHum = (r) => r.base.EMP * 10;
const armorMax = (r) => r.armorBase + (cyberMods(r).armor || 0);
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
    id: G.nextId++, name: opt.name || freshName(), role, origin, contact, base, skills,
    cyber: (opt.cyber || []).slice(), armorBase: R.armor, story: opt.story || null, bio: opt.bio || '',
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
  const a = makeRunner('solo', { name: 'ジロウ', origin: 'street', pref: 'any' });
  const b = makeRunner('driver', { name: 'サエ', origin: 'drifter', pref: 'any' });
  a.wallet = 200; b.wallet = 100;
  G.runners.push(a, b);
  refreshScouts();
  refreshBoard();
  return G;
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 保存できない環境では無視 */ }
}
function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) { const g = JSON.parse(s); if (g && g.v === 1 && !g.ended) return g; }
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
  while (G.scouts.length < 3) G.scouts.push(makeRunner(roles.pop()));
}

const hasJob = (tplId) => G.board.some((j) => j.tpl === tplId) || G.missions.some((m) => m.job.tpl === tplId);

function addJob(tpl, special) {
  const j = clone(tpl);
  j.uid = G.nextId++;
  j.tpl = tpl.id;
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
  if (specialsOnly) return;
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
  G.board.sort((a, b) => (b.special - a.special) || (b.rank - a.rank) || (b.payout - a.payout));
}

/* ───────── 編成 ───────── */

const teamIds = (t) => [...t.field, ...t.support, ...t.net];

function validateTeam(job, team) {
  const errs = [];
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
  return {
    id: r.id, name: r.name, role: r.role, st, sk, hp: r.hp, maxHp: maxHp(r), armor: r.armor, armorMax: armorMax(r),
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
  for (let i = 0; i < n; i++) {
    const t = { field: cp(base.field), support: cp(base.support), net: cp(base.net) };
    const res = resolveMission(job, routeIdx, t, true);
    if (res.success) ok++;
    if (teamIds(t).some((m) => m.dead)) death++;
  }
  return { p: ok / n, death: death / n };
}

function payPreview(job, team) {
  const ids = teamIds(team);
  const n = ids.length || 1;
  const fee = Math.round(job.payout * BROKER_RATE);
  const per = Math.round((job.payout - fee) / n);
  const rows = ids.map(getR).filter(Boolean).map((r) => ({ r, per, excl: r.contract === 'exclusive', short: r.contract !== 'exclusive' && per < demand(r) }));
  const excl = rows.filter((x) => x.excl).length * per;
  return { fee, per, excl, rows, total: fee + excl };
}

function intelCost(job) {
  if (G.vouchers.intel > 0) return 0;
  const half = G.runners.some((r) => r.contact === job.client);
  return Math.round(INTEL_COST[job.rank] * (half ? 0.5 : 1));
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
  const job = G.board.find((j) => j.uid === uid);
  if (!job) return ['依頼が見つかりません'];
  const errs = validateTeam(job, team);
  if (errs.length) return errs;
  G.board = G.board.filter((j) => j !== job);
  for (const id of teamIds(team)) getR(id).status = 'mission';
  G.missions.push({ uid, job, routeIdx, team: clone(team), start: G.night, result: null });
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

function check(ctx, m, sk, dv) {
  const stK = SKILL_STAT[sk];
  const sv = m.st[stK], kv = m.sk[sk] || 0;
  let bonus = 0;
  if (m.perk === 'backdoor' && sk === 'インターフェース') bonus += 2;
  if (m.perk === 'getaway' && sk === '運転') bonus += 3;
  const wound = !m.pain && m.hp < m.maxHp / 2 ? 2 : 0;
  const r = d(10);
  let ex = 0, rs = `d10(${r})`;
  if (r === 10) { ex = d(10); rs = `d10(10, +${ex})`; }
  else if (r === 1) { ex = -d(10); rs = `d10(1, −${-ex})`; }
  const total = sv + kv + bonus - wound + r + ex;
  const ok = total >= dv;
  const calc = ctx.sim ? '' : `${stK} ${sv}＋${sk} ${kv}${bonus ? `＋補正 ${bonus}` : ''}${wound ? '－重傷 2' : ''}＋${rs}＝${total} ${ok ? '≧' : '＜'} DV${dv}`;
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
}

function deathSave(ctx, m) {
  m.down = true;
  let bonus = ctx.all.some((x) => x !== m && alive(x) && x.role === 'med') ? 1 : 0;
  if (ctx.all.some((x) => x !== m && alive(x) && x.perk === 'surgeon')) bonus += 2;
  const r = d(10), need = m.st.BODY + bonus;
  if (r < need) {
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
  const E = RANK_ENEMY[ctx.rank];
  const foes = o.boss
    ? [{ ...o.boss }]
    : Array.from({ length: n }, () => ({ name: label, hits: 1, dv: E.dv, atk: E.atk, dice: E.dice, plus: E.plus }));
  L(ctx, '', `${label}と交戦　敵${foes.length}${o.boss ? `（耐久${o.boss.hits}）` : ''}${o.ambush ? '　待ち伏せ。先に撃たれる' : ''}`, o.ambush ? 'ng' : 'info');
  const fighters = () => (o.chase ? ctx.team.field.concat(ctx.team.support) : ctx.team.field).filter(alive);
  const enemyTurn = () => {
    for (const e of foes.filter((f) => f.hits > 0)) {
      const tg = fighters();
      if (!tg.length) break;
      const t = pick(tg);
      const c = check(ctx, t, '回避', e.atk);
      if (!c.ok) { L(ctx, t.name, `${e.name}の攻撃をかわせない`, 'ng', c.calc); hit(ctx, t, roll(e.dice, 6) + e.plus, false); }
    }
  };
  if (o.ambush) enemyTurn();
  for (let round = 0; round < 3; round++) {
    for (const m of fighters()) {
      const shots = m.perk === 'double' ? 2 : 1;
      for (let s = 0; s < shots; s++) {
        const e = foes.find((f) => f.hits > 0);
        if (!e) break;
        const c = check(ctx, m, '射撃', e.dv);
        L(ctx, m.name, `${e.name}を${s ? '続けて' : ''}攻撃`, c.ok ? 'ok' : 'ng', c.calc);
        if (!c.ok) continue;
        e.hits--;
        if (e.hits > 0) { sub(ctx, `${e.name} 残り耐久${e.hits}`); continue; }
        m.kills++;
        if (m.humanity <= 15 && rnd() < 0.35) {
          addHeat(ctx, ctx.job.target, 4);
          sub(ctx, `${m.name}が過剰な暴力をふるった${ctx.job.target ? `　${CLIENTS[ctx.job.target].short}のヒート +4` : ''}`, 'ng');
        }
      }
    }
    if (!foes.some((f) => f.hits > 0)) { L(ctx, '', `${label}を制圧`, 'ok'); return true; }
    enemyTurn();
    if (!fighters().length) { abort(ctx, `${label}との交戦で全員が倒れた。撤退`); return false; }
  }
  abort(ctx, `${label}を押し切れず撤退`);
  return false;
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
  if (ctx.all.some((x) => alive(x) && x.perk === 'patch')) for (const m of ctx.all) m.armor = Math.min(m.armorMax, m.armor + 2);
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
        sub(ctx, `警報${tgt ? `　${CLIENTS[tgt].name}のヒート +8` : ''}　次の交戦で敵+1`, 'ng');
        hit(ctx, m, roll(2, 6), false);
      }
      break;
    }
    case 'combat': {
      const n = p.n + ctx.mods.extraEnemy;
      ctx.mods.extraEnemy = 0;
      combat(ctx, n, p.l, { ambush: p.hidden && !ctx.job.intel });
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
        L(ctx, '', '警報で追手がかかった。追撃戦', 'ng');
        if (!combat(ctx, 2, '追手', { chase: true })) return;
      }
      const m = best(SUP.concat(F), '運転'); if (!m) return;
      const c = check(ctx, m, '運転', p.dv);
      L(ctx, m.name, p.l, c.ok ? 'ok' : 'ng', c.calc);
      if (!c.ok) { sub(ctx, '振り切れない', 'ng'); combat(ctx, 2, '追いすがる追手', { chase: true }); }
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
    case 'alarm': ctx.mods.chase = true; sub(ctx, '警報が作動。逃走は追撃戦になる', 'ng'); break;
    case 'trace': addHeat(ctx, tgt, 6); sub(ctx, `逆探知された${tgt ? `　${CLIENTS[tgt].short}のヒート +6` : ''}`, 'ng'); break;
    case 'data': abort(ctx, `${p.l}を抜けず撤退`); break;
  }
}

function resolveMission(job, routeIdx, team, sim) {
  const route = job.routes[routeIdx];
  const blind = sim && !job.intel;
  const all = [...team.field, ...team.support, ...team.net];
  const ctx = {
    job, rank: job.rank, team, all, sim, log: [], heat: {}, lazarus: [],
    mods: { extraEnemy: 0, gateUp: 0, chase: false },
    rewardMult: 1, aborted: false, reason: '', goals: 0, need: 0, night: 1, clock: 22 * 60, ph: 0, lane: 'field',
  };
  const len = route.field.length;
  for (let i = 0; i < len; i++) {
    for (const p of [route.field[i], route.net[i]]) {
      if (p && (p.t === 'goal' || p.fx === 'data') && !(blind && p.hidden)) ctx.need++;
    }
  }
  for (let i = 0; i < len; i++) {
    ctx.night = i < 5 ? 1 : 2;
    ctx.clock = 22 * 60 + (i % 5) * 78 + rint(2, 20);
    let n = route.net[i], f = route.field[i];
    if (blind) { if (n && n.hidden) n = null; if (f && f.hidden) f = null; }
    ctx.ph = i;
    ctx.lane = 'net';
    if (n) netPhase(ctx, n);
    ctx.lane = 'field';
    if (!ctx.aborted && f) fieldPhase(ctx, f);
    if (!ctx.aborted && team.field.length && team.field.every((m) => !alive(m))) abort(ctx, '現場の全員が動けない。撤退');
    if (ctx.aborted) break;
  }
  ctx.success = !ctx.aborted && ctx.goals >= ctx.need;
  if (!ctx.aborted && !ctx.success) ctx.reason = '目標に届かなかった';
  ctx.endNight = ctx.aborted ? ctx.night : (len > 5 ? 2 : 1);
  return ctx;
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
  const s = { title: job.title, route: job.routes[ms.routeIdx].name, success: res.success, reason: res.reason, lines: [], net: 0, deaths: [], deadRunners: [], notes: [], cred: 0 };
  const members = res.members;
  const n = members.length || 1;
  for (const m of members) {
    const r = getR(m.id);
    if (!r) continue;
    if (m.dead) { s.deadRunners.push(clone(r)); killRunner(r, job.title); s.deaths.push(r.name); continue; }
    r.hp = m.hp; r.armor = m.armor; r.status = 'idle'; r.jobs++; r.kills += m.kills;
    if (m.down && !m.rescued) s.notes.push(`${r.name}は重体で戻った（HP 0）`);
    if (m.rescued) s.notes.push(`${r.name}はラザロに回収された（HP 1）`);
    if (job.rank >= 2 && res.success) {
      r.elite++;
      if (!r.perk && r.elite >= 3) { r.perk = true; s.notes.push(`${r.name}が「${ROLES[r.role].perk.name}」を覚えた：${ROLES[r.role].perk.desc}`); }
    }
  }
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
  return s;
}

/* ───────── 夜の終わり ───────── */

function upkeepItems() {
  const items = [['隠れ家の家賃', RENT]];
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
  const job = { title: `${CLIENTS[corp].name}の襲撃`, rank: G.rank, target: null, routes: [{ field: [C(2 + G.rank, `${CLIENTS[corp].short}の襲撃部隊`)], net: [_] }] };
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
  const out = { night: G.night, comms: [], settle: [], upkeep: [], upkeepTotal: 0, events: [], story: [], touched: {}, heat: [], deserted: [] };
  const heatBefore = { ...G.heat };
  const tonight = new Set(G.missions.flatMap((m) => teamIds(m.team)));

  // 1. 派遣
  const done = [];
  for (const ms of G.missions) {
    if (!ms.result) {
      const team = snapTeam(ms.team);
      const res = resolveMission(ms.job, ms.routeIdx, team, false);
      ms.result = {
        success: res.success, reason: res.reason, log: res.log, heat: res.heat, lazarus: res.lazarus,
        rewardMult: res.rewardMult, endNight: res.endNight, members: teamIds(team),
      };
    }
    const k = G.night - ms.start + 1;
    const ends = k >= ms.result.endNight;
    const rt = ms.job.routes[ms.routeIdx];
    out.comms.push({
      title: ms.job.title, route: rt.name, k, of: ms.job.nights,
      phases: { field: rt.field, net: rt.net }, intel: ms.job.intel, client: ms.job.client,
      lines: ms.result.log.filter((l) => l.night === k), ends, success: ends ? ms.result.success : null,
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
      if (opts.length && rnd() < 0.25) {
        const c = pick(opts);
        r.wallet -= cyberPrice(c);
        installCyber(r, c);
        out.events.push({ kind: 'warn', text: `${r.name}が自腹で「${CYBER[c].name}」を入れた。ヒューマニティ −${CYBER[c].hl}` });
      }
      if (rnd() < 0.02 + 0.05 * Math.min(r.discontent, 4)) {
        leaveRunner(r);
        out.events.push({ kind: 'ng', text: `${r.name}（歩合）が他のフィクサーに引き抜かれた` });
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
  G.night++;
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

const cyberPrice = (c) => Math.round((CYBER[c].loan[0] * CYBER[c].loan[1] * 0.8) / 50) * 50;
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
    G.loans.push({ id: 'loan' + G.nextId++, label: `${r.name}の${CYBER[c].name}`, perNight: Math.round(CYBER[c].loan[0] * half), nightsLeft: CYBER[c].loan[1], runnerId: r.id });
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
const treatCost = (r) => (maxHp(r) - r.hp) * 20;
const repairCost = (r) => (armorMax(r) - r.armor) * 40;
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
  G.money -= THERAPY_COST; r.status = 'therapy'; r.therapy = 3;
  return null;
}

function chooseEnding(key) {
  G.awaitEnding = false;
  if (key === 'publish') { G.cred += 50; for (const c of CORPS) G.heat[c] = 100; }
  if (key === 'sell') G.money += 40000;
  G.ended = { type: key };
  clearSave();
}
