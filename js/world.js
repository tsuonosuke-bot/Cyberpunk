/* World rules: district conditions last several nights; news lasts exactly one. */
const World = (() => {
  const districts = { street: '屋台街', harbor: '港湾倉庫', upper: '企業区画上層' };
  const enemies = { standard: '通常兵', armored: '装甲兵', hacker: '敵ネットランナー', sniper: '狙撃手', swarm: '群れ' };
  const upgrades = {
    security: { name: '防犯システム', cost: 18000, upkeep: 80, desc: '襲撃の敵を1体減らし、白蛇会の嫌がらせを防ぐ' },
    medical: { name: '医療室', cost: 22000, upkeep: 120, desc: '待機中のHP回復+4。待機メドテックがいればさらに+3' },
    network: { name: 'ネット設備', cost: 20000, upkeep: 100, desc: 'インターフェース判定+1' },
    bunks: { name: '仮眠室', cost: 16000, upkeep: 0, desc: 'セラピーを3夜から2夜に短縮（新規利用から）' },
  };
  const perks = {
    kagerou: { name: '消せない裏口', skill: 'インターフェース', bonus: 2, desc: 'インターフェース+2' },
    yoru: { name: '自分の身体', skill: '射撃', bonus: 2, desc: '射撃+2' },
    haruka: { name: '消えない灯', skill: '医療', bonus: 3, desc: '医療+3' },
  };
  const rivals = {
    kurogane: { name: 'クロガネ', bio: '湾岸の運び屋を束ねる古参。契約より現金を信じる。' },
    neon: { name: 'ネオン', bio: '企業の裏口に通じた若いフィクサー。腕のいい人間を集めている。' },
  };
  const news = [
    { text: 'ヴェルデ新薬発表。研究施設の警備を強化', target: 'verde', skill: '隠密', bonus: -2 },
    { text: '湾岸道路で事故。運転DV+2、運搬報酬+20%', skill: '運転', bonus: -2, tag: 'transport', payout: 1.2 },
    { text: '闇医者の在庫処分。今夜の義体は2割引', cyber: 0.8 },
    { text: '屋台街の祭り。人波に紛れて隠密+2', district: 'street', skill: '隠密', bonus: 2 },
    { text: '港湾労組が検問に協力。港の隠密DV+2', district: 'harbor', skill: '隠密', bonus: -2 },
    { text: 'ハクロウ回線保守。対ハクロウのICE判定+2', target: 'hakurou', skill: 'インターフェース', bonus: 2 },
    { text: 'ミツカネの人員交代。対ミツカネの説得+2', target: 'mitsukane', skill: '説得', bonus: 2 },
    { text: '海霧が港を覆う。港の隠密+2', district: 'harbor', skill: '隠密', bonus: 2 },
    { text: '上層の回線増強。上層のICE判定DV+2', district: 'upper', skill: 'インターフェース', bonus: -2 },
    { text: '屋台街で無料診療。屋台街の医療+2', district: 'street', skill: '医療', bonus: 2 },
    { text: '設備業者のスト。上層の電子判定DV+2', district: 'upper', skill: '電子', bonus: -2 },
    { text: '住民の相互扶助。屋台街の説得+2', district: 'street', skill: '説得', bonus: 2 },
  ];
  const conditionPool = [
    { text: '警察の一斉取り締まり', skill: '隠密', bonus: -2 },
    { text: '停電と監視の死角', skill: '隠密', bonus: 1 },
    { text: '道路工事', skill: '運転', bonus: -2 },
  ];
  const personal = {
    kagerou: { title: 'カゲロウ：見てはいけないログ', target: 'hakurou', district: 'upper', req: ['net'], intro: '社内の追手が回線を絞っている。カゲロウは、自分の足跡を消す最後の機会だと言った。', field: [S(15, '追手の事務所へ'), C(2, '回線警備', 'hacker'), GT(15, '記録室'), O('追跡記録を破棄'), E(15, '脱出')], net: [I(15, '追跡線', 'trace'), _, I(17, '個人記録', 'data'), _, _] },
    yoru: { title: 'ヨル：腕も目も自分のもの', target: 'mitsukane', district: 'harbor', req: ['solo'], intro: '義体回収班の督促状が届いた。ヨルは封を裂き、回収拠点の住所だけを机に残した。', field: [S(15, '回収班の倉庫'), C(2, '回収班', 'armored'), R('廃車の影'), O('所有権記録を焼く'), E(15, '脱出')], net: N5() },
    haruka: { title: 'ハルカ：診療所の灯', target: 'gang', district: 'street', req: ['med'], intro: '診療所を焼いた白蛇会の男が戻った。ハルカは次の患者が来る前に、今度こそ話をつけたいと言う。', field: [K(15, '白蛇会に事情を聞く'), C(3, '放火の実行犯', 'swarm'), M(15, '巻き込まれた住民の治療'), O('清算の証拠'), E(13, '診療所へ帰る')], net: N5() },
  };
  // Explicit locations keep rank and district independent, including rank-one harbor jobs.
  const locations = { r1_delivery: 'harbor', r1_cargo: 'harbor', r1_escort: 'harbor', r1_relay: 'street', r2_sample: 'harbor', r2_defector: 'street', r2_datatheft: 'upper', r2_convoy: 'harbor', r3_vault: 'upper', r3_relay: 'harbor', intro1: 'harbor', intro2: 'upper', camp2: 'street', camp3: 'harbor', camp4: 'upper', camp5: 'harbor' };
  function prepareJob(j) {
    j.district ||= locations[j.id || j.tpl] || (j.deserter ? 'street' : j.rank === 3 ? 'upper' : 'street');
    j.tags ||= /delivery|cargo|escort|convoy/.test(j.id || j.tpl) ? ['transport'] : ['operation'];
    return j;
  }
  function init(g) {
    g.upgrades ||= {};
    g.gangRelation ??= 0;
    g.rivals ||= Object.fromEntries(Object.keys(rivals).map(k => [k, { relation: 0, stolen: [], taken: 0 }]));
    g.conditions ||= {};
    g.personalNotices ||= [];
    g.news ??= Math.floor(Math.random() * news.length);
    for (const j of [...g.board, ...g.missions.map(m => m.job)]) prepareJob(j);
    return g;
  }
  function applies(effect, j) { return (!effect.target || effect.target === j.target) && (!effect.district || effect.district === j.district); }
  function currentNews() { return news[G.news] || news[0]; }
  function context(ctx) {
    init(G);
    ctx.environmentNight = G.night;
    ctx.worldConditions = { news: clone(currentNews()), condition: clone(G.conditions[ctx.job.district] || null) };
    if (ctx.job.district === 'street' && G.gangRelation <= -30) {
      ctx.mods.extraEnemy++;
      L(ctx, '', '白蛇会の妨害。次の交戦で敵+1', 'ng');
    }
  }
  function checkBonus(ctx, m, sk) {
    const env = ctx.worldConditions || { news: currentNews(), condition: G.conditions[ctx.job.district] };
    let b = sk === 'インターフェース' && G.upgrades.network ? 1 : 0;
    const p = perks[(getR(m.id) || {}).storyPerk];
    if (p && p.skill === sk) b += p.bonus;
    if (env.news && applies(env.news, ctx.job) && env.news.skill === sk) b += env.news.bonus;
    if (env.condition && env.condition.skill === sk) b += env.condition.bonus;
    return b;
  }
  function payoutMultiplier(j) {
    const n = currentNews();
    return n.payout && applies(n, j) && j.tags.includes(n.tag) ? n.payout : 1;
  }
  function refreshBoard() {
    init(G);
    for (const [key, p] of Object.entries(personal)) {
      const r = G.runners.find(r => r.story === key);
      if (!r || r.contract !== 'exclusive' || r.loyalty < 70 || G.flags['personal_' + key] || hasJob('personal_' + key)) continue;
      const j = addJob({ id: 'personal_' + key, rank: 2, ...p, nights: 1, payout: 7000, cred: 8, heat: 8, client: 'resident', personal: key, runnerId: r.id, desc: p.intro,
        routes: [{ name: '決着をつける', note: '本人と向き合う', field: clone(p.field), net: clone(p.net) }, { name: '裏から近づく', note: '隠密を優先する', field: [S(17, '裏から侵入'), ...clone(p.field).slice(1)], net: clone(p.net) }] }, true);
      j.expires = G.night + 5;
      G.flags['personal_' + key] = 'offered';
      G.personalNotices.push(key);
    }
    if (G.rank >= 2 && G.night % 4 === 0 && !hasJob('rival_sabotage')) {
      const key = Object.keys(rivals)[Math.floor(G.night / 4) % 2], rv = G.rivals[key];
      const stolen = rv.stolen[rv.stolen.length - 1];
      const j = addJob({ id: 'rival_sabotage', rank: 2, title: `${rivals[key].name}の仕事を妨害する`, client: 'broker', target: null, district: 'harbor', rival: key, nights: 1, payout: 6500, cred: 6, heat: 0, req: [], desc: '競合の密輸便から契約書を取り返す。相手との関係は悪くなる。', routes: [{ name: '密輸倉庫', note: '相手の用心棒を突破する', field: [S(15, '倉庫へ'), C(2, stolen ? `${stolen.name}とライバルの用心棒` : 'ライバルの用心棒', 'armored'), GT(15, '契約書の保管庫'), O('契約書'), E(15, '離脱')], net: N5() }] }, true);
      j.expires = G.night + 3;
    }
  }
  function settle(ms, s, out) {
    const j = ms.job, res = ms.result;
    if (j.client === 'gang' && res.success) G.gangRelation = clamp(G.gangRelation + 12, -100, 100);
    if (j.district === 'street' && j.client !== 'gang') {
      const trouble = res.log.filter(l => /警報|見つかった|過剰な暴力/.test(l.text)).length;
      G.gangRelation = clamp(G.gangRelation - trouble * 4, -100, 100);
    }
    if (j.target === 'gang') G.gangRelation = clamp(G.gangRelation - (res.success ? 15 : 8), -100, 100);
    if (j.personal) {
      const r = getR(j.runnerId);
      G.flags['personal_' + j.personal] = res.success ? 'complete' : 'failed';
      if (r) {
        if (res.success) { r.storyPerk = j.personal; s.notes.push(`${r.name}が専用技能「${perks[j.personal].name}」を覚えた（${perks[j.personal].desc}）`); }
        else { r.loyalty = Math.max(0, r.loyalty - 30); s.notes.push(`${r.name}の個人依頼に失敗。忠誠−30`); }
      }
    }
    if (j.rival) { G.rivals[j.rival].relation = clamp(G.rivals[j.rival].relation - (res.success ? 15 : 5), -100, 100); s.notes.push(`${rivals[j.rival].name}との関係 ${G.rivals[j.rival].relation}`); }
  }
  function beforeNight(out) {
    init(G);
    for (const j of G.board.filter(j => j.personal && j.expires < G.night)) {
      const r = getR(j.runnerId);
      if (r && r.status !== 'mission') { leaveRunner(r); out.events.push({ kind: 'ng', text: `${r.name}は個人依頼の期限切れで隠れ家を去った` }); }
      G.flags['personal_' + j.personal] = 'declined';
    }
    G.board = G.board.filter(j => !j.personal || j.expires >= G.night);
    if (G.night % 3 === 0) {
      const j = G.board.find(j => !j.special && j.expires > G.night);
      if (j) { const k = Object.keys(rivals)[Math.floor(G.night / 3) % 2]; G.board = G.board.filter(x => x !== j); G.rivals[k].taken++; out.events.push({ kind: 'warn', text: `${rivals[k].name}が「${j.title}」を先に引き受けた` }); }
    }
    if (G.gangRelation <= -30 && G.night % 3 === 0) {
      if (G.upgrades.security) out.events.push({ kind: 'ok', text: '防犯システムが白蛇会の嫌がらせを防いだ' });
      else { G.money -= 250; out.events.push({ kind: 'ng', text: '白蛇会の嫌がらせ。修繕費250cr' }); }
    }
  }
  function afterNight(out, tonight) {
    const b = recoveryBonus();
    if (b) for (const r of G.runners) if (r.status === 'idle' && !tonight.has(r.id)) r.hp = Math.min(maxHp(r), r.hp + b);
    // The last playable night has ended; refreshBoard would otherwise silently remove these jobs.
    for (const j of G.board.filter(j => j.personal && j.expires <= G.night)) {
      const r = getR(j.runnerId);
      if (r && r.status !== 'mission') { leaveRunner(r); out.events.push({ kind: 'ng', text: `${r.name}は個人依頼の期限切れで隠れ家を去った` }); }
      G.flags['personal_' + j.personal] = 'declined';
    }
    G.board = G.board.filter(j => !j.personal || j.expires > G.night);
  }
  function nextNight() {
    G.news = Math.floor(Math.random() * news.length);
    for (const key of Object.keys(districts)) {
      if (G.conditions[key] && G.conditions[key].until < G.night) delete G.conditions[key];
      if (!G.conditions[key] && rnd() < .3) G.conditions[key] = { ...clone(pick(conditionPool)), until: G.night + 2 };
    }
  }
  function poached(r) {
    const key = pick(Object.keys(rivals));
    G.rivals[key].stolen.push({ name: r.name, role: r.role });
    return rivals[key].name;
  }
  function buyUpgrade(key) {
    const u = upgrades[key];
    if (!u) return '強化が見つかりません';
    if (G.upgrades[key]) return '購入済みです';
    if (G.money < u.cost) return '所持金が足りません';
    G.money -= u.cost; G.upgrades[key] = true; return null;
  }
  function recoveryBonus() { return G.upgrades.medical ? 4 + (G.runners.some(r => r.role === 'med' && available(r)) ? 3 : 0) : 0; }
  function homeHtml() {
    init(G);
    return `<section class="panel"><h3>今夜のニュース</h3><p>${esc(currentNews().text)}</p><h3>地区の状況</h3>${Object.entries(districts).map(([k, name]) => `<p>${name}：${G.conditions[k] ? `${esc(G.conditions[k].text)}（夜${G.conditions[k].until}まで／${G.conditions[k].skill}${G.conditions[k].bonus >= 0 ? '+' : ''}${G.conditions[k].bonus}）` : '平常'}</p>`).join('')}<h3>白蛇会との関係 <span class="num">${G.gangRelation}</span></h3><p>+30以上：屋台街の情報が半額、路上育ちの候補が増える。−30以下：屋台街の交戦に敵+1、3夜ごとに嫌がらせ。</p></section>
      <section class="panel"><h3>隠れ家の強化</h3><div class="cws">${Object.entries(upgrades).map(([k,u]) => `<article class="cw"><h4>${u.name}</h4><p>${u.desc}</p><p>${fmt(u.cost)}cr／維持費${u.upkeep}cr/夜</p><button data-act="upgrade" data-v="${k}" ${G.upgrades[k] || G.money < u.cost ? 'disabled' : ''}>${G.upgrades[k] ? '購入済み' : '購入する'}</button></article>`).join('')}</div></section>
      <section class="panel"><h3>ライバル</h3>${Object.entries(rivals).map(([k,r]) => `<p><b>${r.name}</b>：${r.bio}</p><p>関係 ${G.rivals[k].relation}／横取り ${G.rivals[k].taken}件／引き抜き ${G.rivals[k].stolen.map(x => esc(x.name)).join('、') || 'なし'}</p>`).join('')}</section>`;
  }
  function jobBadge(j) {
    prepareJob(j);
    const n = currentNews(), affected = applies(n,j) && (n.skill || (n.tag && j.tags.includes(n.tag)));
    return `<span class="chip b">${districts[j.district]}</span>${G.conditions[j.district] ? `<span class="chip o">${esc(G.conditions[j.district].text)}</span>` : ''}${affected ? '<span class="chip p">ニュース影響</span>' : ''}${j.personal ? `<span class="chip p">個人依頼・夜${j.expires}まで／本人必須</span>` : ''}`;
  }
  function storyHtml(key) {
    const p = personal[key];
    if (!p) return '';
    return `<div class="label">PERSONAL</div><h2>${esc(p.title)}</h2><p class="story">${esc(p.intro)}</p><p>5夜以内に本人を編成して依頼を受けてください。期限切れで本人は隠れ家を去ります。</p><button class="primary" data-act="personalnotice">依頼盤で確認する</button>`;
  }
  return { districts, enemies, upgrades, perks, rivals, news, init, prepareJob, context, checkBonus, payoutMultiplier, refreshBoard, settle, beforeNight, afterNight, nextNight, poached, buyUpgrade, recoveryBonus, homeHtml, jobBadge, storyHtml,
    upkeep: () => Object.entries(upgrades).filter(([k,u]) => G.upgrades[k] && u.upkeep).map(([,u]) => [`${u.name}の維持費`, u.upkeep]),
    securityReduction: () => G.upgrades.security ? 1 : 0,
    therapyNights: () => G.upgrades.bunks ? 2 : 3,
    priceMultiplier: () => currentNews().cyber || 1,
    intelMultiplier: j => j.district === 'street' && G.gangRelation >= 30 ? .5 : 1,
    scoutOptions: () => G.gangRelation >= 30 && rnd() < .6 ? { origin: 'street' } : {},
    perkHtml: r => r.storyPerk ? `<div class="perk on">専用技能「${perks[r.storyPerk].name}」：${perks[r.storyPerk].desc}</div>` : '',
  };
})();

// All static templates have metadata; addJob also normalizes dynamically generated jobs.
for (const j of [...JOBS, ...Object.values(INTRO_JOBS), ...Object.values(CAMPAIGN_JOBS)]) World.prepareJob(j);
let enemyRotation = 0;
for (const j of JOBS.filter(j => j.rank === 2)) for (const r of j.routes) {
  for (const p of r.field) if (p && p.t === 'combat') p.enemyType = ['armored', 'sniper', 'hacker', 'swarm'][enemyRotation++ % 4];
}
RANK_ENEMY[2].dv = 18;
const defectorRoutes = JOBS.find(j => j.id === 'r2_defector').routes;
defectorRoutes[0].field[1] = H(C(2, '研究棟の狙撃班', 'sniper'));
defectorRoutes[1].field[1] = H(C(2, '社宅の狙撃班', 'sniper'));
const rankTwoDVs = { r2_sample: [[19,19], [19,17]], r2_defector: [[19], [21]], r2_datatheft: [[20], [20]], r2_convoy: [[17,19,19], [21,17]] };
for (const j of JOBS.filter(j => j.rank === 2)) j.routes.forEach((route, i) => {
  let encounter=0;
  for (const p of route.field) if (p && p.t === 'combat') p.enemyDV = rankTwoDVs[j.id][i][encounter++];
});

