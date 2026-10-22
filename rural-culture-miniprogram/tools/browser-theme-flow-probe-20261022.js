(async function(){
 const q=new URLSearchParams(location.hash.split('?')[1]),theme=q.get('theme'),scene=q.get('qaScene')||q.get('scenario');
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),ready=()=>{const d=window._nativePreview?.page?.data;return d&&!d.loading&&d.skin.gameId===theme&&(['rules','sound','home'].includes(scene)?d.route==='home':scene==='result'?d.route==='result':d.route==='quiz');};
 for(let i=0;i<100&&!ready();i++)await wait(30);
 if(!ready())throw Error('Theme flow not ready: '+theme+' '+scene);
 const p=window._nativePreview.page;
 if(scene==='rules')document.querySelector('#footer-primary .game-button').click();
 if(scene==='sound')document.querySelector('#sound-settings').click();
 for(let i=0;i<50&&((scene==='rules'&&p.data.modal!=='rules')||(scene==='sound'&&!p.data.soundSettingsOpen));i++)await wait(20);
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const root=document.querySelector('.game-device'),device=root.getBoundingClientRect(),issues=[],test=(ok,reason)=>{if(!ok)issues.push(reason);},rect=s=>[...document.querySelectorAll(s)].map(e=>({e,r:e.getBoundingClientRect()}));
 const icon={red:'flag',culture:'book',industry:'wheat',ecology:'leaf'}[theme],pose={red:'drummer',culture:'reader',industry:'scholar',ecology:'lotus'}[theme];
 if(scene==='home'||scene==='quiz'){
  const name=scene==='home'?'.home-direction-caption':'.quest-theme-mark';
  test(document.querySelector(name+' .icon')?.getAttribute('src').endsWith('/'+icon+'.png'),'theme-specific marker');
 }
 if(['rules','revive','locked'].includes(scene)){
  test(p.data.modal===scene,'expected modal');
  const modal=document.querySelector('.theme-modal').getBoundingClientRect(),actions=document.querySelector('.modal-actions').getBoundingClientRect(),inner=document.querySelector('.modal-inner').getBoundingClientRect();
  test(modal.left>=device.left-1&&modal.right<=device.right+1,'modal horizontal bounds');
  test(actions.top>=inner.bottom-1&&actions.bottom<=device.bottom+1,'modal actions stay separate and visible');
  for(const {r}of rect('.modal-actions .game-button'))test(r.height>=43.9&&r.width>0,'modal button target');
  test(document.querySelector('#modal-primary .game-button').getBoundingClientRect().height>=51.9,'52px modal primary');
  if(scene!=='rules')test(document.querySelector('.theme-encouragement')?.textContent===(scene==='revive'?p.data.content.revive:p.data.content.rest),'themed encouragement');
  if(scene==='rules'){const h=getComputedStyle(root).getPropertyValue('--accent').trim().slice(1),rgb='rgb('+[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')';for(const {e}of rect('.rule-cell .b'))test(getComputedStyle(e).color===rgb,'rule value palette');}
 }
 if(scene==='result'){
  test(p.data.pageActorPose===pose,'contextual supplied result figure');
  const before=JSON.stringify(p.data.snapshot);document.querySelector('.result-companion').click();await wait(40);test(JSON.stringify(p.data.snapshot)===before,'figure tap preserves awarded progress');
  for(const {r}of rect('.stat-pair .stat,.summary-line,.certificate-notice'))test(r.left>=device.left-1&&r.right<=device.right+1,'result card horizontal bounds');
 }
 if(scene==='sound'){
  const sheet=document.querySelector('.sound-settings-panel').getBoundingClientRect();test(sheet.left>=device.left-1&&sheet.right<=device.right+1&&sheet.top>=device.top&&sheet.bottom<=device.bottom+1,'sound sheet bounds');
  for(const {r}of rect('.sound-switch-hit,.sound-done-button,.sound-mute-button,.sound-settings-close'))test(r.width>=43.9&&r.height>=43.9,'sound control target');
 }
 for(let i=0;i<50&&rect('.icon').some(({e})=>!e.complete);i++)await wait(20);
 for(const {e}of rect('.icon'))test(e.complete&&e.naturalWidth>0,'icon loaded');
 test(!/本地|模拟|联调/.test(root.innerText),'no development wording');
 return {theme,scene,width:innerWidth,height:innerHeight,passed:!issues.length,issues,icon,pose:p.data.pageActorPose,modal:p.data.modal};
})()
