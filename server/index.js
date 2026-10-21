import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {WebSocket,WebSocketServer} from "ws";
import {stepMatch,resetMatch} from "../shared/football-core.js";

const PORT=Number(process.env.PORT)||3000;
const W=1600,H=900,PR=20,BR=11,GOAL=142,TIME=180,L=68,R=1532,T=30,BOTTOM=870,DEPTH=52,SPEED=185;
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const rooms=new Map();
const server=http.createServer(async(req,res)=>{
 if(req.url==="/health"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return}
 const files={"/":"index.html","/index.html":"index.html","/shared/football-core.js":"shared/football-core.js"};
 const file=files[req.url];
 if(!file){res.writeHead(404);res.end("Not found");return}
 try{const content=await readFile(resolve(root,file));res.writeHead(200,{"content-type":file.endsWith(".js")?"text/javascript; charset=utf-8":"text/html; charset=utf-8","cache-control":"no-cache"});res.end(content)}
 catch{res.writeHead(500);res.end("Frontend not found")}
});
const wss=new WebSocketServer({server,maxPayload:1024});
const safeSend=(ws,data)=>{if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))};
function player(id,team){return{id,team,x:team===0?205:W-205,y:H/2,vx:0,vy:0,faceX:team===0?1:-1,faceY:0,cd:0,noControl:0,lastShotSeq:0,lastPassSeq:0,pendingShot:null,pendingPass:null,input:{x:0,y:0,control:false}}}
function resetPositions(room){resetMatch(room)}
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
   if(Number.isSafeInteger(data.shotSeq)&&data.shotSeq>p.lastShotSeq){
    p.lastShotSeq=data.shotSeq;
    p.pendingShot={charge:Math.max(0,Math.min(1,Number(data.shotCharge)||0)),dir:{x:p.input.x,y:p.input.y}};
   }
   if(Number.isSafeInteger(data.passSeq)&&data.passSeq>p.lastPassSeq){
    p.lastPassSeq=data.passSeq;
    p.pendingPass={charge:Math.max(0,Math.min(1,Number(data.passCharge)||0)),dir:{x:p.input.x,y:p.input.y}};
   }
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
// All match physics and AI run in the same module as browser training.
function fillBots(room){
 room.players=room.players.filter(p=>!p.bot);
 for(let team=0;team<2;team++){
  const occupied=new Set(room.players.filter(p=>p.team===team).map(p=>p.slot));
  for(let slot=0;slot<5;slot++){
   if(occupied.has(slot))continue;
   const p=player("ai-"+team+"-"+slot,team);
   p.bot=true;p.slot=slot;
   room.players.push(p);
  }
 }
}
function tick(room,dt){
 if(room.status==="finished"){
  if(!room.restart){
   room.restart=true;
   setTimeout(()=>{
    if(rooms.get(room.code)!==room||room.players.filter(p=>!p.bot).length!==2)return;
    room.score=[0,0];room.time=TIME;room.status="playing";room.restart=false;
    resetMatch(room);
   },6000).unref();
  }
  return;
 }
 if(room.status!=="playing")return;
 stepMatch(room,dt);
}
let count=0;
setInterval(()=>{
 count++;
 for(const room of rooms.values()){
  tick(room,1/30);
  if(count%2===0){
   const state={type:"state",code:room.code,players:room.players.map(p=>({id:p.id,team:p.team,x:p.x,y:p.y,vx:p.vx/SPEED,vy:p.vy/SPEED})),ball:room.ball,score:room.score,time:room.time,status:room.status,goalNumber:room.goalNumber||0};
   for(const p of room.players)if(p.ws)safeSend(p.ws,state);
  }
 }
},1000/30);
server.listen(PORT,"0.0.0.0",()=>console.log("GameFootball server listening on port "+PORT));
