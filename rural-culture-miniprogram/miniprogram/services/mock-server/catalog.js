const config = require('../config');
const names = [
  ['red','十步芳草','乡村红色故事与红色文化','循着乡村记忆，读懂信念与传承。','#9A5147','红色记忆',['红色记忆','乡村故事','薪火相传','精神长存']],
  ['history','千年文脉','湖南人文历史与地方文化','翻开湖湘书页，感受文化的悠长。','#76603A','湖湘人文',['湖湘初识','乡土风俗','书香传承','文脉绵长']],
  ['industry','产业振兴','特色物产与乡村产业','走进田野与工坊，发现乡村新活力。','#795924','田野物产',['田野初识','特色物产','乡村新业','产业共兴']],
  ['ecology','绿水青山','乡村生态与环境保护','沿着青山与溪流，认识自然的馈赠。','#315C4C','山水生态',['山水初识','自然观察','生态守护','绿色生活']]
];
const themes = names.map(([id,name,subtitle,description,color,tag,titles])=>({
  id,name,subtitle,description,color,tag,image:'/assets/v2/'+id+'.jpg',
  chapters:titles.map((title,index)=>({id:id+'-'+(index+1),title,order:index+1,description:['从熟悉的乡村生活开始','读故事，也看见身边的文化','带着好奇，继续深入探索','让所学走进日常生活'][index],questionCount:config.rules.questionsPerChapter,points:config.rules.chapterPoints[index]}))
}));
module.exports = { themes };
