import test from "node:test";
import assert from "node:assert/strict";
import {
 FIELD,createMoments,normalizeDirection,shootBall,advanceBall,
 simulateMoment,randomGapScore
} from "../manager/highlights.js";

function moveUntilGoal(ball,limit=240){
 for(let i=0;i<limit;i++){
  const result=advanceBall(ball,.016);
  if(result)return result;
 }
 return null;
}
test("five key football moments appear in different chronological windows",()=>{
 const moments=createMoments(()=>.3);
 assert.equal(moments.length,5);
 assert.ok(moments.every((m,i)=>m.duration>=15&&(!i||m.minute>moments[i-1].minute)));
 const different=createMoments(()=>.9);
 assert.notDeepEqual(moments,different);
});
test("joystick direction determines shot vector, including negative aim",()=>{
 const dir=normalizeDirection({x:.6,y:-.8});
 const ball={x:0,y:0,vx:0,vy:0};
 shootBall(ball,{x:600,y:300},dir,400);
 assert.ok(ball.vx>0);assert.ok(ball.vy<0);
 assert.ok(Math.abs(Math.hypot(ball.vx,ball.vy)-400)<.01);
 assert.deepEqual(normalizeDirection({x:0,y:0},{x:0,y:-1}),{x:0,y:-1});
});
test("right goal triggers only after ball crosses line between posts",()=>{
 const ball={x:900,y:295,vx:410,vy:0,inNet:null};
 assert.equal(moveUntilGoal(ball),"right");
 assert.ok(ball.x>FIELD.right);
 assert.equal(ball.inNet,"right");
});
test("football rolls and bounces inside the drawn net without leaving it",()=>{
 const ball={x:900,y:295,vx:410,vy:0,inNet:null};
 assert.equal(moveUntilGoal(ball),"right");
 for(let i=0;i<170;i++)assert.equal(advanceBall(ball,.016),null);
 assert.ok(ball.x>=FIELD.right&&ball.x<=FIELD.right+FIELD.netDepth);
 assert.ok(ball.y>=FIELD.goalTop&&ball.y<=FIELD.goalBottom);
 assert.ok(Math.hypot(ball.vx,ball.vy)<30);
});
test("missed shot does not become a goal after bouncing against boundary",()=>{
 const ball={x:900,y:110,vx:420,vy:0,inNet:null};
 assert.equal(moveUntilGoal(ball),null);
 assert.ok(ball.x<FIELD.right);
});
test("ball can enter the left net after a backwards kick",()=>{
 const ball={x:160,y:295,vx:-420,vy:0,inNet:null};
 assert.equal(moveUntilGoal(ball),"left");
 assert.equal(ball.inNet,"left");
});
test("AI highlight yields reasonable shot and goal result",()=>{
 const profile={skills:{shooting:95,passing:75}};
 const moment=createMoments(()=>.2)[0];
 const result=simulateMoment(profile,moment,()=>0);
 assert.equal(result.goal,true);
 assert.equal(result.shots,1);
 const miss=simulateMoment(profile,moment,()=>.99);
 assert.equal(miss.goal,false);
 const score=randomGapScore(()=>.99);
 assert.deepEqual(score,{home:0,away:0});
});
