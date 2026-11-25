/* Sight Read: a fresh graded piece, played on an on-screen keyboard (as in Jazz Bastard) while a silent
   visual pulse (gliding cursor, beat lights, bar band) moves through the music in time.
   The music is engraved with OpenSheetMusicDisplay, the way Practice Room does it. */
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ---------------- saved state ---------------- */
const KEY="sight-read-v2";
const DEF={level:1,bpm:null,mark:0,count:1,fade:true,edge:false,vib:false,click:false,sound:false,log:[]};
let S=(()=>{ try{ return {...DEF,...JSON.parse(localStorage.getItem(KEY)||"{}")}; }catch(e){ return {...DEF}; } })();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} };
const dayKey=(t=Date.now())=>{ const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const levelBpm=l=>SR_LEVELS[l].bpm;
const curBpm=()=>S.bpm||levelBpm(S.level);

/* ---------------- home ---------------- */
function renderHome(){
  $("#lvNum").textContent=S.level; $("#lvName").textContent=SR_LEVELS[S.level].name;
  $("#lvDown").disabled=S.level<=1; $("#lvUp").disabled=S.level>=SR_MAX;
  $("#ladder").innerHTML=Array.from({length:SR_MAX},(_,i)=>`<i class="${i+1===S.level?"on":i+1<S.level?"done":""}"></i>`).join("");
  $("#bpmNum").textContent=curBpm();
  const d=levelBpm(S.level); $("#bpmReset").hidden=!S.bpm||S.bpm===d;
  $("#bpmHint").textContent=S.bpm&&S.bpm!==d?`LEVEL ${S.level} READS AT ${d}`:"BEATS PER MINUTE";
  $$("#countSeg button").forEach(b=>b.classList.toggle("on",+b.dataset.v===S.count));
  $("#optFade").checked=S.fade; $("#optEdge").checked=S.edge; $("#optVib").checked=S.vib; $("#optClick").checked=S.click;
  $("#vibRow").hidden=!("vibrate" in navigator);
  $("#soundBtn").textContent=S.sound?"🔊 KEY SOUNDS":"🔇 KEY SOUNDS";
  const today=dayKey(), days=new Set(S.log.map(e=>e.d)); const n=S.log.filter(e=>e.d===today).length;
  let streak=0; const t=new Date(); if(!days.has(dayKey(t))) t.setDate(t.getDate()-1); while(days.has(dayKey(t))){ streak++; t.setDate(t.getDate()-1); }
  const best=S.log.filter(e=>e.l===S.level).reduce((a,e)=>Math.max(a,e.p),-1);
  $("#stats").innerHTML=`<span class="chip"><b>${n}</b> TODAY</span>`+(streak?`<span class="chip"><b>${streak}</b>-DAY STREAK</span>`:"")+(best>=0?`<span class="chip">LEVEL BEST <b>${best}%</b></span>`:"");
  renderSuggest();
}
/* Three reads of 90% or more at this level and tempo offers the next level; two under 60% offers a slower tempo. */
function advice(){
  const mine=S.log.slice(S.mark||0).filter(e=>e.l===S.level); const last=mine.slice(-3);
  if(S.level<SR_MAX&&last.length===3&&last.every(e=>e.p>=90&&e.b>=levelBpm(S.level))) return {msg:`Three reads over 90%. Ready for level ${S.level+1}?`,act:"up",label:`GO TO LEVEL ${S.level+1}`};
  const l2=mine.slice(-2);
  if(l2.length===2&&l2.every(e=>e.p<60)){ const slower=Math.max(30,curBpm()-8); if(slower<curBpm()) return {msg:`Two tough reads. Try it at ♩ = ${slower} and keep going no matter what.`,act:"slow",label:"SLOW DOWN",bpm:slower}; }
  return null;
}
function renderSuggest(){ const a=advice(), el=$("#suggest"); el.hidden=!a; if(!a) return;
  el.innerHTML=`${a.msg}<button id="sugBtn">${a.label}</button>`; $("#sugBtn").onclick=()=>applyAdvice(a); }
function applyAdvice(a){ if(a.act==="up"){ S.level++; S.bpm=null; } else if(a.act==="slow") S.bpm=a.bpm; S.mark=S.log.length; save(); renderHome(); }

$("#lvDown").onclick=()=>{ if(S.level>1){ S.level--; S.bpm=null; S.mark=S.log.length; save(); renderHome(); } };
$("#lvUp").onclick=()=>{ if(S.level<SR_MAX){ S.level++; S.bpm=null; S.mark=S.log.length; save(); renderHome(); } };
const setBpm=v=>{ v=Math.max(30,Math.min(200,v)); S.bpm=v===levelBpm(S.level)?null:v; S.mark=S.log.length; save(); renderHome(); };
$("#bpmDown").onclick=()=>setBpm(curBpm()-4);
$("#bpmUp").onclick=()=>setBpm(curBpm()+4);
$("#bpmReset").onclick=()=>{ S.bpm=null; save(); renderHome(); };
$$("#countSeg button").forEach(b=>b.onclick=()=>{ S.count=+b.dataset.v; save(); renderHome(); });
for(const [id,k] of [["#optFade","fade"],["#optEdge","edge"],["#optVib","vib"],["#optClick","click"]])
  $(id).onchange=e=>{ S[k]=e.target.checked; save(); if(k==="vib"&&S.vib) try{ navigator.vibrate(20); }catch(_){} if(k==="click"&&S.click) tick(true); };
$("#soundBtn").onclick=()=>{ S.sound=!S.sound; save(); renderHome(); if(S.sound) tone(72); };
$("#newRead").onclick=()=>openRead(String(Date.now()));

/* ---------------- sound (all optional) ---------------- */
let ac=null;
const audio=()=>{ try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); return ac; }catch(e){ return null; } };
function tick(down){ const a=audio(); if(!a) return; const t=a.currentTime, o=a.createOscillator(), g=a.createGain(); o.frequency.value=down?1760:1320;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(down?.3:.18,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+.06); o.connect(g).connect(a.destination); o.start(t); o.stop(t+.08); }
function tone(m){ const a=audio(); if(!a) return; const t=a.currentTime, f=440*Math.pow(2,(m-69)/12), g=a.createGain();
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.22,t+.004); g.gain.exponentialRampToValueAtTime(.06,t+.25); g.gain.exponentialRampToValueAtTime(.0001,t+1.4); g.connect(a.destination);
  for(const [type,mul,lv] of [["triangle",1,1],["sine",2,.35],["sine",3,.12]]){ const o=a.createOscillator(), og=a.createGain(); o.type=type; o.frequency.value=f*mul; og.gain.value=lv; o.connect(og).connect(g); o.start(t); o.stop(t+1.5); } }

/* ---------------- notation (OpenSheetMusicDisplay, loaded as in Practice Room) ---------------- */
const OSMD_URLS=["https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js","https://unpkg.com/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js"];
let osmdLib=null;
const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
async function getOSMD(){ if(osmdLib) return osmdLib; for(const u of OSMD_URLS){ try{ await loadScript(u); if(window.opensheetmusicdisplay) return osmdLib=window.opensheetmusicdisplay; }catch(e){} }
  throw new Error("Couldn't load the music engraver. Check the connection and try again."); }

/* R: the piece on screen, its timing map and the notes to play. */
const R={ osmd:null, piece:null, bars:[], evs:[], groups:new Map(), total:0, bpm:60, phase:"idle", t0:0, lastBeat:null, lastBar:-1, raf:0, width:0, wrong:0 };
const W=.5; // how far (in beats) a tap may be from the written note and still count

async function openRead(seed){
  stopRun();
  if($("#read").hidden){ $("#home").hidden=true; $("#read").hidden=false; history.pushState({read:1},""); }
  const c=srCompose(S.level,seed); R.bpm=curBpm();
  R.piece={seed,xml:c.xml,title:`LEVEL ${S.level} · ${SR_NAME[c.fifths]} MAJOR`,level:S.level};
  $("#rTitle").textContent=R.piece.title; $("#rSub").textContent=` · ♩ = ${R.bpm} · ${SR_LEVELS[S.level].name}`;
  await draw();
}
async function draw(){
  const host=$("#osmd"), msg=$("#msg"); host.innerHTML=""; $("#layer").innerHTML=""; msg.hidden=false; msg.textContent="Drawing the music…";
  $("#cur").classList.remove("on"); $("#band").classList.remove("on"); $("#goBtn").disabled=true; $("#kbs").innerHTML="";
  try{
    const lib=await getOSMD();
    const narrow=$("#paper").clientWidth<520;
    R.osmd=new lib.OpenSheetMusicDisplay(host,{autoResize:false,backend:"svg",drawTitle:false,drawSubtitle:false,drawComposer:false,drawCredits:false,drawPartNames:false,
      drawMetronomeMarks:false,followCursor:false,defaultFontFamily:"Times New Roman",cursorsOptions:[{type:0,color:"#fbbf24",alpha:0,follow:false}]});
    try{ const er=R.osmd.EngravingRules; er.PageLeftMargin=er.PageRightMargin=narrow?3:5; er.PageTopMargin=narrow?3:4; }catch(e){}
    await R.osmd.load(R.piece.xml);
    R.osmd.Zoom=narrow?0.95:1;
    R.osmd.render();
    measure(); buildKeyboard();
    msg.hidden=true; $("#goBtn").disabled=false;
    ready();
  }catch(e){ console.error(e); msg.hidden=false; msg.textContent=(e&&e.message)||"Couldn't draw this score."; R.phase="idle"; }
}
/* Timing map: each bar's start/length in quarter notes and its box on screen, the x of every onset so the cursor
   can glide between them at the tempo, and the notes to play at each onset. */
function measure(){
  const o=R.osmd, stage=$("#stage").getBoundingClientRect(), c=o.cursor;
  const sv=$("#osmd svg").getBoundingClientRect(), unit=10*o.Zoom, ox=sv.left-stage.left;
  const sm=o.Sheet.SourceMeasures, gl=o.GraphicSheet.MeasureList;
  R.bars=sm.map((m,i)=>{ const gm=(gl[i]||[]).filter(Boolean)[0], ps=gm&&gm.PositionAndShape;
    return {q:m.AbsoluteTimestamp.RealValue*4,len:m.Duration.RealValue*4,x0:ps?ox+ps.AbsolutePosition.x*unit:0,x1:ps?ox+(ps.AbsolutePosition.x+ps.Size.width)*unit:0,top:0,h:0,pts:[]}; });
  R.evs=[]; R.groups=new Map();
  c.show(); c.reset(); let guard=0;
  while(!c.Iterator.EndReached&&guard++<20000){
    const q=c.Iterator.currentTimeStamp.RealValue*4, mi=c.Iterator.CurrentMeasureIndex, r=c.cursorElement.getBoundingClientRect();
    const b=R.bars[mi]; if(b&&r.height){ b.pts.push({q,x:r.left-stage.left+r.width/2}); if(!b.h){ b.top=r.top-stage.top; b.h=r.height; } }
    const notes=[];
    for(const gn of c.GNotesUnderCursor()){ const n=gn.sourceNote; if(!n||n.isRest()) continue;
      if(n.NoteTie&&n.NoteTie.StartNote!==n) continue; // a tied-over note is held, not played again
      const el=gn.getSVGGElement&&gn.getSVGGElement(); const note={m:n.halfTone+12,el,st:null}; notes.push(note);
      if(el){ if(!R.groups.has(el)) R.groups.set(el,[]); R.groups.get(el).push(note); } }
    if(notes.length) R.evs.push({q,notes});
    c.next(); }
  c.hide();
  for(const b of R.bars){ b.pts.sort((a,b2)=>a.q-b2.q);
    if(!b.h&&R.bars[0]){ b.top=R.bars[0].top; b.h=R.bars[0].h; }
    b.pts.push({q:b.q+b.len,x:b.x1-Math.min(10,(b.x1-b.x0)*.06)});
    if(b.pts[0].q>b.q) b.pts.unshift({q:b.q,x:b.pts[0].x}); }
  const last=R.bars[R.bars.length-1]; R.total=last?last.q+last.len:0;
  R.width=$("#paper").clientWidth;
}
const barAt=q=>{ let i=0; while(i<R.bars.length-1&&R.bars[i+1].q<=q) i++; return i; };
function xAt(b,q){ const p=b.pts; for(let i=0;i<p.length-1;i++) if(q<p[i+1].q){ const k=(q-p[i].q)/((p[i+1].q-p[i].q)||1); return p[i].x+(p[i+1].x-p[i].x)*Math.max(0,Math.min(1,k)); } return p[p.length-1].x; }
function showAt(q){ if(!R.bars.length) return 0; const bi=barAt(Math.max(0,q)), b=R.bars[bi], x=xAt(b,Math.max(q,b.q));
  const cur=$("#cur"); cur.style.transform=`translate(${x.toFixed(1)}px,${(b.top-4).toFixed(1)}px)`; cur.style.height=(b.h+8)+"px"; cur.classList.add("on");
  if(bi!==R.lastBar){ const band=$("#band"); Object.assign(band.style,{left:(b.x0-4)+"px",width:(b.x1-b.x0+8)+"px",top:(b.top-6)+"px",height:(b.h+12)+"px"}); band.classList.add("on");
    if(S.fade&&R.phase==="play") for(let k=Math.max(0,R.lastBar);k<bi;k++) fadeBar(k);
    if(R.lastBar<0||R.bars[R.lastBar].top!==b.top) follow(b);
    R.lastBar=bi; }
  return bi; }
function fadeBar(k){ const b=R.bars[k]; if(!b||$(`#layer [data-b="${k}"]`)) return; const d=document.createElement("div"); d.className="done"; d.dataset.b=k;
  Object.assign(d.style,{left:(b.x0-2)+"px",top:(b.top-8)+"px",width:(b.x1-b.x0+4)+"px",height:(b.h+16)+"px"}); $("#layer").appendChild(d); }
/* Keep the current line at the top so the next line is in view to read ahead. */
function follow(b){ const p=$("#paper"), target=Math.max(0,b.top-24); if(Math.abs(p.scrollTop-target)>4) p.scrollTo({top:target,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); }

/* ---------------- the keyboard ---------------- */
const BLACK=new Set([1,3,6,8,10]);
function buildKeyboard(){
  const ms=R.evs.flatMap(e=>e.notes.map(n=>n.m)); let lo=ms.length?Math.min(...ms):60, hi=ms.length?Math.max(...ms):72;
  lo=lo-((lo%12)+12)%12; hi=hi+(11-((hi%12)+12)%12); // whole octaves, C to B
  const whites=(a,b)=>{ let n=0; for(let m=a;m<=b;m++) if(!BLACK.has(m%12)) n++; return n; };
  const rows=whites(lo,hi)>15&&lo<60&&hi>=60?[[60,hi],[lo,59]]:[[lo,hi]]; // too wide for a phone: treble keys above, bass keys below
  $("#kbs").innerHTML=rows.map(([a,b])=>{ const n=whites(a,b), ww=100/n; let wi=0, h="";
    for(let m=a;m<=b;m++){ if(BLACK.has(m%12)){ h+=`<button class="b" data-m="${m}" aria-label="${noteName(m)}" style="left:${(wi*ww-ww*.31).toFixed(3)}%;width:${(ww*.62).toFixed(3)}%"></button>`; }
      else { h+=`<button class="w" data-m="${m}" aria-label="${noteName(m)}">${m%12===0?`<span class="${m===60?"mc":""}">C${m/12-1}</span>`:""}</button>`; wi++; } }
    return `<div class="kb${rows.length>1?" two":""}">${h}</div>`; }).join("");
}
const noteName=m=>["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"][m%12]+(Math.floor(m/12)-1);
const keyEl=m=>$(`.kb [data-m="${m}"]`);
function flashKey(m,cls){ const k=keyEl(m); if(!k) return; k.classList.remove("ok","no"); void k.offsetWidth; k.classList.add(cls); clearTimeout(k._t); k._t=setTimeout(()=>k.classList.remove(cls),260); }
const held=new Map();
$("#kbs").addEventListener("pointerdown",e=>{ const k=e.target.closest(".kb [data-m]"); if(!k) return; e.preventDefault();
  const m=+k.dataset.m; held.set(e.pointerId,k); k.classList.add("down"); if(S.sound) tone(m); press(m); });
const lift=e=>{ const k=held.get(e.pointerId); if(k){ k.classList.remove("down"); held.delete(e.pointerId); } };
for(const t of ["pointerup","pointercancel","pointerleave"]) $("#kbs").addEventListener(t,lift);
$("#kbs").addEventListener("contextmenu",e=>e.preventDefault());

/* A tap counts for the nearest unplayed written note of that pitch within half a beat; anything else is a wrong key. */
const nowQ=()=>(performance.now()-R.t0)*R.bpm/60000-countQ();
function press(m){
  if(R.phase!=="count"&&R.phase!=="play") return;
  const q=nowQ(); let best=null, bd=1e9;
  for(const ev of R.evs){ if(ev.q>q+W) break; const d=q-ev.q; if(Math.abs(d)>W) continue;
    for(const n of ev.notes) if(!n.st&&n.m===m&&Math.abs(d)<bd){ best=n; bd=Math.abs(d); n._d=d; } }
  if(best){ best.st=bd<=.25?"hit":"off"; flashKey(m,"ok"); paint(best); }
  else { R.wrong++; flashKey(m,"no"); }
  live();
}
function sweepMisses(q){ for(const ev of R.evs){ if(ev.q+W>=q) break; for(const n of ev.notes) if(!n.st){ n.st="miss"; paint(n); } } }
function paint(n){ if(!n.el) return; const grp=R.groups.get(n.el)||[n]; if(grp.some(x=>!x.st)) return;
  n.el.classList.remove("hit","off","miss"); n.el.classList.add(grp.some(x=>x.st==="miss")?"miss":grp.some(x=>x.st==="off")?"off":"hit"); }
function tally(){ const all=R.evs.flatMap(e=>e.notes); const hit=all.filter(n=>n.st==="hit"||n.st==="off").length, onTime=all.filter(n=>n.st==="hit").length, done=all.filter(n=>n.st).length;
  return {all:all.length,hit,onTime,done,score:Math.round(100*hit/Math.max(1,all.length+R.wrong))}; }
function live(){ const t=tally(); $("#liveScore").textContent=t.done||R.wrong?Math.round(100*t.hit/Math.max(1,t.done+R.wrong))+"%":"—"; }

/* ---------------- the pulse ---------------- */
function setBeats(n,on,count){ const el=$("#beats"); if(el.children.length!==n) el.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i===0?"down":""}"></i>`).join("");
  [...el.children].forEach((d,i)=>d.classList.toggle("on",i===on)); el.classList.toggle("count",!!count); }
function beat(i,down,count,n){
  setBeats(n,i,count);
  const dur=Math.min(500,60000/R.bpm*.85);
  if(!count) $("#cur i").animate([{width:down?"8px":"6px",left:down?"-4px":"-3px",boxShadow:"0 0 22px rgba(251,191,36,.95)"},{width:"4px",left:"-2px",boxShadow:"0 0 10px rgba(251,191,36,.6)"}],{duration:dur,easing:"ease-out"});
  if(S.edge) $("#edge").animate([{opacity:down?.9:.5},{opacity:0}],{duration:dur,easing:"ease-out"});
  if(count){ $("#countin").textContent=i+1; $("#countin").animate([{opacity:.95,transform:"translate(-50%,-50%) scale(1.1)"},{opacity:0,transform:"translate(-50%,-50%) scale(.9)"}],{duration:60000/R.bpm*.95,easing:"ease-out"}); }
  if(S.vib) try{ navigator.vibrate(down?35:18); }catch(e){}
  if(S.click) tick(down);
}

/* ---------------- running ---------------- */
let wake=null;
async function holdWake(on){ try{ if(on&&"wakeLock" in navigator&&!wake){ wake=await navigator.wakeLock.request("screen"); wake.addEventListener("release",()=>wake=null); } else if(!on&&wake){ await wake.release(); wake=null; } }catch(e){} }
const countQ=()=>{ const b=R.bars[0]; return S.count*(b?Math.round(b.len):4); };
function ready(){ cancelAnimationFrame(R.raf); holdWake(false); R.phase="ready"; R.lastBar=-1; R.lastBeat=null; R.wrong=0;
  for(const ev of R.evs) for(const n of ev.notes){ n.st=null; n.el&&n.el.classList.remove("hit","off","miss"); }
  $("#layer").innerHTML=""; $("#doneScrim").hidden=true; showAt(0); setBeats(Math.max(1,Math.round(R.bars[0]?R.bars[0].len:4)),-1);
  $("#liveScore").textContent="—"; $("#goBtn").hidden=false; $("#kbzone").classList.add("idle"); $("#prompt").textContent="SCAN IT FIRST: KEY, TIME, RHYTHMS";
  if(R.bars[0]) follow(R.bars[0]); }
function start(){ if(!R.bars.length) return; audio(); if(S.click) tick(false);
  $("#goBtn").hidden=true; $("#kbzone").classList.remove("idle"); $("#prompt").textContent="GET READY…";
  R.t0=performance.now()+150; R.phase="count"; holdWake(true); R.raf=requestAnimationFrame(frame); }
function frame(){
  if(R.phase!=="count"&&R.phase!=="play") return;
  const q=nowQ();
  if(q<0){ const n=Math.max(1,Math.round(R.bars[0].len)), k=Math.floor(q+countQ());
    if(k>=0&&k!==R.lastBeat){ R.lastBeat=k; beat(k%n,k%n===0,true,n); }
    showAt(0); R.raf=requestAnimationFrame(frame); return; }
  if(R.phase==="count"){ R.phase="play"; $("#prompt").textContent="KEEP GOING. DON'T STOP TO FIX MISTAKES."; }
  sweepMisses(q);
  if(q>=R.total+W){ finish(); return; }
  const bi=showAt(Math.min(q,R.total-.001)), b=R.bars[bi], n=Math.max(1,Math.round(b.len)), inBar=q-b.q, k=Math.floor(inBar), id=bi*1000+k;
  if(q<R.total&&id!==R.lastBeat&&inBar>=0){ R.lastBeat=id; beat(Math.min(k,n-1),k===0,false,n); }
  R.raf=requestAnimationFrame(frame);
}
function stopRun(){ cancelAnimationFrame(R.raf); R.phase="idle"; holdWake(false); $("#doneScrim").hidden=true; }
function finish(){ cancelAnimationFrame(R.raf); sweepMisses(1e9); if(S.fade) fadeBar(R.bars.length-1); R.phase="done"; holdWake(false);
  $("#cur").classList.remove("on"); setBeats(Math.round(R.bars[R.bars.length-1].len),-1); $("#prompt").textContent=""; live();
  const t=tally(); const e={d:dayKey(),l:R.piece.level,b:R.bpm,p:t.score}; S.log.push(e); if(S.log.length>3000) S.log=S.log.slice(-3000); save();
  $("#resPct").textContent=t.score+"%"; $("#resNotes").textContent=`${t.hit}/${t.all}`; $("#resTime").textContent=t.hit?Math.round(100*t.onTime/t.hit)+"%":"—"; $("#resWrong").textContent=R.wrong;
  const a=advice();
  $("#afterMsg").textContent=a?a.msg:t.score>=90?"Clean read. On to the next one.":t.score>=70?"Good. Look a beat ahead and let the pulse pull you through.":"Keep going even when you miss. Skip notes rather than stop.";
  $("#nextBtn").textContent=a&&a.act==="up"?`LEVEL ${S.level+1}`:a&&a.act==="slow"?`NEXT AT ♩ = ${a.bpm}`:"NEXT READ";
  $("#nextBtn").onclick=()=>{ if(a) applyAdvice(a); openRead(String(Date.now())); };
  $("#paper").scrollTo({top:0,behavior:"smooth"}); setTimeout(()=>{ if(R.phase==="done") $("#doneScrim").hidden=false; },900); }

$("#goBtn").onclick=start;
$("#restartBtn").onclick=()=>{ if(R.phase!=="idle") ready(); };
$("#againBtn").onclick=ready;
$("#backBtn").onclick=()=>history.back();
$("#homeBtn").onclick=()=>history.back();
window.addEventListener("popstate",()=>{ if(!$("#read").hidden) goHome(); });
function goHome(){ stopRun(); $("#read").hidden=true; $("#home").hidden=false; renderHome(); }
document.addEventListener("visibilitychange",()=>{ if(document.hidden&&(R.phase==="count"||R.phase==="play")) ready(); });
// computer keyboard for testing on a laptop: Space starts, Escape quits
document.addEventListener("keydown",e=>{ if($("#read").hidden) return; if(e.code==="Space"&&R.phase==="ready"){ e.preventDefault(); start(); } else if(e.key==="Escape") history.back(); });
/* Redraw when the width changes (rotation); a read in progress starts over. */
let rz=0; window.addEventListener("resize",()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if($("#read").hidden||!R.osmd||Math.abs($("#paper").clientWidth-R.width)<30) return; stopRun(); draw(); },250); });

renderHome();
if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("./sw.js").catch(()=>{});
