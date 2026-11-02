const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function game(value=.5) {
  const math=Object.create(Math);math.random=()=>value;
  const c=vm.createContext({console,Math:math,localStorage:{getItem(){return null;},setItem(){},removeItem(){}}});
  const run=s=>vm.runInContext(s,c);
  for(const f of ['data','engine','world'])run(fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8'));
  run('newGame();G.money=50000;G.news=3;G.conditions={};G.board=[];');
  return run;
}
const ctxOf=`(team)=>({sim:false,all:[...team.field,...team.support,...team.net],team,job:{district:'harbor'},worldConditions:{news:null,condition:null},log:[],checks:{},xp:{},credit:{},clock:0,lazarus:[],mods:{extraEnemy:0},interactive:false})`;

test('every new implant, gear and story runner is fully defined',()=>{
  const run=game();
  assert.equal(run(`['reflex','milplate','tacai','firewall','heart','chameleon','emochip'].every(k=>CYBER[k]&&CYBER[k].loan&&CYBER[k].hl>0)`),true);
  assert.equal(run(`Object.values(ROLE_CYBER).flat().every(k=>CYBER[k])`),true);
  assert.equal(run(`Object.values(GEAR).every(g=>GEAR_SLOTS[g.slot]&&g.price>0&&g.roles.every(r=>ROLES[r]))`),true);
  assert.equal(run(`['shigure','mikoto'].every(k=>{const r=makeStory(k);return r.story===k&&r.bio&&World.perks[k];})`),true);
});

test('random runners get an origin-based background line',()=>{
  const run=game();
  assert.equal(run(`const r=makeRunner('solo',{origin:'street'}); BIOS.street.past.some(p=>r.bio.startsWith(p))`),true);
});

test('artificial heart adds two to the death save; neural firewall blocks black ICE',()=>{
  const run=game(.5); // d10 always 6
  run(`const r=G.runners[0]; r.base.BODY=5; r.cyber=['heart']; const m=snap(r); m.st.BODY=5; const ctx=(${ctxOf})({field:[m],support:[],net:[]}); deathSave(ctx,m);`);
  assert.equal(run('m.down && !m.dead && ctx.credit[m.id+"|"+CYBER.heart.name]===1'),true); // 6 < 5+1? no: 6 < 5+2 thanks to heart
  run(`const n=makeRunner('net'); n.cyber=['firewall']; G.runners.push(n); const nm=snap(n); const c2=(${ctxOf})({field:[],support:[],net:[nm]}); const hp=nm.hp; iceHit(c2,nm,10);`);
  assert.equal(run('nm.hp===hp'),true);
  run(`n.cyber=[]; n.gear={body:'icehood'}; const gm=snap(n); const c3=(${ctxOf})({field:[],support:[],net:[gm]}); const hp3=gm.hp; iceHit(c3,gm,10);`);
  assert.equal(run('hp3-gm.hp'),5);
});

test('interludes play once each, at most one per night, in priority order',()=>{
  const run=game();
  run(`G.flags.anyCyber=true; G.memorial.push({name:'テツ',role:'solo',night:1,cause:'x',jobs:0}); const o1={story:[]}; interlude(o1); const o2={story:[]}; interlude(o2); const o3={story:[]}; interlude(o3);`);
  assert.deepEqual(run('JSON.stringify([o1.story,o2.story,o3.story])'),JSON.stringify([['firstCyber'],['firstDeath'],[]]));
  assert.equal(run(`Object.keys(INTERLUDES).every(k=>INTERLUDE_WHEN[k]&&INTERLUDES[k].title.startsWith('幕間　'))`),true);
});

test('nightly rumor is set and can reflect the fallen',()=>{
  const run=game(.1);
  run(`G.memorial.push({name:'ナギ',role:'solo',night:1,cause:'x',jobs:0}); World.nextNight();`);
  assert.equal(run('typeof G.rumor==="string" && G.rumor.length>0'),true);
});

test('new personal quests appear for loyal exclusive story runners and need them on the team',()=>{
  const run=game();
  run(`const s=makeStory('shigure'); G.runners.push(s); s.contract='exclusive'; s.loyalty=80; World.refreshBoard(); const j=G.board.find(j=>j.personal==='shigure');`);
  assert.equal(run('!!j && j.rival==="kurogane" && j.target===null'),true);
  assert.equal(run('validateTeam(j,{field:[G.runners[0].id],support:[],net:[]}).some(e=>e.includes("本人"))'),true);
});
