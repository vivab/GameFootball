import {PLAYER_SKILLS,makePlayerProfile,ensurePlayerProfile,playerOverall,training,matchProgress,availableOffers,acceptOffer,positionIndex,positionLabel,xpLevel} from "./player-career.js";
import {FIELD,normalizeDirection,shootBall,advanceBall} from "./highlights.js";
import {makeDecisions,getDecisionOptions,evaluateChoice} from "./decision-engine.js";
import {ensureManagement,getNextOpponent,finishCoachMatch,stadiumCapacity} from "./management.js";
import {initCoachUI} from "./coach-ui.js";
import {getEuropeanLeague} from "./europe-data.js";
import {arrangeDecision,tickSpectator,beginResolution,tickResolution} from "./spectator-engine.js";
import {initWorldUI} from "./world-ui.js";

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
const OPPONENTS=["Команда 01","Команда 02","Команда 03","Команда 04","Команда 05"];
let saves=readJSON(SAVE_KEY,[]), prefs=readJSON(PREF_KEY,{reduceMotion:false,showNumbers:true});
// The removed real-athlete mode is no longer offered. Existing user saves remain readable.
saves=saves.map(w=>w.mode==="real"?{...w,mode:"custom"}:w);
let activeId=null, screen="home", previous="home", createMode="coach";
let selected=10, phase="attack", drawing=false, drawMoved=false, drawn=[];
let previewTactics={formation:"433",routes:{},instructions:{}};
let match=null, raf=0, lastFrame=0, saveIdDuringMatch=null, returnFromTactics="career";
const worldUI=initWorldUI();
const coachUI=initCoachUI({getActive:active,save:store,toast,go});
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
 if(target==="world")worldUI.openWorld().catch(e=>toast("Ошибка лиг: "+e.message));
 if(target==="market")coachUI.renderMarket();
 if(target==="standings")coachUI.renderStandings();
 if(target==="stadium-manager")coachUI.renderStadium();
 if(target==="create")worldUI.openCreate(createMode).catch(e=>toast("Ошибка списка лиг: "+e.message));
 if(target==="match"&&!match)beginMatch();
 if(target==="match"&&match){if(!match.playerMode||match.highlightState!=="decision")match.paused=false;lastFrame=performance.now()}
 updateHeader();
 window.scrollTo(0,0);
}
document.querySelectorAll("[data-go]").forEach(el=>el.addEventListener("click",()=>go(el.dataset.go)));
$("back-btn").addEventListener("click",()=>{
 if(screen==="tactics"){go(returnFromTactics);return}
 if(screen==="match"&&match){finishMatch(false);return}
 const destinations={play:"home",new:"play",create:"new",saves:"play",career:"saves",world:"home",market:"career",standings:"career","stadium-manager":"career",stats:"home",settings:"home"};
 go(destinations[screen]||"home");
});
document.querySelectorAll("[data-type]").forEach(el=>el.addEventListener("click",()=>chooseType(el.dataset.type)));
function chooseType(type){
 createMode=type==="coach"?"coach":"custom";
 $("create-title").textContent=createMode==="coach"?"КАРЬЕРА ТРЕНЕРА":"КАРЬЕРА ФУТБОЛИСТА";
 $("create-hint").textContent=createMode==="coach"?
 "Создай свой клуб в европейской лиге. Управляй трансферами, таблицей и стадионом.":
 "Создай своего футболиста. ИИ ведёт матч, а ты принимаешь тактические решения в ключевые минуты.";
 $("name-label").textContent=createMode==="coach"?"Имя тренера":"Имя футболиста";
 $("entry-name").value=createMode==="coach"?"Новый тренер":"Новый талант";
 $("entry-club").value="Мой клуб";$("entry-name").hidden=false;$("name-label").hidden=false;
 $("entry-name").required=true;$("club-label").textContent="Название твоего клуба";
 $("position-wrap").hidden=createMode==="coach";$("entry-position").value="ST";
 go("create");
}
$("world-form").addEventListener("submit",e=>{
 e.preventDefault();
 const name=$("entry-name").value.trim(),club=$("entry-club").value.trim();
 if(!name||!club){toast("Заполни имя и название клуба.");return}
 const w={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),
  mode:createMode,name,club,leagueId:worldUI.getSelectedLeague(),season:2026,
  played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,formation:"433",
  routes:{},instructions:{},events:[],createdAt:Date.now()};
 if(createMode==="coach")ensureManagement(w);
 else w.player=makePlayerProfile(name,"custom",$("entry-position").value);
 saves.unshift(w);activeId=w.id;store();go("career");toast("Новый мир создан!");
});
function renderSaves(){
 const el=$("save-list");el.replaceChildren();
 if(!saves.length){el.innerHTML='<div class="empty">Пока нет сохранений. Создай первую карьеру!</div>';return}
 for(const w of saves){
  const row=document.createElement("div");row.className="save-row";
  const info=document.createElement("div"),title=document.createElement("strong"),detail=document.createElement("small");
  title.textContent=w.name;
  detail.textContent=(w.mode==="coach"?"Тренер":"Свой футболист")+" · "+w.club+" · Сезон "+w.season+"/"+(w.season+1)+" · Матчей: "+w.played;
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
 const isCoach=w.mode==="coach";
 $("coach-dashboard").hidden=!isCoach;
 $("player-dashboard").hidden=isCoach;
 $("career-type").textContent=isCoach?"КАРЬЕРА ТРЕНЕРА":"КАРЬЕРА СОЗДАННОГО ФУТБОЛИСТА";
 $("career-name").textContent=w.name;
 $("career-meta").textContent=isCoach
  ?w.club+" · Сезон "+w.season+"/"+(w.season+1)+" · Схема "+formationName(w.formation)
  :w.club+" · Сезон "+w.season+"/"+(w.season+1)+" · Индивидуальная карьера";
 if(!isCoach){renderPlayerDashboard(w);return}
 const figures=[["МАТЧИ",w.played],["ПОБЕДЫ",w.wins],["НИЧЬИ",w.draws],["ПОРАЖЕНИЯ",w.losses]];
 $("career-figures").replaceChildren();
 for(const [label,value] of figures){const div=document.createElement("div");div.className="figure";const a=document.createElement("strong");a.textContent=value;const b=document.createElement("span");b.textContent=label;div.append(a,b);$("career-figures").append(div)}
 $("career-about").textContent="Голы: "+w.goalsFor+"–"+w.goalsAgainst+". Ты управляешь командой, а не отдельным футболистом. Выбирай схему и маршруты на тактической доске.";
 $("career-world-note").textContent=worldUI.getCareerNote(w);coachUI.renderCoachSummary(w);
 $("career-news").textContent=w.events?.length?w.events.slice(0,4).join(" · "):"Твоя история только начинается. Проведи первый матч!";
}
function renderPlayerDashboard(w){
 const p=ensurePlayerProfile(w);
 $("player-position").textContent=positionLabel(p.position);
 $("player-details").textContent=w.name+" · "+p.age+" лет · № "+p.number+" · "+w.club;
 $("player-status").textContent=p.careerStage||"Основной состав";
 $("player-shirt-number").textContent=p.number;
 $("player-overall").textContent=playerOverall(p);
 const stats=[["МАТЧИ",p.appearances],["ГОЛЫ",p.goals],[p.position==="GK"?"СЕЙВЫ":"ГОЛЕВЫЕ",p.position==="GK"?(p.saves||0):p.assists],["УРОВЕНЬ",xpLevel(p)]];
 $("player-metrics").replaceChildren();
 for(const [label,value] of stats){
  const cell=document.createElement("div");cell.className="figure";
  const big=document.createElement("strong");big.textContent=value;
  const small=document.createElement("span");small.textContent=label;cell.append(big,small);
  $("player-metrics").append(cell);
 }
 $("training-points").textContent=p.skillPoints+" ОЧКА";
 $("player-skills").replaceChildren();
 for(const [skill,label] of PLAYER_SKILLS){
  const el=document.createElement("div");el.className="skill-item";
  const head=document.createElement("div");head.className="skill-head";
  const name=document.createElement("span");name.textContent=label;
  const rating=document.createElement("strong");rating.textContent=p.skills[skill];
  head.append(name,rating);
  const track=document.createElement("div");track.className="skill-track";
  const fill=document.createElement("div");fill.className="skill-fill";fill.style.width=p.skills[skill]+"%";
  track.append(fill);
  const button=document.createElement("button");button.textContent="ТРЕНИРОВАТЬ +2";
  button.disabled=p.skillPoints===0||p.skills[skill]>=99;
  button.onclick=()=>{
   const result=training(p,skill);
   if(result.ok){store();renderPlayerDashboard(w)}
   toast(result.ok?label+": "+result.message:result.message);
  };
  el.append(head,track,button);$("player-skills").append(el);
 }
 $("player-rest").disabled=p.lastRestAtPlayed===w.played||p.fitness>=100;
 $("player-feedback").textContent="Форма: "+p.fitness+"% · Доверие тренера: "+p.trust+"% · Опыт: "+p.experience+" XP. На поле за твоего футболиста играет ИИ; ты решаешь, как действовать в ключевых ситуациях.";
 $("player-contract").textContent="Контракт: ещё "+p.contractMatches+" матчей · Доверие тренера: "+p.trust+"%. Клубом и составом распоряжается ИИ-тренер.";
 $("player-news").textContent=w.events?.length?w.events.slice(0,5).join(" · "):"Дебют впереди. Прояви себя в первом матче!";
 $("player-world-note").textContent=worldUI.getCareerNote(w)+("");
 const offers=availableOffers(w);$("player-offers").replaceChildren();
 if(!offers.length){
  const note=document.createElement("p");note.className="fine";
  note.textContent="Трансферы футболиста появятся, когда добавим команды и настоящие составы.";
  $("player-offers").append(note);
 }else{
  for(const offer of offers){
   const card=document.createElement("div");card.className="offer";
   const title=document.createElement("strong");title.textContent=offer.club;
   const detail=document.createElement("small");detail.textContent=offer.label+" · демонстрационный контракт";
   const button=document.createElement("button");button.textContent="ПЕРЕЙТИ В КЛУБ";
   button.onclick=()=>{
    if(!confirm("Принять предложение клуба «"+offer.club+"»?"))return;
    if(acceptOffer(w,offer.club)){store();renderCareer();toast("Переход в "+offer.club+" оформлен")}
   };
   card.append(title,detail,button);$("player-offers").append(card);
  }
 }
}
$("player-rest").onclick=()=>{
 const w=active();if(!w||w.mode==="coach")return;
 const p=ensurePlayerProfile(w);
 if(p.lastRestAtPlayed===w.played){toast("Восстановление уже использовано до следующего матча");return}
 if(p.fitness>=100){toast("Форма уже максимальная");return}
 p.fitness=Math.min(100,p.fitness+18);p.lastRestAtPlayed=w.played;
 w.events.unshift("День восстановления: физическая форма "+p.fitness+"%");
 store();renderPlayerDashboard(w);toast("Форма восстановлена");
};
function renderStats(){
 const box=$("stats-list");box.replaceChildren();
 if(!saves.length){box.innerHTML='<div class="empty">Статистика появится после создания карьеры.</div>';return}
 for(const w of saves){
  const el=document.createElement("div");el.className="save-row";
  if(w.mode==="coach")el.textContent=w.name+" · Тренер · "+w.played+" матчей · "+w.wins+" побед · Голы "+w.goalsFor+":"+w.goalsAgainst;
  else{const p=ensurePlayerProfile(w);el.textContent=w.name+" · Игрок · "+p.appearances+" матчей · "+p.goals+" голов · "+p.assists+" голевых передач · Рейтинг "+playerOverall(p)}
  box.append(el);
 }
}
$("reduce-motion").checked=!!prefs.reduceMotion;
$("show-numbers").checked=prefs.showNumbers!==false;
for(const id of ["reduce-motion","show-numbers"])$(id).onchange=()=>{prefs.reduceMotion=$("reduce-motion").checked;prefs.showNumbers=$("show-numbers").checked;storePrefs();toast("Настройки сохранены")};
function formationName(key){return {"433":"4-3-3","442":"4-4-2","343":"3-4-3"}[key]||"4-3-3"}
function positions(form){return FORMATIONS[form]||FORMATIONS["433"]}
function tacticsData(){const w=active();return w?.mode==="coach"?w:previewTactics}
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

function displayDecision(){
 const m=match,moment=m.currentMoment;
 $("moment-overlay").hidden=false;$("moment-info").hidden=false;
 $("moment-count").textContent="ЭПИЗОД "+(m.decisionIndex+1)+" ИЗ "+m.decisions.length;
 $("moment-timer").textContent=moment.minute+"'";
 $("moment-stage").textContent="МАТЧ · "+moment.minute+"-Я МИНУТА";
 $("moment-title").textContent=moment.name;
 $("moment-description").textContent=moment.hint+" ИИ выполнит выбранное действие — вручную бегать и бить не нужно.";
 $("moment-last-result").textContent="";
 $("moment-options").replaceChildren();
 for(const action of getDecisionOptions(moment)){
  const button=document.createElement("button");button.className="decision-option";
  const name=document.createElement("strong");name.textContent=action.title;
  const description=document.createElement("small");description.textContent=action.description;
  button.append(name,description);
  button.onclick=()=>submitChoice(action.id);
  $("moment-options").append(button);
 }
 $("moment-status").textContent="Футболист действует автоматически. Ты выбираешь его решение в этом эпизоде.";
}
function openDecision(){
 const m=match;if(!m?.playerMode)return;
 m.decisionIndex++;
 m.currentMoment=m.decisions[m.decisionIndex];
 if(!m.currentMoment)return;
 arrangeDecision(m);m.highlightState="decision";m.paused=true;
 addEvent("Ключевой момент: "+m.currentMoment.name+".");
 if(m.autoDecisions)submitChoice(chooseAIOption());
 else displayDecision();
 updateScore();
}
function chooseAIOption(){
 const m=match;
 const options=getDecisionOptions(m?.currentMoment);
 const p=ensurePlayerProfile(active());
 // In autopilot, the AI favours useful options without guaranteeing a goal.
 const ranked=options.map(option=>({
  id:option.id,
  score:(p.skills[option.skill]||60)*.004+option.bonus-option.risk*.55+(Math.random()-.5)*.19
 })).sort((a,b)=>b.score-a.score);
 return ranked[0]?.id;
}
function submitChoice(id){
 const m=match;
 if(!m?.playerMode||m.highlightState!=="decision")return;
 const p=ensurePlayerProfile(active());
 const result=evaluateChoice(m.currentMoment,id,p.skills);
 if(!result.ok){toast(result.message);return}
 const opt=result.option;
 if(["assist","pass","pass-shot"].includes(opt.action))m.individual.passes++;
 else if(opt.action!=="save")m.individual.shots++;
 m.highlightState="resolve";m.paused=false;
 beginResolution(m,result);
 $("moment-overlay").hidden=true;
 $("moment-info").hidden=false;
 $("moment-timer").textContent="ИИ ИСПОЛНЯЕТ";
 $("moment-status").textContent="Решение: "+opt.title+". Смотри, как ИИ разыгрывает эпизод.";
 addEvent("Выбор: "+opt.title+".");
 lastFrame=performance.now();
}
$("moment-ai").onclick=()=>{
 if(match?.highlightState==="decision")submitChoice(chooseAIOption());
};
$("moment-ai-all").onclick=()=>{
 if(match?.highlightState!=="decision")return;
 match.autoDecisions=true;
 submitChoice(chooseAIOption());
 addEvent("Остальные решения доверены ИИ.");
};
function beginMatch(){
 const w=active();if(!w){go("saves");return}
 const playerMode=w.mode!=="coach";
 const profile=playerMode?ensurePlayerProfile(w):null;
 const controlIdx=playerMode?positionIndex(profile.position):null;
 if(!playerMode)ensureManagement(w);
 const opponent=playerMode?OPPONENTS[w.played%OPPONENTS.length]:getNextOpponent(w);
 match={
  home:initPlayers(w.formation,0),away:initPlayers("442",1),
  ball:{x:500,y:295,vx:0,vy:0,inNet:null},owner:{team:0,idx:9},
  score:[0,0],elapsed:0,paused:false,speed:1,actionTimer:1.1,
  events:[],eventsTimer:0,opponent,formation:w.formation,
  completed:false,playerMode,controlIdx,
  highlightState:playerMode?"watch":"full",
  decisions:playerMode?makeDecisions(Math.random,profile.position):[],
  decisionIndex:-1,autoDecisions:false,
  individual:{goals:0,assists:0,passes:0,shots:0,tackles:0,requests:0,saves:0},
  aiTimer:1,netHold:0
 };
 if(playerMode){
  const current=match.home[controlIdx].number;
  const duplicate=match.home.find(p=>p.number===profile.number&&p!==match.home[controlIdx]);
  if(duplicate)duplicate.number=current;
  match.home[controlIdx].number=profile.number;
 }
 saveIdDuringMatch=w.id;
 $("match").classList.toggle("player-highlights",playerMode);
 $("match-kicker").textContent=playerMode?"КАРЬЕРА ИГРОКА · СИМУЛЯЦИЯ С РЕШЕНИЯМИ":"КАРЬЕРА ТРЕНЕРА · МАТЧ";
 $("match-fixture").textContent=w.club+" — "+opponent;
 $("coach-match-panel").hidden=playerMode;$("player-match-panel").hidden=!playerMode;
 $("match-formation").value=w.formation;
 $("match-speed").value="1";$("player-match-speed").value="1";
 $("match-pause").textContent="ПАУЗА";$("player-match-pause").textContent="ПАУЗА";
 $("player-match-name").textContent=playerMode?w.name.toUpperCase()+" · №"+profile.number:"";
 $("end-match").textContent="ПОКИНУТЬ МАТЧ";
 $("moment-overlay").hidden=true;$("moment-info").hidden=true;
 if(playerMode){
  $("moment-status").textContent="ИИ играет за тебя. Дождись ключевого момента и выбери действие.";
  addEvent("Начало матча! Ты наблюдаешь за своим футболистом — он отмечен золотым кругом.");
 }else addEvent("Команды вышли на поле. Тренер управляет схемой.");
 updateScore();updatePlayerHUD();
 if(!raf){lastFrame=performance.now();raf=requestAnimationFrame(frame)}
}
function addEvent(s){
 if(!match)return;
 const minute=Math.min(90,Math.floor(match.elapsed/60)),line=String(minute)+"' "+s;
 match.events.unshift(line);match.events=match.events.slice(0,7);
 for(const id of ["match-events","player-match-events"]){
  const el=$(id);el.replaceChildren();
  for(const item of match.events){const p=document.createElement("p");p.textContent=item;el.append(p)}
 }
}
function updatePlayerHUD(){
 if(!match?.playerMode)return;
 const p=match.individual;
 $("player-match-hud").textContent="Голы: "+p.goals+" · Пасы: "+p.passes+" · Удары: "+p.shots+" · Отборы: "+p.tackles+(p.saves?" · Сейвы: "+p.saves:"");
}
function togglePause(){
 if(!match)return;
 if(match.playerMode&&match.highlightState==="decision")return;
 match.paused=!match.paused;
 const label=match.paused?"ПРОДОЛЖИТЬ":"ПАУЗА";
 $("match-pause").textContent=label;$("player-match-pause").textContent=label;
}
$("player-match-pause").onclick=togglePause;
$("player-match-speed").onchange=()=>{
 if(match?.playerMode)match.speed=Number($("player-match-speed").value)||1;
};
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
 if(match.playerMode){toast("Схему выбирает тренер команды");$("match-formation").value=match.formation;return}
 match.formation=$("match-formation").value;const w=active();if(w){w.formation=match.formation;store()}reposition();addEvent("Тренер меняет расстановку на "+formationName(match.formation)+".");
};
$("match-speed").onchange=()=>{if(match)match.speed=Number($("match-speed").value)};
$("match-pause").onclick=togglePause;
$("match-edit").onclick=()=>{if(match)go("tactics")};
$("end-match").onclick=()=>{if(match){if(confirm("Выйти из матча? Незавершённый результат не сохранится."))finishMatch(false)}else go("career")};
function finishMatch(record){
 if(match&&record&&!match.completed){
  match.completed=true;
  const w=saves.find(s=>s.id===saveIdDuringMatch);
  if(w){
   const a=match.score[0],b=match.score[1];w.played++;
   w.goalsFor+=a;w.goalsAgainst+=b;
   if(a>b)w.wins++;else if(a===b)w.draws++;else w.losses++;
   w.events??=[];w.events.unshift(w.club+" "+a+":"+b+" "+match.opponent);
   if(match.playerMode){
    const result=a>b?"win":a===b?"draw":"loss";
    const info=matchProgress(ensurePlayerProfile(w),match.individual,result);
    w.events.unshift("ИИ сыграл матч за футболиста: "+match.individual.goals+" гол., "+match.individual.assists+" гол. пас., "+match.individual.saves+" сейвов. +"+info.points+" очк. тренировок.");
   }else{
    const finance=finishCoachMatch(w,a,b,match.opponent);
    w.events.unshift("Билеты +"+finance.finance.gross.toLocaleString("ru-RU")+" € · расходы "+finance.finance.expenses.toLocaleString("ru-RU")+" € · "+finance.place+"-е место.");
   }
   w.events=w.events.slice(0,12);store();
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

function stepPlayerCareer(dt){
 const m=match;if(!m?.playerMode||m.paused)return;
 if(m.highlightState==="resolve"){
  const result=tickResolution(m,dt);
  if(result.done){
   const outcome=m.resolution?.outcome,scored=m.resolution?.goal;
   if(outcome?.saved)m.individual.saves++;
   const message=outcome?.saved?"СЕЙВ! Вратарь спас ворота.":scored?
    outcome?.assisted?"Партнёр завершил атаку! Голевая передача.":"ГОЛ! Мяч оказался в сетке.":
    outcome?.conceded?"Соперник реализовал шанс.":"Атака остановлена. Мяч не в воротах.";
   addEvent(message);
   m.highlightState="watch";m.resolution=null;
   m.owner={team:scored?1:Math.random()<.5?0:1,idx:9};
   m.ball={x:500,y:295,vx:0,vy:0,inNet:null};m.aiTimer=1;
   $("moment-info").hidden=true;
   $("moment-status").textContent=message+" ИИ продолжает матч.";
  }
  updateScore();updatePlayerHUD();return;
 }
 if(m.highlightState!=="watch")return;
 const logs=tickSpectator(m,dt);
 for(const log of logs)addEvent(log);
 const next=m.decisions[m.decisionIndex+1];
 if(next&&m.elapsed>=next.minute*60){openDecision();return}
 if(m.elapsed>=5400){addEvent("Финальный свисток.");finishMatch(true);return}
 updateScore();updatePlayerHUD();
}
function step(dt){
 if(!match)return;
 if(match.playerMode){stepPlayerCareer(dt);return}
 const m=match;m.elapsed=Math.min(5400,m.elapsed+dt*52);
 if(m.playerMode){
  const p=m.home[m.controlIdx],profile=ensurePlayerProfile(active());
  const pressed=k=>movementKeys.has(k);
  let dx=joystick.x+(pressed("d")||pressed("arrowright")?1:0)-(pressed("a")||pressed("arrowleft")?1:0);
  let dy=joystick.y+(pressed("s")||pressed("arrowdown")?1:0)-(pressed("w")||pressed("arrowup")?1:0);
  const magnitude=Math.hypot(dx,dy);
  if(magnitude>.05){
   dx/=Math.max(1,magnitude);dy/=Math.max(1,magnitude);
   const speed=93+(profile.skills.pace*.62)*(profile.fitness/100);
   p.x=bound(p.x+dx*dt*speed,34,966);p.y=bound(p.y+dy*dt*speed,34,556);
  }
 }
 // Tactical rearrangement is continuous, never a teleport.
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  for(let i=0;i<list.length;i++){
   const p=list[i];if(m.playerMode&&team===0&&i===m.controlIdx)continue;let gx=p.homeX,gy=p.homeY;
   if(m.owner&&m.owner.team!==team&&i>0){
    const d=Math.hypot(p.x-m.ball.x,p.y-m.ball.y);
    const available=list.slice(1).filter(q=>!(m.playerMode&&team===0&&q===m.home[m.controlIdx]));
    const nearest=available.reduce((a,b)=>Math.hypot(a.x-m.ball.x,a.y-m.ball.y)<Math.hypot(b.x-m.ball.x,b.y-m.ball.y)?a:b);
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
 if(m.coachNetHold>0){
  advanceBall(m.ball,dt);m.coachNetHold-=dt;
  if(m.coachNetHold<=0){
   m.ball={x:500,y:295,vx:0,vy:0,inNet:null};
   m.owner={team:m.coachConceded,idx:9};
   m.coachConceded=null;m.coachShotTeam=null;
  }
  updateScore();return;
 }
 const owner=m.owner&&(m.owner.team===0?m.home:m.away)[m.owner.idx];
 if(owner){
  m.ball.x+=(owner.x-m.ball.x)*Math.min(1,dt*8);
  m.ball.y+=(owner.y-m.ball.y)*Math.min(1,dt*8);
 }else{
  const goal=advanceBall(m.ball,dt);
  if(goal){
   const team=goal==="right"?0:1;
   m.score[team]++;m.coachConceded=1-team;m.coachNetHold=1.5;
   addEvent("ГОЛ! Мяч пересёк линию ворот и попал в сетку!");
   updateScore();return;
  }
  m.coachBallRecover=Math.max(0,(m.coachBallRecover||0)-dt);
  if(m.coachBallRecover<=0&&Math.hypot(m.ball.vx,m.ball.vy)<190){
   const nearby=[...m.home.map((p,i)=>({team:0,idx:i,p})),...m.away.map((p,i)=>({team:1,idx:i,p}))]
    .map(c=>({...c,d:Math.hypot(c.p.x-m.ball.x,c.p.y-m.ball.y)}))
    .sort((a,b)=>a.d-b.d)[0];
   if(nearby?.d<34)m.owner={team:nearby.team,idx:nearby.idx};
  }
 }
 m.actionTimer-=dt;
 if(m.owner&&m.actionTimer<=0){performAction();m.actionTimer=.85+Math.random()*1.7}
 m.eventsTimer-=dt;
 if(m.eventsTimer<=0){m.eventsTimer=4+Math.random()*9;incident()}
 if(m.elapsed>=2700&&!m.halftime){m.halftime=true;m.paused=true;
 $("match-pause").textContent="НАЧАТЬ 2-Й ТАЙМ";
 $("player-match-pause").textContent="НАЧАТЬ 2-Й ТАЙМ";
 addEvent(m.playerMode?"Перерыв! Отдохни перед вторым таймом.":"Перерыв. Матч остановлен для тренерских решений.")}
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
  const onTarget=Math.random()<.53;
  const targetY=onTarget?295+(Math.random()-.5)*45:(Math.random()<.5?FIELD.goalTop-42:FIELD.goalBottom+42);
  const targetX=team===0?FIELD.right+FIELD.netDepth:FIELD.left-FIELD.netDepth;
  const direction=normalizeDirection({x:targetX-ballCarrier.x,y:targetY-ballCarrier.y});
  shootBall(m.ball,ballCarrier,direction,380);
  m.owner=null;m.coachBallRecover=.45;m.coachShotTeam=team;
  addEvent("Удар по воротам! Мяч летит к сетке.");
  return;
 }
 if(Math.random()<.16){m.owner={team:1-team,idx:1+Math.floor(Math.random()*10)};m.assistPending=false;addEvent("Перехват передачи.");return}
 const passing=team===0?(active()?.instructions[ballCarrier.number]?.passing||"mixed"):"mixed";
 const candidates=players.map((p,i)=>{const distance=Math.hypot(p.x-ballCarrier.x,p.y-ballCarrier.y);let score=(team===0?p.x:-p.x)+Math.random()*180;
  if(passing==="short")score-=distance*1.7;
  if(passing==="long")score+=distance*.55;
  if(m.playerMode&&team===0&&i===m.controlIdx)score+=160;
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
function drawGoalNet(ctx,side){
 const x=side==="left"?FIELD.left-FIELD.netDepth:FIELD.right;
 const width=FIELD.netDepth,top=FIELD.goalTop,bottom=FIELD.goalBottom;
 ctx.fillStyle="#dceee932";ctx.fillRect(x,top,width,bottom-top);
 ctx.strokeStyle="#ebfbf0ab";ctx.lineWidth=1;
 for(let gx=x+8;gx<x+width;gx+=8){
  ctx.beginPath();ctx.moveTo(gx,top);ctx.lineTo(gx,bottom);ctx.stroke();
 }
 for(let gy=top+9;gy<bottom;gy+=9){
  ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+width,gy);ctx.stroke();
 }
 ctx.strokeStyle="#fffefa";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+width,top);
 ctx.lineTo(x+width,bottom);ctx.lineTo(x,bottom);ctx.stroke();
 const front=side==="left"?FIELD.left:FIELD.right;
 for(const y of [top,bottom]){
  ctx.beginPath();ctx.fillStyle="#fbfff7";ctx.arc(front,y,4.5,0,Math.PI*2);ctx.fill();
 }
}
function drawMatch(){
 const cv=$("match-canvas"),ctx=cv.getContext("2d"),W=cv.width,H=cv.height,m=match;
 if(!m)return;
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle="#246b36";ctx.fillRect(0,0,W,H);
 for(let x=0;x<10;x++){
  ctx.fillStyle=x%2?"#ffffff08":"#0000000b";
  ctx.fillRect(x*100,0,100,H);
 }
 drawGoalNet(ctx,"left");drawGoalNet(ctx,"right");
 const L=FIELD.left,R=FIELD.right,T=FIELD.top,B=FIELD.bottom;
 ctx.strokeStyle="#d7f0d8d9";ctx.lineWidth=2;
 ctx.strokeRect(L,T,R-L,B-T);
 ctx.beginPath();ctx.moveTo(500,T);ctx.lineTo(500,B);ctx.stroke();
 ctx.beginPath();ctx.arc(500,295,69,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(L,170,134,250);ctx.strokeRect(R-134,170,134,250);
 ctx.strokeRect(L,231,48,128);ctx.strokeRect(R-48,231,48,128);
 for(const x of [L+95,R-95]){
  ctx.beginPath();ctx.fillStyle="#f3fff3";ctx.arc(x,295,3,0,Math.PI*2);ctx.fill();
 }
 const arrow=false,control=m.home[m.controlIdx];
 if(arrow){
  const aim={x:1,y:0},distance=75;
  ctx.strokeStyle="#ffe16d";ctx.fillStyle="#ffe16d";ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(control.x,control.y);ctx.lineTo(control.x+aim.x*distance,control.y+aim.y*distance);ctx.stroke();
  const ex=control.x+aim.x*distance,ey=control.y+aim.y*distance;
  ctx.beginPath();ctx.moveTo(ex,ey);
  ctx.lineTo(ex-aim.x*11-aim.y*7,ey-aim.y*11+aim.x*7);
  ctx.lineTo(ex-aim.x*11+aim.y*7,ey-aim.y*11-aim.x*7);ctx.closePath();ctx.fill();
 }
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  for(const p of list){
   const isUser=m.playerMode&&team===0&&p===control;
   if(isUser){
    ctx.beginPath();ctx.strokeStyle="#ffe16d";ctx.lineWidth=3.5;
    ctx.arc(p.x,p.y,21,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#ffe16d";ctx.beginPath();ctx.moveTo(p.x-7,p.y-29);
    ctx.lineTo(p.x+7,p.y-29);ctx.lineTo(p.x,p.y-21);ctx.closePath();ctx.fill();
   }
   ctx.save();ctx.translate(p.x,p.y);
   ctx.fillStyle="#0006";ctx.beginPath();ctx.ellipse(0,14,11,4,0,0,Math.PI*2);ctx.fill();
   const kit=team===0?"#e9efff":"#bc3549";
   const trim=team===0?"#2756a3":"#f3e1e5";
   ctx.strokeStyle=team===0?"#dfeaf9":"#e1b1b8";ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-6,14);ctx.moveTo(4,7);ctx.lineTo(6,14);ctx.stroke();
   ctx.fillStyle=kit;ctx.strokeStyle=trim;ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(0,1,10,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.fillStyle="#d4a687";ctx.arc(0,-9,4.5,0,Math.PI*2);ctx.fill();
   if(prefs.showNumbers){
    ctx.fillStyle=team===0?"#193e75":"#fff";
    ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText(p.number,0,5);
   }
   ctx.restore();
  }
 }
 // Draw the ball last, including beyond the goal line inside the net.
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(m.ball.x+2,m.ball.y+3,7,4,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.fillStyle="#fff";ctx.strokeStyle="#15251d";ctx.lineWidth=1.7;
 ctx.arc(m.ball.x,m.ball.y,FIELD.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.fillStyle="#12261c";ctx.arc(m.ball.x,m.ball.y,2,0,Math.PI*2);ctx.fill();
}
window.addEventListener("resize",()=>{if(screen==="tactics")drawBoard()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&screen!=="home")$("back-btn").click()});
go("home");
