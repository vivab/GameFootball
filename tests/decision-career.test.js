import test from "node:test";
import assert from "node:assert/strict";
import {EUROPE_LEAGUES,EUROPE_COUNTRIES,getEuropeanLeague} from "../manager/europe-data.js";
import {SCENARIOS,makeDecisions,getDecisionOptions,evaluateChoice} from "../manager/decision-engine.js";

test("only European league templates remain and none include real clubs or people",()=>{
 assert.ok(EUROPE_LEAGUES.length>=40);
 assert.ok(EUROPE_COUNTRIES.length>=20);
 assert.ok(EUROPE_LEAGUES.every(l=>l.region==="europe"&&l.clubs.length===0&&l.players.length===0));
 assert.equal(getEuropeanLeague("england-1").name,"Premier League");
});
test("player sees seven distinct AI decision moments, including standard kicks",()=>{
 const scenes=makeDecisions(()=>.42,"ST");
 assert.equal(scenes.length,7);
 assert.ok(scenes.every((m,i)=>i===0||m.minute>scenes[i-1].minute));
 assert.ok(scenes.some(m=>["penalty","freekick","corner"].includes(m.kind)));
});
test("one vs one, two vs one, three vs one have many tactical choices",()=>{
 for(const kind of ["duel","two","three"]){
  assert.ok(getDecisionOptions({kind}).length>=7,kind);
  assert.ok(getDecisionOptions({kind}).some(x=>x.action==="shot"),kind+" needs shot");
 }
});
test("penalty and free kick include nine distinct executions",()=>{
 assert.equal(getDecisionOptions({kind:"penalty"}).length,9);
 assert.equal(getDecisionOptions({kind:"freekick"}).length,9);
 const ids=getDecisionOptions({kind:"penalty"}).map(x=>x.id);
 assert.equal(ids.length,new Set(ids).size);
 assert.ok(ids.includes("p-panenka"));
});
test("choice success uses player skill and risk, not guaranteed outcomes",()=>{
 const moment={kind:"duel"},fast={shooting:95},slow={shooting:45};
 const strong=evaluateChoice(moment,"far-low",fast,()=>.5);
 const weak=evaluateChoice(moment,"far-low",slow,()=>.5);
 assert.ok(strong.probability>weak.probability);
 assert.equal(evaluateChoice(moment,"far-low",fast,()=>0).success,true);
 assert.equal(evaluateChoice(moment,"far-low",fast,()=>.99).success,false);
 assert.equal(evaluateChoice(moment,"missing",fast).ok,false);
});
test("keeper remains AI-driven and offers meaningful save positioning decisions",()=>{
 const moment=makeDecisions(()=>.1,"GK")[0];
 assert.equal(moment.kind,"save");
 assert.ok(getDecisionOptions(moment).length>=6);
 const success=evaluateChoice(moment,"g-line",{defending:82},()=>0);
 const conceded=evaluateChoice(moment,"g-line",{defending:82},()=>.99);
 assert.equal(success.saved,true);
 assert.equal(conceded.conceded,true);
});
