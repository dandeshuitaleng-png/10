// Evaluate through the supported browser CDP capability on the disposable
// review fixture. Real DOM, Canvas2D pixels and requestAnimationFrame; no mocks.
(async function () {
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const query=new URLSearchParams(location.hash.split('?')[1]),scenario=query.get('scenario'),theme=query.get('theme'),chapter=Number((scenario||'').replace('chapter-',''));
  const ready=()=>{const d=window._nativePreview?.page?.data;return d&&!d.loading&&d.skin.gameId===theme&&d.journey.nodes.length&&(!chapter||(d.route==='quiz'&&d.challenge?.levelId===d.journey.nodes[chapter-1]?.id));};
  for(let i=0;i<100&&!ready();i++)await wait(30);
  if(!ready())throw Error('Review scenario did not finish loading');
  const page=window._nativePreview.page;
  if(page.data.route!=='home')page.go('home');
  await wait(250);
  const panel=document.querySelector('scroll-view.panel-body');
  const button=document.querySelector('.route-stop.current .chapter-mascot')||document.querySelector('.route-stop.today-locked .chapter-mascot');
  if(!button)throw Error('Review scenario has no current reached actor');
  const base=button.closest('.route-stop'),canvas=button.querySelector('canvas'),image=button.querySelector('.gesture-original');
  for(let i=0;i<100&&(!canvas._mascotAnimator||!image.complete);i++)await wait(30);
  if(!canvas._mascotAnimator)throw Error('Animator not ready');
  // Read the original image's opaque foot row; the gesture never deforms feet.
  const reference=document.createElement('canvas');reference.width=image.naturalWidth;reference.height=image.naturalHeight;
  reference.getContext('2d').drawImage(image,0,0);
  function foot(c){const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let y=c.height-1;y>=0;y--)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>80)return y+1;return null;}
  const originalFoot=foot(reference),initialOffset=button.getBoundingClientRect().top-base.getBoundingClientRect().top;
  const originalScroll=panel.scrollTop,maxScroll=panel.scrollHeight-panel.clientHeight;
  const result={theme:page.data.skin.gameId,pose:canvas.dataset.mascotPose,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,frames:0,animatedFrames:0,stillFrames:0,scrollMin:Infinity,scrollMax:0,maxFootError:0,maxAnchorError:0,maxPlaneError:0,maxMatrixError:0,buffer:[canvas.width,canvas.height],violations:[]};
  button.click();
  for(let i=0;i<100;i++){
    // Multiple direction reversals, followed by edge clipping and return.
    if(i<60)panel.scrollTop=Math.max(0,Math.min(maxScroll,originalScroll+Math.sin(i/5)*48));
    else if(i<75)panel.scrollTop=0;
    else panel.scrollTop=originalScroll;
    if(i===12||i===24||i===36||i===78)button.click();
    await frame();
    const a=button.getBoundingClientRect(),b=base.getBoundingClientRect(),r=canvas.getBoundingClientRect(),s=image.getBoundingClientRect(),matrix=canvas.getContext('2d').getTransform();
    const anchorError=Math.abs(a.top-b.top-initialOffset),planeError=Math.max(Math.abs(r.top-s.top),Math.abs(r.left-s.left),Math.abs(r.width-s.width),Math.abs(r.height-s.height));
    const matrixError=Math.max(Math.abs(matrix.a-canvas.width/image.naturalWidth),Math.abs(matrix.d-canvas.height/image.naturalHeight));
    result.frames++;result.scrollMin=Math.min(result.scrollMin,panel.scrollTop);result.scrollMax=Math.max(result.scrollMax,panel.scrollTop);
    result.maxAnchorError=Math.max(result.maxAnchorError,anchorError);result.maxPlaneError=Math.max(result.maxPlaneError,planeError);result.maxMatrixError=Math.max(result.maxMatrixError,matrixError);
    const playing=canvas.dataset.playing==='true',row=foot(canvas);
    if(playing&&getComputedStyle(canvas).opacity==='1'){
      result.animatedFrames++;
      if(row===null)result.violations.push({frame:i,error:'empty active canvas'});
      else {const expected=s.top+originalFoot/image.naturalHeight*s.height,actual=r.top+row/canvas.height*r.height,delta=Math.abs(actual-expected);result.maxFootError=Math.max(result.maxFootError,delta);if(delta>1)result.violations.push({frame:i,error:'foot displacement',delta});}
    }else{result.stillFrames++;if(row!==null)result.violations.push({frame:i,error:'stopped canvas retains pixels'});}
    if(canvas.width!==result.buffer[0]||canvas.height!==result.buffer[1])result.violations.push({frame:i,error:'buffer reset'});
    if(anchorError>1||planeError>1||matrixError>.0001)result.violations.push({frame:i,error:'coordinate mismatch',anchorError,planeError,matrixError});
  }
  panel.scrollTop=originalScroll;
  result.passed=result.violations.length===0&&result.animatedFrames>5&&result.scrollMax-result.scrollMin>20;
  return result;
})()
