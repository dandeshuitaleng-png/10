// Native media are tied to the authenticated server record, never local progress.
function installWechatMedia(platform, api, client, baseUrl) {
  let video=null;
  platform.videoActive=()=>!!video;
  platform.closeVideo=()=>{if(video){video.destroy();video=null;}};
  platform.playVideo=src=>{
    if(!src)return;platform.closeVideo();
    const info=api.getWindowInfo?api.getWindowInfo():api.getSystemInfoSync();
    video=api.createVideo({x:12,y:info.windowHeight*.28,width:info.windowWidth-24,height:Math.min(240,info.windowHeight*.4),src:/^https?:/.test(src)?src:baseUrl+'/'+src.replace(/^\//,''),controls:true,autoplay:false});
    video.onEnded(platform.closeVideo);
    video.onError(()=>{platform.closeVideo();api.showToast({title:'视频加载失败，可重试',icon:'none'});});
  };
  const generate=async url=>{
    const match=/\/api\/certificates\/([^/]+)\.svg$/.exec(url);
    if(!match)throw Error('证书地址不正确。');
    const [data,me]=await Promise.all([client.request('/api/certificates'),client.request('/api/me')]);
    const certificate=data.certificates.find(c=>c.id===decodeURIComponent(match[1]));
    if(!certificate)throw Error('证书尚未获得，请完成相应挑战。');
    const canvas=api.createCanvas();canvas.width=1200;canvas.height=850;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f5e9';ctx.fillRect(0,0,1200,850);
    ctx.strokeStyle='#287d7d';ctx.lineWidth=5;ctx.strokeRect(40,40,1120,770);
    ctx.strokeStyle='#dba747';ctx.lineWidth=2;ctx.strokeRect(65,65,1070,720);
    ctx.textAlign='center';ctx.textBaseline='middle';
    const text=(value,y,size,color='#214c4c',weight='normal')=>{ctx.font=weight+' '+size+'px sans-serif';ctx.fillStyle=color;ctx.fillText(value,600,y,1000);};
    text(certificate.title||'趣味闯关 · 电子荣誉证书',205,36,'#287d7d');
    text(certificate.name,310,58,'#214c4c','bold');text(me.user.name,420,38);
    text(certificate.description||('已完成'+(certificate.themeId?'本主题四关':'四个主题共十六关')+'乡村知识挑战'),505,27,'#456767');
    text('完成日期：'+certificate.day+' · '+(certificate.contentApprovalPending?'体验版学习记录':'正式挑战记录'),575,25,'#456767');
    text('证书编号：'+certificate.id,675,20,'#658080');text(certificate.footer||'学习活动纪念，不代表学历或教育资格',728,18,'#658080');
    const file=await new Promise((resolve,reject)=>canvas.toTempFilePath({fileType:'png',success:r=>resolve(r.tempFilePath),fail:()=>reject(Error('证书图片生成失败，请重试。'))}));
    return {file,certificate};
  };
  const download=async url=>{
    const {file}=await generate(url);
    const choice=await new Promise(resolve=>api.showModal({title:'证书已生成',content:'可预览证书或保存到相册。保存时微信会请求相册权限。',confirmText:'保存相册',cancelText:'预览证书',success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
    if(!choice){api.previewImage({urls:[file],current:file});return;}
    await new Promise((resolve,reject)=>api.saveImageToPhotosAlbum({filePath:file,success:()=>{api.showToast({title:'证书已保存',icon:'success'});resolve();},fail:()=>{api.previewImage({urls:[file],current:file});reject(Error('证书已生成。相册保存未完成，可在预览中手动保存。'));}}));
  };
  download.share=async url=>{
    const {file,certificate}=await generate(url);
    const confirmed=await new Promise(resolve=>api.showModal({title:'分享证书',content:'将已获得的证书图片用于分享。也可先预览图片。',confirmText:'分享证书',cancelText:'预览',success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
    if(!confirmed){api.previewImage({urls:[file],current:file});return;}
    if(typeof api.shareAppMessage!=='function'){api.previewImage({urls:[file],current:file});throw Error('当前环境请从预览保存证书后分享。');}
    api.shareAppMessage({title:certificate.name,imageUrl:file});
    // Opening the system share flow is not evidence of a completed share and
    // must never grant a revival or alter the server's progress.
  };
  return download;
}
module.exports={installWechatMedia};
