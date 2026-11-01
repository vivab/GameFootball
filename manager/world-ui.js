import {loadFootballWorld,countryLabel,continentLabel,normalizeClubName} from "./world-data.js";

const $=id=>document.getElementById(id);
const show=(node,text)=>{node.textContent=text;return node};
function option(value,label){
 const el=document.createElement("option");el.value=value;el.textContent=label;return el;
}
function setOptions(select,items,placeholder,preferred=""){
 select.replaceChildren(option("",placeholder));
 for(const [value,label] of items)select.append(option(value,label));
 select.value=preferred&&[...select.options].some(o=>o.value===preferred)?preferred:"";
}
function displayRegion(geo){return continentLabel(geo.region)}
function formatCount(n){return Number(n||0).toLocaleString("ru-RU")}
const key=(r,c)=>r+"|"+c;
export function initWorldUI({onChooseClub}={}){
 let database=null,chosen=null,careerChosen=null,realPlayers=[],realSelected=null;
 async function load(){
  if(database)return database;
  database=await loadFootballWorld();
  realPlayers=database.clubs.flatMap(club=>club.players.map(p=>({...p,clubId:club.id,club:club.name,country:club.country})));
  realPlayers.sort((a,b)=>a.name.localeCompare(b.name,"ru"));
  return database;
 }
 function errorMessage(error){
  const message="Каталог временно не загрузился. Попробуй обновить страницу. "+String(error.message||error);
  $("world-counter").textContent=message;
  $("world-clubs").replaceChildren(show(document.createElement("div"),message));
  $("create-club-source").textContent=message;
 }
 function continents(){return [...new Set(database.countries.map(c=>c.region))].sort((a,b)=>continentLabel(a).localeCompare(continentLabel(b),"ru"))}
 function regionsCountries(region){
  const list=database.countries.filter(c=>!region||c.region===region);
  return list.sort((a,b)=>countryLabel(a.country).localeCompare(countryLabel(b.country),"ru"));
 }
 function countriesFor(region,selector,preferred=""){
  const list=regionsCountries(region).map(c=>[key(c.region,c.country),countryLabel(c.country)]);
  setOptions($(selector),list,"Все страны",preferred);
 }
 function leaguesFor(geo,selector,preferred=""){
  const [region,country]=geo?geo.split("|"):[null,null];
  const list=database.leagues.filter(l=>(!region||l.region===region)&&(!country||l.country===country))
   .sort((a,b)=>(b.season||"").localeCompare(a.season||"")||a.tier-b.tier||a.name.localeCompare(b.name));
  setOptions($(selector),list.map(l=>[l.id,l.name+" · "+l.season+" · "+l.teams.length+" клубов"]), "Все чемпионаты / клубы",preferred);
 }
 function selectedGeography(selector){return $(selector).value}
 function currentClubSet(geo,leagueId){
  if(leagueId)return database.getLeagueClubs(leagueId);
  if(geo){const [region,country]=geo.split("|");return database.getCountryClubs(country,region)}
  return database.clubs;
 }
 function sourceStatus(club){
  if(!club)return "Не выбран клуб";
  if(!club.leagueIds.length&&club.archiveOnly)return "Клуб из исторического справочника: действующая лига не подтверждена.";
  if(!club.leagueIds.length)return "Клуб упоминается в футбольной базе, но участие в текущей лиге не подтверждено.";
  const names=club.leagueIds.map(id=>database.leagues.find(l=>l.id===id)).filter(Boolean)
   .map(l=>l.name+" (сезон "+l.season+")");
  return names.length?"Лиги в источниках: "+names.join("; "):"Лига неизвестна.";
 }
 function openClub(club){
  if(!club)return;
  chosen=club;
  $("world-team-name").textContent=club.name;
  $("world-team-meta").textContent=countryLabel(club.country)+" · "+continentLabel(club.region)+" · "+sourceStatus(club);
  $("world-roster-status").textContent=club.players.length
   ?formatCount(club.players.length)+" игроков с клубной принадлежностью из составов ЧМ-2026. Это НЕ полный состав клуба на ноябрь 2026."
   :"Подтверждённый состав не загружен. Не выдаём вымышленных футболистов за настоящих.";
  const roster=$("world-roster");roster.replaceChildren();
  for(const p of club.players){
   const line=document.createElement("div");line.className="roster-row";
   const number=document.createElement("span");number.className="roster-number";number.textContent=p.number||"•";
   const details=document.createElement("div");details.className="roster-details";
   const name=document.createElement("strong");name.textContent=p.name;
   const subtitle=document.createElement("small");
   subtitle.textContent=(p.pos||"—")+" · Сборная "+(p.nationality||"—")+(p.birthdate?" · "+p.birthdate:"");
   details.append(name,subtitle);line.append(number,details);roster.append(line);
  }
  if(!club.players.length){
   const text=document.createElement("p");text.className="world-data-warning";
   text.textContent="Для этого клуба пока нет проверенного списка игроков. Нужен дополнительный источник составов.";
   roster.append(text);
  }
  [...$("world-clubs").children].forEach(btn=>btn.classList?.toggle("selected",btn.dataset?.clubId===club.id));
 }
 function renderWorldClubs(){
  const region=$("world-continent").value,geo=$("world-country").value,league=$("world-league").value;
  const search=normalizeClubName($("world-search").value);
  const candidates=currentClubSet(geo,league).filter(c=>(!region||c.region===region)&&(!search||normalizeClubName(c.name).includes(search)))
   .sort((a,b)=>(b.leagueIds.length>0?1:0)-(a.leagueIds.length>0?1:0)||a.name.localeCompare(b.name,"ru"));
  const panel=$("world-clubs");panel.replaceChildren();
  const max=90;
  for(const club of candidates.slice(0,max)){
   const btn=document.createElement("button");btn.dataset.clubId=club.id;
   const title=document.createElement("strong");title.textContent=club.name;
   const note=document.createElement("span");
   note.textContent=countryLabel(club.country)+" · "+club.players.length+" известных игроков · "+(club.leagueIds.length?"есть в списке чемпионата":"архив / клубная принадлежность");
   btn.append(title,note);btn.onclick=()=>openClub(club);panel.append(btn);
  }
  $("world-result-counter").textContent=formatCount(candidates.length)+" команд"+(candidates.length>max?" · показаны первые "+max:"");
  if(!candidates.length){
   chosen=null;
   const msg=document.createElement("p");msg.className="fine";msg.textContent="Ничего не найдено. Измени фильтры или название клуба.";panel.append(msg);
   $("world-team-name").textContent="Клуб не найден";
   $("world-team-meta").textContent="Измени страну, лигу или поисковый запрос.";
   $("world-roster-status").textContent="";
   $("world-roster").replaceChildren();
  }else{
   const matched=chosen&&candidates.find(c=>c.id===chosen.id);
   openClub(matched||candidates[0]);
  }
 }
 async function openWorld(){
  try{
   await load();
   $("world-counter").textContent=formatCount(database.leagues.length)+" лиги · "+formatCount(database.clubs.length)+" записей клубов · "+formatCount(database.sourcedPlayers)+" реальных футболистов из 2026 года. Часть архивов устарела.";
   const previous=$("world-continent").value||"europe";
   setOptions($("world-continent"),continents().map(c=>[c,continentLabel(c)]),"Все регионы",previous);
   const selectedCountry=chosen?key(chosen.region,chosen.country):"europe|england";
   countriesFor($("world-continent").value,"world-country",selectedCountry);
   const guessLeague=chosen?.leagueIds[0]||database.getCountryLeagues("england","europe").find(l=>l.tier===1)?.id;
   leaguesFor($("world-country").value,"world-league",guessLeague);
   renderWorldClubs();
  }catch(e){errorMessage(e)}
 }
 $("world-continent").onchange=()=>{
  if(!database)return;
  countriesFor($("world-continent").value,"world-country");
  leaguesFor("","world-league");
  renderWorldClubs();
 };
 $("world-country").onchange=()=>{
  if(!database)return;
  leaguesFor($("world-country").value,"world-league");
  renderWorldClubs();
 };
 $("world-league").onchange=()=>{if(database)renderWorldClubs()};
 $("world-search").oninput=()=>{if(database)renderWorldClubs()};
 $("world-pick-club").onclick=()=>{
  if(chosen&&onChooseClub)onChooseClub(chosen);
 };
 function createCountries(){
  const region=$("create-continent").value;
  countriesFor(region,"create-country");
  leaguesFor("","create-league");
  createClubList();
 }
 function createClubList(){
  if(!database)return;
  const clubs=currentClubSet($("create-country").value,$("create-league").value)
   .filter(c=>!$("create-continent").value||c.region===$("create-continent").value)
   .sort((a,b)=>a.name.localeCompare(b.name,"ru"));
  const list=clubs.slice(0,400);
  setOptions($("create-club"),list.map(c=>[c.id,c.name+(c.players.length?" · "+c.players.length+" игроков":"")]),"Выбери клуб");
 }
 function onCreateCountry(){
  if(!database)return;
  leaguesFor($("create-country").value,"create-league");
  createClubList();
 }
 $("create-continent").onchange=createCountries;
 $("create-country").onchange=onCreateCountry;
 $("create-league").onchange=createClubList;
 $("use-world-club").onclick=()=>{
  if(!database)return;
  const club=database.findClub($("create-club").value);
  if(!club){$("create-club-source").textContent="Выбери конкретный клуб.";return}
  setCreateSelectedClub(club.id);
 };
 function setCreateSelectedClub(id){
  if(!database)return;
  const club=database.findClub(id);
  if(!club)return;
  careerChosen=club;
  $("entry-club").value=club.name;
  $("create-club-source").textContent="Выбран: "+club.name+". "+sourceStatus(club);
 }
 $("entry-club").addEventListener("input",()=>{
  if(careerChosen&&$("entry-club").value!==careerChosen.name)careerChosen=null;
 });
 function getSelectedClub(){return careerChosen&&careerChosen.name===$("entry-club").value?careerChosen:null}
 function getSelectedLeague(){return $("create-league").value||getSelectedClub()?.leagueIds?.[0]||null}
 function renderRealChoices(q=""){
  if(!realPlayers.length)return;
  const filter=normalizeClubName(q),results=realPlayers.filter(p=>!filter||normalizeClubName(p.name+" "+p.club).includes(filter)).slice(0,160);
  const selectedId=realSelected?.id||"";
  setOptions($("real-select"),results.map(p=>[p.id,p.name+" · "+p.club+" · "+p.pos]),"Выбери футболиста",results.some(p=>p.id===selectedId)?selectedId:results[0]?.id);
  realSelected=realPlayers.find(p=>p.id===$("real-select").value)||null;
  $("create-club-source").textContent=filter
   ?formatCount(realPlayers.filter(p=>normalizeClubName(p.name+" "+p.club).includes(filter)).length)+" футболистов по запросу. Источник: ЧМ-2026."
   :"Для выбора доступно "+formatCount(realPlayers.length)+" футболистов с ЧМ-2026. Используй поиск выше.";
 }
 $("real-player-search").oninput=()=>renderRealChoices($("real-player-search").value);
 $("real-select").onchange=()=>{
  realSelected=realPlayers.find(p=>p.id===$("real-select").value)||null;
  if(realSelected){
   $("entry-club").value=realSelected.club;
   careerChosen=database.findClub(realSelected.clubId);
  }
 };
 async function openCreate(mode){
  try{
   await load();
   setOptions($("create-continent"),continents().map(c=>[c,continentLabel(c)]),"Все регионы",careerChosen?.region||"europe");
   const geo=careerChosen?key(careerChosen.region,careerChosen.country):"europe|england";
   countriesFor($("create-continent").value,"create-country",geo);
   leaguesFor($("create-country").value,"create-league",careerChosen?.leagueIds[0]||database.getCountryLeagues("england","europe").find(l=>l.tier===1)?.id);
   createClubList();
   if(careerChosen&&$("entry-club").value===careerChosen.name)$("create-club").value=careerChosen.id;
   if(mode==="real"){
    if(!realSelected){
     realSelected=realPlayers.find(p=>normalizeClubName(p.name).includes("cristiano ronaldo"))||realPlayers[0]||null;
    }
    renderRealChoices($("real-player-search").value);
    if(realSelected)$("real-select").value=realSelected.id;
    $("real-select").onchange();
   }
  }catch(e){$("create-club-source").textContent="Каталог сейчас недоступен. Можно вписать название клуба вручную. "+String(e.message||e)}
 }
 function getSelectedRealPlayer(){
  return realPlayers.find(p=>p.id===$("real-select").value)||null;
 }
 function getCareerNote(world){
  if(!world?.worldClubId)return "";
  const club=database?.findClub(world.worldClubId);
  if(!club)return "Клуб выбран из футбольной базы. Подробный состав появится после загрузки каталога.";
  return "Каталог: "+countryLabel(club.country)+" · "+club.players.length+" реальных футболистов в историческом срезе ЧМ-2026; состав команды не полный.";
 }
 function getDB(){return database}
 return {load,openWorld,openCreate,getSelectedClub,getSelectedLeague,getSelectedRealPlayer,setCreateSelectedClub,getCareerNote,getDB};
}
