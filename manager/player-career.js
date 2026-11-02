// Fictional player career values. NO real footballers or real club squads are bundled.
export const PLAYER_SKILLS=[
 ["pace","Скорость"],["shooting","Удары"],["passing","Пасы"],
 ["dribbling","Дриблинг"],["defending","Отбор"]
];
const START_SKILLS={pace:62,shooting:60,passing:60,dribbling:61,defending:55};
export function positionIndex(position){return position==="GK"?0:position==="CB"?2:position==="CM"?6:9}
export function positionLabel(position){return {ST:"Нападающий",CM:"Полузащитник",CB:"Защитник",GK:"Вратарь"}[position]||"Нападающий"}
export function makePlayerProfile(name,mode="custom",position="ST"){
 return {age:18,position,number:position==="GK"?1:position==="CB"?4:position==="CM"?8:9,
  skills:{...START_SKILLS},fitness:100,trust:55,experience:0,skillPoints:3,appearances:0,goals:0,
  assists:0,passes:0,saves:0,contractMatches:15,careerStage:"Основной состав"};
}
export function ensurePlayerProfile(world){
 if(!world||world.mode==="coach")return null;
 if(!world.player)world.player=makePlayerProfile(world.name,world.mode);
 const p=world.player;
 p.skills??={...START_SKILLS};
 for(const [key] of PLAYER_SKILLS)if(!Number.isFinite(p.skills[key]))p.skills[key]=START_SKILLS[key];
 for(const [key,def] of Object.entries({fitness:100,trust:55,experience:0,skillPoints:3,appearances:0,
  goals:0,assists:0,passes:0,saves:0,contractMatches:15,age:18})){
  if(!Number.isFinite(p[key]))p[key]=def;
 }
 if(!["GK","CB","CM","ST"].includes(p.position))p.position="ST";
 return p;
}
export function playerOverall(p){const s=p.skills;return Math.round((s.pace+s.shooting+s.passing+s.dribbling+s.defending)/5)}
export function training(profile,key){
 if(!PLAYER_SKILLS.some(([name])=>name===key))return {ok:false,message:"Неизвестный навык."};
 if(profile.skillPoints<1)return {ok:false,message:"Нет очков тренировок. Сыграй матч."};
 const gain=Math.min(2,99-profile.skills[key]);
 if(gain<=0)return {ok:false,message:"Навык уже максимальный."};
 profile.skillPoints--;profile.skills[key]+=gain;
 return {ok:true,message:"Навык улучшен на "+gain};
}
export function matchProgress(profile,stats={},result="draw"){
 profile.appearances++;
 const goals=Math.max(0,Number(stats.goals)||0),assists=Math.max(0,Number(stats.assists)||0);
 const passes=Math.max(0,Number(stats.passes)||0),saves=Math.max(0,Number(stats.saves)||0);
 profile.goals+=goals;profile.assists+=assists;profile.passes+=passes;profile.saves+=saves;
 const points=1+Math.min(3,goals+assists+Math.floor(saves/2));
 profile.skillPoints+=points;
 profile.experience+=20+goals*35+assists*22+saves*12+Math.min(12,passes*2)+(result==="win"?15:0);
 profile.trust=Math.max(0,Math.min(100,profile.trust+goals*3+assists*2+saves+(result==="win"?1:result==="loss"?-1:0)));
 profile.fitness=Math.max(40,profile.fitness-6);profile.contractMatches=Math.max(0,profile.contractMatches-1);
 return {points,xp:profile.experience};
}
// Offers are disabled until the user adds the actual club database to the game.
export function availableOffers(){return []}
export function acceptOffer(){return false}
export function xpLevel(p){return 1+Math.floor(p.experience/100)}
