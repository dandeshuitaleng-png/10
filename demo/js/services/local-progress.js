const {THEMES,LEVEL_POINTS}=require('../data/themes');
const LEGACY_PROGRESS_KEY='rural-quiz:local-campaign:v1';
const LOCAL_PROGRESS_KEY='rural-quiz:local-campaign:v2';
const BACKUP_KEY='rural-quiz:local-campaign:backup:';
const LOCK_NAME='rural-quiz:local-campaign';
const empty=()=>Object.fromEntries(THEMES.map(t=>[t.id,0]));
const clone=v=>JSON.parse(JSON.stringify(v));
const validCounts=v=>v&&THEMES.every(t=>Number.isInteger(v[t.id])&&v[t.id]>=0&&v[t.id]<=4);
const defaultManifest=id=>Object.fromEntries(THEMES.flatMap(t=>[1,2,3,4].map(n=>[t.id+'-'+n,id])));
const manifestSignature=m=>JSON.stringify(Object.keys(defaultManifest('')).map(k=>m?.[k]));
// Local demonstration only. Exclusive transactions are required for persistent writes.
class LocalProgress {
  constructor(api,sourceId,manifest=defaultManifest(sourceId)){
    this.api=api;this.sourceId=sourceId;this.manifest=clone(manifest);this.completed=empty();this.status='new';this.recentTheme='red';this.recentAt=0;this.pending=null;this.notice=null;this.dirty=false;this.recentDirty=false;this.inflight=null;this.listeners=new Set();
    if(!this.validManifest(manifest))throw Error('INVALID_LEVEL_MANIFEST');
    try{const record=this.read();this.baseManifest=record.value?.version===2?manifestSignature(record.value.manifest):null;this.adopt(record,true);}catch(e){this.readFailure(e);}
  }
  validManifest(m){return m&&Object.keys(defaultManifest('')).every(k=>typeof m[k]==='string'&&m[k].length>0);}
  read(){const current=this.api.getStorageSync(LOCAL_PROGRESS_KEY);return current==null?{key:LEGACY_PROGRESS_KEY,value:this.api.getStorageSync(LEGACY_PROGRESS_KEY)}:{key:LOCAL_PROGRESS_KEY,value:current};}
  inspect(record){
    const v=record.value;if(v==null)return {completed:empty(),recentTheme:'red',recentAt:0};
    if(!validCounts(v.completed))return {blocked:'invalid',message:'本地存档损坏或格式无法识别。原存档保留，请确认是否重新开始本地试玩。'};
    if(record.key===LEGACY_PROGRESS_KEY){
      if(v.version!==1||v.sourceId!==this.sourceId)return {blocked:'legacy',message:'旧存档无法确认与当前题库一致。原存档保留，确认后才会重置本地试玩进度。'};
      return {completed:{...v.completed},recentTheme:'red',recentAt:0,migrate:true};
    }
    if(v.version!==2||!this.validManifest(v.manifest))return {blocked:'invalid',message:'存档版本暂时无法识别。原存档保留，请确认是否重新开始本地试玩。'};
    const signature=manifestSignature(v.manifest);if(this.baseManifest&&signature!==this.baseManifest&&signature!==manifestSignature(this.manifest))return {blocked:'stale',message:'其他页面已更新题库版本。请刷新本页面后继续；当前页面不会覆盖新版存档。'};
    const completed={...v.completed},affected=[];
    for(const t of THEMES)for(let n=1;n<=completed[t.id];n++)if(v.manifest[t.id+'-'+n]!==this.manifest[t.id+'-'+n]){completed[t.id]=n-1;affected.push({themeId:t.id,from:n});break;}
    const recentTheme=THEMES.some(t=>t.id===v.recentTheme)?v.recentTheme:'red',recentAt=Number.isFinite(v.recentAt)?v.recentAt:0;
    if(affected.length)return {blocked:'changed',completed,recentTheme,recentAt,affected,message:affected.map(a=>THEMES.find(t=>t.id===a.themeId).name+'：第'+a.from+'—4关').join('；')+' 的已通关题目发生实质变更。确认后仅重置这些关卡，其他进度保留。'};
    return {completed,recentTheme,recentAt};
  }
  adopt(record,initial=false){
    const v=this.inspect(record);
    if(v.blocked){if(validCounts(record.value?.completed))this.completed={...record.value.completed};this.pending={...v,record:clone(record)};this.status='needs-confirmation';this.notice={blocking:true,message:v.message};this.emit();return false;}
    this.pending=null;
    for(const t of THEMES)this.completed[t.id]=this.dirty?Math.max(this.completed[t.id],v.completed[t.id]):v.completed[t.id];
    if(v.recentAt>=this.recentAt){this.recentTheme=v.recentTheme;this.recentAt=v.recentAt;}
    if(!initial&&record.value!=null&&!this.dirty&&!this.inflight&&this.status==='new')this.status='restored';
    if(initial&&record.value!=null){this.status='restored';this.notice={blocking:false,message:v.migrate?'已读取旧版本地进度；下次保存会备份并迁移。':'已恢复本机试玩进度。'};}
    this.emit();return true;
  }
  readFailure(e){if(e instanceof SyntaxError){this.pending={blocked:'invalid',record:null,message:'本地存档无法读取。原记录保留，请确认是否重新开始本地试玩。'};this.status='needs-confirmation';this.notice={blocking:true,message:this.pending.message};}else{this.status='unsaved';this.notice={blocking:false,message:'无法访问本机存储。本次进度仅临时保留，可稍后重试存档。'};}this.emit();}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn(this);}
  dismissNotice(){if(!this.notice?.blocking){this.notice=null;this.emit();}}
  refresh(){try{this.adopt(this.read());}catch(e){this.readFailure(e);}}
  canEnter(themeId,order){return !this.pending&&Object.hasOwn(this.completed,themeId)&&Number.isInteger(order)&&order>=1&&order<=4&&order<=this.completed[themeId]+1;}
  visit(themeId){if(!THEMES.some(t=>t.id===themeId)||this.pending)return Promise.resolve({saved:false});this.recentTheme=themeId;this.recentAt=Math.max(Date.now(),this.recentAt+1);this.recentDirty=true;this.emit();return this.save();}
  async complete(themeId,order){
    if(!this.canEnter(themeId,order))return {ok:false,reason:this.pending?'confirmation':'locked'};
    const replay=order<=this.completed[themeId],earned=replay?0:LEVEL_POINTS[order-1];
    this.completed[themeId]=Math.max(this.completed[themeId],order);this.dirty=true;
    const result=await this.save();return {ok:true,replay,...result,earned:result.saved?(result.credited?.[themeId]?.includes(order)?LEVEL_POINTS[order-1]:0):earned};
  }
  save(){
    if(this.inflight)return this.inflight.then(result=>this.dirty||this.recentDirty?this.save():result);
    if(this.pending)return Promise.resolve({saved:false,status:this.status,reason:'confirmation'});
    if(typeof this.api.withStorageLock!=='function'){this.status='session-only';this.notice={blocking:false,message:'当前环境不支持独占存档锁。本次进度仅在当前页面有效，刷新或关闭后不会保存。'};this.emit();return Promise.resolve({saved:false,status:this.status,reason:'unsupported-lock'});}
    this.status='saving';this.emit();
    const task=Promise.resolve().then(()=>this.api.withStorageLock(LOCK_NAME,()=>{
      const record=this.read(),latest=this.inspect(record);
      if(latest.blocked){this.adopt(record);return {saved:false,status:this.status,reason:'confirmation'};}
      const counts=Object.fromEntries(THEMES.map(t=>[t.id,Math.max(latest.completed[t.id],this.completed[t.id])]));
      const recent=latest.recentAt>this.recentAt?latest:{recentTheme:this.recentTheme,recentAt:this.recentAt};
      if(record.key===LEGACY_PROGRESS_KEY&&record.value!=null)this.api.setStorageSync(BACKUP_KEY+'v1',record.value);
      this.api.setStorageSync(LOCAL_PROGRESS_KEY,{version:2,sourceId:this.sourceId,manifest:this.manifest,completed:counts,recentTheme:recent.recentTheme,recentAt:recent.recentAt});
      const credited=Object.fromEntries(THEMES.map(t=>[t.id,Array.from({length:Math.max(0,counts[t.id]-latest.completed[t.id])},(_,i)=>latest.completed[t.id]+i+1)]));
      this.baseManifest=manifestSignature(this.manifest);if(this.notice?.message.includes('存档失败'))this.notice=null;
      this.completed=counts;this.recentTheme=recent.recentTheme;this.recentAt=recent.recentAt;this.dirty=false;this.recentDirty=false;this.status='saved';this.emit();return {saved:true,status:'saved',completed:{...counts},credited};
    })).catch(()=>{this.status='unsaved';this.notice={blocking:false,message:'存档失败，本次进度仅临时保留。请重试存档；重试不会重复加分。'};this.emit();return {saved:false,status:'unsaved',reason:'storage-failed'};});
    this.inflight=task;task.finally(()=>{if(this.inflight===task)this.inflight=null;});return task;
  }
  async confirmReset(){
    if(!this.pending)return {saved:true};
    if(this.pending.blocked==='stale')return {saved:false,reason:'reload-required'};
    if(typeof this.api.withStorageLock!=='function'){this.completed=this.pending.blocked==='changed'?{...this.pending.completed}:empty();this.pending=null;this.status='session-only';this.notice={blocking:false,message:'已仅在当前会话更新进度。当前环境不支持独占锁，旧存档保持原样；本次进度在刷新后不会保留。'};this.emit();return {saved:false,reason:'unsupported-lock'};}
    const pending=this.pending;if(pending.blocked==='stale')return {saved:false,reason:'reload-required'};
    try{return await this.api.withStorageLock(LOCK_NAME,()=>{
      // Re-read within the lock: another tab may have changed the affected range.
      let record;try{record=this.read();}catch(e){if(!(e instanceof SyntaxError))throw e;record=null;}
      if(JSON.stringify(record)!==JSON.stringify(pending.record)){this.refresh();return {saved:false,reason:'changed-again'};}
      const v=record?this.inspect(record):pending;
      if(record?.value!=null)this.api.setStorageSync(BACKUP_KEY+'before-reset:'+Date.now(),record.value);
      else if(this.api.backupRawStorage)this.api.backupRawStorage(LOCAL_PROGRESS_KEY,LEGACY_PROGRESS_KEY);
      const completed=v.blocked==='changed'?v.completed:empty();
      this.api.setStorageSync(LOCAL_PROGRESS_KEY,{version:2,sourceId:this.sourceId,manifest:this.manifest,completed,recentTheme:v.recentTheme||'red',recentAt:v.recentAt||0});
      this.baseManifest=manifestSignature(this.manifest);this.completed=completed;this.recentTheme=v.recentTheme||'red';this.recentAt=v.recentAt||0;this.dirty=false;this.recentDirty=false;this.pending=null;this.status='saved';this.notice={blocking:false,message:v.blocked==='changed'?'已按确认范围更新本地进度，其他关卡保持原状。':'已重新开始本地试玩；旧存档备份已保留。'};this.emit();return {saved:true};
    });}catch(_){this.status='needs-confirmation';this.notice={blocking:true,message:pending.message+' 存储仍不可用，重置尚未生效，请重试。'};this.emit();return {saved:false};}
  }
  get total(){return THEMES.reduce((sum,t)=>sum+LEVEL_POINTS.slice(0,this.completed[t.id]).reduce((a,b)=>a+b,0),0);}
  get destination(){const themeId=this.recentTheme,n=this.completed[themeId],all=THEMES.every(t=>this.completed[t.id]===4);return {themeId,order:Math.min(4,n+1),map:n===4||all,label:n===4||all?'返回'+THEMES.find(t=>t.id===themeId).name+'地图':(this.recentAt||this.total?'继续':'开始')+THEMES.find(t=>t.id===themeId).name+' · 第'+(n+1)+'关'};}
  get view(){return Object.fromEntries(THEMES.map(t=>{const n=this.completed[t.id];return [t.id,{completed:n,nodes:Array.from({length:4},(_,i)=>i<n?'complete':i===n?'current':'locked')}];}));}
}
module.exports={LocalProgress,LOCAL_PROGRESS_KEY,LEGACY_PROGRESS_KEY,BACKUP_KEY,LOCK_NAME};
