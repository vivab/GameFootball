// GameFootball: shared deterministic-rate simulation for browser and Node.js.
// This module intentionally has no DOM, network or rendering dependencies.
const FIELD={width:1600,height:900,playerRadius:20,ballRadius:11,goalHalf:142,left:68,right:1532,top:30,bottom:870,depth:52,speed:185};
const {width:W,height:H,playerRadius:P,ballRadius:B,goalHalf:GOAL,left:L,right:R,top:T,bottom:BT,speed:SPEED}=FIELD;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function unit(x,y,fallbackX=1,fallbackY=0){const m=Math.hypot(x,y);return m>.001?{x:x/m,y:y/m}:{x:fallbackX,y:fallbackY}}
function inputVector(p){const q=p.input||{};let x=Number.isFinite(q.x)?clamp(q.x,-1,1):0,y=Number.isFinite(q.y)?clamp(q.y,-1,1):0;const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return{x,y}}
function resetMatch(game,resetScore=false){
 if(resetScore)game.score=[0,0];
 game.ball={x:W/2,y:H/2,vx:0,vy:0,controlId:null,controlLock:.8,hitLock:0,lastTouch:null};
 game.chasers={0:null,1:null};game.aiClock=0;game.tactic=game.tactic||0;game.goalNumber=game.goalNumber||0;
 for(const p of game.players){
  const slot=Number.isInteger(p.slot)?p.slot:2,dir=p.team===0?1:-1;
  p.x=p.team===0?L+110+slot*93:R-110-slot*93;
  p.y=clamp(H/2+(slot-2)*145,T+P+20,BT-P-20);
  p.vx=0;p.vy=0;p.faceX=dir;p.faceY=0;p.cd=0;p.noControl=.25;p.retouch=0;
  p.input={x:0,y:0,control:false};p.pendingShot=null;p.pendingPass=null;p.intentKick=null;
  p.aiDecision=.6+slot*.1;p.possessionAge=0;p.recentKick=0;
 }
}
function kickBall(game,p,kind,charge=0,direction=null){
 const b=game.ball;
 const d=distance(p,b);
 if(p.cd>0||p.retouch>0||b.controlLock>0||d>P+B+24)return false;
 let aim=direction?unit(direction.x,direction.y,p.faceX||1,p.faceY||0):unit(p.faceX||1,p.faceY||0);
 const isPass=kind==="pass",q=clamp(Number(charge)||0,0,1);
 const spread=isPass?.012+.015*q:.018+.085*q;
 const angle=(Math.random()*2-1)*spread,cs=Math.cos(angle),sn=Math.sin(angle);
 const vx=aim.x*cs-aim.y*sn,vy=aim.x*sn+aim.y*cs;
 const power=isPass?480+160*q:990+570*q;
 // Apply an impulse to velocity. Never teleport the ball to the kicker's foot.
 b.vx=vx*power;b.vy=vy*power;
 b.controlId=null;b.controlLock=isPass?.27:.36;b.lastTouch=p.id;b.hitLock=.16;
 p.cd=isPass?.36:.5;p.retouch=isPass?.4:.52;p.noControl=.3;p.recentKick=.7;
 p.possessionAge=0;
 if(!game.teamKickCooldown)game.teamKickCooldown=[0,0];
 if(p.bot)game.teamKickCooldown[p.team]=isPass?.7:.9;
 return true;
}
function chooseChasers(game){
 if(!game.chasers)game.chasers={0:null,1:null};
 const ball=game.ball;
 for(let team=0;team<=1;team++){
  const mates=game.players.filter(p=>p.team===team&&p.slot!==0);
  if(!mates.length)continue;
  const candidates=mates.filter(p=>p.bot||distance(p,ball)<110);
  if(!candidates.length)continue;
  const best=candidates.reduce((a,p)=>distance(p,ball)<distance(a,ball)?p:a,candidates[0]);
  const old=mates.find(p=>p.id===game.chasers[team]);
  // Keep the current pursuer until a teammate is meaningfully better.
  const selected=old&&distance(old,ball)<distance(best,ball)+95?old:best;
  game.chasers[team]=selected.id;
 }
}
function botBrain(game,dt){
 game.aiClock=(game.aiClock||0)+dt;
 if(game.aiClock>15){game.aiClock=0;game.tactic=((game.tactic||0)+1)%4}
 chooseChasers(game);
 const b=game.ball,pressureScale=[1,1.1,.9,1.2][game.tactic||0];
 for(const p of game.players){
  if(!p.bot)continue;
  const dir=p.team===0?1:-1,slot=p.slot||0;
  const mates=game.players.filter(q=>q.team===p.team),opponents=game.players.filter(q=>q.team!==p.team);
  const chase=game.chasers[p.team]===p.id,near=distance(p,b)<P+B+34;
  const keeper=slot===0,ownThird=dir===1?b.x<L+400:b.x>R-400;
  let tx,ty;
  if(keeper){
   tx=dir===1?L+78:R-78;
   ty=clamp(H/2+(b.y-H/2)*.52,H/2-GOAL+32,H/2+GOAL-32);
   if(ownThird&&distance(p,b)<155){tx=clamp(b.x,L+P+35,R-P-35);ty=clamp(b.y,T+P+35,BT-P-35)}
  }else if(chase){
   // Lead the rolling ball slightly, but stay out of walls and corners.
   tx=clamp(b.x+b.vx*.09,L+P+48,R-P-48);
   ty=clamp(b.y+b.vy*.09,T+P+48,BT-P-48);
  }else{
   const progress=(b.x-W/2)*.16;
   const base=dir===1?L+220+slot*125:R-220-slot*125;
   tx=base+progress*pressureScale;
   const lanes=[0,-235,190,-90,260];
   ty=H/2+lanes[slot]*pressureScale+(b.y-H/2)*.14;
   // Pull supporting players wider instead of joining a crowd at the ball.
   if(distance(p,b)<105){ty+=p.y<H/2?-75:75}
  }
  tx=clamp(tx,L+P+38,R-P-38);
  ty=clamp(ty,T+P+38,BT-P-38);
  const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
  let desired=d>18?unit(dx,dy):{x:0,y:0};
  if(chase&&near&&b.controlId===p.id){
   const targetX=clamp(p.x+dir*90,L+P+35,R-P-35);
   const targetY=clamp(H/2+(p.y-H/2)*.72,T+P+35,BT-P-35);
   desired=unit(targetX-p.x,targetY-p.y,dir,0);
  }
  p.input={x:desired.x*(keeper?.78:.86),y:desired.y*(keeper?.78:.86),
    control:(chase||keeper&&ownThird)&&near};
  p.aiDecision=Math.max(0,(p.aiDecision||0)-dt);
  if(b.controlId===p.id&&near)p.possessionAge=(p.possessionAge||0)+dt;
  else p.possessionAge=0;
  if(!near||p.cd>0||p.aiDecision>0||b.controlLock>0||(game.teamKickCooldown?.[p.team]||0)>0)continue;
  if(!(b.controlId===p.id||distance(p,b)<P+B+11&&Math.hypot(b.vx,b.vy)<300))continue;
  const goalX=dir===1?R:L,goalDistance=Math.abs(goalX-p.x);
  const keeperClearance=keeper&&ownThird;
  const marked=opponents.some(q=>distance(p,q)<105);
  const receiver=mates.filter(q=>q!==p&&q.slot!==0&&distance(p,q)>115&&distance(p,q)<600)
    .sort((a,c)=>dir*(c.x-a.x))[0];
  let intent=null;
  if(keeperClearance||goalDistance<385&&Math.abs(p.y-H/2)<GOAL+160){
   intent={kind:"shot",charge:keeperClearance?.12:.26,aim:{x:goalX-p.x,y:H/2-p.y}};
  }else if(receiver&&(marked||p.possessionAge>1.7)){
   intent={kind:"pass",charge:clamp(distance(p,receiver)/600,0,.85),
     aim:{x:receiver.x-p.x,y:receiver.y-p.y}};
  }
  if(intent){
   p.intentKick=intent;
   p.aiDecision=1.1+Math.random()*.65;
  }else p.aiDecision=.3;
 }
}
function movePlayers(game,dt){
 for(const p of game.players){
  const d=inputVector(p),speed=SPEED;
  p.vx=d.x*speed;p.vy=d.y*speed;
  p.x=clamp(p.x+p.vx*dt,L+P,R-P);
  p.y=clamp(p.y+p.vy*dt,T+P,BT-P);
  if(Math.hypot(d.x,d.y)>.15){const q=unit(d.x,d.y);p.faceX=q.x;p.faceY=q.y}
  p.cd=Math.max(0,(p.cd||0)-dt);
  p.retouch=Math.max(0,(p.retouch||0)-dt);
  p.noControl=Math.max(0,(p.noControl||0)-dt);
  p.recentKick=Math.max(0,(p.recentKick||0)-dt);
 }
 // Gentle separation: never inject position corrections into ball velocity.
 const ps=game.players;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d>=P*2)continue;
  const n=d>.001?{x:dx/d,y:dy/d}:{x:i%2?1:-1,y:0},push=Math.min(4,(P*2-d)*.35);
  a.x=clamp(a.x-n.x*push,L+P,R-P);a.y=clamp(a.y-n.y*push,T+P,BT-P);
  b.x=clamp(b.x+n.x*push,L+P,R-P);b.y=clamp(b.y+n.y*push,T+P,BT-P);
 }
}
function controller(game){
 const b=game.ball;
 if(b.controlLock>0||Math.hypot(b.vx,b.vy)>355){b.controlId=null;return null}
 const current=game.players.find(p=>p.id===b.controlId);
 if(current&&current.input?.control&&current.retouch<=0&&distance(current,b)<P+B+26)return current;
 const candidates=game.players.filter(p=>p.input?.control&&p.retouch<=0&&p.noControl<=0&&distance(p,b)<P+B+18)
 .sort((a,c)=>distance(a,b)-distance(c,b));
 const chosen=candidates[0]||null;
 b.controlId=chosen?.id||null;
 return chosen;
}
function physics(game,dt,carrier){
 const b=game.ball;const steps=Math.max(1,Math.ceil(dt/(1/110))),h=dt/steps;
 for(let k=0;k<steps;k++){
  b.controlLock=Math.max(0,(b.controlLock||0)-h);
  b.hitLock=Math.max(0,(b.hitLock||0)-h);
  const oldX=b.x,oldY=b.y;
  if(carrier){
   const q=unit(carrier.faceX,carrier.faceY,carrier.team===0?1:-1,0);
   const destX=carrier.x+q.x*(P+B+7),destY=carrier.y+q.y*(P+B+7);
   // Critically damped-ish ball following: adjust VELOCITY, not position.
   b.vx+=(30*(destX-b.x)+7*(carrier.vx-b.vx))*h;
   b.vy+=(30*(destY-b.y)+7*(carrier.vy-b.vy))*h;
   const v=Math.hypot(b.vx,b.vy);
   if(v>315){b.vx*=315/v;b.vy*=315/v}
  }else{
   const drag=Math.exp(-1.15*h);b.vx*=drag;b.vy*=drag;
   if(Math.abs(b.vx)<2)b.vx=0;
   if(Math.abs(b.vy)<2)b.vy=0;
  }
  b.x+=b.vx*h;b.y+=b.vy*h;
  // Resolve at most the deepest collision per microstep. This prevents
  // several nearby bots bouncing the same ball in contradictory directions.
  let hit=null,depth=0,nx=0,ny=0;
  for(const p of game.players){
   if(b.hitLock>0&&p.id===b.lastTouch)continue;
   const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),penetration=P+B-d;
   if(penetration<=depth)continue;
   depth=penetration;hit=p;
   const n=unit(dx,dy, p.faceX||1,p.faceY||0);nx=n.x;ny=n.y;
  }
  if(hit){
   b.x+=nx*(depth+.05);b.y+=ny*(depth+.05);
   const rel=(b.vx-hit.vx)*nx+(b.vy-hit.vy)*ny;
   if(rel<0){
    const restitution=carrier&&hit===carrier?.06:.32;
    const impulse=Math.min(600,(-rel)*(1+restitution));
    b.vx+=nx*impulse;b.vy+=ny*impulse;
   }
   if(b.controlId&&hit.id!==b.controlId){b.controlId=null;carrier=null;b.controlLock=.22}
  }
  // Count crossings immediately. A goal isn't a physical back-wall collision.
  const cross=(line)=>oldX<=line&&b.x>line||oldX>=line&&b.x<line;
  if(oldX<=R&&b.x>R||oldX>=L&&b.x<L){
   const line=b.x>R?R:L,ratio=clamp((line-oldX)/(b.x-oldX||1),0,1);
   const crossY=oldY+(b.y-oldY)*ratio;
   if(Math.abs(crossY-H/2)<GOAL-B-3){
    const team=line===R?0:1;
    game.score[team]=(game.score[team]||0)+1;
    game.goalNumber=(game.goalNumber||0)+1;
    resetMatch(game,false);
    return team;
   }
  }
  const mouth=Math.abs(b.y-H/2)<GOAL-B;
  if(b.y<T+B){b.y=T+B;b.vy=Math.abs(b.vy)*.64}
  if(b.y>BT-B){b.y=BT-B;b.vy=-Math.abs(b.vy)*.64}
  if(b.x<L+B&&!mouth){b.x=L+B;b.vx=Math.abs(b.vx)*.65}
  if(b.x>R-B&&!mouth){b.x=R-B;b.vx=-Math.abs(b.vx)*.65}
  // No ball may hide behind an exterior corner or become trapped beyond the net.
  if(b.x<L-5){b.x=L+B;b.vx=Math.abs(b.vx)*.45}
  if(b.x>R+5){b.x=R-B;b.vx=-Math.abs(b.vx)*.45}
  const v=Math.hypot(b.vx,b.vy);
  if(v>1800){b.vx*=1800/v;b.vy*=1800/v}
  if(!Number.isFinite(b.x+b.y+b.vx+b.vy)){
    b.x=W/2;b.y=H/2;b.vx=0;b.vy=0;b.controlId=null;return null;
  }
 }
 return null;
}
function stepMatch(game,dt){
 if(game.status!=="playing")return{goal:null,finished:false};
 const delta=clamp(Number(dt)||0,0,.06);
 game.time=Math.max(0,(game.time||0)-delta);
 if(game.time===0){game.status="finished";return{goal:null,finished:true}}
 if(!game.teamKickCooldown)game.teamKickCooldown=[0,0];
 game.teamKickCooldown[0]=Math.max(0,game.teamKickCooldown[0]-delta);
 game.teamKickCooldown[1]=Math.max(0,game.teamKickCooldown[1]-delta);
 botBrain(game,delta);
 movePlayers(game,delta);
 for(const p of game.players){
  const cmd=p.intentKick;
  if(cmd){kickBall(game,p,cmd.kind,cmd.charge,cmd.aim);p.intentKick=null}
  if(p.pendingShot!==null&&p.pendingShot!==undefined){
   const cmd=typeof p.pendingShot==="object"?p.pendingShot:{charge:p.pendingShot};
   kickBall(game,p,"shot",cmd.charge,cmd.dir);p.pendingShot=null;
  }
  if(p.pendingPass!==null&&p.pendingPass!==undefined){
   const cmd=typeof p.pendingPass==="object"?p.pendingPass:{charge:p.pendingPass};
   kickBall(game,p,"pass",cmd.charge,cmd.dir);p.pendingPass=null;
  }
 }
 const carrier=controller(game);
 const goal=physics(game,delta,carrier);
 return{goal,finished:false};
}
export {FIELD,stepMatch,resetMatch,kickBall,botBrain,physics};
