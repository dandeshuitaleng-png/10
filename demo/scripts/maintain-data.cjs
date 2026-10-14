'use strict';
const {createBackup,restoreBackup,inspectDatabase}=require('../server/maintenance.cjs');
const [operation,source,destination]=process.argv.slice(2);
async function main(){
  if(!source||!['backup','restore','check'].includes(operation)||operation!=='check'&&!destination){
    process.stderr.write('用法：node scripts/maintain-data.cjs backup|restore 源数据库 新文件\n或：node scripts/maintain-data.cjs check 数据库\n');process.exitCode=1;return;
  }
  const result=operation==='backup'?await createBackup(source,destination):operation==='restore'?restoreBackup(source,destination):inspectDatabase(source);
  process.stdout.write(JSON.stringify({operation,passed:true,...result},null,2)+'\n');
}
main().catch(e=>{const known=['SOURCE_NOT_FOUND','DESTINATION_EXISTS','BACKUP_HASH_MISMATCH','BACKUP_COUNTS_MISMATCH','DATABASE_INTEGRITY_FAILED','NOT_A_GAME_DATABASE'];process.stderr.write(JSON.stringify({operation,passed:false,error:known.includes(e.message)?e.message:'MAINTENANCE_FAILED'})+'\n');process.exitCode=1;});
