'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('./v4-page.cjs');
async function earned(options={}){const e=environment({levelCount:1,...options});await e.begin();await e.answer(0);await e.action('next');e.page.go('certificate');return e;}
const issued=e=>JSON.stringify({certificate:e.service.snapshot().certificates,points:e.service.snapshot().points});

test('all four themes share one generated PNG between preview, save and repeated refreshes',async()=>{
 for(const gameId of ['red','culture','industry','ecology']){const e=await earned({gameId});try{
  const before=issued(e);assert(e.page.data.certificateImageLoading);assert(e.page.data.footerDisabled);
  const file=await e.page.prepareCertificate();for(let i=0;i<5;i++)e.page.refresh();
  await e.page.saveCertificate();assert.deepEqual(e.albumPaths,[file]);assert.equal(e.canvasStats().canvasExports,1);
  assert.equal(e.page.data.certificateSaveMessage,'证书图片已保存到相册');assert.equal(e.page.data.busy,false);assert.equal(issued(e),before);
 }finally{e.page.onUnload();}}
});
test('failed generation stays failed through refresh and retries only on an explicit action',async()=>{
 const e=await earned({canvasExportFails:true});try{const before=issued(e);await assert.rejects(e.page.prepareCertificate());
  assert.equal(e.page.data.footerAction,'retry-certificate');for(let i=0;i<5;i++)e.page.refresh();await Promise.resolve();assert.equal(e.canvasStats().canvasExports,1);
  await e.page.saveCertificate();assert.equal(e.page.data.modal,'');assert.equal(e.albumPaths.length,0);
  e.setCanvasExportFailure(false);await e.action('retry-certificate');assert(e.page.data.certificateImage);assert.equal(e.page.data.certificateImageLoading,false);assert.equal(e.page.data.footerAction,'save');assert.equal(issued(e),before);
 }finally{e.page.onUnload();}
});
test('known denied album permission opens guidance without making an album write',async()=>{
 const e=await earned();try{e.wx.getSetting=o=>o.success({authSetting:{'scope.writePhotosAlbum':false}});await e.page.saveCertificate();
  assert.equal(e.page.data.modal,'album-permission');assert.equal(e.albumPaths.length,0);assert.equal(e.page.data.busy,false);assert.equal(e.page.data.modalAction,'album-settings');
 }finally{e.page.onUnload();}
});
test('explicit settings action handles denied, failed and granted results without an automatic save',async()=>{
 const e=await earned();try{await e.page.prepareCertificate();e.page.showModal('album-permission');let calls=0;
  e.wx.openSetting=o=>{calls++;o.success({authSetting:{'scope.writePhotosAlbum':false}});o.complete();};await e.action('album-settings');assert.equal(calls,1);assert.equal(e.page.data.modal,'album-permission');assert.equal(e.page.data.busy,false);
  e.wx.openSetting=o=>{o.fail({errMsg:'openSetting:fail'});o.complete();};await e.action('album-settings');assert.equal(e.toasts.at(-1),'暂未打开设置，请稍后重试');assert.equal(e.page.data.busy,false);
  e.wx.openSetting=o=>{o.success({authSetting:{'scope.writePhotosAlbum':true}});o.complete();};await e.action('album-settings');assert.equal(e.page.data.modal,'');assert.equal(e.albumPaths.length,0);assert.equal(e.toasts.at(-1),'权限已开启，请再次点击保存');
 }finally{e.page.onUnload();}
});
test('first save can ask permission and a denial receives the permission-specific recovery',async()=>{
 const e=await earned();try{e.wx.getSetting=o=>o.success({authSetting:{}});e.wx.saveImageToPhotosAlbum=o=>o.fail({errMsg:'saveImageToPhotosAlbum:fail auth deny'});await e.page.saveCertificate();assert.equal(e.page.data.modal,'album-permission');assert.equal(e.page.data.certificateSaveMessage,'');}finally{e.page.onUnload();}
});
test('cancelled album save has no permission error and preserves the award',async()=>{
 const e=await earned();try{const before=issued(e);e.wx.saveImageToPhotosAlbum=o=>o.fail({errMsg:'saveImageToPhotosAlbum:fail cancel'});await e.page.saveCertificate();assert.equal(e.page.data.modal,'');assert.equal(e.page.data.certificateSaveMessage,'');assert.equal(e.toasts.at(-1),'已取消保存，可随时再试');assert.equal(issued(e),before);}finally{e.page.onUnload();}
});
test('ordinary save failure can retry the same image without claiming permission was denied',async()=>{
 const e=await earned();try{await e.page.prepareCertificate();const save=e.wx.saveImageToPhotosAlbum;e.wx.saveImageToPhotosAlbum=o=>o.fail({errMsg:'saveImageToPhotosAlbum:fail disk error'});await e.page.saveCertificate();assert.equal(e.page.data.modal,'save-failure');assert.equal(e.page.data.modalAction,'save');e.wx.saveImageToPhotosAlbum=save;await e.action('save');assert.equal(e.page.data.modal,'');assert.equal(e.albumPaths.length,1);assert.equal(e.canvasStats().canvasExports,1);}finally{e.page.onUnload();}
});
test('simultaneous save attempts make a single album request',async()=>{
 const e=await earned();try{await e.page.prepareCertificate();let finish,calls=0;e.wx.saveImageToPhotosAlbum=o=>{calls++;finish=o.success;};const first=e.page.saveCertificate();while(!finish)await new Promise(r=>setImmediate(r));await e.page.saveCertificate();assert.equal(calls,1);finish({});await first;assert.equal(e.page.data.busy,false);}finally{e.page.onUnload();}
});
test('leaving while checking permission prevents a write or a stale error on the destination',async()=>{
 const e=await earned();try{await e.page.prepareCertificate();let finish;e.wx.getSetting=o=>{finish=o.success;};const pending=e.page.saveCertificate();while(!finish)await new Promise(r=>setImmediate(r));e.page.go('home');finish({authSetting:{'scope.writePhotosAlbum':false}});await pending;assert.equal(e.albumPaths.length,0);assert.equal(e.page.data.modal,'');assert.equal(e.page.data.busy,false);}finally{e.page.onUnload();}
});
test('a save callback after unload does not show success or update the destroyed page',async()=>{
 const e=await earned();await e.page.prepareCertificate();let finish;e.wx.saveImageToPhotosAlbum=o=>{finish=o.success;};const pending=e.page.saveCertificate();while(!finish)await new Promise(r=>setImmediate(r));e.page.onUnload();const patches=e.patches.length;finish({});await pending;assert.equal(e.patches.length,patches);assert(!e.toasts.includes('证书图片已保存到相册'));
});
test('browser download feedback does not claim a phone album write',async()=>{
 const e=await earned();try{e.wx.saveImageToPhotosAlbum=o=>o.success({destination:'download'});await e.page.saveCertificate();assert.equal(e.page.data.certificateSaveMessage,'已发起证书图片下载');assert(!e.toasts.includes('证书图片已保存到相册'));}finally{e.page.onUnload();}
});
test('preview failures preserve the image, while stale image errors do not replace it',async()=>{
 const e=await earned();try{const file=await e.page.prepareCertificate();e.wx.previewImage=o=>o.fail({errMsg:'previewImage:fail'});e.page.previewCertificate();assert.equal(e.toasts.at(-1),'暂未打开预览，请稍后重试');assert.equal(e.page.data.certificateImage,file);e.page.certificateImageFailed({currentTarget:{dataset:{src:'outdated.png'}}});assert.equal(e.page.data.certificateImage,file);}finally{e.page.onUnload();}
});
test('a superseded render cannot replace the loading state or image of the newer request',async()=>{
 const e=environment({levelCount:1});try{
  const exports=[];e.wx.canvasToTempFilePath=o=>exports.push(o);await e.begin();await e.answer(0);await e.action('next');e.page.go('certificate');
  const first=e.page.prepareCertificate();while(exports.length<1)await new Promise(r=>setImmediate(r));
  const second=e.page.prepareCertificate(true);exports[0].success({tempFilePath:'/mock-only/outdated.png'});await first;
  assert.equal(e.page.data.certificateImage,'');assert.equal(e.page.data.certificateImageLoading,true);
  while(exports.length<2)await new Promise(r=>setImmediate(r));exports[1].success({tempFilePath:'/mock-only/current.png'});await second;
  assert.equal(e.page.data.certificateImage,'/mock-only/current.png');assert.equal(e.page.data.certificateImageLoading,false);
 }finally{e.page.onUnload();}
});
