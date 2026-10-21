import test from "node:test";
import assert from "node:assert/strict";
import {FIELD,stepMatch,resetMatch,kickBall} from "../shared/football-core.js";

function gameWithTeams(){
 const players=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<5;slot++)
  players.push({id:team+"-"+slot,team,slot,bot:!(team===0&&slot===2)});
 const game={players,ball:{},score:[0,0],time:180,status:"playing"};
 resetMatch(game);
 return game;
}
function singleBall(x,y,vx,vy){
 const game=gameWithTeams();
 game.players=[];
 game.ball={x,y,vx,vy,controlLock:0};
 return game;
}

test("two balanced 5-player squads",()=>{
 const g=gameWithTeams();
 assert.equal(g.players.filter(p=>p.team===0).length,5);
 assert.equal(g.players.filter(p=>p.team===1).length,5);
});

test("ball dribbling follows without teleporting",()=>{
 const g=gameWithTeams(),p=g.players[2];
 g.players=[p];p.x=650;p.y=450;p.faceX=1;p.faceY=0;p.bot=false;
 g.ball={x:p.x+37,y:p.y,vx:0,vy:0,controlLock:0};
 let lastX=g.ball.x,lastY=g.ball.y,maxJump=0;
 for(let i=0;i<180;i++){
  p.input={x:0,y:0,control:true};
  stepMatch(g,1/60);
  maxJump=Math.max(maxJump,Math.hypot(g.ball.x-lastX,g.ball.y-lastY));
  lastX=g.ball.x;lastY=g.ball.y;
 }
 assert.ok(maxJump<6,"sudden dribble jump: "+maxJump);
 assert.ok(Math.abs(g.ball.x-(p.x+FIELD.playerRadius+FIELD.ballRadius+7))<4);
});

test("kick never teleports ball; shot stronger than pass",()=>{
 const g=singleBall(430,450,0,0);
 const p={id:"striker",team:0,slot:2,x:395,y:450,faceX:1,faceY:0,
  cd:0,retouch:0,noControl:0,input:{x:1,y:0}};
 g.players=[p];g.ball.controlLock=0;
 assert.ok(kickBall(g,p,"pass",0,{x:1,y:0}));
 assert.equal(g.ball.x,430);
 const passSpeed=Math.hypot(g.ball.vx,g.ball.vy);
 p.cd=0;p.retouch=0;g.ball.controlLock=0;
 assert.ok(kickBall(g,p,"shot",1,{x:1,y:0}));
 const shotSpeed=Math.hypot(g.ball.vx,g.ball.vy);
 assert.ok(shotSpeed>passSpeed*2.5);
 assert.equal(g.ball.x,430);
});

test("both goal lines count immediately, shots outside are blocked",()=>{
 let g=singleBall(FIELD.right-2,FIELD.height/2,1200,0);
 assert.equal(stepMatch(g,1/30).goal,0);
 assert.deepEqual(g.score,[1,0]);
 g=singleBall(FIELD.left+2,FIELD.height/2,-1200,0);
 assert.equal(stepMatch(g,1/30).goal,1);
 assert.deepEqual(g.score,[0,1]);
 g=singleBall(FIELD.right-2,FIELD.height/2+FIELD.goalHalf+35,1200,0);
 assert.equal(stepMatch(g,1/30).goal,null);
 assert.ok(g.ball.x<FIELD.right,"ball escaped outside mouth");
});

test("the AI does not pile every player onto the ball",()=>{
 const g=gameWithTeams();
 g.ball={x:FIELD.width/2,y:FIELD.height/2,vx:0,vy:0,controlLock:0};
 for(let i=0;i<30;i++)stepMatch(g,1/60);
 const byTeam=[0,1].map(team=>g.players.filter(p=>p.team===team&&p.bot&&p.input?.control).length);
 assert.ok(byTeam[0]<=1&&byTeam[1]<=1,"too many ball controllers: "+byTeam);
});

test("corner collisions stay finite and don't catapult the ball",()=>{
 const g=gameWithTeams();
 g.ball={x:125,y:100,vx:0,vy:0,controlLock:0};
 g.players.forEach(p=>{p.x=125;p.y=95;p.bot=false;p.input={x:0,y:0,control:false}});
 let last={...g.ball},maxJump=0;
 for(let i=0;i<120;i++){
  stepMatch(g,1/60);
  const b=g.ball;maxJump=Math.max(maxJump,Math.hypot(b.x-last.x,b.y-last.y));
  assert.ok(Number.isFinite(b.x+b.y+b.vx+b.vy));
  assert.ok(Math.hypot(b.vx,b.vy)<=1800.01);
  last={...b};
 }
 assert.ok(maxJump<120,"corner launched the ball: "+maxJump);
});

test("five-a-side tactics remain stable in a long simulation",()=>{
 const g=gameWithTeams();let maxMove=0,goals=0,last={...g.ball};
 for(let i=0;i<60*180;i++){
  const human=g.players.find(p=>p.id==="0-2");
  human.input={x:Math.sin(i/78)*.4,y:Math.cos(i/125)*.3,control:i%240<45};
  const result=stepMatch(g,1/60);
  if(result.goal!==null){goals++;last={...g.ball}}
  else{
   maxMove=Math.max(maxMove,Math.hypot(g.ball.x-last.x,g.ball.y-last.y));
   last={...g.ball};
  }
  const b=g.ball;assert.ok(Number.isFinite(b.x+b.y+b.vx+b.vy));
  if(result.finished)break;
 }
 assert.ok(maxMove<125,"a single frame moved the ball "+maxMove);
 assert.ok(goals>=0);
});
