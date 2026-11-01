// GameFootball: personal player career. Stats and club offers are illustrative game data.
export const PLAYER_SKILLS = [
  ["pace","Скорость"],["shooting","Удары"],["passing","Пасы"],
  ["dribbling","Дриблинг"],["defending","Отбор"]
];
export const REAL_PRESETS = {
  "Криштиану Роналду":{age:41,position:"ST",number:7,skills:{pace:73,shooting:89,passing:76,dribbling:78,defending:27}},
  "Лионель Месси":{age:39,position:"ST",number:10,skills:{pace:72,shooting:88,passing:91,dribbling:91,defending:33}},
  "Килиан Мбаппе":{age:27,position:"ST",number:9,skills:{pace:95,shooting:90,passing:79,dribbling:90,defending:32}},
  "Ламин Ямаль":{age:19,position:"ST",number:10,skills:{pace:88,shooting:79,passing:85,dribbling:91,defending:38}}
};
const CUSTOM_SKILLS={pace:64,shooting:61,passing:60,dribbling:62,defending:56};
const LEVEL_SIZE=100;


export function positionIndex(position){
  return position==="CB"?2:position==="CM"?6:9;
}
export function positionLabel(position){
  return {ST:"Нападающий",CM:"Полузащитник",CB:"Защитник"}[position]||"Нападающий";
}
export function makePlayerProfile(name,mode,position="ST"){
  const preset=mode==="real"?REAL_PRESETS[name]:null;
  return {
    age:preset?.age??18,position:preset?.position??position,number:preset?.number??(position==="CB"?4:position==="CM"?8:9),
    skills:{...(preset?.skills??CUSTOM_SKILLS)},fitness:100,trust:55,experience:0,
    skillPoints:3,appearances:0,goals:0,assists:0,passes:0,
    offers:[],contractMatches:15,careerStage:"Основной состав"
  };
}
export function ensurePlayerProfile(world){
  if(!world||world.mode==="coach")return null;
  if(!world.player)world.player=makePlayerProfile(world.name,world.mode,"ST");
  const p=world.player;
  if(!p.skills)p.skills={...CUSTOM_SKILLS};
  for(const [key] of PLAYER_SKILLS)if(!Number.isFinite(p.skills[key]))p.skills[key]=CUSTOM_SKILLS[key];
  for(const [key,fallback] of Object.entries({fitness:100,trust:55,experience:0,skillPoints:3,appearances:0,goals:0,assists:0,passes:0,contractMatches:15})){
    if(!Number.isFinite(p[key]))p[key]=fallback;
  }
  if(!Array.isArray(p.offers))p.offers=[];
  if(!["ST","CM","CB"].includes(p.position))p.position="ST";
  return p;
}
export function playerOverall(p){
  const s=p.skills;
  return Math.round((s.pace+s.shooting+s.passing+s.dribbling+s.defending)/5);
}
export function training(profile,key){
  if(!PLAYER_SKILLS.some(([k])=>k===key))return {ok:false,message:"Неизвестный навык"};
  if(profile.skillPoints<1)return {ok:false,message:"Нет очков тренировки. Сыграй матч."};
  if(profile.skills[key]>=99)return {ok:false,message:"Этот навык уже достиг максимума."};
  profile.skillPoints--;
  const gain=Math.min(2,99-profile.skills[key]);
  profile.skills[key]+=gain;
  return {ok:true,message:"Навык улучшен! +"+gain};
}
export function matchProgress(profile,stats={},result="draw"){
  profile.appearances++;
  const goals=Number.isFinite(stats.goals)?stats.goals:0;
  const assists=Number.isFinite(stats.assists)?stats.assists:0;
  const passes=Number.isFinite(stats.passes)?stats.passes:0;
  profile.goals+=goals;profile.assists+=assists;profile.passes+=passes;
  const points=1+Math.min(3,goals+assists);
  profile.skillPoints+=points;
  profile.experience+=20+goals*35+assists*20+Math.min(12,passes*2)+(result==="win"?15:0);
  profile.trust=Math.max(0,Math.min(100,profile.trust+(goals?4:0)+(assists?2:0)+(result==="win"?1:result==="loss"?-1:0)));
  profile.fitness=Math.max(40,Math.min(100,profile.fitness-11+5));
  profile.contractMatches=Math.max(0,profile.contractMatches-1);
  return {points,xp:profile.experience};
}
export function availableOffers(world){
  const profile=ensurePlayerProfile(world);
  if(!profile||profile.appearances<3||profile.appearances-(profile.lastTransferAt??0)<3)return [];
  // Fictional teams; real-world databases and negotiations are not yet connected.
  return [
    {id:"north",club:"ФК Север",label:"Больше игрового времени",minTrust:0},
    {id:"olympic",club:"Олимпик",label:"Выше конкуренция",minTrust:60},
    {id:"union",club:"Унион",label:"Контракт на новый сезон",minTrust:75}
  ].filter(offer=>offer.minTrust<=profile.trust&&offer.club!==world.club);
}
export function acceptOffer(world,club){
  const offer=availableOffers(world).find(offer=>offer.club===club);
  if(!offer)return false;
  world.club=offer.club;world.player.contractMatches=15;world.player.lastTransferAt=world.player.appearances;
  world.events??=[];world.events.unshift("Новый контракт: "+club);
  return true;
}
export function xpLevel(profile){
  return 1+Math.floor(profile.experience/LEVEL_SIZE);
}
