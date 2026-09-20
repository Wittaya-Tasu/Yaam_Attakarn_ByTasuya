import { calculateCalendar } from './js/calendar-engine.js';
import { calculateNineBases, HOUSE_NAMES } from './js/chart-engine.js';
import { yamAt, yamTable, taksaFor, markerFor } from './js/kala-engine.js';
import { buildRelationColumns } from './js/relation-engine.js';
import { HOUSE_MEANINGS } from './js/house-meanings.js';

const TAKSA_GRID=[[1,2,3],[6,null,4],[8,5,7]];
const SUB_NAMES=['ต้น','กลาง','ปลาย'];
const DOW=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function bangkokNowParts(){
  const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const p=Object.fromEntries(f.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {day:Number(p.day),month:Number(p.month),yearBe:Number(p.year)+543,time:`${p.hour}:${p.minute}`};
}
function fmtBe(i){return `${String(i.day).padStart(2,'0')}/${String(i.month).padStart(2,'0')}/${i.yearBe} ${i.time}`}
function escapeHtml(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function keyOf(b,c){return `${b}:${c}`}
function inMeaning(item,b,c){return !!item?.keys?.includes(keyOf(b,c))}
function shouldMarker(base){return [1,2,3,4,8,9].includes(base)}

export function mountKalaChataTab(root, options={}){
  if(!root) throw new Error('ต้องระบุ root element สำหรับกาลชะตา');
  const state={live:true,input:bangkokNowParts(),model:null,chosenYam:null,selectedMeaning:null,error:null,exporting:false,timer:null};
  root.classList.add('kc-root');
  root.innerHTML=`
    <section class="kc-card kc-no-export">
      <h2 class="kc-title">กาลชะตา</h2>
      <div class="kc-subtitle">คำนวณแผนผัง 7 ตัว 9 ฐาน + ยามอัฐกาล + ทักษา โดยแยก state ออกจากระบบดูยามเดิม</div>
      <div class="kc-toolbar">
        <div class="kc-field"><label>วันที่</label><input data-kc="date" type="date"></div>
        <div class="kc-field"><label>เวลา</label><input data-kc="time" type="time" step="60"></div>
        <div class="kc-actions">
          <button class="kc-btn primary" data-kc="apply">คำนวณ</button>
          <button class="kc-btn" data-kc="now">กลับเวลาปัจจุบัน</button>
          <span class="kc-live" data-kc="live"><span class="kc-live-dot"></span><span data-kc="liveText">Live</span></span>
        </div>
      </div><div class="kc-error" data-kc="error"></div>
    </section>
    <section class="kc-card"><div class="kc-summary" data-kc="summary"></div></section>
    <section class="kc-capture" data-kc="capture">
      <section class="kc-card"><div class="kc-capture-meta" data-kc="captureMeta"></div>
        <div class="kc-layout">
          <div><h3 class="kc-section-title">แผนผัง 7 ตัว 9 ฐาน</h3><div class="kc-scroll" data-kc="chart"></div></div>
          <div class="kc-side">
            <div><h3 class="kc-section-title">ยามอัฐกาล</h3><div class="kc-yam-grid" data-kc="yam"></div><div class="kc-manual-note" data-kc="manual"></div></div>
            <div style="margin-top:12px"><h3 class="kc-section-title">ทักษา</h3><div class="kc-taksa" data-kc="taksa"></div></div>
            <div class="kc-selected-meaning" data-kc="selected" style="display:none;margin-top:12px"></div>
          </div>
        </div>
      </section>
    </section>
    <section class="kc-card kc-meanings-card">
      <h3 class="kc-section-title">ความหมายตามภพ</h3>
      <div class="kc-actions" style="margin-bottom:8px"><button class="kc-btn" data-kc="clearMeaning">ล้างการเลือก</button></div>
      <div class="kc-meanings-wrap" data-kc="meanings"></div>
    </section>
    <section class="kc-card kc-no-export"><div class="kc-export-actions"><button class="kc-btn" data-kc="png">บันทึก PNG</button><button class="kc-btn" data-kc="pdf">บันทึก PDF</button></div></section>`;

  const $=n=>root.querySelector(`[data-kc="${n}"]`);
  function setInputs(i){const ce=i.yearBe-543;$('date').value=`${String(ce).padStart(4,'0')}-${String(i.month).padStart(2,'0')}-${String(i.day).padStart(2,'0')}`;$('time').value=i.time;}
  function readInputs(){const [y,m,d]=$('date').value.split('-').map(Number);return {day:d,month:m,yearBe:y+543,time:$('time').value};}
  function currentActive(){return state.chosenYam??state.model?.yam}
  async function calculate(input,{keepMeaning=true}={}){
    try{
      state.error=null;state.input=input;
      // V1.15: 06:00 must use previous effective date while actual minute is retained for yam.
      const calInput={...input,time:input.time==='06:00'?'05:59':input.time};
      const calendar=await calculateCalendar(calInput, options.datasetUrl||'./data/lunar-month-boundaries.json');
      const day=calendar.seeds.day;
      state.model={input,calendar,chart:calculateNineBases(day,calendar.seeds.month,calendar.seeds.zodiac),yam:yamAt(day,input.time),table:yamTable(day),taksa:taksaFor(day)};
      state.chosenYam=null;if(!keepMeaning)state.selectedMeaning=null;render();
    }catch(e){state.model=null;state.error=e?.message||String(e);render();}
  }
  function render(){
    $('live').classList.toggle('is-live',state.live);$('liveText').textContent=state.live?'Live — อัปเดตทุก 60 วินาที':'หยุด Live';
    const err=$('error');err.textContent=state.error||'';err.classList.toggle('show',!!state.error);
    ['png','pdf'].forEach(k=>$(k).disabled=!!state.error||!state.model);
    if(!state.model){$('summary').innerHTML='';$('chart').innerHTML='';$('yam').innerHTML='';$('taksa').innerHTML='';return}
    const {calendar,chart,taksa}=state.model, active=currentActive();
    $('summary').innerHTML=[`วันที่พิจารณา ${fmtBe(state.input)}`,`วันยาม ${calendar.weekday.name}`,`รหัส ${calendar.seeds.day}-${calendar.seeds.month}-${calendar.seeds.zodiac}`,`ยาม ${active.number} ${active.period==='day'?'กลางวัน':'กลางคืน'}`,state.chosenYam?'เลือกยามด้วยตนเอง':`ยาม${SUB_NAMES[active.subperiod]}`].map(x=>`<span class="kc-pill">${escapeHtml(x)}</span>`).join('');
    $('captureMeta').textContent=`${fmtBe(state.input)} • effectiveDate ${calendar.effectiveDate} • ${calendar.weekday.name} • รหัส ${calendar.seeds.day}-${calendar.seeds.month}-${calendar.seeds.zodiac} • ยาม ${active.number} ${active.period==='day'?'กลางวัน':'กลางคืน'}${state.chosenYam?' (เลือกเอง)':` • ${SUB_NAMES[active.subperiod]}`}`;
    renderChart(chart,taksa,active);renderYam();renderTaksa(taksa);renderSelected();
  }
  function renderChart(chart,taksa,active){
    const rels=buildRelationColumns(chart); const base3=chart.bases[2]; const yamCol=base3.indexOf(active.number)+1;
    let h='<table class="kc-chart"><thead><tr><th>ฐาน</th>'+Array.from({length:7},(_,i)=>`<th>ช่อง ${i+1}</th>`).join('')+'</tr></thead><tbody>';
    chart.bases.forEach((vals,bi)=>{const base=bi+1;h+=`<tr><th class="kc-base-label">ฐาน ${base}</th>`;vals.forEach((v,ci)=>{const col=ci+1;const house=HOUSE_NAMES[base]?.[ci]||'';const hit=base===4?col===yamCol:v===active.number;const marker=shouldMarker(base)?markerFor(base,col,v,taksa):{kind:null,ring:false};const meaningful=inMeaning(state.selectedMeaning,base,col);const dot=!state.chosenYam && base===active.subperiod+1 && v===active.number;const base4name=base===4?chart.base4Names[ci]||'':'';const rel=base===3?rels[ci].relations.map(r=>r.name).join(' · '):'';h+=`<td class="${hit?'kc-yam-hit ':''}${[5,6,7].includes(base)?'kc-small':''}">${house?`<span class="kc-house">${escapeHtml(house)}</span>`:'<span class="kc-house"></span>'}${marker.kind?`<span class="kc-marker ${marker.kind}"></span>${marker.ring?`<span class="kc-ring ${marker.kind}"></span>`:''}`:''}${meaningful?'<span class="kc-meaning-ring"></span>':''}${dot?'<span class="kc-subdot"></span>':''}<span class="kc-num">${v}</span>${base4name?`<span class="kc-base4-name">${escapeHtml(base4name)}</span>`:''}${rel?`<div class="kc-rel">${escapeHtml(rel)}</div>`:''}</td>`});h+='</tr>'});h+='</tbody></table>';$('chart').innerHTML=h;
  }
  function renderYam(){const active=currentActive();const names=['กลางวัน','กลางคืน'];$('yam').innerHTML=state.model.table.map((rows,pi)=>`<div class="kc-yam-period"><h4>${names[pi]}</h4>${rows.map(r=>`<div class="kc-yam-row ${r.period===active.period&&r.slot===active.slot?'active':''}" data-yam-period="${r.period}" data-yam-slot="${r.slot}" role="button" tabindex="0"><span class="kc-yam-time">${r.range}</span><span class="kc-yam-number">${r.number}</span></div>`).join('')}</div>`).join('');$('manual').textContent=state.chosenYam?'กำลังดูยามที่เลือกเอง: จุดต้น/กลาง/ปลายจะไม่แสดง':'ไฮไลท์ตามวันและเวลาที่พิจารณา';root.querySelectorAll('[data-yam-slot]').forEach(el=>{const choose=()=>{const pi=el.dataset.yamPeriod==='day'?0:1;state.chosenYam={...state.model.table[pi][Number(el.dataset.yamSlot)],subperiod:null};state.live=false;render()};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})})}
  function renderTaksa(t){$('taksa').innerHTML=TAKSA_GRID.flat().map(n=>{if(n==null)return '<div class="kc-taksa-cell blank"></div>';const label=t[n]||'';const c=label==='บริวาร'?'boriwan':label==='ศรี'?'sri':label==='กาลี'?'kali':'';return `<div class="kc-taksa-cell ${c}"><span class="kc-taksa-label">${escapeHtml(label)}</span><span class="kc-taksa-number">${n}</span></div>`}).join('')}
  function renderSelected(){const el=$('selected');if(!state.selectedMeaning){el.style.display='none';el.textContent='';return}const names=state.selectedMeaning.keys.map(k=>{const [b,c]=k.split(':').map(Number);return `${HOUSE_NAMES[b]?.[c-1]||`ฐาน${b}ช่อง${c}`} (ฐาน ${b})`});el.style.display='block';el.textContent=`${state.selectedMeaning.text}: ${names.join(', ')}`}
  function renderMeanings(){const max=Math.max(...HOUSE_MEANINGS.map(g=>g.items.length));let h='<table class="kc-meanings"><thead><tr>'+HOUSE_MEANINGS.map(g=>`<th>${escapeHtml(g.name)}</th>`).join('')+'</tr></thead><tbody>';for(let r=0;r<max;r++){h+='<tr>'+HOUSE_MEANINGS.map(g=>{const item=g.items[r];if(!item)return '<td></td>';return `<td><button class="kc-meaning-btn" data-meaning="${escapeHtml(g.name)}::${escapeHtml(item.text)}">${escapeHtml(item.text)}</button></td>`}).join('')+'</tr>'}h+='</tbody></table>';$('meanings').innerHTML=h;root.querySelectorAll('[data-meaning]').forEach(btn=>btn.addEventListener('click',()=>{const [gname,text]=btn.dataset.meaning.split('::');const item=HOUSE_MEANINGS.find(g=>g.name===gname)?.items.find(i=>i.text===text);if(!item)return;state.selectedMeaning=state.selectedMeaning===item?null:item;root.querySelectorAll('[data-meaning]').forEach(x=>x.classList.toggle('active',!!state.selectedMeaning&&x.dataset.meaning===btn.dataset.meaning));render()}))}
  async function ensureScript(src,check){if(check())return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  async function captureCanvas(){state.exporting=true;try{if(document.fonts?.ready)await document.fonts.ready;await ensureScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',()=>!!window.html2canvas);return await window.html2canvas($('capture'),{backgroundColor:'#ffffff',scale:2,useCORS:true,scrollX:0,scrollY:0})}finally{state.exporting=false}}
  async function savePng(){const c=await captureCanvas(),a=document.createElement('a');a.download=`กาลชะตา_${state.input.yearBe}-${String(state.input.month).padStart(2,'0')}-${String(state.input.day).padStart(2,'0')}_${state.input.time.replace(':','')}.png`;a.href=c.toDataURL('image/png');a.click()}
  async function savePdf(){state.exporting=true;try{const c=await captureCanvas();await ensureScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',()=>!!window.jspdf);const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min((pw-10)/c.width,(ph-10)/c.height),w=c.width*ratio,h=c.height*ratio;pdf.addImage(c.toDataURL('image/png'),'PNG',(pw-w)/2,(ph-h)/2,w,h);pdf.save(`กาลชะตา_${state.input.yearBe}-${state.input.month}-${state.input.day}.pdf`)}finally{state.exporting=false}}

  $('apply').addEventListener('click',()=>{state.live=false;state.chosenYam=null;calculate(readInputs())});
  $('now').addEventListener('click',()=>{state.live=true;state.chosenYam=null;state.input=bangkokNowParts();setInputs(state.input);calculate(state.input)});
  $('clearMeaning').addEventListener('click',()=>{state.selectedMeaning=null;root.querySelectorAll('[data-meaning]').forEach(x=>x.classList.remove('active'));render()});
  $('png').addEventListener('click',()=>savePng().catch(e=>{state.error=`บันทึก PNG ไม่สำเร็จ: ${e.message}`;render()}));
  $('pdf').addEventListener('click',()=>savePdf().catch(e=>{state.error=`บันทึก PDF ไม่สำเร็จ: ${e.message}`;render()}));
  renderMeanings();setInputs(state.input);calculate(state.input);
  state.timer=setInterval(()=>{if(!state.live||state.exporting||document.hidden)return;const n=bangkokNowParts();state.input=n;setInputs(n);calculate(n)},60000);
  return {getState:()=>structuredClone({...state,timer:null}),recalculate:()=>calculate(state.input),destroy:()=>clearInterval(state.timer)};
}
