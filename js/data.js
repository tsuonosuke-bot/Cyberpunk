/* FIXER'S CUT — 静的データ（ロール・出自・義体・依頼・物語）。数値はすべて仮。 */

const CORPS = ['mitsukane', 'verde', 'hakurou'];
const CLIENTS = {
  mitsukane: { name: 'ミツカネ重工', short: 'ミツカネ', kind: 'corp' },
  verde: { name: 'ヴェルデ製薬', short: 'ヴェルデ', kind: 'corp' },
  hakurou: { name: 'ハクロウ通信', short: 'ハクロウ', kind: 'corp' },
  gang: { name: '白蛇会', short: '白蛇会', kind: 'gang' },
  resident: { name: '屋台街の住民', short: '住民', kind: 'resident' },
  broker: { name: '顔役', short: '顔役', kind: 'broker' },
  self: { name: 'ブラックボックス', short: '箱', kind: 'self' },
};

const SKILLS = ['射撃', '回避', '隠密', '知覚', '電子', 'インターフェース', '医療', '運転', '説得'];
const SKILL_STAT = {
  射撃: 'REF', 回避: 'REF', 隠密: 'COOL', 知覚: 'INT', 電子: 'TECH',
  インターフェース: 'INT', 医療: 'TECH', 運転: 'REF', 説得: 'COOL',
};
const STATS = ['BODY', 'REF', 'INT', 'TECH', 'COOL', 'EMP'];

/* 性別は肖像の絵を選ぶためだけに使う。x は中性的・アンドロイド風 */
const GENDERS = { m: '男性', f: '女性', x: 'その他' };

const ROLES = {
  solo: {
    name: 'ソロ', tag: 'SOLO', armor: 11,
    base: { BODY: [6, 8], REF: [7, 9], INT: [3, 5], TECH: [3, 5], COOL: [5, 7], EMP: [4, 6] },
    skills: { 射撃: [5, 7], 回避: [4, 6], 隠密: [2, 4], 知覚: [2, 4], 運転: [1, 2] },
    perk: { id: 'double', name: '二連射', desc: '交戦で1ラウンドに2回撃つ' },
    desc: '交戦の要。撃って、かわす。',
  },
  net: {
    name: 'ネットランナー', tag: 'NET', armor: 7,
    base: { BODY: [3, 5], REF: [4, 6], INT: [7, 9], TECH: [5, 7], COOL: [4, 6], EMP: [4, 7] },
    skills: { インターフェース: [5, 7], 電子: [2, 4], 知覚: [3, 5], 隠密: [1, 3], 回避: [1, 3], 射撃: [0, 2] },
    perk: { id: 'backdoor', name: '裏口', desc: 'ICE判定に+2' },
    desc: 'ネットのレーン担当。いないと開かない扉がある。',
  },
  tech: {
    name: 'テック', tag: 'TECH', armor: 7,
    base: { BODY: [4, 6], REF: [4, 6], INT: [5, 7], TECH: [7, 9], COOL: [4, 6], EMP: [4, 6] },
    skills: { 電子: [5, 7], 知覚: [3, 5], 射撃: [2, 3], 回避: [1, 3], 隠密: [2, 3] },
    perk: { id: 'patch', name: '即席修理', desc: '休息フェーズで全員の防具を2戻す' },
    desc: '隔壁や金庫を開ける。',
  },
  med: {
    name: 'メドテック', tag: 'MED', armor: 7,
    base: { BODY: [4, 6], REF: [4, 6], INT: [6, 8], TECH: [6, 8], COOL: [5, 7], EMP: [5, 8] },
    skills: { 医療: [5, 7], 知覚: [3, 5], 回避: [2, 3], 射撃: [1, 3], 説得: [1, 3] },
    perk: { id: 'surgeon', name: '外科処置', desc: '仲間の死亡セーブに+2' },
    desc: '休息で傷を縫い、死にかけた仲間を引き戻す。',
  },
  driver: {
    name: 'ドライバー', tag: 'DRV', armor: 7,
    base: { BODY: [4, 6], REF: [7, 9], INT: [4, 6], TECH: [5, 7], COOL: [5, 7], EMP: [4, 6] },
    skills: { 運転: [5, 7], 射撃: [2, 4], 回避: [3, 5], 知覚: [2, 4] },
    perk: { id: 'getaway', name: '逃げ足', desc: '逃走と運転の判定に+3' },
    desc: '逃走と運び。いないと帰ってこられない仕事がある。',
  },
};

const ORIGINS = {
  corp: { name: '企業育ち', mods: { INT: 1, COOL: 1, BODY: -1 }, skills: { 説得: 2 }, desc: '企業1社に顔が利く' },
  street: { name: '路上育ち', mods: { BODY: 1, REF: 1, EMP: -1 }, skills: { 隠密: 1, 射撃: 1 }, desc: '白蛇会に顔が利く' },
  drifter: { name: '流れ者', mods: { EMP: 1 }, skills: { 知覚: 1, 運転: 1 }, desc: '屋台街に顔が利く。分け前の要求が控えめ' },
};

const NAMES = ['ミナ', 'ジロウ', 'テツ', 'サエ', 'レン', 'アキ', 'ソラ', 'ナギ', 'ケイ', 'ユウ', 'マコ', 'ゴウ',
  'リツ', 'シズ', 'タキ', 'ヒロ', 'イオ', 'ミツ', 'ルカ', 'コウ', 'スズ', 'ダイ', 'エマ', 'トウヤ', 'ノア',
  'カイ', 'ヒナ', 'ジン', 'ウタ', 'セツ', 'オボロ', 'チカ', 'マドカ', 'ロク', 'ニコ',
  'ヨミ', 'クレハ', 'サカキ', 'ナユタ', 'ホタル', 'ミサゴ', 'ツグミ', 'アラタ', 'キリ', 'ハヤテ', 'ユズ', 'トキ'];

/* 雇えるランナーの素性。出自ごとの「昔」と「癖」を1つずつ組み合わせる */
const BIOS = {
  corp: {
    past: ['ミツカネの社員寮で育った。', '元はヴェルデの治験コーディネーターだった。', '企業警備の訓練課程を、最後の週に抜けた。', '親の代からハクロウの社員番号を持っていた。', '上層の受付で、毎朝千人の顔を照合していた。'],
    quirk: ['社章の跡が、まだ襟に残っている。', '敬語が抜けない。撃つときも。', '退職金の代わりに持ち出したものの話はしない。', '名刺を一枚だけ捨てられずにいる。'],
  },
  street: {
    past: ['白蛇会の使い走りから始めた。', '屋台街の裏の、湯気の中で生まれた。', '十四で最初の義体を盗んだ。', '港の荷役で腕を一本だめにした。', '水没区の違法ジムで、賭けの的をやっていた。'],
    quirk: ['借りは必ず返す。貸しも必ず取り立てる。', '金の話になると目の色が変わる。', '合成煙草の銘柄にうるさい。', '仕事の前には必ず屋台の麺をすする。'],
  },
  drifter: {
    past: ['北の水没区から、浮き桟橋づたいに流れてきた。', '貨物船の底で街に着き、そのまま居ついた。', '三つの都市で名前を変えた。ここが四つ目だ。', '軌道エレベーターの建設現場で働いていた。', '人の記憶を運ぶ「運び屋」をしていたらしい。'],
    quirk: ['荷物は鞄ひとつだけ。', '雨の音がないと眠れない。', '誰の過去も聞かない。自分のも話さない。', '古い紙の地図を持ち歩いている。'],
  },
};

/* 物語つきのランナー（3人） */
const STORY_RUNNERS = {
  kagerou: {
    name: 'カゲロウ', gender: 'x', role: 'net', origin: 'corp', contact: 'hakurou', pref: 'exclusive',
    base: { BODY: 4, REF: 5, INT: 9, TECH: 6, COOL: 5, EMP: 6 },
    skills: { インターフェース: 7, 電子: 4, 知覚: 4, 隠密: 2, 回避: 2, 射撃: 1, 説得: 2 },
    cyber: [],
    bio: 'ハクロウ通信の元回線技師。社内で見てはいけないログを見て、三日後に退職届も出さずに消えた。前任のハシバとは面識があったらしい。',
  },
  yoru: {
    name: 'ヨル', gender: 'm', role: 'solo', origin: 'corp', contact: 'mitsukane', pref: 'any',
    base: { BODY: 7, REF: 8, INT: 5, TECH: 4, COOL: 7, EMP: 5 },
    skills: { 射撃: 6, 回避: 5, 隠密: 3, 知覚: 3, 運転: 2, 説得: 2 },
    cyber: ['arm', 'optics'],
    bio: 'ミツカネ重工の元警備主任。会社に義体を回収される前に逃げた。腕も目も、もう半分は自分のものではない。',
  },
  haruka: {
    name: 'ハルカ', gender: 'f', role: 'med', origin: 'street', contact: 'gang', pref: 'any',
    base: { BODY: 5, REF: 5, INT: 7, TECH: 8, COOL: 6, EMP: 8 },
    skills: { 医療: 7, 知覚: 4, 回避: 3, 射撃: 2, 説得: 3, 隠密: 2 },
    cyber: [],
    bio: '屋台街で無許可の診療所を開いていた。白蛇会に店を焼かれてから、誰とも組んでいない。',
  },
  shigure: {
    name: 'シグレ', gender: 'f', role: 'driver', origin: 'drifter', contact: 'resident', pref: 'any',
    base: { BODY: 5, REF: 9, INT: 5, TECH: 6, COOL: 6, EMP: 5 },
    skills: { 運転: 7, 射撃: 3, 回避: 4, 知覚: 3, 隠密: 1 },
    cyber: ['steering'],
    bio: '湾岸の非合法レースで、三年間一度も負けなかった。最後の賭けでクロガネに愛車を担保に取られ、今は他人の車を転がしている。',
  },
  mikoto: {
    name: 'ミコト', gender: 'x', role: 'tech', origin: 'corp', contact: 'verde', pref: 'exclusive',
    base: { BODY: 4, REF: 5, INT: 7, TECH: 9, COOL: 4, EMP: 5 },
    skills: { 電子: 7, 知覚: 4, 射撃: 2, 回避: 2, 隠密: 3, 医療: 1 },
    cyber: ['toolfinger'],
    bio: 'ヴェルデ製薬の「人格転写」治験の被験者。目が覚めたとき、隣の寝台に自分と同じ顔が眠っていた。どちらが元の自分なのか、まだ確かめていない。',
  },
};

/* 義体（12種）。loan = [1夜あたり, 夜数]。現金なら総額の8割。 */
const CYBER = {
  arm: { name: '鉄骨アーム', part: '腕', mods: { BODY: 1, 射撃: 1 }, loan: [400, 10], hl: 6, desc: 'BODY+1 射撃+1' },
  optics: { name: '鷹の目オプティクス', part: '目', mods: { 射撃: 2, 知覚: 1 }, loan: [500, 10], hl: 7, desc: '射撃+2 知覚+1' },
  synapse: { name: 'シナプス加速器', part: '神経', mods: { REF: 1 }, loan: [600, 10], hl: 9, desc: 'REF+1（射撃・回避・運転に効く）' },
  plating: { name: '皮下装甲板', part: '皮膚', mods: { armor: 4 }, loan: [400, 10], hl: 5, desc: '防具の上限+4' },
  coproc: { name: '解析コプロセッサ', part: '脳', mods: { INT: 1 }, loan: [600, 10], hl: 8, desc: 'INT+1（知覚・ICEに効く）' },
  jack: { name: '高速ニューラルジャック', part: '首', mods: { インターフェース: 2 }, loan: [500, 10], hl: 6, desc: 'インターフェース+2' },
  toolfinger: { name: '工具指', part: '手', mods: { 電子: 2 }, loan: [300, 10], hl: 4, desc: '電子+2' },
  ears: { name: '音響センサー', part: '耳', mods: { 知覚: 2, 隠密: 1 }, loan: [300, 10], hl: 4, desc: '知覚+2 隠密+1' },
  medkit: { name: '皮下メディキット', part: '体内', mods: { 医療: 1 }, loan: [300, 10], hl: 3, desc: '医療+1。休息で自分のHP+5' },
  steering: { name: '反射ステアリング', part: '脊髄', mods: { 運転: 2 }, loan: [400, 10], hl: 5, desc: '運転+2' },
  painblock: { name: '痛覚遮断', part: '脳幹', mods: {}, loan: [300, 10], hl: 7, desc: '重傷の−2を無視する' },
  voice: { name: '声帯変調器', part: '喉', mods: { 説得: 2, 隠密: 1 }, loan: [300, 10], hl: 4, desc: '説得+2 隠密+1' },
  reflex: { name: '反射増幅器「瞬」', part: '脊椎', mods: { REF: 2 }, loan: [1000, 10], hl: 14, desc: 'REF+2（射撃・回避・運転）。軍の横流し品' },
  milplate: { name: '軍用皮下装甲', part: '全身', mods: { armor: 6 }, loan: [800, 10], hl: 10, desc: '防具の上限+6' },
  tacai: { name: '戦術AI「カゲボウシ」', part: '脳', mods: { INT: 1, 知覚: 1 }, loan: [700, 10], hl: 9, desc: 'INT+1 知覚+1。ときどき勝手に話しかけてくる' },
  firewall: { name: 'ニューラル防壁', part: '脳幹', mods: {}, loan: [400, 10], hl: 4, desc: '黒ICEの逆流と敵ネットランナーの攻撃を受けない' },
  heart: { name: '人工心臓「ツヅミ」', part: '胸', mods: { BODY: 1 }, loan: [700, 10], hl: 8, desc: 'BODY+1。死亡セーブに+2' },
  chameleon: { name: '擬態皮膚', part: '皮膚', mods: { 隠密: 3 }, loan: [600, 10], hl: 9, desc: '隠密+3。周りの色を拾って溶け込む' },
  emochip: { name: '感情抑制チップ', part: '前頭葉', mods: { COOL: 2 }, loan: [500, 10], hl: 12, desc: 'COOL+2（隠密・説得）。心のほうが先に削れる' },
};

/* 装備（人間性を削らない成長）。部位ごとに1つ。歩合は本人の手持ち、専属はフィクサーが払う。 */
const GEAR_SLOTS = { weapon: '武器', body: '防具', tool: '道具' };
const GEAR = {
  pistol: { name: '重拳銃「ナナミ」', slot: 'weapon', price: 800, mods: { 射撃: 1 }, roles: ['solo', 'driver', 'tech', 'med'], desc: '射撃+1' },
  smg: { name: 'スマートSMG', slot: 'weapon', price: 2400, mods: { 射撃: 2 }, roles: ['solo', 'driver'], desc: '射撃+2' },
  aprifle: { name: '徹甲ライフル', slot: 'weapon', price: 2800, mods: { 射撃: 1 }, ap: true, roles: ['solo'], desc: '射撃+1。テックがいなくても装甲兵の弱点を撃ち抜く' },
  jacket: { name: '防弾ジャケット', slot: 'body', price: 700, mods: { armor: 2 }, roles: ['solo', 'driver', 'tech', 'med', 'net'], desc: '防具の上限+2' },
  heavyvest: { name: '重装甲ベスト', slot: 'body', price: 1800, mods: { armor: 4, 回避: -1 }, roles: ['solo'], desc: '防具の上限+4、回避−1' },
  poncho: { name: '光学迷彩ポンチョ', slot: 'body', price: 1600, mods: { 隠密: 2 }, roles: ['solo', 'tech', 'net'], desc: '隠密+2' },
  deck: { name: 'サイバーデッキ改', slot: 'tool', price: 1200, mods: { インターフェース: 1 }, roles: ['net'], desc: 'インターフェース+1' },
  milDeck: { name: '軍用デッキ', slot: 'tool', price: 3200, mods: { インターフェース: 2 }, roles: ['net'], desc: 'インターフェース+2' },
  toolkit: { name: '電子工具セット', slot: 'tool', price: 900, mods: { 電子: 2 }, roles: ['tech'], desc: '電子+2' },
  medbag: { name: '野戦医療バッグ', slot: 'tool', price: 900, mods: { 医療: 2 }, roles: ['med'], desc: '医療+2' },
  scanner: { name: '熱源スキャナー', slot: 'tool', price: 900, mods: { 知覚: 2 }, roles: ['solo', 'tech', 'net', 'med'], desc: '知覚+2（罠・狙撃手に効く）' },
  rig: { name: 'ドライブリグ', slot: 'tool', price: 1000, mods: { 運転: 2 }, roles: ['driver'], desc: '運転+2' },
  earpiece: { name: '交渉用イヤピース', slot: 'tool', price: 800, mods: { 説得: 2 }, roles: ['med', 'driver'], desc: '説得+2' },
  silenced: { name: 'サイレンサー拳銃「ヨダカ」', slot: 'weapon', price: 1500, mods: { 射撃: 1, 隠密: 1 }, roles: ['solo', 'tech', 'net', 'med'], desc: '射撃+1 隠密+1' },
  taser: { name: 'テーザー「ナマズ」', slot: 'weapon', price: 900, mods: { 射撃: 1 }, nonlethal: true, roles: ['med', 'driver', 'tech', 'net'], desc: '射撃+1。殺さずに倒すので、過剰な暴力にならない' },
  railgun: { name: '試作レールガン', slot: 'weapon', price: 5000, mods: { 射撃: 3 }, roles: ['solo'], desc: '射撃+3。ミツカネの試作品が闇市に流れたもの' },
  weave: { name: '防刃メッシュスーツ', slot: 'body', price: 1200, mods: { armor: 3 }, roles: ['solo', 'driver', 'tech', 'med', 'net'], desc: '防具の上限+3' },
  icehood: { name: 'ICE遮断フード', slot: 'body', price: 1400, mods: { インターフェース: 1 }, iceguard: true, roles: ['net'], desc: 'インターフェース+1。黒ICEの逆流を半分にする' },
  decoy: { name: 'デコイ・ドローン', slot: 'tool', price: 1400, mods: { 回避: 2 }, roles: ['solo', 'driver', 'tech'], desc: '回避+2。敵の照準を引きつける' },
  fakeid: { name: '偽造IDチップ', slot: 'tool', price: 1000, mods: { 説得: 1, 隠密: 1 }, roles: ['solo', 'driver', 'tech', 'med', 'net'], desc: '説得+1 隠密+1。今夜だけ別人になれる' },
  qpick: { name: '量子ピッキング端末', slot: 'tool', price: 2600, mods: { 電子: 3 }, roles: ['tech'], desc: '電子+3' },
};

/* フェーズ表の記法 */
const _ = null;
const H = (p) => Object.assign(p, { hidden: true });
const S = (dv, l) => ({ t: 'sneak', dv, l });
const T = (dv, l) => ({ t: 'trap', dv, l });
const C = (n, l, enemyType = 'standard', enemyDV) => ({ t: 'combat', n, l, enemyType, ...(enemyDV ? { enemyDV } : {}) });
const R = (l) => ({ t: 'rest', l });
const GT = (dv, l) => ({ t: 'gate', dv, l });
const O = (l) => ({ t: 'goal', l });
const E = (dv, l) => ({ t: 'escape', dv, l });
const D = (dv, l) => ({ t: 'drive', dv, l });
const K = (dv, l) => ({ t: 'talk', dv, l });
const M = (dv, l) => ({ t: 'med', dv, l });
const B = (l) => ({ t: 'boss', l });
const I = (dv, l, fx) => ({ t: 'ice', dv, l, fx });
const N5 = () => [_, _, _, _, _];
const N10 = () => [_, _, _, _, _, _, _, _, _, _];

const ICE_FX = {
  cam: '失敗で次の交戦に敵+1',
  door: '失敗で次の扉のDV+4',
  alarm: '失敗で逃走が追撃戦に',
  trace: '失敗でヒート+6',
  data: '目標。失敗で撤退',
};

const INTEL_COST = { 1: 200, 2: 500, 3: 900 };
const RANK_CRED = { 1: 25, 2: 60 };
const RANK_NAME = { 1: '路地裏', 2: '港湾', 3: '上層' };

const JOBS = [
  /* ── 評判ランク1 ── */
  {
    id: 'r1_delivery', rank: 1, district: 'harbor', title: '屋台街から港湾倉庫へ荷を運ぶ', client: 'resident', target: null,
    nights: 1, payout: 2000, cred: 4, heat: 0, req: [],
    desc: '中身は聞かない約束の小包。白蛇会の縄張りを抜けて届ける。',
    routes: [
      { name: '表通り', note: '検問はあるが見通しがいい', field: [D(15, '検問'), _, C(1, 'チンピラ'), _, O('受け渡し')], net: N5() },
      { name: '裏路地', note: '近道。誰の縄張りかは曖昧', field: [S(15, '裏路地'), H(C(2, '白蛇会の見張り')), _, _, O('受け渡し')], net: N5() },
    ],
  },
  {
    id: 'r1_collect', rank: 1, district: 'street', title: '白蛇会の取り立てを代行する', client: 'gang', target: null,
    nights: 1, payout: 2400, cred: 4, heat: 0, req: [],
    desc: '払いの滞った闇カジノから、上がりを回収してくる。',
    routes: [
      { name: '正面', note: '話がこじれれば殴り合い', field: [K(15, '支配人と交渉'), _, H(C(2, '用心棒')), _, O('金庫から回収')], net: N5() },
      { name: '裏口', note: '警報線が張ってあるという噂', field: [S(15, '裏口'), H(T(15, '警報線')), C(1, '番犬'), _, O('金庫から回収')], net: N5() },
    ],
  },
  {
    id: 'r1_watch', rank: 1, district: 'street', title: '屋台街の夜警', client: 'resident', target: null,
    nights: 1, payout: 1800, cred: 3, heat: 0, req: [],
    desc: '最近、屋台を荒らす強盗がいる。朝まで店を守ってほしい。',
    routes: [
      { name: '見回り', note: '歩き回って数を減らす', field: [_, C(2, '強盗'), R('屋台の裏で休憩'), H(C(2, '強盗の仲間')), O('朝まで守る')], net: N5() },
      { name: '待ち伏せ', note: '来るのを待って一度に叩く', field: [S(15, '物陰に潜む'), _, H(C(3, '強盗団')), _, O('朝まで守る')], net: N5() },
    ],
  },
  {
    id: 'r1_cargo', rank: 1, district: 'harbor', title: 'ミツカネの積み荷を取り返す', client: 'mitsukane', target: null,
    nights: 1, payout: 2600, cred: 4, heat: 0, req: ['driver'],
    desc: '港で密輸屋に抜かれた部品箱。警察沙汰にはしたくないらしい。',
    routes: [
      { name: '倉庫街', note: '密輸屋の溜まり場を通る', field: [S(15, '倉庫街'), C(2, '密輸屋'), _, O('積み荷'), E(15, '逃走')], net: N5() },
      { name: '水路', note: '船で裏から近づく', field: [D(15, '水路'), H(T(15, '浮遊機雷')), _, O('積み荷'), E(15, '逃走')], net: N5() },
    ],
  },
  {
    id: 'r1_relay', rank: 1, district: 'street', title: 'ヴェルデの監視網に中継器を仕込む', client: 'hakurou', target: 'verde',
    nights: 1, payout: 2400, cred: 4, heat: 6, req: ['net'],
    desc: 'ハクロウ通信の下請け。製薬工場の外周カメラに穴をあける。',
    routes: [
      { name: '外周フェンス', note: 'カメラの死角を縫う', field: [S(15, 'フェンス越え'), _, H(C(1, '巡回警備')), O('中継器を設置'), _], net: [_, I(15, 'カメラ網', 'cam'), _, I(15, '中継器の接続', 'data'), _] },
      { name: '下水道', note: '人目はないが空気が悪い', field: [_, H(T(15, 'ガス溜まり')), _, O('中継器を設置'), S(15, '撤収')], net: [I(15, 'センサー網', 'trace'), _, _, I(15, '中継器の接続', 'data'), _] },
    ],
  },
  {
    id: 'r1_escort', rank: 1, district: 'harbor', title: 'ミツカネの技術者を送り届ける', client: 'mitsukane', target: null,
    nights: 1, payout: 2600, cred: 4, heat: 0, req: [],
    desc: '転勤する技術者を湾岸の社宅まで。狙われる心当たりはないと本人は言う。',
    routes: [
      { name: '湾岸道路', note: '速いが目立つ', field: [D(15, '渋滞の湾岸道路'), H(C(2, '襲撃者')), _, C(1, 'バイク乗り'), O('送り届ける')], net: N5() },
      { name: '旧市街', note: '遅いが隠れやすい', field: [S(15, '旧市街'), _, R('セーフハウス'), H(C(2, '狙撃手と相棒')), O('送り届ける')], net: N5() },
    ],
  },

  {
    id: 'r1_memory', rank: 1, district: 'street', title: '盗まれた記憶テープを取り戻す', client: 'resident', target: null,
    nights: 1, payout: 2200, cred: 4, heat: 0, req: [],
    desc: '亡くなった夫の記憶を焼いたテープが、質屋に流れた。夫の声を聞けるのは、もうあれだけだという。',
    routes: [
      { name: '質屋', note: '主人と話をつける。こじれれば用心棒が出てくる', field: [K(15, '質屋の主人と交渉'), _, H(C(2, '質屋の用心棒')), _, O('記憶テープ')], net: N5() },
      { name: '裏口', note: '閉店後に忍び込む', field: [S(15, '質屋の裏口'), H(T(15, '防犯ワイヤー')), _, C(1, '寝ずの店番'), O('記憶テープ')], net: N5() },
    ],
  },
  {
    id: 'r1_neon', rank: 1, district: 'street', title: '白蛇会のネオン看板を乗っ取る', client: 'hakurou', target: 'gang',
    nights: 1, payout: 2400, cred: 4, heat: 0, req: ['net'],
    desc: 'ハクロウ通信が、屋台街でいちばん目立つ看板の広告枠を欲しがっている。持ち主は白蛇会だ。',
    routes: [
      { name: '屋上', note: '看板の裏から直接つなぐ', field: [S(15, '看板の裏へ登る'), _, H(C(2, '白蛇会の見回り')), _, S(15, '撤収')], net: [I(15, '監視カメラ', 'cam'), I(15, '看板の制御', 'data'), _, _, _] },
      { name: '配電盤', note: '路地の配電盤から回線に入る', field: [_, H(T(15, '漏電した配電盤')), _, C(1, '白蛇会の電気屋'), _], net: [_, _, I(15, '看板の制御', 'data'), _, _] },
    ],
  },
  {
    id: 'r1_parts_delivery', rank: 1, district: 'street', title: '闇医者に義体パーツを届ける', client: 'resident', target: null,
    nights: 1, payout: 2000, cred: 3, heat: 0, req: ['driver'],
    desc: '冷却箱の中身は、まだ温かい人工神経。出どころは聞かないほうがいい。',
    routes: [
      { name: '夜市を抜ける', note: '人混みに紛れる。義体狩りも紛れている', field: [D(15, '夜市の人混み'), _, H(C(2, '義体狩り')), _, O('闇医者に届ける')], net: N5() },
      { name: '旧地下鉄', note: '水の溜まった廃線を歩く', field: [S(15, '旧地下鉄'), H(T(15, '崩れた天井')), _, C(1, '地下の住人'), O('闇医者に届ける')], net: N5() },
    ],
  },

  /* ── 評判ランク2 ── */
  {
    id: 'r2_sample', rank: 2, district: 'harbor', title: 'ヴェルデ製薬の冷蔵倉庫からサンプルを回収する', client: 'mitsukane', target: 'verde',
    nights: 2, payout: 8000, cred: 7, heat: 12, req: ['net', 'tech', 'driver'],
    desc: '港湾倉庫の地下にある冷蔵庫から、試験中の義体用ジェルを一箱。',
    routes: [
      {
        name: '排水路', note: '情報屋いわく、警備の薄い裏道',
        field: [S(13, '侵入'), _, C(2, '巡回', 'armored', 19), _, H(T(13, 'センサー罠')), R('物陰で休息'), GT(15, '隔壁'), H(C(3, '警備ドローン', 'sniper', 19)), O('保管庫'), E(15, '逃走')],
        net: [_, I(13, 'カメラ網', 'cam'), _, _, _, _, I(15, '隔壁制御', 'door'), _, H(I(17, '警報系', 'alarm')), _],
      },
      {
        name: '搬入口', note: '業者に化けて正面から入る',
        field: [K(15, '偽の搬入業者'), H(C(2, '検品係の警備', 'hacker', 19)), _, GT(13, '搬入ゲート'), _, C(3, '倉庫警備', 'swarm', 17), _, GT(15, '冷蔵庫'), O('保管庫'), E(15, '逃走')],
        net: [I(13, '入構記録', 'trace'), _, _, I(15, 'ゲート制御', 'door'), _, _, I(15, 'カメラ網', 'cam'), _, H(I(17, '警報系', 'alarm')), _],
      },
    ],
  },
  {
    id: 'r2_defector', rank: 2, district: 'street', title: 'ヴェルデの研究者を亡命させる', client: 'hakurou', target: 'verde',
    nights: 1, payout: 6000, cred: 7, heat: 12, req: ['driver', 'med'],
    desc: '研究者本人は乗り気だが、体に追跡タグが埋めてある。',
    routes: [
      { name: '研究棟', note: '夜勤明けを狙う', field: [S(15, '研究棟'), H(C(2, '研究棟の狙撃班', 'sniper', 19)), K(13, '研究者を説得'), O('研究者を確保'), E(15, '逃走')], net: [I(13, 'カメラ網', 'cam'), _, _, H(I(15, '追跡タグ', 'trace')), _] },
      { name: '往診', note: '医者を装って社宅を訪ねる', field: [M(13, '往診を装う'), H(C(2, '社宅の狙撃班', 'sniper', 21)), M(15, '追跡タグの摘出'), O('研究者を確保'), E(13, '逃走')], net: [_, I(13, '社宅の入館系', 'trace'), _, _, _] },
    ],
  },
  {
    id: 'r2_datatheft', rank: 2, district: 'upper', title: 'ハクロウ通信のサーバーからデータを抜く', client: 'verde', target: 'hakurou',
    nights: 1, payout: 5500, cred: 7, heat: 12, req: ['net', 'tech'],
    desc: '物理的に端子を挿さないと届かない、隔離されたサーバー。',
    routes: [
      { name: '通用口', note: '物理で入ってネットで抜く', field: [S(15, 'データセンター'), GT(15, 'サーバー室'), H(C(2, '警備', 'sniper', 20)), O('物理接続'), E(13, '撤収')], net: [I(15, '外周ICE', 'trace'), _, I(15, 'カメラ網', 'cam'), I(17, 'データ金庫', 'data'), H(I(17, '黒ICE', 'alarm'))] },
      { name: '屋上', note: '空調設備から降りる', field: [D(13, 'ドローンで屋上へ'), H(T(15, '赤外線網')), GT(13, '空調ダクト'), O('物理接続'), C(2, '駆けつけた警備', 'hacker', 20)], net: [_, I(15, 'カメラ網', 'cam'), _, I(17, 'データ金庫', 'data'), _] },
    ],
  },
  {
    id: 'r2_convoy', rank: 2, district: 'harbor', title: 'ミツカネの兵器輸送を護衛する', client: 'mitsukane', target: null,
    nights: 2, payout: 7000, cred: 7, heat: 0, req: ['driver', 'solo'],
    desc: '湾岸から内陸の倉庫まで、二晩かけて運ぶ。狙っている連中は多い。',
    routes: [
      { name: '湾岸道路', note: '見通しがよく、待ち伏せもされやすい', field: [D(13, '湾岸道路'), _, H(C(3, '待ち伏せ', 'swarm', 17)), _, R('中継地点'), D(15, '高架'), C(2, 'ドローン', 'armored', 19), _, H(C(3, '白蛇会の襲撃', 'sniper', 19)), O('引き渡し')], net: N10() },
      { name: '旧線路', note: '廃線を走る。車は傷む', field: [D(15, '廃線'), H(T(13, '崩れた陸橋')), _, C(2, '線路の住人', 'hacker', 21), R('廃駅'), _, D(15, 'トンネル'), H(C(3, '先回りした襲撃者', 'swarm', 17)), _, O('引き渡し')], net: N10() },
    ],
  },

  {
    id: 'r2_ai', rank: 2, district: 'harbor', title: 'ハクロウ通信から逃げたAIを捕まえる', client: 'hakurou', target: 'mitsukane',
    nights: 1, payout: 6500, cred: 7, heat: 12, req: ['net', 'tech'],
    desc: '研究用のAIが回線を伝って、ミツカネの工場ネットに逃げ込んだ。捕獲要請に、AIは「消さないで」とだけ返してきた。',
    routes: [
      { name: '工場ネット', note: '物理端子から追い込む', field: [S(15, '工場の通用口'), _, C(2, '工場警備', 'hacker', 19), GT(15, 'サーバー区画'), O('AIを隔離')], net: [I(15, '工場のICE', 'trace'), _, I(15, 'AIの防壁', 'door'), I(19, 'AIの核', 'data'), _] },
      { name: '交渉', note: 'AIと話をつけて、自分から檻に入らせる', field: [K(15, 'AIと交渉'), H(C(2, 'ミツカネの回収班', 'armored', 19)), GT(15, '端末室'), O('AIを隔離'), E(15, '撤収')], net: [_, I(15, 'カメラ網', 'cam'), _, I(19, 'AIの核', 'data'), _] },
    ],
  },
  {
    id: 'r2_seized', rank: 2, district: 'harbor', title: '差し押さえられた義体を取り戻す', client: 'resident', target: 'verde',
    nights: 1, payout: 6000, cred: 7, heat: 12, req: ['solo', 'driver'],
    desc: 'ヴェルデの回収業者が、ローンの滞った住民の義足を「体ごと」持っていった。本人は港の倉庫にいる。',
    routes: [
      { name: '倉庫', note: '回収品の保管倉庫に忍び込む', field: [S(15, '回収業者の倉庫'), C(2, '倉庫番', 'swarm', 19), H(T(15, '圧力センサー')), O('差し押さえ品と本人'), E(17, '逃走')], net: N5() },
      { name: '回収車', note: '移送中の車を止める', field: [D(17, '回収車を追う'), H(C(3, '回収車の護衛', 'sniper', 21)), _, O('差し押さえ品と本人'), E(17, '逃走')], net: N5() },
    ],
  },

  /* ── 評判ランク3 ── */
  {
    id: 'r3_vault', rank: 3, district: 'upper', title: '上層：ミツカネ重役の金庫を開ける', client: 'verde', target: 'mitsukane',
    nights: 2, payout: 16000, cred: 12, heat: 20, req: ['net', 'tech', 'driver', 'solo'],
    desc: '企業区画の上層、重役フロアの壁金庫。中身は契約書の原本。',
    routes: [
      {
        name: '業務用エレベーター', note: '清掃業者の時間帯に紛れる',
        field: [S(17, '上層エレベーター'), C(3, '警備部隊'), H(T(15, '圧力床')), GT(17, '重役フロア'), R('空調ダクト'), H(C(4, '戦闘用義体兵')), GT(17, '金庫'), O('金庫の中身'), _, E(17, '屋上から逃走')],
        net: [I(15, '入館系', 'trace'), I(17, 'カメラ網', 'cam'), _, I(17, 'フロア制御', 'door'), _, _, I(19, '金庫制御', 'door'), _, H(I(19, '警報系', 'alarm')), _],
      },
      {
        name: '外壁', note: 'ビルの外を登る。逃げ道は空だけ',
        field: [D(15, '飛行車で接近'), H(T(17, '外壁の対人センサー')), GT(15, '窓'), _, R('空き会議室'), C(3, '巡回'), GT(17, '金庫'), O('金庫の中身'), H(C(3, '即応部隊')), E(17, '飛び降りて回収')],
        net: [_, I(17, 'センサー網', 'trace'), I(15, '窓の施錠', 'door'), _, _, I(17, 'カメラ網', 'cam'), I(19, '金庫制御', 'door'), _, _, H(I(19, '警報系', 'alarm'))],
      },
    ],
  },
  {
    id: 'r3_relay', rank: 3, district: 'harbor', title: 'ハクロウ通信の湾岸中継局を落とす', client: 'mitsukane', target: 'hakurou',
    nights: 2, payout: 14000, cred: 12, heat: 20, req: ['net', 'solo', 'driver'],
    desc: '街の半分の回線が通る中継局。一晩だけ黙らせてほしい。',
    routes: [
      {
        name: '海側', note: 'ボートで桟橋から',
        field: [D(15, '夜の湾'), C(3, '桟橋の警備'), _, H(T(15, '水中センサー')), R('機械室'), S(17, '制御棟'), H(C(4, '防衛ドローン')), _, O('中継器を停止'), E(15, '海へ逃走')],
        net: [_, I(15, 'カメラ網', 'cam'), _, _, _, I(17, '入館系', 'trace'), _, I(19, '中継局の中枢', 'data'), H(I(19, '警報系', 'alarm')), _],
      },
      {
        name: '陸側', note: '整備車両に紛れる',
        field: [K(15, '整備員を装う'), _, H(C(3, '詰所の警備')), GT(15, '制御棟'), R('倉庫'), _, C(3, '巡回'), H(T(17, '電磁床')), O('中継器を停止'), E(17, '検問を突破')],
        net: [I(15, '作業記録', 'trace'), _, _, I(17, '扉の制御', 'door'), _, _, I(17, 'カメラ網', 'cam'), _, I(19, '中継局の中枢', 'data'), H(I(19, '警報系', 'alarm'))],
      },
    ],
  },
  {
    id: 'r3_soul', rank: 3, district: 'upper', title: '上層：記憶銀行から一人分の人格を引き出す', client: 'gang', target: 'hakurou',
    nights: 2, payout: 15000, cred: 12, heat: 20, req: ['net', 'solo', 'tech'],
    desc: '白蛇会の会長が、十年前に死んだ兄の人格バックアップを欲しがっている。ハクロウの記憶銀行は、遺族にも開示しない。',
    routes: [
      {
        name: '正面', note: '遺族を装って保管階まで上がる',
        field: [K(17, '遺族を装う'), _, H(C(3, '銀行の警備')), GT(17, '保管階'), R('待合室'), S(17, '保管庫の通路'), H(C(4, '防衛義体兵')), GT(19, '人格保管庫'), O('人格データ'), E(17, '撤収')],
        net: [I(15, '受付系', 'trace'), _, I(17, 'カメラ網', 'cam'), I(17, '保管階の施錠', 'door'), _, _, _, I(19, '保管庫の施錠', 'door'), H(I(19, '警報系', 'alarm')), _],
      },
      {
        name: '回線', note: '保守用の中継室から中枢へ潜る',
        field: [_, S(17, '中継室へ'), _, C(3, '保守要員の護衛'), R('中継室'), _, H(T(17, '電磁床')), _, O('人格データ'), E(17, '撤収')],
        net: [I(17, '外周ICE', 'trace'), I(17, 'カメラ網', 'cam'), _, _, _, I(19, '記憶銀行の中枢', 'data'), _, H(I(19, '黒ICE', 'alarm')), _, _],
      },
    ],
  },
];

/* 顔役の紹介依頼（評判ランクを上げる） */
const INTRO_JOBS = {
  1: {
    id: 'intro1', rank: 1, district: 'harbor', title: '顔役の紹介：港のゴンドウの密輸船を守る', client: 'broker', target: null, intro: true,
    nights: 1, payout: 3200, cred: 6, heat: 0, req: ['solo', 'driver'],
    desc: '港の顔役ゴンドウが、新人の腕を見たいと言っている。成功すれば港湾の仕事が回ってくる。',
    routes: [
      { name: '船着き場', note: '荷積みの間、桟橋を守る', field: [S(15, '桟橋に潜む'), C(2, '荷を狙う連中'), _, H(C(3, '白蛇会の船')), E(15, '沖へ逃がす')], net: N5() },
      { name: '沖合', note: '船に乗り込んで護衛する', field: [D(15, '夜の湾'), H(C(3, '海賊まがい')), R('船倉'), C(2, '乗り込んできた連中'), E(13, '入港')], net: N5() },
    ],
  },
  2: {
    id: 'intro2', rank: 2, district: 'upper', title: '顔役の紹介：上層の仲介人シラサギの試験', client: 'broker', target: 'hakurou', intro: true,
    nights: 2, payout: 7000, cred: 10, heat: 10, req: ['net', 'solo', 'tech'],
    desc: '上層の仲介人シラサギは、口の堅いフィクサーとしか組まない。ハクロウの役員端末を一晩のぞき見る。',
    routes: [
      {
        name: '社員食堂', note: '夜間の搬入に紛れる',
        field: [K(15, '業者を装う'), _, H(C(3, '夜間警備')), GT(15, '役員階'), R('仮眠室'), S(17, '役員室'), _, H(T(17, '生体認証床')), O('端末をのぞく'), S(15, '撤収')],
        net: [I(15, '入館系', 'trace'), _, _, I(15, '扉の制御', 'door'), _, I(17, 'カメラ網', 'cam'), _, _, I(17, '役員端末', 'data'), _],
      },
    ],
  },
};

/* メイン「ブラックボックス」 */
const CAMPAIGN_JOBS = {
  2: {
    id: 'camp2', rank: 2, district: 'street', title: 'ブラックボックスをこじ開ける', client: 'self', target: null, campaign: 2,
    nights: 1, payout: 0, cred: 8, heat: 0, req: ['net', 'solo'],
    desc: '前任ハシバが残した箱の暗号を破る。ダイブ中、隠れ家を嗅ぎつけた連中が来るかもしれない。',
    routes: [
      { name: '隠れ家でダイブ', note: 'ネットランナーの腕がすべて', field: [_, _, C(2, '嗅ぎつけた追っ手'), _, _], net: [I(15, '外殻', 'door'), I(17, '第二層', 'trace'), H(I(17, '自壊プログラム', 'data')), _, I(17, '中枢', 'data')] },
    ],
  },
  3: {
    id: 'camp3', rank: 2, district: 'harbor', title: '前任の足跡：港湾局の乗船名簿', client: 'self', target: 'mitsukane', campaign: 3,
    nights: 2, payout: 3000, cred: 8, heat: 10, req: ['net', 'tech'],
    desc: '箱の運送記録と照らし合わせるため、港湾局の記録庫から名簿の原本を持ち出す。持ち出した写しは別口で売れる。',
    routes: [
      {
        name: '記録庫', note: '港湾局の古い地下書庫',
        field: [S(15, '港湾局'), _, H(C(2, '夜警')), GT(15, '書庫の扉'), R('書架の陰'), _, H(T(15, '古い警報')), O('名簿の原本'), _, S(15, '撤収')],
        net: [_, I(15, 'カメラ網', 'cam'), _, I(15, '書庫の施錠', 'door'), _, _, _, I(17, '電子目録', 'data'), _, _],
      },
    ],
  },
  4: {
    id: 'camp4', rank: 3, district: 'upper', title: 'ハシバを消した者を追う', client: 'self', target: 'verde', campaign: 4,
    nights: 2, payout: 0, cred: 12, heat: 15, req: ['net', 'solo', 'driver', 'tech'],
    desc: 'ハシバが最後に会った「調整役」は、ヴェルデ製薬の上層階に住んでいる。',
    routes: [
      {
        name: '調整役の自宅', note: '企業区画上層の居住棟',
        field: [S(17, '居住棟'), C(3, '私兵'), _, H(T(17, '対人センサー')), R('非常階段'), GT(17, '居室'), H(C(4, '戦闘用義体兵')), K(17, '調整役を問い詰める'), O('証言'), E(17, '逃走')],
        net: [I(17, 'カメラ網', 'cam'), _, _, _, _, I(17, '居室の施錠', 'door'), _, _, H(I(19, '警報系', 'alarm')), _],
      },
    ],
  },
  5: {
    id: 'camp5', rank: 3, district: 'harbor', title: '最後の夜：箱を持って朝を迎える', client: 'self', target: 'hakurou', campaign: 5,
    nights: 2, payout: 0, cred: 15, heat: 0, req: ['net', 'solo', 'driver'],
    desc: '3社が箱を取り返しに来る。夜明けまで逃げ切れば、箱の行き先は自分で決められる。',
    routes: [
      {
        name: '湾岸を抜ける', note: '逃げ続ける二晩',
        field: [D(15, '包囲を抜ける'), C(3, 'ミツカネの追跡班'), _, H(C(3, 'ヴェルデの私兵')), R('廃ビル'), D(17, '高架'), H(T(17, 'ハクロウの監視網')), C(4, '最後の追っ手'), O('夜明け'), _],
        net: [I(17, '追跡信号', 'trace'), I(17, 'カメラ網', 'cam'), _, _, _, _, I(19, '街頭監視網', 'alarm'), _, I(19, '箱の発信器', 'data'), _],
      },
    ],
  },
};

const STORY = {
  intro: {
    title: '第1章　引き継ぎ',
    body: [
      '前任のフィクサー、ハシバが消えて三週間になる。',
      '湾岸の隠れ家と縄張り、40夜分の借金、それから開け方のわからない黒い箱が、新人のあなたに回ってきた。',
      'あなたは撃たない。ランナーを雇い、仕事を選び、夜の街へ送り出す。そして、人間のまま帰ってくるのを待つ。',
    ],
    goal: '依頼を3件成功させて、縄張りを回し始める。',
  },
  2: {
    title: '第2章　鍵を探す',
    body: [
      '仕事が回り始めた。ハシバの箱は、普通の端末では暗号の入り口すら見えない。',
      '開けるには腕のいいネットランナーと、港湾の仕事を受けられるだけの評判が要る。',
    ],
    goal: '評判ランク2になり、インターフェース6以上のネットランナーを抱える。',
  },
  3: {
    title: '第3章　積み荷',
    body: [
      '箱の中身の一部が読めた。運送記録だ。',
      'ただし、運ばれていたのは荷物ではなく人だった。ハシバは三社のあいだで、人を運んでいた。',
    ],
    goal: '港湾局の乗船名簿を手に入れる。',
  },
  4: {
    title: '第4章　調整役',
    body: [
      '名簿の最後の行に、ハシバ自身の名前があった。行き先の欄は空白のままだ。',
      '名簿を持ち出したことは、もう知られている。3社すべてがこちらを嗅ぎ回り始めた。',
    ],
    goal: '評判ランク3になり、ハシバを消した「調整役」を問い詰める。（毎夜、全企業のヒート+3）',
  },
  5: {
    title: '第5章　夜明け',
    body: [
      '調整役は白状した。三社は社員を互いに「貸し借り」していた。戻ってこなかった者の記録が、あの箱に入っている。',
      'ハシバは公表しようとして、三社の合意で消された。',
      '箱を持って朝を迎えれば、その行き先は自分で決められる。',
    ],
    goal: '最後の依頼を成功させ、箱の行き先を決める。',
  },
};

/* 幕間。条件を満たした夜明けに一度だけ流れる（条件は engine.js の INTERLUDE_WHEN） */
const INTERLUDES = {
  firstCyber: {
    title: '幕間　肉の値段',
    body: [
      '闇医者は、外した肉を銀色の袋に入れて、こちらに見せもせずに捨てた。',
      '「部品は替えがきく。替えがきかないのは、替えたと気づく心のほうだ」',
      '帰り道、新しい体のランナーは、屋台のガラスに映る自分を一度だけ振り返った。',
    ],
  },
  firstDeath: {
    title: '幕間　空いた寝台',
    body: [
      '隠れ家の寝台がひとつ空いた。毛布はたたまれないまま、まだ形を残している。',
      '屋台街では、帰ってこなかった者の名前を、軒先の提灯に書く習わしがある。',
      'あなたは名前を書いた。字は、思ったよりも震えなかった。それが少し怖かった。',
    ],
  },
  edge: {
    title: '幕間　鏡に映らない',
    body: [
      '夜中に目を覚ますと、ランナーの一人が洗面所の鏡の前に立っていた。',
      '「顔は映ってる。でも、これが自分だって、どこで判断してたんだっけ」',
      '人間性が尽きかけている。セラピーに通わせるか、それとも、あと一晩だけ働かせるか。',
    ],
  },
  harbor: {
    title: '幕間　港の匂い',
    body: [
      '港の顔役ゴンドウは、潮と機械油の匂いがする手で握手をした。',
      '「ハシバもここから始めた。あいつは最後まで、人を荷物みたいには運ばなかったよ」',
      'それが褒め言葉なのか警告なのか、あなたにはまだわからない。',
    ],
  },
  watched: {
    title: '幕間　見られている',
    body: [
      '隠れ家の向かいのビルに、三日前から同じ配送ドローンが停まっている。',
      '企業は、気に入らないフィクサーを訴えたりしない。ある朝、いなくなっているだけだ。',
      'ヒートが80を超えた。100になれば、隠れ家に人が来る。',
    ],
  },
  rain: {
    title: '幕間　雨はやまない',
    body: [
      'ヨミハマに来てから、晴れた夜を見た覚えがない。',
      '海面は毎年少しずつ上がり、下層の通りから順に水に沈んでいく。それでも夜市は、今夜も一段上の階で開いている。',
      'この街で長く生きるコツは、足元を見ないことだ。',
    ],
  },
  ghost: {
    title: '幕間　前任者の声',
    body: [
      '箱を開けた夜から、隠れ家の古い端末に、ときどき短い音声が届くようになった。',
      '「ランナーは道具じゃない。だが、道具のように扱わないと、守れないときがある」',
      'ハシバの声だ。録音なのか、誰かが真似ているのか。それとも、まだどこかで生きているのか。',
    ],
  },
};

/* 結末で、生き残ったランナーのその後を一行ずつ添える */
const EPILOGUES = {
  story: {
    kagerou: 'カゲロウの名前は、ハクロウのどの記録にも残っていない。本人がそうした。',
    yoru: 'ヨルは回収されなかった腕で、屋台街の子どもたちに射撃を教えている。',
    haruka: 'ハルカの診療所には、また灯がともった。今度は誰にも焼かせない。',
    shigure: 'シグレは取り戻した車で、夜明けの湾岸道路を一度だけ全開で走った。',
    mikoto: 'ミコトは、もう一人の自分に会いに行った。何を話したのかは、誰にも言わない。',
  },
  stable: ['{name}は、その後も夜の仕事を続けた。たまに隠れ家へ顔を出す。', '{name}は稼いだ金で、屋台を一軒買った。', '{name}は街を出た。絵葉書が一枚だけ届いた。'],
  unstable: ['{name}は鏡を避けるようになった。それでも、呼べば来る。', '{name}は眠らなくなった。眠る必要がなくなったのかもしれない。'],
  sign: ['{name}の義体は、たぶん本人より長く生きるだろう。', '{name}は自分の名前を、ときどき思い出せない。'],
};

const ENDINGS = {
  publish: {
    title: '公開する',
    pick: '評判は最大になるが、3社に追われる。',
    body: [
      '名簿は朝のニュースより早く街に広まった。戻ってこなかった人たちの名前が、屋台街の壁という壁に貼られた。',
      'あなたの名前を知らない者は、もうヨミハマにいない。そのかわり、隠れ家の扉を叩く音は一晩も止まない。',
    ],
  },
  sell: {
    title: '売る',
    pick: '大金が入るが、街は何も変わらない。',
    body: [
      'ハクロウ通信の代理人は、言い値を一度も値切らずに払った。',
      '口座には一生分のクレジット。湾岸のネオンは昨日と同じ色で光っている。ヨミハマは何も変わらない。',
    ],
  },
  burn: {
    title: '焼く',
    pick: '誰も得をしないが、ランナーたちは生き残る。',
    body: [
      '箱は港の焼却炉で灰になった。誰も得をしなかった。',
      'それでも翌朝、ランナーたちは全員、隠れ家に帰ってきた。今夜も仕事はある。',
    ],
  },
};
