const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function game() {
  const storage=new Map();
  const c=vm.createContext({console,Math,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  const run=s=>vm.runInContext(s,c);
  for(const f of ['data','engine','world'])run(fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8'));
  run('newGame();G.money=99999;G.news=3;G.conditions={};');
  return {run,storage};
}
// Settles a won mission for the given board job without rolling dice.
const win=`(job)=>{const out={story:[],touched:{}};const ms={job,routeIdx:0,result:{success:true,reason:'',members:[],heat:{},lazarus:[],rewardMult:1,log:[]}};G.board=G.board.filter(j=>j!==job);return {s:settle(ms,out),out};}`;

test('chapter table is consistent: every link, job and condition resolves, and the chain ends',()=>{
  const {run}=game();
  assert.equal(run(`Object.entries(CHAPTERS).every(([k,c])=>(c.ending||CHAPTERS[c.next])&&(!c.job||CAMPAIGN_JOBS[c.job].campaign===k)&&Object.keys({...c.unlock,...c.advance}).every(r=>REQS[r]))`),true);
  assert.equal(run(`let k='handover',n=0;while(!CHAPTERS[k].ending&&n<20){k=CHAPTERS[k].next;n++;} CHAPTERS[k].ending===true`),true);
});

test('campaign runs handover → cipher → cargo → coordinator → dawn → ending choice',()=>{
  const {run}=game();
  run(`G.successes=3; var out=endNight();`);
  assert.equal(run('G.chapter==="cipher" && out.story.includes("cipher") && G.chapterLog.join()==="handover,cipher"'),true);
  assert.equal(run('refreshBoard(); G.board.some(j=>j.campaign)'),false);
  run(`G.rank=2; const n=makeRunner('net'); n.skills['インターフェース']=6; G.runners.push(n); refreshBoard();`);
  run(`var r=(${win})(G.board.find(j=>j.campaign==='cipher'));`);
  assert.equal(run('G.chapter==="cargo" && r.out.story[0]==="cargo" && r.s.bonus && G.flags.done_cipher'),true);
  run(`refreshBoard(); r=(${win})(G.board.find(j=>j.campaign==='cargo'));`);
  assert.equal(run('G.chapter'),'coordinator');
  assert.equal(run('refreshBoard(); G.board.some(j=>j.campaign)'),false);
  run(`G.rank=3; refreshBoard(); r=(${win})(G.board.find(j=>j.campaign==='coordinator'));`);
  assert.equal(run('G.chapter'),'dawn');
  run(`refreshBoard(); r=(${win})(G.board.find(j=>j.campaign==='dawn'));`);
  assert.equal(run('G.awaitEnding===true && !r.s.bonus && G.chapter==="dawn"'),true);
});

test('heatPerNight chapters keep every corporation heating; others cool when untouched',()=>{
  const {run}=game();
  run(`G.missions=[];G.board=[];G.heat={mitsukane:20,verde:20,hakurou:20};endNight();`);
  assert.equal(run('G.heat.verde'),19);
  run(`G.chapter='coordinator';G.chapterLog.push('cipher','cargo','coordinator');G.missions=[];G.board=[];G.heat={mitsukane:20,verde:20,hakurou:20};endNight();`);
  assert.equal(run('G.heat.verde'),23);
});

test('saves with numeric chapters load as chapter keys with history, flags and campaign jobs converted',()=>{
  const {run,storage}=game();
  run(`G.chapter=3; delete G.chapterLog; G.flags.camp2=true; G.board.push({...clone(CAMPAIGN_JOBS.camp3),uid:777,tpl:'camp3',campaign:3}); save();`);
  run('G=null; G=loadSave();');
  assert.equal(run('G.chapter'),'cargo');
  assert.equal(run('G.chapterLog.join()'),'handover,cipher,cargo');
  assert.equal(run('G.flags.done_cipher===true && G.flags.camp2===undefined'),true);
  assert.equal(run('G.board.find(j=>j.uid===777).campaign'),'cargo');
  assert.equal(run('reached("cipher") && !reached("coordinator")'),true);
});
