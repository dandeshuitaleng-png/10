'use strict';
// Native component and browser gallery share curves and untouched original pixels.
const fs=require('node:fs'),path=require('node:path');
const project=path.resolve(__dirname,'..'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
const offsets={welcome:[-2.65,.81],observe:[3.84,.45],think:[3.20,-.63],celebrate:[-2.13,-.81]};
function planes(width,height){return Object.entries(rigs).filter(([,r])=>!r.extension).map(([pose,rig])=>{const [x,y]=offsets[pose];return `.pose-${pose} .actor-source-plane{left:${50+x}%;top:${50+y}%;width:${(height/width*1.42908*rig.width/rig.height*100).toFixed(6)}%}`;}).join('\n');}
// Body movement supports the expression; never shear the whole character.
const body={
 welcome:'0%,100%{transform:rotate(0deg)}23%{transform:rotate(3.5deg)}44%{transform:rotate(-3deg)}64%{transform:rotate(2deg)}83%{transform:rotate(-.8deg)}',
 observe:'0%,100%{transform:rotate(0deg)}25%,57%{transform:rotate(-3.5deg)}74%{transform:rotate(1.2deg)}',
 think:'0%,100%{transform:scaleY(1)}32%,55%{transform:scaleY(.97)}72%{transform:scaleY(1.008)}86%{transform:scaleY(.99)}',
 celebrate:'0%,100%{transform:translateY(0) scaleY(1)}20%{transform:scaleY(.97)}42%{transform:translateY(-3.5%) scaleY(1.015)}65%{transform:scaleY(.98)}81%{transform:scaleY(1.005)}'
};
// A direct touch has a larger response than the quiet eight-second idle action.
const response={
 welcome:'0%,100%{transform:rotate(0deg)}10%{transform:rotate(-2deg)}28%{transform:rotate(7deg)}46%{transform:rotate(-6deg)}65%{transform:rotate(4deg)}83%{transform:rotate(-1.5deg)}',
 observe:'0%,100%{transform:rotate(0deg)}12%{transform:rotate(2deg)}29%,58%{transform:rotate(-7deg)}77%{transform:rotate(2deg)}90%{transform:rotate(-.7deg)}',
 think:'0%,100%{transform:scaleY(1) rotate(0deg)}16%{transform:scaleY(1.015) rotate(-2deg)}38%,57%{transform:scaleY(.94) rotate(2deg)}74%{transform:scaleY(1.018) rotate(0deg)}87%{transform:scaleY(.98)}',
 celebrate:'0%,100%{transform:translateY(0) scaleY(1)}17%{transform:scaleY(.94)}38%{transform:translateY(-7%) scaleY(1.025)}59%{transform:scaleY(.94)}75%{transform:translateY(-2%) scaleY(1.01)}89%{transform:scaleY(.985)}'
};
const antenna={
 welcome:'0%,10%,86%,100%{transform:rotate(0deg)}27%{transform:rotate(6deg)}43%{transform:rotate(-3.5deg)}57%{transform:rotate(1.8deg)}70%{transform:rotate(-.7deg)}',
 observe:'0%,12%,89%,100%{transform:rotate(0deg)}29%,46%{transform:rotate(5deg)}64%{transform:rotate(-2.4deg)}77%{transform:rotate(.9deg)}',
 think:'0%,12%,92%,100%{transform:rotate(0deg)}38%,57%{transform:rotate(5.5deg)}73%{transform:rotate(-1.7deg)}84%{transform:rotate(.6deg)}',
 celebrate:'0%,14%,91%,100%{transform:rotate(0deg)}36%{transform:rotate(-7deg)}51%{transform:rotate(4deg)}65%{transform:rotate(-2deg)}78%{transform:rotate(.8deg)}'
};
const eyes={
 welcome:'0%,14%,40%,78%,100%{transform:translateY(0) scaleY(1)}25%,31%{transform:translateY(-3%) scaleY(.42)}57%,63%{transform:translateY(-2%) scaleY(.72)}',
 observe:'0%,12%,87%,100%{transform:translateX(0) scaleY(1)}27%,47%,65%{transform:translateX(12%) scaleY(1)}54%{transform:translateX(12%) scaleY(.12)}75%{transform:translateX(4%) scaleY(1)}',
 think:'0%,12%,91%,100%{transform:translateY(0) scaleY(1)}34%,56%,72%{transform:translateY(7%) scaleY(1)}63%{transform:translateY(7%) scaleY(.12)}82%{transform:translateY(2%) scaleY(1)}',
 celebrate:'0%,17%,47%,86%,100%{transform:scaleY(1)}33%,38%{transform:scaleY(.12)}62%,68%{transform:scaleY(.62)}'
};
const glints={
 welcome:'0%,26%,72%,100%{opacity:0;transform:scale(.9)}43%{opacity:.58;transform:scale(1)}57%{opacity:.24;transform:scale(1.08)}',
 observe:'0%,51%,67%,100%{opacity:0;transform:scale(.7)}55%{opacity:.94;transform:scale(1)}60%{opacity:.22;transform:scale(1.28)}',
 think:'0%,31%,82%,100%{opacity:0;transform:scale(.95)}53%{opacity:.3;transform:scale(1.04)}',
 celebrate:'0%,24%,82%,100%{opacity:0}38%,62%{opacity:.62}'
};
let css=`:host{display:block;width:100%;height:100%;pointer-events:none}
.actor-original{position:relative;width:100%;height:100%;overflow:visible;pointer-events:none}
.actor-source-plane{position:absolute;height:142.908%;transform:translate(-50%,-50%);pointer-events:none}
.gesture-plane{position:absolute;inset:0;pointer-events:none}
.actor-art{position:absolute;top:0;left:0;display:block;width:100%;height:100%;object-fit:fill;pointer-events:none}
.eye-region{position:absolute;overflow:hidden;background:#89d1eb;pointer-events:none}
.eye-copy{position:relative;width:100%;height:100%;overflow:hidden;transform-origin:50% 50%}
.eye-source,.antenna-source{display:block;position:absolute;max-width:none;object-fit:fill;pointer-events:none}
.antenna-region{display:none;position:absolute;pointer-events:none;overflow:visible}\n.is-playing .antenna-region{display:block}
.antenna-pivot{position:relative;width:100%;height:100%;pointer-events:none}
.antenna-window{position:relative;width:100%;height:100%;overflow:hidden;pointer-events:none}
.gesture-plane,.eye-copy,.antenna-pivot,.prop-glint{animation-duration:var(--actor-duration);animation-fill-mode:both;animation-iteration-count:1;animation-timing-function:cubic-bezier(.4,0,.2,1)}
.prop-glint{position:absolute;overflow:hidden;opacity:0;pointer-events:none}
.prop-shine{position:absolute;inset:0;background:linear-gradient(135deg,#ffffffe0,#ffffff08);border-radius:50%}
.glint-camera,.glint-candy{border-radius:50%}
.glint-camera .prop-shine{background:radial-gradient(circle,#fffff1 0%,#fff9 45%,#fff0 76%)}
.glint-goggles .prop-shine{width:28%;height:100%;background:linear-gradient(100deg,transparent,#ffffffbd,transparent);border-radius:0;animation:glass-sheen var(--actor-duration) cubic-bezier(.33,0,.2,1) both}
${Object.entries(rigs).map(([pose,r])=>`.pose-${pose}{--actor-duration:${r.duration}ms}`).join('\n')}
${planes(64,76)}
@media(max-width:350px){${planes(56,66)}}
@media(min-width:410px){${planes(72,84)}}
`;
for(const [layer,selector,curves] of [['body','.gesture-plane',body],['antenna','.antenna-pivot',antenna],['eyes','.eye-copy',eyes],['prop','.prop-glint',glints]]){
 for(const [pose,frames] of Object.entries(curves))for(const phase of [0,1])css+=`.pose-${pose}.is-playing.phase-${phase} ${selector}{animation-name:${pose}-${layer}-${phase}}\n@keyframes ${pose}-${layer}-${phase}{${frames}}\n`;
}
for(const [pose,frames] of Object.entries(response))for(const phase of [0,1])css+=`.pose-${pose}.is-playing.is-responding.phase-${phase} .gesture-plane{animation-name:${pose}-response-${phase}}\n@keyframes ${pose}-response-${phase}{${frames}}\n`;
css+=`.actor-response-marks{display:none;position:absolute;inset:0;pointer-events:none}.is-responding .actor-response-marks{display:block}.response-mark{position:absolute;opacity:0;background:var(--accent,#42835a);animation:response-accent var(--actor-duration) ease-out both}.pose-welcome .response-mark{width:9%;height:3%;border-radius:3px;left:-3%;top:38%;transform:rotate(-25deg)}.pose-welcome .mark-2{left:-9%;top:50%;transform:rotate(8deg)}.pose-welcome .mark-3{left:0;top:61%;transform:rotate(35deg)}.pose-observe .response-mark{background:transparent;right:0;top:38%;width:24%;height:20%;border:2px solid #fffde0;border-radius:5px;box-shadow:0 0 0 1px #8b71334d}.pose-observe .mark-2,.pose-observe .mark-3{display:none}.pose-think .response-mark{width:6%;height:5%;border-radius:50%;right:5%;top:9%}.pose-think .mark-2{right:-4%;top:0;animation-delay:140ms}.pose-think .mark-3{right:1%;top:-11%;animation-delay:280ms}.pose-celebrate .response-mark{width:3%;height:10%;border-radius:3px;left:16%;top:0;transform:rotate(-33deg)}.pose-celebrate .mark-2{left:50%;top:-7%;transform:rotate(0deg)}.pose-celebrate .mark-3{left:83%;top:0;transform:rotate(33deg)}@keyframes response-accent{0%,15%,85%,100%{opacity:0}30%,58%{opacity:.9}}\n`;
// Each supplied extension uses a different original prop, with its own timing and pivot.
const extensions={
 reader:{body:'0%,100%{transform:rotate(0deg)}30%,58%{transform:rotate(-1.5deg)}78%{transform:rotate(.5deg)}',parts:{glasses:'0%,100%{transform:translateY(0) rotate(0deg)}24%,52%{transform:translateY(-.8%) rotate(-2deg)}72%{transform:translateY(0) rotate(.7deg)}'}},
 scholar:{body:'0%,100%{transform:rotate(0deg)}42%,65%{transform:rotate(1deg)}',parts:{book:'0%,100%{transform:rotate(0deg)}22%{transform:rotate(-2deg)}45%,62%{transform:rotate(3deg)}82%{transform:rotate(-.6deg)}'}},
 heart:{body:'0%,100%{transform:rotate(0deg)}35%,65%{transform:rotate(-1.2deg)}',parts:{heart:'0%,100%{transform:scale(1)}24%{transform:scale(1.06)}39%{transform:scale(1.01)}56%{transform:scale(1.08)}76%{transform:scale(1.015)}'}},
 lotus:{body:'0%,100%{transform:rotate(0deg)}45%,65%{transform:rotate(.7deg)}',parts:{fish:'0%,100%{transform:rotate(0deg)}24%{transform:rotate(9deg)}44%{transform:rotate(-7deg)}64%{transform:rotate(4deg)}82%{transform:rotate(-1.5deg)}'}},
 drummer:{body:'0%,100%{transform:rotate(0deg)}28%,59%{transform:rotate(-.8deg)}43%,74%{transform:rotate(.8deg)}',parts:{'stick-left':'0%,100%{transform:rotate(0deg)}16%{transform:rotate(-9deg)}29%{transform:rotate(12deg)}43%{transform:rotate(-8deg)}60%{transform:rotate(10deg)}80%{transform:rotate(-3deg)}','stick-right':'0%,100%{transform:rotate(0deg)}22%{transform:rotate(9deg)}39%{transform:rotate(-12deg)}54%{transform:rotate(7deg)}72%{transform:rotate(-10deg)}86%{transform:rotate(2deg)}'}},
 skater:{body:'0%,100%{transform:rotate(0deg) translateY(0)}23%{transform:rotate(-2.3deg) translateY(-1%)}54%{transform:rotate(1.3deg)}76%{transform:rotate(-.5deg)}',parts:{peace:'0%,100%{transform:rotate(0deg)}24%{transform:rotate(-6deg)}43%{transform:rotate(5deg)}61%{transform:rotate(-4deg)}80%{transform:rotate(1.5deg)}'}}
};
css+=`.extension-plane{position:absolute;inset:0;animation-duration:var(--actor-duration);animation-fill-mode:both;animation-timing-function:cubic-bezier(.33,0,.2,1)}.pose-scholar .extension-plane{inset:-12%}.extension-art{display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.extension-layered{opacity:0}.is-playing .extension-still{opacity:0}.is-playing .extension-layered{opacity:1}.extension-part{animation-duration:var(--actor-duration);animation-fill-mode:both;animation-timing-function:cubic-bezier(.33,0,.2,1)}\n`;
for(const [pose,action] of Object.entries(extensions))for(const phase of [0,1]){
 css+=`.pose-${pose}.is-playing.phase-${phase} .extension-plane{animation-name:${pose}-scene-${phase}}@keyframes ${pose}-scene-${phase}{${action.body}}\n`;
 for(const [part,frames] of Object.entries(action.parts)){
  css+=`.pose-${pose}.is-playing.phase-${phase} .part-${part}{animation-name:${pose}-${part}-${phase}}@keyframes ${pose}-${part}-${phase}{${frames}}\n`;
  const responseFrames=frames.replace(/rotate\((-?[\d.]+)deg\)/g,(_,n)=>'rotate('+(Number(n)*1.4).toFixed(2)+'deg)').replace(/scale\((1\.[\d]+)\)/g,(_,n)=>'scale('+(1+(Number(n)-1)*1.5).toFixed(3)+')');
  css+=`.pose-${pose}.is-playing.is-responding.phase-${phase} .part-${part}{animation-name:${pose}-${part}-touch-${phase}}@keyframes ${pose}-${part}-touch-${phase}{${responseFrames}}\n`;
 }
}
css+=`.actor-extension.is-responding .extension-part{animation-timing-function:cubic-bezier(.22,.7,.25,1)}.actor-extension .response-mark{width:4%;height:6%;border-radius:50%;right:7%;top:15%}.actor-extension .mark-2{right:0;top:24%;animation-delay:100ms}.actor-extension .mark-3{right:5%;top:33%;animation-delay:200ms}\n`;
css+='@keyframes glass-sheen{0%,28%{transform:translateX(-120%)}74%,100%{transform:translateX(470%)}}\n@media(prefers-reduced-motion:reduce){.actor-original .actor-response-marks,.actor-original .eye-region,.actor-original .prop-glint,.actor-original .antenna-region{display:none!important}.actor-original .eye-copy,.actor-original .prop-shine,.actor-original .gesture-plane,.actor-original .antenna-pivot{animation:none!important;transform:none!important}.actor-original .actor-art{clip-path:none!important}.actor-extension .extension-plane,.actor-extension .extension-part{animation:none!important;transform:none!important}.actor-extension .extension-still{opacity:1!important}.actor-extension .extension-layered{opacity:0!important}}\n';
fs.writeFileSync(path.join(project,'miniprogram/components/mascot-actor/index.wxss'),css);
function art(pose,rig){if(rig.extension)return `<div class="actor actor-original actor-extension pose-${pose} phase-0" data-pose="${pose}"><div class="extension-plane" style="${rig.gestureStyle}"><img class="extension-art extension-still" src="/miniprogram${rig.source}" alt=""><img class="extension-art extension-layered" src="/miniprogram${rig.baseSource}" alt="">${rig.layers.map(p=>`<img class="extension-art extension-layered extension-part part-${p.key}" src="/miniprogram${p.source}" style="${p.style}" alt="">`).join('')}</div><div class="actor-response-marks"><i class="response-mark mark-1"></i><i class="response-mark mark-2"></i><i class="response-mark mark-3"></i></div></div>`;const a=rig.antenna;return `<div class="actor actor-original pose-${pose} phase-0" data-pose="${pose}"><div class="actor-source-plane"><div class="gesture-plane" style="${rig.gestureStyle}"><img class="actor-art actor-full" src="/miniprogram${rig.source}" alt=""><img class="actor-art actor-segmented" src="/miniprogram${rig.source}" style="${a.baseStyle}" alt=""><div class="motion-overlays"><div class="antenna-region" style="${a.style}"><div class="antenna-pivot" style="${a.pivotStyle}"><div class="antenna-window" style="${a.windowStyle}"><img class="antenna-source" src="/miniprogram${rig.source}" style="${a.imageStyle}" alt=""></div></div></div>${rig.eyes.map(eye=>`<div class="eye-region" style="${eye.style}"><div class="eye-copy"><img class="eye-source" src="/miniprogram${rig.source}" style="${eye.imageStyle}" alt=""></div></div>`).join('')}<div class="prop-glint glint-${rig.kind}" style="${rig.glint.style}"><div class="prop-shine"></div></div></div></div></div><div class="actor-response-marks"><i class="response-mark mark-1"></i><i class="response-mark mark-2"></i><i class="response-mark mark-3"></i></div></div>`;}
const titles=['风车 · 笑眼招呼','相机 · 观察定格','糖葫芦 · 凝神思考','游泳圈 · 开心回应'];
const cards=Object.entries(rigs).map(([pose,rig],i)=>`<article data-pose="${pose}" data-duration="${rig.duration}"><div class="actor-host">${art(pose,rig)}</div><h2>${titles[i]||rig.label}</h2><p>${rig.extension?({reader:"答题 · 轻扶眼镜",scholar:"我的学习 · 展开书页",heart:"复活 · 爱心鼓励",lotus:"休息 · 锦鲤轻摆",drummer:"通关 · 双手击鼓",skater:"证书 · 比耶回应"}[pose]):rig.label}</p><button data-play="${pose}">播放一次</button></article>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>智小谷 · 动作预览</title><style>${css.replace(':host','.actor-host')}
*{box-sizing:border-box}body{margin:0;padding:30px 20px;background:#f2fff1;color:#28551a;font:15px/1.8 -apple-system,"PingFang SC",sans-serif}main{max-width:1040px;margin:auto}h1{font-size:26px;margin:0 0 8px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:26px 0}article{padding:24px 12px;background:#fffef9;border:1px solid #d3efbc;border-radius:18px;text-align:center}.actor-host .actor-original{pointer-events:auto;cursor:pointer}.actor-host{width:144px;height:171px;margin:0 auto 18px}h2{font-size:17px;margin:0}article p{min-height:60px;font-size:13px;color:#5f7b4a}button{min-height:44px;padding:8px 20px;border:1px solid #d3efbc;border-radius:22px;background:linear-gradient(105deg,#e3ffa6,#b3ffd9);color:#28551a;font:700 14px -apple-system,"PingFang SC",sans-serif;cursor:pointer}button:disabled{opacity:.65;cursor:default}.note{padding:14px 18px;background:white;border-radius:14px}.motion-overlays,.actor-segmented{display:none}.is-playing .motion-overlays,.is-playing .actor-segmented{display:block}.is-playing .actor-full{display:none}a{color:#3a8223}@media(min-width:410px){.actor-host{height:168px}}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:350px){.actor-host{width:112px;height:132px}.grid{gap:8px}body{padding:20px 12px}article{padding:20px 6px}}
${Object.entries(rigs).map(([p,r])=>`.slow-motion .pose-${p}{--actor-duration:${r.duration*3}ms}`).join('\n')}
@media(prefers-reduced-motion:reduce){.actor-original .actor-full{display:block!important}.actor-original .actor-segmented{display:none!important}}
</style><main><h1>智小谷 · 动作预览</h1><p>关卡与内页各有适合场景的原稿造型；轻点角色或按钮，可以单独播放。</p><section class="grid">${cards}</section><p class="note" id="status"></p><p><a href="/preview/游戏视觉预览-20261019.html">返回当前方案</a></p></main><script>
const states=new Map(),preference=matchMedia('(prefers-reduced-motion:reduce)'),slow=new URLSearchParams(location.search).get('slow')==='1';let repeat=null;if(slow)document.body.classList.add('slow-motion');
function stop(state){clearTimeout(state.end);state.el.classList.remove('is-playing','is-responding');state.end=null;state.button.textContent='播放一次';state.button.disabled=preference.matches;state.touched=false;}
function play(state,touched=false){if(document.hidden||preference.matches||!state.visible)return;if(state.end!==null){if(!touched||state.touched)return;stop(state);}state.touched=touched;state.phase=1-state.phase;state.el.classList.remove('phase-0','phase-1');state.el.classList.add('is-playing','phase-'+state.phase);if(touched)state.el.classList.add('is-responding');state.button.disabled=touched;state.button.textContent=touched?'正在回应':'点我互动';state.end=setTimeout(()=>stop(state),state.duration*(slow?3:1));}
document.querySelectorAll('article[data-pose]').forEach(card=>{const state={card,el:card.querySelector('.actor-original'),button:card.querySelector('button'),phase:0,duration:Number(card.dataset.duration),visible:false,end:null};states.set(card.dataset.pose,state);state.button.addEventListener('click',()=>play(state,true));state.el.addEventListener('click',()=>play(state,true));});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{const state=states.get(entry.target.dataset.pose);state.visible=entry.isIntersecting;if(state.visible)play(state);else stop(state);}));states.forEach(state=>observer.observe(state.card));
function schedule(){clearInterval(repeat);repeat=null;if(!document.hidden&&!preference.matches)repeat=setInterval(()=>states.forEach(state=>play(state)),8000);}
function syncPreference(){states.forEach(stop);document.querySelector('#status').textContent=preference.matches?'系统已减少动态效果，当前展示静态造型。':'可见造型每 8 秒演示一次，也可单独播放。轻点会触发更明显的回应；页面离开前台时暂停。';schedule();if(!preference.matches)states.forEach(state=>play(state));}
document.addEventListener('visibilitychange',()=>{if(document.hidden)states.forEach(stop);else states.forEach(state=>play(state));schedule();});preference.addEventListener('change',syncPreference);window.addEventListener('pagehide',()=>{clearInterval(repeat);states.forEach(stop);observer.disconnect();});syncPreference();
</script></html>`;
fs.writeFileSync(path.join(project,'preview/角色动作预览-20261019.html'),html);
console.log('Generated layered antenna, gaze and prop motion; original PNG assets unchanged.');
