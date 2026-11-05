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
 for(let h=0;h<p.hours;h++){const row=body.insertRow();row.insertCell().textContent=h+1;for(let d=0;d<p.days;d++){const cell=row.insertCell(),t=d*p.hours+h,l=cells[t];cell.textContent=l?l.name:h>=(p.daily?.[d]??p.hours)?'Kapalı':p.closed.some(c=>c.slot===t&&c.resource===$('#view').value)?'Kapalı':'—';if(l){cell.dataset.tone=String([...l.name].reduce((n,c)=>n+c.codePointAt(0),0)%6);const sub=document.createElement('span');sub.textContent=[l.groups.join(', '),l.teachers.join(', '),l.room].filter(Boolean).join(' · ');cell.append(sub)}}}
}
function render(){
 $('#title').textContent=p.school;$('#summary').textContent=[new Set(p.lessons.flatMap(l=>l.groups)).size+' şube',new Set(p.lessons.flatMap(l=>l.teachers)).size+' öğretmen',p.days+' günlük hafta'].join('   ·   ');$('#generate').textContent=worker?'Aramayı durdur':'Programı oluştur';
 const f=$('#settings').elements;for(const k of ['school','days','hours'])f[k].value=p[k];
 const ordered=resources();options($('#view'),[...ordered.filter(r=>r.startsWith('Şube · ')),...ordered.filter(r=>!r.startsWith('Şube · '))]);options($('#closure').elements.res,resources());options($('#closure').elements.day,days.slice(0,p.days));options($('#closure').elements.hour,['Tüm gün',...Array.from({length:p.hours},(_,i)=>String(i+1))]);
 const body=table($('#list'),['Ders','Şube','Öğretmen','Derslik','Bloklar','İşlem']);
 p.lessons.forEach((l,i)=>{const tr=body.insertRow();for(const v of [l.name,l.groups.join(', '),l.teachers.join(', '),l.room,l.blocks.join('+')])tr.insertCell().textContent=v;const cell=tr.insertCell();cell.append(button('Düzenle',()=>{edit=i;const e=$('#lesson').elements;for(const k of ['name','room','groups','teachers','blocks'])e[k].value=Array.isArray(l[k])?l[k].join(k==='blocks'?'+':', '):l[k];e.name.focus()}),button('Sil',()=>{if(confirm(l.name+' ataması silinsin mi?')){edit=-1;$('#lesson').reset();change(x=>x.lessons.splice(i,1))}}))});
 $('#closed').replaceChildren(...p.closed.map((c,i)=>button(c.resource+' · '+days[Math.floor(c.slot/p.hours)]+' '+(c.slot%p.hours+1)+'. saat ×',()=>change(x=>x.closed.splice(i,1)))));
 $('#csv').disabled=$('#print').disabled=!p.starts;grid();if(activeModule&&!$('#detail').hidden)showModule(activeModule)
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.tab);document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b))});
$('#view').onchange=grid;
$('#lesson').onreset=()=>edit=-1;
$('#lesson').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),l={name:f.get('name').trim(),room:f.get('room').trim(),groups:split(f.get('groups')),teachers:split(f.get('teachers')),blocks:f.get('blocks').split('+').map(Number)};const i=edit;change(x=>i<0?x.lessons.push(l):x.lessons[i]=l);e.target.reset()};
$('#settings').onsubmit=e=>{e.preventDefault();const f=e.target.elements,d=+f.days.value,h=+f.hours.value;if(p.closed.some(c=>Math.floor(c.slot/p.hours)>=d||c.slot%p.hours>=h))return note('Haftayı küçültmeden önce sınır dışında kalan kapalı saatleri kaldırın.');change(x=>{x.closed.forEach(c=>c.slot=Math.floor(c.slot/p.hours)*h+c.slot%p.hours);if(x.daily)x.daily=Array.from({length:d},(_,i)=>Math.min(h,x.daily[i]??h));Object.assign(x,{school:f.school.value.trim(),days:d,hours:h})})};
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

const areas=[
 ['Tanımlar',[['name','Dersler','▤'],['groups','Sınıflar','▦'],['room','Derslikler','⌂'],['teachers','Öğretmenler','♙'],['daily','Günlük ders sayıları','◴']]],
 ['Dağıtım ve çizelgeler',[['loads','Sınıflarda okutulan dersler','≡'],['assign','Öğretmenlere ders ataması','⇄'],['teacherPlan','Öğretmen programları','▥'],['classPlan','Sınıf programları','▦'],['roomPlan','Derslik programları','▧'],['generate','Yeni tablo oluştur','↻']]],
 ['Okul işlemleri',[['duty','Nöbet çizelgesi','◷'],['extra','Ek ders saat hesabı','∑'],['board','Bilgi panosu','▣'],['backup','Yedekleme','↓']]]
];
let activeModule='';
const prefixes={groups:'Şube',teachers:'Öğretmen',room:'Derslik'};
function names(field){return [...new Set([...(p.catalog?.[field]??[]),...p.lessons.flatMap(l=>[l[field]].flat()).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'tr'))}
function element(tag,text){const el=document.createElement(tag);el.textContent=text??'';return el}
function picker(values){const el=element('select');options(el,values);return el}
function field(label,input){const box=element('label',label);box.append(input);return box}
function record(fn){const next=structuredClone(p);fn(next);save(next,'Kaydedildi.')}
function entries(host,headers,rows){const wrap=element('div');wrap.className='scroll';const t=element('table');wrap.append(t);host.append(wrap);const body=table(t,headers);for(const values of rows){const row=body.insertRow();for(const v of values){const cell=row.insertCell();if(v instanceof Node)cell.append(v);else cell.textContent=v}}}
function catalog(host,k){
 const input=element('input');input.required=true;const form=element('form');form.append(field('Yeni kayıt adı',input),element('button','Kayıt ekle'));host.append(form);
 form.onsubmit=e=>{e.preventDefault();const n=input.value.trim();if(!n||names(k).includes(n))return note('Farklı bir ad girin.');record(x=>{x.catalog??={};(x.catalog[k]??=[]).push(n)})};
 entries(host,['Ad','Atama','Haftalık saat','İşlem'],names(k).map(n=>{
 const linked=p.lessons.filter(l=>[l[k]].flat().includes(n));const del=button('Sil',()=>record(x=>{x.catalog[k]=x.catalog[k].filter(v=>v!==n)}));del.disabled=linked.length>0||(k==='teachers'&&(p.duties??[]).some(d=>d.teacher===n));return [n,linked.length,linked.reduce((sum,l)=>sum+l.blocks.reduce((a,b)=>a+b,0),0),del]}));
}
function workTable(host,k){
 const isClass=k==='loads',key=isClass?'groups':'teachers',sel=picker(names(key));host.append(field(isClass?'Sınıf seç':'Öğretmen seç',sel));const output=element('div');host.append(output);
 const redraw=()=>{output.replaceChildren();entries(output,['Ders','Şube','Öğretmen','Derslik','Saat dağılımı',''],p.lessons.flatMap((l,i)=>l[key].includes(sel.value)?[[l.name,l.groups.join(', '),l.teachers.join(', '),l.room||'—',l.blocks.join('+'),button('Düzenle',()=>{document.querySelector('[data-tab=assignments]').click();$('#list').tBodies[0].rows[i].querySelector('button').click()})]]:[]))};
 sel.onchange=redraw;redraw();host.append(button('Yeni ders ataması',()=>{document.querySelector('[data-tab=assignments]').click();$('#lesson').reset();$('#lesson').elements[key].value=sel.value;$('#lesson').elements.name.focus()}));
}
function showModule(k){
 activeModule=k;const info=areas.flatMap(a=>a[1]).find(m=>m[0]===k);
 if(k==='generate'){document.querySelector('[data-tab=schedule]').click();$('#generate').click();return}
 if(['teacherPlan','classPlan','roomPlan'].includes(k)){
 document.querySelector('[data-tab=schedule]').click();const key={teacherPlan:'teachers',classPlan:'groups',roomPlan:'room'}[k];options($('#view'),names(key).map(n=>prefixes[key]+' · '+n));grid();return}
 document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='detail');$('#module-title').textContent=info[1];const host=$('#module-body');host.replaceChildren();
 if(k==='backup'){
  host.append(element('p','Okul tanımları, ders atamaları, nöbetler, duyurular ve kayıtlı çizelge aynı yedekte saklanır.'),button('Okul yedeğini indir',()=>$('#backup').click()),button('Dosyadan geri yükle',()=>$('#restore').click()),element('p',$('#storage').textContent));return
 }
 if(['name','groups','room','teachers'].includes(k))return catalog(host,k);
 if(['loads','assign'].includes(k))return workTable(host,k);
 if(k==='daily'){const f=element('form'),inputs=[];days.slice(0,p.days).forEach((day,i)=>{const n=element('input');Object.assign(n,{type:'number',min:0,max:p.hours,required:true,value:p.daily?.[i]??p.hours});inputs.push(n);f.append(field(day,n))});f.append(element('button','Günlük saatleri kaydet'));f.onsubmit=e=>{e.preventDefault();change(x=>x.daily=inputs.map(n=>+n.value))};host.append(f);return}
 if(k==='board'){const f=element('form'),input=element('input');input.required=true;f.append(field('Duyuru',input),element('button','Panoya ekle'));host.append(f);f.onsubmit=e=>{e.preventDefault();if(input.value.trim())record(x=>(x.posts??=[]).unshift({text:input.value.trim(),date:new Date().toLocaleDateString('tr-TR')}))};entries(host,['Tarih','Duyuru',''],(p.posts??[]).map((v,i)=>[v.date,v.text,button('Kaldır',()=>record(x=>x.posts.splice(i,1)))]));return}
 if(k==='duty'){const f=element('form'),t=picker(names('teachers')),day=picker(days.slice(0,p.days)),place=element('input');place.required=true;f.append(field('Öğretmen',t),field('Gün',day),field('Nöbet yeri',place),element('button','Nöbet ata'));host.append(f);f.onsubmit=e=>{e.preventDefault();if(!t.value||!place.value.trim())return;if((p.duties??[]).some(v=>v.day===day.value&&v.teacher===t.value))return note('Bu öğretmenin aynı gün nöbeti var.');record(x=>(x.duties??=[]).push({teacher:t.value,day:day.value,place:place.value.trim()}))};entries(host,['Gün','Yer','Öğretmen',''],(p.duties??[]).map((v,i)=>[v.day,v.place,v.teacher,button('Kaldır',()=>record(x=>x.duties.splice(i,1)))]));return}
 if(k==='extra'){host.append(element('p','Atanan haftalık ders yükünden girdiğiniz zorunlu saat düşülür. Fiilî devam, istisnalar ve bordro bu tahmine dahil değildir.'));const list=element('div');host.append(list);entries(list,['Öğretmen','Atanan saat','Zorunlu saat','Tahmini ek saat'],names('teachers').map(n=>{const total=p.lessons.filter(l=>l.teachers.includes(n)).reduce((v,l)=>v+l.blocks.reduce((a,b)=>a+b,0),0);const input=element('input');Object.assign(input,{type:'number',min:0,max:112,value:p.thresholds?.[n]??''});input.setAttribute('aria-label',n+' zorunlu saat');input.onchange=()=>{if(input.value!==''&&input.checkValidity())record(x=>{x.thresholds={...x.thresholds,[n]:+input.value}})};return [n,total,input,p.thresholds?.[n]==null?'—':Math.max(0,total-p.thresholds[n])] }))}
}
for(const [group,items] of areas){const h=element('h3',group),box=element('div');box.className='module-grid';$('#modules').append(h,box);for(const [k,label,icon] of items){const b=button('',()=>showModule(k));const mark=element('i',icon);mark.setAttribute('aria-hidden','true');b.append(mark,element('strong',label));box.append(b)}}
$('#back').onclick=()=>document.querySelector('[data-tab=home]').click();
document.querySelector('[data-tab=schedule]').addEventListener('click',()=>{options($('#view'),resources());grid()});
for(const k of ['name','groups','teachers','room']){const list=element('datalist');list.id='options-'+k;$('#lesson').append(list);const input=$('#lesson').elements[k];input.setAttribute('list',list.id);input.onfocus=()=>options(list,names(k))}
init();
