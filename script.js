const $=s=>document.querySelector(s);
const KEY='habit-tracker-v1';
const COLORS=['#2FB38A','#F2A71B','#E5584F','#4C7DF0','#9B6BE0','#17A2B8'];
const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const safeMatchMedia=q=>typeof window.matchMedia==='function'?window.matchMedia(q):{matches:false};
const safeConfirm=m=>typeof window.confirm==='function'?window.confirm(m):true;
const safeScrollIntoView=el=>{if(el&&typeof el.scrollIntoView==='function')el.scrollIntoView({behavior:'smooth',block:'start'});};

function normalizeHabit(h={}){
  const done=h.done&&typeof h.done==='object'&&!Array.isArray(h.done)?h.done:{};
  return {
    ...h,
    id:h.id||'h'+Date.now().toString(36),
    lib:h.lib||null,
    created:h.created||today(),
    done,
    name:String(h.name||'Untitled habit'),
    emoji:h.emoji||'✨',
    target:Number(h.target)||1,
    color:h.color||COLORS[0]
  };
}
function normalizeState(raw){
  const habits=(raw&&Array.isArray(raw.habits)?raw.habits:[]).map(normalizeHabit);
  return {habits,theme:raw&&typeof raw.theme==='string'?raw.theme:null,open:raw&&typeof raw.open==='string'?raw.open:null};
}
let S=load(), editId=null;

function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s)return normalizeState(s)}catch(e){}return{habits:[],theme:null,open:null}}
function save(){try{localStorage.setItem(KEY,JSON.stringify({habits:S.habits.map(normalizeHabit),theme:S.theme||null,open:S.open||null}))}catch(e){} }
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const today=()=>iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return iso(d)};
const weekStart=s=>addDays(s,-((new Date(s+'T00:00:00').getDay()+6)%7));
const dayDiff=(a,b)=>Math.round((new Date(a+'T00:00:00')-new Date(b+'T00:00:00'))/864e5);

function streak(h){let d=today();if(!h.done[d])d=addDays(d,-1);let n=0;while(h.done[d]){n++;d=addDays(d,-1)}return n}
function best(h){let b=0,c=0,p=null;for(const k of Object.keys(h.done).sort()){c=p&&addDays(p,1)===k?c+1:1;b=Math.max(b,c);p=k}return b}
function weekCount(h){const ws=weekStart(today());let n=0;for(let i=0;i<7;i++)if(h.done[addDays(ws,i)])n++;return n}

function applyTheme(){
  if(S.theme)document.documentElement.dataset.theme=S.theme;else delete document.documentElement.dataset.theme;
}
function setRing(p){const c=2*Math.PI*29;$('#arc').style.strokeDasharray=`${c*p} ${c}`;$('#pct').textContent=Math.round(p*100)+'%'}
function row(h){
  const t=today(), ws=weekStart(t), open=S.open===h.id, wc=weekCount(h), st=streak(h);
  const strip=DOW.map((n,i)=>{const d=addDays(ws,i),on=h.done[d];
    return `<button class="day${on?' on':''}" ${d>t?'disabled':''} data-a="toggle" data-id="${h.id}" data-d="${d}" aria-pressed="${!!on}" aria-label="${n}, ${d}">${n[0]}</button>`}).join('');
  let heat='';
  if(open){const start=addDays(ws,-77);
    heat=`<div class="heatwrap"><div class="heat" aria-label="Last 12 weeks">`+[...Array(84)].map((_,i)=>{const d=addDays(start,i);
      return d>t?'<i class="c f"></i>':`<i class="c${h.done[d]?' on':''}" title="${d}"></i>`}).join('')+`</div></div>`}
  return `<article class="habit" style="--c:${h.color}">
    <div class="top">
      <button class="check${h.done[t]?' on':''}" data-a="toggle" data-id="${h.id}" data-d="${t}" aria-pressed="${!!h.done[t]}" aria-label="Mark ${esc(h.name)} done today"></button>
      <div class="meta">
        <div class="name">${h.emoji} ${esc(h.name)}</div>
        <div class="sub"><b>${st}</b> day streak · best ${best(h)} · <b>${wc}/${h.target}</b> this week${wc>=h.target?' ✓':''}</div>
      </div>
      <div class="tools">
        <button data-a="open" data-id="${h.id}" aria-expanded="${open}">${open?'Hide history':'History'}</button>
        <button data-a="edit" data-id="${h.id}">Edit</button>
        <button data-a="del" data-id="${h.id}">Delete</button>
      </div>
    </div>
    <div class="strip">${strip}</div>${heat}
  </article>`;
}
function insights(hs){
  const t=today();let tot=0,hit=0,poss=0,bs=0;const wd=Array(7).fill(0);
  hs.forEach(h=>{
    const ks=Object.keys(h.done);tot+=ks.length;bs=Math.max(bs,best(h));
    const age=Math.max(1,Math.min(30,dayDiff(t,h.created)+1));poss+=age;
    for(let i=0;i<age;i++)if(h.done[addDays(t,-i)])hit++;
    ks.forEach(k=>wd[(new Date(k+'T00:00:00').getDay()+6)%7]++);
  });
  const rate=poss?Math.round(hit/poss*100):0, mx=Math.max(...wd);
  $('#stats').innerHTML=[['Total check-ins',tot],['Longest streak',bs+' days'],['Last 30 days',rate+'%'],['Habits',hs.length]]
    .map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#bars').innerHTML=wd.map((n,i)=>`<div><i style="height:${mx?n/mx*100:0}%" title="${n} check-ins"></i>${DOW[i][0]}</div>`).join('');
  $('#bars').hidden=!mx;
}
function render(){
  const hs=S.habits,t=today(),n=hs.filter(h=>h.done[t]).length;
  $('#date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  $('#sum').textContent=hs.length?`${n} of ${hs.length} done today`:'Nothing to track yet';
  const p=hs.length?n/hs.length:0;setRing(p);document.querySelector('.bg').style.setProperty('--p',p);
  $('#list').innerHTML=hs.length?hs.map(row).join(''):'<p class="empty">No habits yet. Add one above, or load sample data to see how it looks.</p>';
  insights(hs);
  $('#tips').innerHTML=tips(hs).map(x=>`<li>${x}</li>`).join('');
  $('#recs').innerHTML=recs(hs).map(libCard).join('');
  $('#lib').innerHTML=LIB.map(libCard).join('');
}

// animation: a small burst of dots from the element you tap
function burst(el,color,n=12){
  if(safeMatchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  for(let i=0;i<n;i++){const s=document.createElement('span'),a=i/n*Math.PI*2,d=34+Math.random()*30;
    s.className='sp';s.style.cssText=`left:${x-4}px;top:${y-4}px;background:${color};--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px`;
    document.body.appendChild(s);setTimeout(()=>s.remove(),750)}
}

// best-habit library, recommendations and tips
const LIB=[
{id:'water',emoji:'💧',name:'Drink a glass of water',cat:'Body',target:7,color:COLORS[3],why:'Even mild dehydration can lower focus and energy.',cue:'After I turn off my alarm, I drink one full glass before coffee.',ex:'Fill a glass and leave it on your nightstand before bed. Drink it first thing in the morning, then tap the check.',easy:'Start with half a glass and add a second one at lunch.'},
{id:'move',emoji:'🏃',name:'Move for 20 minutes',cat:'Body',target:5,color:COLORS[0],why:'Regular movement improves mood, sleep and heart health.',cue:'After dinner, I put on my shoes and walk around the block.',ex:'Walk for 20 minutes on Monday, Wednesday and Friday. Stretch for 10 minutes on Tuesday and Thursday. That covers a 5-day goal.',easy:'On a bad day, a 5-minute walk still counts and keeps your streak alive.'},
{id:'sleep',emoji:'💤',name:'In bed by 11 pm',cat:'Rest',target:6,color:COLORS[4],why:'A steady bedtime makes it easier to fall asleep and wake up.',cue:'When my 10:30 pm alarm rings, I plug my phone in across the room.',ex:'Label the alarm “Wind down”. Dim the lights, charge your phone out of reach, and read until you feel sleepy.',easy:'Move your bedtime 15 minutes earlier each week instead of all at once.'},
{id:'read',emoji:'📚',name:'Read 10 pages',cat:'Mind',target:5,color:COLORS[1],why:'Ten pages a day adds up to roughly 15 books a year.',cue:'After I get into bed, I read before I look at my phone.',ex:'Keep one book on your pillow. Read until you pass the bookmark by about ten pages, then tap the check.',easy:'Stuck? Read one page. Starting is the hard part.'},
{id:'meditate',emoji:'🧘',name:'Meditate for 5 minutes',cat:'Mind',target:5,color:COLORS[5],why:'A short daily practice lowers stress and builds attention.',cue:'After I brush my teeth, I sit down and breathe for 5 minutes.',ex:'Set a 5-minute timer. Count each breath from 1 to 10, then start over. When your mind wanders, go back to 1.',easy:'Begin with 1 minute and add a minute each week.'},
{id:'journal',emoji:'✍️',name:'Write 3 lines in a journal',cat:'Mind',target:7,color:COLORS[2],why:'Writing things down clears your head and shows patterns over time.',cue:'After I finish dinner, I write three lines before leaving the table.',ex:'Line 1: one good thing from today. Line 2: one thing that was hard. Line 3: your top priority for tomorrow.',easy:'No time? Write one sentence.'},
{id:'veg',emoji:'🥗',name:'Eat a fruit or vegetable',cat:'Food',target:7,color:COLORS[0],why:'One extra serving a day is an easy way to eat better without a diet.',cue:'When I sit down for lunch, I add one fruit or vegetable to the plate.',ex:'Keep washed carrots or an apple at the front of the fridge. Put it on your plate first, then tap the check.',easy:'Pick the same item all week so there is nothing to decide.'},
{id:'tidy',emoji:'🧹',name:'Tidy up for 10 minutes',cat:'Home',target:5,color:COLORS[1],why:'A small daily reset keeps clutter from piling up and lowers stress.',cue:'After I finish dinner, I set a 10-minute timer and tidy one area.',ex:'Monday: kitchen counter. Tuesday: desk. Wednesday: bathroom sink. Stop when the timer ends, even if you are not done.',easy:'Tidy only one surface, like your desk or bed.'}
];
const openLib=new Set();
document.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'&&d.dataset.id)d.open?openLib.add(d.dataset.id):openLib.delete(d.dataset.id)},true);
function libCard(l){
  const added=S.habits.some(h=>h.lib===l.id);
  return `<article class="lib" style="--c:${l.color}"><div class="libtop"><div><div class="name">${l.emoji} ${l.name}<span class="tag">${l.cat}</span></div><div class="sub">${l.why}</div></div>
  <button class="btn ghost" data-lib="${l.id}" ${added?'disabled':''}>${added?'Added':'Add'}</button></div>
  <details data-id="${l.id}"${openLib.has(l.id)?' open':''}><summary>How it works</summary><p><b>Cue:</b> ${l.cue}</p><p><b>Example:</b> ${l.ex}</p><p><b>If it feels hard:</b> ${l.easy}</p></details></article>`;
}
function recs(hs){
  const have=new Set(hs.map(h=>h.lib).filter(Boolean));
  const cats=new Set(hs.map(h=>(LIB.find(l=>l.id===h.lib)||{}).cat).filter(Boolean));
  return LIB.filter(l=>!have.has(l.id)).sort((a,b)=>(cats.has(a.cat)-cats.has(b.cat))||LIB.indexOf(a)-LIB.indexOf(b)).slice(0,3);
}
function tips(hs){
  const t=today(),out=[];
  if(!hs.length)return ['Start with one or two habits. Small wins build momentum faster than a long list.'];
  const hot=hs.filter(h=>streak(h)>=7).sort((a,b)=>streak(b)-streak(a))[0];
  if(hot)out.push(`<b>${esc(hot.name)}</b> has a ${streak(hot)}-day streak. Decide tomorrow’s trigger tonight so the chain keeps going.`);
  const hard=hs.map(h=>{const age=Math.max(1,Math.min(14,dayDiff(t,h.created)+1));let n=0;for(let i=0;i<age;i++)if(h.done[addDays(t,-i)])n++;return{h,age,r:n/age}}).filter(x=>x.age>=7).sort((a,b)=>a.r-b.r)[0];
  if(hard&&hard.r<.5)out.push(`<b>${esc(hard.h.name)}</b> is slipping. Shrink it to a two-minute version, or lower its weekly goal.`);
  const wd=Array(7).fill(0);let tot=0;
  hs.forEach(h=>Object.keys(h.done).forEach(k=>{wd[(new Date(k+'T00:00:00').getDay()+6)%7]++;tot++}));
  if(tot>=14)out.push(`${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][wd.indexOf(Math.min(...wd))]} is your weakest day. Plan an easier version for it.`);
  if(hs.every(h=>h.done[t]))out.push('Everything is done today. Rest and enjoy it.');
  if(!out.length)out.push('Link each habit to something you already do, like “after I pour coffee, I…”. A cue beats willpower.');
  return out.slice(0,3);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-lib]');if(!b||b.disabled)return;
  const l=LIB.find(x=>x.id===b.dataset.lib);if(!l)return;
  S.habits.push({id:'h'+Date.now().toString(36),lib:l.id,created:today(),done:{},name:l.name,emoji:l.emoji,target:l.target,color:l.color});
  save();render();toast(`Added “${l.name}”`);
});

// form
$('#swatches').innerHTML=COLORS.map((c,i)=>`<label><input type="radio" name="color" value="${c}" ${i?'':'checked'} aria-label="Color ${i+1}"><span style="--c:${c}"></span></label>`).join('');
function resetForm(){editId=null;$('#form').reset();$('#formtitle').textContent='Add a habit';$('#save').textContent='Add habit';$('#cancel').hidden=true}
$('#form').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('#name').value.trim();if(!name)return;
  const data={name,emoji:$('#emoji').value,target:+$('#target').value,color:document.querySelector('input[name=color]:checked').value};
  if(editId){Object.assign(S.habits.find(h=>h.id===editId),data);toast('Changes saved')}
  else{S.habits.push({id:'h'+Date.now().toString(36),created:today(),done:{},...data});toast('Habit added')}
  save();resetForm();render();
});
$('#cancel').onclick=resetForm;

// list actions
$('#list').addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const h=S.habits.find(x=>x.id===b.dataset.id);if(!h)return;
  const a=b.dataset.a;
  if(a==='toggle'){const d=b.dataset.d,all=()=>S.habits.length&&S.habits.every(x=>x.done[today()]),was=all();
    if(h.done[d])delete h.done[d];else{h.done[d]=1;burst(b,h.color)}
    save();render();if(!was&&all()){burst($('#ring'),'#4C7DF0',18);toast('All done for today 🎉')}}
  else if(a==='open'){S.open=S.open===h.id?null:h.id;save();render()}
  else if(a==='edit'){editId=h.id;$('#name').value=h.name;$('#emoji').value=h.emoji;$('#target').value=h.target;
    document.querySelector(`input[name="color"][value="${h.color}"]`).checked=true;
    $('#formtitle').textContent='Edit habit';$('#save').textContent='Save changes';$('#cancel').hidden=false;
    safeScrollIntoView($('#form'));$('#name').focus()}
  else if(a==='del'&&safeConfirm(`Delete “${h.name}” and its history?`)){S.habits=S.habits.filter(x=>x!==h);save();render();toast('Habit deleted')}
});

// footer
$('#theme').onclick=()=>{
  const dark=document.documentElement.dataset.theme==='dark'||(!S.theme&&safeMatchMedia('(prefers-color-scheme:dark)').matches);
  S.theme=dark?'light':'dark';save();applyTheme();
};
$('#export').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));
  a.download='habit-backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href);
};
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  f.text().then(t=>{
    const d=JSON.parse(t);
    if(!d||!Array.isArray(d.habits))throw 0;
    S=normalizeState({habits:d.habits,theme:d.theme||null,open:null});
    save();applyTheme();render();toast('Backup restored');
  }).catch(()=>toast('That file isn’t a valid backup'));
  e.target.value='';
};
$('#sample').onclick=()=>{
  if(S.habits.length&&!safeConfirm('Add sample habits to your list?'))return;
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  [['💧','Drink 8 glasses of water',7,COLORS[3],.8],['📚','Read 20 pages',5,COLORS[1],.6],['🏃','Go for a run',3,COLORS[0],.45]].forEach(([emoji,name,target,color,p],i)=>{
    const done={};for(let k=0;k<70;k++)if(rnd()<p)done[addDays(today(),-k)]=1;
    S.habits.push({id:'s'+i+Date.now().toString(36),created:addDays(today(),-70),emoji,name,target,color,done});
  });
  save();render();toast('Sample data added');
};
$('#reset').onclick=()=>{if(safeConfirm('Delete all habits and history? This cannot be undone.')){S.habits=[];S.open=null;save();render()}};

applyTheme();render();