/* FIXER'S CUT — 画面と操作 */

const UI = {
  tab: 'home', job: null, route: 0, team: {}, doc: null, ask: null,
  toast: '', toastT: 0, flow: null, modalKey: '', timer: 0, play: null, est: { key: '', val: null },
};
const LANE = { field: '現場', support: '支援', net: 'ネット' };
const LANE_MAX = { field: 3, support: 2, net: 1 };
const app = document.getElementById('app');
const modal = document.getElementById('modal');
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 表示の好み（ゲームのセーブとは別に、ブラウザに残す） */
const PREF_KEY = 'fixers-cut-prefs-v1';
const LOG_SPEED = { slow: ['ゆっくり', 320], normal: ['ふつう', 170], fast: ['速く', 60], instant: ['一瞬', 0] };
const prefs = loadPrefs();
function loadPrefs() {
  const p = { speed: 'normal' };
  try { Object.assign(p, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* 読めない環境では既定値 */ }
  if (!LOG_SPEED[p.speed]) p.speed = 'normal';
  return p;
}
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* 保存できない環境では無視 */ }
}
const instantLog = () => reduced || prefs.speed === 'instant';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cr = (n) => `${n < 0 ? '−' : ''}${fmt(Math.abs(n))}cr`;
const sgn = (n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

function toast(msg) {
  UI.toast = msg;
  clearTimeout(UI.toastT);
  UI.toastT = setTimeout(() => { UI.toast = ''; renderToast(); }, 3200);
  renderToast();
}
function renderToast() {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = UI.toast;
  t.hidden = !UI.toast;
}

/* ───────── 共通部品 ───────── */

function statusText(r) {
  if (r.status === 'mission') return '派遣中';
  if (r.status === 'therapy') return `セラピー中（あと${r.therapy}夜）`;
  if (r.hp <= 0) return '重体（出せない）';
  return '待機中';
}
const contactText = (r) => `${CLIENTS[r.contact].short}に顔が利く`;

function bars(r) {
  const mh = maxHp(r), am = armorMax(r), hm = maxHum(r);
  const z = humZone(r.humanity);
  const pct = (a, b) => clamp((a / b) * 100, 0, 100);
  return `<div class="bars">
    <div class="bar"><span>HP</span><div class="track"><i class="${r.hp < mh / 2 ? 'low' : ''}" style="width:${pct(r.hp, mh)}%"></i></div><b class="num">${r.hp}/${mh}</b></div>
    <div class="bar"><span>防具</span><div class="track ar"><i style="width:${pct(r.armor, am)}%"></i></div><b class="num">${r.armor}/${am}</b></div>
    <div class="bar"><span>人間性</span><div class="track hum" style="--z1:${pct(15, hm)}%;--z2:${pct(30, hm)}%"><i style="width:${pct(Math.max(0, r.humanity), hm)}%"></i></div><b class="num">${r.humanity}/${hm}</b></div>
    <div class="zone z-${z.key}">${z.name}</div>
  </div>`;
}

function perkLine(r) {
  const p = ROLES[r.role].perk;
  if (r.perk) return `<div class="perk on"><span class="label">技能</span> ${p.name}：${p.desc}</div>`;
  return `<div class="perk"><span class="label">技能</span> 格上（R2以上）の成功 <span class="num">${Math.min(r.elite, 3)}/3</span> で「${p.name}」</div>`;
}

function runnerCard(r, mode, idx) {
  const R = ROLES[r.role];
  const skills = SKILLS.filter((k) => skill(r, k) > 0).map((k) => `<span>${k}<b class="num">${skill(r, k)}</b></span>`).join('');
  let contract = '', actions = '';
  if (mode === 'roster') {
    contract = r.contract === 'exclusive'
      ? `<div class="contract"><span class="chip b">専属</span> 手当 <b class="num">${r.stipend}cr</b>/夜 ・ 忠誠 <b class="num">${r.loyalty}</b>${r.loyalty < 25 ? ' <span class="pink">離れそう</span>' : ''}</div>`
      : `<div class="contract"><span class="chip o">歩合</span> 分け前の希望 <b class="num">${fmt(demand(r))}cr</b>以上 ・ 手持ち <b class="num">${fmt(r.wallet)}cr</b>${r.discontent ? ` ・ <span class="pink">不満 ${r.discontent}</span>` : ''}</div>`;
    const busy = r.status === 'mission';
    const toggle = r.contract === 'exclusive'
      ? `<button data-act="contract" data-r="${r.id}" data-v="commission" ${busy ? 'disabled' : ''}>歩合に戻す</button>`
      : `<button data-act="contract" data-r="${r.id}" data-v="exclusive" ${busy ? 'disabled' : ''}>専属にする（${stipendFor(r)}cr/夜）</button>`;
    const fire = UI.ask === 'fire' + r.id
      ? `<button class="danger" data-act="fire" data-r="${r.id}">本当に契約を切る</button>`
      : `<button data-act="askfire" data-r="${r.id}" ${busy ? 'disabled' : ''}>契約を切る</button>`;
    actions = `<div class="actions">${toggle}${fire}</div>`;
  } else if (mode === 'scout') {
    const st = stipendFor(r);
    const prefNote = { any: 'どちらの契約でもいい', commission: '歩合でしか組まない', exclusive: '専属でなければ組まない' }[r.pref];
    contract = `<div class="contract">${prefNote} ・ 専属なら手当 <b class="num">${st}cr</b>/夜 ・ 歩合なら分け前 <b class="num">${fmt(demand(r))}cr</b>以上を希望</div>`;
    actions = `<div class="actions">
      <button data-act="hire" data-v="${idx}" data-c="commission" ${r.pref === 'exclusive' ? 'disabled' : ''}>歩合で雇う</button>
      <button class="primary" data-act="hire" data-v="${idx}" data-c="exclusive" ${r.pref === 'commission' ? 'disabled' : ''}>専属で雇う</button>
    </div>`;
  }
  return `<article class="runner ${mode} ${r.status === 'mission' ? 'away' : ''}">
    <header>
      ${portraitImg(r, 'lg')}
      <div class="nmrow"><b class="nm">${esc(r.name)}</b>${r.story ? '<span class="chip p">物語つき</span>' : ''}${r.lazarus ? '<span class="chip b">ラザロ</span>' : ''}</div>
      <span class="role">${R.tag}<small>${R.name}</small></span>
    </header>
    <div class="meta">${ORIGINS[r.origin].name} ・ ${contactText(r)}${mode === 'roster' ? ` ・ <span class="st st-${r.status}${r.hp <= 0 ? ' st-down' : ''}">${statusText(r)}</span>` : ''}</div>
    ${mode === 'scout' ? `<p class="bio">${esc(r.bio || R.desc)}</p>` : ''}
    ${bars(r)}
    <div class="stats">${STATS.map((k) => `<span><i>${k}</i><b class="num">${stat(r, k)}</b></span>`).join('')}</div>
    <div class="skills">${skills}</div>
    ${r.cyber.length ? `<div class="cy"><span class="label">義体</span> ${r.cyber.map((c) => CYBER[c].name).join('、')}</div>` : ''}
    ${mode === 'roster' ? perkLine(r) + World.perkHtml(r) : ''}
    ${contract}
    ${actions}
  </article>`;
}

/* ───────── 上部・下部 ───────── */

function hud() {
  const tabs = [['home', '隠れ家'], ['scout', 'スカウト'], ['board', '依頼盤'], ['doc', '闇医者'], ['log', '記録']];
  const badge = { scout: G.scouts.length, board: G.board.length };
  const next = G.rank < 3 ? RANK_CRED[G.rank] : null;
  return `<header class="hud"><div class="hud-in">
    <div class="brand"><span class="logo">FIXER'S CUT</span><span class="label">YOMIHAMA ・ 第${G.chapter}章</span></div>
    <dl class="hud-stats">
      <div><dt class="label">夜</dt><dd class="num">${G.night}</dd></div>
      <div class="${G.money < 0 ? 'neg' : ''}"><dt class="label">所持金</dt><dd class="num">${cr(G.money)}${G.negStreak ? ` <span class="chip p">赤字 ${G.negStreak}/3</span>` : ''}</dd></div>
      <div><dt class="label">評判</dt><dd>R${G.rank} ${RANK_NAME[G.rank]} <span class="num dim">${G.cred}${next ? `/${next}` : ''}</span></dd></div>
    </dl>
    <div class="heat" aria-label="企業ごとのヒート">${CORPS.map((c) => `<div class="hb ${G.heat[c] >= 80 ? 'hot' : ''}"><span>${logo(c)}${CLIENTS[c].short}</span><div class="ht"><i style="width:${G.heat[c]}%"></i></div><b class="num">${G.heat[c]}</b></div>`).join('')}</div>
  </div>
  <nav class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${UI.tab === k}" data-act="tab" data-v="${k}">${l}${badge[k] ? `<span class="bd num">${badge[k]}</span>` : ''}</button>`).join('')}</nav>
  </header>`;
}

function dock() {
  const up = upkeepItems().reduce((a, b) => a + b[1], 0);
  const after = G.money - up;
  return `<div class="dock"><div class="dock-in">
    <div class="proj">
      <span class="label">夜明けの見込み</span>
      <span class="num">${cr(G.money)} − ${fmt(up)} ＝ <b class="${after < 0 ? 'pink' : ''}">${cr(after)}</b></span>
      <small>${G.missions.length ? `派遣中${G.missions.length}件の報酬は含みません` : '今夜は誰も出ていません'}</small>
    </div>
    <button class="primary big" data-act="night">夜を明かす</button>
  </div></div>`;
}

/* ───────── 隠れ家 ───────── */

function chapterProgress() {
  const c = G.chapter;
  const ck = (ok, t) => `<li class="${ok ? 'done' : ''}">${ok ? '済' : '未'}　${t}</li>`;
  if (c === 1) return `<ul class="checks">${ck(G.successes >= 3, `依頼の成功 ${Math.min(3, G.successes)}/3`)}</ul>`;
  if (c === 2) {
    const net = G.runners.some((r) => r.role === 'net' && skill(r, 'インターフェース') >= 6);
    return `<ul class="checks">${ck(G.rank >= 2, `評判ランク2（今は${G.rank}、評判 ${G.cred}/${RANK_CRED[1]} で顔役の紹介依頼が出る）`)}${ck(net, 'インターフェース6以上のネットランナー')}</ul>`;
  }
  if (c === 4 && G.rank < 3) return `<ul class="checks">${ck(false, `評判ランク3（評判 ${G.cred}/${RANK_CRED[2]} で紹介依頼が出る）`)}</ul>`;
  return `<ul class="checks">${ck(false, '依頼盤のメイン依頼をこなす')}</ul>`;
}

function viewHome() {
  const st = G.chapter === 1 ? STORY.intro : STORY[G.chapter];
  const up = upkeepItems();
  const missions = G.missions.length
    ? G.missions.map((m) => {
      const k = G.night - m.start + 1;
      const names = teamIds(m.team).map((id) => (getR(id) || {}).name).filter(Boolean).join('、');
      return `<li><b>${esc(m.job.title)}</b><span>${m.job.routes[m.routeIdx].name} ・ ${names}</span><span class="num dim">${k}/${m.job.nights}夜目${m.result ? '' : '（今夜出発）'}</span>${m.result ? '' : `<button class="sm" data-act="recall" data-v="${m.uid}">取り消す</button>`}</li>`;
    }).join('')
    : '<li class="dim">今夜はまだ誰も出ていません。依頼盤から送り出せます。</li>';
  const tut = G.chapter === 1 && G.night <= 3 ? `<section class="panel tut"><h3>はじめての夜</h3><ol>
      <li><b>スカウト</b>で候補を雇う。歩合は毎晩の支払いがないかわりに、分け前が本人のものになる</li>
      <li><b>依頼盤</b>で依頼を選び、ルートを決める。お金に余裕があれば情報を買って「???」を開ける</li>
      <li>ランナーを<b>現場・支援・ネット</b>の枠に入れて送り出す。必須ロールを満たすこと</li>
      <li><b>夜を明かす</b>。通信で判定の結果が届き、そのあと家賃や手当が引かれる</li>
    </ol><p class="dim">所持金が3夜続けてマイナスになると廃業です。</p></section>` : '';
  return `
  <section class="chapter">
    <div class="label">MAIN ・ ブラックボックス</div>
    <h2>${st.title}</h2>
    <p>${st.goal}</p>
    ${chapterProgress()}
  </section>
  ${tut}
  ${World.homeHtml()}
  <div class="cols">
    <section class="panel"><h3>派遣中</h3><ul class="mlist">${missions}</ul></section>
    <section class="panel"><h3 class="pink">毎晩、確実に出ていく</h3>
      <dl class="ledger">${up.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd class="num">${fmt(v)}</dd></div>`).join('')}
      <div class="tot"><dt>合計</dt><dd class="num">${fmt(up.reduce((a, b) => a + b[1], 0))}cr</dd></div></dl>
      ${G.vouchers.cyber || G.vouchers.intel ? `<p class="dim">手持ちの券：${G.vouchers.cyber ? `義体半額 ×${G.vouchers.cyber}　` : ''}${G.vouchers.intel ? `情報無料 ×${G.vouchers.intel}` : ''}</p>` : ''}
    </section>
    <section class="panel"><h3>ヒート</h3>
      <div class="heatlist">${CORPS.map((c) => `<div class="hrow ${G.heat[c] >= 80 ? 'hot' : ''}"><span>${CLIENTS[c].name}</span><div class="ht"><i style="width:${G.heat[c]}%"></i></div><b class="num">${G.heat[c]}</b></div>`).join('')}</div>
      <p class="dim">企業の依頼を受けると、ほかの企業のヒートが上がります。標的にした企業はさらに上がります。100に達すると隠れ家が襲撃され、待機中のランナーで防衛します。${G.chapter >= 4 ? '<span class="pink">第4章からは毎夜+3。</span>' : '手を出さなかった企業は、毎夜1ずつ冷めます。'}</p>
    </section>
  </div>
  <section class="roster">
    <h2 class="sec">ランナー <span class="label num">${G.runners.length}/${ROSTER_MAX}</span></h2>
    <div class="runners">${G.runners.map((r) => runnerCard(r, 'roster')).join('') || '<p class="dim">誰もいません。スカウトで雇ってください。</p>'}</div>
  </section>
  ${G.memorial.length ? `<section class="panel memorial"><h3>帰ってこなかった者</h3><ul>${G.memorial.map((m) => `<li><b>${esc(m.name)}</b>（${ROLES[m.role].name}） 夜${m.night}・${esc(m.cause)}</li>`).join('')}</ul></section>` : ''}`;
}

/* ───────── スカウト ───────── */

function viewScout() {
  return `<section>
    <h2 class="sec">スカウト <span class="label">今夜の候補</span></h2>
    <p class="lead">候補は毎晩入れ替わります。<b>歩合</b>は毎晩の支払いがなく、分け前は本人のもの。忠誠は上がらず、不満がたまると引き抜かれます。<b>専属</b>は待機中も手当がかかるかわりに、分け前がフィクサーに入り、義体のローンも立て替えられます。</p>
    <p class="dim">抱えているランナー ${G.runners.length}/${ROSTER_MAX}人</p>
    <div class="runners">${G.scouts.map((r, i) => runnerCard(r, 'scout', i)).join('') || '<p class="dim">今夜の候補はもういません。</p>'}</div>
  </section>`;
}

/* ───────── 依頼盤 ───────── */

const PH_DV = {
  sneak: (p) => `隠密 DV${p.dv}`, trap: (p) => `知覚 DV${p.dv}`, combat: (p) => `敵${p.n}・${World.enemies[p.enemyType || 'standard']}`, rest: () => 'HP回復',
  gate: (p) => `電子 DV${p.dv}`, goal: () => '目標', escape: (p) => `運転 DV${p.dv}`, drive: (p) => `運転 DV${p.dv}`,
  talk: (p) => `説得 DV${p.dv}`, med: (p) => `医療 DV${p.dv}`, boss: () => '耐久3', ice: (p) => `ICE DV${p.dv}`,
};
const PH_FX = {
  sneak: '隠密：失敗で次の交戦に敵+1、ヒート+4',
  trap: '罠：失敗で警報（ヒート+8・次の交戦に敵+1）と被害',
  combat: '交戦：3ラウンドで倒しきれなければ撤退。情報を買わずに「???」の交戦に当たると待ち伏せされる',
  gate: '扉：3回まで挑戦。開かなければ撤退',
  escape: '逃走：失敗で追手と交戦',
  drive: '運転：失敗で報酬−20%、次の交戦に敵+1',
  talk: '説得：失敗で交戦',
  med: '医療：失敗で報酬−40%',
  rest: '休息：全員のHPが回復。メドテックがいると多め',
  boss: '元部下：耐久3。腕は本物',
};

function phaseCell(p, i, job) {
  if (!p) return `<div class="ph empty"><i>${i + 1}</i>—</div>`;
  if (p.hidden && !job.intel) return `<div class="ph fog"><i>${i + 1}</i><span class="q">???</span></div>`;
  const cls = { combat: 'enemy', boss: 'enemy', goal: 'goal', ice: 'ice', trap: 'trap' }[p.t] || '';
  return `<div class="ph ${cls}${p.fx === 'data' ? ' netgoal' : ''}${p.hidden ? ' bought' : ''}"><i>${i + 1}</i>${esc(p.l)}<span class="dv">${p.t === 'combat' && !job.intel ? `敵${p.n}・???` : PH_DV[p.t](p)}</span></div>`;
}

function phaseTable(job, ri) {
  const r = job.routes[ri];
  const len = r.field.length;
  const types = new Set(), fx = new Set();
  for (const p of r.field) if (p && !(p.hidden && !job.intel)) types.add(p.t);
  for (const p of r.net) if (p && !(p.hidden && !job.intel)) fx.add(p.fx);
  const hasNet = r.net.some(Boolean);
  const legend = [...types].filter((t) => PH_FX[t]).map((t) => `<li>${PH_FX[t]}</li>`).join('')
    + [...fx].map((f) => `<li class="blue">ネット：${{ cam: 'カメラ網', door: '扉の制御', alarm: '警報系', trace: '逆探知', data: 'データ' }[f]}　${ICE_FX[f]}</li>`).join('');
  return `<div class="strip-wrap"><div class="strip" style="--cols:${len}">
    <div class="lane">現場</div>${r.field.map((p, i) => phaseCell(p, i, job)).join('')}
    ${hasNet ? `<div class="lane">ネット</div>${r.net.map((p, i) => phaseCell(p, i, job)).join('')}` : ''}
    ${len > 5 ? '<div></div><div class="nightlbl">1夜目</div><div class="nightlbl">2夜目</div>' : ''}
  </div></div>
  <ul class="legend">${legend}${hasNet ? '' : '<li class="dim">この依頼にネットのフェーズはありません</li>'}</ul>`;
}

function getTeam(uid) {
  const t = UI.team[uid] || (UI.team[uid] = { field: [], support: [], net: [] });
  for (const k of ['field', 'support', 'net']) t[k] = t[k].filter((id) => { const r = getR(id); return r && available(r); });
  return t;
}
function laneOf(team, id) {
  for (const k of ['field', 'support', 'net']) if (team[k].includes(id)) return k;
  return null;
}

function formation(job, team) {
  const lane = (k) => `<div class="slot"><span class="label">${LANE[k]} ${team[k].length}/${LANE_MAX[k]}</span>
    <div class="who">${team[k].map((id) => `<span>${esc(getR(id).name)}</span>`).join('') || '<span class="dim">—</span>'}</div>
    <small>${{ field: '交戦・隠密・罠・扉', support: '運転・逃走・手当て。交戦には出ない', net: 'ICE。ネットランナーだけ' }[k]}</small></div>`;
  const all = teamIds(team).map(getR);
  const req = job.req.map((role) => {
    const ok = role === 'net' ? team.net.length > 0 : all.some((r) => r.role === role);
    return `<span class="chip ${ok ? 'b' : 'p'}">${ok ? '済' : '要'} ${ROLES[role].name}</span>`;
  }).join('');
  const rows = G.runners.map((r) => {
    const ln = laneOf(team, r.id);
    const can = available(r);
    const seg = can
      ? `<div class="seg" role="group" aria-label="${esc(r.name)}の枠">${['field', 'support', 'net'].map((s) => `<button data-act="assign" data-r="${r.id}" data-v="${s}" aria-pressed="${ln === s}" ${s === 'net' && r.role !== 'net' ? 'disabled' : ''}>${LANE[s]}</button>`).join('')}<button data-act="assign" data-r="${r.id}" data-v="none" aria-pressed="${!ln}">外す</button></div>`
      : `<small class="dim">${statusText(r)}</small>`;
    const hurt = r.hp < maxHp(r) / 2 ? ' <span class="pink">重傷 −2</span>' : '';
    return `<div class="pick ${ln ? 'in' : ''} ${can ? '' : 'off'}">
      <div class="pn">${portraitImg(r, 'sm')}<b>${esc(r.name)}</b><span class="role sm">${ROLES[r.role].tag}</span><span class="num dim">HP ${r.hp}/${maxHp(r)}${hurt}</span><span class="dim">${r.contract === 'exclusive' ? '専属' : '歩合'}</span></div>
      ${seg}</div>`;
  }).join('');
  return `<div class="slots">${lane('field')}${lane('support')}${lane('net')}</div>
    ${job.req.length ? `<div class="reqs"><span class="label">必須ロール</span>${req}</div>` : ''}
    <div class="picks">${rows || '<p class="dim">ランナーがいません。</p>'}</div>`;
}

function estBox(job, team) {
  if (!team.field.length) return '<div class="est empty"><span class="dim">現場に1人以上入れると、成功の見込みが出ます。</span></div>';
  const key = `${job.uid}|${UI.route}|${job.intel}|${JSON.stringify(team)}|${teamIds(team).map((id) => { const r = getR(id); return r.hp + '.' + r.armor + '.' + r.cyber.length; }).join(',')}`;
  if (UI.est.key !== key) UI.est = { key, val: estimate(job, UI.route, team) };
  const { p, death } = UI.est.val;
  return `<div class="est">
    <div><span class="label">成功の見込み</span><b class="num">${Math.round(p * 100)}%</b></div>
    <div><span class="label">誰かが死ぬ確率</span><b class="num ${death > 0.05 ? 'pink' : ''}">${Math.round(death * 100)}%</b></div>
    <small>${job.intel ? '情報込みの見積もりです。' : 'まだ見えていない「???」は入っていない、甘めの見積もりです。'}</small>
  </div>`;
}

function payBox(job, team) {
  if (!teamIds(team).length) return '';
  const pp = payPreview(job, team);
  const rows = pp.rows.map((x) => `<div><dt>${esc(x.r.name)}の分け前 <span class="dim">${x.excl ? '専属：フィクサーへ' : `歩合：本人へ（希望 ${fmt(demand(x.r))}）`}</span>${x.short ? ' <span class="pink">不満</span>' : ''}</dt><dd class="num">${fmt(x.per)}</dd></div>`).join('');
  const heat = [];
  if (job.target && CLIENTS[job.target].kind === 'corp') heat.push(`${CLIENTS[job.target].short} +${job.heat}`);
  if (CLIENTS[job.client].kind === 'corp') for (const c of CORPS) if (c !== job.client && c !== job.target) heat.push(`${CLIENTS[c].short} +${job.rank * 3}`);
  const cnt = G.repeats[job.tpl] || 0;
  const cred = job.special ? job.cred : cnt === 0 ? job.cred : cnt === 1 ? Math.ceil(job.cred / 2) : 0;
  return `<dl class="ledger pay">
    <div><dt>仲介料（依頼額の20%）</dt><dd class="num">${fmt(pp.fee)}</dd></div>
    ${rows}
    <div class="tot"><dt>成功したときの手取り</dt><dd class="num">${fmt(pp.total)}cr</dd></div>
    <div><dt>評判</dt><dd class="num">+${cred}${cnt >= 1 && !job.special ? '（繰り返し）' : ''}</dd></div>
    ${heat.length ? `<div><dt>ヒート</dt><dd class="num pink">${heat.join('　')}</dd></div>` : ''}
  </dl>`;
}

function jobCard(j) {
  const tags = [
    j.intro ? '<span class="chip p">紹介</span>' : '',
    j.campaign ? '<span class="chip p">メイン</span>' : '',
    j.deserter ? '<span class="chip p">元部下</span>' : '',
    j.intel ? '<span class="chip b">情報済</span>' : '',
  ].join('');
  return `<button class="job ${UI.job === j.uid ? 'sel' : ''}" data-act="job" data-v="${j.uid}">
    <div class="jtop"><span class="rk">R${j.rank}</span>${tags}<span class="exp dim">${j.special ? '' : `あと${j.expires - G.night + 1}夜`}</span></div>
    <b class="jt">${esc(j.title)}</b>${World.jobBadge(j)}
    <div class="jm">${logo(j.client)}${CLIENTS[j.client].short}${j.target ? ` → ${logo(j.target)}${CLIENTS[j.target].short}` : ''} ・ ${j.nights}夜 ・ <span class="num">${fmt(Math.round((j.basePayout ?? j.payout) * World.payoutMultiplier(j)))}cr</span>${j.repeat >= 2 && !j.special ? ' <span class="pink">値下がり</span>' : ''}</div>
    ${j.req.length ? `<div class="req">${j.req.map((r) => `<span>${ROLES[r].name}</span>`).join('')}</div>` : ''}
  </button>`;
}

function jobDetail(job) {
  if (!job.routes[UI.route]) UI.route = 0;
  const team = getTeam(job.uid);
  const errs = validateTeam(job, team);
  const cost = intelCost(job);
  return `<article class="jd" id="jd">
    <div class="label jdlabel">${logo(job.client)}${CLIENTS[job.client].name}${job.target ? ` → 標的 ${logo(job.target)}${CLIENTS[job.target].name}` : ''}</div>
    <h2>${esc(job.title)}</h2>${World.jobBadge(job)}
    <p>${esc(job.desc)}</p>
    <dl class="facts">
      <div><dt>評判ランク</dt><dd>R${job.rank}</dd></div>
      <div><dt>夜数</dt><dd class="num">${job.nights}</dd></div>
      <div><dt>依頼額</dt><dd class="num">${fmt(Math.round((job.basePayout ?? job.payout) * World.payoutMultiplier(job)))}cr</dd></div>
    </dl>
    <h3>ルート</h3>
    <div class="toggle" role="group" aria-label="ルート">${job.routes.map((r, i) => `<button data-act="route" data-v="${i}" aria-pressed="${i === UI.route}">${esc(r.name)}</button>`).join('')}</div>
    <p class="dim">${esc(job.routes[UI.route].note)}</p>
    ${phaseTable(job, UI.route)}
    <div class="intel">${job.intel
      ? '<span class="chip b">情報済</span> 情報屋から聞いた中身が表に出ています。'
      : `<button data-act="intel" data-v="${job.uid}">情報を買う（${cost ? cr(cost) : '無料'}）</button><small class="dim">全ルートの「???」が開き、見積もりにも入ります${G.runners.some((r) => r.contact === job.client) ? '。依頼主に顔が利くので半額' : ''}</small>`}</div>
    <h3>編成</h3>
    ${formation(job, team)}
    ${estBox(job, team)}
    ${payBox(job, team)}
    ${errs.length && teamIds(team).length ? `<ul class="errs">${errs.map((e) => `<li>${e}</li>`).join('')}</ul>` : ''}
    <button class="primary big" data-act="dispatch" data-v="${job.uid}" ${errs.length ? 'disabled' : ''}>送り出す</button>
  </article>`;
}

function viewBoard() {
  if (!G.board.length) return '<section><h2 class="sec">依頼盤</h2><p class="dim">今夜の依頼はすべて出払いました。夜を明かすと新しい依頼が届きます。</p></section>';
  let job = G.board.find((j) => j.uid === UI.job);
  if (!job) { job = G.board[0]; UI.job = job.uid; UI.route = 0; }
  return `<div class="board">
    <section class="jobs"><h2 class="sec">依頼盤 <span class="label">${G.board.length}件</span></h2>${G.board.map(jobCard).join('')}</section>
    <section class="detail">${jobDetail(job)}</section>
  </div>`;
}

/* ───────── 闇医者 ───────── */

function viewDoc() {
  if (!G.runners.length) return '<section><h2 class="sec">闇医者</h2><p class="dim">診るランナーがいません。</p></section>';
  let r = getR(UI.doc);
  if (!r) { r = G.runners[0]; UI.doc = r.id; }
  const busy = r.status === 'mission';
  const half = G.vouchers.cyber > 0;
  const tc = treatCost(r), rc = repairCost(r);
  const cat = Object.keys(CYBER).map((c) => {
    const cw = CYBER[c];
    const owned = r.cyber.includes(c);
    const rec = ROLE_CYBER[r.role].includes(c);
    const per = Math.round(cw.loan[0] * (half ? 0.5 : 1) * World.priceMultiplier());
    const price = Math.round(cyberPrice(c) * (half ? 0.5 : 1));
    const after = r.humanity - cw.hl;
    const za = humZone(after);
    let btns;
    if (owned) btns = '<small class="dim">導入済み</small>';
    else if (busy) btns = '<small class="dim">仕事中</small>';
    else if (r.contract === 'exclusive') btns = `<button data-act="cyber" data-r="${r.id}" data-c="${c}" data-v="loan">ローンで立て替える</button><button data-act="cyber" data-r="${r.id}" data-c="${c}" data-v="cash" ${price > G.money ? 'disabled' : ''}>現金で払う</button>`;
    else btns = `<button data-act="cyber" data-r="${r.id}" data-c="${c}" data-v="wallet" ${price > r.wallet ? 'disabled' : ''}>本人の手持ちで払う</button>`;
    return `<div class="cw ${rec ? 'rec' : ''} ${owned ? 'owned' : ''}">
      <div class="cwh"><b>${cw.name}</b><span class="label">${cw.part}</span>${rec ? '<span class="chip b">相性</span>' : ''}</div>
      <div class="cwp">${owned ? '' : `${portraitImg(r, 'md')}<span class="dim">→</span>${portraitImg(r, 'md', { cyber: [...r.cyber, c], humanity: after })}<small class="dim">入れた後</small>`}</div>
      <p>${cw.desc}</p>
      <dl class="cwn">
        <div><dt>ローン</dt><dd class="num">${per}cr/夜 ×${cw.loan[1]}</dd></div>
        <div><dt>現金</dt><dd class="num">${fmt(price)}cr</dd></div>
        <div class="pink"><dt>人間性</dt><dd class="num">−${cw.hl} → ${after}（${za.name}）</dd></div>
      </dl>
      <div class="actions">${btns}</div>
    </div>`;
  }).join('');
  return `<section>
    <h2 class="sec">闇医者 <span class="label">屋台街の裏</span></h2>
    <div class="chips" role="group" aria-label="診るランナー">${G.runners.map((x) => `<button data-act="doc" data-v="${x.id}" aria-pressed="${x.id === r.id}">${esc(x.name)}</button>`).join('')}</div>
    <div class="docwrap">
      <div class="docside">
        ${runnerCard(r, 'doc')}
        <div class="panel care">
          <h3>処置</h3>
          <div class="carerow"><span>治療（HPを全快）</span><button data-act="treat" data-r="${r.id}" ${!tc || r.status !== 'idle' ? 'disabled' : ''}>${tc ? cr(tc) : '不要'}</button></div>
          <div class="carerow"><span>防具の修理</span><button data-act="repair" data-r="${r.id}" ${!rc || busy ? 'disabled' : ''}>${rc ? cr(rc) : '不要'}</button></div>
          <div class="carerow"><span>セラピー（人間性+15、${World.therapyNights()}夜は出せない）</span><button data-act="therapy" data-r="${r.id}" ${r.status !== 'idle' || r.humanity >= maxHum(r) ? 'disabled' : ''}>${cr(THERAPY_COST)}</button></div>
          <div class="carerow"><span>救急サブスク「ラザロ」<small class="dim">死亡セーブに失敗しても1回回収。回収費は報酬額の30%</small></span><button data-act="lazarus" data-r="${r.id}" aria-pressed="${r.lazarus}">${r.lazarus ? '加入中（100cr/夜）' : '加入する（100cr/夜）'}</button></div>
        </div>
      </div>
      <div class="catalog">
        <h3>義体 <span class="label">能力は経験より義体で伸びる</span></h3>
        <p class="dim">${r.contract === 'exclusive' ? '専属なので、ローンを立て替えられます。ローンは契約を切っても残ります。' : '歩合のランナーには立て替えられません。本人の手持ちで払います。'}${half ? ' <span class="chip b">割引券あり：半額</span>' : ''}</p>
        <div class="cws">${cat}</div>
      </div>
    </div>
  </section>`;
}

/* ───────── 記録 ───────── */

function logLines(lines, animate) {
  return lines.map((l) => {
    const at = ` data-ph="${l.ph ?? ''}" data-lane="${l.lane || ''}"`;
    if (l.sub) return `<div class="ln sub ${l.kind}${animate ? '' : ' on'}"${at}><span class="what">${esc(l.text)}</span></div>`;
    const res = l.calc ? `<span class="res">${l.kind === 'ok' ? '成功' : '失敗'}</span>` : '';
    return `<div class="ln ${l.kind} ${l.lane === 'net' ? 'net' : ''}${animate ? '' : ' on'}"${at}>
      <span class="t">${l.t ? `[${l.t}]` : ''}</span>${l.lane === 'net' ? '<span class="lanetag">NET</span>' : ''}<span class="who">${esc(l.who || '')}</span><span class="what">${esc(l.text)}</span>${l.calc ? `<span class="calc">${esc(l.calc)}</span>` : ''}${res}</div>`;
  }).join('');
}

function viewLog() {
  if (!G.archive.length) return '<section><h2 class="sec">記録</h2><p class="dim">まだ夜を明かしていません。派遣中に届いた通信がここに残ります。</p></section>';
  return `<section><h2 class="sec">記録 <span class="label">COMM LOG</span></h2>
    ${G.archive.map((a, i) => `<details class="arch" ${i === 0 ? 'open' : ''}><summary>夜${a.night}　${a.comms.length ? a.comms.map((c) => esc(c.title)).join('／') : '派遣なし'}</summary>
      ${a.comms.map((c) => `<h4>${esc(c.title)} <span class="dim">${esc(c.route)}・${c.k}/${c.of}夜目</span></h4><div class="log">${logLines(c.lines, false)}</div>`).join('')}
    </details>`).join('')}
  </section>`;
}

/* ───────── 夜明けの流れ（モーダル） ───────── */

function buildSteps(out) {
  const st = [];
  out.comms.forEach((c, i) => st.push({ k: 'comm', i }));
  out.settle.forEach((s, i) => st.push({ k: 'settle', i }));
  out.story.forEach((n) => st.push({ k: 'story', n }));
  if (!out.pending) st.push({ k: 'report' });
  return st;
}

function stepComm(c) {
  const head = c.raid ? '<span class="chip p">襲撃</span>' : `<span class="label">${c.k}/${c.of}夜目</span>`;
  if(c.pending) return pendingComm(c);
  const tail = c.ends
    ? `<p class="verdict ${c.success ? 'ok' : 'ng'}">${c.success ? (c.raid ? '襲撃を退けた' : '依頼成功') : (c.raid ? '防衛失敗' : '依頼失敗')}</p>`
    : '<p class="verdict dim">夜明け。続きは次の夜に届く</p>';
  return `<div class="label">通信 ・ COMM LOG</div>
    <h2>${esc(c.title)}</h2>
    <p class="dim">${c.raid ? logo(c.corp) : logo(c.client)} ${head} ${esc(c.route)}</p>
    ${commStrip(c)}
    <div class="log play">${logLines(c.visibleLines || c.lines, !instantLog()) || '<div class="ln on">（通信なし）</div>'}</div>
    <div class="tail" ${instantLog() ? '' : 'hidden'}>${tail}</div>
    <div class="mact">${reduced ? '' : speedControl()}<button data-act="skiplog">すべて表示</button><button class="primary" data-act="next">次へ</button></div>`;
}

function pendingComm(c) {
  return '<div class="label">通信・判断待ち（最大2回）</div><h2>'+esc(c.title)+'</h2>'+commStrip(c)+
    '<div class="log play">'+logLines(c.lines,!instantLog())+'</div>'+
    '<div class="tail" '+(instantLog()?'':'hidden')+'><p class="pink">'+esc(c.reason)+'</p><p>続行は残りを判定。撤退は報酬なし、標的ヒートは失敗時と同じ。家賃・手当は通常どおりです。</p><div class="mact"><button class="primary" data-act="decision" data-v="yes" data-uid="'+c.uid+'">続行</button><button data-act="decision" data-v="no" data-uid="'+c.uid+'">撤退</button></div></div>'+speedControl()+'<button data-act="skiplog">すべて表示</button>';
}

function speedControl() {
  return `<div class="speed"><span class="label">表示速度</span><div class="seg" role="group" aria-label="通信の表示速度">${Object.entries(LOG_SPEED).map(([k, [l]]) => `<button data-act="speed" data-v="${k}" aria-pressed="${prefs.speed === k}">${l}</button>`).join('')}</div></div>`;
}

function stepSettle(s) {
  const b = s.bonus ? G.pending[0] : null;
  const heat = Object.entries(s.heat || {}).filter(([, v]) => v).map(([c, v]) => `${CLIENTS[c].short} +${v}`).join('　');
  return `<div class="label">精算 ・ SETTLEMENT</div>
    <h2>${esc(s.title)}</h2>
    <p class="verdict ${s.success ? 'ok' : 'ng'}">${s.success ? '成功' : `失敗：${esc(s.reason)}`}</p>
    <dl class="ledger">
      ${s.lines.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd class="num ${v < 0 ? 'pink' : ''}">${sgn(v)}</dd></div>`).join('')}
      <div class="tot"><dt>フィクサーの収支</dt><dd class="num ${s.net < 0 ? 'pink' : ''}">${sgn(s.net)}cr</dd></div>
      <div><dt>評判</dt><dd class="num">${s.cred >= 0 ? '+' : ''}${s.cred}</dd></div>
      ${heat ? `<div><dt>ヒート</dt><dd class="num pink">${heat}</dd></div>` : ''}
    </dl>
    ${s.deaths.length ? `<p class="dead">帰ってこなかった：${s.deaths.map(esc).join('、')}</p>` : ''}
    ${s.notes.length ? `<ul class="notes">${s.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${b ? `<h3>追加報酬を1つ選ぶ</h3><div class="bonus">${b.opts.map((o, i) => `<button data-act="bonus" data-v="${i}"><span class="label">${o.title}</span>${o.text}</button>`).join('')}</div>`
      : '<div class="mact"><button class="primary" data-act="next">次へ</button></div>'}`;
}

function stepStory(n) {
  const st = STORY[n];
  return `<div class="label">MAIN ・ ブラックボックス</div>
    <h2>${st.title}</h2>
    ${st.body.map((p) => `<p class="story">${p}</p>`).join('')}
    <p class="storygoal"><span class="label">目標</span> ${st.goal}</p>
    <div class="mact"><button class="primary" data-act="next">次へ</button></div>`;
}

function stepReport(out) {
  return `<div class="label">夜明け ・ 夜${out.night}</div>
    <h2>毎晩、確実に出ていく</h2>
    <dl class="ledger">${out.upkeep.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd class="num pink">−${fmt(v)}</dd></div>`).join('')}
      <div class="tot"><dt>合計</dt><dd class="num pink">−${fmt(out.upkeepTotal)}cr</dd></div>
      <div class="tot"><dt>所持金</dt><dd class="num ${G.money < 0 ? 'pink' : ''}">${cr(G.money)}</dd></div></dl>
    <h3>ヒート</h3>
    <div class="heatlist">${out.heat.map(([c, v, dv]) => `<div class="hrow ${v >= 80 ? 'hot' : ''}"><span>${CLIENTS[c].name}</span><div class="ht"><i style="width:${v}%"></i></div><b class="num">${v}</b><span class="num delta ${dv > 0 ? 'pink' : 'dim'}">${dv > 0 ? '+' : dv < 0 ? '−' : '±'}${Math.abs(dv)}</span></div>`).join('')}</div>
    ${out.events.length ? `<h3>この夜のできごと</h3><ul class="events">${out.events.map((e) => `<li class="${e.kind}">${esc(e.text)}</li>`).join('')}</ul>` : ''}
    <div class="mact"><button class="primary" data-act="next">${G.ended ? '結末へ' : `夜${G.night}へ`}</button></div>`;
}

function stepEndingChoice() {
  return `<div class="label">第5章 ・ 決着</div>
    <h2>箱の行き先を決める</h2>
    <p class="story">夜が明けた。箱はまだ手の中にある。</p>
    <div class="bonus end">${Object.entries(ENDINGS).map(([k, e]) => `<button data-act="ending" data-v="${k}"><span class="label">${e.title}</span>${e.pick}</button>`).join('')}</div>`;
}

function stepIntro() {
  const st = STORY.intro;
  return `<div class="label">第1章</div><h2>${st.title.replace('第1章　', '')}</h2>
    ${st.body.map((p) => `<p class="story">${p}</p>`).join('')}
    <p class="storygoal"><span class="label">目標</span> ${st.goal}</p>
    <div class="mact"><button class="primary" data-act="closeintro">隠れ家に入る</button></div>`;
}

function renderModal() {
  let key = '', html = '';
  if (UI.flow) {
    const s = UI.flow.steps[UI.flow.step];
    key = `flow${UI.flow.id}-${UI.flow.step}-${G.pending.length}`;
    if (s.k === 'comm') html = stepComm(UI.flow.out.comms[s.i]);
    if (s.k === 'settle') html = stepSettle(UI.flow.out.settle[s.i]);
    if (s.k === 'story') html = stepStory(s.n);
    if (s.k === 'report') html = stepReport(UI.flow.out);
  } else if (G && G.personalNotices && G.personalNotices.length) {
    key='personal-'+G.personalNotices[0]; html=World.storyHtml(G.personalNotices[0]);
  } else if (G && G.awaitEnding && !G.ended) { key = 'ending'; html = stepEndingChoice(); }
  else if (G && G.storyQueue && G.storyQueue.includes('intro')) { key = 'intro'; html = stepIntro(); }
  if (key === UI.modalKey) return;
  UI.modalKey = key;
  stopLog();
  if (!key) { modal.hidden = true; modal.innerHTML = ''; document.body.classList.remove('locked'); return; }
  modal.innerHTML = `<div class="msheet" role="dialog" aria-modal="true">${html}</div>`;
  modal.hidden = false;
  document.body.classList.add('locked');
  modal.scrollTop = 0;
  const box = modal.querySelector('.log.play');
  if (box && !instantLog()) playLog(box);
  if (box && instantLog()) finishStrip();
  stepCutin(key);
}

function stepCutin(key) {
  if (key === 'intro') return cutin({ kicker: 'ヨミハマ ・ 第1章', title: '引き継ぎ', tone: 'blue' });
  if (key === 'ending') return cutin({ kicker: '第5章', title: '夜明け', tone: 'blue' });
  if (!UI.flow) return;
  const s = UI.flow.steps[UI.flow.step];
  const out = UI.flow.out;
  if (s.k === 'story') {
    const [kick, title] = STORY[s.n].title.split('　');
    return cutin({ kicker: `MAIN ・ ${kick}`, title, tone: 'pink' });
  }
  if (s.k === 'comm' && out.comms[s.i].raid) return cutin({ kicker: '警報', title: '襲撃', sub: esc(out.comms[s.i].title), tone: 'red' });
  if (s.k === 'settle') {
    const dead = out.settle[s.i].deadRunners || [];
    if (dead.length) return cutin({ kicker: '通信途絶', title: '応答なし', sub: dead.map((r) => esc(r.name)).join('、'), tone: 'red', por: portraitImg(dead[0], 'ci', { glitch: 2 }) });
  }
  if (s.k === 'report' && out.deserted && out.deserted.length) {
    const d = out.deserted[0];
    return cutin({ kicker: '人間性 0', title: '脱走', sub: esc(d.name), tone: 'pink', por: portraitImg(d, 'ci', { glitch: 2 }) });
  }
}

function commStrip(c) {
  if (!c.phases) return '';
  const len = c.phases.field.length;
  const start = (c.k - 1) * 5;
  const cell = (p, i, lane) => {
    const past = i < start ? ' past done' : '';
    if (!p) return `<div class="ph empty${past}" data-ph="${i}" data-lane="${lane}"><i>${i + 1}</i>—</div>`;
    const cls = { combat: 'enemy', boss: 'enemy', goal: 'goal', ice: 'ice', trap: 'trap' }[p.t] || '';
    const fog = p.hidden && !c.intel && !past ? ' fog' : '';
    return `<div class="ph ${cls}${p.fx === 'data' ? ' netgoal' : ''}${past}${fog}" data-ph="${i}" data-lane="${lane}"><i>${i + 1}</i><span class="real">${esc(p.l)}<span class="dv">${PH_DV[p.t](p)}</span></span><span class="q">???</span></div>`;
  };
  const hasNet = c.phases.net.some(Boolean);
  return `<div class="strip-wrap"><div class="strip cstrip" style="--cols:${len}">
    <div class="lane">現場</div>${c.phases.field.map((p, i) => cell(p, i, 'field')).join('')}
    ${hasNet ? `<div class="lane">ネット</div>${c.phases.net.map((p, i) => cell(p, i, 'net')).join('')}` : ''}
  </div></div>`;
}

/* 通信の1行を、フェーズ表のマスに反映する */
function markStrip(ln, final) {
  const strip = modal.querySelector('.cstrip');
  if (!strip) return;
  strip.querySelectorAll('.cur').forEach((e) => e.classList.remove('cur'));
  if (!ln || ln.dataset.ph === undefined || ln.dataset.ph === '') return;
  const ph = +ln.dataset.ph, lane = ln.dataset.lane || 'field';
  strip.querySelectorAll('.ph').forEach((e) => { if (+e.dataset.ph < ph) e.classList.add('done'); });
  const cell = strip.querySelector(`.ph[data-ph="${ph}"][data-lane="${lane}"]`);
  if (!cell) return;
  cell.classList.remove('fog');
  if (!final) cell.classList.add('cur');
  const k = ln.classList;
  if (k.contains('sub')) { if (k.contains('ng')) cell.classList.add('hurt'); return; }
  if (k.contains('ok') || k.contains('goal')) { cell.classList.remove('bad'); cell.classList.add('good'); if (lane === 'net') cell.classList.add('broken'); }
  else if (k.contains('ng') || k.contains('dead')) { cell.classList.remove('good'); cell.classList.add('bad'); }
  else if (k.contains('warn')) cell.classList.add('hurt');
}
function finishStrip() {
  modal.querySelectorAll('.log.play .ln').forEach((l) => markStrip(l, true));
  markStrip(null);
}

/* 1行ごとに次の行を予約する。待ち時間は毎回読むので、速度を変えるとすぐ効く */
function playLog(box) {
  const lines = [...box.querySelectorAll('.ln')];
  let i = 0;
  UI.play = () => {
    if (i >= lines.length) { UI.play = null; markStrip(null); showTail(); return; }
    const ln = lines[i++];
    ln.classList.add('on');
    markStrip(ln);
    box.scrollTop = box.scrollHeight;
    UI.timer = setTimeout(UI.play, LOG_SPEED[prefs.speed][1]);
  };
  UI.timer = setTimeout(UI.play, LOG_SPEED[prefs.speed][1]);
}
function stopLog() {
  clearTimeout(UI.timer);
  UI.play = null;
}
function showTail() {
  const t = modal.querySelector('.tail');
  if (t) t.hidden = false;
}

/* ───────── タイトル・結末 ───────── */

function renderTitle() {
  City.setMode('full');
  const sv = loadSave();
  app.innerHTML = `<div class="title-screen"><div class="ts-in">
    <div class="label">GUILD SIM ・ CYBERPUNK REWORK</div>
    <h1 class="logo-big">FIXER'S CUT<span>フィクサーズ・カット</span></h1>
    <p class="thesis">自分は撃たない。<em>義体のローンを立て替えながら</em>ランナーを夜の街へ送り出し、人間のまま帰ってくるのを待つ。</p>
    <p class="dim">舞台は湾岸の沈みかけた都市ヨミハマ。消えた前任から縄張りと借金を引き継いだ新人フィクサーとして、戦闘も潜入も自動で進む夜を回します。決めるのは次の4つだけです。</p>
    <ul class="decide"><li>誰と、どんな契約で組むか</li><li>どの仕事に、誰を出すか</li><li>出す前に、情報にいくら払うか</li><li>どこまで体を機械にさせるか</li></ul>
    <div class="ts-actions">
      ${sv && UI.ask === 'newgame' ? '<button class="danger big" data-act="new">前のデータを消して始める</button>' : `<button class="primary big" data-act="${sv ? 'asknew' : 'new'}">新しく始める</button>`}
      ${sv ? `<button class="big" data-act="continue">続きから（夜${sv.night}・第${sv.chapter}章）</button>` : ''}
    </div>
    <details class="howto"><summary>判定のしくみ</summary>
      <ul>
        <li>判定は 能力値＋技能＋d10。難易度（DV）以上なら成功。10が出たらd10を足し、1が出たらd10を引く</li>
        <li>ダメージから防具の値を引いた分だけHPが減り、防具は1ずつすり減る</li>
        <li>HPが半分を切ると重傷になり、全判定に−2</li>
        <li>HP0で死亡セーブ。d10がBODY未満なら生存。ラザロ加入者は1回だけ回収される</li>
        <li>現場とネットの2レーンが並んで進む。ネットで負けると、現場の難易度が上がる</li>
      </ul>
    </details>
  </div></div>`;
  modal.hidden = true;
  UI.modalKey = '';
}

function renderEnding() {
  const t = G.ended.type;
  const e = t === 'bankrupt'
    ? { title: '廃業', body: ['3夜続けて、所持金がマイナスのままだった。', '貸元の取り立て屋が隠れ家の鍵を付け替えていった。残ったランナーたちは、別のフィクサーの番号を探し始めている。'] }
    : ENDINGS[t];
  app.innerHTML = `<div class="title-screen ending"><div class="ts-in">
    <div class="label">ENDING ・ 夜${G.night}</div>
    <h1 class="logo-big">${e.title}</h1>
    ${e.body.map((p) => `<p class="story">${p}</p>`).join('')}
    <dl class="ledger endstats">
      <div><dt>過ごした夜</dt><dd class="num">${G.night}</dd></div>
      <div><dt>所持金</dt><dd class="num">${cr(G.money)}</dd></div>
      <div><dt>評判</dt><dd class="num">R${G.rank}・${G.cred}</dd></div>
      <div><dt>最後まで残ったランナー</dt><dd>${G.runners.map((r) => esc(r.name)).join('、') || 'なし'}</dd></div>
      <div><dt>帰ってこなかった者</dt><dd>${G.memorial.map((m) => esc(m.name)).join('、') || 'なし'}</dd></div>
    </dl>
    <div class="ts-actions"><button class="primary big" data-act="restart">もう一度はじめる</button></div>
  </div></div>`;
  modal.hidden = true;
  UI.modalKey = '';
  document.body.classList.remove('locked');
  City.setMode('full');
  cutin({ kicker: 'ENDING', title: e.title, tone: t === 'bankrupt' ? 'red' : 'blue' });
}

/* ───────── 描画と操作 ───────── */

function render() {
  if (!G) return renderTitle();
  if (G.ended && !UI.flow) return renderEnding();
  City.setMode(UI.tab === 'home' ? 'full' : 'dim');
  const views = { home: viewHome, scout: viewScout, board: viewBoard, doc: viewDoc, log: viewLog };
  app.innerHTML = hud() + `<main class="view view-${UI.tab}">${views[UI.tab]()}</main>` + dock();
  renderModal();
}

function act(fn) {
  const err = fn();
  if (typeof err === 'string') toast(err);
  else if (Array.isArray(err)) toast(err[0]);
  save();
  render();
}

const H_ = {
  asknew() { UI.ask = 'newgame'; renderTitle(); },
  new() { clearSave(); UI.ask = null; newGame(); UI.tab = 'home'; save(); render(); },
  continue() { G = loadSave(); UI.tab = 'home'; if(G && G.nightInProgress) H_.night(); else render(); },
  restart() { G = null; clearSave(); UI.ask = null; UI.flow = null; render(); },
  closeintro() { G.storyQueue = G.storyQueue.filter((x) => x !== 'intro'); save(); render(); },
  tab(b) { UI.tab = b.dataset.v; UI.ask = null; render(); window.scrollTo(0, 0); },
  job(b) {
    UI.job = +b.dataset.v; UI.route = 0; render();
    if (window.matchMedia('(max-width: 900px)').matches) document.getElementById('jd')?.scrollIntoView({ block: 'start' });
  },
  route(b) { UI.route = +b.dataset.v; render(); },
  intel(b) { act(() => buyIntel(+b.dataset.v)); },
  assign(b) {
    const job = G.board.find((j) => j.uid === UI.job);
    if (!job) return;
    const team = getTeam(job.uid);
    const id = +b.dataset.r, to = b.dataset.v;
    for (const k of ['field', 'support', 'net']) team[k] = team[k].filter((x) => x !== id);
    if (to !== 'none') {
      if (team[to].length >= LANE_MAX[to]) { toast(`${LANE[to]}の枠はいっぱいです`); render(); return; }
      team[to].push(id);
    }
    render();
  },
  dispatch(b) {
    const uid = +b.dataset.v;
    const job = G.board.find((j) => j.uid === uid);
    const errs = dispatch(uid, UI.route, getTeam(uid));
    if (errs) { toast(errs[0]); return; }
    delete UI.team[uid];
    UI.job = null;
    toast(`「${job.title}」に送り出した`);
    save(); render();
  },
  recall(b) { act(() => recall(+b.dataset.v)); },
  hire(b) {
    const r = G.scouts[+b.dataset.v];
    act(() => hire(+b.dataset.v, b.dataset.c) || (toast(`${r.name}と${b.dataset.c === 'exclusive' ? '専属' : '歩合'}で組んだ`), null));
  },
  contract(b) { act(() => setContract(getR(+b.dataset.r), b.dataset.v)); },
  askfire(b) { UI.ask = 'fire' + b.dataset.r; render(); },
  fire(b) { UI.ask = null; act(() => fire(getR(+b.dataset.r))); },
  doc(b) { UI.doc = +b.dataset.v; render(); },
  treat(b) { act(() => treat(getR(+b.dataset.r))); },
  repair(b) { act(() => repair(getR(+b.dataset.r))); },
  therapy(b) { act(() => therapy(getR(+b.dataset.r))); },
  lazarus(b) { act(() => { const r = getR(+b.dataset.r); r.lazarus = !r.lazarus; }); },
  cyber(b) {
    const r = getR(+b.dataset.r), c = b.dataset.c;
    act(() => buyCyber(r, c, b.dataset.v) || (toast(`${r.name}に「${CYBER[c].name}」を入れた。人間性 ${r.humanity}${r.humanity <= 0 ? '。もう戻れない' : ''}`), null));
  },
  upgrade(b) { act(()=>World.buyUpgrade(b.dataset.v)); },
  personalnotice() { G.personalNotices.shift(); UI.tab='board'; save(); render(); },
  decision(b) {
    const ctx=G.missions.find(m=>m.uid===+b.dataset.uid)?.progress;
    if(!ctx?.waiting)return;
    stopLog(); missionDecision(+b.dataset.uid,b.dataset.v==='yes'); H_.night();
  },
  night() {
    stopLog();
    const out = endNight();
    UI.flow = { id: Date.now(), out, step: 0, steps: buildSteps(out) };
    UI.team = {}; UI.est = { key: '', val: null }; UI.ask = null;
    render();
  },
  skiplog() {
    stopLog();
    modal.querySelectorAll('.log.play .ln').forEach((l) => l.classList.add('on'));
    finishStrip();
    const box = modal.querySelector('.log.play');
    if (box) box.scrollTop = box.scrollHeight;
    showTail();
  },
  speed(b) {
    prefs.speed = b.dataset.v;
    savePrefs();
    modal.querySelectorAll('[data-act="speed"]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    if (prefs.speed === 'instant') return H_.skiplog();
    if (UI.play) { clearTimeout(UI.timer); UI.timer = setTimeout(UI.play, LOG_SPEED[prefs.speed][1]); }
  },
  next() {
    if (!UI.flow || UI.flow.out.pending) return;
    UI.flow.step++;
    if (UI.flow.step >= UI.flow.steps.length) { UI.flow = null; UI.tab = UI.tab === 'log' ? 'log' : UI.tab; }
    render();
  },
  bonus(b) {
    applyBonus(+b.dataset.v);
    UI.flow.step++;
    if (UI.flow.step >= UI.flow.steps.length) UI.flow = null;
    render();
  },
  ending(b) { chooseEnding(b.dataset.v); render(); },
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const f = H_[b.dataset.act];
  if (f) { e.preventDefault(); f(b); }
});

function boot(data) {
  City.init();
  if (data && data.G) {
    G = World.init(data.G);
    Object.assign(UI, data.UI || {});
  }
  render();
}
if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === 'function') {
  window.claude.hot.snapshot(() => ({ G, UI: { tab: UI.tab, job: UI.job, route: UI.route, team: UI.team, doc: UI.doc } }));
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
