const T = require('./tokens');
const D = require('./draw');
const { THEMES, getTheme, getLevels } = require('../data/themes');
const C = T.colors;
const { MAP_LAYOUTS, landmarkRegion } = require('./map-layout');
// Trim only transparent padding while keeping the approved source PNGs intact.
const ART_BOUNDS = {};

class Renderer {
  constructor(ctx) { this.ctx = ctx; this.targets = []; }
  target(id, x, y, w, h, action, disabled = false) { this.targets.push({ id, x, y, w, h, action, disabled }); }
  button(id, label, x, y, w, action, secondary = false, disabled = false) {
    const ctx = this.ctx; const pressed = this.view.pressedId === id; const yy = y + (pressed ? 2 : 0);
    D.rounded(ctx, x, yy + 3, w, 52, 12, secondary ? C.line : C.ink);
    D.rounded(ctx, x, yy, w, 52, 12, disabled ? C.lakeLight : secondary ? C.surface : C.lake, secondary ? C.line : null);
    D.text(ctx, label, x + w / 2, yy + 13, 17, secondary || disabled ? C.ink : C.surface, 600, 'center');
    this.target(id, x, y, w, 52, action, disabled);this.targets[this.targets.length-1].label=label;
  }
  render(route, viewport, view = {}) {
    this.v = viewport; this.view = view; this.route = route; this.targets = []; this.layout = {};
    const ctx = this.ctx; ctx.clearRect(0,0,viewport.width,viewport.height);ctx.fillStyle=C.paper;ctx.fillRect(0,0,viewport.width,viewport.height);
    this.scrollRegion=null; const t = Math.max(viewport.top + 12,68 / viewport.scale); this.t = t;
    this.sceneBackdrop(route.name);
    if (route.name === 'loading') this.loading();
    else if (route.name === 'home') this.home();
    else if (route.name === 'map') this.map();
    else if (route.name === 'level-ready') this.levelReady();
    else if (route.name === 'quiz' && view.challengeState==='locked') this.locked();
    else if (route.name === 'quiz' && view.question) this.quiz();
    else if (route.name === 'result' && view.result) this.result();
    else this.empty(route.name);
    if (view.modal === 'revive') this.revive();
    if (view.exitRequested) this.exitDialog();
    if(view.toast){const y=view.modal?this.t:route.name==='quiz'?viewport.bottom-92:this.t+92;D.rounded(ctx,20,y,335,48,12,C.ink);D.wrap(ctx,view.toast,32,y+7,311,14,C.surface);}
    return this.targets;
  }
  sceneBackdrop(name) {
    const themeId=(name==='level-ready'||this.view.localCampaign)?(this.route.params.themeId||'ecology'):'ecology';
    const ctx=this.ctx,scene=this.view.images&&this.view.images['map-'+themeId];
    if(!scene||!['home','quiz','result'].includes(name))return;
    D.imageCover(ctx,scene,0,0,375,this.v.height,0);
    if(name==='quiz'){ctx.fillStyle='rgba(239,234,217,.15)';ctx.fillRect(0,0,375,this.v.height);}
    ctx.fillStyle=name==='quiz'?'rgba(239,234,217,.28)':'rgba(239,234,217,.18)';ctx.fillRect(0,0,375,this.v.height);
    this.layout.backdrop={source:'original-'+themeId+'-environment',decorative:true,qualityRefinement:true};
  }
  loading() {
    const ctx=this.ctx,y=this.v.height*.42;
    D.motif(ctx,'water',157,y-80,60);D.text(ctx,'趣味闯关',187.5,y,28,C.ink,700,'center');
    D.text(ctx,'正在准备乡村之旅',187.5,y+47,15,C.muted,400,'center');
    D.rounded(ctx,77,y+88,221,7,4,C.lakeLight);
    const progress=Math.max(.06,this.view.progress || 0);
    D.rounded(ctx,77,y+88,221*progress,7,4,C.lake);
    const offset=((this.view.time||0)/10)%200;D.circle(ctx,87+offset,y+91,5,C.orange);
  }
  journey(x,y,size=110){const id=this.route.params.themeId||'ecology',im=this.view.images&&this.view.images[id];if(im){this.art(id,im,x,y,size,size*.82);return;}const ctx=this.ctx,k=size/150;ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.beginPath();ctx.moveTo(18,98);ctx.bezierCurveTo(108,83,43,58,119,37);ctx.strokeStyle=C.orange;ctx.lineWidth=13;ctx.lineCap='round';ctx.stroke();D.line(ctx,[[109,17],[109,45]],C.ink,3);ctx.beginPath();ctx.moveTo(109,18);ctx.lineTo(136,24);ctx.lineTo(109,33);ctx.closePath();ctx.fillStyle=C.orange;ctx.fill();D.circle(ctx,45,77,10,C.lake);D.circle(ctx,39,70,6,C.lake);D.circle(ctx,51,68,6,C.lake);D.circle(ctx,88,48,8,C.lake);D.circle(ctx,77,78,15,C.surface,C.lake);D.line(ctx,[[69,78],[75,84],[87,70]],C.lake,3);ctx.restore();}
  art(themeId, image, x, y, w, h) {
    const bounds=ART_BOUNDS[themeId];
    const crop=bounds&&image.width===bounds[4]&&image.height===bounds[5]?bounds:[0,0,image.width,image.height];
    const scale=Math.min(w/crop[2],h/crop[3]),dw=crop[2]*scale,dh=crop[3]*scale;
    const rect={themeId,x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};
    this.ctx.drawImage(image,crop[0],crop[1],crop[2],crop[3],rect.x,rect.y,rect.w,rect.h);
    return rect;
  }
  quietButton(id,label,x,y,w,action){
    const pressed=this.view.pressedId===id;
    if(pressed)D.rounded(this.ctx,x,y,w,52,12,C.lakeLight);
    D.text(this.ctx,label+'  ›',x+w/2,y+17,Math.max(15,12/this.v.scale),C.lake,500,'center');
    this.target(id,x,y,w,52,action);
  }
  home() {
    const ctx=this.ctx,t=this.t,b=this.v.bottom,compact=b-t<600;
    this.scrollKey='home';this.scroll=0;this.scrollMax=0;
    const heroH=compact?60:126,cardY=t+heroH+12,cardH=(b-126-cardY-12)/2;
    D.rounded(ctx,16,t-8,343,heroH,16,C.surface,C.line);
    D.text(ctx,this.view.localCampaign?'本地闯关试玩 · 非正式':'乡村知识挑战',30,t+3,Math.max(12,12/this.v.scale),C.lake,600);
    D.text(ctx,'趣味闯关',30,t+26,compact?24:32,C.ink,700);
    if(!compact){D.text(ctx,'沿着小路，发现家乡。',30,t+70,14,C.muted);D.text(ctx,'从哪个主题出发？',30,t+97,15,C.ink,600);}
    this.journey(compact?292:284,t+20,compact?46:62);
    const artBoxes=[],artRects=[];
    THEMES.forEach((theme,i)=>{
      const x=20+i%2*174,y=cardY+Math.floor(i/2)*(cardH+12),pressed=this.view.pressedId===`theme-${theme.id}`,yy=y+(pressed?2:0),im=this.view.images&&this.view.images[theme.id];
      D.rounded(ctx,x,yy+3,161,cardH,16,'rgba(38,61,52,.25)');D.rounded(ctx,x,yy,161,cardH,16,pressed?C.lakeLight:C.surface,C.line);
      const box={themeId:theme.id,x:x+13,y:yy+6,w:135,h:cardH-62};artBoxes.push(box);if(im)artRects.push(this.art(theme.id,im,box.x,box.y,box.w,box.h));
      D.text(ctx,theme.name,x+80.5,yy+cardH-50,18,C.ink,700,'center');
      const progress=this.view.themeProgress&&this.view.themeProgress[theme.id],caption=['红色故事','乡土人文','物产特色','生态风光'][i];D.text(ctx,`${caption} · ${progress?progress.completed:0}/4关`,x+80.5,yy+cardH-23,Math.max(12,12/this.v.scale),C.muted,400,'center');this.target(`theme-${theme.id}`,x,y,161,cardH,{type:'theme',themeId:theme.id});
    });
    D.rounded(ctx,16,b-117,343,123,16,C.surface,C.line);
    this.quietButton('ranking','排行榜 · 未开放',24,b-113,155,{type:'route',name:'ranking'});this.quietButton('certificates','证书 · 未开放',195,b-113,156,{type:'route',name:'certificates'});this.button('practice',this.view.localCampaign?this.view.localDestination.label:'试玩10题 · 不计正式积分',24,b-52,327,{type:'practice'},true);
    this.layout.home={compact,cardH,artBoxes,artRects};
  }
  map() {
    const ctx=this.ctx,t=this.t,theme=getTheme(this.route.params.themeId)||THEMES[3],baseY=t+104,availableH=this.v.bottom-baseY-76;
    const progress=this.view.themeProgress&&this.view.themeProgress[theme.id];
    const states=this.view.nodeStates||(progress&&progress.nodes)||['current','locked','locked','locked'];
    D.text(ctx,theme.id==='red'?'红色故事 / 十步芳草':'趣味闯关 / '+theme.name,24,t,13,theme.id==='red'?C.error:C.lake,600);
    D.text(ctx,theme.name,24,t+26,29,C.ink,700);
    D.text(ctx,this.view.visualFixture?'状态样例 · 非正式进度':`${this.view.localCampaign?'本地试玩':'正式进度'} ${progress?progress.completed:0} / 4关`,24,t+69,Math.max(14,12/this.v.scale),C.muted);
    const images=this.view.images||{},scene=images['map-'+theme.id]||(theme.id==='ecology'&&images.map);
    // One projection for the background, road, markers and their hit areas.
    const worldH=scene?335*scene.height/scene.width:502.5,h=Math.min(worldH,availableH),y=baseY+Math.max(0,(availableH-h)/2),frame={x:20,y,w:335,h};
    const sites=MAP_LAYOUTS[theme.id],pts=sites.map(site=>site.entry),focus=Math.max(0,states.indexOf('current'));
    const max=Math.max(0,worldH-h),key=`map-${theme.id}-${this.v.physicalWidth}-${this.v.physicalHeight}`;
    if(this.scrollKey!==key){this.scrollKey=key;const center=this.view.qualityRefinement&&focus>0?(pts[focus][1]+pts[focus-1][1])/2:pts[focus][1];this.scroll=Math.max(0,Math.min(max,worldH*center-(this.view.qualityRefinement?h/2:h-36)));}
    this.scrollMax=max;this.scroll=Math.max(0,Math.min(max,this.scroll||0));
    this.scrollRegion={...frame};
    D.text(ctx,max>0?'上下滑动查看四关':'10题全对，逐级解锁',351,t+69,Math.max(12,12/this.v.scale),C.lake,500,'right');
    D.rounded(ctx,20,y,335,h,16,C.lakeLight);
    ctx.save();D.rounded(ctx,20,y,335,h,16);ctx.clip();
    const originY=y-this.scroll;
    if(scene)ctx.drawImage(scene,20,originY,335,worldH);
    else{D.motif(ctx,theme.motif,302,originY+14,30);D.text(ctx,theme.id==='ecology'?'场景暂不可用':'场景画面待确认',36,originY+18,13,C.muted);}
    const coords=pts.map(([a,b])=>[20+335*a,originY+worldH*b]),nodes=[];
    ctx.beginPath();ctx.moveTo(...coords[0]);
    for(let i=1;i<4;i++){const a=coords[i-1],b=coords[i];ctx.bezierCurveTo(a[0],(a[1]+b[1])/2,b[0],(a[1]+b[1])/2,...b);}
    ctx.strokeStyle=C.paper;ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle=C.ink;ctx.lineWidth=1;ctx.setLineDash([2,6]);ctx.stroke();ctx.setLineDash([]);
    if(scene)sites.forEach((site,i)=>{
      const threshold=[20+335*site.threshold[0],originY+worldH*site.threshold[1]];
      D.line(ctx,[coords[i],threshold],C.paper,3);
      ctx.setLineDash([1,4]);D.line(ctx,[coords[i],threshold],C.ink,1);ctx.setLineDash([]);
    });
    getLevels(theme.id).forEach((level,i)=>{
      const [cx,cy]=coords[i],state=states[i]||'locked',pressed=this.view.pressedId===`level-${i+1}`;
      const complete=state==='complete',today=state==='today-locked',current=state==='current',offset=pressed?2:0;
      const fill=complete?C.lakeLight:current||today?C.orangeLight:C.surface,border=today?C.error:current||complete?C.lake:C.line;
      const left=sites[i].side?sites[i].side==='left':pts[i][0]>.5,labelX=left?cx-130:cx+26,labelY=cy+(sites[i].signY||-22)+offset;
      D.rounded(ctx,labelX,labelY,104,44,12,fill,border);
      if(current){D.circle(ctx,cx,cy+offset,22,C.orangeLight,C.lake);}
      D.circle(ctx,cx,cy+offset,18,complete?C.lake:today?C.error:C.surface,border);
      if(complete)D.line(ctx,[[cx-8,cy+offset],[cx-2,cy+6+offset],[cx+9,cy-7+offset]],C.surface,2);
      else if(today)D.text(ctx,'!',cx,cy-12+offset,24,C.surface,700,'center');
      else D.text(ctx,String(i+1),cx,cy-11+offset,21,current?C.lake:C.ink,600,'center');
      D.text(ctx,level.difficulty,labelX+10,labelY+5,15,C.ink,600);
      const label=today?'今日锁定':complete?'已通关':current?'当前关卡':`未解锁 · ${level.points}分`;
      D.text(ctx,state==='locked'?'未解锁':label,labelX+10,labelY+25,Math.max(12,12/this.v.scale),today?C.error:complete||current?C.lake:C.muted,500);
      if(state==='locked'){
        ctx.beginPath();ctx.arc(labelX+90,labelY+29,3,Math.PI,0);ctx.strokeStyle=C.line;ctx.lineWidth=1.5;ctx.stroke();D.rounded(ctx,labelX+85,labelY+29,10,7,2,C.line);
      }
      const hotX=Math.min(labelX-4,cx-24),hotY=Math.min(labelY-4,cy-26),hotRight=Math.max(labelX+108,cx+24),hotBottom=Math.max(labelY+48,cy+26);
      const hotRect={x:hotX,y:Math.max(hotY,y),w:hotRight-hotX,h:Math.min(hotBottom,y+h)-Math.max(hotY,y)};
      nodes.push({id:`level-${i+1}`,x:cx,y:cy,hotRect});
      if(hotRect.h*this.v.scale>=44)this.target(`level-${i+1}`,hotRect.x,hotRect.y,hotRect.w,hotRect.h,{type:'level',themeId:theme.id,index:i});
    });
    ctx.restore();
    if(max>0){const railH=h-32,thumb=Math.max(28,railH*h/worldH);D.rounded(ctx,349,y+16,3,railH,2,C.surface);D.rounded(ctx,349,y+16+(railH-thumb)*this.scroll/max,3,thumb,2,C.lake);}
    this.layout.map={frame,scene:{x:20,y:originY,w:335,h:worldH},nodes,scroll:this.scroll,scrollMax:max,scaleX:scene?335/scene.width:null,scaleY:scene?worldH/scene.height:null};
    this.button('back','返回',24,this.v.bottom-52,80,{type:'back'},true);
    const nextIndex=this.view.localCampaign?Math.min(3,progress.completed):0;
    this.button('begin',`查看第${nextIndex+1}关`,116,this.v.bottom-52,235,{type:'level',themeId:theme.id,index:nextIndex});
  }
  levelReady() {
    const ctx=this.ctx,t=this.t,b=this.v.bottom,theme=getTheme(this.route.params.themeId);
    const level=theme&&getLevels(theme.id).find(item=>item.id===this.route.params.levelId);
    if(!theme||!level){this.empty('quiz');return;}
    D.rounded(ctx,16,t-8,343,94,16,C.surface,C.line);
    D.text(ctx,theme.name+' / 关卡准备',24,t,13,C.lake,600);
    D.text(ctx,`${level.label} · ${level.difficulty}`,24,t+28,27,C.ink,700);
    D.text(ctx,theme.description,24,t+69,14,C.muted);
    const ecology=theme.id==='ecology'&&!this.view.localCampaign,top=t+99,bottom=b-(ecology?156:92),available=bottom-top;
    const key='ready-'+level.id;if(this.scrollKey!==key){this.scrollKey=key;this.scroll=0;}
    const rule='10题全部答对，才能解锁下一关。',ruleSize=Math.max(16,14/this.v.scale);
    ctx.save();ctx.globalAlpha=0;const ruleH=D.wrap(ctx,rule,40,0,295,ruleSize,C.ink);ctx.restore();
    const panelH=116+ruleH+16,heroH=Math.max(88,Math.min(300,available-panelH-16)),total=heroH+16+panelH;
    this.scrollMax=Math.max(0,total-available);this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    this.scrollRegion={x:20,y:top,w:335,h:available};
    const start=top+Math.max(0,Math.min(32,(available-total)/2))-this.scroll;
    ctx.save();ctx.beginPath();ctx.rect(20,top,335,available);ctx.clip();
    const hero={x:24,y:start,w:327,h:heroH},images=this.view.images||{};
    const scene=images['map-'+theme.id]||(theme.id==='ecology'&&images.map),site=MAP_LAYOUTS[theme.id][level.order-1];
    D.rounded(ctx,hero.x,hero.y,hero.w,hero.h,16,C.lakeLight);
    let source=null;
    if(scene){
      source=landmarkRegion(scene,site,hero.w,hero.h);
      ctx.save();D.rounded(ctx,hero.x,hero.y,hero.w,hero.h,16);ctx.clip();
      ctx.drawImage(scene,source.sx,source.sy,source.sw,source.sh,hero.x,hero.y,hero.w,hero.h);ctx.restore();
    } else if(images[theme.id]) this.art(theme.id,images[theme.id],48,start+12,279,heroH-24);
    else D.motif(ctx,theme.motif,160,start+(heroH-55)/2,55);
    const y=start+heroH+16;
    D.rounded(ctx,24,y,327,panelH,16,C.surface,C.line);
    D.text(ctx,String(level.questionCount)+'题',48,y+14,28,C.lake,700);D.text(ctx,'本关题目',48,y+51,13,C.muted);
    D.line(ctx,[[187,y+17],[187,y+69]],C.line,1);
    D.text(ctx,String(level.points)+'分',213,y+14,28,C.lake,700);D.text(ctx,this.view.localCampaign?'试玩积分 · 非正式':'通关积分',213,y+51,13,C.muted);
    D.line(ctx,[[40,y+83],[335,y+83]],C.line,1);
    D.text(ctx,'通关规则',40,y+96,13,C.lake,600);D.wrap(ctx,rule,40,y+116,295,ruleSize,C.ink);
    ctx.restore();
    const noticeY=b-(ecology?144:80);
    D.rounded(ctx,107,noticeY-3,161,26,12,C.surface,C.line);
    D.text(ctx,this.view.localCampaign?'仅保存本机试玩进度':'本关暂未开放',187.5,noticeY,Math.max(13,12/this.v.scale),C.muted,400,'center');
    this.layout.ready={hero,source,landmark:level.order-1,panel:{x:24,y,w:327,h:panelH},content:{top,bottom},noticeY,scrollMax:this.scrollMax};
    if(ecology)this.button('ready-practice','试玩10题 · 不计正式进度',24,b-116,327,{type:'practice'},true);
    this.button('back','返回地图',24,b-52,100,{type:'back'},true);
    this.button('ready-start',this.view.localCampaign?'开始本地试玩':'暂未开放',136,b-52,215,this.view.localCampaign?{type:'local-start',themeId:theme.id,order:level.order}:{type:'formal-start',themeId:theme.id,levelId:level.id},false,!this.view.localCampaign);
  }
  scrollBy(delta){this.scroll=Math.max(0,Math.min(this.scrollMax||0,(this.scroll||0)+delta));}
  balancedTitle(value,width,size) {
    const ctx=this.ctx;ctx.save();ctx.font=`600 ${size}px ${T.font}`;
    const chars=Array.from(String(value));let lines=[],row='';
    for(const ch of chars){if(row&&ctx.measureText(row+ch).width>width){lines.push(row);row=ch;}else row+=ch;}
    if(row)lines.push(row);let result=String(value);
    if(lines.length===2&&Array.from(lines[1]).length<5){
      const cues=['怎样','怎么','应该','适合','选择','观察','处理','丢','才能','需要','可以'];
      const choices=[];
      for(let i=5;i<=chars.length-5;i++){
        const left=chars.slice(0,i).join(''),right=chars.slice(i).join('');
        if(ctx.measureText(left).width>width||ctx.measureText(right).width>width||/^[，。！？；：、]/.test(right))continue;
        const phrase=cues.some(c=>right.startsWith(c));
        choices.push({value:left+'\n'+right,score:Math.abs(i-(chars.length-i))-(phrase?7:0)});
      }
      choices.sort((a,b)=>a.score-b.score);if(choices.length)result=choices[0].value;
    }
    ctx.restore();return result;
  }
  quiz() {
    const ctx=this.ctx,t=this.t,q=this.view.feedback?this.view.feedback.question:this.view.question;
    const feedback=this.view.feedback,submitting=this.view.submitting===true,totalQuestions=q.total||10;
    const key=q.id+(feedback?':feedback':':answer');const changed=this.scrollKey!==key;
    if(changed){this.scrollKey=key;this.scroll=0;}
    const small=Math.max(13,12/this.v.scale),optionSize=Math.max(16,14/this.v.scale),bodySize=Math.max(14,14/this.v.scale);
    D.rounded(ctx,16,t-8,343,73,16,C.surface,C.line);
    D.text(ctx,`${q.practice?'试玩 · ':''}${q.themeName} · 第${q.levelOrder}关`,28,t+3,16,C.ink,600);
    D.text(ctx,'本次试玩不限时',28,t+25,Math.max(12,12/this.v.scale),C.muted);
    // Practice only: no production countdown policy is inferred.
    D.text(ctx,`第${q.position} / ${totalQuestions}题`,24,t+40,14,C.muted);
    D.rounded(ctx,120,t+46,230,5,3,C.lakeLight);D.rounded(ctx,120,t+46,230*q.position/totalQuestions,5,3,C.lake);
    const top=t+76,bottom=this.v.bottom-98,region={x:20,y:top,w:335,h:bottom-top};this.scrollRegion=region;
    const measure=(value,width,size)=>{ctx.save();ctx.globalAlpha=0;const h=D.wrap(ctx,value,0,0,width,size);ctx.restore();return h;};
    const titleSize=this.v.bottom-this.t<600?22:24,titleValue=this.balancedTitle(q.title,307,titleSize),titleH=measure(titleValue,307,titleSize),heights=q.options.map(o=>Math.max(58,measure(o,258,optionSize)+26));
    const media=q.media&&q.media.type==='image',caption=media?(q.media.caption||'题目配图'):null;
    const gap=media||this.v.bottom-this.t<600?8:12,titleGap=media?20:18;
    const captionH=media?measure(caption,311,small):0;
    const baseHeight=31+titleH+titleGap+heights.reduce((a,b)=>a+b,0)+4*gap+8+captionH+18;
    const mediaH=Math.max(120,Math.min(150,region.h-baseHeight)),mediaTotal=media?mediaH+captionH+18:0;
    const explanation=feedback&&(feedback.explanation||'继续下一题，发现更多生态知识。');
    const feedbackH=feedback?measure(explanation,295,bodySize)+55:0;
    const total=31+titleH+titleGap+mediaTotal+heights.reduce((a,b)=>a+b,0)+4*gap+feedbackH+8;
    // Keep ordinary text question context visible while its answers scroll.
    const pinnedTitle=!media && titleH+31+titleGap<=region.h*.48;
    const pinnedH=pinnedTitle?31+titleH+titleGap:0;
    if(pinnedTitle){region.y+=pinnedH;region.h-=pinnedH;}
    this.scrollMax=Math.max(0,total-pinnedH-region.h-8);
    if(changed&&feedback)this.scroll=this.scrollMax;
    this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    if(!pinnedTitle){ctx.save();ctx.beginPath();ctx.rect(20,top,335,region.h);ctx.clip();}
    let y=pinnedTitle?top:top-this.scroll;
    const difficulty=q.difficultyLabel||({基础:'基础认知',进阶:'进阶理解',综合:'综合挑战'}[q.difficulty])||'知识答题';
    D.rounded(ctx,20,y,335,titleH+31+titleGap-12,16,C.surface,C.line);
    D.text(ctx,difficulty,34,y+9,small,C.lake,600);y+=31;
    const titleRect={x:34,y,w:307,h:titleH};D.wrap(ctx,titleValue,34,y,307,titleSize,C.ink,600);y+=titleH+titleGap;
    if(pinnedTitle){ctx.save();ctx.beginPath();ctx.rect(20,region.y,335,region.h);ctx.clip();y=region.y-this.scroll;}
    let mediaRect=null,feedbackRect=null;const optionRects=[];
    if(media){
      mediaRect={x:24,y,w:327,h:mediaH};D.rounded(ctx,24,y,327,mediaH,16,C.surface,C.line);
      const im=this.view.mediaImage;
      if(im){const scale=Math.min(303/im.width,(mediaH-16)/im.height),w=im.width*scale,h=im.height*scale;ctx.drawImage(im,24+(327-w)/2,y+(mediaH-h)/2,w,h);mediaRect.image={w,h,sourceW:im.width,sourceH:im.height};}
      else{
        D.text(ctx,this.view.mediaFailed?'题目图片加载失败':'图片加载中…',40,y+35,bodySize,C.ink);
        if(!this.view.mediaFailed){const angle=(this.view.time||0)/300;D.circle(ctx,306+Math.cos(angle)*6,y+44+Math.sin(angle)*6,3,C.lake);}
        else {D.text(ctx,'点击重新加载',40,y+86,optionSize,C.lake,600);const hitY=Math.max(y,top),hitBottom=Math.min(y+mediaH,bottom);if(hitBottom-hitY>=44/this.v.scale)this.target('media-retry',24,hitY,327,hitBottom-hitY,{type:'retry-media'});}
      }
      D.rounded(ctx,24,y+mediaH+3,327,captionH+10,8,C.surface);D.wrap(ctx,caption,32,y+mediaH+8,311,small,C.muted);y+=mediaTotal;
    }
    q.options.forEach((option,i)=>{
      const selected=(this.view.modal==='revive'?this.view.incorrectSelected:feedback?feedback.selected:this.view.selected)===i;
      const wrong=this.view.modal==='revive'&&selected,right=feedback&&selected,pressed=this.view.pressedId===`option-${i}`;
      const h=heights[i],yy=y+(pressed?2:0),border=wrong?C.error:selected?C.lake:C.line;
      D.rounded(ctx,24,yy+2,327,h,12,'rgba(38,61,52,.2)');
      D.rounded(ctx,24,yy,327,h,12,wrong||selected&&!right?C.orangeLight:right||pressed?C.lakeLight:C.surface,border);
      D.circle(ctx,47,yy+26,14,wrong?C.error:right?C.lake:C.paper,selected?border:null);
      D.text(ctx,wrong?'×':right?'✓':'ABCD'[i],47,yy+17,14,wrong||right?C.surface:C.ink,600,'center');
      D.wrap(ctx,option,71,yy+13,258,optionSize,C.ink,selected?600:400);
      const hitY=Math.max(y,region.y),hitBottom=Math.min(y+h,bottom);
      if(hitBottom-hitY>=44/this.v.scale)this.target(`option-${i}`,24,hitY,327,hitBottom-hitY,{type:'option',index:i,questionId:q.id},!!feedback||submitting||this.view.modal==='revive');
      optionRects.push({index:i,x:24,y,w:327,h,selected:!!selected,state:wrong?'wrong':right?'correct':selected?'selected':pressed?'pressed':'idle'});y+=h+gap;
    });
    if(feedback){feedbackRect={x:24,y,w:327,h:feedbackH};D.rounded(ctx,24,y,327,feedbackH,12,C.lakeLight,C.lake);D.text(ctx,'答对了 · 知识解析',40,y+12,optionSize,C.lake,600);D.wrap(ctx,explanation,40,y+41,295,bodySize,C.ink);}
    ctx.restore();
    if(this.scrollMax>0){const railH=region.h-16,thumb=Math.max(24,railH*region.h/total);D.rounded(ctx,352,region.y+8,3,railH,2,C.lakeLight);D.rounded(ctx,352,region.y+8+(railH-thumb)*this.scroll/this.scrollMax,3,thumb,2,C.lake);}
    D.rounded(ctx,16,this.v.bottom-96,343,104,16,C.surface,C.line);
    const hint=submitting?'正在提交，请稍候':feedback?'答对了，查看解析后继续':this.scrollMax>this.scroll+2?'上下滑动查看全部选项':'选好一项，再确认答案';
    D.text(ctx,hint,187.5,this.v.bottom-83,bodySize,C.muted,400,'center');
    this.button('quiz-exit','退出',24,this.v.bottom-52,80,{type:'exit-request'},true);
    this.button('confirm',submitting?'正在提交…':feedback?'下一题':'确认答案',116,this.v.bottom-52,235,{type:feedback?'continue':'confirm',questionId:q.id},false,submitting||!feedback&&this.view.selected==null);
    this.layout.quiz={kind:media?'image-choice':'text-choice',difficulty,total:totalQuestions,position:q.position,pinnedTitle,region,title:titleRect,media:mediaRect,options:optionRects,feedback:feedbackRect,contentHeight:total,scroll:this.scroll,scrollMax:this.scrollMax,submitting};
  }
  revive() {
    const ctx=this.ctx,size=Math.max(14,14/this.v.scale),x=28,w=319,inner=w-40;
    const selected=this.view.incorrectSelected,choice=Number.isInteger(selected)?`你选择了 ${'ABCD'[selected]}，本题未通过。`:'本题未通过。';
    const lines=[choice,'本次试玩结束。分享复活暂未开放，你可以返回地图，再次试玩。','正式关卡规则：分享成功后可重答当前题，每关仅1次；复活后再错，仅当前关卡今日锁定。'];
    const measure=value=>{ctx.save();ctx.globalAlpha=0;const h=D.wrap(ctx,value,0,0,inner,size);ctx.restore();return h;};
    const heights=lines.map(measure),h=76+heights.reduce((a,b)=>a+b,0)+36+128;
    const y=Math.max(this.t,(this.t+this.v.bottom-h)/2);
    ctx.fillStyle='rgba(32,61,67,.5)';ctx.fillRect(0,0,375,this.v.height);D.rounded(ctx,x,y,w,h,16,C.surface,C.ink);
    D.text(ctx,'本题答错了',x+20,y+22,26,C.error,700);
    let rowY=y+68;lines.forEach((line,i)=>{D.wrap(ctx,line,x+20,rowY,inner,size,i===0?C.error:i===2?C.ink:C.muted,i===0?600:400);rowY+=heights[i]+12;});
    this.targets=[];this.scrollRegion=null;
    this.button('revive-share','分享暂未开放',x+20,y+h-128,inner,{type:'share'},true,true);
    this.button('revive-back','返回关卡地图',x+20,y+h-64,inner,{type:'back'});
    this.layout.revive={x,y,w,h,selected,answerRevealed:false};
  }
  exitDialog() {
    const ctx=this.ctx,x=28,w=319,h=246,y=Math.max(this.t,(this.t+this.v.bottom-h)/2);
    ctx.fillStyle='rgba(32,61,67,.5)';ctx.fillRect(0,0,375,this.v.height);
    D.rounded(ctx,x,y,w,h,16,C.surface,C.ink);D.text(ctx,'要退出本次试玩吗？',x+20,y+22,24,C.ink,700);
    D.wrap(ctx,'退出后，这次作答不会保留。正式进度和积分不受影响。',x+20,y+66,279,Math.max(14,14/this.v.scale),C.muted);
    this.targets=[];this.scrollRegion=null;
    this.button('exit-cancel','继续作答',x+20,y+h-116,279,{type:'exit-cancel'});
    this.button('exit-confirm','退出到地图',x+20,y+h-56,279,{type:'exit-confirm'},true);
    this.layout.exit={x,y,w,h};
  }
  locked(){const ctx=this.ctx,t=this.t;D.rounded(ctx,16,t-8,343,this.v.bottom-t-64,16,C.surface,C.line);D.text(ctx,'试玩 · 青山绿水 / 第1关',24,t,16,C.lake,600);D.text(ctx,'当前试玩关卡已锁定',187.5,t+160,26,C.ink,700,'center');D.text(ctx,'复活后再次答错，不能继续本次挑战。',187.5,t+213,15,C.muted,400,'center');D.text(ctx,'仅影响当前关卡，其他主题不受影响。',187.5,t+250,15,C.ink,400,'center');this.button('locked-back','返回关卡地图',24,this.v.bottom-52,327,{type:'back'},true);}
  result() {
    if(this.view.localCampaign&&this.view.qualityRefinement)return this.localResult();
    const ctx=this.ctx,t=this.t,result=this.view.result,local=this.view.localCampaign,completion=this.view.localCompletion;
    D.rounded(ctx,16,t-8,343,Math.min(this.v.bottom-t-140,this.v.bottom-t<600?this.v.bottom-t-140:520),16,C.surface,C.line);
    D.text(ctx,`${result.themeName} · 第${result.levelOrder}关`,24,t,18,C.muted,500);
    const compact=this.v.bottom-t<600,cy=t+(compact?76:126);this.journey(112,cy-60,150);
    D.text(ctx,local?'本地试玩通关':result.practice?'十题试玩完成':`第${result.levelOrder}关通关`,187.5,cy+(compact?64:92),32,C.ink,700,'center');
    D.text(ctx,local?(result.levelOrder===4?'主题四关完成 · 不发正式证书':'10题全部答对 · 本地下一关已解锁'):result.practice?'10题全部答对 · 不计正式积分':'10题全部完成，下一关已解锁',187.5,cy+(compact?108:140),15,C.muted,400,'center');
    const y=cy+(compact?144:191);D.rounded(ctx,24,y,327,compact?95:103,16,C.surface,C.line);
    D.text(ctx,local?'本次试玩积分':result.practice?'答对题数':'本关积分',104,y+18,14,C.muted,400,'center');D.text(ctx,local?'累计试玩积分':result.practice?'作答次数':'本次正确率',273,y+18,14,C.muted,400,'center');
    D.text(ctx,local?`+${completion?.earned||0}`:result.practice?String(result.correct):result.points==null?'—':`+${result.points}`,104,y+47,32,C.ink,700,'center');D.text(ctx,local?String(this.view.localTotal):result.practice?String(result.attempts):result.accuracyPercent==null?'—':`${result.accuracyPercent}%`,273,y+47,32,C.ink,700,'center');
    D.text(ctx,local?(this.view.localStorageStatus==='saving'?'保存中，请稍候…':this.view.localStorageStatus==='session-only'?'仅本次会话有效 · 不会保存':this.view.localStorageStatus==='needs-confirmation'?'存档需要确认 · 尚未保存':this.view.localStorageStatus==='unsaved'?'存档失败 · 本次仅临时保留':completion?.replay?'重玩不重复累计试玩积分':'本机已存档 · 不同步正式账号'):result.practice?'正式进度与积分不受试玩影响':`继续前往第${result.levelOrder+1}关 · ${result.nextDifficulty}`,187.5,y+(compact?110:128),15,C.lake,600,'center');
    this.button('next',local?'查看闯关地图':result.practice?'返回关卡地图':'进入下一关',24,this.v.bottom-112,327,{type:'next'});
    this.button('replay','重玩',24,this.v.bottom-52,155,{type:'replay'},true);if(local&&this.view.localStorageStatus==='unsaved')this.button('save-retry','重试存档',195,this.v.bottom-52,156,{type:'save-retry'},true);else this.button('share-result','分享 · 未开放',195,this.v.bottom-52,156,{type:'share'},true,true);
  }
  localResult(){
    const ctx=this.ctx,b=this.v.bottom,r=this.view.result,c=this.view.localCompletion,status=this.view.localStorageStatus,compact=b-this.t<600,saving=status==='saving',failed=status==='unsaved',unsupported=status==='session-only';
    const titleOffset=compact?56:151,totalH=titleOffset+92+(failed?243:183)+112,t=this.t+Math.max(0,(b-this.t-totalH)/2),titleY=t+titleOffset,y=titleY+92,buttonY=y+(failed?243:183);
    D.rounded(ctx,16,t-8,343,buttonY-t-12,16,C.surface,C.line);
    D.text(ctx,`${r.themeName} · 第${r.levelOrder}关`,32,t+10,16,C.muted,600);
    this.journey(compact?263:130,t+(compact?43:43),compact?78:115);
    D.text(ctx,'本地试玩通关',compact?32:187.5,titleY,compact?27:30,C.ink,700,compact?'left':'center');
    const subtitle=r.levelOrder<4?`10题全部答对 · 第${r.levelOrder+1}关已解锁`:'四关全部完成 · 可返回主题地图';
    D.text(ctx,subtitle,compact?32:187.5,titleY+47,15,C.lake,600,compact?'left':'center');
    D.rounded(ctx,32,y,311,94,12,C.paper,C.line);
    D.text(ctx,'本次试玩积分',104,y+15,14,C.muted,400,'center');D.text(ctx,'累计试玩积分',273,y+15,14,C.muted,400,'center');
    D.text(ctx,`+${c?.earned||0}`,104,y+41,31,C.ink,700,'center');D.text(ctx,String(this.view.localTotal),273,y+41,31,C.ink,700,'center');
    const label=saving?'保存中…':failed?'未保存 · 本次临时保留':unsupported?'会话进度 · 刷新后不保留':status==='needs-confirmation'?'存档需确认 · 尚未保存':'已保存到当前浏览器';
    D.text(ctx,label,32,y+110,15,failed?C.error:C.lake,600);
    D.text(ctx,c?.replay?'重玩不重复累计积分':'仅本地试玩，不同步正式账号',32,y+139,13,C.muted);
    if(failed)this.button('save-retry','重试存档',32,y+167,311,{type:'save-retry'},true);
    this.button('next',r.levelOrder<4?`查看第${r.levelOrder+1}关`:'返回主题地图',24,buttonY,327,{type:'next'},false,saving);
    this.button('replay','重玩',24,buttonY+60,155,{type:'replay'},true,saving);this.button('home','返回首页',195,buttonY+60,156,{type:'home'},true);
    this.layout.localResult={compact,saveStatus:status,contentBottom:y+(failed?219:163),footerTop:buttonY};
  }
  empty(name) {
    const ctx=this.ctx,t=this.t,copy={quiz:['题目准备中','本关暂未开放，请稍后再来。'],ranking:['排行榜','榜单暂未开放，请稍后再来。'],certificates:['我的证书','完成一个主题的4关，获得主题证书。'],error:['暂时无法打开','请返回主题页，再试一次。']}[name]||['趣味闯关','请选择一个主题开始。'];
    D.text(ctx,copy[0],24,t,29,C.ink,700);
    const bookArt=this.view.images&&this.view.images.culture;
    if(name==='certificates'&&bookArt)this.art('culture',bookArt,142,t+130,105,80);
    else D.motif(ctx,name==='certificates'?'book':'water',157,t+150,60);
    D.wrap(ctx,copy[1],35,t+246,305,18,C.muted);
    if(name==='certificates') D.text(ctx,'证书暂未开放；试玩不发证。',35,t+212,Math.max(14,12/this.v.scale),C.lake,600);
    if(name==='certificates') D.wrap(ctx,'完成四主题16关，获得“乡村知识闯关王”总证书。',35,t+309,305,16,C.muted);
    this.button('empty-back','返回',24,this.v.bottom-52,327,{type:'back'},true);
  }
}

module.exports = { Renderer };
