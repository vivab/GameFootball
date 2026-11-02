import {FIELD,advanceBall,normalizeDirection,shootBall} from "./highlights.js";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function move(p,x,y,dt,speed){
 const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
 if(d>.1){const step=Math.min(d,dt*speed);p.x+=step*dx/d;p.y+=step*dy/d}
 p.x=clamp(p.x,FIELD.left+12,FIELD.right-12);
 p.y=clamp(p.y,FIELD.top+10,FIELD.bottom-10);
}
export function arrangeDecision(m){
 const scenario=m.currentMoment,position=m.home[m.controlIdx];
 const keeper=scenario.kind==="save",isWide=scenario.kind==="corner";
 const startX=keeper?FIELD.left+24:scenario.kind==="penalty"?805:scenario.kind==="duel"?795:
  scenario.kind==="freekick"?755:scenario.kind==="three"?745:scenario.kind==="two"?730:isWide?810:690;
 const startY=keeper?295:isWide?105:295+(m.highlightIndex%2===0?34:-34);
 // Reposition everyone into a believable attack; no manual player control.
 position.x=startX;position.y=startY;
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  for(let i=0;i<list.length;i++){
   if(team===0&&i===m.controlIdx)continue;
   const p=list[i];
   if(i===0){
    p.x=team===0?FIELD.left+22:FIELD.right-23;p.y=295;
   }else if(team===0){
    p.x=clamp(startX-115+(i%5)*34,FIELD.left+35,FIELD.right-85);
    p.y=clamp(startY+(i%6-3)*43,FIELD.top+32,FIELD.bottom-32);
   }else{
    p.x=clamp(startX+38+(i%4)*25,FIELD.left+100,FIELD.right-51);
    p.y=clamp(startY+(i%5-2)*42,FIELD.top+45,FIELD.bottom-45);
   }
  }
 }
 if(keeper){
  m.away[9].x=FIELD.left+210;m.away[9].y=295;m.owner={team:1,idx:9};
 }else m.owner={team:0,idx:m.controlIdx};
 const p=(m.owner.team===0?m.home:m.away)[m.owner.idx];
 m.ball={x:p.x+(m.owner.team===0?12:-12),y:p.y,vx:0,vy:0,inNet:null};
 m.aiTimer=1.2;m.netHold=0;
}
export function tickSpectator(m,dt){
 const messages=[],seconds=clamp(dt,0,.09);
 m.elapsed=Math.min(5400,m.elapsed+seconds*70);
 m.aiTimer=(m.aiTimer??0)-seconds;
 if(m.netHold>0){
  advanceBall(m.ball,seconds);m.netHold-=seconds;
  if(m.netHold<=0){
   m.ball={x:500,y:295,vx:0,vy:0,inNet:null};
   m.owner={team:m.lastScoredTeam===0?1:0,idx:9};
   m.aiTimer=.5;
  }
 }
 const owner=m.owner;
 if(!owner&&!m.netHold){
  const goal=advanceBall(m.ball,seconds);
  if(goal){
   const team=goal==="right"?0:1;
   m.score[team]++;m.lastScoredTeam=team;m.netHold=1.2;
   messages.push((team===0?"Твоя команда":"Соперник")+" забивает! Мяч в сетке.");
  }else if(Math.hypot(m.ball.vx,m.ball.vy)<70){
   const candidates=[...m.home.map((p,i)=>({team:0,idx:i,p})),...m.away.map((p,i)=>({team:1,idx:i,p}))];
   candidates.sort((a,b)=>Math.hypot(a.p.x-m.ball.x,a.p.y-m.ball.y)-Math.hypot(b.p.x-m.ball.x,b.p.y-m.ball.y));
   const c=candidates[0];if(c&&Math.hypot(c.p.x-m.ball.x,c.p.y-m.ball.y)<34)m.owner={team:c.team,idx:c.idx};
  }
 }
 for(const [team,list] of [[0,m.home],[1,m.away]]){
  list.forEach((p,i)=>{
   if(i===0){move(p,team===0?FIELD.left+23:FIELD.right-23,295+(m.ball.y-295)*.1,seconds,105);return}
   const own=Boolean(m.owner&&m.owner.team===team&&m.owner.idx===i);
   if(own){
    const dir=team===0?1:-1;
    move(p,p.x+dir*100*seconds,p.y+Math.sin(m.elapsed/140+i)*6,seconds,135);
   }else{
    const drift=m.owner?.team===team?45:-35;
    const tx=clamp(p.homeX+drift+Math.sin(m.elapsed/130+i*3)*24,FIELD.left+35,FIELD.right-35);
    const ty=clamp(p.homeY+(m.ball.y-295)*.18,FIELD.top+22,FIELD.bottom-22);
    move(p,tx,ty,seconds,80);
   }
  });
 }
 if(m.owner){
  const p=(m.owner.team===0?m.home:m.away)[m.owner.idx];
  m.ball.x=p.x+(m.owner.team===0?13:-13);m.ball.y=p.y;
  m.ball.vx=0;m.ball.vy=0;
  if(m.aiTimer<=0){
   const team=m.owner.team,goalX=team===0?FIELD.right:FIELD.left;
   const inAttack=team===0?p.x>770:p.x<230;
   if(inAttack&&Math.random()<.46){
    const aim=normalizeDirection({x:goalX-p.x,y:(295+(Math.random()-.5)*110)-p.y});
    shootBall(m.ball,p,aim,430);
    m.owner=null;m.aiTimer=.7;
    messages.push("Удар по воротам от "+(team===0?"твоей команды.":"соперника."));
   }else{
    const list=team===0?m.home:m.away;
    const idx=1+Math.floor(Math.random()*10);
    m.owner={team,idx:idx===m.owner.idx?((idx%10)+1):idx};
    if(Math.random()<.10)m.owner.team=1-team;
    m.aiTimer=.5+Math.random()*1.1;
   }
  }
 }
 return messages;
}
function aimForChoice(option,success,keeper,p){
 const post=option.target||"center";
 const leftSide=post.includes("left")||post==="near";
 const high=post.includes("top"),low=post.includes("low");
 const y=success?(post==="center"?295:leftSide?high?FIELD.goalTop+14:FIELD.goalTop+29:
  high?FIELD.goalBottom-14:FIELD.goalBottom-29):(p.y>295?FIELD.goalBottom+85:FIELD.goalTop-85);
 const goalX=keeper?FIELD.left:FIELD.right;
 return normalizeDirection({x:goalX-p.x,y:y-p.y});
}
export function beginResolution(m,outcome){
 const keeper=outcome.option.action==="save";
 m.highlightState="resolve";m.paused=false;
 m.resolution={outcome,keeper,elapsed:0,kicked:false,goal:false,displayed:false};
 const p=keeper?m.away[9]:m.home[m.controlIdx];
 m.owner={team:keeper?1:0,idx:keeper?9:m.controlIdx};
 m.ball.x=p.x+(keeper?-12:12);m.ball.y=p.y;m.ball.vx=0;m.ball.vy=0;
}
export function tickResolution(m,dt){
 const r=m.resolution,seconds=clamp(dt,0,.09);if(!r)return {done:true,scored:false};
 r.elapsed+=seconds;
 const attacker=r.keeper?m.away[9]:m.home[m.controlIdx];
 if(!r.kicked){
  move(attacker,attacker.x+(r.keeper?-28:28)*seconds,attacker.y,seconds,76);
  m.ball.x=attacker.x+(r.keeper?-12:12);m.ball.y=attacker.y;
  if(r.elapsed>=.75){
   r.kicked=true;m.owner=null;
   const intendedGoal=r.keeper?r.outcome.conceded:r.outcome.success;
   const direction=aimForChoice(r.outcome.option,intendedGoal,r.keeper,attacker);
   shootBall(m.ball,attacker,direction,510);
  }
 }
 if(r.kicked){
  const goal=advanceBall(m.ball,seconds);
  if(goal&&!r.goal){
   r.goal=true;const team=goal==="right"?0:1;
   m.score[team]++;
   if(team===0){
    if(r.outcome.assisted)m.individual.assists++;
    else m.individual.goals++;
   }
  }
 }
 const done=r.elapsed>=3.35||r.kicked&&Math.hypot(m.ball.vx,m.ball.vy)<5&&r.elapsed>1.5;
 return {done,scored:r.goal};
}
