// Match highlights, goal geometry and ball physics for the standalone career mode.
// Coordinate system: 1000 × 590, our team attacks from left to right.
export const FIELD={left:55,right:945,top:29,bottom:561,goalTop:247,goalBottom:343,netDepth:40,radius:6};
export const MOMENT_TYPES=[
 {kind:"counter",title:"Быстрая контратака",hint:"Впереди свободное пространство. Используй рывок и удар.",duration:17},
 {kind:"through",title:"Выход на ударную позицию",hint:"Откройся под передачу и заверши атаку.",duration:18},
 {kind:"wing",title:"Атака с фланга",hint:"Сместись ближе к воротам или отдай пас партнёру.",duration:18},
 {kind:"pressure",title:"Давление у штрафной",hint:"Перехвати инициативу и попытайся забить.",duration:16},
 {kind:"late",title:"Решающий эпизод",hint:"Время ограничено. Каждый выбор может изменить счёт.",duration:17}
];
export function createMoments(random=Math.random){
 const anchors=[9,22,36,54,72];
 return anchors.map((base,i)=>({
  minute:base+Math.floor(random()*7),
  ...MOMENT_TYPES[(i+Math.floor(random()*MOMENT_TYPES.length))%MOMENT_TYPES.length]
 }));
}
export function normalizeDirection(input,last={x:1,y:0}){
 const x=Number(input?.x)||0,y=Number(input?.y)||0,len=Math.hypot(x,y);
 if(len<.15){
  const lx=Number(last?.x)||1,ly=Number(last?.y)||0,l=Math.hypot(lx,ly);
  return {x:lx/l,y:ly/l};
 }
 return {x:x/len,y:y/len};
}
export function shootBall(ball,from,direction,power=360){
 const dir=normalizeDirection(direction);
 ball.x=from.x+dir.x*15;
 ball.y=from.y+dir.y*15;
 ball.vx=dir.x*power;
 ball.vy=dir.y*power;
 ball.inNet=null;
 return ball;
}
// A goal occurs only when the moving ball crosses the actual line inside the posts.
// Once inside the net, it remains physically inside until play restarts.
export function advanceBall(ball,dt){
 if(!Number.isFinite(dt)||dt<=0)return null;
 const {left,right,top,bottom,goalTop,goalBottom,netDepth,radius}=FIELD;
 let goal=null;
 const steps=Math.max(1,Math.ceil(dt/.012));
 for(let i=0;i<steps;i++){
  const h=dt/steps,prevX=ball.x;
  ball.x+=ball.vx*h;ball.y+=ball.vy*h;
  if(ball.inNet){
   const side=ball.inNet;
   if(side==="right"){
    if(ball.x>right+netDepth-radius){ball.x=right+netDepth-radius;ball.vx=-Math.abs(ball.vx)*.22}
    if(ball.x<right+radius){ball.x=right+radius;ball.vx=Math.abs(ball.vx)*.22}
   }else{
    if(ball.x<left-netDepth+radius){ball.x=left-netDepth+radius;ball.vx=Math.abs(ball.vx)*.22}
    if(ball.x>left-radius){ball.x=left-radius;ball.vx=-Math.abs(ball.vx)*.22}
   }
   if(ball.y<goalTop+radius){ball.y=goalTop+radius;ball.vy=Math.abs(ball.vy)*.2}
   if(ball.y>goalBottom-radius){ball.y=goalBottom-radius;ball.vy=-Math.abs(ball.vy)*.2}
  }else{
   const withinMouth=ball.y>goalTop+radius&&ball.y<goalBottom-radius;
   if(prevX<=right&&ball.x>=right&&ball.vx>0&&withinMouth){
    ball.inNet="right";goal="right";ball.x=Math.max(right+radius,ball.x);
   }else if(prevX>=left&&ball.x<=left&&ball.vx<0&&withinMouth){
    ball.inNet="left";goal="left";ball.x=Math.min(left-radius,ball.x);
   }else if(ball.x>right){
    ball.x=right-radius;ball.vx=-Math.abs(ball.vx)*.27;
   }else if(ball.x<left){
    ball.x=left+radius;ball.vx=Math.abs(ball.vx)*.27;
   }
   if(ball.y<top+radius){ball.y=top+radius;ball.vy=Math.abs(ball.vy)*.36}
   if(ball.y>bottom-radius){ball.y=bottom-radius;ball.vy=-Math.abs(ball.vy)*.36}
  }
  const drag=Math.exp(-(ball.inNet?3.9:.55)*h);
  ball.vx*=drag;ball.vy*=drag;
  if(Math.hypot(ball.vx,ball.vy)<.4){ball.vx=0;ball.vy=0}
 }
 return goal;
}
export function simulateMoment(profile,moment,random=Math.random){
 const stats=profile?.skills||{shooting:63,passing:63};
 const attack=(moment.kind==="wing"?.04:moment.kind==="late"?-.025:0);
 const goalOdds=Math.max(.07,Math.min(.62,.23+(stats.shooting-60)*.004+attack));
 const goal=random()<goalOdds;
 const assist=!goal&&random()<Math.max(.05,Math.min(.48,.12+(stats.passing-60)*.003));
 return {goal,assist,shots:1,passes:assist?2:1};
}
export function randomGapScore(random=Math.random){
 return {home:random()<.12?1:0,away:random()<.16?1:0};
}
