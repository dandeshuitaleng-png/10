/* Full game browser host: pointer and keyboard share the same remote state machine. */
(() => {
  const {OnlineApp}=quizRequire('/js/online-app'),{HttpClient}=quizRequire('/js/services/http-client'),{createViewport}=quizRequire('/js/core/viewport');
  const canvas=document.querySelector('#game'),listeners=new Map(),controlHost=document.querySelector('#controls'),live=document.querySelector('#game-status'),nodes=new Map();
  const shareDialog=document.querySelector('#share-dialog'),videoDialog=document.querySelector('#video-dialog');
  let soundContext=null,shareResolve=null,shareInfo=null,lastContext='',modalKey='',hadKeyboard=false,lastCountdown=-1;
  const certificateDialog=document.querySelector('#certificate-dialog');let certificateFile=null,certificatePreviewURL=null;
  const safeMedia=src=>/^https:\/\//.test(src)||/^\/?(?:images|media)\/[a-zA-Z0-9_./-]+$/.test(src);
  function sound(kind,enabled){
    if(!enabled)return;
    try {
      const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return;
      soundContext ||= new AudioCtor();soundContext.resume();
      const values=kind==='complete'?[523.25,659.25,783.99]:kind==='correct'?[659.25,880]:kind==='wrong'?[220,164.81]:[440];
      values.forEach((frequency,i)=>{const osc=soundContext.createOscillator(),gain=soundContext.createGain(),t=soundContext.currentTime+i*.1;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.055,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+.13);osc.connect(gain);gain.connect(soundContext.destination);osc.start(t);osc.stop(t+.14);});
    }catch(_){/* Device audio restrictions do not block play. */}
  }
  function share(info){
    return new Promise(resolve=>{
      shareResolve=resolve;shareDialog.dataset.challengeId=info.challenge?.id||'';
      shareInfo=info;
      shareDialog.querySelector('#revive-test').hidden=info.type!=='revive'||!['experience','development'].includes(info.mode);
      document.querySelector('#share-status').textContent='';shareDialog.showModal();
      document.querySelector('#test-revive').textContent=`体验复活 · 剩余${info.challenge?.revivesRemaining ?? 1}次`;
    });
  }
  document.querySelector('#share-invite').addEventListener('click',async()=>{
    const url=location.origin+'/web/play.html',status=document.querySelector('#share-status');
    const settings=shareInfo?.settings||{};
    try{if(navigator.share)await navigator.share({title:settings.title||'趣味闯关 · 乡村知识之旅',text:shareInfo?.type==='revive'?shareInfo?.reviveSettings?.shareText||settings.text:settings.text||'沿着小路，发现家乡。一起挑战乡村知识。',url});else if(navigator.clipboard){await navigator.clipboard.writeText((settings.text||'一起挑战乡村知识。')+' '+url);status.textContent='邀请文案和链接已复制。';}else status.textContent='邀请链接：'+url;
      if(document.querySelector('#revive-test').hidden)shareDialog.close();
    }catch(e){status.textContent=e.name==='AbortError'?'已取消分享。':'分享暂不可用，可以稍后重试。';}
  });
  document.querySelector('#test-revive').addEventListener('click',()=>{const resolve=shareResolve;shareResolve=null;resolve?.({type:'experience-test',challengeId:shareDialog.dataset.challengeId});shareDialog.close();});
  shareDialog.addEventListener('close',()=>{shareResolve?.(null);shareResolve=null;});
  async function shareCertificate(url,certificate){
    const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw Error('证书尚未获取，请重试。');
    const svgURL=URL.createObjectURL(await response.blob());
    try{
      const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('证书图片生成失败。'));image.src=svgURL;});
      const output=document.createElement('canvas');output.width=1200;output.height=850;output.getContext('2d').drawImage(image,0,0,1200,850);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('证书图片生成失败。');
      certificateFile=new File([blob],'乡村知识电子证书.png',{type:'image/png'});
      certificatePreviewURL=URL.createObjectURL(blob);document.querySelector('#certificate-preview').src=certificatePreviewURL;
      document.querySelector('#certificate-share-title').textContent=certificate.name||certificate.title||'分享我的证书';
      const supported=!!navigator.share&&!!navigator.canShare&&navigator.canShare({files:[certificateFile]});
      document.querySelector('#certificate-send').hidden=!supported;
      document.querySelector('#certificate-status').textContent=supported?'证书图片已生成，点击分享选择接收方。':'此浏览器暂不支持图片分享，可保存图片后转发。';
      certificateDialog.showModal();
    }finally{URL.revokeObjectURL(svgURL);}
  }
  document.querySelector('#certificate-send').addEventListener('click',async()=>{
    if(!certificateFile)return;const status=document.querySelector('#certificate-status');
    try{await navigator.share({title:document.querySelector('#certificate-share-title').textContent,files:[certificateFile]});status.textContent='图片已交给系统分享。';}
    catch(e){status.textContent=e.name==='AbortError'?'已取消分享，图片仍可保存。':'分享未完成，可以保存图片后转发。';}
  });
  document.querySelector('#certificate-save').addEventListener('click',()=>{
    if(!certificateFile)return;const a=document.createElement('a');a.href=certificatePreviewURL;a.download=certificateFile.name;a.click();
  });
  certificateDialog.addEventListener('close',()=>{if(certificatePreviewURL)URL.revokeObjectURL(certificatePreviewURL);certificatePreviewURL=null;certificateFile=null;document.querySelector('#certificate-preview').removeAttribute('src');});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  const video=videoDialog.querySelector('video');video.addEventListener('error',()=>videoDialog.querySelector('.video-error').hidden=false);
  videoDialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();});
  const platform={canvas,api:{getStorageSync:key=>{try{return JSON.parse(localStorage.getItem(key))}catch(_){return null}},setStorageSync:(key,value)=>localStorage.setItem(key,JSON.stringify(value))},
    viewport:()=>createViewport({windowWidth:canvas.clientWidth,windowHeight:canvas.clientHeight,pixelRatio:Math.min(devicePixelRatio||1,3),statusBarHeight:24}),
    requestFrame:cb=>requestAnimationFrame(cb),cancelFrame:id=>cancelAnimationFrame(id),
    on:(n,cb)=>listeners.set(n,cb),off:(n,cb)=>{const key=n.replace(/^off/,'on');if(listeners.get(key)===cb)listeners.delete(key)},
    createImage:()=>{const im=new Image();Object.defineProperty(im,'src',{set(src){im.setAttribute('src',/^https:\/\//.test(src)||src.startsWith('/')?src:'/'+src)},get(){return im.getAttribute('src')}});return im},
    effect:sound,playVideo:src=>{if(!safeMedia(src)){app.notify('视频地址暂不可用');return;}videoDialog.querySelector('.video-error').hidden=true;video.src=src.startsWith('/')||/^https:/.test(src)?src:'/'+src;videoDialog.showModal();}
  };
  const app=window.app=new OnlineApp(platform,{client:new HttpClient(),authenticate:async client=>{const data=await client.request('/api/auth/dev',{name:'乡村探索者',deviceId:platform.api.getStorageSync('quiz:experience-device')||undefined});platform.api.setStorageSync('quiz:experience-device',data.deviceId);},share,
    download:async url=>{const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw Error('证书下载未完成，请重试。');const blob=await r.blob(),src=URL.createObjectURL(blob),a=document.createElement('a');a.href=src;a.download='乡村知识电子证书.svg';a.click();setTimeout(()=>URL.revokeObjectURL(src),5000);},shareCertificate,
    reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  function descriptors(a){const v=a.viewState(),q=v.feedback?.question||v.question,targets=(a.renderer.semanticTargets||a.input.targets).slice(),quiz=a.renderer.layout.quiz;if(a.router.current.name==='quiz'&&quiz&&!v.modal&&!v.exitRequested&&!v.feedback&&!v.videoActive&&!v.connectionError)for(const o of quiz.options||[])if(!targets.some(t=>t.id==='option-'+o.index))targets.push({id:'option-'+o.index,...o,action:{type:'option',index:o.index,questionId:q.id},disabled:v.submitting});return targets;}
  function sync(a){
    const v=a.viewState(),q=v.feedback?.question||v.question,targets=descriptors(a);
    const ids=new Set(targets.map(t=>t.id));let lost=false;
    for(const[id,b]of nodes)if(!ids.has(id)){if(document.activeElement===b)lost=true;b.remove();nodes.delete(id);}
    const modal=v.exitRequested?'exit':v.modal||'';
    controlHost.setAttribute('role',modal?'dialog':'group');controlHost.setAttribute('aria-label',modal==='exit'?'退出挑战确认':modal==='revive'?`本题未通过，剩余${v.revivesRemaining}次复活`:'趣味闯关操作');
    if(modal)controlHost.setAttribute('aria-modal','true');else controlHost.removeAttribute('aria-modal');
    for(const t of targets){let b=nodes.get(t.id);if(!b){b=document.createElement('button');b.type='button';b.dataset.quizId=t.id;b.addEventListener('click',()=>{const current=descriptors(a).find(x=>x.id===b.dataset.quizId);if(current&&!current.disabled)a.handle(current.action);});b.addEventListener('focus',()=>{const region=a.renderer.scrollRegion,rect=descriptors(a).find(o=>o.id===b.dataset.quizId);if(region&&rect){if(rect.y<region.y)a.renderer.scrollBy(rect.y-region.y-5);else if(rect.y+rect.h>region.y+region.h)a.renderer.scrollBy(rect.y+rect.h-region.y-region.h+5);}});nodes.set(t.id,b);controlHost.append(b);}
      b.disabled=!!t.disabled;b.setAttribute('aria-label',t.action.type==='option'?'ABCD'[t.action.index]+'，'+q.options[t.action.index]:t.label||t.id);
      if(t.action.type==='option')b.setAttribute('aria-pressed',String(v.selected===t.action.index));
      const s=a.viewport.scale;Object.assign(b.style,{left:t.x*s+'px',top:t.y*s+'px',width:t.w*s+'px',height:t.h*s+'px'});
    }
    const activeThemes=(v.catalog?.themes||[]).filter(theme=>theme.enabled!==false),themeIds=new Set(activeThemes.map(theme=>theme.id));
    const activeLevels=(v.catalog?.levels||[]).filter(level=>level.enabled!==false&&themeIds.has(level.themeId));
    const context=modal==='exit'?'退出后可继续本次挑战，计时继续。':modal==='revive'?`本题未通过，剩余${v.revivesRemaining}次复活。`:v.feedback?'答对了。'+v.feedback.explanation:a.router.current.name==='quiz'&&q?`${q.themeName}，第${q.levelOrder}关，第${q.position}题，共${q.total}题。${q.title}`:a.router.current.name==='result'?`本关通关，获得${v.result?.points||0}积分，正确率${v.result?.accuracyPercent||0}%。`:a.router.current.name==='ranking'?'排行榜，'+(a.rankingPeriod==='day'?'今日榜':'总榜'):a.router.current.name==='certificates'?'我的证书，已获得'+v.certificates.length+'张。':a.router.current.name==='home'?`趣味闯关，${activeThemes.length}主题${activeLevels.length}关。`:'趣味闯关';
    document.querySelector('#theme-count').textContent=activeThemes.length+'个主题';document.querySelector('#level-count').textContent=activeLevels.length+'段旅程';
    const counts=[...new Set(activeLevels.map(level=>level.questionCount))];document.querySelector('#question-rule').textContent=counts.length===1?'每关'+counts[0]+'题':'题数按关卡设置';
    if(lastContext!==context){live.textContent=context;lastContext=context;}
    if(v.remainingSeconds<=5&&v.remainingSeconds!==lastCountdown&&a.router.current.name==='quiz'&&!v.feedback&&!v.modal){live.textContent='剩余'+v.remainingSeconds+'秒。';lastCountdown=v.remainingSeconds;}
    if(hadKeyboard&&(lost||modal!==modalKey)&&modal)targets.find(t=>!t.disabled)&&nodes.get(targets.find(t=>!t.disabled).id)?.focus();
    modalKey=modal;
    document.querySelector('#environment').textContent=v.mode==='production'?'正式游戏':'全功能体验版 · 进度已保存';
    const notice=document.querySelector('#connection-notice');notice.hidden=!v.connectionError;if(v.connectionError)notice.querySelector('span').textContent=v.connectionError;
  }
  platform.syncAccessibility=sync;app.start();
  const send=(name,e)=>{const r=canvas.getBoundingClientRect(),touch={clientX:e.clientX-r.left,clientY:e.clientY-r.top,identifier:e.pointerId};listeners.get(name)?.({touches:[touch],changedTouches:[touch]});};
  canvas.addEventListener('pointerdown',e=>{hadKeyboard=false;sound('press',false);canvas.setPointerCapture(e.pointerId);send('onTouchStart',e)});
  canvas.addEventListener('pointermove',e=>send('onTouchMove',e));canvas.addEventListener('pointerup',e=>send('onTouchEnd',e));canvas.addEventListener('pointercancel',()=>listeners.get('onTouchCancel')?.());
  canvas.addEventListener('wheel',e=>{if(app.renderer.scrollRegion){e.preventDefault();app.renderer.scrollBy(e.deltaY/app.viewport.scale)}},{passive:false});
  document.querySelector('#connection-notice button').addEventListener('click',()=>app.handle({type:'retry-remote'}));
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Tab'){hadKeyboard=true;if(modalKey){const enabled=[...nodes.values()].filter(b=>!b.disabled),i=enabled.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();enabled.at(-1)?.focus()}else if(!e.shiftKey&&(i<0||i===enabled.length-1)){e.preventDefault();enabled[0]?.focus()}}}if(e.key==='Escape'&&controlHost.contains(document.activeElement)){if(app.exitRequested)app.handle({type:'exit-cancel'});else if(app.router.current.name==='quiz')app.handle({type:'exit-request'});}});
  addEventListener('resize',()=>app.resize());document.addEventListener('visibilitychange',()=>listeners.get(document.hidden?'onHide':'onShow')?.());addEventListener('pagehide',()=>app.destroy());
})();
