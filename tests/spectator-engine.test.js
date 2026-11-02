import test from "node:test";
import assert from "node:assert/strict";
import {arrangeDecision,tickSpectator,beginResolution,tickResolution} from "../manager/spectator-engine.js";
import {makeDecisions,evaluateChoice} from "../manager/decision-engine.js";

function makeMatch(kind="duel"){
 const home=Array.from({length:11},(_,i)=>({number:i+1,team:0,x:95+i*56,y:60+i*37,homeX:95+i*56,homeY:60+i*37}));
 const away=Array.from({length:11},(_,i)=>({number:i+1,team:1,x:905-i*54,y:62+i*37,homeX:905-i*54,homeY:62+i*37}));
 return {home,away,controlIdx:9,currentMoment:{kind},highlightIndex:0,
  owner:{team:0,idx:9},ball:{x:595,y:295,vx:0,vy:0,inNet:null},
  elapsed:0,score:[0,0],aiTimer:10,highlightState:"watch",individual:{goals:0,assists:0,saves:0}};
}
test("footballer moves under AI control during observed match",()=>{
 const m=makeMatch(),from=m.home[m.controlIdx].x;
 tickSpectator(m,.05);
 assert.ok(m.home[m.controlIdx].x>from,"AI must move the marked footballer");
 assert.ok(m.elapsed>0);
 assert.equal(m.owner.team,0);
});
test("scenario places marked player near goal and marks him as ball carrier",()=>{
 const m=makeMatch("duel");
 arrangeDecision(m);
 assert.ok(m.home[m.controlIdx].x>700);
 assert.equal(m.owner.team,0);
 assert.equal(m.owner.idx,m.controlIdx);
});
test("AI action results in a visible ball crossing line before adding a goal",()=>{
 const m=makeMatch("penalty");
 arrangeDecision(m);
 const moment={kind:"penalty"};
 const result=evaluateChoice(moment,"p-left-low",{shooting:99},()=>0);
 assert.ok(result.success);
 beginResolution(m,result);
 assert.equal(m.score[0],0);
 for(let i=0;i<140&&m.highlightState==="resolve";i++){
  const step=tickResolution(m,.05);
  if(step.done)break;
 }
 assert.equal(m.score[0],1);
 assert.equal(m.individual.goals,1);
 assert.equal(m.ball.inNet,"right");
});
test("missed decision is never counted as a guaranteed goal",()=>{
 const m=makeMatch("duel");
 arrangeDecision(m);
 const outcome=evaluateChoice({kind:"duel"},"near-power",{shooting:30},()=>.99);
 assert.equal(outcome.success,false);
 beginResolution(m,outcome);
 for(let i=0;i<140;i++){
  if(tickResolution(m,.05).done)break;
 }
 assert.equal(m.score[0],0);
});
test("goalkeeper selection is simulated by AI without direct controls",()=>{
 const m=makeMatch("save");m.controlIdx=0;
 arrangeDecision(m);
 assert.equal(m.owner.team,1);
 const saved=evaluateChoice({kind:"save"},"g-line",{defending:90},()=>0);
 beginResolution(m,saved);
 for(let i=0;i<140;i++)if(tickResolution(m,.05).done)break;
 assert.equal(m.score[1],0);
});
