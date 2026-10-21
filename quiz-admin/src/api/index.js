import {seed} from '../data/seed.js';
const KEY='quiz-admin-demo-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
const withoutReview=q=>Object.fromEntries(Object.entries(q).filter(([key])=>!['reviewStatus','reviewNote','approved','reviewedBy','reviewedAt'].includes(key)));
const clean=data=>({...data,questions:data.questions.map(withoutReview)});
export function validate(kind,q,data){
 const required=k=>{if(typeof q[k]!=='string'||!q[k].trim())throw Error(`${k}不能为空`)};
 required('id');
 if(kind==='themes'){required('name');return}
 if(kind==='rules'){for(const k of ['reviveCount','dailyPointLimit'])if(!Number.isInteger(q[k])||q[k]<0||q[k]>100000)throw Error('复活次数和每日积分上限须为非负整数');return}
 if(!data.themes.some(t=>t.id===q.themeId))throw Error('主题不存在');
 if(kind==='levels'){required('name');for(const k of ['sort','questionCount','timeLimit','points'])if(!Number.isInteger(q[k])||q[k]<(k==='points'?0:1)||q[k]>100000)throw Error('排序、题数、时间须为正整数，积分须为非负整数');return}
 required('title');required('explanation');if(!data.levels.some(l=>l.id===q.levelId&&l.themeId===q.themeId))throw Error('关卡不存在或不属于该主题');
 if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(v=>!v.trim())||new Set(q.options.map(v=>v.trim())).size!==4)throw Error('四个选项须非空且互不重复');
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)throw Error('正确答案须为A—D');
 for(const k of ['imageUrl','videoUrl'])if(q[k]&&!/^https?:\/\/[^\s]+$/i.test(q[k]))throw Error('图片和视频地址须为http或https链接');
}
export function createLocalApi(storage){
 function read(){const raw=storage.getItem(KEY);if(!raw)return seed();try{return clean(JSON.parse(raw))}catch{throw Error('本地数据无法读取，请备份后清理浏览器站点数据')}}
 function write(data){data=clean(data);storage.setItem(KEY,JSON.stringify(data));return clone(data)}
 return {async load(){return clone(read())},async save(kind,item){const d=read();if(kind==='rules'){validate(kind,{...item,id:'rules'},d);d.rules=clone(item)}else{validate(kind,item,d);if(kind==='levels'){const old=d.levels.find(l=>l.id===item.id);if(old&&old.themeId!==item.themeId&&d.questions.some(q=>q.levelId===item.id))throw Error('有题目的关卡不能更换主题')}const i=d[kind].findIndex(v=>v.id===item.id);if(i<0)d[kind].push(clone(item));else d[kind][i]=clone(item)}return write(d)},async remove(kind,id){const d=read();if(kind==='themes'&&(d.levels.some(v=>v.themeId===id)||d.questions.some(v=>v.themeId===id)))throw Error('请先删除该主题下的关卡和题目');if(kind==='levels'&&d.questions.some(v=>v.levelId===id))throw Error('请先删除该关卡下的题目');d[kind]=d[kind].filter(v=>v.id!==id);return write(d)},async import(kind,items){const d=read();const ids=new Set();for(const item of items){if(ids.has(item.id))throw Error(`CSV编号重复：${item.id}`);ids.add(item.id);validate(kind,item,d);const old=d[kind].find(v=>v.id===item.id);if(kind==='levels'&&old&&old.themeId!==item.themeId&&d.questions.some(q=>q.levelId===item.id))throw Error('有题目的关卡不能更换所属主题')}for(const item of items){const i=d[kind].findIndex(v=>v.id===item.id);if(i<0)d[kind].push(item);else d[kind][i]=item}return write(d)}}
}
// Same state shape as the editor; all writes are committed by the backend.
export function createHttpApi(base='/api/local/admin'){
 let current;
 async function request(path='',method='GET',body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Quiz-Management':'1'},body:body?JSON.stringify(body):undefined});const json=await response.json();if(!response.ok)throw Error(json.error?.message||`请求失败（${response.status}）`);return json.data;}
 async function load(){const [config,levelData,questionData,overview]=await Promise.all([request('/config'),request('/levels'),request('/questions'),request('/overview')]);
 const questions=questionData.questions||questionData;
 current={config,overview,themes:config.themes.filter(t=>!t.deleted).map(t=>({...t,color:t.background})),levels:levelData.levels.filter(l=>!l.deleted).map(l=>({...l,sort:l.order,timeLimit:config.timer.seconds})),questions:questions.filter(q=>!q.deleted).map(q=>({...q,imageUrl:q.media?.type==='image'?q.media.url:'',videoUrl:q.media?.type==='video'?q.media.url:'',mediaAlt:q.media?.alt||'',mediaRequired:!!q.media?.required})),rules:{reviveCount:config.revive.limit,dailyPointLimit:config.points.dailyPointCap,unlimited:config.points.dailyPointCap===null,lockAfterFailure:true,timerSeconds:config.timer.seconds,certificates:{...config.certificates},share:{...config.share},reviveShareText:config.revive.shareText,reviveShareImage:config.revive.shareImage}};return clone(current);}
 function question(item){if(item.imageUrl&&item.videoUrl)throw Error('每题请选择一种媒体：图片或视频');return {...item,media:item.videoUrl?{type:'video',url:item.videoUrl,alt:item.mediaAlt||item.media?.alt||'题目视频',required:Boolean(item.mediaRequired??item.media?.required)}:item.imageUrl?{type:'image',url:item.imageUrl,alt:item.mediaAlt||item.media?.alt||'题目图片',required:Boolean(item.mediaRequired??item.media?.required)}:null};}
 function level(item){const {timeLimit,sort,...rest}=item;return {...rest,order:sort,enabled:item.enabled!==false};}
 async function save(kind,item){if(!current)await load();
 if(kind==='rules'){const r=item;await request('/config','PUT',{timer:{seconds:r.timerSeconds},revive:{limit:r.reviveCount,shareText:r.reviveShareText,shareImage:r.reviveShareImage},points:{dailyPointCap:r.unlimited?null:r.dailyPointLimit},certificates:r.certificates,share:r.share});}
 else if(kind==='themes'){const themes=current.config.themes.slice(),i=themes.findIndex(t=>t.id===item.id);const value={...item,background:item.color||item.background,order:item.order||Math.max(0,...themes.map(t=>t.order))+1};if(i<0)themes.push(value);else themes[i]=value;await request('/config','PUT',{themes});}
 else if(kind==='levels'){if(item.timeLimit!==current.config.timer.seconds)throw Error('时限统一为秒/题，请在游戏规则中调整');const exists=current.levels.some(l=>l.id===item.id);await request('/levels'+(exists?'/'+encodeURIComponent(item.id):''),exists?'PUT':'POST',level(item));}
 else if(kind==='questions'){const exists=current.questions.some(q=>q.id===item.id);await request('/questions'+(exists?'/'+encodeURIComponent(item.id):''),exists?'PUT':'POST',question(item));}
 return load();}
 async function remove(kind,id){if(kind==='themes'){if(current.levels.some(l=>l.themeId===id)||current.questions.some(q=>q.themeId===id))throw Error('请先删除该主题下的关卡和题目');await request('/config','PUT',{themes:current.config.themes.map(t=>t.id===id?{...t,enabled:false,deleted:true}:t)});}else await request('/'+kind+'/'+encodeURIComponent(id),'DELETE');return load();}
 async function importItems(kind,items){if(!current)await load();if(kind==='questions')await request('/questions/import','POST',{questions:items.map(question)});else{if(items.some(l=>l.timeLimit!==current.config.timer.seconds))throw Error('CSV时间须为当前统一的单题时限；请先在游戏规则中调整');const levels=current.levels.map(level);for(const item of items){const i=levels.findIndex(l=>l.id===item.id);if(i<0)levels.push(level(item));else levels[i]=level(item);}await request('/activity/import','POST',{config:current.config,levels});}return load();}
 return {load,save,remove,import:importItems};
}
export const api=import.meta.env?.VITE_API_MODE==='local-preview'?createLocalApi(globalThis.localStorage):createHttpApi(import.meta.env?.VITE_API_BASE||'/api/local/admin');
