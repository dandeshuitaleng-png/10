'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const art=require('../miniprogram/services-v4/certificate-art'),presentation=require('../miniprogram/services-v4/visual-feedback');
const {environment}=require('./v4-page.cjs');
function context(){const texts=[];const ctx={font:'20px sans-serif',clearRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},arc(){},createLinearGradient(){return {addColorStop(){}};},measureText(s){const size=Number((this.font.match(/([\d.]+)px/)||[])[1]||20);return {width:Array.from(s).reduce((n,c)=>n+size*(c.charCodeAt(0)>255?1:.55),0)};},fillText(text,x,y){texts.push({text,x,y,font:this.font,align:this.textAlign,color:this.fillStyle});}};return {ctx,texts};}
test('approved copy aliases preserve custom awards, configured prose and the all-theme certificate',()=>{
 const copy=require('../miniprogram/services-v4/certificate-copy');
 for(const source of [{gameId:'red',scope:'game',name:'原创红色阅读荣誉',description:'甲方另行配置的正文'},{gameId:'culture',scope:'all',name:'乡村知识闯关王',description:'总证书配置正文'},{gameId:'custom',scope:'game',name:'原创主题达人',description:'原创主题正文'}])assert.deepEqual(copy.present(source),source);
 for(const name of ['芳草撷英','文脉传薪','兴业腾骧','碧水涵青']){const source={gameId:'culture',scope:'game',name,id:'issued-before-correction',levelIds:['culture-1']},before=JSON.stringify(source);assert.equal(copy.present(source).name,'知识达人');assert.equal(JSON.stringify(source),before);}
});
test('four legacy certificates use the common knowledge honor and gold palette without changing issued records',()=>{
 const awards={red:'知识达人',culture:'知识达人',industry:'知识达人',ecology:'知识达人'};
 for(const [gameId,name] of Object.entries({red:'十步芳草',culture:'千年文脉',industry:'金色产业',ecology:'青山绿水'})){
  const source={gameId,id:'issued-007',displayId:'issued-007',scope:'game',userName:'陈小禾',name:'千年文脉知识达人',description:'已完成本主题全部知识关卡',date:'2026/10/19',levelIds:[gameId+'-1'],footer:'文化阅读活动学习纪念'},before=JSON.stringify(source);
  const d=art.model(source,{gameId,name}),{ctx,texts}=context(),l=art.layout(ctx,d);art.paint(ctx,d,l);
  const all=texts.map(t=>t.text).join('');for(const text of ['荣誉证书','亲爱的 陈小禾',awards[gameId],name+'学习中','认真探索，积累知识。','2026年10月19日','issued-007','特发此证，以资纪念。'])assert(all.includes(text),text);
  assert(!all.includes('个关卡'));assert(!all.includes('千年文脉知识达人'));
  assert.equal(JSON.stringify(source),before);assert.equal(l.height,1280);assert.equal(l.width,900);
  assert(l.awardLeadY>l.body.y+(l.body.rows.length-1)*l.body.lineHeight);assert(l.award.size>=70);assert(l.footer.y>l.issuerY+42);
  assert(texts.filter(t=>t.text.includes(awards[gameId])).every(t=>t.x===450&&t.align==='center'&&t.color==='#B58A2E'));
  assert.equal(presentation.certificateLabel(source).name,awards[gameId]);
 }
});
test('long names, award titles and descriptions wrap without loss or overlapping the signature',()=>{
 const d=art.model({userName:'阅读者ABCDEFGHIJKLMNOPQRSTUVWXYZ·'+ '王小明'.repeat(14),name:'乡村文化知识探索与自然生态保护学习达人',date:'2026/10/19',levelIds:['ecology-1'],description:'探索山水与生物，认识家乡自然。'.repeat(10),footer:'学习活动纪念，不代表学历或教育资格'},{gameId:'ecology',name:'青山绿水'});
 const {ctx,texts}=context(),l=art.layout(ctx,d);art.paint(ctx,d,l);
 assert(l.height>1280);assert.equal(l.recipient.rows.join(''),'亲爱的 '+d.userName);assert.equal(l.body.rows.join(''),d.description);
 for(const block of [l.recipient,l.body,l.award,l.footer]){ctx.font=(block.bold?'bold ':'')+block.size+'px '+block.face;assert(block.rows.every(r=>ctx.measureText(r).width<=720));}
 assert(l.body.y>l.recipient.y+(l.recipient.rows.length-1)*l.recipient.lineHeight);assert(l.awardLeadY>l.body.y+(l.body.rows.length-1)*l.body.lineHeight);assert(l.issuerY>l.award.y+(l.award.rows.length-1)*l.award.lineHeight);assert(texts.every(t=>t.y<l.height-40));
});
test('the actual Page saves the very same certificate PNG shown in its preview',async()=>{
 const env=environment({levelCount:1});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const file=await env.page.prepareCertificate();assert.equal(env.page.data.certificateImage,file);await env.page.saveCertificate();assert.deepEqual(env.albumPaths,[file]);assert.deepEqual(env.canvasStats(),{canvasExports:1,albumRequests:1});}finally{env.page.onUnload();}
});
test('a failed certificate export shows retry and can regenerate without changing the issued award',async()=>{
 const env=environment({levelCount:1,canvasExportFails:true});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const issued=JSON.stringify(env.page.data.certificate);await assert.rejects(env.page.prepareCertificate());assert.equal(env.page.data.certificateImageError,true);assert.equal(env.albumPaths.length,0);env.setCanvasExportFailure(false);await env.page.prepareCertificate(true);assert.equal(env.page.data.certificateImageError,false);assert(env.page.data.certificateImage);assert.equal(JSON.stringify(env.page.data.certificate),issued);}finally{env.page.onUnload();}
});
test('tapping a certificate previews the current document and a lost image can be regenerated',async()=>{
 const env=environment({levelCount:1});try{await env.begin();await env.answer(0);await env.action('next');env.page.go('certificate');const file=await env.page.prepareCertificate();env.page.previewCertificate();assert.equal(env.imagePreviews[0].current,file);assert.deepEqual(env.imagePreviews[0].urls,[file]);env.page.certificateImageFailed();assert.equal(env.page.data.certificateImage,'');assert.equal(env.page.data.certificateImageError,true);await env.page.prepareCertificate(true);assert.equal(env.page.data.certificateImageError,false);assert.equal(env.canvasStats().canvasExports,2);}finally{env.page.onUnload();}
});

test('Chinese punctuation cannot be stranded at the beginning of a wrapped line',()=>{
 const {ctx}=context();const text='在乡村文化与自然生态的学习探索中，认真思考，积累新知。'.repeat(6),d=art.model({userName:'陈小禾',name:'知识达人',description:text,levelIds:['a']},{gameId:'ecology',name:'青山绿水'});const l=art.layout(ctx,d);assert.equal(l.body.rows.join(''),text);assert(l.body.rows.every(r=>!/[，。！？；：、）》】」』”’]/.test(r[0])));ctx.font=l.body.size+'px sans-serif';assert(l.body.rows.every(r=>ctx.measureText(r).width<=710));
});
test('configured certificate titles wrap within the approved paper and keep all recipient and award text below',()=>{
 for(const title of ['乡村阅读荣誉证书','趣味闯关 · 电子荣誉证书','乡村阅读与文化知识探索活动荣誉证书'.repeat(6)]){
  const d=art.model({title,userName:'陈小禾',name:'乡村知识闯关王',levelIds:['one'],description:'配置的证书正文',footer:'配置的证书页脚'},{gameId:'ecology',name:'青山绿水'}),{ctx,texts}=context(),l=art.layout(ctx,d);art.paint(ctx,d,l);
  assert.equal(l.title.rows.join(''),title);assert(l.recipient.y>l.title.y+(l.title.rows.length-1)*l.title.lineHeight+100);
  ctx.font='bold '+l.title.size+'px serif';assert(l.title.rows.every(row=>ctx.measureText(row).width<=650));assert.equal(texts.filter(t=>t.y>=l.title.y&&t.y<l.recipient.y-56).map(t=>t.text).join(''),title);assert(texts.some(t=>t.text==='配置的证书正文'));assert(l.footer.y>l.issuerY+42);
 }
});
