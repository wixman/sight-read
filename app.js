/* Sight Read: a fresh graded piece, drawn with OpenSheetMusicDisplay, and a silent visual pulse
   (gliding cursor, beat lights, bar band) that moves through it in time. */
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ---------------- saved state ---------------- */
const KEY="sight-read-v1";
const DEF={level:1,bpm:null,mark:0,count:1,fade:true,edge:false,vib:false,click:false,log:[]};
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
  $("#bpmHint").textContent=S.bpm&&S.bpm!==d?`level ${S.level} reads at ${d}`:"beats per minute";
  $$("#countSeg button").forEach(b=>b.classList.toggle("on",+b.dataset.v===S.count));
  $("#optFade").checked=S.fade; $("#optEdge").checked=S.edge; $("#optVib").checked=S.vib; $("#optClick").checked=S.click;
  $("#vibRow").hidden=!("vibrate" in navigator);
  // stats: reads today, day streak, level
  const today=dayKey(), days=new Set(S.log.map(e=>e.d)); const n=S.log.filter(e=>e.d===today).length;
  let streak=0; const t=new Date(); if(!days.has(dayKey(t))) t.setDate(t.getDate()-1); while(days.has(dayKey(t))){ streak++; t.setDate(t.getDate()-1); }
  $("#stats").innerHTML=`<span class="chip"><b>${n}</b> read${n===1?"":"s"} today</span>`+(streak?`<span class="chip"><b>${streak}</b>-day streak</span>`:"")+(S.log.length?`<span class="chip"><b>${S.log.length}</b> in all</span>`:"");
  renderSuggest();
}
/* After three "kept going" reads in a row at this level and tempo, offer the next level; after two "lost my place", offer slower. */
function advice(){
  const mine=S.log.slice(S.mark||0).filter(e=>e.l===S.level&&!e.file); const last=mine.slice(-3);
  if(S.level<SR_MAX&&last.length===3&&last.every(e=>e.r==="good"&&e.b>=levelBpm(S.level))) return {msg:`Three clean reads in a row. Ready for level ${S.level+1}?`,act:"up",label:`Go to level ${S.level+1}`};
  const l2=mine.slice(-2);
  if(l2.length===2&&l2.every(e=>e.r==="lost")){ const slower=Math.max(30,curBpm()-8); return slower<curBpm()?{msg:`Lost the pulse twice. Take it slower, ♩ = ${slower}, and keep going no matter what.`,act:"slow",label:"Slow down",bpm:slower}:null; }
  return null;
}
function renderSuggest(){ const a=advice(), el=$("#suggest"); el.hidden=!a; if(!a) return;
  el.innerHTML=`${a.msg} <button class="btn small" id="sugBtn">${a.label}</button>`;
  $("#sugBtn").onclick=()=>applyAdvice(a); }
function applyAdvice(a){ if(a.act==="up"){ S.level++; S.bpm=null; } else if(a.act==="slow"){ S.bpm=a.bpm; } S.mark=S.log.length; save(); renderHome(); }

$("#lvDown").onclick=()=>{ if(S.level>1){ S.level--; S.bpm=null; S.mark=S.log.length; save(); renderHome(); } };
$("#lvUp").onclick=()=>{ if(S.level<SR_MAX){ S.level++; S.bpm=null; S.mark=S.log.length; save(); renderHome(); } };
const setBpm=v=>{ v=Math.max(30,Math.min(200,v)); S.bpm=v===levelBpm(S.level)?null:v; S.mark=S.log.length; save(); renderHome(); };
$("#bpmDown").onclick=()=>setBpm(curBpm()-4);
$("#bpmUp").onclick=()=>setBpm(curBpm()+4);
$("#bpmReset").onclick=()=>{ S.bpm=null; save(); renderHome(); };
$$("#countSeg button").forEach(b=>b.onclick=()=>{ S.count=+b.dataset.v; save(); renderHome(); });
for(const [id,k] of [["#optFade","fade"],["#optEdge","edge"],["#optVib","vib"],["#optClick","click"]])
  $(id).onchange=e=>{ S[k]=e.target.checked; save(); if(k==="vib"&&S.vib) try{ navigator.vibrate(20); }catch(_){} if(k==="click"&&S.click) tick(true); };
$("#themeBtn").onclick=()=>{ const r=document.documentElement; const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme=dark?"light":"dark"; try{ localStorage.setItem("sr-theme",r.dataset.theme); }catch(e){} };

$("#newRead").onclick=()=>openRead({seed:String(Date.now())});
$("#fileIn").onchange=e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
  const fr=new FileReader(); fr.onload=()=>openRead({file:{name:f.name.replace(/\.(mxl|musicxml|xml)$/i,""),data:fr.result}});
  if(/\.mxl$/i.test(f.name)) fr.readAsBinaryString(f); else fr.readAsText(f); };

/* ---------------- notation (OpenSheetMusicDisplay, loaded the same way as Practice Room) ---------------- */
const OSMD_URLS=["https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js","https://unpkg.com/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js"];
let osmdLib=null;
const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
async function getOSMD(){ if(osmdLib) return osmdLib; for(const u of OSMD_URLS){ try{ await loadScript(u); if(window.opensheetmusicdisplay) return osmdLib=window.opensheetmusicdisplay; }catch(e){} }
  throw new Error("Couldn't load the music engraver. Check the connection and try again."); }

/* R: the piece on screen and its timing map. */
const R={ osmd:null, piece:null, bars:[], total:0, bpm:60, phase:"idle", t0:0, pausedAt:0, lastBeat:null, lastBar:-1, raf:0, width:0 };

async function openRead(piece){
  stopRun();
  if(!piece.file){ const c=srCompose(S.level,piece.seed); piece={...piece,xml:c.xml,title:`Level ${S.level} · ${SR_NAME[c.fifths]} major`,level:S.level}; }
  else piece={...piece,xml:piece.file.data,title:piece.file.name,level:0};
  R.piece=piece; R.bpm=curBpm();
  $("#home").hidden=true; $("#read").hidden=false; window.scrollTo(0,0);
  $("#rTitle").textContent=piece.title; $("#rSub").textContent=`♩ = ${R.bpm}`+(piece.level?` · ${SR_LEVELS[piece.level].name}`:"");
  history.pushState({read:1},"");
  await draw();
}
async function draw(){
  const host=$("#osmd"), msg=$("#msg"); host.innerHTML=""; $("#layer").innerHTML=""; msg.hidden=false; msg.textContent="Drawing the music…";
  $("#cur").classList.remove("on"); $("#band").classList.remove("on"); $("#goBtn").disabled=true;
  try{
    const lib=await getOSMD();
    const narrow=$("#paper").clientWidth<520;
    R.osmd=new lib.OpenSheetMusicDisplay(host,{autoResize:false,backend:"svg",drawTitle:false,drawSubtitle:false,drawComposer:false,drawCredits:false,drawPartNames:false,
      drawMetronomeMarks:false,followCursor:false,defaultFontFamily:"Times New Roman",cursorsOptions:[{type:0,color:"#E3A33A",alpha:0,follow:false}]});
    const er=R.osmd.EngravingRules;
    try{ if(narrow) er.RenderXMeasuresPerLineAkaSystem=2; er.PageLeftMargin=er.PageRightMargin=narrow?3:5; er.PageTopMargin=narrow?3:4; }catch(e){}
    await R.osmd.load(R.piece.xml);
    R.osmd.Zoom=narrow?0.95:1;
    R.osmd.render();
    measure();
    msg.hidden=true; $("#goBtn").disabled=false;
    R.phase="ready"; showAt(0); setBeats(Math.max(1,Math.round(R.bars[0]?R.bars[0].len:4)),-1); setGo();
    $("#paper").scrollTo({top:0});
  }catch(e){ console.error(e); msg.hidden=false; msg.textContent=(e&&e.message)||"Couldn't draw this score."; R.phase="idle"; }
}
/* Build the timing map: for each bar its start/length in quarter notes, its box on screen,
   and the x of each note onset, so the cursor can glide between them at the tempo. */
function measure(){
  const o=R.osmd, stage=$("#stage").getBoundingClientRect(), c=o.cursor;
  const svg=$("#osmd svg"); const sv=svg.getBoundingClientRect(); const unit=10*o.Zoom;
  const ox=sv.left-stage.left, oy=sv.top-stage.top;
  const sm=o.Sheet.SourceMeasures, gl=o.GraphicSheet.MeasureList;
  R.bars=sm.map((m,i)=>{ const gm=(gl[i]||[]).filter(Boolean)[0]; const ps=gm&&gm.PositionAndShape;
    return {q:m.AbsoluteTimestamp.RealValue*4,len:m.Duration.RealValue*4,x0:ps?ox+ps.AbsolutePosition.x*unit:0,x1:ps?ox+(ps.AbsolutePosition.x+ps.Size.width)*unit:0,top:0,h:0,pts:[]}; });
  c.show(); c.reset(); let guard=0;
  while(!c.Iterator.EndReached&&guard++<20000){
    const q=c.Iterator.currentTimeStamp.RealValue*4, mi=c.Iterator.CurrentMeasureIndex, el=c.cursorElement; const r=el.getBoundingClientRect();
    const b=R.bars[mi]; if(b&&r.height){ b.pts.push({q,x:r.left-stage.left+r.width/2}); if(!b.h){ b.top=r.top-stage.top; b.h=r.height; } }
    c.next(); }
  c.hide();
  for(const b of R.bars){ b.pts.sort((a,b2)=>a.q-b2.q);
    if(!b.h&&R.bars[0]){ b.top=R.bars[0].top; b.h=R.bars[0].h; }
    // glide to just before the barline at the end of the bar
    b.pts.push({q:b.q+b.len,x:b.x1-Math.min(10,(b.x1-b.x0)*.06)});
    if(b.pts[0].q>b.q) b.pts.unshift({q:b.q,x:b.pts[0].x}); }
  const last=R.bars[R.bars.length-1]; R.total=last?last.q+last.len:0;
  R.width=$("#paper").clientWidth;
}
const barAt=q=>{ let i=0; while(i<R.bars.length-1&&R.bars[i+1].q<=q) i++; return i; };
function xAt(b,q){ const p=b.pts; for(let i=0;i<p.length-1;i++) if(q<p[i+1].q){ const k=(q-p[i].q)/((p[i+1].q-p[i].q)||1); return p[i].x+(p[i+1].x-p[i].x)*Math.max(0,Math.min(1,k)); } return p[p.length-1].x; }
function showAt(q){ if(!R.bars.length) return; const bi=barAt(Math.max(0,q)), b=R.bars[bi]; const x=xAt(b,Math.max(q,b.q));
  const cur=$("#cur"); cur.style.transform=`translate(${x.toFixed(1)}px,${(b.top-4).toFixed(1)}px)`; cur.style.height=(b.h+8)+"px"; cur.classList.add("on");
  if(bi!==R.lastBar){ const band=$("#band"); band.style.left=(b.x0-4)+"px"; band.style.width=(b.x1-b.x0+8)+"px"; band.style.top=(b.top-6)+"px"; band.style.height=(b.h+12)+"px"; band.classList.add("on");
    if(S.fade&&R.phase==="play") for(let k=Math.max(0,R.lastBar);k<bi;k++) fadeBar(k);
    if(R.lastBar<0||R.bars[R.lastBar].top!==b.top) follow(b);
    R.lastBar=bi; }
  return bi; }
function fadeBar(k){ const b=R.bars[k]; if(!b||$(`#layer [data-b="${k}"]`)) return; const d=document.createElement("div"); d.className="done"; d.dataset.b=k;
  Object.assign(d.style,{left:(b.x0-2)+"px",top:(b.top-8)+"px",width:(b.x1-b.x0+4)+"px",height:(b.h+16)+"px"}); $("#layer").appendChild(d); }
/* Keep the current line near the top so the next line is in view to read ahead. */
function follow(b){ const p=$("#paper"); const target=Math.max(0,b.top-28); if(Math.abs(p.scrollTop-target)>4) p.scrollTo({top:target,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); }

/* ---------------- the pulse ---------------- */
function setBeats(n,on,count){ const el=$("#beats"); if(el.children.length!==n) el.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i===0?"down":""}"></i>`).join("");
  [...el.children].forEach((d,i)=>d.classList.toggle("on",i===on)); el.classList.toggle("count",!!count); }
let ac=null;
function tick(down){ try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume();
  const t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=down?1760:1320; o.type="sine";
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(down?.35:.22,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+.06); o.connect(g).connect(ac.destination); o.start(t); o.stop(t+.08); }catch(e){} }
function beat(i,down,count,n){
  setBeats(n,i,count);
  const dur=Math.min(500,60000/R.bpm*.85);
  const ring=$("#pulseRing i"); ring.parentNode.classList.add("live");
  ring.animate([{transform:`scale(${down?1.9:1.5})`},{transform:"scale(1)"}],{duration:dur,easing:"cubic-bezier(.2,.7,.3,1)"});
  if(!count) $("#cur i").animate([{width:down?"8px":"6px",left:down?"-4px":"-3px",boxShadow:"0 0 22px rgba(227,163,58,.95)"},{width:"4px",left:"-2px",boxShadow:"0 0 10px rgba(227,163,58,.55)"}],{duration:dur,easing:"ease-out"});
  if(S.edge) $("#edge").animate([{opacity:down?.9:.5},{opacity:0}],{duration:dur,easing:"ease-out"});
  if(count){ const ci=$("#countin"); ci.textContent=i+1; ci.animate([{opacity:.95,transform:"translate(-50%,-50%) scale(1.1)"},{opacity:0,transform:"translate(-50%,-50%) scale(.9)"}],{duration:60000/R.bpm*.95,easing:"ease-out"}); }
  if(S.vib) try{ navigator.vibrate(down?35:18); }catch(e){}
  if(S.click) tick(down);
}

/* ---------------- running ---------------- */
let wake=null;
async function holdWake(on){ try{ if(on&&"wakeLock" in navigator&&!wake){ wake=await navigator.wakeLock.request("screen"); wake.addEventListener("release",()=>wake=null); } else if(!on&&wake){ await wake.release(); wake=null; } }catch(e){} }
function setGo(){ const g=$("#goBtn"), h=$("#rHint");
  if(R.phase==="ready"){ g.textContent="Start"; h.textContent="Scan it first: key, time signature, rhythms. Then start."; }
  else if(R.phase==="count"||R.phase==="play"){ g.textContent="Pause"; h.textContent=R.phase==="count"?"Get ready…":"Keep going. Don't stop to fix mistakes."; }
  else if(R.phase==="paused"){ g.textContent="Resume"; h.textContent="Paused."; }
  else if(R.phase==="done"){ g.textContent="Next read"; h.textContent=""; } }
const countQ=()=>{ const b=R.bars[0]; return S.count*(b?Math.round(b.len):4); };
function start(){ if(!R.bars.length) return; if(S.click) tick(false);
  R.lastBar=-1; R.lastBeat=null; $("#layer").innerHTML="";
  R.t0=performance.now()+120; R.phase=S.count?"count":"play"; holdWake(true); setGo(); loop(); }
function loop(){ cancelAnimationFrame(R.raf); R.raf=requestAnimationFrame(frame); }
function frame(now){
  if(R.phase!=="count"&&R.phase!=="play") return;
  const q=(now-R.t0)*R.bpm/60000-countQ();
  if(q<0){ // count-in, one beat at a time with the beat lights and big numbers
    const b0=R.bars[0], n=Math.max(1,Math.round(b0.len)); const k=Math.floor(q+countQ());
    if(k>=0&&k!==R.lastBeat){ R.lastBeat=k; beat(k%n,k%n===0,true,n); }
    showAt(0); R.raf=requestAnimationFrame(frame); return; }
  if(R.phase==="count"){ R.phase="play"; setGo(); }
  if(q>=R.total){ finish(); return; }
  const bi=showAt(q), b=R.bars[bi], n=Math.max(1,Math.round(b.len)), inBar=q-b.q, k=Math.floor(inBar), id=bi*1000+k;
  if(id!==R.lastBeat&&inBar>=0){ R.lastBeat=id; beat(Math.min(k,n-1),k===0,false,n); }
  R.raf=requestAnimationFrame(frame);
}
function pause(){ if(R.phase!=="count"&&R.phase!=="play") return; R.pausedAt=performance.now(); R.pausedFrom=R.phase; R.phase="paused"; cancelAnimationFrame(R.raf); holdWake(false); setGo(); }
function resume(){ if(R.phase!=="paused") return; R.t0+=performance.now()-R.pausedAt; R.phase=R.pausedFrom; holdWake(true); setGo(); loop(); }
function stopRun(){ cancelAnimationFrame(R.raf); R.phase="idle"; holdWake(false); $("#doneScrim").hidden=true; $("#pulseRing").classList.remove("live"); }
function finish(){ cancelAnimationFrame(R.raf); if(S.fade) fadeBar(R.bars.length-1); R.phase="done"; holdWake(false); setGo(); setBeats(R.bars.length?Math.round(R.bars[R.bars.length-1].len):4,-1);
  $("#cur").classList.remove("on"); $("#pulseRing").classList.remove("live");
  setTimeout(()=>{ if(R.phase!=="done") return; $$(".rate button").forEach(b=>b.classList.remove("on")); $(".rate").classList.remove("picked"); $("#after").hidden=true; $("#doneScrim").hidden=false; },500); }
function restart(){ cancelAnimationFrame(R.raf); $("#doneScrim").hidden=true; $("#layer").innerHTML=""; R.phase="ready"; R.lastBar=-1; showAt(0); setBeats(Math.round(R.bars[0]?.len||4),-1); setGo(); follow(R.bars[0]); }

$("#goBtn").onclick=()=>{ if(R.phase==="ready") start(); else if(R.phase==="count"||R.phase==="play") pause(); else if(R.phase==="paused") resume(); else if(R.phase==="done") nextRead(); };
$("#restartBtn").onclick=()=>{ if(R.phase!=="idle") restart(); };
$("#backBtn").onclick=()=>history.back();
window.addEventListener("popstate",()=>{ if(!$("#read").hidden) goHome(); });
function goHome(){ stopRun(); $("#read").hidden=true; $("#home").hidden=false; renderHome(); }
function nextRead(){ if(R.piece&&R.piece.file) { goHomeVia(); return; } $("#doneScrim").hidden=true; R.piece.seed=String(Date.now()); openReadReplace(); }
function goHomeVia(){ history.back(); }
async function openReadReplace(){ const c=srCompose(S.level,R.piece.seed); R.bpm=curBpm();
  R.piece={seed:R.piece.seed,xml:c.xml,title:`Level ${S.level} · ${SR_NAME[c.fifths]} major`,level:S.level};
  $("#rTitle").textContent=R.piece.title; $("#rSub").textContent=`♩ = ${R.bpm} · ${SR_LEVELS[S.level].name}`; R.lastBar=-1; await draw(); }
document.addEventListener("visibilitychange",()=>{ if(document.hidden) pause(); });
document.addEventListener("keydown",e=>{ if($("#read").hidden) return; if(e.code==="Space"){ e.preventDefault(); $("#goBtn").click(); } else if(e.key==="Escape") history.back(); });

/* Redraw when the width changes (rotation). The timing map is rebuilt, so a running read carries on. */
let rz=0; window.addEventListener("resize",()=>{ clearTimeout(rz); rz=setTimeout(async()=>{ if($("#read").hidden||!R.osmd||Math.abs($("#paper").clientWidth-R.width)<30) return;
  const was=R.phase; if(was==="count"||was==="play") pause(); const keepBar=R.lastBar; R.lastBar=-1; await draw(); if(was==="ready") return;
  R.phase="paused"; R.pausedFrom=was==="count"?"count":"play"; if(was==="paused"||was==="count"||was==="play"){ setGo(); if(S.fade) for(let k=0;k<keepBar;k++) fadeBar(k); }
  else if(was==="done"){ R.phase="done"; setGo(); } },250); });

/* ---------------- rating ---------------- */
$$(".rate button").forEach(b=>b.onclick=()=>{
  const r=b.dataset.r; $$(".rate button").forEach(x=>x.classList.toggle("on",x===b)); $(".rate").classList.add("picked");
  const p=R.piece; const entry={d:dayKey(),l:p.level||S.level,b:R.bpm,r}; if(p.file) entry.file=1;
  // re-rating the same read replaces the last entry
  if(R.rated===p) S.log[S.log.length-1]=entry; else S.log.push(entry); R.rated=p; if(S.log.length>2000) S.log=S.log.slice(-2000); save();
  const a=p.file?null:advice();
  $("#afterMsg").textContent=a?a.msg:r==="good"?"Nice. Keep the streak going.":r==="ok"?"Fine. Next time, let the cursor pull you through the hesitations.":"It happens. Look ahead a bar, and skip notes rather than stop.";
  $("#nextBtn").textContent=a&&a.act==="up"?`Try level ${S.level+1}`:a&&a.act==="slow"?`Next, at ♩ = ${a.bpm}`:p.file?"Done":"Next read";
  $("#nextBtn").onclick=()=>{ if(a) applyAdvice(a); nextRead(); };
  $("#after").hidden=false; });
$("#againBtn").onclick=()=>{ $("#doneScrim").hidden=true; restart(); };
$("#homeBtn").onclick=()=>{ $("#doneScrim").hidden=true; history.back(); };

renderHome();
if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("./sw.js").catch(()=>{});
