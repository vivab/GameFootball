import test from "node:test";
import assert from "node:assert/strict";
import {
 ensureManagement,getMarketCandidates,toggleShortlist,getTransferOffer,
 submitTransferOffer,acceptTransferCounter,finalizeTransfer,
 listSquadPlayer,acceptSaleOffer
} from "../manager/management.js";
const create=()=>({mode:"coach",name:"Тренер",club:"Мой клуб",leagueId:"england-1"});
test("transfers start with an empty scout shortlist and negotiations",()=>{
 const w=create(),m=ensureManagement(w);
 assert.deepEqual(m.shortlist,[]);assert.deepEqual(m.negotiations,{});assert.deepEqual(m.listings,{});
});
test("adding and removing a prospect from scouting shortlist persists",()=>{
 const w=create(),p=getMarketCandidates(w)[0];
 assert.equal(toggleShortlist(w,p.id).added,true);
 assert.equal(ensureManagement(w).shortlist.includes(p.id),true);
 assert.equal(toggleShortlist(w,p.id).added,false);
 assert.equal(ensureManagement(w).shortlist.includes(p.id),false);
});
test("club rejects extremely low offers and budget is unchanged",()=>{
 const w=create(),p=getMarketCandidates(w)[1],balance=ensureManagement(w).balance;
 const result=submitTransferOffer(w,p.id,Math.floor(p.fee*.5));
 assert.equal(result.ok,true);assert.equal(result.offer.status,"rejected");
 assert.equal(ensureManagement(w).balance,balance);
 assert.equal(finalizeTransfer(w,p.id).ok,false);
});
test("counteroffer requires explicit acceptance before signing",()=>{
 const w=create(),p=getMarketCandidates(w)[2];
 const result=submitTransferOffer(w,p.id,Math.floor(p.fee*.84));
 assert.equal(result.offer.status,"counter");
 assert.equal(finalizeTransfer(w,p.id).ok,false);
 const counter=acceptTransferCounter(w,p.id);
 assert.equal(counter.ok,true);assert.equal(counter.offer.status,"accepted");
 const old=ensureManagement(w).balance,oldSize=ensureManagement(w).squad.length;
 const signing=finalizeTransfer(w,p.id);
 assert.equal(signing.ok,true);
 assert.equal(ensureManagement(w).balance,old-signing.fee);
 assert.equal(ensureManagement(w).squad.length,oldSize+1);
 assert.equal(getTransferOffer(w,p.id).status,"completed");
 assert.equal(finalizeTransfer(w,p.id).ok,false);
});
test("acceptable offer waits for transfer completion to change cash",()=>{
 const w=create(),p=getMarketCandidates(w)[3],balance=ensureManagement(w).balance;
 const offer=submitTransferOffer(w,p.id,p.fee);
 assert.equal(offer.offer.status,"accepted");
 assert.equal(ensureManagement(w).balance,balance);
 const signed=finalizeTransfer(w,p.id);
 assert.equal(signed.ok,true);assert.equal(ensureManagement(w).balance,balance-p.fee);
 assert.equal(signed.player.sourceId,p.id);
});
test("squad player must be transfer-listed before sale",()=>{
 const w=create(),m=ensureManagement(w),p=m.squad[12],initial=m.balance;
 assert.equal(acceptSaleOffer(w,p.id).ok,false);
 const listing=listSquadPlayer(w,p.id);
 assert.equal(listing.ok,true);
 assert.equal(m.balance,initial);
 const sold=acceptSaleOffer(w,p.id);
 assert.equal(sold.ok,true);
 assert.equal(m.balance,initial+sold.fee);
 assert.equal(m.squad.some(q=>q.id===p.id),false);
 assert.equal(m.listings[p.id],undefined);
});
test("negotiations and shortlist restore from career saved JSON",()=>{
 const w=create(),p=getMarketCandidates(w)[4];
 toggleShortlist(w,p.id);submitTransferOffer(w,p.id,p.fee);
 const restored=JSON.parse(JSON.stringify(w)),m=ensureManagement(restored);
 assert.equal(m.shortlist[0],p.id);
 assert.equal(m.negotiations[p.id].status,"accepted");
});
test("offers cannot spend more cash than the manager has",()=>{
 const w=create(),p=getMarketCandidates(w)[6];ensureManagement(w).balance=1;
 assert.equal(submitTransferOffer(w,p.id,p.fee).ok,false);
 assert.equal(finalizeTransfer(w,p.id).ok,false);
});

test("shortlisted scout prospects do not vanish when a new matchday begins",()=>{
 const w=create(),m=ensureManagement(w),candidate=getMarketCandidates(w)[5];
 toggleShortlist(w,candidate.id);
 m.matchday=4;
 assert.ok(getMarketCandidates(w).some(p=>p.id===candidate.id));
 assert.ok(m.shortlist.includes(candidate.id));
});
test("sale pays the exact price shown when transfer-listed",()=>{
 const w=create(),p=ensureManagement(w).squad[12];
 const offered=listSquadPlayer(w,p.id);
 const balance=ensureManagement(w).balance;
 const sold=acceptSaleOffer(w,p.id);
 assert.equal(sold.ok,true);
 assert.equal(sold.fee,offered.amount);
 assert.equal(ensureManagement(w).balance,balance+offered.amount);
});
