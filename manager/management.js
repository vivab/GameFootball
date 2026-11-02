import {getEuropeanLeague,placeholderClubs} from "./europe-data.js";
export const STAND_NAMES=["Северная трибуна","Восточная трибуна","Южная трибуна","Западная трибуна"];
export const START_BALANCE=3000000;
export const SEAT_PRICE=25;
function round(v){return Math.max(0,Math.round(v))}
function id(seed){return String(seed).replace(/[^a-zA-Z0-9-]/g,"").slice(0,42)}
function makeRow(id,name){return {id,name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}}
function calcGoalFor(r){return r.gf-r.ga}
export function ensureManagement(world){
 if(!world)return null;
 const l=getEuropeanLeague(world.leagueId);
 if(!world.leagueId)world.leagueId=l.id;
 if(!world.management){
  const clubs=placeholderClubs(world);
  world.management={
   balance:START_BALANCE,
   stadium:{name:"Стадион «"+world.club+"»",stands:[{seats:3000,level:1},{seats:3000,level:1},{seats:3000,level:1},{seats:3000,level:1}],ticketPrice:SEAT_PRICE},
   squad:Array.from({length:16},(_,i)=>({id:"draft-"+(i+1),name:"Игрок №"+String(i+1).padStart(2,"0"),position:i===0||i===11?"GK":i<=5?"CB":i<=10?"CM":"ST",rating:58+i%12,salary:15000,placeholder:true})),
   standings:[makeRow("our",world.club),...clubs.map((name,i)=>makeRow("opponent-"+(i+1),name))],
   transferHistory:[],history:[],shortlist:[],negotiations:{},listings:{},lastAttendance:0,lastRevenue:0,lastExpenses:0,
   reputation:45,matchday:0
  };
 }
 const m=world.management;
 m.balance=Number.isFinite(m.balance)?m.balance:START_BALANCE;
 m.stadium??={name:"Стадион «"+world.club+"»",stands:STAND_NAMES.map(()=>({seats:3000,level:1})),ticketPrice:SEAT_PRICE};
 if(!Array.isArray(m.stadium.stands)||m.stadium.stands.length!==4)m.stadium.stands=STAND_NAMES.map(()=>({seats:3000,level:1}));
 if(!Array.isArray(m.squad))m.squad=[];
 if(!Array.isArray(m.standings))m.standings=[makeRow("our",world.club),...placeholderClubs(world).map((name,i)=>makeRow("opponent-"+(i+1),name))];
 if(!Array.isArray(m.transferHistory))m.transferHistory=[];
 if(!Array.isArray(m.shortlist))m.shortlist=[];
 if(!m.negotiations||typeof m.negotiations!=="object")m.negotiations={};
 if(!m.listings||typeof m.listings!=="object")m.listings={};

 if(!Array.isArray(m.history))m.history=[];
 m.reputation=Number.isFinite(m.reputation)?m.reputation:45;
 m.matchday=Number.isFinite(m.matchday)?m.matchday:0;
 const our=m.standings.find(row=>row.id==="our");
 if(our)our.name=world.club;
 return m;
}
export function stadiumCapacity(m){return (m.stadium.stands||[]).reduce((n,s)=>n+s.seats,0)}
export function upgradeCost(m,index){
 const s=m.stadium.stands[index];if(!s)return Infinity;
 return 380000+(s.level-1)*300000;
}
export function upgradeStand(w,index){
 const m=ensureManagement(w);const stand=m.stadium.stands[index],cost=upgradeCost(m,index);
 if(!stand)return {ok:false,message:"Трибуна не найдена."};
 if(m.balance<cost)return {ok:false,message:"Не хватает средств на улучшение."};
 m.balance-=cost;stand.level++;stand.seats+=2500;
 m.history.unshift("Улучшена «"+STAND_NAMES[index]+"» (+2 500 мест): −"+cost.toLocaleString("ru-RU")+" €");
 m.history=m.history.slice(0,30);
 return {ok:true,cost,capacity:stadiumCapacity(m)};
}
export function calculateMatchday(w,result="draw"){
 const m=ensureManagement(w);
 const capacity=stadiumCapacity(m);
 const demand=Math.max(.35,Math.min(.96,.58+m.reputation*.0035+(result==="win"?.05:result==="loss"?-.04:0)));
 const attendance=Math.min(capacity,Math.round(capacity*demand));
 const gross=attendance*m.stadium.ticketPrice;
 const wage=round(m.squad.reduce((n,p)=>n+(Number(p.salary)||0),0)*.5);
 const maintenance=round(20000+capacity*2);
 const expenses=wage+maintenance;
 return {attendance,capacity,gross,expenses,net:gross-expenses};
}
function addScore(row,gf,ga){
 row.p++;row.gf+=gf;row.ga+=ga;
 if(gf>ga){row.w++;row.pts+=3}
 else if(gf===ga){row.d++;row.pts++}
 else row.l++;
}
export function getStandings(w){
 const m=ensureManagement(w);
 return [...m.standings].sort((a,b)=>b.pts-a.pts||calcGoalFor(b)-calcGoalFor(a)||b.gf-a.gf||a.name.localeCompare(b.name,"ru"));
}
export function getNextOpponent(w){
 const m=ensureManagement(w);
 const rivals=m.standings.filter(t=>t.id!=="our");
 return rivals[(m.matchday||0)%rivals.length]?.name||"Команда 01";
}
export function finishCoachMatch(w,homeGoals,awayGoals,opponentName){
 const m=ensureManagement(w),result=homeGoals>awayGoals?"win":homeGoals===awayGoals?"draw":"loss";
 const our=m.standings.find(r=>r.id==="our");
 const rival=m.standings.find(r=>r.name===opponentName&&r.id!=="our");
 if(our)addScore(our,homeGoals,awayGoals);
 if(rival)addScore(rival,awayGoals,homeGoals);
 // Other teams play one fixture per round with plausible 0–3 goals, never fabricated real names.
 const others=m.standings.filter(r=>r.id!=="our"&&r.id!==rival?.id);
 for(let i=0;i+1<others.length;i+=2){
  const x=Math.floor(Math.random()*4),y=Math.floor(Math.random()*4);
  addScore(others[i],x,y);addScore(others[i+1],y,x);
 }
 m.reputation=Math.max(0,Math.min(100,m.reputation+(result==="win"?2:result==="loss"?-1:0)));
 const finance=calculateMatchday(w,result);
 m.balance+=finance.net;m.lastAttendance=finance.attendance;
 m.lastRevenue=finance.gross;m.lastExpenses=finance.expenses;m.matchday++;
 m.history.unshift("Тур "+m.matchday+": "+w.club+" "+homeGoals+":"+awayGoals+" "+opponentName+" · билеты +"+finance.gross.toLocaleString("ru-RU")+" € · расходы −"+finance.expenses.toLocaleString("ru-RU")+" €");
 m.history=m.history.slice(0,30);
 return {result,finance,balance:m.balance,place:getStandings(w).findIndex(r=>r.id==="our")+1};
}
const POSITIONS=["GK","CB","CM","ST"];
export function getMarketCandidates(w){
 const m=ensureManagement(w);
 // Stable scouting candidates: prospects remain available across matches and in the shortlist.
 if(!Array.isArray(m.scoutingPool)||!m.scoutingPool.length){
  m.scoutingPool=Array.from({length:16},(_,i)=>{
   const rating=57+(i*7+Math.floor(i/4)*2)%27;
   const position=POSITIONS[i%POSITIONS.length];
   const fee=round(rating*rating*75+i*23500);
   return {id:"scout-"+(i+1),name:"Кандидат №"+String(i+1).padStart(2,"0"),
    position,rating,fee,salary:Math.round(fee*.025),placeholder:true};
  });
 }
 return m.scoutingPool;
}
export function buyCandidate(w,idValue,agreedPrice=null){
 const m=ensureManagement(w),candidate=getMarketCandidates(w).find(c=>c.id===idValue);
 if(!candidate)return {ok:false,message:"Предложение уже недоступно."};
 if(m.squad.some(p=>p.sourceId===idValue))return {ok:false,message:"Этот футболист уже подписан."};
 const price=Number.isFinite(agreedPrice)?Math.round(agreedPrice):candidate.fee;
 if(!Number.isFinite(price)||price<0||price>candidate.fee*2)return {ok:false,message:"Некорректная стоимость трансфера."};
 if(m.balance<price)return {ok:false,message:"Недостаточно денег для трансфера."};
 if(m.squad.length>=32)return {ok:false,message:"В заявке максимум 32 футболиста."};
 m.balance-=price;
 const player={...candidate,fee:price,sourceId:idValue,id:"signed-"+id(Date.now())+"-"+m.squad.length};
 m.squad.push(player);
 m.transferHistory.unshift("Покупка: "+candidate.name+" ("+candidate.position+") −"+price.toLocaleString("ru-RU")+" €");
 m.transferHistory=m.transferHistory.slice(0,35);
 return {ok:true,player,fee:price};
}
export function sellPlayer(w,playerId){
 const m=ensureManagement(w),index=m.squad.findIndex(p=>p.id===playerId);
 if(index<0)return {ok:false,message:"Игрок отсутствует в заявке."};
 if(m.squad.length<=11)return {ok:false,message:"Для симуляции необходимо минимум 11 футболистов."};
 const p=m.squad[index],fee=m.listings?.[playerId]?.amount??(p.fee?Math.round(p.fee*.65):Math.round(p.rating*p.rating*50));
 m.squad.splice(index,1);m.balance+=fee;delete m.listings[playerId];
 m.transferHistory.unshift("Продажа: "+p.name+" +"+fee.toLocaleString("ru-RU")+" €");
 return {ok:true,player:p,fee};
}

// Scouting and formal offer workflow. Nothing leaves the browser.
export function toggleShortlist(w,candidateId){
 const m=ensureManagement(w);
 const available=getMarketCandidates(w).some(p=>p.id===candidateId);
 if(!available)return {ok:false,message:"Футболист больше не доступен на рынке."};
 const idx=m.shortlist.indexOf(candidateId);
 if(idx>=0)m.shortlist.splice(idx,1);
 else m.shortlist.push(candidateId);
 return {ok:true,added:idx<0,count:m.shortlist.length};
}
export function getTransferOffer(w,candidateId){
 return ensureManagement(w).negotiations[candidateId]||null;
}
export function submitTransferOffer(w,candidateId,amount){
 const m=ensureManagement(w);
 const candidate=getMarketCandidates(w).find(p=>p.id===candidateId);
 if(!candidate)return {ok:false,message:"Игрок отсутствует на рынке."};
 if(m.squad.some(p=>p.sourceId===candidateId))return {ok:false,message:"Этот игрок уже в твоей команде."};
 const price=Math.round(Number(amount));
 if(!Number.isFinite(price)||price<=0)return {ok:false,message:"Введи сумму предложения больше нуля."};
 if(price>m.balance)return {ok:false,message:"Недостаточно средств для такого предложения."};
 const required=candidate.fee;
 let status="accepted",counterAmount=null,message="Клуб готов согласиться на предложенную сумму.";
 if(price<required*.72){status="rejected";message="Клуб отклонил предложение — оно слишком далеко от оценки игрока."}
 else if(price<required*.94){
  status="counter";
  counterAmount=Math.ceil(required*.94/10000)*10000;
  message="Клуб предлагает встречную сумму: "+counterAmount.toLocaleString("ru-RU")+" €.";
 }
 const offer={candidateId,askingPrice:required,amount:price,counterAmount,status,createdMatchday:m.matchday};
 m.negotiations[candidateId]=offer;
 m.transferHistory.unshift("Переговоры: "+candidate.name+" · "+price.toLocaleString("ru-RU")+" € · "+status);
 m.transferHistory=m.transferHistory.slice(0,35);
 return {ok:true,offer,message};
}
export function acceptTransferCounter(w,candidateId){
 const m=ensureManagement(w),offer=getTransferOffer(w,candidateId);
 if(!offer||offer.status!=="counter")return {ok:false,message:"Нет встречного предложения."};
 if(m.balance<offer.counterAmount)return {ok:false,message:"Бюджета недостаточно для встречного предложения."};
 offer.amount=offer.counterAmount;offer.status="accepted";
 return {ok:true,offer,message:"Клуб согласовал сумму "+offer.amount.toLocaleString("ru-RU")+" €. Подтверди подписание."};
}
export function finalizeTransfer(w,candidateId){
 const m=ensureManagement(w),offer=getTransferOffer(w,candidateId);
 if(!offer||offer.status!=="accepted")return {ok:false,message:"Сначала договорись с клубом о сумме трансфера."};
 const res=buyCandidate(w,candidateId,offer.amount);
 if(!res.ok)return res;
 offer.status="completed";
 m.shortlist=m.shortlist.filter(id=>id!==candidateId);
 return {ok:true,player:res.player,fee:res.fee,message:"Трансфер оформлен!"};
}
export function listSquadPlayer(w,playerId){
 const m=ensureManagement(w),p=m.squad.find(x=>x.id===playerId);
 if(!p)return {ok:false,message:"Футболист не найден в заявке."};
 if(m.squad.length<=11)return {ok:false,message:"Нельзя оставить меньше 11 футболистов."};
 const value=Math.round(p.fee?p.fee*.75:p.rating*p.rating*50);
 m.listings[playerId]={playerId,amount:value,listedMatchday:m.matchday};
 return {ok:true,amount:value,message:"Игрок выставлен на трансфер. Получено предварительное предложение."};
}
export function acceptSaleOffer(w,playerId){
 const m=ensureManagement(w),listing=m.listings[playerId];
 if(!listing)return {ok:false,message:"Сначала выстави футболиста на трансфер."};
 return sellPlayer(w,playerId);
}
