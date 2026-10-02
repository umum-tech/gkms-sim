"use strict";
// データの置き場所（index.html からの相対パス）。GitHub Pages ではリポジトリ内の data/ を参照する。
const DATA_FILES={cards:"data/support-cards.csv",idols:"data/idols.csv"};

const T=["Vo","Da","Vi"];
const LESSON=[["選抜試験","2日目",50,10,60,20],["選抜試験","4日目",60,20,80,50],["選抜試験","9日目",70,10,80,20],["選抜試験","11日目",80,30,100,60],["選抜試験","15日目",90,10,100,20],["選抜試験","18日目",100,40,120,70],["本選","2日目",110,10,120,20],["本選","5日目",120,50,140,80]];
const CLASS=[["選抜試験","3日目",120],["選抜試験","6日目",120],["選抜試験","10日目",150],["選抜試験","17日目",150],["本選","1日目",180],["本選","4日目",180]];
const EXAM=[["選抜試験1",20,80],["選抜試験2",80,200],["選抜試験3",100,220]];
const R1={th:[300000,700000,1000000,1200000,1400000],rate:[0.01,0.003,0.002,0.001]};
const R2={th:[600000,900000,1500000,2000000,2400000],rate:[0.004,0.008,0.002,0.001]};
const RANK=[[0,"F"],[1000,"E"],[2000,"D"],[3000,"C"],[4500,"C+"],[6000,"B"],[8000,"B+"],[10000,"A"],[11500,"A+"],[13000,"S"],[14500,"S+"],[16000,"SS"],[18000,"SS+"],[20000,"SSS"],[23000,"SSS+"],[26000,"S4"],[30000,"S4+"],[35000,"S5"]];
const fl=x=>Math.floor(x+1e-9);
const num=v=>{const n=typeof v==="number"?v:parseFloat(String(v??"").replace(/[,%％]/g,""));return isFinite(n)?n:0;};
function roundEval(s,R){let x=0;for(let i=0;i<R.rate.length;i++){const lo=R.th[i],hi=R.th[i+1];if(s>lo)x+=R.rate[i]*(Math.min(s,hi)-lo);}return Math.floor(Math.round(x*1e6)/1e6);}
function autoCount(name,st){
 const L=st.lessons.map(l=>l.m),K=st.sched;const cL=v=>L.filter(x=>x===v).length,cK=v=>K.filter(x=>x===v).length;
 let m=name.match(/^(Vo|Da|Vi)SP終了時$/);if(m)return cL(m[1]+"SP");
 m=name.match(/^(Vo|Da|Vi)レス終了時$/);if(m)return cL(m[1])+cL(m[1]+"SP");
 m=name.match(/^(Vo|Da|Vi)通常終了時$/);if(m)return cL(m[1]);
 const A={"活動支給差し入れ選択時":["差し入れ"],"授業営業終了時":["授業"],"お出かけ終了時":["おでかけ"],"相談選択時":["相談"],"休む選択時":["休む"],"試験・オデ終了時（2回のみ）":["試験",2],"特別指導開始時（3回のみ）":["特別指導",3],"活動支給差し入れ選択時（2回のみ）":["差し入れ",2],"相談選択時（2回のみ）":["相談",2],"お出かけ終了時（2回のみ）":["おでかけ",2]}[name];
 if(A)return A[1]?Math.min(cK(A[0]),A[1]):cK(A[0]);
 return null;}
function compute(st,D){
 const idol=D.idols.find(i=>i.name===st.idol)||{init:[0,0,0],par:[0,0,0],par3:[0,0,0]};
 const cards=st.cards.map(n=>D.cards.find(c=>c.name===n)).filter(Boolean);
 const cnt={};D.conds.forEach(c=>{const a=autoCount(c,st);cnt[c]=a!==null?a:num(st.counts[c]);});
 const r={cnt,auto:{},used:{}};D.conds.forEach(c=>{r.auto[c]=autoCount(c,st)!==null;r.used[c]=cards.some(k=>num(k.cond[c])>0||k.ev1c===c);});
 r.cardRows=cards.map(k=>{let s=num(k.ev2);D.conds.forEach(c=>s+=num(k.cond[c])*cnt[c]);s+=k.ev1c?num(k.ev1)*(cnt[k.ev1c]||0):num(k.ev1);return {name:k.name,plan:k.plan,sum:s};});
 r.start=[0,0,0];r.par=[0,0,0];r.exp=[0,0,0];r.sp=[0,0,0];
 T.forEach((t,i)=>{const sI=cards.filter(k=>k.plan===t).reduce((a,k)=>a+num(k.init),0),sP=cards.filter(k=>k.plan===t).reduce((a,k)=>a+num(k.par),0);
  const mI=st.mem.reduce((a,m)=>a+num(m[i]),0),mP=st.mem.reduce((a,m)=>a+num(m[3+i]),0);
  r.start[i]=idol.init[i]+sI+mI+num(st.hif[i]);
  r.par[i]=((st.bloom?idol.par3[i]:idol.par[i])+sP+mP+num(st.hif[3+i]))/100;
  r.exp[i]=r.start[i]+r.cardRows.filter(k=>k.plan===t).reduce((a,k)=>a+k.sum,0);
  r.sp[i]=num(st.spBase)+cards.reduce((a,k)=>a+num(k.sp[i]),0);});
 r.lesson=LESSON.map((l,j)=>{const h=st.lessons[j].m,s=st.lessons[j].s,sp=/SP$/.test(h);return T.map((t,i)=>fl(((h===t?l[2]:0)+(h===t+"SP"?l[4]:0)+(s===t?(sp?l[5]:l[3]):0))*(1+r.par[i])));});
 r.cls=CLASS.map((c,j)=>T.map(t=>st.classes[j]===t?c[2]:0));
 r.exam=EXAM.map((e,j)=>T.map((t,i)=>{const x=e[1]+(st.exams[j]===t?e[2]:0);return x+fl(x*r.par[i]);}));
 const sum=(M,i)=>M.reduce((a,row)=>a+row[i],0);
 r.param=T.map((t,i)=>r.exp[i]+sum(r.lesson,i)+sum(r.cls,i)+sum(r.exam,i));
 r.total=r.param.reduce((a,b)=>a+b,0);
 r.e1=roundEval(num(st.r1),R1);r.e2=roundEval(num(st.r2),R2);
 r.score=r.total*2+num(st.star)*7.5+r.e1+r.e2-2000;
 r.rank=RANK.filter(x=>r.score>=x[0]).pop()?.[1]||"";
 return r;}
const SCHED=[["選抜試験",1,["相談","差し入れ","特別指導"]],["選抜試験",2,["公開レッスン"]],["選抜試験",3,["授業"]],["選抜試験",4,["公開レッスン"]],["選抜試験",5,["おでかけ","相談"]],["選抜試験",6,["授業"]],["選抜試験",7,["試験"]],["選抜試験",8,["おでかけ","差し入れ"]],["選抜試験",9,["公開レッスン"]],["選抜試験",10,["授業"]],["選抜試験",11,["公開レッスン"]],["選抜試験",12,["相談","特別指導"]],["選抜試験",13,["試験"]],["選抜試験",14,["おでかけ","差し入れ"]],["選抜試験",15,["公開レッスン"]],["選抜試験",16,["おでかけ","相談","差し入れ"]],["選抜試験",17,["授業"]],["選抜試験",18,["公開レッスン"]],["選抜試験",19,["相談","特別指導"]],["選抜試験",20,["試験"]],["本選",1,["授業"]],["本選",2,["公開レッスン"]],["本選",3,["おでかけ","差し入れ"]],["本選",4,["授業"]],["本選",5,["公開レッスン"]],["本選",6,["相談"]],["本選",7,["試験"]]];
const DEF_COUNTS={"SP終了時デッキ20枚以上（4回のみ）":4,"相談Pドリンク交換後":15,"スキル削除時":6,"スキル強化時":10,"スキル（SSR）獲得時":20,"スキル獲得時":10,"スキルカスタム時（6回のみ）":6,"スキルチェンジ時（3回のみ）":3,"メンタル獲得時":10,"メンタル強化時":5,"メンタル削除時（3回のみ）":3,"アクティブ獲得時":10,"アクティブ強化時":5,"アクティブ削除時（3回のみ）":3,"好印象カード獲得時":10,"温存カード獲得時":10,"元気カード獲得時":10,"好調カード獲得時":10,"集中カード獲得時":10,"やる気カード獲得時":10,"Pアイテム獲得時（6回のみ）":6,"Pドリンク獲得時":30,"強気カード獲得時":10,"全力カード獲得時":10,"相談スキル交換後（5回のみ）":5,"基本チェンジ時（3回のみ）":3,"試験・オデ終了時デッキ15枚以上（5回のみ）":5,"スキル削除時（4回のみ）":4};
const DEF={idol:"花海咲季",bloom:true,cards:["いつまでも続けばいいのに","もうすぐ本番ですね","そろそろ焼けたかな？","上かッ！！","やっと見つけたぞ！","進化したお弁当、気になる"],
mem:[["","","","","2.8","2.8"],["20","","","","2.8","3.5"],["20","","","","2.8","2.8"],["15","","","","3.5","2.8"]],hif:[100,100,100,10,10,10],spBase:20,
lessons:[["DaSP","Vo"],["DaSP","Vo"],["DaSP","Vi"],["DaSP","Vi"],["DaSP","Vi"],["DaSP","Vi"],["DaSP","Vi"],["ViSP","Da"]].map(([m,s])=>({m,s})),
classes:["Vi","Vi","Vo","Vo","Vo","Vo"],exams:["Vi","Vi","Vi"],
sched:["差し入れ","公開レッスン","授業","公開レッスン","おでかけ","授業","試験","差し入れ","公開レッスン","授業","公開レッスン","相談","試験","差し入れ","公開レッスン","差し入れ","授業","公開レッスン","相談","試験","授業","公開レッスン","差し入れ","授業","公開レッスン","相談","試験"],
counts:DEF_COUNTS,star:1335,r1:1400000,r2:2400000};

const STATE_KEY="pcalc_state";
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
let D={cards:[],idols:[],conds:[]};
let st=Object.assign(structuredClone(DEF),JSON.parse(store.get(STATE_KEY)||"{}"));
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const opt=(arr,v)=>arr.map(a=>`<option${String(a)===String(v)?" selected":""}>${esc(a)}</option>`).join("");
const tc=i=>["vo","da","vi"][i];

// ---- CSV 読込 ----
function parseCSV(t){const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];
 if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;}
 else if(c=='"')q=true;else if(c==','){row.push(f);f="";}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);rows.push(row);row=[];f="";}else f+=c;}
 if(f!==""||row.length){row.push(f);rows.push(row);}return rows;}
function decode(buf){try{return new TextDecoder("utf-8",{fatal:true}).decode(buf).replace(/^﻿/,"");}catch(e){return new TextDecoder("shift_jis").decode(buf);}}
function parseCards(rows){const H=rows[0];if(!H||!H.includes("name")||!H.includes("sum"))return null;
 const ix=n=>H.indexOf(n);const c0=ix("ability_5")+1,c1=ix("VoSP率+");const conds=H.slice(c0,c1);
 const cards=rows.slice(1).filter(r=>r[0]).map(r=>({name:r[0],plan:r[ix("plan")],ev1:r[ix("event_1")],ev1c:r[ix("event_1_条件")]||"",ev2:r[ix("event_2")],init:r[ix("ability_1_初期値")],par:r[ix("ability_1_パラボ")],cond:Object.fromEntries(conds.map((c,j)=>[c,r[c0+j]]).filter(x=>num(x[1])!==0)),sp:[r[c1],r[c1+1],r[c1+2]]}));
 return {cards,conds};}
function parseIdols(rows){const idols=rows.filter(r=>r[0]&&r[0]!=="-"&&isFinite(parseFloat(r[1]))).map(r=>({name:r[0],init:r.slice(1,4).map(num),par:r.slice(4,7).map(num),par3:r.slice(7,10).map(num)}));
 return idols.length?idols:null;}
function applyRows(rows,label){const c=parseCards(rows);if(c){D.cards=c.cards;D.conds=c.conds;return `サポートカード ${c.cards.length}枚`;}
 const i=parseIdols(rows);if(i){D.idols=i;return `アイドル ${i.length}人`;}
 throw new Error(`${label}: 形式を判別できません`);}

async function loadRemote(){
 const status=$("dataStatus");
 try{
  for(const [key,path] of Object.entries(DATA_FILES)){
   const res=await fetch(path,{cache:"no-cache"});
   if(!res.ok)throw new Error(`${path} の取得に失敗 (HTTP ${res.status})`);
   applyRows(parseCSV(decode(await res.arrayBuffer())),path);}
  status.classList.remove("error");
 }catch(e){
  status.classList.add("error");
  status.textContent=location.protocol==="file:"?"ローカルファイルでは自動読込できません（README参照）":"データ読込エラー";
  $("err").textContent=e.message;console.error(e);
 }
 build();}

$("file").onchange=async e=>{const msg=[];
 for(const f of e.target.files){try{msg.push(applyRows(parseCSV(decode(await f.arrayBuffer())),f.name));}catch(err){msg.push(err.message);}}
 alert("読込: "+msg.join(" / "));build();};

$("reset").onclick=()=>{if(!confirm("入力内容を初期値に戻しますか？"))return;store.del(STATE_KEY);st=structuredClone(DEF);build();};

// ---- 画面構築 ----
function build(){
 if(D.cards.length||D.idols.length)$("dataStatus").textContent=`サポートカード ${D.cards.length}枚 / アイドル ${D.idols.length}人`;
 $("idol").innerHTML=opt(["",...D.idols.map(i=>i.name)],st.idol);$("bloom").checked=st.bloom;
 $("cardList").innerHTML=D.cards.map(c=>`<option value="${esc(c.name)}">`).join("");
 $("cardTbl").tBodies[0].innerHTML=st.cards.map((c,j)=>`<tr><td><input list="cardList" data-k="card" data-j="${j}" value="${esc(c)}"></td><td id="ct${j}"></td><td id="cs${j}"></td></tr>`).join("");
 $("spBase").value=st.spBase;
 $("memTbl").tBodies[0].innerHTML=st.mem.map((m,j)=>`<tr><td class="l">${j+1}</td>`+m.map((v,i)=>`<td><select data-k="mem" data-j="${j}" data-i="${i}">${opt(i<3?["",10,15,20,25]:["",1.4,2.1,2.8,3.5],v)}</select></td>`).join("")+"</tr>").join("");
 $("hifRow").innerHTML=st.hif.map((v,i)=>`<td><input type="number" step="0.1" data-k="hif" data-i="${i}" value="${esc(v)}"></td>`).join("");
 $("lesTbl").tBodies[0].innerHTML=LESSON.map((l,j)=>`<tr><td class="l">${l[0]}</td><td class="l">${l[1]}</td><td><select data-k="lm" data-j="${j}">${opt(["-","Vo","Da","Vi","VoSP","DaSP","ViSP"],st.lessons[j].m)}</select></td><td><select data-k="ls" data-j="${j}">${opt(["-","Vo","Da","Vi"],st.lessons[j].s)}</select></td><td id="l${j}_0"></td><td id="l${j}_1"></td><td id="l${j}_2"></td></tr>`).join("");
 $("clsTbl").tBodies[0].innerHTML=CLASS.map((c,j)=>`<tr><td class="l">${c[0]}</td><td class="l">${c[1]}</td><td><select data-k="cls" data-j="${j}">${opt(["-","Vo","Da","Vi"],st.classes[j])}</select></td><td id="c${j}_0"></td><td id="c${j}_1"></td><td id="c${j}_2"></td></tr>`).join("");
 $("exTbl").tBodies[0].innerHTML=EXAM.map((e,j)=>`<tr><td class="l">${e[0]}</td><td><select data-k="ex" data-j="${j}">${opt(["-","Vo","Da","Vi"],st.exams[j])}</select></td><td id="e${j}_0"></td><td id="e${j}_1"></td><td id="e${j}_2"></td></tr>`).join("");
 $("star").value=st.star;$("r1").value=st.r1;$("r2").value=st.r2;
 $("schTbl").tBodies[0].innerHTML=SCHED.map((s,j)=>{if(s[2].length===1)st.sched[j]=s[2][0];else if(!s[2].includes(st.sched[j]))st.sched[j]="";
  return `<tr><td class="l">${s[0]}</td><td class="l">${s[1]}</td><td>${s[2].length===1?s[2][0]:`<select data-k="sch" data-j="${j}">${opt(["",...s[2]],st.sched[j])}</select>`}</td></tr>`;}).join("");
 $("condTbl").tBodies[0].innerHTML=D.conds.map(c=>{if(st.counts[c]===undefined){const m=c.match(/（(\d+)回のみ）/);st.counts[c]=m?+m[1]:10;}
  return `<tr data-c="${esc(c)}"><td class="l">${esc(c)}</td><td><input type="number" data-k="cnt" data-c="${esc(c)}" value="${esc(st.counts[c])}"></td><td class="u"></td></tr>`;}).join("");
 calc();}

document.addEventListener("input",e=>{const t=e.target,k=t.dataset.k,j=+t.dataset.j,i=+t.dataset.i;
 if(t.id==="idol")st.idol=t.value;else if(t.id==="bloom")st.bloom=t.checked;else if(t.id==="spBase")st.spBase=t.value;
 else if(["star","r1","r2"].includes(t.id))st[t.id]=t.value;
 else if(k==="card")st.cards[j]=t.value;else if(k==="mem")st.mem[j][i]=t.value;else if(k==="hif")st.hif[i]=t.value;
 else if(k==="lm")st.lessons[j].m=t.value;else if(k==="ls")st.lessons[j].s=t.value;else if(k==="cls")st.classes[j]=t.value;
 else if(k==="ex")st.exams[j]=t.value;else if(k==="sch")st.sched[j]=t.value;else if(k==="cnt")st.counts[t.dataset.c]=t.value;else return;
 calc();});
document.addEventListener("change",e=>{if(e.target.id==="bloom"){st.bloom=e.target.checked;calc();}});

function calc(){store.set(STATE_KEY,JSON.stringify(st));
 if(!D.cards.length||!D.idols.length){if(!$("err").textContent)$("err").textContent="CSVデータがまだ読み込まれていません。";return;}
 const r=compute(st,D);$("err").textContent="";
 st.cards.forEach((n,j)=>{const k=r.cardRows.find(x=>x.name===n);$("ct"+j).textContent=k?k.plan:(n?"未登録":"");$("ct"+j).className=k?tc(T.indexOf(k.plan)):"";$("cs"+j).textContent=k?k.sum:"";});
 for(let j=0;j<LESSON.length;j++)for(let i=0;i<3;i++)$(`l${j}_${i}`).textContent=r.lesson[j][i]||"";
 for(let j=0;j<CLASS.length;j++)for(let i=0;i<3;i++)$(`c${j}_${i}`).textContent=r.cls[j][i]||"";
 for(let j=0;j<EXAM.length;j++)for(let i=0;i<3;i++)$(`e${j}_${i}`).textContent=r.exam[j][i];
 document.querySelectorAll("#condTbl tbody tr").forEach(tr=>{const c=tr.dataset.c,inp=tr.querySelector("input");
  if(r.auto[c]){inp.value=r.cnt[c];inp.readOnly=true;inp.className="auto";}else{inp.readOnly=false;inp.className="";}
  tr.querySelector(".u").textContent=r.used[c]?"○":"";tr.classList.toggle("unused",!r.used[c]);});
 const sm=M=>[0,1,2].map(i=>M.reduce((a,x)=>a+x[i],0));
 const row=(lab,v,f=x=>x)=>`<tr><td class="l">${lab}</td>${v.map(x=>`<td>${f(x)}</td>`).join("")}</tr>`;
 $("resTbl").innerHTML=`<tr><th></th><th class="vo">Vo</th><th class="da">Da</th><th class="vi">Vi</th></tr>`+
  row("開始時",r.start)+row("パラボ",r.par,x=>(x*100).toFixed(1)+"%")+row("サポカ見込み",r.exp)+row("SP発生率",r.sp,x=>(+x).toFixed(1)+"%")+
  row("レッスン",sm(r.lesson))+row("授業",sm(r.cls))+row("試験",sm(r.exam))+
  `<tr class="tot"><td class="l">パラメータ</td>${r.param.map(x=>`<td>${x}</td>`).join("")}</tr>`+
  `<tr><td class="l">合計</td><td colspan="3">${r.total.toLocaleString()}</td></tr>`+
  `<tr><td class="l">本選評価値</td><td colspan="3">R1 ${r.e1.toLocaleString()} + R2 ${r.e2.toLocaleString()}</td></tr>`;
 $("score").textContent=r.score.toLocaleString();$("rank").textContent=r.rank;}

build();
loadRemote();
