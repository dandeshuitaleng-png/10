/* Browser semantic companion. Pointer input stays with Canvas so drag/cancel
   behaviour is identical to WeChat. Keyboard actions use the same App handler. */
window.attachQuizAccessibility=function(canvas,getApp){
  const host=canvas.parentElement;host.style.position='relative';canvas.setAttribute('aria-hidden','true');
  const sheet=document.createElement('style');sheet.textContent='.quiz-semantic{position:absolute;inset:0;pointer-events:none;overflow:clip}.quiz-semantic button{position:absolute;border:0;border-radius:12px;background:transparent;color:transparent;pointer-events:none;margin:0;padding:0;font-size:0;box-sizing:border-box}.quiz-semantic button:focus-visible{outline:3px solid #176B80;outline-offset:3px;box-shadow:0 0 0 6px #FFFCF0}.quiz-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';document.head.append(sheet);
  const group=document.createElement('div');group.className='quiz-semantic';group.setAttribute('role','group');group.setAttribute('aria-label','趣味闯关操作');host.append(group);
  const context=document.createElement('div');context.id='quiz-question-context';context.className='quiz-sr';group.append(context);
  const live=document.createElement('div');live.className='quiz-sr';live.setAttribute('role','status');live.setAttribute('aria-live','polite');group.append(live);
  const nodes=new Map();let lastStatus='',keyboard=false,modalKey='',previousFocus=null;
  function descriptors(a){const list=a.input.targets.map(t=>({...t}));const g=a.renderer.layout.quiz,v=a.viewState();
    if(a.router.current.name==='quiz'&&g&&!v.modal&&!v.exitRequested&&!v.feedback){
      for(const o of g.options){const id='option-'+o.index;if(!list.some(t=>t.id===id))list.push({id,...o,action:{type:'option',index:o.index,questionId:v.question.id}});}
    }
    const map=a.renderer.layout.map;
    if(map&&!v.exitRequested)for(const n of map.nodes)if(!list.some(t=>t.id===n.id))list.push({id:n.id,...n.hotRect,y:n.y-26,h:52,action:{type:'level',themeId:a.router.current.params.themeId,index:Number(n.id.slice(-1))-1}});
    if(a.renderer.layout.quiz&&!v.modal&&!v.exitRequested)list.sort((x,y)=>{const rank=t=>t.action.type==='option'?t.action.index:t.id==='quiz-exit'?10:t.id==='confirm'?11:8;return rank(x)-rank(y)});
    return list;
  }
  function label(t,a){const q=a.feedback?a.feedback.question:a.challenge?.question;
    if(t.action.type==='option')return 'ABCD'[t.action.index]+'，'+q.options[t.action.index];
    if(t.label)return t.label;
    if(t.action.type==='theme')return ({red:'十步芳草',culture:'千年文脉',industry:'金色产业',ecology:'青山绿水'})[t.action.themeId]+'，进入主题地图';
    if(t.action.type==='level')return '第'+(t.action.index+1)+'关，'+({locked:'未解锁',current:'当前关卡',complete:'已通关','today-locked':'今日锁定，仅当前关卡受影响'})[a.themeProgress[t.action.themeId].nodes[t.action.index]];
    if(t.id==='ranking')return '排行榜，暂未开放';if(t.id==='certificates')return '证书，暂未开放';
    return t.id==='media-retry'?'重新加载题目图片':t.id;
  }
  function reveal(t,a){const r=a.renderer,region=r.scrollRegion;if(!region)return;
    const rect=t.action.type==='option'?r.layout.quiz?.options[t.action.index]:(()=>{const n=r.layout.map?.nodes.find(n=>n.id===t.id);return n?{y:n.y-26,h:52}:null})();
    if(!rect)return; if(rect.y<region.y)r.scrollBy(rect.y-region.y);else if(rect.y+rect.h>region.y+region.h)r.scrollBy(rect.y+rect.h-region.y-region.h);
  }
  const sync=a=>{
    const list=descriptors(a),ids=new Set(list.map(t=>t.id)),v=a.viewState(),q=a.feedback?a.feedback.question:a.challenge?.question;
    const modal=v.exitRequested?'exit':v.modal||'';
    if(modal!==modalKey){if(modal){previousFocus=document.activeElement?.dataset.quizId;group.setAttribute('role','dialog');group.setAttribute('aria-modal','true');group.setAttribute('aria-label',modal==='exit'?'退出试玩确认':'本题答错，试玩复活暂未开放');}else{group.setAttribute('role','group');group.removeAttribute('aria-modal');group.setAttribute('aria-label','趣味闯关操作');}modalKey=modal;}
    const lostFocus=group.contains(document.activeElement)&&!ids.has(document.activeElement.dataset.quizId);
    for(const [id,b]of nodes)if(!ids.has(id)){b.remove();nodes.delete(id);}
    context.textContent=v.exitRequested?'退出后本次作答不会保留，正式进度与积分不受影响。':v.modal==='revive'?'本次试玩结束，分享复活暂未开放，可以返回地图再次试玩。正式关卡：分享成功后重答当前题，每关仅一次；复活后再错，仅当前关卡今日锁定。':q&&a.router.current.name==='quiz'?`${q.themeName}，第${q.levelOrder}关，第${q.position}题，共${q.total}题。${q.title}。${q.media?.caption||''}`:a.router.current.name==='result'?(v.localCampaign?`${v.result.themeName}，第${v.result.levelOrder}关本地试玩通关。10题全部答对。本次试玩积分${v.localCompletion?.earned||0}，累计本地试玩积分${v.localTotal}。${({saving:'保存中',saved:'已保存到当前浏览器',restored:'已恢复本机进度',unsaved:'未保存，可重试存档','session-only':'仅会话有效，刷新后不保留','needs-confirmation':'存档需要确认'})[v.localStorageStatus]||'尚未保存'}。${v.result.levelOrder<4?'下一关已解锁':'本主题四关完成'}。不计正式进度和积分。`:`${v.result.themeName}，十题试玩完成。答对${v.result.correct}题，作答${v.result.attempts}次。不计正式进度和积分。`):'乡村知识闯关';
    for(const t of list){let b=nodes.get(t.id);if(!b){b=document.createElement('button');b.type='button';b.dataset.quizId=t.id;b.setAttribute('aria-describedby',context.id);b.addEventListener('focus',()=>{const a=getApp();const t=descriptors(a).find(t=>t.id===b.dataset.quizId);if(t)reveal(t,a)});b.addEventListener('click',()=>{const a=getApp(),t=descriptors(a).find(t=>t.id===b.dataset.quizId);if(t&&!t.disabled){a.handle(t.action);a.input.cancel();}});nodes.set(t.id,b);group.append(b);}
      b.disabled=!!t.disabled;b.setAttribute('aria-label',label(t,a));
      if(t.action.type==='option')b.setAttribute('aria-pressed',String(a.challenge?.selected===t.action.index));else b.removeAttribute('aria-pressed');
      const s=a.viewport.scale;b.style.left=t.x*s+'px';b.style.top=t.y*s+'px';b.style.width=t.w*s+'px';b.style.height=t.h*s+'px';
      // Reorder existing elements without replacing focused controls.
    }
    const status=v.exitRequested?'要退出本次试玩吗？退出后本次作答不保留，正式进度和积分不受影响。':v.modal==='revive'?'本题答错。本次试玩结束，分享复活暂未开放。可以返回地图再次试玩。':a.feedback?'答对了。'+a.feedback.explanation:a.toast||context.textContent;
    if(status!==lastStatus){live.textContent=status;lastStatus=status;}
    if(keyboard&&lostFocus){const restore=nodes.get(previousFocus);const next=modal?list.find(t=>!t.disabled):restore&&!restore.disabled?{id:previousFocus}:list.find(t=>!t.disabled);if(next)nodes.get(next.id)?.focus();if(!modal)previousFocus=null;}
  };
  const keys=e=>{if(!getApp())return;if(e.key==='Tab'){keyboard=true;if(modalKey){const bs=[...nodes.values()].filter(b=>!b.disabled),i=bs.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();bs.at(-1)?.focus()}else if(!e.shiftKey&&(i===bs.length-1||i<0)){e.preventDefault();bs[0]?.focus()}}}if(e.key==='Escape'&&group.contains(document.activeElement)){e.preventDefault();const a=getApp();if(a.exitRequested)a.handle({type:'exit-cancel'});else if(a.router.current.name==='quiz'&&!a.viewState().modal)a.handle({type:'exit-request'});}};
  document.addEventListener('keydown',keys);canvas.addEventListener('pointerdown',()=>{keyboard=false});
  return sync;
};
