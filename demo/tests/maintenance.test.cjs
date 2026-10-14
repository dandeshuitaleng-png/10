'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {SQLiteStore}=require('../server/store.cjs'),{createBackup,restoreBackup,inspectDatabase}=require('../server/maintenance.cjs');
test('online WAL backup restores all committed entities and never overwrites an existing destination',async t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-backup-test-')),source=path.join(folder,'source.sqlite'),target=path.join(folder,'backup.sqlite'),restored=path.join(folder,'restored.sqlite');
  const store=new SQLiteStore(source);t.after(async()=>{await store.close();fs.rmSync(folder,{recursive:true,force:true});});
  await store.transaction(async tx=>{
    await tx.set('meta','initialized',{version:1});await tx.set('meta','config',{version:1});
    await tx.set('ledger','first',{points:10});await tx.set('completions','first',{passed:true});
    await tx.set('certificates','first',{id:'owned'});await tx.set('challenges','active',{deadline:123456,position:3,reviveUsed:true});
  });
  const snapshot=await createBackup(source,target);assert.equal(snapshot.integrity,'ok');assert.equal(snapshot.counts.ledger,1);assert.ok(!JSON.stringify(snapshot).includes('123456'));
  assert.equal(fs.statSync(target).mode&0o777,0o600);assert.equal(fs.statSync(target+'.json').mode&0o777,0o600);
  await store.transaction(async tx=>{await tx.set('ledger','second',{points:15});await tx.set('challenges','active',{deadline:999999,position:4,reviveUsed:true});});
  const result=restoreBackup(target,restored);assert.equal(result.restored,true);
  const recovered=new SQLiteStore(restored);try{assert.equal((await recovered.list('ledger')).length,1);assert.deepEqual(await recovered.get('challenges','active'),{deadline:123456,position:3,reviveUsed:true});}finally{await recovered.close();}
  await assert.rejects(createBackup(source,target),/DESTINATION_EXISTS/);assert.throws(()=>restoreBackup(target,restored),/DESTINATION_EXISTS/);
  assert.equal((await store.list('ledger')).length,2);assert.equal(inspectDatabase(source).integrity,'ok');
});
test('corrupted backup is rejected without creating a recovery database',async t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-backup-corrupt-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const source=path.join(folder,'source.sqlite'),copy=path.join(folder,'backup.sqlite'),restore=path.join(folder,'restore.sqlite'),store=new SQLiteStore(source);
  await store.set('meta','initialized',{});await store.set('meta','config',{});await store.close();await createBackup(source,copy);
  fs.appendFileSync(copy,crypto.randomBytes(20));assert.throws(()=>restoreBackup(copy,restore),/BACKUP_HASH_MISMATCH/);assert.equal(fs.existsSync(restore),false);
});
