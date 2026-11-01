// CC0 public football records. This module never invents missing real squad members.
// All files are shipped inside /manager/data and work without paid football APIs.
const LEAGUE_FILES=[
 "leagues-europe-1.json","leagues-europe-2.json","leagues-europe-3.json",
 "leagues-europe-4.json","leagues-europe-5.json","leagues-europe-6.json",
 "leagues-west-europe-1.json","leagues-west-europe-2.json",
 "leagues-africa-1.json","leagues-africa-2.json",
 "leagues-asia.json","leagues-north-america.json","leagues-mls.json",
 "leagues-south-america.json"
];
const CONTINENT_NAMES={
 "europe":"Европа","asia":"Азия","middle-east":"Ближний Восток",
 "africa":"Африка","north-america":"Северная Америка",
 "central-america":"Центральная Америка","caribbean":"Карибский бассейн",
 "south-america":"Южная Америка","pacific":"Океания / Австралия",
 "international":"Другие страны"
};
const COUNTRY_NAMES={
 england:"Англия",scotland:"Шотландия",wales:"Уэльс",italy:"Италия",spain:"Испания",
 germany:"Германия",france:"Франция",netherlands:"Нидерланды",portugal:"Португалия",
 austria:"Австрия",belgium:"Бельгия",switzerland:"Швейцария",russia:"Россия",
 turkey:"Турция",greece:"Греция","czech-republic":"Чехия",poland:"Польша",
 croatia:"Хорватия",serbia:"Сербия",slovakia:"Словакия",slovenia:"Словения",
 denmark:"Дания",norway:"Норвегия",sweden:"Швеция",finland:"Финляндия",
 iceland:"Исландия",ireland:"Ирландия","northern-ireland":"Северная Ирландия",
 albania:"Албания",andorra:"Андорра",armenia:"Армения",azerbaijan:"Азербайджан",
 belarus:"Беларусь","bosnia-herzegovina":"Босния и Герцеговина",bulgaria:"Болгария",
 cyprus:"Кипр",estonia:"Эстония","faroe-islands":"Фарерские острова",georgia:"Грузия",
 gibraltar:"Гибралтар",hungary:"Венгрия",kosovo:"Косово",latvia:"Латвия",
 lithuania:"Литва",luxembourg:"Люксембург",malta:"Мальта",moldova:"Молдова",
 montenegro:"Черногория","north-macedonia":"Северная Македония",romania:"Румыния",
 "san-marino":"Сан-Марино",ukraine:"Украина",usa:"США",canada:"Канада",mexico:"Мексика",
 brazil:"Бразилия",argentina:"Аргентина",colombia:"Колумбия",chile:"Чили",
 ecuador:"Эквадор",paraguay:"Парагвай",peru:"Перу",uruguay:"Уругвай",
 venezuela:"Венесуэла","costa-rica":"Коста-Рика",panama:"Панама",
 japan:"Япония",china:"Китай",kazakhstan:"Казахстан","south-korea":"Южная Корея",
 australia:"Австралия","new-zealand":"Новая Зеландия","saudi-arabia":"Саудовская Аравия",
 israel:"Израиль","united-arab-emirates":"ОАЭ",qatar:"Катар",iran:"Иран",
 uzbekistan:"Узбекистан",iraq:"Ирак",egypt:"Египет",morocco:"Марокко",
 algeria:"Алжир",tunisia:"Тунис",nigeria:"Нигерия",ghana:"Гана",
 "south-africa":"ЮАР",kenya:"Кения",rwanda:"Руанда",uganda:"Уганда",
 tanzania:"Танзания",zambia:"Замбия",zimbabwe:"Зимбабве",senegal:"Сенегал",
 malawi:"Малави"
};
const FIFA_COUNTRIES={
 ENG:["england","europe"],SCO:["scotland","europe"],WAL:["wales","europe"],
 GER:["germany","europe"],ESP:["spain","europe"],ITA:["italy","europe"],
 FRA:["france","europe"],NED:["netherlands","europe"],POR:["portugal","europe"],
 BEL:["belgium","europe"],SUI:["switzerland","europe"],AUT:["austria","europe"],
 CZE:["czech-republic","europe"],POL:["poland","europe"],RUS:["russia","europe"],
 TUR:["turkey","europe"],GRE:["greece","europe"],CYP:["cyprus","europe"],
 DEN:["denmark","europe"],SWE:["sweden","europe"],NOR:["norway","europe"],
 HUN:["hungary","europe"],CRO:["croatia","europe"],ROU:["romania","europe"],
 SVK:["slovakia","europe"],SVN:["slovenia","europe"],BUL:["bulgaria","europe"],
 BIH:["bosnia-herzegovina","europe"],SRB:["serbia","europe"],IRL:["ireland","europe"],
 FIN:["finland","europe"],ARM:["armenia","europe"],AZE:["azerbaijan","europe"],
 USA:["usa","north-america"],CAN:["canada","north-america"],MEX:["mexico","north-america"],
 HON:["honduras","central-america"],PAN:["panama","central-america"],
 CRC:["costa-rica","central-america"],HAI:["haiti","caribbean"],
 BRA:["brazil","south-america"],ARG:["argentina","south-america"],
 COL:["colombia","south-america"],ECU:["ecuador","south-america"],
 CHI:["chile","south-america"],PAR:["paraguay","south-america"],
 URU:["uruguay","south-america"],VEN:["venezuela","south-america"],
 KSA:["saudi-arabia","middle-east"],UAE:["united-arab-emirates","middle-east"],
 QAT:["qatar","middle-east"],IRN:["iran","middle-east"],IRQ:["iraq","middle-east"],
 JOR:["jordan","middle-east"],ISR:["israel","middle-east"],
 JPN:["japan","asia"],KOR:["south-korea","asia"],CHN:["china","asia"],
 UZB:["uzbekistan","asia"],KAZ:["kazakhstan","asia"],THA:["thailand","asia"],
 MAS:["malaysia","asia"],IDN:["indonesia","asia"],AUS:["australia","pacific"],
 NZL:["new-zealand","pacific"],RSA:["south-africa","africa"],
 EGY:["egypt","africa"],MAR:["morocco","africa"],TUN:["tunisia","africa"],
 ALG:["algeria","africa"],GHA:["ghana","africa"]
};
export function countryLabel(slug){return COUNTRY_NAMES[slug]||String(slug||"").replace(/-/g," ").replace(/\b\p{L}/gu,c=>c.toUpperCase())}
export function continentLabel(slug){return CONTINENT_NAMES[slug]||countryLabel(slug)}
export function normalizeClubName(name){
 return String(name||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/&/g," and ").replace(/[.'’`]/g,"").replace(/[^a-z\p{L}0-9\s]+/gu," ")
  .replace(/^(fc|cf|sc|afc|ac)\s+/,"").replace(/\s+(fc|cf|sc|afc|ac)$/,"")
  .replace(/\s+/g," ").trim();
}
function slugify(s){return normalizeClubName(s).replace(/\s+/g,"-").slice(0,80)||"club"}
async function loadJSON(filename){
 const url=new URL("./data/"+filename,import.meta.url);
 const response=await fetch(url);
 if(!response.ok)throw new Error("Не удалось загрузить футбольную базу: "+filename);
 return response.json();
}
let cached=null;
export function loadFootballWorld(){
 if(!cached)cached=Promise.all([
  loadJSON("world-club-archive.json"),
  loadJSON("worldcup-2026-club-players.json"),
  ...LEAGUE_FILES.map(loadJSON)
 ]).then(([archive,squads,...parts])=>buildWorldIndex(archive,squads,parts)).catch(error=>{cached=null;throw error});
 return cached;
}
export function buildWorldIndex(archive,squads,parts){
 const leagues=parts.flatMap(p=>p.leagues||[]);
 const allClubs=[],byId=new Map(),byCountryName=new Map(),usedIds=new Set();
 const addClub=(id,name,country,region,origin)=>{
  if(!name||!country)return null;
  const key=country+"|"+normalizeClubName(name);
  const existing=byCountryName.get(key);
  if(existing){
   if(origin==="league")existing.hasSeasonListing=true;
   if(origin==="roster")existing.hasSquadData=true;
   return existing;
  }
  let chosen=id||"club-"+country+"-"+slugify(name);
  while(usedIds.has(chosen))chosen+="x";
  usedIds.add(chosen);
  const club={id:chosen,name,country,region:region||"international",archiveOnly:origin==="archive",hasSeasonListing:origin==="league",hasSquadData:origin==="roster",leagueIds:[],players:[]};
  allClubs.push(club);byId.set(chosen,club);byCountryName.set(key,club);
  return club;
 };
 for(const group of archive.countries||[]){
  for(const entry of group.clubs||[])addClub(entry.id,entry.name,group.country,group.region,"archive");
 }
 for(const league of leagues){
  league.teamIds=[];
  for(const teamName of league.teams||[]){
   const club=addClub(null,teamName,league.country,league.region,"league");
   if(!club)continue;
   club.archiveOnly=false;
   if(!club.leagueIds.includes(league.id))club.leagueIds.push(league.id);
   if(!league.teamIds.includes(club.id))league.teamIds.push(club.id);
  }
 }
 const partialSquadKeys=[];
 for(const roster of squads.clubs||[]){
  const mapping=FIFA_COUNTRIES[roster.countryCode]||[roster.countryCode?.toLowerCase()||"unknown","international"];
  const [country,region]=mapping;
  let club=addClub(null,roster.name,country,region,"roster");
  if(!club)continue;
  club.hasSquadData=true;
  for(const p of roster.players||[]){
   if(!club.players.some(x=>x.id===p.id))club.players.push({...p,snapshot:"WC 2026"});
  }
  partialSquadKeys.push(club.id);
 }
 for(const club of allClubs){
  club.players.sort((a,b)=>String(a.pos).localeCompare(String(b.pos))||a.name.localeCompare(b.name));
 }
 const countries=[...new Map(allClubs.map(c=>[c.region+"|"+c.country,{region:c.region,country:c.country}])).values()];
 countries.sort((a,b)=>continentLabel(a.region).localeCompare(continentLabel(b.region),"ru")||countryLabel(a.country).localeCompare(countryLabel(b.country),"ru"));
 leagues.sort((a,b)=>continentLabel(a.region).localeCompare(continentLabel(b.region),"ru")||a.country.localeCompare(b.country)||a.tier-b.tier);
 return {
  clubs:allClubs,leagues,countries,byId,
  archiveCount:(archive.countries||[]).reduce((n,g)=>n+(g.clubs?.length||0),0),
  sourcedPlayers:allClubs.reduce((n,c)=>n+c.players.length,0),
  snapshotLabel:"Реальные имена из составов сборных ЧМ-2026; принадлежность к клубу актуальна только на тот турнир.",
  findClub(id){return byId.get(id)||null},
  getLeagueClubs(id){const league=leagues.find(l=>l.id===id);return (league?.teamIds||[]).map(id=>byId.get(id)).filter(Boolean)},
  getCountryClubs(country,region){return allClubs.filter(c=>c.country===country&&(!region||c.region===region))},
  getCountryLeagues(country,region){return leagues.filter(l=>l.country===country&&(!region||l.region===region))},
  searchClubs(q,max=50){
   const k=normalizeClubName(q);
   if(!k)return allClubs.slice(0,max);
   return allClubs.filter(c=>normalizeClubName(c.name).includes(k)).slice(0,max);
  }
 };
}
