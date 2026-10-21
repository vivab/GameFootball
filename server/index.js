import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {WebSocket,WebSocketServer} from "ws";

const PORT=Number(process.env.PORT)||3000;
const W=1600,H=900,PR=20,BR=11,GOAL=115,TIME=180,L=68,R=1532,T=30,BOTTOM=870,DEPTH=52,SPEED=185;
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const rooms=new Map();
const server=http.createServer(async(req,res)=>{
 if(req.url==="/health"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return}
 if(req.url!=="/"&&req.url!=="/index.html"){res.writeHead(404);res.end("Not found");return}
 try{const html=await readFile(resolve(root,"index.html"));res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-cache"});res.end(html)}
 catch{res.writeHead(500);res.end("Frontend not found")}
});
const wss=new WebSocketServer({server,maxPayload:1024});
const safeSend=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))};
function player(id,team){return{id,team,x:team===0?205:W-205,y:H/2,vx:0,vy:0,faceX:team===0?1:-1,faceY:0,cd:0,noControl:0,lastShotSeq:0,lastPassSeq:0,pendingShot:null,pendingPass:false,input:{x:0,y:0,control:false}}}
function resetPositions(room){room.ball={x:W/2,y:H/2,vx:0,vy:0};for(const p of room.players){p.x=p.team===0?L+310:R-310;p.y=H/2;p.vx=0;p.vy=0;p.faceX=p.team===0?1:-1;p.faceY=0;p.cd=0;p.noControl=.5;p.pendingShot=null;p.pendingPass=false;p.input={x:0,y:0,control:false}}}
function newRoom(code){return{code,players:[],ball:{x:W/2,y:H/2,vx:0,vy:0},score:[0,0],time:TIME,status:"waiting",restart:false}}
function code(){let s;do{s=randomBytes(5).toString("hex").slice(0,6).toUpperCase()}while(rooms.has(s));return s}
function joinRoom(ws,room){
 if(ws.room){safeSend(ws,{type:"error",message:"Ты уже в комнате"});return}
 if(room.players.filter(p=>!p.bot).length>=2){safeSend(ws,{type:"error",message:"Комната заполнена"});return}
 const p=player(randomBytes(7).toString("hex"),room.players.filter(p=>!p.bot).length);p.slot=2;
 p.ws=ws;ws.room=room;ws.player=p;room.players.push(p);
 safeSend(ws,{type:"welcome",id:p.id,team:p.team,code:room.code});
 if(room.players.filter(p=>!p.bot).length===2){fillBots(room);room.score=[0,0];room.time=TIME;room.status="playing";room.restart=false;resetPositions(room)}
}
wss.on("connection",ws=>{
 ws.on("message",raw=>{
  let data;try{data=JSON.parse(raw.toString())}catch{return}
  if(!data||typeof data!=="object")return;
  if(data.type==="create"){const id=code(),room=newRoom(id);rooms.set(id,room);joinRoom(ws,room)}
  else if(data.type==="join"){const id=String(data.code||"").toUpperCase(),room=rooms.get(id);if(!room){safeSend(ws,{type:"error",message:"Комната не найдена"});return}joinRoom(ws,room)}
  else if(data.type==="input"&&ws.player){
   const p=ws.player,clamp=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;
   p.input={x:clamp(data.x),y:clamp(data.y),control:data.control===true};
   if(Number.isSafeInteger(data.shotSeq)&&data.shotSeq>p.lastShotSeq){p.lastShotSeq=data.shotSeq;p.pendingShot=Math.max(0,Math.min(1,Number(data.shotCharge)||0))}
   if(Number.isSafeInteger(data.passSeq)&&data.passSeq>p.lastPassSeq){p.lastPassSeq=data.passSeq;p.pendingPass=true}
  }
 });
 ws.on("close",()=>{
  const room=ws.room;if(!room)return;
  room.players=room.players.filter(p=>p.ws!==ws&&!p.bot);
  room.status="waiting";room.restart=false;
  if(!room.players.length)rooms.delete(room.code);
  else{room.score=[0,0];room.time=TIME;room.players[0].team=0;resetPositions(room)}
 });
 ws.on("error",()=>{});
});
function norm(x,y){const d=Math.hypot(x,y);return d>1?{x:x/d,y:y/d}:{x,y}}
function move(p,dt){
 const d=norm(p.input.x,p.input.y);
 p.x=Math.max(L+PR,Math.min(R-PR,p.x+d.x*SPEED*dt));
 p.y=Math.max(T+PR,Math.min(BOTTOM-PR,p.y+d.y*SPEED*dt));
 p.vx=d.x;p.vy=d.y;
 if(Math.hypot(d.x,d.y)>.15){const l=Math.hypot(d.x,d.y);p.faceX=d.x/l;p.faceY=d.y/l}
 p.cd=Math.max(0,p.cd-dt);p.noControl=Math.max(0,p.noControl-dt);
}
function inRange(p,b){return Math.hypot(b.x-p.x,b.y-p.y)<=PR+BR+23}
function shoot(room,p,kind,charge=0){
 const b=room.ball;if(p.cd>0||!inRange(p,b))return false;
 let aim=norm(p.input.x,p.input.y);if(Math.hypot(aim.x,aim.y)<.15)aim={x:p.faceX,y:p.faceY};const unit=Math.hypot(aim.x,aim.y)||1;aim={x:aim.x/unit,y:aim.y/unit};
 const spread=kind==="pass"?.01:.025+.23*charge,angle=(Math.random()*2-1)*spread,c=Math.cos(angle),s=Math.sin(angle),speed=kind==="pass"?395:540+510*charge;
 b.vx=(aim.x*c-aim.y*s)*speed;b.vy=(aim.x*s+aim.y*c)*speed;
 b.x=p.x+aim.x*(PR+BR+3);b.y=p.y+aim.y*(PR+BR+3);
 p.cd=kind==="pass"?.19:.34;p.noControl=.35;return true;
}
function controlBall(room,p){
 if(p.noControl>0||!inRange(p,room.ball))return false;
 const b=room.ball,fx=p.faceX,fy=p.faceY;
 b.x+=(p.x+fx*(PR+BR+5)-b.x)*.65;b.y+=(p.y+fy*(PR+BR+5)-b.y)*.65;
 b.vx=p.vx*SPEED*.75;b.vy=p.vy*SPEED*.75;return true;
}
function physics(room,dt,heldBy){
 const b=room.ball;
 if(!heldBy){
  for(const p of room.players){const dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy)||.001,lim=PR+BR;
   if(dist<lim){const nx=dx/dist,ny=dy/dist;b.x=p.x+nx*lim;b.y=p.y+ny*lim;b.vx+=nx*130;b.vy+=ny*130}
  }
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  const drag=Math.exp(-1.35*dt);b.vx*=drag;b.vy*=drag;
 }
 const mouth=b.y>H/2-GOAL+BR&&b.y<H/2+GOAL-BR;
 if((b.x<L||b.x>R)&&mouth)b.y=Math.max(H/2-GOAL+BR,Math.min(H/2+GOAL-BR,b.y));
 else{
  if(b.y<T+BR){b.y=T+BR;b.vy=Math.abs(b.vy)*.65}
  if(b.y>BOTTOM-BR){b.y=BOTTOM-BR;b.vy=-Math.abs(b.vy)*.65}
  if(b.x<L+BR){b.x=L+BR;b.vx=Math.abs(b.vx)*.65}
  if(b.x>R-BR){b.x=R-BR;b.vx=-Math.abs(b.vx)*.65}
 }
}
function scored(room){
 const b=room.ball;
 if(b.y>H/2-GOAL+BR&&b.y<H/2+GOAL-BR){
  if(b.x<=L-DEPTH+BR){room.score[1]++;resetPositions(room);return}
  if(b.x>=R+DEPTH-BR){room.score[0]++;resetPositions(room)}
 }
}
function fillBots(room){
 room.players=room.players.filter(p=>!p.bot);
 for(let team=0;team<2;team++){
  const humans=room.players.filter(p=>p.team===team).length;
  for(let slot=0;slot<5-humans;slot++){
   const p=player("ai-"+team+"-"+slot,team);
   p.bot=true;p.slot=slot;p.x=team===0?L+105+slot*85:R-105-slot*85;p.y=H/2+(slot-2)*130;
   room.players.push(p);
  }
 }
}
function botInputs(room,dt){
 room.aiClock=(room.aiClock||0)+dt;
 if(room.aiClock>5){room.aiClock=0;room.tactic=((room.tactic||0)+1)%4}
 for(const p of room.players){
  if(!p.bot)continue;
  const ball=room.ball,team=room.players.filter(q=>q.team===p.team),enemy=room.players.filter(q=>q.team!==p.team);
  const closest=team.reduce((a,b)=>Math.hypot(b.x-ball.x,b.y-ball.y)<Math.hypot(a.x-ball.x,a.y-ball.y)?b:a,team[0]);
  const dir=p.team===0?1:-1,near=Math.hypot(p.x-ball.x,p.y-ball.y)<PR+BR+52;
  const press=enemy.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<95);
  const spread=[1,1.35,.7,1.1][room.tactic||0];
  let x,y;
  if(p.slot===0){x=p.team===0?L+60:R-60;y=H/2+(ball.y-H/2)*.3}
  else if(p===closest){x=ball.x;y=ball.y}
  else{x=(p.team===0?L+220:R-220)+dir*(p.slot-1)*75*spread;y=H/2+(p.slot-2)*110*spread+(ball.y-H/2)*.3}
  if(press&&near)y+=p.y<H/2?55:-55;
  const d=norm((x-p.x)/90,(y-p.y)/90);p.input={x:d.x,y:d.y,control:near};
  if(near&&p.cd<=0){
   const goalDist=Math.abs((p.team===0?R:L)-p.x);
   const receiver=team.filter(q=>q!==p).sort((a,b)=>dir*(b.x-a.x))[0];
   if(goalDist<260){p.pendingShot=.4}
   else if(press&&receiver){p.input.x=receiver.x-p.x;p.input.y=receiver.y-p.y;p.pendingPass=true}
   else if(Math.random()<dt*.5&&receiver){p.input.x=receiver.x-p.x;p.input.y=receiver.y-p.y;p.pendingPass=true}
  }
 }
}
function tick(room,dt){
 if(room.status!=="playing")return;
 room.time=Math.max(0,room.time-dt);
 if(room.time===0){
  room.status="finished";
  if(!room.restart){room.restart=true;setTimeout(()=>{if(rooms.get(room.code)!==room||room.players.filter(p=>!p.bot).length!==2)return;room.score=[0,0];room.time=TIME;room.status="playing";room.restart=false;resetPositions(room)},6000).unref()}
  return;
 }
 botInputs(room,dt);
 for(const p of room.players)move(p,dt);
 if(room.players.length===2){
  const [a,c]=room.players,dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||1,lim=PR*2;
  if(d<lim){const push=(lim-d)/2,nx=dx/d,ny=dy/d;a.x=Math.max(L+PR,Math.min(R-PR,a.x-nx*push));a.y=Math.max(T+PR,Math.min(BOTTOM-PR,a.y-ny*push));c.x=Math.max(L+PR,Math.min(R-PR,c.x+nx*push));c.y=Math.max(T+PR,Math.min(BOTTOM-PR,c.y+ny*push))}
 }
 for(const p of room.players){
  if(p.pendingShot!==null){shoot(room,p,"shot",p.pendingShot);p.pendingShot=null}
  if(p.pendingPass){shoot(room,p,"pass");p.pendingPass=false}
 }
 const controllers=room.players.filter(p=>p.input.control&&p.noControl<=0&&inRange(p,room.ball))
  .sort((a,b)=>Math.hypot(room.ball.x-a.x,room.ball.y-a.y)-Math.hypot(room.ball.x-b.x,room.ball.y-b.y));
 let holder=null;
 if(controllers.length&&controlBall(room,controllers[0]))holder=controllers[0];
 physics(room,dt,holder);scored(room);
}
let count=0;
setInterval(()=>{
 count++;
 for(const room of rooms.values()){
  tick(room,1/30);
  if(count%2===0){
   const state={type:"state",code:room.code,players:room.players.map(p=>({id:p.id,team:p.team,x:p.x,y:p.y,vx:p.vx,vy:p.vy})),ball:room.ball,score:room.score,time:room.time,status:room.status};
   for(const p of room.players)safeSend(p.ws,state);
  }
 }
},1000/30);
server.listen(PORT,"0.0.0.0",()=>console.log("GameFootball server listening on port "+PORT));
