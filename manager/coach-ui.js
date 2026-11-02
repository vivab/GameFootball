import {
 ensureManagement,getMarketCandidates,getTransferOffer,submitTransferOffer,acceptTransferCounter,
 finalizeTransfer,toggleShortlist,listSquadPlayer,acceptSaleOffer,getStandings,
 stadiumCapacity,upgradeCost,upgradeStand,STAND_NAMES,getNextOpponent
} from "./management.js";
import {getEuropeanLeague} from "./europe-data.js";
const $=id=>document.getElementById(id);
const euro=value=>Math.round(Number(value)||0).toLocaleString("ru-RU")+" €";
const compact=value=>{
 const n=Number(value)||0;
 return Math.abs(n)>=1000000?(n/1000000).toFixed(2).replace(/\.00$/,"")+" М €":
 Math.abs(n)>=1000?(n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,"")+" К €":euro(n);
};
function node(tag,klass="",txt=""){
 const el=document.createElement(tag);if(klass)el.className=klass;
 if(txt!==undefined&&txt!=="")el.textContent=String(txt);
 return el;
}
const positionNames={GK:"ВРАТАРЬ",CB:"ЗАЩИТНИК",CM:"ПОЛУЗАЩИТНИК",ST:"НАПАДАЮЩИЙ"};
export function initCoachUI({getActive,save,toast,go}){
 let tab="scout",selectedId=null,selectedSquad=false;
 const tabs={scout:"market-tab-scout",shortlist:"market-tab-shortlist",squad:"market-tab-squad",history:"market-tab-history"};
 const panels={scout:"market-list",shortlist:"shortlist-list",squad:"squad-list",history:"market-history"};
 function current(){
  const w=getActive();
  if(!w||w.mode!=="coach"){toast("Этот раздел доступен только тренеру");go("saves");return null}
  ensureManagement(w);return w;
 }
 function renderCoachSummary(w){
  if(!w)return;
  const m=ensureManagement(w),place=getStandings(w).findIndex(row=>row.id==="our")+1;
  const el=$("coach-finance");el.replaceChildren();
  for(const [label,value] of [
   ["БЮДЖЕТ КЛУБА",compact(m.balance)],
   ["МЕСТО В ЛИГЕ",place+" / "+m.standings.length],
   ["СЛЕДУЮЩИЙ СОПЕРНИК",getNextOpponent(w)],
   ["СТАДИОН",stadiumCapacity(m).toLocaleString("ru-RU")+" МЕСТ"]]){
   const item=node("div","finance-line");
   item.append(node("span","",label),node("strong","",value));el.append(item);
  }
 }
 function switchTab(next){
  if(!tabs[next])return;
  tab=next;
  for(const [key,id] of Object.entries(tabs)){
   const btn=$(id);btn.classList.toggle("active",key===tab);
   btn.setAttribute("aria-selected",key===tab?"true":"false");
   $(panels[key]).hidden=key!==tab;
  }
  $("market-list-title").textContent=({scout:"ДОСТУПНЫЕ ИГРОКИ",shortlist:"СПИСОК НАБЛЮДЕНИЯ",squad:"ИГРОКИ КЛУБА",history:"ИСТОРИЯ ПЕРЕХОДОВ"})[tab];
  $("market-filter-position").disabled=tab==="history";
  $("market-search").disabled=tab==="history";
  selectedId=null;
  selectedSquad=tab==="squad";
  renderMarket();
 }
 function playerEntry(p,isSquad,active){
  const btn=node("button","transfer-player-row");
  btn.type="button";
  if(active)btn.classList.add("selected");
  const portrait=node("span","transfer-mini-portrait");
  portrait.append(node("span","mini-portrait-head"),node("span","mini-portrait-body"));
  const identity=node("span","transfer-row-identity");
  identity.append(node("strong","",p.name),node("small","",positionNames[p.position]||p.position));
  const rating=node("span","transfer-row-rating",p.rating);
  const meta=node("span","transfer-row-value",compact(isSquad?(p.fee||p.rating*p.rating*50):p.fee));
  btn.append(portrait,identity,rating,meta);
  btn.onclick=()=>{
   selectedId=p.id;selectedSquad=isSquad;
   renderMarket();
  };
  return btn;
 }
 function renderPlayers(w){
  const m=ensureManagement(w),candidates=getMarketCandidates(w).filter(p=>!m.squad.some(s=>s.sourceId===p.id));
  const role=$("market-filter-position").value,search=$("market-search").value.trim().toLowerCase();
  const visible=p=> (!role||p.position===role)&&(!search||p.name.toLowerCase().includes(search)||p.position.toLowerCase().includes(search));
  const items=tab==="squad"?m.squad.filter(visible):tab==="shortlist"?
   candidates.filter(p=>m.shortlist.includes(p.id)&&visible(p)):
   tab==="history"?[]:candidates.filter(visible);
  const list=$(panels[tab]);list.replaceChildren();
  if(tab==="history"){
   const rows=m.transferHistory||[];
   if(!rows.length)list.append(node("p","transfer-empty","Сделок пока нет. Начни с поиска игрока."));
   for(let i=0;i<rows.length;i++){
    const el=node("div","transfer-history-row");
    el.append(node("span","history-index",String(i+1).padStart(2,"0")),node("span","",rows[i]));
    list.append(el);
   }
   $("market-result-count").textContent=rows.length+" ЗАПИСЕЙ";
   renderDetails(w,null,false);
   return;
  }
  if(!items.length)list.append(node("p","transfer-empty",tab==="shortlist"?
   "Список наблюдения пуст. Добавляй интересных игроков во вкладке поиска.":
   "Игроки по этим условиям не найдены."));
  for(const p of items)list.append(playerEntry(p,tab==="squad",selectedId===p.id));
  $("market-result-count").textContent=items.length+" ИГРОКОВ";
  let chosen=items.find(p=>p.id===selectedId);
  if(!chosen)chosen=items[0]||null;
  selectedId=chosen?.id||null;
  selectedSquad=tab==="squad";
  // Row states are rendered without recreating the selected profile during direct interaction.
  [...list.children].forEach(el=>{
   if(el.classList?.contains("transfer-player-row")){
    const rowName=el.querySelector?.(".transfer-row-identity strong")?.textContent;
    el.classList.toggle("selected",rowName===chosen?.name);
   }
  });
  renderDetails(w,chosen,tab==="squad");
 }
 function renderDetails(w,p,isSquad){
  const m=ensureManagement(w),has=Boolean(p),negotiation=has&&!isSquad?getTransferOffer(w,p.id):null;
  $("market-detail-tag").textContent=!has?"NETWORK":isSquad?"MY SQUAD":"SCOUT REPORT";
  $("market-detail-name").textContent=has?p.name:"ВЫБЕРИ ИГРОКА";
  $("market-detail-position").textContent=has?(positionNames[p.position]||p.position):"PLAYER PROFILE";
  $("market-detail-subtitle").textContent=!has?"Выбери футболиста слева, чтобы открыть его карточку.":
   isSquad?"КОНТРАКТ · ТВОЯ КОМАНДА":"КАНДИДАТ НА ТРАНСФЕР · ВРЕМЕННАЯ БАЗА";
  $("market-detail-rating").textContent=has?String(p.rating):"--";
  $("market-detail-value").textContent=has?compact(p.fee||p.rating*p.rating*50):"—";
  $("market-detail-wage").textContent=has?compact(p.salary):"—";
  $("market-detail-role").textContent=has?(positionNames[p.position]||p.position):"—";
  const bars=$("market-skill-bars");bars.replaceChildren();
  if(has){
   const stats=[
    ["СКОРОСТЬ",Math.max(30,Math.min(94,p.rating+(p.position==="ST"?5:0)-5))],
    ["УДАР",Math.max(30,Math.min(94,p.rating+(p.position==="ST"?7:-10)))],
    ["ПАС",Math.max(30,Math.min(94,p.rating+(p.position==="CM"?6:-5)))],
    ["ЗАЩИТА",Math.max(30,Math.min(94,p.rating+(p.position==="CB"?10:-7)))]
   ];
   for(const [label,value] of stats){
    const row=node("div","skill-bar-row");
    const head=node("div","skill-bar-head");
    head.append(node("span","",label),node("strong","",value));
    const rail=node("div","skill-bar-rail"),fill=node("div","skill-bar-fill");
    fill.style.width=value+"%";rail.append(fill);row.append(head,rail);bars.append(row);
   }
  }
  $("market-offer-area").hidden=!has;
  const offerInput=$("market-offer-input");
  const send=$("market-send-offer"),sign=$("market-complete-signing"),counter=$("market-accept-counter");
  const listPlayer=$("market-list-player"),sale=$("market-confirm-sale"),short=$("market-shortlist-toggle");
  send.hidden=!has||isSquad||negotiation?.status==="accepted"||negotiation?.status==="completed";
  sign.hidden=!has||isSquad||negotiation?.status!=="accepted";
  counter.hidden=!has||isSquad||negotiation?.status!=="counter";
  listPlayer.hidden=!isSquad||!has||Boolean(m.listings[p?.id]);
  sale.hidden=!isSquad||!has||!m.listings[p?.id];
  short.hidden=!has||isSquad;
  offerInput.disabled=!has||isSquad;
  offerInput.value=has&&!isSquad?(negotiation?.amount??p.fee):"";
  short.textContent=has&&m.shortlist.includes(p.id)?"★ УБРАТЬ ИЗ НАБЛЮДЕНИЯ":"☆ ДОБАВИТЬ В НАБЛЮДЕНИЕ";
  counter.textContent=negotiation?.counterAmount?
   "ПРИНЯТЬ "+compact(negotiation.counterAmount)+" ↗":"ПРИНЯТЬ ВСТРЕЧНУЮ ЦЕНУ ↗";
  if(isSquad){
   $("market-feedback").textContent=m.listings[p.id]?
    "Получено предварительное предложение "+euro(m.listings[p.id].amount)+". Можно согласиться на продажу.":
    "Игрок находится в твоём составе. Можно выставить его на трансфер.";
  }else{
   $("market-feedback").textContent=negotiation?.status==="counter"?
    "Клуб не принял первую цену. Встречное предложение: "+euro(negotiation.counterAmount):
    negotiation?.status==="accepted"?"Сумма согласована. Осталось завершить подписание.":
    negotiation?.status==="rejected"?"Клуб отклонил предыдущее предложение. Попробуй другую сумму.":
    negotiation?.status==="completed"?"Трансфер завершён. Игрок уже в команде.":
    "Предложи сумму. Клуб может принять её, отклонить или назвать встречную цену.";
  }
 }
 function renderMarket(){
  const w=current();if(!w)return;
  const m=ensureManagement(w);
  $("market-budget").textContent=compact(m.balance);
  $("market-squad-total").textContent=m.squad.length+" / 32";
  $("market-shortlist-count").textContent=m.shortlist.length;
  renderPlayers(w);
 }
 for(const [key,id] of Object.entries(tabs))$(id).onclick=()=>switchTab(key);
 $("market-search").oninput=()=>renderMarket();
 $("market-filter-position").onchange=()=>renderMarket();
 $("market-shortlist-toggle").onclick=()=>{
  const w=current();if(!w||!selectedId)return;
  const res=toggleShortlist(w,selectedId);
  if(!res.ok){toast(res.message);return}
  save();renderMarket();toast(res.added?"Добавлено в список наблюдения.":"Удалено из наблюдения.");
 };
 $("market-send-offer").onclick=()=>{
  const w=current();if(!w||!selectedId||selectedSquad)return;
  const res=submitTransferOffer(w,selectedId,$("market-offer-input").value);
  if(!res.ok){toast(res.message);return}
  save();renderMarket();toast(res.message);
 };
 $("market-accept-counter").onclick=()=>{
  const w=current();if(!w||!selectedId)return;
  const res=acceptTransferCounter(w,selectedId);
  if(!res.ok){toast(res.message);return}
  save();renderMarket();toast(res.message);
 };
 $("market-complete-signing").onclick=()=>{
  const w=current();if(!w||!selectedId)return;
  const res=finalizeTransfer(w,selectedId);
  if(!res.ok){toast(res.message);return}
  w.events??=[];w.events.unshift("ТРАНСФЕР · "+res.player.name+" подписан за "+euro(res.fee));
  save();selectedId=null;switchTab("squad");toast(res.message);
 };
 $("market-list-player").onclick=()=>{
  const w=current();if(!w||!selectedId||!selectedSquad)return;
  const res=listSquadPlayer(w,selectedId);
  if(!res.ok){toast(res.message);return}
  save();renderMarket();toast(res.message);
 };
 $("market-confirm-sale").onclick=()=>{
  const w=current();if(!w||!selectedId||!selectedSquad)return;
  const res=acceptSaleOffer(w,selectedId);
  if(!res.ok){toast(res.message);return}
  save();selectedId=null;renderMarket();toast("Продано: +"+euro(res.fee));
 };
 function renderStandings(){
  const w=current();if(!w)return;
  const l=getEuropeanLeague(w.leagueId),table=getStandings(w),el=$("standings-rows");el.replaceChildren();
  $("standings-league-name").textContent=l.name+" · "+l.countryLabel+" · ТУР "+ensureManagement(w).matchday;
  table.forEach((item,i)=>{
   const row=node("tr",item.id==="our"?"our-club-row":"");
   const cells=[String(i+1).padStart(2,"0"),item.name,item.p,item.w,item.d,item.l,item.gf+":"+item.ga,item.pts];
   cells.forEach(value=>row.append(node("td","",String(value))));el.append(row);
  });
 }
 function renderStadium(){
  const w=current();if(!w)return;
  const m=ensureManagement(w),cap=stadiumCapacity(m);
  $("stadium-name").textContent=m.stadium.name;
  $("stadium-capacity").textContent=cap.toLocaleString("ru-RU")+" МЕСТ";
  $("stadium-budget").textContent=compact(m.balance);
  $("stadium-revenue").textContent=m.matchday?compact(m.lastRevenue):"НЕТ МАТЧЕЙ";
  const el=$("stadium-upgrades");el.replaceChildren();
  m.stadium.stands.forEach((stand,i)=>{
   const cost=upgradeCost(m,i),visual=$("stadium-"+["north","east","south","west"][i]);
   visual.textContent=STAND_NAMES[i]+" · "+stand.seats.toLocaleString("ru-RU");
   const row=node("div","stadium-upgrade");
   row.append(node("strong","",STAND_NAMES[i]),
    node("span","management-details","УРОВЕНЬ "+stand.level+" · "+stand.seats.toLocaleString("ru-RU")+" МЕСТ"));
   const btn=node("button","","РАСШИРИТЬ +2 500 МЕСТ / "+compact(cost));btn.disabled=m.balance<cost;
   btn.onclick=()=>{
    const res=upgradeStand(w,i);
    if(!res.ok){toast(res.message);return}
    save();renderStadium();toast("Трибуна расширена! Вместимость "+res.capacity.toLocaleString("ru-RU"));
   };
   row.append(btn);el.append(row);
  });
  $("stadium-history").textContent="БИЛЕТ "+euro(m.stadium.ticketPrice)+"  /  ПРОШЛЫЙ МАТЧ "+m.lastAttendance.toLocaleString("ru-RU")+" ЗРИТЕЛЕЙ  /  ВЫРУЧКА "+compact(m.lastRevenue)+"  /  РАСХОДЫ "+compact(m.lastExpenses)+"  /  "+(m.history[0]||"");
 }
 return {renderCoachSummary,renderMarket,renderStandings,renderStadium,switchTab};
}
