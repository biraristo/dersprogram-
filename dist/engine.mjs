export const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
export function problem(p){
 if(!p||!Number.isInteger(p.days)||p.days<1||p.days>7||!Number.isInteger(p.hours)||p.hours<1||p.hours>16||!Array.isArray(p.lessons)||!Array.isArray(p.closed))throw Error('Hafta veya veri biçimi geçersiz.');
 if(!p.lessons.length)throw Error('En az bir ders ataması girin.');
 const tasks=[],blocked=new Map(),load=new Map(),count=p.days*p.hours;
 const limits=p.daily??Array(p.days).fill(p.hours);
 if(!Array.isArray(limits)||limits.length!==p.days||limits.some(n=>!Number.isInteger(n)||n<0||n>p.hours))throw Error('Günlük ders sayıları geçersiz.');
 for(const c of p.closed){
  if(typeof c.resource!=='string'||!Number.isInteger(c.slot)||c.slot<0||c.slot>=count)throw Error('Kapalı saat haftanın dışında.');
  if(!blocked.has(c.resource))blocked.set(c.resource,new Set());
  blocked.get(c.resource).add(c.slot);
 }
 for(const [i,l] of p.lessons.entries()){
  if(!l.name?.trim()||![l.groups,l.teachers].every(a=>Array.isArray(a)&&a.length&&a.every(x=>typeof x==='string'&&x.trim()))||typeof l.room!=='string'||!Array.isArray(l.blocks)||!l.blocks.length)throw Error('Ders adı, şube, öğretmen ve blokları kontrol edin.');
  const resources=[...new Set([...l.groups.map(x=>'Şube · '+x),...l.teachers.map(x=>'Öğretmen · '+x),...(l.room?['Derslik · '+l.room]:[])])];
  for(const [j,len] of l.blocks.entries()){
   if(!Number.isInteger(len)||len<1||len>p.hours)throw Error(l.name+' için blok uzunluğu günlük saati aşıyor veya geçersiz.');
   for(const r of resources){
    if(!blocked.has(r))blocked.set(r,new Set());
    limits.forEach((limit,d)=>{for(let h=limit;h<p.hours;h++)blocked.get(r).add(d*p.hours+h)});
   }
   tasks.push({i,j,len,resources});for(const r of resources)load.set(r,(load.get(r)||0)+len);
  }
 }
 for(const [r,n] of load){const available=count-(blocked.get(r)?.size||0);if(n>available)throw Error(r+' için '+n+' saat gerekli, '+available+' saat uygun.');}
 return {tasks,blocked,count};
}
export function verify(p,starts){
 const {tasks,count,blocked}=problem(p),seen=new Set();
 if(!Array.isArray(starts)||starts.length!==tasks.length)throw Error('Eksik yerleşim.');
 tasks.forEach(({len,resources},k)=>{
  const s=starts[k];if(!Number.isInteger(s)||s<0||s+len>count||s%p.hours+len>p.hours)throw Error('Blok gün sınırını aşıyor.');
  for(let t=s;t<s+len;t++)for(const r of resources){const key=JSON.stringify([r,t]);if(seen.has(key)||blocked.get(r)?.has(t))throw Error(r+' için çakışma veya kapalı saat.');seen.add(key);}
 });return true;
}
export function solve(p,limit=8000){
 const {tasks,blocked,count}=problem(p),occupied=new Map(),starts=Array(tasks.length).fill(-1),end=Date.now()+limit;
 const candidates=tasks.map(({len,resources})=>Array.from({length:count},(_,i)=>i).filter(s=>s%p.hours+len<=p.hours&&resources.every(r=>Array.from({length:len},(_,k)=>s+k).every(t=>!blocked.get(r)?.has(t)))));
 for(const task of tasks)for(const r of task.resources)occupied.set(r,new Uint8Array(count));
 function search(n){
  if(n===tasks.length)return true;
  if(Date.now()>end)throw Error('Arama süresi doldu. Süreyi artırarak tekrar deneyin.');
  let best=-1,options;
  for(let i=0;i<tasks.length;i++)if(starts[i]<0){
   const {len,resources}=tasks[i];
   const free=candidates[i].filter(s=>resources.every(r=>!occupied.get(r).subarray(s,s+len).includes(1)));
   if(!free.length)return false;
   if(!options||free.length<options.length){best=i;options=free}
  }
  const task=tasks[best];
  const scored=options.map(s=>({s,score:Math.random()+starts.reduce((v,t,i)=>v+(t>=0&&tasks[i].i===task.i&&Math.floor(t/p.hours)===Math.floor(s/p.hours)?3:0),0)})).sort((a,b)=>a.score-b.score);
  for(const {s} of scored){
   starts[best]=s;for(const r of task.resources)occupied.get(r).fill(1,s,s+task.len);
   if(search(n+1))return true;
   for(const r of task.resources)occupied.get(r).fill(0,s,s+task.len);starts[best]=-1;
  }return false;
 }
 if(!search(0))throw Error('Bu ders yükleri ve kapalı saatlerle geçerli yerleşim bulunmuyor.');
 verify(p,starts);return starts;
}
