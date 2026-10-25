'use strict';
// Client-approved certificate copy. Legacy labels are presentation aliases only;
// issued IDs, dates, level scope, eligibility and player records are untouched.
const award='知识达人';
const themes={
 red:{name:'十步芳草',award},
 culture:{name:'千年文脉',award},
 industry:{name:'金色产业',award},
 ecology:{name:'青山绿水',award}
};
const legacyAwards=new Set(['红色故事通','千年文脉知识达人','金色产业知识达人','青山绿水知识达人','芳草撷英','文脉传薪','兴业腾骧','碧水涵青']);
function present(c,skin={}){
 const out=Object.assign({},c),t=themes[c.gameId||c.themeId||skin.gameId];
 if(c.scope==='all'||!t)return out;
 if(!c.name||legacyAwards.has(c.name))out.name=t.award;
 const oldText=String(c.description||'').trim();
 if(!oldText||/^已完成本主题全部(?:知识)?关卡[。！]?$/.test(oldText)||/^您在「[^」]+」学习中，\s*认真探索，积累新知。$/.test(oldText))out.description='您在'+(skin.name||t.name)+'学习中，\n认真探索，积累知识。';
 return out;
}
module.exports={themes,present};
