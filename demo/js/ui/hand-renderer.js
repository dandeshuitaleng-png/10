const {OnlineRenderer} = require('./online-renderer');
const D = require('./draw');
const T = require('./tokens');
const {learningProgress} = require('../data/learning-progress');
const C = T.colors;
const S = T.hand;

const HAND_ART = Object.freeze({
  'hand-home': 'images/handdrawn-v4/courtyard.png',
  ...Object.fromEntries(['points','rank','back','clock','selected','check','cross'].map(name => ['hand-'+name, 'images/handdrawn-v4/icons/'+name+'.png'])),
  ...Object.fromEntries(['village','book','field','water','partial','complete'].map(name => ['hand-theme-'+name, 'images/handdrawn-v41/icons/'+name+'.png']))
});

// The approved two-page design uses physical pixels. The existing input and
// viewport coordinate system stays unchanged, including WeChat native safe areas.
class HandRenderer extends OnlineRenderer {
  px(value) { return value / this.v.scale; }
  inset() { return this.px(S.inset); }
  width() { return this.v.width - 2*this.inset(); }
  bottom() { return Math.min(this.v.bottom, this.v.height-this.px(50)); }
  navTop() { return Math.max(this.px(44), this.v.top-this.px(16)); }
  modern() { return ['home','quiz','themes','points'].includes(this.route.name) && this.view.challengeState!=='locked' && (!this.modalActive||this.drawingHandModal); }
  label(value,x,y,size=16,color=C.ink,weight=400,align='left') { D.text(this.ctx,value,x,y,this.px(size),color,weight,align); }
  lines(value,x,y,width,size=16,color=C.ink,weight=400) { return D.wrap(this.ctx,value,x,y,width,this.px(size),color,weight); }
  box(x,y,w,h,r,fill,stroke,strokeWidth=1.2) {
    D.rounded(this.ctx,x,y,w,h,this.px(r),fill);
    if(stroke){this.ctx.strokeStyle=stroke;this.ctx.lineWidth=this.px(strokeWidth);this.ctx.stroke();}
  }
  icon(name,x,y,size=24) {
    const image=this.view.images?.['hand-'+name];
    if(image)this.ctx.drawImage(image,x,y,this.px(size),this.px(size));
    return !!image;
  }
  sceneBackdrop(name) {
    if(['home','quiz','themes','points'].includes(name)){
      const background=this.view.catalog?.config?.background;
      this.ctx.fillStyle=background && !['#F5F9F7','#f5f9f7'].includes(background) ? background : C.surface;
      this.ctx.fillRect(0,0,this.v.width,this.v.height);
      this.layout.backdrop={source:'plain-surface',decorative:false};
    } else super.sceneBackdrop(name);
  }
  heading(value,x,y,size=30,align='left',maxWidth=313) {
    if(!this.modern())return super.heading(value,x,y,size,align,maxWidth);
    this.label(this.fit(value,maxWidth,this.px(size),700),x,y,size,C.ink,700,align);
  }
  button(id,label,x,y,w,action,secondary=false,disabled=false) {
    if(!this.modern())return super.button(id,label,x,y,w,action,secondary,disabled);
    if(id==='close-video'){x=this.inset();y=this.bottom()-this.px(52);w=this.width();}
    const h=this.px(S.buttonHeight),blocked=disabled||!!this.view.submitting||!!this.view.loadingRemote&&!this.view.connectionError;
    const pressed=this.view.pressedId===id&&!blocked,yy=y+this.px(pressed?2:0);
    if(!blocked&&!pressed&&!secondary)this.box(x,yy+this.px(2),w,h,14,'rgba(38,61,52,.25)');
    this.box(x,yy,w,h,S.buttonRadius,blocked?C.paper:secondary?C.surface:C.lake,secondary&&!blocked?C.line:null,1);
    this.label(this.fit(label,w-this.px(32),this.px(16),500),x+w/2,yy+this.px(16),16,blocked?C.muted:secondary?C.muted:C.surface,500,'center');
    this.target(id,x,y,w,h,action,blocked,label);
  }
  beginContent(key,top,bottom,total) {
    if(!this.modern())return super.beginContent(key,top,bottom,total);
    const region={x:this.inset(),y:top,w:this.width(),h:Math.max(this.px(24),bottom-top)};
    if(this.scrollKey!==key){this.scrollKey=key;this.scroll=0;}
    const excess=total-region.h;this.scrollMax=excess*this.v.scale>.5?excess:0;this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    this.scrollRegion=region;this.clipRegion=region;
    this.ctx.save();this.ctx.beginPath();this.ctx.rect(region.x,region.y,region.w,region.h);this.ctx.clip();
    return top-this.scroll;
  }
  endContent(total) {
    if(!this.modern())return super.endContent(total);
    this.ctx.restore();this.clipRegion=null;
    if(this.scrollMax>0){const r=this.scrollRegion,rail=r.h-this.px(16),thumb=Math.max(this.px(24),rail*r.h/total);
      this.box(r.x+r.w-this.px(3),r.y+this.px(8),this.px(3),rail,2,C.paper);
      this.box(r.x+r.w-this.px(3),r.y+this.px(8)+(rail-thumb)*this.scroll/this.scrollMax,this.px(3),thumb,2,C.line);
    }
  }
  backControl(id='back',action={type:'back'}) {
    const x=this.inset(),y=Math.max(this.v.top,this.navTop()),size=this.px(44);
    this.icon('back',x+this.px(10),y+this.px(10));
    this.target(id,x,y,size,size,action,!!this.view.submitting,'返回');
    return {x,y,w:size,h:size};
  }
  courtyard(image,rect) {
    const ctx=this.ctx,p=n=>this.px(n),{x,y,w,h}=rect;
    // Editable interface washes sit around the unchanged original image.
    const wash=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.max(w,h)/2+p(16));
    wash.addColorStop(0,'rgba(220,233,223,.2)');wash.addColorStop(1,'rgba(220,233,223,0)');
    ctx.fillStyle=wash;ctx.fillRect(x-p(8),y-p(16),w+p(16),h+p(32));
    ctx.drawImage(image,x,y,w,h);
    const edge=Math.min(p(12),h/4,w/4);
    [[x,y,x,y+edge,x,y,w,edge], [x,y+h,x,y+h-edge,x,y+h-edge,w,edge],
     [x,y,x+edge,y,x,y,edge,h], [x+w,y,x+w-edge,y,x+w-edge,y,edge,h]].forEach(([x0,y0,x1,y1,xx,yy,ww,hh])=>{
      const fade=ctx.createLinearGradient(x0,y0,x1,y1);fade.addColorStop(0,C.surface);fade.addColorStop(1,'rgba(255,252,240,0)');
      ctx.fillStyle=fade;ctx.fillRect(xx,yy,ww,hh);
    });
  }
  themeMarker(theme,x,y) {
    const p=n=>this.px(n),ctx=this.ctx;
    ctx.save();if(['idle','empty'].includes(theme.state))ctx.globalAlpha*=.68;
    this.icon('theme-'+this.motif(theme),x,y,S.iconSize);ctx.restore();
    if(['partial','complete'].includes(theme.state)){
      this.box(x+p(12),y+p(12),p(12),p(12),6,C.surface);
      this.icon('theme-'+theme.state,x+p(theme.state==='partial'?15:12),y+p(theme.state==='partial'?15:12),theme.state==='partial'?6:12);
    }
  }
  home() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),ctx=this.ctx,summary=learningProgress(this.view.catalog,this.view.themeProgress);
    const compact=this.v.physicalHeight<700,top=this.navTop()+p(compact?52:68),introH=p(90);
    const counterSize=summary.total?16:14;ctx.font=`400 ${p(counterSize)}px ${T.font}`;
    const inlineMarkers=compact&&summary.themes.length>0&&summary.themes.length<=4&&ctx.measureText(summary.label).width+p(8+summary.themes.length*32-8)<=w;
    const columns=Math.max(1,Math.floor((w+p(8))/p(32))),rows=inlineMarkers?0:Math.ceil(summary.themes.length/columns);
    const progressH=p(40+rows*32),maxButton=this.bottom()-p(52+24+48+40);
    const imageH=compact?Math.min(w*2/3,Math.max(p(80),maxButton-p(24)-top-introH-p(16)-progressH)):w*2/3;
    const total=introH+imageH+p(16)+progressH,naturalButton=top+total+p(24),buttonY=Math.min(naturalButton,maxButton);
    let y=this.beginContent('hand-home',top,buttonY-p(24),total);
    this.heading(this.view.catalog?.config?.name||'趣味闯关',x,y,30,'left',w);this.label('沿着小路，发现家乡',x,y+p(50),16,C.muted);
    y+=introH;
    const image=this.view.configuredImages?.cover||this.view.images?.['hand-home'];
    let artRect={x,y,w,h:imageH};
    if(image){const ratio=Math.min(w/image.width,imageH/image.height),dw=image.width*ratio,dh=image.height*ratio;artRect={x:x+(w-dw)/2,y:y+(imageH-dh)/2,w:dw,h:dh};this.courtyard(image,artRect);}
    else {this.box(x,y,w,imageH,12,C.paper);this.label('小院插画'+(this.view.loadingRemote?'加载中…':'暂未加载'),x+w/2,y+imageH/2,14,C.muted,400,'center');}
    y+=imageH+p(16);
    this.label(summary.label,x,y,counterSize,C.ink,400);
    if(summary.total&&!inlineMarkers){ctx.font=`400 ${p(16)}px ${T.font}`;if(ctx.measureText(summary.label).width+p(104)<=w)this.label('我的进度  ›',x+w,y,14,C.muted,400,'right');}
    this.box(x,y+p(32),w,p(8),4,C.paper);
    if(summary.completed&&summary.total)this.box(x,y+p(32),w*summary.completed/summary.total,p(8),4,C.orange);
    const markers=summary.themes.map((theme,index)=>{
      const xx=inlineMarkers?x+w-p(summary.themes.length*32-8)+p(index*32):x+p(index%columns*32);
      const yy=inlineMarkers?y:y+p(48+Math.floor(index/columns)*32);
      this.themeMarker(theme,xx,yy);return {id:theme.id,motif:this.motif(theme),state:theme.state,completed:theme.completed,total:theme.total,x:xx,y:yy,w:p(24),h:p(24),ariaLabel:theme.ariaLabel};
    });
    this.target('home-progress',x,y-p(4),w,progressH+p(4),{type:'route',name:'themes'},!summary.ready,summary.ariaLabel);
    this.endContent(total);
    this.button('practice',this.view.hasActiveChallenge?this.view.continueLabel||'继续本次挑战':'开始闯关',x,buttonY,w,{type:'practice',chooseTheme:true},false,!summary.total&&!this.view.hasActiveChallenge);
    const secondaryY=buttonY+p(76),half=(w-p(16))/2;
    [['points','我的积分','points'],['rank','排行榜','ranking']].forEach(([icon,label,route],index)=>{
      const xx=x+index*(half+p(16));
      this.box(xx,secondaryY+p(4),p(40),p(40),12,C.paper);
      this.icon(icon,xx+p(8),secondaryY+p(12));this.label(label,xx+p(48),secondaryY+p(14),16,C.ink,500);
      this.target('home-'+route,xx,secondaryY,half,p(48),{type:'route',name:route},false,label);
    });
    if(this.bottom()-secondaryY-p(48)>=p(32))this.label('湖南数字农家书屋',this.v.width/2,this.bottom()-p(18),14,C.muted,400,'center');
    this.layout.home={ready:summary.ready,themes:summary.themes.map(theme=>theme.id),completed:summary.completed,total:summary.total,markers,inlineMarkers,progress:{x,y,w,h:progressH,label:summary.label,ariaLabel:summary.ariaLabel},art:artRect,primary:{x,y:buttonY,w,h:p(52)},scroll:this.scroll,scrollMax:this.scrollMax};
  }
  balancedTitle(value,width,size) {
    // Balance short two-line Chinese questions without changing the question bank.
    const ctx=this.ctx,text=String(value);if(text.includes('\n'))return text;
    ctx.save();ctx.font=`500 ${size}px ${T.font}`;
    const chars=Array.from(text),length=chars.length,choices=[];
    if(ctx.measureText(text).width>width&&ctx.measureText(text).width<=width*2){
      for(let i=5;i<=length-5;i++){
        const left=chars.slice(0,i).join(''),right=chars.slice(i).join('');
        if(ctx.measureText(left).width>width||ctx.measureText(right).width>width||/^[，。！？；：、]/.test(right))continue;
        choices.push({value:left+'\n'+right,score:Math.abs(ctx.measureText(left).width-ctx.measureText(right).width)});
      }
    }
    ctx.restore();choices.sort((a,b)=>a.score-b.score);return choices[0]?.value||text;
  }
  quiz() {
    const q=this.view.feedback?.question||this.view.question;
    if(!q)return this.empty('quiz');
    const x=this.inset(),w=this.width(),p=n=>this.px(n),ctx=this.ctx,feedback=this.view.feedback;
    const submitting=!!this.view.submitting,revive=this.view.modal==='revive',primaryY=this.bottom()-p(62);
    this.backControl('quiz-exit',{type:'exit-request'});
    const headerTop=this.navTop()+p(60),titleSize=p(20),optionSize=p(16),totalQuestions=q.total||1;
    this.label(this.fit(q.themeName+' · '+(q.levelName||'第'+q.levelOrder+'关'),w,p(16),500),x,headerTop,16,C.ink,500);
    this.box(x,headerTop+p(32),w,p(8),4,C.paper);this.box(x,headerTop+p(32),w*Math.min(1,q.position/totalQuestions),p(8),4,C.orange);
    this.label('第 '+q.position+' / '+totalQuestions+' 题',x,headerTop+p(48),14,C.muted);
    const seconds=Math.max(0,Math.ceil(this.view.remainingSeconds??this.seconds())),urgent=!feedback&&!revive&&seconds<=5;
    this.icon('clock',x+w-p(80),headerTop+p(48),20);
    this.label(feedback?'已作答':String(seconds).padStart(2,'0')+' 秒',x+w,headerTop+p(48),14,urgent?C.error:C.muted,urgent?600:400,'right');
    const timer={seconds,urgent,active:!feedback&&!revive,total:this.seconds()};
    const title=this.balancedTitle(q.title,w,titleSize),titleH=this.measure(title,w,titleSize,500);
    const media=q.media&&['image','video'].includes(q.media.type),video=media&&q.media.type==='video',mediaH=p(144);
    const caption=media&&q.media.caption,captionH=caption?this.measure(caption,w,p(14))+p(8):0;
    const textW=w-p(104);
    const h=Math.max(p(S.optionHeight),Math.ceil((Math.max(...q.options.map(o=>this.measure(o,textW,optionSize)),0)+p(24))/p(8))*p(8));
    const explanation=feedback?.explanation||'继续下一题，认识更多家乡知识。';
    const explanationH=feedback?this.measure(explanation,w,p(16)):0;
    // Long explanations join the scrollable reading area; the action stays fixed.
    const inlineExplanation=feedback&&(explanationH>p(72)||this.v.physicalHeight<650);
    const footerTop=primaryY-p(feedback&&!inlineExplanation?112:24);
    const bodyTop=headerTop+p(96),bodyBottom=footerTop-p(16);
    const total=titleH+p(S.readingGap)+(media?mediaH+captionH+p(S.readingGap):0)+q.options.length*h+Math.max(0,q.options.length-1)*p(8)+(inlineExplanation?explanationH+p(88):0)+p(8);
    let y=this.beginContent('hand-quiz-'+q.id+'-'+(feedback?'feedback':'answer'),bodyTop,bodyBottom,total);
    const titleRect={x,y,w,h:titleH};this.lines(title,x,y,w,20,C.ink,500);y+=titleH+p(S.readingGap);
    let mediaRect=null;
    if(media){mediaRect={x,y,w,h:mediaH};this.box(x,y,w,mediaH,12,C.paper);
      if(video){
        this.label('▷  播放题目视频',x+w/2,y+p(48),16,C.lake,600,'center');
        this.label('观看时倒计时继续',x+w/2,y+p(80),14,C.muted,400,'center');
        this.target('play-video',x,y,w,mediaH,{type:'play-video',src:q.media.src,url:q.media.url},submitting,'播放题目视频，观看时倒计时继续');
      } else if(this.view.mediaImage){
        const image=this.view.mediaImage,ratio=Math.min(w/image.width,mediaH/image.height),dw=image.width*ratio,dh=image.height*ratio;
        ctx.save();D.rounded(ctx,x,y,w,mediaH,p(12));ctx.clip();ctx.drawImage(image,x+(w-dw)/2,y+(mediaH-dh)/2,dw,dh);ctx.restore();
        mediaRect.image={w:dw,h:dh,sourceW:image.width,sourceH:image.height};
      } else {
        this.label(this.view.mediaFailed?'图片未能加载，点击重试':'图片加载中…',x+w/2,y+p(60),14,C.muted,400,'center');
        if(this.view.mediaFailed)this.target('media-retry',x,y,w,mediaH,{type:'retry-media'},submitting,'重新加载题目图片');
      }
      if(caption)this.lines(caption,x,y+mediaH+p(8),w,14,C.muted);
      y+=mediaH+captionH+p(S.readingGap);
    }
    const optionRects=[];
    q.options.forEach((option,index)=>{
      const selected=(revive?this.view.incorrectSelected:feedback?feedback.selected:this.view.selected)===index;
      const correct=!!feedback&&(Number.isInteger(feedback.answer)?feedback.answer===index:feedback.right!==false&&selected);
      const wrong=selected&&(revive||feedback?.right===false),state=correct?'correct':wrong?'wrong':selected?'selected':'idle';
      const yy=y+p(this.view.pressedId==='option-'+index&&!feedback?2:0),letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ',letter=letters[index]||String(index+1);
      this.box(x,yy,w,h,S.optionRadius,wrong?C.orangeLight:selected||correct?C.lakeLight:C.surface,wrong?C.error:selected||correct?C.lake:C.lineSoft,state==='idle'?S.optionStroke:S.activeStroke);
      this.box(x+p(16),yy+(h-p(24))/2,p(24),p(24),6,selected||correct?C.surface:C.paper);
      this.label(letter,x+p(28),yy+(h-p(14))/2,14,C.ink,500,'center');
      const textH=this.measure(option,textW,optionSize);this.lines(option,x+p(56),yy+(h-textH)/2,textW,16,C.ink,selected||correct?500:400);
      if(state!=='idle')this.icon(correct?'check':wrong?'cross':'selected',x+w-p(40),yy+(h-p(24))/2);
      this.target('option-'+index,x,y,w,h,{type:'option',index,questionId:q.id},!!feedback||submitting||revive,letter+'，'+option);
      optionRects.push({index,x,y,w,h,selected,state});y+=h+p(8);
    });
    let feedbackRect=null;
    if(inlineExplanation){y+=p(16);this.icon(feedback.right===false?'cross':'check',x,y);this.label(feedback.right===false?'本次回答未通过':'答对了！',x+p(32),y+p(2),16,feedback.right===false?C.error:C.lake,600);
      this.lines(explanation,x,y+p(32),w,16);feedbackRect={x,y,w,h:explanationH+p(56),inline:true};}
    this.endContent(total);
    if(feedback&&!inlineExplanation){
      const y=footerTop+p(16);this.icon(feedback.right===false?'cross':'check',x,y);
      this.label(feedback.right===false?'本次回答未通过':'答对了！',x+p(32),y+p(2),16,feedback.right===false?C.error:C.lake,600);
      this.lines(explanation,x,y+p(32),w,16);feedbackRect={x,y,w,h:explanationH+p(32),inline:false};
    }
    const hint=submitting?'提交中…':feedback?q.position===totalQuestions?'查看结果':'下一题':'提交答案';
    this.button('confirm',hint,x,primaryY,w,{type:feedback?'continue':'confirm',questionId:q.id},false,submitting||!feedback&&this.view.selected==null);
    this.layout.quiz={kind:video?'video-choice':media?'image-choice':'text-choice',position:q.position,total:totalQuestions,region:this.scrollRegion,title:titleRect,media:mediaRect,options:optionRects,feedback:feedbackRect,timer,scroll:this.scroll,scrollMax:this.scrollMax,submitting,primary:{x,y:primaryY,w,h:p(52)}};
  }
  revive() {
    if(this.route.name!=='quiz')return super.revive();
    const ctx=this.ctx,p=n=>this.px(n),x=this.inset(),w=this.width(),pad=p(24),inner=w-pad*2;
    const selected=this.view.incorrectSelected,remaining=this.remainingRevives();
    const test=this.view.testShare||['development','experience'].includes(this.view.mode),ready=this.view.shareReady!==false&&remaining>0;
    const copy=(Number.isInteger(selected)?'本次回答未通过。':'本题超时，未能完成作答。')+'\n'+
      (remaining?'本次还剩 '+remaining+' 次复活机会，分享后可以重答当前题。':'本次挑战的复活机会已用完，可返回主题继续学习。')+
      (test&&remaining?'\n体验版使用测试复活。':'');
    const copyH=this.measure(copy,inner,p(16)),titleH=p(30),naturalH=pad*2+titleH+p(16)+copyH+p(16)+p(120);
    const h=Math.min(naturalH,this.bottom()-this.v.top),y=Math.max(this.v.top,Math.min((this.v.height-h)/2,this.bottom()-h));
    ctx.fillStyle='rgba(38,61,52,.48)';ctx.fillRect(0,0,this.v.width,this.v.height);
    this.box(x,y,w,h,16,C.surface);
    this.icon('cross',x+pad,y+pad);this.label(this.fit('再试一次，继续探索',inner-p(32),p(20),500),x+pad+p(32),y+pad,20,C.ink,500);
    this.targets=[];this.semanticTargets=[];this.clipRegion=null;this.modalActive=true;
    const actionY=y+h-pad-p(120),bodyTop=y+pad+titleH+p(16),bodyBottom=actionY-p(16);
    if(this.modalKey!=='hand-revive'){this.modalKey='hand-revive';this.modalScroll=0;}
    this.scrollMax=Math.max(0,copyH-(bodyBottom-bodyTop));this.scroll=this.modalScroll=Math.max(0,Math.min(this.modalScroll||0,this.scrollMax));
    this.scrollRegion=this.scrollMax?{x:x+pad,y:bodyTop,w:inner,h:bodyBottom-bodyTop}:null;
    ctx.save();ctx.beginPath();ctx.rect(x+pad,bodyTop,inner,bodyBottom-bodyTop);ctx.clip();this.lines(copy,x+pad,bodyTop-this.scroll,inner,16,C.muted);ctx.restore();
    if(this.scrollMax){const rail=bodyBottom-bodyTop,thumb=Math.max(p(24),rail*rail/copyH);this.box(x+w-pad-p(3),bodyTop,p(3),rail,2,C.paper);this.box(x+w-pad-p(3),bodyTop+(rail-thumb)*this.scroll/this.scrollMax,p(3),thumb,2,C.line);}
    this.drawingHandModal=true;
    try{
      this.button('revive-share',!remaining?'复活机会已用完':this.view.submitting?'复活中…':test?'测试复活 · 重答本题':'分享并复活',x+pad,actionY,inner,{type:'share'},false,!ready||!!this.view.submitting);
      this.button('revive-back','返回主题',x+pad,actionY+p(68),inner,{type:'back'},true,!!this.view.submitting);
    }finally{this.drawingHandModal=false;}
    this.layout.revive={x,y,w,h,selected,answerRevealed:false,testShare:!!test,revivesRemaining:remaining,scrollMax:this.scrollMax};
  }
  empty(name) {
    if(name==='themes')return this.themeChooser();
    if(name==='points')return this.points();
    return super.empty(name);
  }
  themeChooser() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),top=this.navTop()+p(64),themes=this.themes();
    this.backControl();this.heading('选择探索主题',x,top,26,'left',w);
    this.label('从一段家乡故事开始',x,top+p(42),16,C.muted);
    const rows=themes.map(theme=>({theme,h:Math.max(p(128),this.measure(theme.name,w-p(40),p(18),600)+this.measure(theme.description||'乡村文化知识探索',w-p(40),p(14))+p(64))}));
    const total=rows.reduce((sum,row)=>sum+row.h+p(16),0),progress=learningProgress(this.view.catalog,this.view.themeProgress);
    let y=this.beginContent('hand-themes',top+p(88),this.bottom(),total);
    for(const {theme,h} of rows){const levels=this.levels(theme.id),completed=progress.themes.find(t=>t.id===theme.id)?.completed||0;
      this.box(x,y,w,h,14,C.surface,C.line);const titleH=this.lines(theme.name,x+p(20),y+p(16),w-p(40),18,C.ink,600);
      this.lines(theme.description||'乡村文化知识探索',x+p(20),y+p(24)+titleH,w-p(40),14,C.muted);
      this.label('已完成 '+Math.min(completed,levels.length)+' / '+levels.length+' 关',x+p(20),y+h-p(32),14,C.muted);
      this.label('进入  ›',x+w-p(20),y+h-p(32),14,C.lake,600,'right');
      this.target('theme-'+theme.id,x,y,w,h,{type:'theme',themeId:theme.id},!levels.length,'进入'+theme.name+'主题');y+=h+p(16);
    }
    if(!themes.length)this.lines('主题内容正在准备中，请稍后再来。',x,y,w,16,C.muted);
    this.endContent(total);this.layout.themes={total:themes.length,scrollMax:this.scrollMax};
  }
  points() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),top=this.navTop()+p(64);
    this.backControl();this.heading('我的积分',x,top,26,'left',w);
    const total=p(432);let y=this.beginContent('hand-points',top+p(64),this.bottom(),total);
    this.label(String(this.view.totalPoints||0),x,y,40,C.lake,700);this.label('累计学习积分',x,y+p(56),16,C.muted);y+=p(112);
    const cap=this.view.dailyPointCap;
    this.lines('今日获得 '+(this.view.dailyPoints||0)+' 分'+(cap==null?'':'，每日上限 '+cap+' 分')+'。完成学习后结算积分。',x,y,w,16,C.muted);y+=p(88);
    [['points-certificates','我的学习证书','certificates'],['points-ranking','查看排行榜','ranking'],['points-settings','声音与学习规则','settings']].forEach(([id,label,name])=>{this.button(id,label,x,y,w,{type:'route',name},true);y+=p(76);});
    this.endContent(total);this.layout.points={totalPoints:this.view.totalPoints||0};
  }
}

module.exports={HandRenderer,HAND_ART};
