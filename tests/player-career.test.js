import test from "node:test";
import assert from "node:assert/strict";
import {
 makePlayerProfile,ensurePlayerProfile,training,matchProgress,
 availableOffers,acceptOffer,positionIndex,positionLabel,playerOverall
} from "../manager/player-career.js";

test("player is user-created only; no built-in real footballer presets",()=>{
 const world={mode:"custom",name:"Игрок",club:"Мой клуб"};
 const p=ensurePlayerProfile(world);
 assert.equal(p.age,18);
 assert.equal(p.position,"ST");
 assert.ok(playerOverall(p)>40);
 assert.equal(p.appearances,0);
});
test("coach career does not create a player profile",()=>{
 const world={mode:"coach",name:"Тренер"};
 assert.equal(ensurePlayerProfile(world),null);
 assert.equal(world.player,undefined);
});
test("custom positions map to correct actor",()=>{
 assert.equal(positionIndex("GK"),0);
 assert.equal(positionIndex("CB"),2);
 assert.equal(positionIndex("CM"),6);
 assert.equal(positionIndex("ST"),9);
 assert.equal(positionLabel("GK"),"Вратарь");
 assert.equal(makePlayerProfile("Иван","custom","GK").number,1);
});
test("skill points increase individual stats with a 99 cap",()=>{
 const p=makePlayerProfile("Игрок");
 const first=p.skills.shooting;
 const result=training(p,"shooting");
 assert.equal(result.ok,true);
 assert.equal(p.skills.shooting,first+2);
 assert.equal(p.skillPoints,2);
 p.skills.shooting=98;
 assert.ok(training(p,"shooting").ok);
 assert.equal(p.skills.shooting,99);
 assert.equal(training(p,"shooting").ok,false);
 p.skillPoints=0;
 assert.equal(training(p,"pace").ok,false);
});
test("AI-watched match decisions reward goals, assists and keeper saves",()=>{
 const p=makePlayerProfile("Номер 9");
 const result=matchProgress(p,{goals:2,assists:1,passes:8,saves:2},"win");
 assert.equal(p.goals,2);
 assert.equal(p.assists,1);
 assert.equal(p.passes,8);
 assert.equal(p.saves,2);
 assert.equal(p.appearances,1);
 assert.ok(result.points>=1);
 assert.ok(p.experience>0&&p.trust>55);
});
test("no old fake clubs or real players are offered as signed agents",()=>{
 const world={mode:"custom",name:"Игрок",club:"Мой клуб",player:makePlayerProfile("Игрок")};
 world.player.appearances=10;
 assert.deepEqual(availableOffers(world),[]);
 assert.equal(acceptOffer(world,"Любой клуб"),false);
});
test("migration keeps older user career statistics",()=>{
 const world={mode:"custom",name:"Старое сохранение",played:8,player:{skills:{shooting:78},goals:15}};
 const p=ensurePlayerProfile(world);
 assert.equal(p.skills.shooting,78);
 assert.equal(p.goals,15);
 assert.equal(p.appearances,0);
 assert.equal(world.played,8);
});
