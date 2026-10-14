const test=require('node:test'),assert=require('node:assert/strict');
const {installWechatMedia}=require('../js/platform/wechat-media');
test('native certificate rejects an unowned ID before generating a file',async()=>{
  let created=false;const download=installWechatMedia({}, {createCanvas(){created=true;}}, {request:async url=>url==='/api/me'?{user:{name:'玩家'}}:{certificates:[]}}, 'https://game.example');
  await assert.rejects(download('/api/certificates/other-user.svg'),/尚未获得/);assert.equal(created,false);
});
test('native certificate uses authenticated metadata, creates PNG and retains preview when album permission fails',async()=>{
  const texts=[],calls=[];const ctx={fillRect(){},strokeRect(){},fillText(text){texts.push(text);}};
  const api={createCanvas:()=>({getContext:()=>ctx,toTempFilePath(options){assert.equal(options.fileType,'png');options.success({tempFilePath:'/temp/certificate.png'});}}),showModal:o=>o.success({confirm:true}),saveImageToPhotosAlbum:o=>{calls.push(o.filePath);o.fail();},previewImage:o=>calls.push(o.urls[0]),showToast(){}};
  const client={request:async url=>url==='/api/me'?{user:{name:'服务端玩家'}}:{certificates:[{id:'owned',name:'红色故事通',themeId:'red',day:'2026-10-12',contentApprovalPending:true}]}};
  const download=installWechatMedia({},api,client,'https://game.example');await assert.rejects(download('/api/certificates/owned.svg'),/相册保存未完成/);
  assert.ok(texts.includes('服务端玩家'));assert.ok(texts.some(t=>t.includes('体验版学习记录')));assert.deepEqual(calls,['/temp/certificate.png','/temp/certificate.png']);
});
test('native video has explicit close, clears on error/end and preserves an absolute local test URL',()=>{
  let ended,error,destroyed=0,src;const p={},api={getWindowInfo:()=>({windowWidth:390,windowHeight:844}),createVideo:o=>{src=o.src;return {onEnded(fn){ended=fn;},onError(fn){error=fn;},destroy(){destroyed++;}}},showToast(){}};
  installWechatMedia(p,api,{},'http://127.0.0.1:63112');p.playVideo('http://127.0.0.1:63112/media/observation.mp4');assert.equal(src,'http://127.0.0.1:63112/media/observation.mp4');assert.equal(p.videoActive(),true);p.closeVideo();assert.equal(p.videoActive(),false);p.playVideo('/media/observation.mp4');ended();p.playVideo('/media/observation.mp4');error();assert.equal(destroyed,3);assert.equal(p.videoActive(),false);
});
test('native certificate sharing uses owned configurable metadata and PNG without claiming verified completion',async()=>{
  const texts=[],calls=[];const ctx={fillRect(){},strokeRect(){},fillText(t){texts.push(t);}};
  const api={createCanvas:()=>({getContext:()=>ctx,toTempFilePath:o=>o.success({tempFilePath:'/temp/owned.png'})}),showModal:o=>o.success({confirm:true}),shareAppMessage:o=>calls.push(o)};
  const client={request:async url=>url==='/api/me'?{user:{name:'实名读取'}}:{certificates:[{id:'owned',name:'新主题荣誉',title:'学习证书',description:'已完成本主题5关',footer:'活动纪念',day:'2026-10-13'}]}};
  const download=installWechatMedia({},api,client,'https://game.example');assert.equal(await download.share('/api/certificates/owned.svg'),undefined);
  assert.ok(texts.includes('已完成本主题5关'));assert.ok(texts.includes('活动纪念'));assert.deepEqual(calls,[{title:'新主题荣誉',imageUrl:'/temp/owned.png'}]);
  await assert.rejects(download.share('/api/certificates/not-owned.svg'),/尚未获得/);assert.equal(calls.length,1);
});
