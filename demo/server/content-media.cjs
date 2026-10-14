'use strict';
// Add relevant, original teaching media to pending experience content only.
const MEDIA = {
  'HN-ECOLOGY-1-09':{type:'image',url:'/images/v2-style03/wetland-observation.jpg',alt:'湿地生态观察插画，场景示意，不是洞庭湖实景。',caption:'湿地生态观察示意 · 非实景',required:false},
  'HN-ECOLOGY-2-04':{type:'image',url:'/images/v2-style03/wetland-observation.jpg',alt:'水面、浅滩与周边植物组成多样湿地生境的插画。',caption:'湿地生境示意 · 非实景',required:false},
  'HN-ECOLOGY-3-05':{type:'video',url:'/media/observation.mp4',alt:'6秒原创观察动画，水生动物在片段中多次出现，不是实际监测记录。',caption:'原创观察动画 · 非实际监测',required:false},
};
async function installContentMedia(store) {
  await store.transaction(async tx=>{
    if(await tx.get('meta','experience-media-v1'))return;
    for(const [id,media]of Object.entries(MEDIA)){
      const q=await tx.get('questions',id);
      if(q && q.source==='source-bank-pending-review'&&!q.approved&&!q.deleted&&!q.media){q.media=media;q.version++;await tx.set('questions',id,q);}
    }
    await tx.set('meta','experience-media-v1',{version:1});
  });
}
module.exports={MEDIA,installContentMedia};
