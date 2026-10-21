'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {layout}=require('../miniprogram/services-v4/journey');
const {metrics,mapMetrics}=require('../miniprogram/services-v4/home-layout');
const themes=['culture','red','industry','ecology'];
function rows(state){return Array.from({length:4},(_,i)=>({id:'l'+i,status:state==='complete'?'completed':state==='locked'?(i<2?'completed':i===2?'today-locked':'locked'):i<state?'completed':i===state?'current':'locked'}));}
test('四主题在三个手机视口和四种进度下都有真实滚动范围，节点局部位置一致',()=>{
 for(const [width,height] of [[320,568],[375,812],[430,932]])for(const state of [0,2,'locked','complete']){
  let base;
  for(const id of themes){const m=metrics({windowWidth:width,windowHeight:height,statusBarHeight:44,screenHeight:height,safeArea:{bottom:height-34}},null,id),r=layout(rows(state),id,width,m.mapViewport);
   assert.equal(r.height,width*1280/750);assert.ok(r.canScroll&&r.maxScroll>0,id+' must scroll');
   const positions=r.nodes.map(n=>[n.left,n.bottom,n.distance]);if(base)assert.deepEqual(positions,base);else base=positions;
   assert.ok(r.focusTop>=0&&r.focusTop<=r.maxScroll);
  }
 }
});
test('卡片与人物提示在320/375/390/430下不横向溢出，四种状态共用90px卡片',()=>{
 for(const width of [320,375,390,430]){const g=mapMetrics(width);assert.equal(g.cardHeight,90);assert.equal(g.cardGap,10);assert.ok(g.nodeWidth>=88&&g.nodeWidth<=110);
  for(const x of [.67,.30,.26]){const nodeLeft=width*x-g.nodeWidth/2,cardLeft=x>.5?nodeLeft-g.cardGap-g.cardWidth:nodeLeft+g.nodeWidth+g.cardGap;assert.ok(cardLeft>=8);assert.ok(cardLeft+g.cardWidth<=width-8);
   const guideLeft=nodeLeft+(x>.5?g.guideRight:g.guideLeft),overhang=(g.guideLabelWidth-g.guideWidth)/2;assert.ok(guideLeft-overhang>=8-.01);assert.ok(guideLeft+g.guideWidth+overhang<=width-8+.01);
  }
 }
});
test('空目录、少于四关和超高视口不会制造空白滚动，超过四关继续铺完整地图',()=>{
 for(const id of themes){const empty=layout([],id,375,500);assert.equal(empty.canScroll,false);assert.equal(empty.maxScroll,0);
  const fit=layout(rows(0),id,375,900);assert.equal(fit.height,640);assert.equal(fit.canScroll,false);assert.equal(fit.maxScroll,0);assert.equal(fit.focusTop,0);
  for(const count of [1,2,3,5,11]){const levels=Array.from({length:count},(_,i)=>({id:'l'+i,status:i===0?'current':'locked'})),r=layout(levels,id,375,400);assert.equal(r.height,Math.ceil(count/4)*640);assert.equal(r.nodes.length,count);assert.ok(r.nodes.every(n=>n.bottom>=0));}
 }
});
