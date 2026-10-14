'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inspectDatabase(file){
  const db=new DatabaseSync(path.resolve(file),{readOnly:true,timeout:5000});
  try{
    const integrity=db.prepare('PRAGMA integrity_check').all();
    if(integrity.length!==1||integrity[0].integrity_check!=='ok')throw Error('DATABASE_INTEGRITY_FAILED');
    const meta=db.prepare('SELECT value FROM entity_records WHERE collection=? AND id=?');
    if(!meta.get('meta','initialized')||!meta.get('meta','config'))throw Error('NOT_A_GAME_DATABASE');
    // Only aggregate counts enter reports. User names, sessions and answers stay private.
    const rows=db.prepare('SELECT collection,COUNT(*) AS count FROM entity_records GROUP BY collection ORDER BY collection').all();
    return {integrity:'ok',counts:Object.fromEntries(rows.map(r=>[r.collection,r.count]))};
  }finally{db.close();}
}
async function createBackup(source,destination){
  const from=path.resolve(source),target=path.resolve(destination),parent=path.dirname(target),manifestFile=target+'.json';
  if(!fs.existsSync(from))throw Error('SOURCE_NOT_FOUND');
  if(fs.existsSync(target)||fs.existsSync(manifestFile))throw Error('DESTINATION_EXISTS');
  fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const staging=fs.mkdtempSync(path.join(parent,'.quiz-backup-'));fs.chmodSync(staging,0o700);
  const temporary=path.join(staging,'snapshot.sqlite');let db,published=false,manifestPublished=false;
  try{
    db=new DatabaseSync(from,{readOnly:true,timeout:5000});
    await backup(db,temporary);db.close();db=null;fs.chmodSync(temporary,0o600);
    const summary=inspectDatabase(temporary),manifest={kind:'rural-quiz-backup-v1',createdAt:new Date().toISOString(),sha256:sha(temporary),bytes:fs.statSync(temporary).size,...summary};
    // Hard-link publication is atomic and refuses to overwrite even under a race.
    fs.linkSync(temporary,target);published=true;
    fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});manifestPublished=true;
    return manifest;
  }catch(e){if(published)fs.unlinkSync(target);if(manifestPublished)fs.unlinkSync(manifestFile);throw e;}
  finally{if(db)db.close();fs.rmSync(staging,{recursive:true,force:true});}
}
function restoreBackup(source,destination){
  const from=path.resolve(source),target=path.resolve(destination);
  if(fs.existsSync(target))throw Error('DESTINATION_EXISTS');
  const manifest=JSON.parse(fs.readFileSync(from+'.json','utf8'));
  if(manifest.kind!=='rural-quiz-backup-v1'||sha(from)!==manifest.sha256)throw Error('BACKUP_HASH_MISMATCH');
  const summary=inspectDatabase(from);
  if(JSON.stringify(summary.counts)!==JSON.stringify(manifest.counts))throw Error('BACKUP_COUNTS_MISMATCH');
  fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  fs.copyFileSync(from,target,fs.constants.COPYFILE_EXCL);fs.chmodSync(target,0o600);
  return {restored:true,...summary,sha256:sha(target)};
}
module.exports={inspectDatabase,createBackup,restoreBackup};
