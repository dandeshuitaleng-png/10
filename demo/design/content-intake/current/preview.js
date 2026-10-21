const App=quizRequire('/js/main'),{createViewport}=quizRequire('/js/core/viewport');
const {Renderer}=quizRequire('/js/ui/renderer'),D=quizRequire('/js/ui/draw');
const canvas=document.getElementById('game'),select=document.getElementById('level'),button=document.getElementById('start');
let app=null,bank=null,listeners=new Map();
const syncAccessibility=attachQuizAccessibility(canvas,()=>app);
// This subclass is confined to this review page. Main renderer/assets are unchanged.
class ReviewRenderer extends Renderer {
  sceneBackdrop(name) {
    const themeId=this.route.params.themeId||'ecology',scene=this.view.images?.['map-'+themeId];
    if(!scene||!['home','quiz','result'].includes(name))return;
    D.imageCover(this.ctx,scene,0,0,375,this.v.height,0);
    if(name==='quiz'){this.ctx.fillStyle='rgba(239,234,217,.15)';this.ctx.fillRect(0,0,375,this.v.height);}
    this.ctx.fillStyle=name==='quiz'?'rgba(239,234,217,.28)':'rgba(239,234,217,.18)';this.ctx.fillRect(0,0,375,this.v.height);
    this.layout.backdrop={source:'original-'+themeId+'-environment',decorative:true,qualityRefinement:true};
  }
}
function renderReview(level) {
  const target=document.getElementById('review');target.replaceChildren();
  for(const q of bank.questions.filter(q=>q.levelId===level.id)){
    const article=document.createElement('article'),h=document.createElement('h3');h.textContent=q.id+' '+q.title;article.append(h);
    const list=document.createElement('ol');list.type='A';for(const option of q.options){const li=document.createElement('li');li.textContent=option;list.append(li);}article.append(list);
    for(const text of ['答案：'+q.correctOption+'；'+q.explanation,'审核：'+q.reviewStatus+'；'+(q.enabled?'启用':'未启用'),'来源：'+q.sourceTitle]){const p=document.createElement('p');p.textContent=text;article.append(p);}
    target.append(article);
  }
}
async function start() {
  if(!bank)return;button.disabled=true;select.disabled=true;
  if(app)app.destroy();listeners=new Map();
  const level=bank.levels.find(l=>l.id===select.value),theme=bank.themes.find(t=>t.id===level.themeId);
  const platform={canvas,api:{getStorageSync:()=>null},viewport:()=>createViewport({windowWidth:canvas.clientWidth,windowHeight:canvas.clientHeight,pixelRatio:Math.min(devicePixelRatio||1,3),statusBarHeight:44}),requestFrame:cb=>requestAnimationFrame(cb),cancelFrame:id=>cancelAnimationFrame(id),on:(n,cb)=>listeners.set(n,cb),off:(n,cb)=>{const k=n.replace(/^off/,'on');if(listeners.get(k)===cb)listeners.delete(k)},createImage:()=>{const img=new Image();Object.defineProperty(img,'src',{set(v){img.setAttribute('src','../../../'+v)},get(){return img.getAttribute('src')}});return img}};
  app=new App(platform,{practiceContent:{themeId:level.themeId,levelOrder:level.order,questions:bank.questions.filter(q=>q.levelId===level.id)}});
  app.renderer=new ReviewRenderer(app.ctx);platform.syncAccessibility=syncAccessibility;app.start();
  // App loader owns loading feedback. Wait until its resources have settled.
  await new Promise(resolve=>{const id=setInterval(()=>{if(app.router.current.name!=='loading'){clearInterval(id);resolve();}},30);});
  app.startPractice();renderReview(level);button.disabled=false;select.disabled=false;
  document.getElementById('loading').textContent=theme.name+' · 第'+level.order+'关 · '+level.difficultyLabel+' · 15题池随机抽10题';
  window.contentPreviewApp=app;
}
function send(name,e){if(!app)return;const r=canvas.getBoundingClientRect(),touch={clientX:e.clientX-r.left,clientY:e.clientY-r.top,identifier:e.pointerId};listeners.get(name)?.({touches:[touch],changedTouches:[touch]});}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);send('onTouchStart',e)});canvas.addEventListener('pointermove',e=>send('onTouchMove',e));canvas.addEventListener('pointerup',e=>send('onTouchEnd',e));canvas.addEventListener('pointercancel',()=>listeners.get('onTouchCancel')?.());canvas.addEventListener('wheel',e=>{if(app?.renderer.scrollRegion){e.preventDefault();app.renderer.scrollBy(e.deltaY/app.viewport.scale)}},{passive:false});
window.addEventListener('resize',()=>app?.resize());document.addEventListener('visibilitychange',()=>listeners.get(document.hidden?'onHide':'onShow')?.());window.addEventListener('pagehide',()=>app?.destroy());
button.addEventListener('click',start);select.addEventListener('change',start);
fetch('bank.json').then(r=>{if(!r.ok)throw Error('题库读取失败');return r.json();}).then(data=>{
  bank=data;for(const l of bank.levels){const option=document.createElement('option');option.value=l.id;option.textContent=bank.themes.find(t=>t.id===l.themeId).name+' · 第'+l.order+'关 · '+l.difficultyLabel;select.append(option);}
  const enabled=bank.questions.filter(q=>q.enabled&&q.reviewStatus==='已通过').length;
  document.getElementById('state').textContent='240题已导入内容检查区；当前已审核并启用 '+enabled+' 题。';select.disabled=false;start();
}).catch(error=>{document.getElementById('state').textContent=error.message;document.getElementById('loading').textContent='请检查题库文件后重新加载。';});

const viewToggle=document.getElementById('switch-view'),leave=document.getElementById('leave-focus');
function setFocusView(on){document.body.classList.toggle('play-focus',on);viewToggle.setAttribute('aria-pressed',String(on));app?.resize();if(on)canvas.scrollIntoView({block:'start'});else viewToggle.focus();}
viewToggle.addEventListener('click',()=>setFocusView(true));leave.addEventListener('click',()=>setFocusView(false));
