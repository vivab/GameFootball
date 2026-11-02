import test from "node:test";
import assert from "node:assert/strict";
import {
 ensureManagement,stadiumCapacity,upgradeCost,upgradeStand,
 calculateMatchday,getMarketCandidates,buyCandidate,sellPlayer,
 getStandings,getNextOpponent,finishCoachMatch
} from "../manager/management.js";
const world=()=>({id:"test",mode:"coach",club:"Мой клуб",leagueId:"england-1",played:0});

test("new manager starts with a stadium budget four stands and anonymous squad",()=>{
 const w=world(),m=ensureManagement(w);
 assert.equal(m.balance,3000000);
 assert.equal(m.stadium.stands.length,4);
 assert.equal(stadiumCapacity(m),12000);
 assert.equal(m.squad.length,16);
 assert.ok(m.squad.every(p=>p.placeholder&&!p.name.includes("Роналду")));
 assert.equal(getStandings(w).length,20);
});
test("each stand upgrade consumes money and adds seats and projected ticket capacity",()=>{
 const w=world(),m=ensureManagement(w);
 const originalCapacity=stadiumCapacity(m),cost=upgradeCost(m,0),cash=m.balance;
 const projected=calculateMatchday(w,"win");
 const result=upgradeStand(w,0);
 assert.equal(result.ok,true);
 assert.equal(stadiumCapacity(m),originalCapacity+2500);
 assert.equal(m.balance,cash-cost);
 const after=calculateMatchday(w,"win");
 assert.ok(after.attendance>projected.attendance);
 assert.ok(after.gross>projected.gross);
});
test("stadium upgrade rejects insufficient cash",()=>{
 const w=world(),m=ensureManagement(w);
 m.balance=0;
 assert.equal(upgradeStand(w,2).ok,false);
 assert.equal(stadiumCapacity(m),12000);
});
test("transfer market buys and sells anonymous players with persistent balance",()=>{
 const w=world(),m=ensureManagement(w);
 const candidate=getMarketCandidates(w)[0],start=m.balance;
 const bought=buyCandidate(w,candidate.id);
 assert.ok(bought.ok);
 assert.equal(m.squad.length,17);
 assert.equal(m.balance,start-candidate.fee);
 assert.equal(bought.player.placeholder,true);
 const sold=sellPlayer(w,bought.player.id);
 assert.ok(sold.ok);
 assert.equal(m.squad.length,16);
 assert.equal(m.balance,start-candidate.fee+sold.fee);
});
test("manager cannot sell below eleven playable placeholders",()=>{
 const w=world(),m=ensureManagement(w);
 m.squad=m.squad.slice(0,11);
 assert.equal(sellPlayer(w,m.squad[0].id).ok,false);
});
test("league table updates for team and opponent after each match",()=>{
 const w=world(),m=ensureManagement(w),enemy=getNextOpponent(w);
 const result=finishCoachMatch(w,3,0,enemy);
 const ours=getStandings(w).find(t=>t.id==="our");
 assert.equal(ours.p,1);assert.equal(ours.w,1);assert.equal(ours.pts,3);
 assert.equal(ours.gf,3);assert.equal(ours.ga,0);
 assert.equal(result.place,1);
 assert.equal(m.matchday,1);
 assert.ok(m.lastRevenue>0&&m.lastAttendance>0);
 assert.equal(getNextOpponent(w),"Команда 02");
});
test("manager state survives save load as plain JSON",()=>{
 const w=world();ensureManagement(w);upgradeStand(w,3);
 const restored=JSON.parse(JSON.stringify(w));
 const m=ensureManagement(restored);
 assert.equal(stadiumCapacity(m),14500);
 assert.equal(m.stadium.stands[3].level,2);
});
