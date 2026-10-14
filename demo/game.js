const {createWechatPlatform}=require('./js/platform/wechat');
const {OnlineApp}=require('./js/online-app');
const {HttpClient,wechatTransport}=require('./js/services/http-client');
const config=require('./js/runtime-config');
const {installWechatMedia}=require('./js/platform/wechat-media');
const platform=createWechatPlatform();
platform.resolveMediaUrl=src=>src.startsWith('/')?config.baseUrl+src:src;
const client=new HttpClient({baseUrl:config.baseUrl,transport:wechatTransport(wx),token:wx.getStorageSync('quiz:session-token')||null});
const sounds=new Map();
platform.effect=(name,enabled)=>{
  if(!enabled)return;
  try{if(!sounds.has(name)){const audio=wx.createInnerAudioContext();audio.src='audio/'+name+'.wav';sounds.set(name,audio);}const audio=sounds.get(name);audio.stop();audio.play();if(name==='correct'&&wx.vibrateShort)wx.vibrateShort({type:'light'});}catch(_){}
};
const download=installWechatMedia(platform,wx,client,config.baseUrl);
new OnlineApp(platform,{client,
  authenticate:async()=>{
    const data=await client.request('/api/auth/dev',{name:'乡村探索者',deviceId:wx.getStorageSync('quiz:experience-device')||undefined});client.token=data.token;
    wx.setStorageSync('quiz:experience-device',data.deviceId);
    if(data.token)wx.setStorageSync('quiz:session-token',data.token);
  },
  share:async({type,challenge,mode,settings={},reviveSettings={}})=>{
    const imageUrl=settings.image?platform.resolveMediaUrl(settings.image):undefined;
    if(type!=='revive'){wx.shareAppMessage({title:settings.title||settings.text||'沿着小路，发现家乡 · 趣味闯关',imageUrl});return null;}
    if(mode!=='experience'&&mode!=='development'){wx.shareAppMessage({title:reviveSettings.shareText||settings.title||'一起来挑战乡村知识',imageUrl:reviveSettings.shareImage?platform.resolveMediaUrl(reviveSettings.shareImage):imageUrl});throw Error('分享完成验证尚未配置。');}
    return new Promise(resolve=>wx.showModal({title:'体验版复活',content:`当前使用测试复活，不代表已验证真实分享完成。本次挑战剩余${challenge.revivesRemaining??1}次。`,confirmText:'体验复活',cancelText:'返回',success:r=>resolve(r.confirm?{type:'experience-test',challengeId:challenge.id}:null),fail:()=>resolve(null)}));
  },
  download,shareCertificate:download.share,
}).start();
