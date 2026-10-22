(async function(){
 const q=new URLSearchParams(location.hash.split('?')[1]),theme=q.get('theme'),scene=q.get('qaScene')||q.get('scenario'),route={home:'home',quiz:'quiz',correct:'quiz',profile:'profile',points:'points','ranking-empty':'ranking',revive:'quiz',locked:'quiz',result:'result',certificate:'certificate'}[scene];
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const ready=()=>{const d=window._nativePreview?.page?.data;return d&&!d.loading&&d.skin.gameId===theme&&d.route===route&&(scene!=='correct'||d.challenge?.status==='correct')&&(!['revive','locked'].includes(scene)||d.modal===scene);};
 for(let i=0;i<100&&!ready();i++)await wait(30);
 if(!ready())throw Error('Scenario not ready: '+theme+' '+scene);
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const root=document.querySelector('.game-device'),device=root.getBoundingClientRect(),style=getComputedStyle(root),issues=[],test=(ok,label)=>{if(!ok)issues.push(label);};
 const rect=selector=>[...document.querySelectorAll(selector)].map(e=>({e,r:e.getBoundingClientRect()}));
 for(const {r}of rect('.option,.profile-card,.points-hero,.rank-table,.my-rank,.answer-feedback'))test(r.left>=device.left-1&&r.right<=device.right+1,'card horizontal containment');
 for(const {r}of rect('.segmented .tab,.activity-shortcut,.sound-button,.modal-close'))test(r.height>=43.9&&r.width>=43.9,'44px touch target');
 for(const {r}of rect('#footer-primary .game-button'))test(r.height>=51.9&&r.bottom<=device.bottom+1,'52px footer inside viewport');
 if(scene==='home'){const b=document.querySelector('scroll-view.panel-body').getBoundingClientRect();for(const {r}of rect('.route-stop.current .chapter-mascot,.route-stop.current .route-caption'))test(r.top>=b.top-1&&r.bottom<=b.bottom+1,'current chapter visible');test(!document.querySelector('.route-stop.locked .chapter-mascot'),'future chapter hides actor');}
 let selectedFeedback=null;
 if(scene==='quiz'){
  const disabled=document.querySelector('#footer-primary .game-button');test(disabled.disabled,'submit disabled before selection');
  const bg=getComputedStyle(disabled).backgroundColor;
  document.querySelector('.option').click();await new Promise(r=>requestAnimationFrame(r));
  const selected=document.querySelector('.option.selected'),dot=selected?.querySelector('.dot'),r=dot?.getBoundingClientRect();
  test(!!selected&&r.width>=8&&r.height>=8,'selection indicator visible');test(!document.querySelector('#footer-primary .game-button').disabled,'submit enables after selection');
  selectedFeedback={disabledBackground:bg,indicatorWidth:r?.width};
 }
 if(scene==='correct'){const b=document.querySelector('.answer-feedback'),paint=getComputedStyle(b),hex=style.getPropertyValue('--pale').trim().replace('#',''),rgb='rgb('+[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';test(paint.color===style.color,'explanation text follows theme');test(paint.backgroundImage.includes(rgb),'themed explanation surface');}
 if(scene==='ranking-empty'){document.querySelector('.tab[data-period="total"]').click();await new Promise(r=>requestAnimationFrame(r));test(document.querySelector('.tab.active').textContent==='总榜','ranking tab responds');}
 if(['profile','points','quiz'].includes(scene))test(!document.querySelector('.inline-actor'),'no decorative IP on information/quiz pages');
 test(!/本地|模拟|联调/.test(root.innerText),'no development wording');
 return {theme,scene,width:innerWidth,height:innerHeight,passed:!issues.length,issues,ink:style.color,pale:style.getPropertyValue('--pale').trim(),selectedFeedback};
})()
