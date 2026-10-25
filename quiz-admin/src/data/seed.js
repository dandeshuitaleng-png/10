import bank from './questions.json' with {type:'json'};
export function seed(){
 const themes=[['red','十步芳草','红色故事','#c36a61'],['culture','千年文脉','人文历史','#657ca8'],['industry','金色产业','乡土物产','#ba903f'],['ecology','青山绿水','生态风光','#398f7d']].map(([id,name,description,color])=>({id,name,description,color,enabled:true}));
 const levels=themes.flatMap(t=>[1,2,3,4].map(n=>({id:`${t.id}-${n}`,themeId:t.id,name:`第${n}关 · ${['基础认知','进阶理解','深度应用','综合挑战'][n-1]}`,sort:n,questionCount:10,timeLimit:30,points:[10,15,20,30][n-1],difficultyLabel:['基础认知','进阶理解','深度应用','综合挑战'][n-1],enabled:true})));
 const questions=JSON.parse(JSON.stringify(bank)).map(q=>({...q,difficulty:'基础',enabled:true,mediaAlt:'',mediaCaption:'',mediaRequired:false,sourceTitle:'',sourceUrl:'',sourceIds:[],knowledgePoint:'',region:''}));
 return {themes,levels,questions,rules:{reviveCount:1,dailyPointLimit:null,unlimited:true,lockAfterFailure:true,timerSeconds:30,certificates:{title:'荣誉证书',totalName:'乡村知识闯关王',totalText:'已完成本活动全部乡村知识关卡',footer:'学习活动纪念，不代表学历或教育资格'},share:{title:'乡村知识之旅',text:'一起探索乡村知识',image:''},reviveShareText:'一起挑战乡村知识',reviveShareImage:''}};
}
