
"use strict";
const $ = id => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const SAVE_KEY = "gamefootball-manager-worlds-v1";
const PREF_KEY = "gamefootball-manager-settings-v1";
const FORMATIONS = {
  "433":[[.07,.50],[.25,.10],[.23,.37],[.23,.63],[.25,.90],[.47,.26],[.48,.50],[.47,.74],[.75,.12],[.81,.50],[.75,.88]],
  "442":[[.07,.50],[.25,.10],[.23,.37],[.23,.63],[.25,.90],[.51,.10],[.50,.37],[.50,.63],[.51,.90],[.78,.38],[.78,.63]],
  "343":[[.07,.50],[.25,.20],[.23,.50],[.25,.80],[.48,.08],[.47,.35],[.47,.65],[.48,.92],[.78,.17],[.80,.50],[.78,.83]]
};
const OPPONENTS=["ФК Север","Олимпик","Атлетик Восток","ФК Горизонт","Унион"];
let saves=readJSON(SAVE_KEY,[]), prefs=readJSON(PREF_KEY,{reduceMotion:false,showNumbers:true});
let activeId=null, screen="home", previous="home", createMode="coach";
let selected=10, phase="attack", drawing=false, drawMoved=false, drawn=[];
let previewTactics={formation:"433",routes:{},instructions:{}};
let match=null, raf=0, lastFrame=0, saveIdDuringMatch=null, returnFromTactics="career";
function readJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}}
function store(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves))}catch{toast("Не удалось сохранить: браузер ограничивает хранилище")}}
function storePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}}
function active(){return saves.find(w=>w.id===activeId)||null}
function toast(text){const el=$("toast");el.textContent=text;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,2600)}
function updateHeader(){const w=active();$("world-label").textContent=w ? w.name+" · "+w.season+"/"+(w.season+1) : "НОВАЯ ЭПОХА ФУТБОЛА";$("back-btn").hidden=screen==="home"}
function go(target){
 if(!$(target))return;
 if(screen==="match"&&target==="tactics"&&match){match.paused=true;returnFromTactics="match"}
 if(target==="tactics"&&screen!=="match")returnFromTactics=screen==="home"?"home":"career";
 previous=screen;screen=target;
 screens.forEach(el=>el.classList.toggle("active",el.id===target));
 if(target==="saves")renderSaves();
 if(target==="career")renderCareer();
 if(target==="tactics")openTactics();
 if(target==="stats")renderStats();
 if(target==="match"&&!match)beginMatch();
 if(target==="match"&&match){match.paused=false;lastFrame=performance.now()}
 updateHeader();
 window.scrollTo(0,0);
}
document.querySelectorAll("[data-go]").forEach(el=>el.addEventListener("click",()=>go(el.dataset.go)));
$("back-btn").addEventListener("click",()=>{
 if(screen==="tactics"){go(returnFromTactics);return}
 if(screen==="match"&&match){finishMatch(false);return}
 const destinations={play:"home",new:"play",create:"new",saves:"play",career:"saves",stats:"home",settings:"home"};
 go(destinations[screen]||"home");
});
document.querySelectorAll("[data-type]").forEach(el=>el.addEventListener("click",()=>chooseType(el.dataset.type)));
function chooseType(type){
 createMode=type;
 const real=type==="real";
 $("create-title").textContent=type==="coach"?"КАРЬЕРА ТРЕНЕРА":real?"КАРЬЕРА ЛЕГЕНДЫ":"КАРЬЕРА ФУТБОЛИСТА";
 $("create-hint").textContent=type==="coach"?"Создай клуб или впиши название существующего.":real?"Выбери реального футболиста. В прототипе используются только имена, без актуальной лицензированной базы.":"Создай собственного футболиста и начни путь к вершине.";
 $("name-label").textContent=type==="coach"?"Имя тренера":real?"Название сохранения":"Имя игрока";
 $("entry-name").value=real?"Легенда футбола":type==="coach"?"Новый тренер":"Новый талант";
 $("entry-club").value=type==="coach"?"ФК Аврора":"ФК Академия";
 $("club-label").textContent="Клуб в этом мире";
 $("real-select-wrap").hidden=!real;
 go("create");
}
$("world-form").addEventListener("submit",e=>{
 e.preventDefault();
 const chosen=$("real-select").value;
 const name=createMode==="real"?chosen:$("entry-name").value.trim();
 const club=$("entry-club").value.trim();
 if(!name||!club){toast("Заполни имя и название клуба");return}
 const w={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),mode:createMode,name,club,season:2026,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,formation:"433",routes:{},instructions:{},events:[],createdAt:Date.now()};
 saves.unshift(w);activeId=w.id;store();go("career");toast("Новый футбольный мир создан");
});
function renderSaves(){
 const el=$("save-list");el.replaceChildren();
 if(!saves.length){el.innerHTML='<div class="empty">Пока нет сохранений. Создай первую карьеру!</div>';return}
 for(const w of saves){
  const row=document.createElement("div");row.className="save-row";
  const info=document.createElement("div"),title=document.createElement("strong"),detail=document.createElement("small");
  title.textContent=w.name;
  detail.textContent=(w.mode==="coach"?"Тренер":w.mode==="real"?"Реальный футболист":"Свой футболист")+" · "+w.club+" · Сезон "+w.season+"/"+(w.season+1)+" · Матчей: "+w.played;
  info.append(title,detail);
  const buttons=document.createElement("div");buttons.className="row-actions";
  const load=document.createElement("button");load.textContent="ПРОДОЛЖИТЬ";load.onclick=()=>{activeId=w.id;go("career")};
  const del=document.createElement("button");del.textContent="УДАЛИТЬ";del.className="delete";
  del.onclick=()=>{if(!confirm("Удалить карьеру «"+w.name+"»? Это нельзя отменить."))return;saves=saves.filter(s=>s.id!==w.id);if(activeId===w.id)activeId=null;store();renderSaves()};
  buttons.append(load,del);row.append(info,buttons);el.append(row);
 }
}
function renderCareer(){
 const w=active();if(!w){go("saves");return}
 $("career-type").textContent=w.mode==="coach"?"КАРЬЕРА ТРЕНЕРА":w.mode==="real"?"КАРЬЕРА ЗА РЕАЛЬНОГО ФУТБОЛИСТА":"КАРЬЕРА СОЗДАННОГО ИГРОКА";
 $("career-name").textContent=w.name;
 $("career-meta").textContent=w.club+" · Сезон "+w.season+"/"+(w.season+1)+" · Схема "+formationName(w.formation);
 const figures=[["МАТЧИ",w.played],["ПОБЕДЫ",w.wins],["НИЧЬИ",w.draws],["ПОРАЖЕНИЯ",w.losses]];
 $("career-figures").replaceChildren();
 for(const [label,value] of figures){const div=document.createElement("div");div.className="figure";const a=document.createElement("strong");a.textContent=value;const b=document.createElement("span");b.textContent=label;div.append(a,b);$("career-figures").append(div)}
 $("career-about").textContent="Голы: "+w.goalsFor+"–"+w.goalsAgainst+". Каждая карьера имеет собственную историю. Турнирная таблица и реальные составы появятся в следующих версиях.";
 $("career-news").textContent=w.events.length?w.events.slice(0,4).join(" · "):"Твоя история только начинается. Проведи первый матч!";
}
function renderStats(){
 const box=$("stats-list");box.replaceChildren();
 if(!saves.length){box.innerHTML='<div class="empty">Статистика появится после создания карьеры.</div>';return}
 for(const w of saves){const el=document.createElement("div");el.className="save-row";el.textContent=w.name+" · "+w.played+" матчей · "+w.wins+" побед · Голы "+w.goalsFor+":"+w.goalsAgainst;box.append(el)}
}
$("reduce-motion").checked=!!prefs.reduceMotion;
$("show-numbers").checked=prefs.showNumbers!==false;
for(const id of ["reduce-motion","show-numbers"])$(id).onchange=()=>{prefs.reduceMotion=$("reduce-motion").checked;prefs.showNumbers=$("show-numbers").checked;storePrefs();toast("Настройки сохранены")};
function formationName(key){return {"433":"4-3-3","442":"4-4-2","343":"3-4-3"}[key]||"4-3-3"}
function positions(form){return FORMATIONS[form]||FORMATIONS["433"]}
function tacticsData(){return active()||previewTactics}
function pointFor(number,form){
 const p=positions(form)[number-1];
 return {x:55+p[1]*540,y:48+(1-p[0])*660};
}
function routeKey(){return phase+"-"+selected}
function openTactics(){
 const w=tacticsData();$("formation").value=w.formation||"433";$("phase").value=phase;
 if(selected<1||selected>11)selected=10;
 showInstruction();resizeBoard();
}
function resizeBoard(){drawBoard()}
function drawBoard(){
 const canvas=$("tactics-canvas"),ctx=canvas.getContext("2d");
 const W=650,H=760,form=$("formation").value,data=tacticsData();
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle="#23683b";ctx.fillRect(0,0,W,H);
 for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#fff0":"#ffffff09";ctx.fillRect(0,i*76,W,76)}
 ctx.strokeStyle="#dcebd6c9";ctx.lineWidth=2;ctx.strokeRect(26,26,W-52,H-52);
 ctx.beginPath();ctx.moveTo(26,H/2);ctx.lineTo(W-26,H/2);ctx.stroke();
 ctx.beginPath();ctx.ellipse(W/2,H/2,65,65,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(200,26,250,113);ctx.strokeRect(247,26,156,47);
 ctx.strokeRect(200,H-139,250,113);ctx.strokeRect(247,H-73,156,47);
 ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.fillStyle="#e3f4e6";ctx.fillText("АТАКА ↑",W/2,18);
 for(let n=1;n<=11;n++){
  const p=pointFor(n,form),key=phase+"-"+n,routes=n===selected&&drawing&&drawMoved?drawn:data.routes[key]||[];
  if(routes.length){
   ctx.strokeStyle=n===selected?"#ffe08b":"#d6f0a89a";ctx.lineWidth=n===selected?5:3;ctx.setLineDash([10,6]);ctx.beginPath();ctx.moveTo(p.x,p.y);
   for(const q of routes)ctx.lineTo(q[0]*W,q[1]*H);ctx.stroke();ctx.setLineDash([]);
   const last=routes[routes.length-1];ctx.fillStyle="#ffe08b";ctx.beginPath();ctx.arc(last[0]*W,last[1]*H,6,0,Math.PI*2);ctx.fill();
  }
  if(n===selected){ctx.strokeStyle="#ffdc79";ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,25,0,Math.PI*2);ctx.stroke()}
  ctx.beginPath();ctx.fillStyle="#f0f5ff";ctx.strokeStyle="#1e416c";ctx.lineWidth=3;ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#122f54";ctx.font="bold 18px system-ui";ctx.textAlign="center";ctx.fillText(String(n),p.x,p.y+6);
 }
 $("selected-player").textContent="№ "+selected;
}
const board=$("tactics-canvas");
function boardPoint(evt){
 const r=board.getBoundingClientRect();
 return {x:Math.max(26,Math.min(624,(evt.clientX-r.left)*650/r.width)),y:Math.max(26,Math.min(734,(evt.clientY-r.top)*760/r.height))};
}
board.addEventListener("pointerdown",e=>{
 e.preventDefault();
 const p=boardPoint(e);let nearest=0,min=1e8;
 for(let n=1;n<=11;n++){const q=pointFor(n,$("formation").value),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<min){min=d;nearest=n}}
 if(min<31){selected=nearest;showInstruction()}
 drawing=true;drawMoved=false;drawn=[];board.setPointerCapture(e.pointerId);drawBoard();
});
board.addEventListener("pointermove",e=>{
 if(!drawing)return;
 const p=boardPoint(e),last=drawn[drawn.length-1];
 if(!last||Math.hypot(last[0]*650-p.x,last[1]*760-p.y)>11){drawn.push([p.x/650,p.y/760]);if(drawn.length>45)drawn.shift();drawMoved=true;drawBoard()}
});
board.addEventListener("pointerup",e=>{
 if(!drawing)return;
 if(!drawMoved){
  const p=boardPoint(e),q=pointFor(selected,$("formation").value);
  if(Math.hypot(p.x-q.x,p.y-q.y)>30)drawn=[[p.x/650,p.y/760]];
 }
 if(drawn.length)tacticsData().routes[routeKey()]=drawn.slice();
 drawing=false;drawMoved=false;drawn=[];drawBoard();
});
board.addEventListener("pointercancel",()=>{drawing=false;drawn=[];drawBoard()});
$("formation").onchange=()=>{tacticsData().formation=$("formation").value;drawBoard()};
$("phase").onchange=()=>{phase=$("phase").value;drawBoard()};
function showInstruction(){
 const data=tacticsData(),item=data.instructions[selected]||{pressing:"normal",passing:"mixed"};
 $("pressing").value=item.pressing;$("passing").value=item.passing;drawBoard();
}
for(const id of ["pressing","passing"])$(id).onchange=()=>{
 tacticsData().instructions[selected]={pressing:$("pressing").value,passing:$("passing").value};
};
$("clear-route").onclick=()=>{delete tacticsData().routes[routeKey()];drawBoard()};
$("save-tactics").onclick=()=>{
 const w=active();if(w)store();
 toast(w?"Тактика сохранена в карьере":"Тактика сохранена для предпросмотра");
};
function initPlayers(form,team){
 return positions(form).map((p,i)=>{
  const x=team===0?90+p[0]*820:910-p[0]*820;
  const y=35+p[1]*520;
  return {number:i+1,team,x,y,homeX:x,homeY:y,hasBall:false,energy:1};
 });
}
function beginMatch(){
 const w=active();if(!w){go("saves");return}
 const opponent=OPPONENTS[w.played%OPPONENTS.length];
 match={home:initPlayers(w.formation,0),away:initPlayers("442",1),ball:{x:500,y:295,vx:0,vy:0},owner:{team:0,idx:9},score:[0,0],elapsed:0,paused:false,speed:1,actionTimer:1.1,events:[],eventsTimer:0,opponent,formation:w.formation,completed:false};
 saveIdDuringMatch=w.id;
 $("match-fixture").textContent=w.club+" — "+opponent;
 $("match-formation").value=w.formation;$("match-speed").value="1";$("match-pause").textContent="ПАУЗА";
 addEvent("Начало матча. Команды вышли на поле.");updateScore();
 if(!raf){lastFrame=performance.now();raf=requestAnimationFrame(frame)}
}
function addEvent(s){
 if(!match)return;
 const minute=Math.min(90,Math.floor(match.elapsed/60)),line=String(minute)+"' "+s;
 match.events.unshift(line);match.events=match.events.slice(0,7);
 const el=$("match-events");el.replaceChildren();
 for(const item of match.events){const p=document.createElement("p");p.textContent=item;el.append(p)}
}
function updateScore(){
 if(!match)return;
 $("match-score").textContent=match.score[0]+" : "+match.score[1];
 $("match-minute").textContent=String(Math.min(90,Math.floor(match.elapsed/60))).padStart(2,"0")+"'";
}
function reposition(){
 if(!match)return;
 const coords=initPlayers(match.formation,0);
 match.home.forEach((p,i)=>{p.homeX=coords[i].homeX;p.homeY=coords[i].homeY});
}
$("match-formation").onchange=()=>{
 if(!match)return;
 match.formation=$("match-formation").value;const w=active();if(w){w.formation=match.formation;store()}reposition();addEvent("Тренер меняет расстановку на "+formationName(match.formation)+".");
};
$("match-speed").onchange=()=>{if(match)match.speed=Number($("match-speed").value)};
$("match-pause").onclick=()=>{if(!match)return;match.paused=!match.paused;$("match-pause").textContent=match.paused?"ПРОДОЛЖИТЬ":"ПАУЗА"};
$("match-edit").onclick=()=>{if(match)go("tactics")};
$("end-match").onclick=()=>{if(match){if(confirm("Выйти из матча? Незавершённый результат не сохранится."))finishMatch(false)}else go("career")};
function finishMatch(record){
 if(match&&record&&!match.completed){
  match.completed=true;
  const w=saves.find(s=>s.id===saveIdDuringMatch);
  if(w){const a=match.score[0],b=match.score[1];w.played++;w.goalsFor+=a;w.goalsAgainst+=b;
   if(a>b)w.wins++;else if(a===b)w.draws++;else w.losses++;
   w.events.unshift(w.club+" "+a+":"+b+" "+match.opponent);w.events=w.events.slice(0,12);store();
  }
 }
 match=null;saveIdDuringMatch=null;go("career");
}
function frame(now){
 const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(match&&!match.paused&&screen==="match"){step(dt*match.speed);if(match)drawMatch()}
 else if(match&&screen==="match")drawMatch();
 raf=requestAnimationFrame(frame);
}
function bound(v,min,max){return Math.max(min,Math.min(max,v))}
function move(p,x,y,dt,speed){
 const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
 if(d>1){const m=Math.min(d,dt*speed);p.x+=dx/d*m;p.y+=dy/d*m}
 p.x=bound(p.x,34,966);p.y=bound(p.y,34,556);
}
function step(dt){
 if(!match)return;
 const m=match;m.elapsed=Math.min(5400,m.elapsed+dt*52);
 // Tactical rearrangement is continuous, never a teleport.
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  for(let i=0;i<list.length;i++){
   const p=list[i];let gx=p.homeX,gy=p.homeY;
   if(m.owner&&m.owner.team!==team&&i>0){
    const d=Math.hypot(p.x-m.ball.x,p.y-m.ball.y);
    const nearest=list.slice(1).reduce((a,b)=>Math.hypot(a.x-m.ball.x,a.y-m.ball.y)<Math.hypot(b.x-m.ball.x,b.y-m.ball.y)?a:b);
    if(p===nearest){gx=m.ball.x;gy=m.ball.y}
    else{gx+=(m.ball.x-500)*.08;gy+=(m.ball.y-295)*.09}
   }
   if(m.owner&&m.owner.team===team&&m.owner.idx===i){
    const forward=team===0?1:-1;gx=bound(p.x+forward*85,48,952);gy=p.y+Math.sin(m.elapsed/15+i)*14;
   }else if(m.owner&&m.owner.team===team){gx+=(m.ball.x-500)*.07;gy+=(m.ball.y-295)*.09}
   // Route endpoints bias positioning only, while the player maintains formation.
   if(team===0){
    const w=active(),route=w&&w.routes["attack-"+p.number];
    if(route&&route.length&&m.owner&&m.owner.team===0){const q=route[route.length-1];gx=gx*.88+((1-q[1])*900+50)*.12;gy=gy*.88+(q[0]*520+35)*.12}
   }
   const ins=team===0?(active()?.instructions[p.number]||{}):{};
   const speed=i===0?55:(ins.pressing==="high"?119:ins.pressing==="low"?85:100);
   move(p,gx,gy,dt,speed);
  }
 }
 const owner=m.owner&& (m.owner.team===0?m.home:m.away)[m.owner.idx];
 if(owner){m.ball.x+=(owner.x-m.ball.x)*Math.min(1,dt*9);m.ball.y+=(owner.y-m.ball.y)*Math.min(1,dt*9)}
 m.actionTimer-=dt;
 if(m.actionTimer<=0){performAction();m.actionTimer=.85+Math.random()*1.7}
 m.eventsTimer-=dt;
 if(m.eventsTimer<=0){m.eventsTimer=4+Math.random()*9;incident()}
 if(m.elapsed>=2700&&!m.halftime){m.halftime=true;m.paused=true;$("match-pause").textContent="НАЧАТЬ 2-Й ТАЙМ";addEvent("Перерыв. Матч остановлен для тренерских решений.")}
 if(m.elapsed>=5400){addEvent("Финальный свисток.");finishMatch(true);return}
 updateScore();
}
function performAction(){
 const m=match;if(!m||!m.owner)return;
 const team=m.owner.team,players=team===0?m.home:m.away,opps=team===0?m.away:m.home;
 const idx=m.owner.idx,ballCarrier=players[idx];
 // Attack progresses through passes to teammates, with occasional interceptions.
 const dist=team===0?1000-ballCarrier.x:ballCarrier.x;
 if(dist<230&&Math.random()<.68){
  const onTarget=Math.random()<.47;
  if(onTarget&&Math.random()<.35){m.score[team]++;addEvent("ГОЛ! Точный удар команды "+(team===0?"хозяев":"гостей")+"!");m.owner={team:1-team,idx:9};}
  else{addEvent(onTarget?"Вратарь отражает удар!":"Удар рядом с воротами. Удар от ворот.");m.owner={team:1-team,idx:Math.floor(1+Math.random()*10)};}
  updateScore();return;
 }
 if(Math.random()<.16){m.owner={team:1-team,idx:1+Math.floor(Math.random()*10)};addEvent("Перехват передачи.");return}
 const passing=team===0?(active()?.instructions[ballCarrier.number]?.passing||"mixed"):"mixed";
 const candidates=players.map((p,i)=>{const distance=Math.hypot(p.x-ballCarrier.x,p.y-ballCarrier.y);let score=(team===0?p.x:-p.x)+Math.random()*180;
  if(passing==="short")score-=distance*1.7;
  if(passing==="long")score+=distance*.55;
  return {p,i,score};}).filter(x=>x.i>0&&x.i!==idx);
 candidates.sort((a,b)=>b.score-a.score);
 m.owner={team,idx:candidates[Math.floor(Math.random()*Math.min(4,candidates.length))].i};
 if(Math.random()<.18)addEvent("Быстрая передача и смена направления атаки.");
}
function incident(){
 if(!match||Math.random()>.26)return;
 const dice=Math.random();
 if(dice<.42){addEvent("Свисток! Нарушение правил, штрафной удар.");
   if(Math.random()<.05){addEvent("Стычка после грубого фола! Судья успокаивает игроков.");if(Math.random()<.30)addEvent("Жёлтая карточка за неспортивное поведение.");}
 }else if(dice<.62){addEvent("Жёлтая карточка за грубую игру.");}
 else if(dice<.78){addEvent("Положение вне игры. Свободный удар.");}
 else if(dice<.91){addEvent("Угловой. Игроки занимают места в штрафной.");}
 else{addEvent("Игрок получил повреждение. Врач осматривает футболиста.")}
}
function drawMatch(){
 const cv=$("match-canvas"),ctx=cv.getContext("2d"),W=cv.width,H=cv.height,m=match;if(!m)return;
 ctx.fillStyle="#246f3b";ctx.fillRect(0,0,W,H);
 for(let x=0;x<10;x++){ctx.fillStyle=x%2?"#ffffff09":"#0000000b";ctx.fillRect(x*100,0,100,H)}
 ctx.strokeStyle="#d7f0d8cc";ctx.lineWidth=2;ctx.strokeRect(20,20,960,550);
 ctx.beginPath();ctx.moveTo(500,20);ctx.lineTo(500,570);ctx.stroke();
 ctx.beginPath();ctx.arc(500,295,75,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(20,165,130,260);ctx.strokeRect(850,165,130,260);
 ctx.strokeRect(20,223,52,145);ctx.strokeRect(928,223,52,145);
 ctx.fillStyle="#e3eddf";ctx.fillRect(7,247,13,96);ctx.fillRect(980,247,13,96);
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  for(const p of list){
   ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="#0005";ctx.beginPath();ctx.ellipse(0,13,11,5,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=team===0?"#eef4ff":"#e8bdc3";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-5,13);ctx.moveTo(4,7);ctx.lineTo(5,13);ctx.stroke();
   ctx.beginPath();ctx.fillStyle=team===0?"#eef3fb":"#b53140";ctx.strokeStyle=team===0?"#204db5":"#f1dee1";ctx.lineWidth=2;ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(prefs.showNumbers){ctx.fillStyle=team===0?"#153884":"white";ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText(p.number,0,3)}
   ctx.restore();
  }
 }
 ctx.fillStyle="#fff";ctx.strokeStyle="#172b27";ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.ball.x,m.ball.y,5.2,0,Math.PI*2);ctx.fill();ctx.stroke();
}
window.addEventListener("resize",()=>{if(screen==="tactics")drawBoard()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&screen!=="home")$("back-btn").click()});
go("home");
