/* FIXER'S CUT — 編成の再利用・通信の速度・合成効果音 */
const Comfort = (() => {
  const SOUND_KEY = 'fixers-cut-sound';
  const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) { /* 設定の保存失敗でも続行 */ } };
  let sound = read(SOUND_KEY, 'off') === 'on';
  let audio = null, lastSound = -Infinity;

  function unlockAudio() {
    if (!sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio) audio = new Audio();
      if (audio.state === 'suspended') { const p = audio.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (_) { audio = null; }
  }
  function tone(line) {
    if (!sound || !audio || audio.state !== 'running' || instantLog()) return;
    const now = Date.now();
    if (now - lastSound < 100) return;
    let notes;
    const has = (k) => line.classList.contains(k);
    if (has('dead') || /死亡セーブ/.test(line.textContent || '')) notes = [180, 120, 80];
    else if (has('goal')) notes = [440, 660, 880];
    else if (has('ok')) notes = [520, 780];
    else if (has('ng')) notes = [240, 160];
    else if (has('warn')) notes = [300, 300];
    else return;
    lastSound = now;
    try {
      const start = audio.currentTime;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = has('dead') ? 'triangle' : 'sine';
      notes.forEach((f, i) => oscillator.frequency.setValueAtTime(f, start + i * .045));
      gain.gain.setValueAtTime(.035, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + notes.length * .045);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + notes.length * .045 + .01);
    } catch (_) { /* 音声非対応の環境でも通信は継続 */ }
  }
  function soundButton() {
    return `<button data-act="sound" aria-pressed="${sound}">効果音 ${sound ? 'オン' : 'オフ'}</button>`;
  }
  function restoreTeam(job) {
    if (!G.lastTeam) return '前回の編成はまだありません';
    const team = { field: [], support: [], net: [] }, skipped = [], used = new Set();
    for (const lane of Object.keys(team)) {
      for (const id of G.lastTeam[lane] || []) {
        const r = getR(id);
        if (!r || !available(r) || used.has(id) || team[lane].length >= LANE_MAX[lane] || (lane === 'net' && r.role !== 'net')) {
          skipped.push(r ? r.name : `離脱済み #${id}`); continue;
        }
        team[lane].push(id); used.add(id);
      }
    }
    UI.team[job.uid] = team;
    UI.est = { key: '', val: null };
    const errors = validateTeam(job, team);
    return [skipped.length ? `出せないため除外：${skipped.join('、')}` : '前回の編成を呼び出しました', ...errors].join('。');
  }
  document.addEventListener('click', unlockAudio, { capture: true });
  return {
    soundButton, restoreTeam, tone,
    toggleSound() { sound = !sound; write(SOUND_KEY, sound ? 'on' : 'off'); unlockAudio(); },
  };
})();

const comfortValidateTeam = validateTeam;
validateTeam = function(job, team) {
  if (!team || !['field', 'support', 'net'].every(k => Array.isArray(team[k]))) return ['編成が正しくありません'];
  const ids = teamIds(team), errors = [];
  if (new Set(ids).size !== ids.length) errors.push('同じランナーを複数の枠には入れられません');
  if (ids.some(id => !getR(id))) errors.push('離脱済みのランナーが含まれています');
  for (const lane of ['field', 'support', 'net']) if (team[lane].length > LANE_MAX[lane]) errors.push(`${LANE[lane]}の枠が上限を超えています`);
  if (team.net.some(id => getR(id) && getR(id).role !== 'net')) errors.push('ネット枠にはネットランナーが必要です');
  return errors.concat(comfortValidateTeam(job, team));
};
const comfortDispatch = dispatch;
dispatch = function(uid, routeIdx, team) {
  const err = comfortDispatch(uid, routeIdx, team);
  if (!err) G.lastTeam = clone(team);
  return err;
};
const comfortFormation = formation;
formation = function(job, team) {
  return `<div class="actions"><button data-act="usualTeam" data-v="${job.uid}" ${G.lastTeam ? '' : 'disabled'}>いつもの面子</button></div>` + comfortFormation(job, team);
};
const comfortHud = hud;
hud = function() { return comfortHud().replace('<dl class="hud-stats">', Comfort.soundButton() + '<dl class="hud-stats">'); };
const comfortStepComm = stepComm;
stepComm = function(c) { return Comfort.soundButton() + comfortStepComm(c); };
// markStrip は通常再生で一行ずつ呼ばれる。全表示時の final=true は無音。
const comfortMarkStrip = markStrip;
markStrip = function(line, final) {
  comfortMarkStrip(line, final);
  if (line && !final) Comfort.tone(line);
};
H_.usualTeam = function(b) {
  const job = G.board.find(j => j.uid === +b.dataset.v);
  if (!job) return;
  toast(Comfort.restoreTeam(job)); render();
};
H_.sound = function() {
  Comfort.toggleSound();
  // 通信の再描画を避け、表示済みの行と現在の判断を保つ。
  const buttons = document.querySelectorAll('[data-act="sound"]');
  const holder = document.createElement('div'); holder.innerHTML = Comfort.soundButton();
  buttons.forEach(b => { b.textContent = holder.firstElementChild.textContent; b.setAttribute('aria-pressed', holder.firstElementChild.getAttribute('aria-pressed')); });
};
const comfortNext = H_.next;
H_.next = function() {
  const box = modal.querySelector('.log.play');
  if (box && [...box.querySelectorAll('.ln')].some(l => !l.classList.contains('on'))) { H_.skiplog(); return; }
  comfortNext();
};

