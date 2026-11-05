import {days,problem,verify} from './engine.mjs';
const $=s=>document.querySelector(s),key='ders-atolyesi-v1';
const split=s=>[...new Set(s.split(',').map(x=>x.trim()).filter(Boolean))];
function sample(){
 const lessons=[];
 for(const group of ['9/A','9/B'])for(const [name,teacher,blocks,room] of [
 ['Matematik','Ayşe',[2,1,1,1],''],['Edebiyat','Can',[2,1,1,1],''],['İngilizce','Ece',[1,1,1],''],['Fizik','Derya',[2],'Laboratuvar'],['Tarih','Ali',[1,1],''],['Spor','Efe',[2],'Spor salonu']])
 lessons.push({name,teachers:[teacher],groups:[group],blocks,room});
 lessons.push({name:'Müzik',teachers:['Selin'],groups:['9/A','9/B'],blocks:[1],room:'Müzik odası'});
 return {school:'Örnek Anadolu Lisesi',days:5,hours:4,lessons,closed:[],starts:null};
}
let p=sample(),edit=-1,worker=null,revision=null;
function note(s){$('#notice').textContent=s}
function validate(x){if(!x||typeof x.school!=='string'||!x.school.trim()||!Array.isArray(x.lessons)||!Array.isArray(x.closed))throw Error('Geçersiz okul dosyası.');
 // Capacity errors are valid editable configurations.
 try{problem({...x,lessons:x.lessons.length?x.lessons:[{name:'Kontrol',groups:['—'],teachers:['—'],room:'',blocks:[1]}]})}catch(e){if(!e.message.includes('saat gerekli'))throw e}
 if(x.starts!=null)verify(x,x.starts);return x}
let busy=false;
async function save(next,message){
 if(busy)return;busy=true;
 try{validate(next);
 if(revision!==null){const r=await fetch('/api/school',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':String(revision)},body:JSON.stringify(next)});if(!r.ok)throw Error(r.status===409?'Başka bir oturum kaydetti. Sayfayı yenileyin.':'Sunucu kaydedemedi.');revision=(await r.json()).revision}
 else localStorage.setItem(key,JSON.stringify(next));
 p=next;worker?.terminate();worker=null;render();note(message);
 }catch(e){note(e.message)}finally{busy=false}
}
function change(f){const next=structuredClone(p);next.starts=null;f(next);save(next,'Değişiklikler kaydedildi. Güncel çizelge için programı oluşturun.')}
function resources(){return [...new Set(p.lessons.flatMap(l=>[...l.groups.map(x=>'Şube · '+x),...l.teachers.map(x=>'Öğretmen · '+x),...(l.room?['Derslik · '+l.room]:[])]))].sort((a,b)=>a.localeCompare(b,'tr'))}
function options(el,values){const old=el.value;el.replaceChildren(...values.map(v=>new Option(v,v)));if(values.includes(old))el.value=old}
function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;return b}
function table(el,headers){el.replaceChildren();const tr=el.createTHead().insertRow();for(const h of headers){const th=document.createElement('th');th.textContent=h;tr.append(th)}return el.createTBody()}
function grid(){
 const body=table($('#grid'),['Saat',...days.slice(0,p.days)]);
 const cells=Array(p.hours*p.days).fill(null);
 if(p.starts){const {tasks}=problem(p);tasks.forEach((task,i)=>{if(task.resources.includes($('#view').value))for(let k=0;k<task.len;k++)cells[p.starts[i]+k]=p.lessons[task.i]})}
 for(let h=0;h<p.hours;h++){const row=body.insertRow();row.insertCell().textContent=h+1;for(let d=0;d<p.days;d++){const cell=row.insertCell(),t=d*p.hours+h,l=cells[t];cell.textContent=l?l.name:p.closed.some(c=>c.slot===t&&c.resource===$('#view').value)?'Kapalı':'—';if(l){const sub=document.createElement('span');sub.textContent=[l.groups.join(', '),l.teachers.join(', '),l.room].filter(Boolean).join(' · ');cell.append(sub)}}}
}
function render(){
 $('#title').textContent=p.school;$('#generate').textContent=worker?'Aramayı durdur':'Programı oluştur';
 const f=$('#settings').elements;for(const k of ['school','days','hours'])f[k].value=p[k];
 options($('#view'),resources());options($('#closure').elements.res,resources());options($('#closure').elements.day,days.slice(0,p.days));options($('#closure').elements.hour,['Tüm gün',...Array.from({length:p.hours},(_,i)=>String(i+1))]);
 const body=table($('#list'),['Ders','Şube','Öğretmen','Derslik','Bloklar','İşlem']);
 p.lessons.forEach((l,i)=>{const tr=body.insertRow();for(const v of [l.name,l.groups.join(', '),l.teachers.join(', '),l.room,l.blocks.join('+')])tr.insertCell().textContent=v;const cell=tr.insertCell();cell.append(button('Düzenle',()=>{edit=i;const e=$('#lesson').elements;for(const k of ['name','room','groups','teachers','blocks'])e[k].value=Array.isArray(l[k])?l[k].join(k==='blocks'?'+':', '):l[k];e.name.focus()}),button('Sil',()=>{if(confirm(l.name+' ataması silinsin mi?')){edit=-1;$('#lesson').reset();change(x=>x.lessons.splice(i,1))}}))});
 $('#closed').replaceChildren(...p.closed.map((c,i)=>button(c.resource+' · '+days[Math.floor(c.slot/p.hours)]+' '+(c.slot%p.hours+1)+'. saat ×',()=>change(x=>x.closed.splice(i,1)))));
 $('#csv').disabled=$('#print').disabled=!p.starts;grid()
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.tab);document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b))});
$('#view').onchange=grid;
$('#lesson').onreset=()=>edit=-1;
$('#lesson').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),l={name:f.get('name').trim(),room:f.get('room').trim(),groups:split(f.get('groups')),teachers:split(f.get('teachers')),blocks:f.get('blocks').split('+').map(Number)};const i=edit;change(x=>i<0?x.lessons.push(l):x.lessons[i]=l);e.target.reset()};
$('#settings').onsubmit=e=>{e.preventDefault();const f=e.target.elements,d=+f.days.value,h=+f.hours.value;if(p.closed.some(c=>Math.floor(c.slot/p.hours)>=d||c.slot%p.hours>=h))return note('Haftayı küçültmeden önce sınır dışında kalan kapalı saatleri kaldırın.');change(x=>{x.closed.forEach(c=>c.slot=Math.floor(c.slot/p.hours)*h+c.slot%p.hours);Object.assign(x,{school:f.school.value.trim(),days:d,hours:h})})};
$('#closure').onsubmit=e=>{e.preventDefault();const f=e.target.elements;if(!f.res.value)return;change(x=>{for(let h=0;h<p.hours;h++)if(!f.hour.selectedIndex||h===f.hour.selectedIndex-1){const slot=f.day.selectedIndex*p.hours+h;if(!x.closed.some(c=>c.slot===slot&&c.resource===f.res.value))x.closed.push({resource:f.res.value,slot})}})};
$('#generate').onclick=()=>{if(worker){worker.terminate();worker=null;render();return note('Arama durduruldu.')}worker=new Worker('worker.mjs',{type:'module'});render();note('Kurallara uygun yerleşim aranıyor…');worker.onmessage=({data})=>{worker.terminate();worker=null;render();if(data.error)return note(data.error);try{verify(p,data.starts);save({...p,starts:data.starts},'Çizelge doğrulandı ve kaydedildi.')}catch(e){note(e.message)}};worker.onerror=()=>{worker?.terminate();worker=null;render();note('Planlama motoru başlatılamadı.')};worker.postMessage({p,limit:+$('#limit').value})};
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#backup').onclick=()=>download('okul-yedegi.json',JSON.stringify(p,null,2),'application/json');
$('#restore').onchange=async e=>{try{const file=e.target.files[0];if(file&&confirm('Mevcut okul verisi yedekle değiştirilsin mi?')){const x=validate(JSON.parse(await file.text()));edit=-1;$('#lesson').reset();await save(x,'Yedek geri yüklendi.')}}catch(err){note(err.message)}e.target.value=''};
$('#csv').onclick=()=>{const quote=s=>'"'+(/^[=+@-]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';download('ders-programi.csv','\ufeff'+[...$('#grid').rows].map(r=>[...r.cells].map(c=>quote(c.innerText.replaceAll('\n',' · '))).join(';')).join('\r\n'),'text/csv;charset=utf-8')};
$('#print').onclick=()=>window.print();
async function init(){
 try{
 const server=document.querySelector('meta[name=school-server]');
 if(server){const r=await fetch('/api/school');if(!r.ok)throw Error('Okul kaydı okunamadı.');const data=await r.json();revision=data.revision;if(data.school)p=validate(data.school)}
 else{const stored=localStorage.getItem(key);if(stored)p=validate(JSON.parse(stored))}
 $('#storage').textContent=server?'Veriler bu sunucunun SQLite veritabanına kaydedilir.':'Veriler bu tarayıcıda saklanır. Başka bir cihaza taşımak için yedek indirin.';
 render();document.querySelector('nav button').click();note(p.starts?'Kayıtlı çizelge yeniden doğrulandı.':'Ders atamalarını düzenleyin veya mevcut atamalarla programı oluşturun.');
 }catch(e){note('Çalışma alanı açılamadı: '+e.message);document.querySelectorAll('button').forEach(b=>b.disabled=true)}
}
init();
