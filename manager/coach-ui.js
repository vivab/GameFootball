import {ensureManagement,getMarketCandidates,buyCandidate,sellPlayer,getStandings,
 stadiumCapacity,upgradeCost,upgradeStand,STAND_NAMES,getNextOpponent} from "./management.js";
import {getEuropeanLeague} from "./europe-data.js";
const $=id=>document.getElementById(id);
const euro=value=>Math.round(Number(value)||0).toLocaleString("ru-RU")+" €";
function node(tag,klass="",txt=""){const el=document.createElement(tag);if(klass)el.className=klass;if(txt)el.textContent=txt;return el}
export function initCoachUI({getActive,save,toast,go}){
 function current(){
  const w=getActive();if(!w||w.mode!=="coach"){toast("Этот раздел доступен в карьере тренера");go("career");return null}
  ensureManagement(w);return w;
 }
 function renderCoachSummary(w){
  if(!w||w.mode!=="coach")return;
  const m=ensureManagement(w),pos=getStandings(w).findIndex(r=>r.id==="our")+1;
  $("coach-finance").textContent="Бюджет "+euro(m.balance)+" · "+pos+"-е место · Стадион "+stadiumCapacity(m).toLocaleString("ru-RU")+" мест · Следующий соперник: "+getNextOpponent(w);
 }
 function renderMarket(){
  const w=current();if(!w)return;
  const m=ensureManagement(w);
  $("market-budget").textContent="ТРАНСФЕРНЫЙ БЮДЖЕТ: "+euro(m.balance);
  $("market-squad-total").textContent="В заявке: "+m.squad.length+" футболистов (временные номера)";
  const market=$("market-list");market.replaceChildren();
  for(const candidate of getMarketCandidates(w)){
   const card=node("div","management-item");
   card.append(node("strong","",candidate.name),node("span","management-details",candidate.position+" · Рейтинг "+candidate.rating+" · Зарплата "+euro(candidate.salary)));
   card.append(node("b","",euro(candidate.fee)));
   const buy=node("button","market-buy","КУПИТЬ");buy.disabled=m.balance<candidate.fee||m.squad.length>=32;
   buy.onclick=()=>{
    const res=buyCandidate(w,candidate.id);
    if(!res.ok){toast(res.message);return}
    w.events??=[];w.events.unshift("Трансфер: "+res.player.name);
    save();renderMarket();toast("Трансфер оформлен: "+res.player.name);
   };
   card.append(buy);market.append(card);
  }
  const squad=$("squad-list");squad.replaceChildren();
  for(const p of m.squad){
   const card=node("div","management-item");
   card.append(node("strong","",p.name),node("span","management-details",p.position+" · Рейтинг "+p.rating));
   const btn=node("button","market-sell","ПРОДАТЬ");btn.disabled=m.squad.length<=11;
   btn.onclick=()=>{
    const res=sellPlayer(w,p.id);
    if(!res.ok){toast(res.message);return}
    save();renderMarket();toast("Игрок продан: +"+euro(res.fee));
   };
   card.append(btn);squad.append(card);
  }
  $("market-history").textContent=m.transferHistory.length?"Последние сделки: "+m.transferHistory.slice(0,5).join(" · "):"Пока нет сделок. Настоящие команды и игроки появятся после ручного наполнения базы.";
 }
 function renderStandings(){
  const w=current();if(!w)return;
  const l=getEuropeanLeague(w.leagueId),table=getStandings(w),el=$("standings-rows");el.replaceChildren();
  $("standings-league-name").textContent=l.name+" · "+l.countryLabel+" · Тур "+ensureManagement(w).matchday;
  table.forEach((item,i)=>{
   const row=node("tr",item.id==="our"?"our-club-row":"");
   const cells=[String(i+1),item.name,item.p,item.w,item.d,item.l,item.gf+":"+item.ga,item.pts];
   cells.forEach(value=>row.append(node("td","",String(value))));
   el.append(row);
  });
 }
 function renderStadium(){
  const w=current();if(!w)return;
  const m=ensureManagement(w),cap=stadiumCapacity(m);
  $("stadium-name").textContent=m.stadium.name;
  $("stadium-capacity").textContent=cap.toLocaleString("ru-RU")+" мест";
  $("stadium-budget").textContent=euro(m.balance);
  $("stadium-revenue").textContent=m.matchday?euro(m.lastRevenue)+" билеты":"Матчи ещё не сыграны";
  const el=$("stadium-upgrades");el.replaceChildren();
  m.stadium.stands.forEach((stand,i)=>{
   const cost=upgradeCost(m,i);
   const visual=$("stadium-"+["north","east","south","west"][i]);
   visual.textContent=STAND_NAMES[i]+" · "+stand.seats.toLocaleString("ru-RU")+" мест";
   const row=node("div","stadium-upgrade");
   row.append(node("strong","",STAND_NAMES[i]),node("span","management-details","Уровень "+stand.level+" · "+stand.seats.toLocaleString("ru-RU")+" мест"));
   const b=node("button","","РАСШИРИТЬ +2 500 МЕСТ · "+euro(cost));b.disabled=m.balance<cost;
   b.onclick=()=>{
    const result=upgradeStand(w,i);
    if(!result.ok){toast(result.message);return}
    save();renderStadium();toast("Трибуна расширена! Вместимость "+result.capacity.toLocaleString("ru-RU"));
   };
   row.append(b);el.append(row);
  });
  $("stadium-history").textContent="Цена билета: "+euro(m.stadium.ticketPrice)+" · Прошлый матч: "+m.lastAttendance.toLocaleString("ru-RU")+" зрителей · Выручка "+euro(m.lastRevenue)+" · Расходы "+euro(m.lastExpenses)+". "+(m.history[0]||"");
 }
 return {renderCoachSummary,renderMarket,renderStandings,renderStadium};
}
