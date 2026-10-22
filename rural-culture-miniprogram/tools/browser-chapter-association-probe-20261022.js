(async function(){
 const q=new URLSearchParams(location.hash.split('?')[1]),theme=q.get('theme'),scenario=q.get('scenario'),chapter=Number((scenario||'').replace('chapter-',''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const ready=()=>{const d=window._nativePreview?.page?.data;return d&&!d.loading&&d.skin.gameId===theme&&d.journey.nodes.length&&(!chapter||d.challenge?.levelId===d.journey.nodes[chapter-1]?.id);};
 for(let i=0;i<100&&!ready();i++)await wait(30);
 if(!ready())throw Error('Chapter review not ready');
 const page=window._nativePreview.page;if(page.data.route!=='home')page.go('home');
 await wait(200);
 const stops=[...document.querySelectorAll('.route-stop')],issues=[],rows=[];
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 for(const e of stops){const card=e.querySelector('.route-caption').getBoundingClientRect(),base=e.querySelector('.route-base').getBoundingClientRect(),badge=e.querySelector('.route-node-badge')?.getBoundingClientRect(),actor=e.querySelector('.chapter-mascot')?.getBoundingClientRect(),connector=e.querySelector('.route-connector')?.getBoundingClientRect(),delta=Math.abs(card.top+card.height/2-base.top-base.height/2),gap=e.classList.contains('right')?base.left-card.right:card.left-base.right;
  const row={id:e.querySelector('.route-caption').dataset.id,card:card.toJSON(),base:base.toJSON(),badge:badge?.toJSON(),actor:actor?.toJSON(),delta,gap};rows.push(row);
  if(delta>1)issues.push({id:row.id,error:'card/base center mismatch',delta});
  if(gap<5||gap>12)issues.push({id:row.id,error:'card/base gap',gap});
  if(connector)issues.push({id:row.id,error:'connector must not be added'});
  if(badge&&(badge.top<base.top-1||badge.bottom>base.bottom+1||badge.left<base.left-1||badge.right>base.right+1))issues.push({id:row.id,error:'status badge outside its own base'});
 }
 for(let i=0;i<rows.length;i++)for(let j=0;j<rows.length;j++)if(i!==j)for(const kind of ['card','badge','actor'])if(rows[j][kind]&&overlap(rows[i].card,rows[j][kind])>.5)issues.push({card:rows[i].id,other:rows[j].id,kind,error:'neighbour overlap'});
 const body=document.querySelector('scroll-view.panel-body').getBoundingClientRect(),id=page.data.journey.guideId||page.data.journey.nodes.at(-1).id,current=rows.find(r=>r.id===id);
 if(current.card.top<body.top-1||current.card.bottom>body.bottom+1||current.actor&&(current.actor.top<body.top-1||current.actor.bottom>body.bottom+1))issues.push({error:'focused chapter clipped'});
 return {theme,scenario,width:innerWidth,height:innerHeight,passed:!issues.length,maxCenterError:Math.max(...rows.map(r=>r.delta)),issues,rows};
})()
