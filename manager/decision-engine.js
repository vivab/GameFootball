// Decision-driven football career. User never directly controls a footballer's movement.
// Choices are resolved by AI using game attributes, pressure and situational difficulty.
const opts=(entries)=>entries.map(([id,title,description,action,skill,bonus,risk,target])=>({id,title,description,action,skill,bonus,risk,target}));
export const SCENARIOS={
 duel:{name:"ОДИН НА ОДИН",hint:"Ты выходишь на вратаря. Как завершить атаку?",attackers:1,defenders:1,
  options:opts([
   ["far-low","Пробить низом в дальний","Точность важнее силы","shot","shooting",.11,.08,"far"],
   ["near-power","Пробить мощно в ближний","Быстрее, но меньше угол","shot","shooting",.06,.13,"near"],
   ["chip","Перебросить вратаря","Высокий риск, красивая попытка","chip","dribbling",.03,.25,"center"],
   ["round-keeper","Обойти вратаря","Дриблинг и удар в пустые ворота","dribble-shot","dribbling",.12,.19,"far"],
   ["wait","Подождать движения вратаря","Нужна выдержка","shot","shooting",.08,.13,"near"],
   ["fake","Ложный замах и удар","Сложное исполнение","dribble-shot","dribbling",.07,.19,"near"],
   ["pass-back","Откатить партнёру","Уменьшить риск потери","pass","passing",.02,.11,"center"]
  ])},
 two:{name:"ВЫХОД ДВА В ОДИН",hint:"Вдвоём против защитника. Сам завершишь или отдашь пас?",attackers:2,defenders:1,
  options:opts([
   ["one-two","Сыграть в стенку","Передача, рывок, ответный пас","pass-shot","passing",.16,.10,"far"],
   ["square","Пас поперёк штрафной","Партнёр выходит на пустые ворота","assist","passing",.21,.07,"center"],
   ["shoot-now","Бить самому","Не рисковать передачей","shot","shooting",.09,.11,"far"],
   ["draw-defender","Стянуть защитника и пас","Открыть пространство партнёру","assist","passing",.18,.10,"near"],
   ["through-ball","Разрезающий пас","Сложное, но опасное решение","assist","passing",.18,.18,"far"],
   ["beat-defender","Обыграть защитника самому","Скорость и дриблинг","dribble-shot","dribbling",.09,.21,"near"],
   ["lifted-pass","Навес за спину защитнику","Риск офсайда и перехвата","assist","passing",.13,.23,"center"]
  ])},
 three:{name:"ВЫХОД ТРИ В ОДИН",hint:"Численное преимущество! Как разыграть атаку?",attackers:3,defenders:1,
  options:opts([
   ["first-time","Пас под удар в касание","Быстрая комбинация","assist","passing",.26,.07,"center"],
   ["far-switch","Перевести мяч на другой фланг","Третий игрок остаётся свободным","assist","passing",.22,.11,"far"],
   ["solo","Рискнуть и пробить самому","Игра на личную статистику","shot","shooting",.05,.14,"near"],
   ["short-chain","Два коротких паса","Сохранить владение и вскрыть оборону","assist","passing",.18,.12,"center"],
   ["run","Ускориться в центр","Обогнать последнего защитника","dribble-shot","pace",.11,.16,"far"],
   ["feint-pass","Ложная передача и удар","Застать защитника врасплох","dribble-shot","dribbling",.13,.18,"near"],
   ["cross","Навес на дальнюю штангу","Друг замыкает подачу","assist","passing",.17,.17,"far"]
  ])},
 penalty:{name:"ПЕНАЛЬТИ",hint:"Мяч на точке. Выбери точное направление и исполнение.",attackers:1,defenders:1,
  options:opts([
   ["p-left-low","Низом в левый угол","Надёжный удар по газону","shot","shooting",.17,.07,"left-low"],
   ["p-right-low","Низом в правый угол","Надёжный удар по газону","shot","shooting",.17,.07,"right-low"],
   ["p-left-top","В левую девятку","Сложнее попасть, тяжело достать","shot","shooting",.23,.19,"left-top"],
   ["p-right-top","В правую девятку","Сложнее попасть, тяжело достать","shot","shooting",.23,.19,"right-top"],
   ["p-center","Сильно по центру","Вратарь может остаться на месте","shot","shooting",.09,.14,"center"],
   ["p-panenka","Паненка","Тонкая попытка перебросить вратаря","chip","dribbling",.14,.26,"center"],
   ["p-pause","Пауза в разбеге и низом","Поймать вратаря на движении","shot","dribbling",.18,.15,"right-low"],
   ["p-power","На силу в дальний угол","Самый мощный удар","shot","shooting",.15,.18,"left-low"],
   ["p-placed","Точный удар щёчкой","Спокойное исполнение","shot","shooting",.16,.09,"right-low"]
  ])},
 freekick:{name:"ШТРАФНОЙ УДАР",hint:"До ворот недалеко. Бить напрямую или разыграть стандарт?",attackers:4,defenders:5,
  options:opts([
   ["f-curve","Закрутить через стенку","Мастерство подкрутки","shot","shooting",.11,.18,"far"],
   ["f-under","Пробить под подпрыгнувшей стенкой","Сюрприз для защитников","shot","shooting",.06,.23,"near"],
   ["f-power","На силу в ближний","Риск промаха","shot","shooting",.07,.25,"near"],
   ["f-lob","Навес во вратарскую","Партнёр пытается замкнуть","assist","passing",.14,.13,"center"],
   ["f-short","Короткий пас и удар","Второй темп","pass-shot","passing",.16,.11,"far"],
   ["f-far","Навес на дальнюю штангу","Высокая подача","assist","passing",.13,.16,"far"],
   ["f-ground","Низовой розыгрыш","Передача через свободную зону","assist","passing",.11,.13,"near"],
   ["f-knuckle","Удар без вращения","Сложный удар с необычной траекторией","shot","shooting",.13,.27,"far"],
   ["f-dummy","Ложный разбег и пас","Неожиданная комбинация","pass-shot","passing",.15,.17,"center"]
  ])},
 corner:{name:"УГЛОВОЙ УДАР",hint:"Как разыграть угловой?",attackers:5,defenders:6,
  options:opts([
   ["c-near","Навес на ближнюю штангу","Быстрое замыкание","assist","passing",.08,.13,"near"],
   ["c-far","Навес на дальнюю штангу","Сложнее навес, хороший шанс","assist","passing",.13,.18,"far"],
   ["c-short","Короткий розыгрыш","Сместиться к штрафной","pass-shot","passing",.10,.08,"center"],
   ["c-ground","Низом на край штрафной","Удар вторым темпом","assist","passing",.12,.15,"center"],
   ["c-direct","Закрутить прямо в ворота","Почти невозможный олимпийский гол","shot","shooting",-.20,.32,"near"],
   ["c-second","Навес на вторую линию","Дальняя скидка партнёру","assist","passing",.10,.12,"far"],
   ["c-feint","Розыгрыш с ложным движением","Открыть фланг","assist","dribbling",.12,.16,"center"]
  ])},
 counter:{name:"БЫСТРАЯ КОНТРАТАКА",hint:"Защитники не успели вернуться. Выбери развитие эпизода.",attackers:3,defenders:2,
  options:opts([
   ["counter-dribble","Тащить мяч самому","Скорость против свободного пространства","dribble-shot","pace",.10,.17,"near"],
   ["counter-wide","Передача на свободный фланг","Увести атаку от центра","assist","passing",.14,.11,"far"],
   ["counter-split","Пас между двумя защитниками","Разрезающий пас","assist","passing",.14,.20,"center"],
   ["counter-shot","Дальний удар","Не сбавлять темп","shot","shooting",-.07,.23,"far"],
   ["counter-keep","Придержать мяч","Подождать поддержки","pass-shot","passing",.04,.10,"center"],
   ["counter-cross","Быстрый прострел","Партнёр врывается в штрафную","assist","passing",.18,.14,"near"],
   ["counter-sprint","Рывок до последней линии","Обыграть пространство","dribble-shot","pace",.08,.22,"far"]
  ])},
 save:{name:"МОМЕНТ У ВАШИХ ВОРОТ",hint:"ИИ-вратарь реагирует на удар. Выбери его установку.",attackers:1,defenders:1,
  options:opts([
   ["g-line","Остаться на линии","Сохранить позицию","save","defending",.13,.09,"center"],
   ["g-close","Сократить угол","Быстро выйти навстречу","save","pace",.14,.18,"near"],
   ["g-near","Закрыть ближний угол","Ожидать удар в ближний","save","defending",.10,.13,"near"],
   ["g-far","Ожидать дальний угол","Сместиться заранее","save","defending",.11,.13,"far"],
   ["g-feet","Спасти ногами","Среагировать на низкий мяч","save","defending",.12,.17,"center"],
   ["g-dive","Ранний прыжок","Рисковать ради сложного сейва","save","pace",.10,.21,"far"],
   ["g-delay","Подождать до удара","Не поддаться на финт","save","defending",.12,.10,"center"]
  ])}
};
export function makeDecisions(rng=Math.random,position="ST"){
 const minutes=[9,22,36,51,65,78,87];
 const attacking=["duel","two","three","penalty","freekick","corner","counter"];
 const order=attacking.map((x,i)=>attacking[(i+Math.floor(rng()*attacking.length))%attacking.length]);
 // A full match offers variety, but every kick remains AI-executed.
 return minutes.map((base,i)=>({
  id:"moment-"+i,minute:base+Math.floor(rng()*4),kind:position==="GK"?"save":order[i],
  ...SCENARIOS[position==="GK"?"save":order[i]]
 }));
}
export function getDecisionOptions(moment){return SCENARIOS[moment?.kind]?.options||SCENARIOS.duel.options}
export function evaluateChoice(moment,choice,skills,rng=Math.random){
 const option=getDecisionOptions(moment).find(x=>x.id===choice);
 if(!option)return {ok:false,message:"Действие не найдено."};
 const value=Math.max(25,Math.min(99,Number(skills?.[option.skill])||60));
 const goalkeeper=option.action==="save";
 const base=goalkeeper?.39:moment.kind==="penalty"?.58:moment.kind==="three"?.36:moment.kind==="two"?.31:moment.kind==="duel"?.29:moment.kind==="freekick"?.17:moment.kind==="corner"?.20:.24;
 const probability=Math.max(.04,Math.min(.87,base+(value-60)*.0045+option.bonus-option.risk*.55));
 const success=rng()<probability;
 const assisted=success&&["assist","pass-shot"].includes(option.action);
 return {ok:true,success,assisted,saved:goalkeeper&&success,conceded:goalkeeper&&!success,
  probability,option,kind:moment.kind,
  message:goalkeeper?(success?"Вратарь отбил удар!":"Мяч в воротах, вратарь не спас."):
    success?(assisted?"Голевая передача! Партнёр забил.":"Отличное решение! Гол!"):"Защитники или вратарь остановили атаку."};
}
