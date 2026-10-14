import {seed} from '../data/seed.js';
const KEY='quiz-admin-demo-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
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
 if(!['待审核','已通过','已退回'].includes(q.reviewStatus))throw Error('审核状态无效');
 for(const k of ['imageUrl','videoUrl'])if(q[k]&&!/^https?:\/\/[^\s]+$/i.test(q[k]))throw Error('图片和视频地址须为http或https链接');
}
export function createLocalApi(storage){
 function read(){const raw=storage.getItem(KEY);if(!raw)return seed();try{return JSON.parse(raw)}catch{throw Error('本地数据无法读取，请备份后清理浏览器站点数据')}}
 function write(data){storage.setItem(KEY,JSON.stringify(data));return clone(data)}
 return {async load(){return clone(read())},async save(kind,item){const d=read();if(kind==='rules'){validate(kind,{...item,id:'rules'},d);d.rules=clone(item)}else{validate(kind,item,d);if(kind==='levels'){const old=d.levels.find(l=>l.id===item.id);if(old&&old.themeId!==item.themeId&&d.questions.some(q=>q.levelId===item.id))throw Error('有题目的关卡不能更换主题')}const i=d[kind].findIndex(v=>v.id===item.id);if(i<0)d[kind].push(clone(item));else d[kind][i]=clone(item)}return write(d)},async remove(kind,id){const d=read();if(kind==='themes'&&(d.levels.some(v=>v.themeId===id)||d.questions.some(v=>v.themeId===id)))throw Error('请先删除该主题下的关卡和题目');if(kind==='levels'&&d.questions.some(v=>v.levelId===id))throw Error('请先删除该关卡下的题目');d[kind]=d[kind].filter(v=>v.id!==id);return write(d)},async import(kind,items){const d=read();const ids=new Set();for(const item of items){if(ids.has(item.id))throw Error(`CSV编号重复：${item.id}`);ids.add(item.id);validate(kind,item,d);const old=d[kind].find(v=>v.id===item.id);if(kind==='levels'&&old&&old.themeId!==item.themeId&&d.questions.some(q=>q.levelId===item.id))throw Error('有题目的关卡不能更换所属主题')}for(const item of items){const i=d[kind].findIndex(v=>v.id===item.id);if(i<0)d[kind].push(item);else d[kind][i]=item}return write(d)}}
}
// HTTP适配器与本地适配器返回相同完整状态，后端负责事务和关联校验。
export function createHttpApi(base='/api/admin'){
 async function request(path='',method='GET',body){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!response.ok)throw Error(`请求失败（${response.status}）`);return response.json()}
 return {load:()=>request('/state'),save:(kind,item)=>request('/'+kind,'PUT',item),remove:(kind,id)=>request('/'+kind+'/'+encodeURIComponent(id),'DELETE'),import:(kind,items)=>request('/'+kind+'/import','POST',{items})};
}
export const api=import.meta.env?.VITE_API_MODE==='http'?createHttpApi(import.meta.env.VITE_API_BASE):createLocalApi(globalThis.localStorage);
