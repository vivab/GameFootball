// Editable European league templates only. No imported real clubs or real players.
// League titles are labels; club rosters deliberately remain empty until authored.
export const EUROPE_LEAGUES=[
 ["england","Англия",[["Premier League",1,20],["Championship",2,24],["League One",3,24],["League Two",4,24]]],
 ["spain","Испания",[["La Liga",1,20],["Segunda División",2,22]]],
 ["germany","Германия",[["Bundesliga",1,18],["2. Bundesliga",2,18],["3. Liga",3,20]]],
 ["italy","Италия",[["Serie A",1,20],["Serie B",2,20],["Serie C",3,20]]],
 ["france","Франция",[["Ligue 1",1,18],["Ligue 2",2,18]]],
 ["portugal","Португалия",[["Primeira Liga",1,18],["Liga Portugal 2",2,18]]],
 ["netherlands","Нидерланды",[["Eredivisie",1,18],["Eerste Divisie",2,20]]],
 ["belgium","Бельгия",[["Belgian Pro League",1,16]]],
 ["scotland","Шотландия",[["Scottish Premiership",1,12],["Scottish Championship",2,10]]],
 ["turkey","Турция",[["Süper Lig",1,18],["1. Lig",2,20]]],
 ["austria","Австрия",[["Austrian Bundesliga",1,12]]],
 ["switzerland","Швейцария",[["Swiss Super League",1,12]]],
 ["greece","Греция",[["Super League Greece",1,14]]],
 ["poland","Польша",[["Ekstraklasa",1,18]]],
 ["czechia","Чехия",[["Czech First League",1,16]]],
 ["denmark","Дания",[["Danish Superliga",1,12]]],
 ["sweden","Швеция",[["Allsvenskan",1,16]]],
 ["norway","Норвегия",[["Eliteserien",1,16]]],
 ["finland","Финляндия",[["Veikkausliiga",1,12]]],
 ["ireland","Ирландия",[["League of Ireland Premier Division",1,10]]],
 ["croatia","Хорватия",[["HNL",1,10]]],
 ["serbia","Сербия",[["Serbian SuperLiga",1,16]]],
 ["romania","Румыния",[["Liga I",1,16]]],
 ["ukraine","Украина",[["Ukrainian Premier League",1,16]]],
 ["slovakia","Словакия",[["Slovak Super Liga",1,12]]],
 ["slovenia","Словения",[["PrvaLiga",1,10]]],
 ["hungary","Венгрия",[["Nemzeti Bajnokság I",1,12]]],
 ["bulgaria","Болгария",[["First Professional League",1,16]]],
 ["iceland","Исландия",[["Besta deild karla",1,12]]],
 ["russia","Россия",[["Russian Premier League",1,16]]]
].flatMap(([country,countryLabel,entries])=>entries.map(([name,tier,clubCount])=>({
 id:country+"-"+tier,name,tier,country,countryLabel,clubCount,region:"europe",
 clubs:[],players:[],kind:"editable-template",season:"шаблон без составов"
})));
export const EUROPE_COUNTRIES=[...new Map(EUROPE_LEAGUES.map(l=>[l.country,l.countryLabel])).entries()].map(([id,name])=>({id,name}));
export function getEuropeanLeague(id){return EUROPE_LEAGUES.find(l=>l.id===id)||EUROPE_LEAGUES[0]}
export function leagueLabel(id){return getEuropeanLeague(id).name}
export function placeholderClubs(world){
 const league=getEuropeanLeague(world?.leagueId);
 const total=Math.max(8,league.clubCount);
 return Array.from({length:total-1},(_,i)=>"Команда "+String(i+1).padStart(2,"0"));
}
