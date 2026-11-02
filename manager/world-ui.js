import {EUROPE_LEAGUES,EUROPE_COUNTRIES,getEuropeanLeague} from "./europe-data.js";
const $=id=>document.getElementById(id);
function option(id,name){const el=document.createElement("option");el.value=id;el.textContent=name;return el}
function refill(el,items,defaultLabel=""){
 el.replaceChildren();
 if(defaultLabel)el.append(option("",defaultLabel));
 for(const item of items)el.append(option(item.id,item.name));
}
export function initWorldUI(){
 function updateCreateLeagues(preferred=""){
  const country=$("create-country").value;
  const available=EUROPE_LEAGUES.filter(l=>l.country===country);
  refill($("create-league"),available);
  $("create-league").value=available.some(l=>l.id===preferred)?preferred:available[0]?.id||"";
 }
 $("create-country").onchange=()=>updateCreateLeagues();
 function openCreate(mode){
  refill($("create-country"),EUROPE_COUNTRIES.map(c=>({id:c.id,name:c.name})));
  const country="england";
  $("create-country").value=country;
  updateCreateLeagues();
  return Promise.resolve();
 }
 function renderWorld(){
  const country=$("world-country").value,filter=$("world-search").value.trim().toLowerCase();
  const items=EUROPE_LEAGUES.filter(l=>(!country||l.country===country)&&(!filter||(l.name+" "+l.countryLabel).toLowerCase().includes(filter)));
  $("world-counter").textContent=EUROPE_LEAGUES.length+" европейских шаблонов лиг · команды и игроки не импортированы";
  $("world-clubs").replaceChildren();
  for(const league of items){
   const card=document.createElement("button");card.className="europe-league-card";
   const title=document.createElement("strong");title.textContent=league.name;
   const info=document.createElement("small");info.textContent=league.countryLabel+" · дивизион "+league.tier+" · "+league.clubCount+" мест для будущих команд";
   const hint=document.createElement("span");hint.textContent="СОЗДАТЬ КАРЬЕРУ В ЛИГЕ";
   card.append(title,info,hint);
   card.onclick=()=>{
    $("entry-club").value="Мой клуб";
    refill($("create-country"),EUROPE_COUNTRIES);
    $("create-country").value=league.country;
    updateCreateLeagues(league.id);
    $("create-title").textContent="НОВАЯ КАРЬЕРА В "+league.name.toUpperCase();
    document.querySelector('[data-type="coach"]')?.click();
    $("create-country").value=league.country;updateCreateLeagues(league.id);
   };
   $("world-clubs").append(card);
  }
  if(!items.length){
   const text=document.createElement("p");text.className="fine";text.textContent="Чемпионат не найден."; $("world-clubs").append(text);
  }
 }
 $("world-country").onchange=renderWorld;
 $("world-search").oninput=renderWorld;
 function openWorld(){
  refill($("world-country"),EUROPE_COUNTRIES,"Все страны");
  renderWorld();return Promise.resolve();
 }
 function getSelectedLeague(){return $("create-league").value||EUROPE_LEAGUES[0].id}
 function getCareerNote(w){
  if(!w)return "";
  const league=getEuropeanLeague(w.leagueId);
  return "Лига: "+league.name+" ("+league.countryLabel+"). Клубы и составы пока не загружены; временные игроки обозначены номерами.";
 }
 return {openCreate,openWorld,getSelectedLeague,getCareerNote,getSelectedClub:()=>null,getSelectedRealPlayer:()=>null};
}
