import bank from './questions.json' with {type:'json'};
export function seed(){
 const themes=[['red','十步芳草','红色故事','#c36a61'],['culture','千年文脉','人文历史','#657ca8'],['industry','产业振兴','乡土物产','#ba903f'],['ecology','绿水青山','生态风光','#398f7d']].map(([id,name,description,color])=>({id,name,description,color,enabled:true}));
 const levels=themes.flatMap(t=>[1,2,3,4].map(n=>({id:`${t.id}-${n}`,themeId:t.id,name:`第${n}关 · ${['基础认知','进阶理解','深度应用','综合挑战'][n-1]}`,sort:n,questionCount:10,timeLimit:300,points:[10,15,20,30][n-1]})));
 const questions=JSON.parse(JSON.stringify(bank));
 return {themes,levels,questions,rules:{reviveCount:1,dailyPointLimit:300,lockAfterFailure:true}};
}
