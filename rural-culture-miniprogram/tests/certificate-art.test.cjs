'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const art=require('../miniprogram/services-v4/certificate-art'),presentation=require('../miniprogram/services-v4/visual-feedback');
const {environment}=require('./v4-page.cjs');
function context(){const texts=[];const ctx={font:'20px sans-serif',clearRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},arc(){},createLinearGradient(){return {addColorStop(){}};},measureText(s){const size=Number((this.font.match(/([\d.]+)px/)||[])[1]||20);return {width:Array.from(s).reduce((n,c)=>n+size*(c.charCodeAt(0)>255?1:.55),0)};},fillText(text,x,y){texts.push({text,x,y,font:this.font,align:this.textAlign});}};return {ctx,texts};}
test('four themed formal certificates keep issued content, date and source records',()=>{
 for(const [gameId,name] of Object.entries({red:'十步芳草',culture:'千年文脉',industry:'金色产业',ecology:'青山绿水'})){
  const source={id:'issued-007',displayId:'issued-007',scope:'game',userName:'陈小禾',name:name+'知识达人',date:'2026/10/19',levelIds:[gameId+'-1'],footer:'文化阅读活动学习纪念'},before=JSON.stringify(source);
  const d=art.model(source,{gameId,name}),{ctx,texts}=context(),l=art.layout(ctx,d);art.paint(ctx,d,l);
  const all=texts.map(t=>t.text).join('');for(const text of ['荣誉证书','陈小禾',name+'知识达人','2026年10月19日','issued-007','1 个关卡','特发此证，以资纪念。'])assert(all.includes(text),text);
  assert.equal(JSON.stringify(source),before);assert.equal(l.height,1280);assert.equal(l.width,900);
  assert(l.award.y>l.scope.y+(l.scope.rows.length-1)*l.scope.lineHeight);assert(l.footer.y>l.issuerY+42);
 }
});
test('long names, award titles and descriptions wrap without loss or overlapping the signature',()=>{
 const d=art.model({userName:'阅读者ABCDEFGHIJKLMNOPQRSTUVWXYZ·'+ '王小明'.repeat(14),name:'乡村文化知识探索与自然生态保护学习达人',date:'2026/10/19',levelIds:['ecology-1'],description:'探索山水与生物，认识家乡自然。'.repeat(10),footer:'学习活动纪念，不代表学历或教育资格'},{gameId:'ecology',name:'青山绿水'});
 const {ctx,texts}=context(),l=art.layout(ctx,d);art.paint(ctx,d,l);
 assert(l.height>1280);assert.equal(l.recipient.rows.join(''),d.userName);assert.equal(l.body.rows.join(''),d.description);
 for(const block of [l.recipient,l.body,l.scope,l.award,l.footer]){ctx.font=(block.bold?'bold ':'')+block.size+'px '+block.face;assert(block.rows.every(r=>ctx.measureText(r).width<=720));}
 assert(l.body.y>l.recipient.y+(l.recipient.rows.length-1)*l.recipient.lineHeight);assert(l.scope.y>l.body.y+(l.body.rows.length-1)*l.body.lineHeight);assert(l.issuerY>l.award.y+(l.award.rows.length-1)*l.award.lineHeight);assert(texts.every(t=>t.y<l.height-40));
});
test('the actual Page saves the very same certificate PNG shown in its preview',async()=>{
 const env=environment({levelCount:1});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const file=await env.page.prepareCertificate();assert.equal(env.page.data.certificateImage,file);await env.page.saveCertificate();assert.deepEqual(env.albumPaths,[file]);assert.deepEqual(env.canvasStats(),{canvasExports:1,albumRequests:1});}finally{env.page.onUnload();}
});
test('a failed certificate export shows retry and can regenerate without changing the issued award',async()=>{
 const env=environment({levelCount:1,canvasExportFails:true});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const issued=JSON.stringify(env.page.data.certificate);await assert.rejects(env.page.prepareCertificate());assert.equal(env.page.data.certificateImageError,true);assert.equal(env.albumPaths.length,0);env.setCanvasExportFailure(false);await env.page.prepareCertificate();assert.equal(env.page.data.certificateImageError,false);assert(env.page.data.certificateImage);assert.equal(JSON.stringify(env.page.data.certificate),issued);}finally{env.page.onUnload();}
});
test('tapping a certificate previews the current document and a lost image can be regenerated',async()=>{
 const env=environment({levelCount:1});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const file=await env.page.prepareCertificate();env.page.previewCertificate();assert.deepEqual(env.imagePreviews,[{current:file,urls:[file]}]);env.page.certificateImageFailed();assert.equal(env.page.data.certificateImage,'');assert.equal(env.page.data.certificateImageError,true);await env.page.prepareCertificate();assert.equal(env.page.data.certificateImageError,false);assert.equal(env.canvasStats().canvasExports,2);}finally{env.page.onUnload();}
});

test('Chinese punctuation cannot be stranded at the beginning of a wrapped line',()=>{
 const {ctx}=context();const text='在乡村文化与自然生态的学习探索中，认真思考，积累新知。'.repeat(6),d=art.model({userName:'陈小禾',name:'知识达人',description:text,levelIds:['a']},{gameId:'ecology',name:'青山绿水'});const l=art.layout(ctx,d);assert.equal(l.body.rows.join(''),text);assert(l.body.rows.every(r=>!/[，。！？；：、）》】」』”’]/.test(r[0])));ctx.font='42px sans-serif';assert(l.body.rows.every(r=>ctx.measureText(r).width<=710));
});
