import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {WebSocket,WebSocketServer} from "ws";

const PORT=Number(process.env.PORT)||3000;
const W=960,H=540,PR=20,BR=11,GOAL=92,TIME=180;
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
function player(id,team){return{id,team,x:team===0?205:W-205,y:H/2,vx:0,vy:0,cd:0,input:{x:0,y:0,kick:false}}}
function resetPositions(room){room.ball={x:W/2,y:H/2,vx:0,vy:0};for(const p of room.players){p.x=p.team===0?205:W-205;p.y=H/2;p.vx=0;p.vy=0;p.cd=0}}
function newRoom(code){return{code,players:[],ball:{x:W/2,y:H/2,vx:0,vy:0},score:[0,0],time:TIME,status:"waiting",restart:false}}
function code(){let s;do{s=randomBytes(5).toString("hex").slice(0,6).toUpperCase()}while(rooms.has(s));return s}
function joinRoom(ws,room){
 if(ws.room){safeSend(ws,{type:"error",message:"Ты уже в комнате"});return}
 if(room.players.length>=2){safeSend(ws,{type:"error",message:"Комната заполнена"});return}
 const p=player(randomBytes(7).toString("hex"),room.players.length);
 p.ws=ws;ws.room=room;ws.player=p;room.players.push(p);
 safeSend(ws,{type:"welcome",id:p.id,team:p.team,code:room.code});
 if(room.players.length===2){room.score=[0,0];room.time=TIME;room.status="playing";room.restart=false;resetPositions(room)}
}
wss.on("connection",ws=>{
 ws.on("message",raw=>{
  let data;try{data=JSON.parse(raw.toString())}catch{return}
  if(!data||typeof data!=="object")return;
  if(data.type==="create"){const id=code(),room=newRoom(id);rooms.set(id,room);joinRoom(ws,room)}
  else if(data.type==="join"){const id=String(data.code||"").toUpperCase(),room=rooms.get(id);if(!room){safeSend(ws,{type:"error",message:"Комната не найдена"});return}joinRoom(ws,room)}
  else if(data.type==="input"&&ws.player){const clamp=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;ws.player.input={x:clamp(data.x),y:clamp(data.y),kick:data.kick===true}}
 });
 ws.on("close",()=>{
  const room=ws.room;if(!room)return;
  room.players=room.players.filter(p=>p.ws!==ws);
  room.status="waiting";room.restart=false;
  if(!room.players.length)rooms.delete(room.code);
  else{room.score=[0,0];room.time=TIME;room.players[0].team=0;resetPositions(room)}
 });
 ws.on("error",()=>{});
});
function norm(x,y){const d=Math.hypot(x,y);return d>1?{x:x/d,y:y/d}:{x,y}}
function move(p,dt){
 const d=norm(p.input.x,p.input.y);
 p.x=Math.max(PR,Math.min(W-PR,p.x+d.x*257*dt));
 p.y=Math.max(PR,Math.min(H-PR,p.y+d.y*257*dt));
 p.vx=d.x;p.vy=d.y;
 p.cd=Math.max(0,p.cd-dt);
}
function shoot(room,p){
 if(!p.input.kick||p.cd>0)return;
 const b=room.ball,dx=b.x-p.x,dy=b.y-p.y,len=Math.hypot(dx,dy);
 if(len>PR+BR+21)return;
 let aim=norm(p.input.x,p.input.y);
 if(Math.hypot(aim.x,aim.y)<.15)aim=norm(dx/(len||1),dy/(len||1));
 let mag=Math.hypot(aim.x,aim.y)||1;
 b.vx=790*aim.x/mag;b.vy=790*aim.y/mag;p.cd=.35;
}
function tick(room,dt){
 if(room.status!=="playing")return;
 room.time=Math.max(0,room.time-dt);
 if(room.time===0){
  room.status="finished";
  if(!room.restart){room.restart=true;setTimeout(()=>{if(rooms.get(room.code)!==room||room.players.length!==2)return;room.score=[0,0];room.time=TIME;room.status="playing";room.restart=false;resetPositions(room)},6000).unref()}
  return;
 }
 for(const p of room.players)move(p,dt);
 if(room.players.length===2){
  const [a,c]=room.players,dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||1,lim=PR*2;
  if(d<lim){const push=(lim-d)/2,nx=dx/d,ny=dy/d;a.x=Math.max(PR,Math.min(W-PR,a.x-nx*push));a.y=Math.max(PR,Math.min(H-PR,a.y-ny*push));c.x=Math.max(PR,Math.min(W-PR,c.x+nx*push));c.y=Math.max(PR,Math.min(H-PR,c.y+ny*push))}
 }
 for(const p of room.players)shoot(room,p);
 const b=room.ball;
 for(const p of room.players){
  const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy)||.001,lim=PR+BR;
  if(d<lim){const nx=dx/d,ny=dy/d;b.x=p.x+nx*lim;b.y=p.y+ny*lim;b.vx+=nx*155;b.vy+=ny*155}
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;
 const friction=Math.exp(-1.9*dt);b.vx*=friction;b.vy*=friction;
 if(b.y<BR){b.y=BR;b.vy=Math.abs(b.vy)*.75}
 if(b.y>H-BR){b.y=H-BR;b.vy=-Math.abs(b.vy)*.75}
 if(b.x< -BR&&Math.abs(b.y-H/2)<GOAL){room.score[1]++;resetPositions(room)}
 else if(b.x>W+BR&&Math.abs(b.y-H/2)<GOAL){room.score[0]++;resetPositions(room)}
 else{
  if(b.x<BR&&Math.abs(b.y-H/2)>=GOAL){b.x=BR;b.vx=Math.abs(b.vx)*.75}
  if(b.x>W-BR&&Math.abs(b.y-H/2)>=GOAL){b.x=W-BR;b.vx=-Math.abs(b.vx)*.75}
 }
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
