/* Piece generator, taken from Practice Room (Sight Reading Academy).
   srCompose(level, seed) writes a short two-staff piano piece as MusicXML for one of ten graded levels. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SR_LEVELS=[
 null,
 {name:"Right hand, C position",          bpm:50, bars:4, hands:"R",  rh:[60,67], rhy:"basic",  step:.85},
 {name:"Left hand, C position",           bpm:50, bars:4, hands:"L",  lh:[48,55], rhy:"basic",  step:.85},
 {name:"Hands take turns, C position",    bpm:56, bars:4, hands:"alt",rh:[60,67], lh:[48,55], rhy:"basic", step:.7},
 {name:"Hands together: held bass notes", bpm:56, bars:4, hands:"hold",rh:[60,67], lh:[48,55], rhy:"basic", step:.7},
 {name:"G and F positions, eighth notes", bpm:60, bars:4, hands:"hold",keys:[0,1,-1], rhy:"eighths", step:.65, pos:true},
 {name:"Both hands moving, 3/4 and 4/4",  bpm:60, bars:8, hands:"both",keys:[0,1,-1], rhy:"eighths", step:.65, pos:true, waltz:true},
 {name:"Wider range, dotted rhythms",     bpm:66, bars:8, hands:"intervals",keys:[0,1,-1,2,-2], rhy:"dotted", step:.55, wide:true},
 {name:"Swing, chromatic notes, chord symbols", bpm:72, bars:8, hands:"shell",keys:[0,1,-1,-2], rhy:"swing", step:.6, wide:true, swing:true, chromatic:.12},
 {name:"Jazz lines over ii–V–I",          bpm:80, bars:8, hands:"guide",keys:[0,-1,-2,-3,1,2], rhy:"swing8", step:.6, wide:true, swing:true, chromatic:.22, jazz:true},
 {name:"Two-hand comping",                bpm:88, bars:8, hands:"comp",keys:[0,-1,-2,-3,1,2,-4,3], rhy:"comp", swing:true, jazz:true}
];
const SR_MAX=SR_LEVELS.length-1;
function srRng(seed){ let s=0; for(const c of String(seed)) s=(s*31+c.charCodeAt(0))>>>0; s=s||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const srPick=(r,a)=>a[Math.floor(r()*a.length)];
const SR_TONIC={"0":60,"1":67,"-1":65,"2":62,"-2":58,"3":69,"-3":63,"-4":56,"4":64};
const SR_NAME={"0":"C","1":"G","-1":"F","2":"D","-2":"B♭","3":"A","-3":"E♭","-4":"A♭","4":"E"};
const MAJ=[0,2,4,5,7,9,11];
/* rhythm cells, in eighths, that fill one bar */
function srRhythm(r,kind,beats){ const n=beats*2;
  const pools={ basic:[[2,2,2,2],[4,2,2],[2,2,4],[4,4],[2,2,2,2],[2,4,2],[8]],
    eighths:[[2,2,1,1,2],[1,1,2,2,2],[2,1,1,2,2],[2,2,2,1,1],[4,2,2],[2,2,4],[1,1,1,1,2,2]],
    dotted:[[3,1,2,2],[2,2,3,1],[3,1,4],[2,3,1,2],[6,2],[3,1,3,1],[2,2,2,2]],
    swing:[[2,2,2,1,1],[1,1,2,2,2],[2,1,1,1,1,2],[3,1,2,2],[2,2,1,3],[1,1,1,1,2,2]],
    swing8:[[1,1,1,1,1,1,1,1],[2,1,1,1,1,1,1],[1,1,1,1,2,1,1],[1,1,2,1,1,2],[3,1,1,1,2]],
    comp:[[3,1,4],[2,6],[3,3,2]] };
  if(beats===3){ const p3={basic:[[2,2,2],[4,2],[2,4],[6]],eighths:[[2,1,1,2],[1,1,2,2],[2,2,1,1],[4,2]],dotted:[[3,1,2],[2,3,1],[6]]};
    return srPick(r,p3[kind]||p3.eighths); }
  const c=srPick(r,pools[kind]||pools.basic); return c.reduce((a,b)=>a+b,0)===n?c:[2,2,2,2]; }
/* a melody over scale degrees: mostly steps, a few skips, ending on the tonic */
function srMelody(r,L,deg0,lo,hi,count,endDeg){ const out=[]; let d=deg0;
  for(let i=0;i<count;i++){ if(i===count-1&&endDeg!=null){ out.push(endDeg); break; }
    const mv=r()<L.step?(r()<.5?1:-1):srPick(r,[2,-2,2,-2,3,-3,0]); let nd=d+mv; if(nd<lo) nd=d+Math.abs(mv); if(nd>hi) nd=d-Math.abs(mv); nd=clamp(nd,lo,hi); out.push(nd); d=nd; }
  return out; }
const degMidi=(tonic,deg)=>tonic+Math.floor(deg/7)*12+MAJ[((deg%7)+7)%7];
/* ---- MusicXML ---- */
function srSpell(m,fifths){ const pc=((m%12)+12)%12; const sharp=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"], flat=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const n=(fifths<0?flat:sharp)[pc]; return {step:n[0],alter:n.length>1?(n[1]==="#"?1:-1):0,oct:Math.floor(m/12)-1}; }
function srKeyAlter(fifths,step){ const sh="FCGDAEB",fl="BEADGCF"; if(fifths>0&&sh.slice(0,fifths).includes(step)) return 1; if(fifths<0&&fl.slice(0,-fifths).includes(step)) return -1; return 0; }
const SR_TYPE={1:["eighth",0],2:["quarter",0],3:["quarter",1],4:["half",0],6:["half",1],8:["whole",0]};
function srXML(sc){ // sc: {title, fifths, beats, bars:[{ch, rh:[{m:[...],d,tie}], lh:[...]}], fing:{rh,lh}}
  const esc2=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  let x=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${esc2(sc.title)}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">`;
  sc.bars.forEach((b,bi)=>{ x+=`<measure number="${bi+1}">`;
    if(bi===0) x+=`<attributes><divisions>2</divisions><key><fifths>${sc.fifths}</fifths></key><time><beats>${sc.beats}</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${sc.bpm}</per-minute></metronome></direction-type><staff>1</staff><sound tempo="${sc.bpm}"/></direction>`;
    const voice=(notes,staff,vn,isRH)=>{ const st={}; let t=0, chi=0; const chs=isRH?(b.ch||[]):[];
      notes.forEach((n,ni)=>{ while(chi<chs.length&&chs[chi].at<=t){ const c=chs[chi++]; const mm=c.sym.match(/^([A-G])([b#]?)(.*)$/);
          x+=`<harmony><root><root-step>${mm[1]}</root-step>${mm[2]?`<root-alter>${mm[2]==="#"?1:-1}</root-alter>`:""}</root><kind text="${esc2(mm[3])}">${/^m7b5/.test(mm[3])?"half-diminished":/^maj/.test(mm[3])?"major-seventh":/^m/.test(mm[3])?"minor-seventh":mm[3]?"dominant":"major"}</kind></harmony>`; }
        const [ty,dots]=SR_TYPE[n.d]; const ms=n.m||[];
        if(!ms.length){ x+=`<note><rest/><duration>${n.d}</duration><voice>${vn}</voice><type>${ty}</type>${dots?"<dot/>":""}<staff>${staff}</staff></note>`; }
        ms.forEach((m,j)=>{ const p=srSpell(m,sc.fifths), key=p.step+p.oct, shown=key in st?st[key]:srKeyAlter(sc.fifths,p.step); st[key]=p.alter;
          const acc=p.alter!==shown?({"-1":"flat","0":"natural","1":"sharp"})[p.alter]:null; const f=j===0&&n.f?n.f:null;
          x+=`<note>${j?"<chord/>":""}<pitch><step>${p.step}</step>${p.alter?`<alter>${p.alter}</alter>`:""}<octave>${p.oct}</octave></pitch><duration>${n.d}</duration>${n.tieStop?'<tie type="stop"/>':""}${n.tie?'<tie type="start"/>':""}<voice>${vn}</voice><type>${ty}</type>${dots?"<dot/>":""}${acc?`<accidental>${acc}</accidental>`:""}<staff>${staff}</staff>`+
            ((n.tie||n.tieStop||f)?`<notations>${n.tieStop?'<tied type="stop"/>':""}${n.tie?'<tied type="start"/>':""}${f?`<technical><fingering placement="${staff===1?"above":"below"}">${f}</fingering></technical>`:""}</notations>`:"")+`</note>`; });
        t+=n.d; });
      return t; };
    const len=voice(b.rh,1,1,true); x+=`<backup><duration>${len}</duration></backup>`; voice(b.lh,2,5,false);
    if(bi===sc.bars.length-1) x+=`<barline location="right"><bar-style>light-heavy</bar-style></barline>`;
    x+=`</measure>`; });
  return x+`</part></score-partwise>`; }
/* ---- composing one read ---- */
function srCompose(level,seed){ const r=srRng(seed), L=SR_LEVELS[level];
  const fifths=L.keys?srPick(r,L.keys):0, beats=L.waltz&&r()<.45?3:4, nb=L.bars, tonic=SR_TONIC[fifths];
  const rest=d=>({m:[],d}), whole=beats*2;
  const bars=[]; const fit=(arr)=>arr;
  const rhT=tonic<60?tonic+12:tonic>69?tonic-12:tonic, lhT=rhT-12; // tonic for the right hand in octave 4, left hand an octave lower
  const rhy=bi=>bi===nb-1?(beats===3?[6]:[8]):srRhythm(r,L.rhy,beats);
  const melodyBars=(lo,hi,deg0,octT)=>{ const rh=[]; for(let bi=0;bi<nb;bi++) rh.push(rhy(bi)); const cnt=rh.reduce((a,b)=>a+b.length,0);
    const degs=srMelody(r,L,deg0,lo,hi,cnt,0); let k=0; return rh.map(cells=>cells.map(d=>({m:[degMidi(octT,degs[k++])],d}))); };
  let title=`Level ${level} · ${SR_NAME[fifths]} major`;
  // five-finger levels: degrees 0..4 above the tonic
  if(L.hands==="R"||L.hands==="L"){ const mel=melodyBars(0,4,srPick(r,[0,0,2,4]),L.hands==="R"?rhT:lhT); mel[0][0].f=L.hands==="R"?String(1+degOf(mel[0][0].m[0],rhT)):String(5-degOf(mel[0][0].m[0],lhT));
    for(let bi=0;bi<nb;bi++){ const v=mel[bi]; bars.push(L.hands==="R"?{rh:v,lh:[rest(whole)]}:{rh:[rest(whole)],lh:v}); } }
  else if(L.hands==="alt"){ const mel=melodyBars(0,4,0,rhT); for(let bi=0;bi<nb;bi++){ const useL=Math.floor(bi/1)%2===1; const v=mel[bi].map(n=>({m:[n.m[0]-(useL?12:0)],d:n.d}));
      bars.push(useL?{rh:[rest(whole)],lh:v}:{rh:v,lh:[rest(whole)]}); } bars[0].rh[0].f=String(1+degOf(bars[0].rh[0].m[0],rhT)); }
  else if(L.hands==="hold"||L.hands==="both"||L.hands==="intervals"){ const span=L.wide?7:4, lo=L.pos?srPick(r,[0,0,2]):0;
    const mel=melodyBars(lo,lo+span,lo+srPick(r,[0,2,4].filter(x=>x<=span)),rhT);
    if(L.pos||L.wide) mel[0][0].f=String(1+clamp(degOf(mel[0][0].m[0],rhT)-lo,0,4));
    for(let bi=0;bi<nb;bi++){ // harmony per bar: I or V (IV now and then), from the melody's strong notes
      const strong=mel[bi][0].m[0]; const dd=((degOf(strong,rhT)%7)+7)%7; const ch=bi===nb-1?0:[1,4,6].includes(dd)?4:(dd===3||dd===5)&&r()<.5&&level>=6?3:0;
      let root=lhT+MAJ[ch]; if(root>lhT+4) root-=12; let lh;
      if(L.hands==="hold") lh=bi===nb-1||r()<.6?[{m:[root],d:whole}]:beats===3?[{m:[root],d:4},{m:[root+7],d:2}]:[{m:[root],d:4},{m:[root+(ch===4?0:7)],d:4}];
      else if(L.hands==="both"){ const cells=bi===nb-1?[whole]:beats===3?[2,2,2]:srPick(r,[[2,2,2,2],[4,2,2],[4,4]]); const tones=[root,root+(ch===0?4:3)+((ch===0)?0:1),root+7].map(x=>x);
        lh=cells.map((d,i)=>({m:[bi===nb-1?lhT:srPick(r,[root,root+7,root+4,root+7])],d})); }
      else { const cells=bi===nb-1?[whole]:beats===3?[4,2]:[4,4]; lh=cells.map(d=>({m:[root,root+srPick(r,[7,7,9,4])],d})); }
      bars.push({rh:mel[bi],lh}); } }
  else { // jazz levels: chord progressions with symbols
    const prog=srPick(r,L.jazz?[["ii","V","I","I"],["I","vi","ii","V"],["iii","vi","ii","V"],["ii","V","I","VI"]]:[["I","IV","I","V"],["I","vi","ii","V"],["I","I","IV","V"]]);
    const FN={I:[0,"maj7"],ii:[1,"m7"],iii:[2,"m7"],IV:[3,"maj7"],V:[4,"7"],vi:[5,"m7"],VI:[5,"7"]};
    const nm=(m)=>{ const p=srSpell(m,fifths); return p.step+(p.alter===1?"#":p.alter===-1?"b":""); };
    const chordAt=bi=>{ const f=bi===nb-1?"I":prog[bi%prog.length]; const [dg,q]=FN[f]; let root=lhT-12+MAJ[dg]; if(root<40) root+=12; const third=q==="7"||q==="maj7"?4:3, sev=q==="maj7"?11:10; return {root,third,sev,sym:nm(root)+(q==="maj7"?"maj7":q),q}; };
    let prevTop=null, deg=srPick(r,[2,4,7]);
    for(let bi=0;bi<nb;bi++){ const c=chordAt(bi); const cells=bi===nb-1?[8]:srRhythm(r,L.rhy,4);
      const rh=[]; let tpos=0;
      if(L.hands==="comp"){ // both hands comp: RH 3-note shell above, LH root
        const v=[c.root+12+c.third,c.root+12+c.sev,c.root+12+14].map(m=>m+(m<60?12:0)).sort((a,b)=>a-b); while(v[v.length-1]>79) for(let j=0;j<v.length;j++) v[j]-=12; while(v[0]<57) for(let j=0;j<v.length;j++) v[j]+=12;
        const pat=bi===nb-1?[[8,true]]:srPick(r,[[[3,true],[1,true],[4,false]],[[2,true],[1,false],[1,true],[4,false]],[[1,false],[3,true],[4,false]],[[2,true],[2,false],[3,true],[1,false]]]);
        for(const [d,on] of pat) rh.push(on?{m:v,d}:rest(d));
        bars.push({rh,lh:[{m:[c.root],d:4},{m:[c.root+7],d:4}],ch:[{at:0,sym:c.sym}]}); continue; }
      // a line through chord tones on the beat, scale or chromatic steps between
      for(let i=0;i<cells.length;i++){ const onBeat=tpos%2===0; let m;
        const ct=[c.root+12,c.root+12+c.third,c.root+12+7,c.root+12+c.sev].map(x=>x<62?x+12:x);
        if(bi===nb-1) m=ct[0]+(ct[0]<64?12:0);
        else if(onBeat&&r()<.7){ const opts=ct.filter(x=>x!==prevTop); m=prevTop==null?srPick(r,ct):opts.reduce((b,x)=>Math.abs(x-prevTop)<Math.abs(b-prevTop)?x:b); }
        else { const dir=prevTop!=null&&prevTop>76?-1:prevTop!=null&&prevTop<65?1:(r()<.5?1:-1); m=(prevTop??ct[0])+dir*(r()<(L.chromatic||0)?1:srPick(r,[1,2,2]));
          const pcs=MAJ.map(x=>(x+tonic)%12); if(!(r()<(L.chromatic||0))&&!pcs.includes(((m%12)+12)%12)) m+=dir; }
        m=clamp(m,62,81); rh.push({m:[m],d:cells[i]}); prevTop=m; tpos+=cells[i]; }
      // anticipation: tie the last eighth into the next bar now and then
      const lh=L.hands==="shell"?[{m:[c.root,c.root+c.sev-(c.root+c.sev>=60?12:0)].sort((a,b)=>a-b),d:8}]:
        [{m:[c.root+c.third-(c.root+c.third>=58?12:0),c.root+c.sev-(c.root+c.sev>=62?12:0)].sort((a,b)=>a-b),d:8}];
      bars.push({rh,lh,ch:[{at:0,sym:c.sym}]}); }
    title=`Level ${level} · ${SR_NAME[fifths]} major`; }
  return {xml:srXML({title,fifths,beats,bpm:L.bpm,bars}),title,bpm:L.bpm,swing:!!L.swing,level,fifths}; }
function degOf(m,tonic){ const d=m-tonic, oct=Math.floor(d/12), pc=((d%12)+12)%12; const i=MAJ.indexOf(pc); return oct*7+(i<0?MAJ.findIndex(x=>x>pc)-1:i); }
