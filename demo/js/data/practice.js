// Illustrative ecological questions for an explicitly labelled playtest only.
// These are not reviewed local content and never enter QUESTION_POOLS.
const rows=[
['河边游玩后，垃圾应该怎样处理？',['装好后带到垃圾收集点','留在草丛里','倒进河里','埋在岸边'],0,'带走垃圾，交给合适的垃圾收集设施处理。'],
['观察野生鸟类，哪种做法合适？',['保持距离，安静观察','追逐鸟群','靠近鸟巢抓幼鸟','用石子驱赶'],0,'保持距离，避免干扰野生动物。'],
['发现水龙头一直滴水，应该怎么做？',['提醒管理人员维修','让它继续滴水','把水引到地面','只拍照不处理'],0,'及时报告漏水，减少水资源浪费。'],
['哪种物品适合反复使用？',['可清洗的水杯','用过的一次性纸杯','破损的塑料袋','沾油的纸巾'],0,'使用可反复清洗的水杯，可以减少一次性用品消耗。'],
['进入自然保护区域，应选择哪条路？',['允许通行的步道','穿过封闭的区域','随意踩踏湿地','沿着动物巢穴走'],0,'遵守现场标识，沿允许通行的步道行走。'],
['为什么不要随意放生外来动物？',['可能影响当地生态','一定能帮助所有动物','能让河流自动变清','可以替代环境保护'],0,'外来物种可能影响当地生态，不能随意放生。'],
['野餐结束，哪种行为更合适？',['清理现场并带走垃圾','留下塑料餐具','把剩菜倒进溪流','把包装烧在草地上'],0,'野餐后清理现场，避免垃圾和食物残渣污染环境。'],
['发现有人破坏保护区标识，怎么办？',['告知管理人员','和他一起拆掉','自己冒险追赶','把标识扔掉'],0,'在保证自身安全的前提下，向管理人员报告。'],
['植物根系对土壤有什么作用？',['有助于固定土壤','让土壤全部消失','让所有雨水不能下渗','自动清除全部污染'],0,'根系有助于固定土壤，减少水土流失。'],
['为什么不应把废电池丢在河边？',['应按当地要求分类处理','废电池可以净化河水','鱼会吃掉废电池','电池会马上变成石头'],0,'废电池应按当地分类要求处理，避免随意丢弃。'],
['爱护草地，哪种行为合适？',['沿开放道路通行','反复踩踏新种草坪','在草地乱扔包装','随意拔走植物'],0,'沿开放道路通行，保护草地和植物。'],
['哪种观察方式更尊重自然？',['用望远镜远距离观察','拔下植物带回家','抓走野生昆虫收藏','把巢穴翻开拍照'],0,'远距离观察可以减少对自然环境的干扰。'],
];
const PRACTICE_QUESTIONS=rows.map(([title,options,answer,explanation],i)=>{
  const shift=i%4;const rotated=options.slice(shift).concat(options.slice(0,shift));
  return {id:`practice-eco-${i+1}`,title,options:rotated,answer:(answer-shift+4)%4,explanation,difficulty:'基础'};
});
// Image-choice example stays in the isolated practice pool, never formal content.
PRACTICE_QUESTIONS.push({id:'practice-eco-observe-image',title:'图中的双筒望远镜适合怎样观察湿地鸟类？',options:['保持距离，沿开放步道安静观察','追着鸟群跑，观察得更清楚','离开步道走进芦苇丛找鸟巢','用食物吸引鸟群靠近'],answer:0,explanation:'使用望远镜远距离观察，留在开放步道，减少对野生鸟类和湿地植被的干扰。',difficulty:'基础',media:{type:'image',src:'images/v2-style03/wetland-observation.jpg',alt:'双筒望远镜放在木栏杆上，远处有湿地和鸟类。',caption:'湿地观察工具示意'}});
module.exports={PRACTICE_QUESTIONS};
