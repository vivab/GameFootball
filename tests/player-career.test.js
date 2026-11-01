import test from "node:test";
import assert from "node:assert/strict";
import {
  makePlayerProfile,ensurePlayerProfile,training,matchProgress,
  availableOffers,acceptOffer,positionIndex,playerOverall,REAL_PRESETS
} from "../manager/player-career.js";

test("player career profile differs from coach profile",()=>{
  const coach={mode:"coach",name:"Тренер"};
  assert.equal(ensurePlayerProfile(coach),null);
  assert.equal(coach.player,undefined);
  const world={mode:"custom",name:"Тестовый игрок"};
  const player=ensurePlayerProfile(world);
  assert.equal(player.position,"ST");
  assert.equal(player.age,18);
  assert.equal(player.appearances,0);
  assert.ok(player.skills.shooting>0);
});
test("real player scenario uses example profile; all slots have valid stats",()=>{
  for(const [name,preset] of Object.entries(REAL_PRESETS)){
    const profile=makePlayerProfile(name,"real");
    assert.equal(profile.age,preset.age);
    assert.equal(profile.number,preset.number);
    assert.equal(profile.position,preset.position);
    assert.ok(playerOverall(profile)>0);
  }
});
test("custom positions map to separate field player slots",()=>{
  assert.equal(positionIndex("ST"),9);
  assert.equal(positionIndex("CM"),6);
  assert.equal(positionIndex("CB"),2);
  assert.equal(makePlayerProfile("Петр","custom","CB").position,"CB");
});
test("training spends points and caps attributes at 99",()=>{
  const p=makePlayerProfile("Игрок","custom");
  const before=p.skills.shooting;
  assert.equal(training(p,"shooting").ok,true);
  assert.equal(p.skills.shooting,before+2);
  assert.equal(p.skillPoints,2);
  p.skills.shooting=98;
  assert.match(training(p,"shooting").message,/\+1/);
  assert.equal(p.skills.shooting,99);
  assert.equal(training(p,"shooting").ok,false);
  p.skillPoints=0;
  assert.equal(training(p,"pace").ok,false);
});
test("match statistics, trust and training points accumulate",()=>{
  const p=makePlayerProfile("Игрок","custom");
  const result=matchProgress(p,{goals:2,assists:1,passes:7},"win");
  assert.equal(p.appearances,1);
  assert.equal(p.goals,2);assert.equal(p.assists,1);assert.equal(p.passes,7);
  assert.ok(result.points>=1);
  assert.equal(p.skillPoints,3+result.points);
  assert.ok(p.experience>0);
  assert.ok(p.trust>55);
  assert.ok(p.fitness<100);
});
test("contract offers need three matches and have transfer cooldown",()=>{
  const world={mode:"custom",name:"Игрок",club:"ФК Академия",events:[],player:makePlayerProfile("Игрок","custom")};
  assert.equal(availableOffers(world).length,0);
  world.player.appearances=3;
  const offers=availableOffers(world);
  assert.ok(offers.some(o=>o.club==="ФК Север"));
  assert.equal(acceptOffer(world,"ФК Север"),true);
  assert.equal(world.club,"ФК Север");
  assert.equal(availableOffers(world).length,0);
  world.player.appearances+=3;
  assert.ok(availableOffers(world).length>0);
});
test("old player saves get a profile but keep other career fields",()=>{
  const world={mode:"real",name:"Лионель Месси",club:"Исторический клуб",played:8};
  const p=ensurePlayerProfile(world);
  assert.equal(p.age,39);assert.equal(world.played,8);
  assert.strictEqual(ensurePlayerProfile(world),p);
  const oldCustom={mode:"custom",name:"Старый игрок",player:{skills:{shooting:65}}};
  const profile=ensurePlayerProfile(oldCustom);
  assert.equal(profile.skills.shooting,65);
  assert.ok(profile.skills.pace>0);
});
