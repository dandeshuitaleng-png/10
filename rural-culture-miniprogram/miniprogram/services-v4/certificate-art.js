'use strict';
// One certificate document is used for both the on-page preview and album save.
// Award eligibility, historical level scope and certificate IDs remain server-owned.
const themes={
 red:{frame:'#B73519',dark:'#861F13',light:'#D85624',ink:'#57251F'},
 culture:{frame:'#8B5533',dark:'#5F351F',light:'#AF7D4B',ink:'#59371E'},
 industry:{frame:'#BE8C26',dark:'#805B16',light:'#D9AD49',ink:'#674310'},
 ecology:{frame:'#387544',dark:'#234F31',light:'#5D955D',ink:'#254C16'}
};
const W=900,paper='#FFFBF5',gold='#C7A25D';
function model(c,skin){
 return {theme:skin.gameId,themeName:c.scope==='all'?'乡村文化知识探索':skin.name,
  activity:c.scope==='all'?'四主题知识探索学习活动':'「'+skin.name+'」主题学习活动',
  userName:String(c.userName||'乡村阅读者'),award:String(c.name||'学习达人'),
  description:String(c.description||('您在「'+(c.scope==='all'?'乡村文化知识探索':skin.name)+'」学习中，\n认真探索，积累新知。')),
  scopeLine:'已完成本证书记录的 '+(c.levelIds||[]).length+' 个关卡',
  issuer:'湖南数字农家书屋',date:String(c.date||'').replace(/^(\d{4})[/-](\d{2})[/-](\d{2})$/,'$1年$2月$3日'),id:String(c.displayId||''),
  footer:String(c.footer||'学习活动纪念，不代表学历或教育资格')};
}
function wrap(ctx,text,maxWidth){
 const rows=[];let row='';
 for(const ch of Array.from(String(text||''))){
  if(ch==='\n'){rows.push(row);row='';continue;}
  if(row&&ctx.measureText(row+ch).width>maxWidth){
   const chars=Array.from(row);let carry='';
   // Chinese closing punctuation stays with preceding text, never at line start.
   if('，。！？；：、）》】」』”’％%…'.includes(ch)){
    let split=-1;chars.forEach((c,i)=>{if('，、；： '.includes(c)&&i>=chars.length/2)split=i;});
    carry=split>=0?chars.splice(split+1).join(''):chars.splice(-1).join('');
   }else if('（《【「『“‘'.includes(chars[chars.length-1]))carry=chars.splice(-1).join('');
   rows.push(chars.join(''));row=carry+ch;
  }else row+=ch;
 }
 if(row)rows.push(row);return rows;
}
function font(ctx,size,bold=false,face='sans-serif'){ctx.font=(bold?'bold ':'')+size+'px '+face;}
function layout(ctx,d){
 const block=(text,size,bold,width,lineHeight,face='sans-serif')=>{font(ctx,size,bold,face);return {rows:wrap(ctx,text,width),size,bold,lineHeight,face};};
 const activity=block(d.activity,42,true,710,56,'serif');activity.y=176;
 const ornamentY=activity.y+(activity.rows.length-1)*56+55;
 const titleY=ornamentY+106;
 const recipient=block(d.userName,44,false,690,56);recipient.y=titleY+159;
 const body=block(d.description,42,false,710,62);body.y=recipient.y+(recipient.rows.length-1)*56+76;
 const scope=block(d.scopeLine,40,false,710,59);scope.y=body.y+(body.rows.length-1)*62+54;
 const award=block('“'+d.award+'” 称号',54,true,720,69,'serif');award.y=scope.y+(scope.rows.length-1)*59+103;
 const closingY=award.y+(award.rows.length-1)*69+88,issuerY=closingY+88;
 const id=block(d.id,20,false,700,29);id.y=issuerY+83;
 const footer=block(d.footer,20,false,710,30);
 const height=Math.max(1280,issuerY+42+40+(id.rows.length?40+(id.rows.length-1)*29:0)+footer.rows.length*30+85);
 footer.y=height-79-(footer.rows.length-1)*30;
 return {width:W,height,activity,ornamentY,titleY,recipient,body,scope,award,closingY,issuerY,id,footer};
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function insetPaper(ctx,x,y,w,h,n){ctx.beginPath();ctx.moveTo(x+n,y);ctx.lineTo(x+w-n,y);ctx.quadraticCurveTo(x+w-n,y+n,x+w,y+n);ctx.lineTo(x+w,y+h-n);ctx.quadraticCurveTo(x+w-n,y+h-n,x+w-n,y+h);ctx.lineTo(x+n,y+h);ctx.quadraticCurveTo(x+n,y+h-n,x,y+h-n);ctx.lineTo(x,y+n);ctx.quadraticCurveTo(x+n,y+n,x+n,y);ctx.closePath();}
function wheat(ctx,x,y,side){
 ctx.strokeStyle=gold;ctx.fillStyle=gold;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+30);ctx.quadraticCurveTo(x+side*15,y-1,x+side*7,y-35);ctx.stroke();
 for(let i=0;i<6;i++){const yy=y+22-i*10,xx=x+side*(i<3?i*2:7),dir=i%2?side:-side;ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+dir*15,yy-3,xx+dir*11,yy-14);ctx.quadraticCurveTo(xx+dir*3,yy-13,xx,yy);ctx.fill();}
}
function paint(ctx,d,l){
 const t=themes[d.theme]||themes.culture,h=l.height;
 ctx.clearRect(0,0,W,h);const frame=ctx.createLinearGradient(0,0,W,h);frame.addColorStop(0,t.light);frame.addColorStop(.35,t.frame);frame.addColorStop(1,t.dark);
 ctx.fillStyle=frame;rounded(ctx,12,12,876,h-24,22);ctx.fill();
 ctx.strokeStyle=t.dark;ctx.lineWidth=2;rounded(ctx,20,20,860,h-40,17);ctx.stroke();
 ctx.fillStyle=paper;insetPaper(ctx,38,38,824,h-76,24);ctx.fill();
 ctx.strokeStyle=gold;ctx.lineWidth=1.3;insetPaper(ctx,53,53,794,h-106,23);ctx.stroke();
 ctx.strokeStyle='#E9D8B6';ctx.lineWidth=.8;insetPaper(ctx,61,61,778,h-122,21);ctx.stroke();
 // Restrained folded ribbons at opposite corners, as in the supplied reference.
 ctx.fillStyle='#F6E5BD';ctx.beginPath();ctx.moveTo(704,12);ctx.lineTo(776,12);ctx.lineTo(888,124);ctx.lineTo(888,196);ctx.closePath();ctx.fill();
 ctx.fillStyle='#F9EAC9';ctx.beginPath();ctx.moveTo(38,h-286);ctx.quadraticCurveTo(160,h-134,128,h-76);ctx.quadraticCurveTo(108,h-29,76,h-12);ctx.lineTo(12,h-12);ctx.quadraticCurveTo(102,h-81,83,h-126);ctx.lineTo(38,h-215);ctx.closePath();ctx.fill();
 const line=(text,x,y,size,bold=false,face='sans-serif',color=t.ink,align='center')=>{font(ctx,size,bold,face);ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y);};
 const rows=(b,color=t.ink,align='center',x=450)=>b.rows.forEach((r,i)=>line(r,x,b.y+i*b.lineHeight,b.size,b.bold,b.face,color,align));
 line(d.issuer,450,112,28,false,'serif',t.ink);rows(l.activity);
 ctx.strokeStyle='#DFC497';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(255,l.ornamentY);ctx.lineTo(422,l.ornamentY);ctx.moveTo(478,l.ornamentY);ctx.lineTo(645,l.ornamentY);ctx.stroke();
 ctx.beginPath();ctx.arc(450,l.ornamentY,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(450,l.ornamentY,3,0,Math.PI*2);ctx.fillStyle=gold;ctx.fill();
 line('荣誉证书',450,l.titleY,82,true,'serif',gold);wheat(ctx,233,l.titleY-26,-1);wheat(ctx,667,l.titleY-26,1);
 line('亲爱的',450,l.recipient.y-56,34,true);rows(l.recipient,'#30302D');
 font(ctx,l.recipient.size);const underline=Math.min(704,Math.max(230,...l.recipient.rows.map(r=>ctx.measureText(r).width+40)));
 ctx.strokeStyle='#AA9B84';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(450-underline/2,l.recipient.y+(l.recipient.rows.length-1)*l.recipient.lineHeight+13);ctx.lineTo(450+underline/2,l.recipient.y+(l.recipient.rows.length-1)*l.recipient.lineHeight+13);ctx.stroke();
 rows(l.body,'#373631');rows(l.scope,'#373631');rows(l.award,t.frame);
 line('特发此证，以资纪念。',450,l.closingY,34,false,'serif','#373631');
 line(d.issuer,795,l.issuerY,32,false,'sans-serif','#4C4942','right');line(d.date,795,l.issuerY+42,30,false,'sans-serif','#4C4942','right');
 if(d.id)rows(l.id,'#807567');rows(l.footer,'#998B76');
 return l;
}
async function render(wx,page,d){
 await new Promise(resolve=>wx.nextTick(resolve));
 const canvas=await new Promise((resolve,reject)=>wx.createSelectorQuery().in(page).select('#certificate-canvas').fields({node:true,size:true}).exec(rows=>rows&&rows[0]&&rows[0].node?resolve(rows[0].node):reject(Error('CERTIFICATE_CANVAS_MISSING'))));
 const ctx=canvas.getContext('2d'),l=layout(ctx,d);canvas.width=l.width;canvas.height=l.height;paint(ctx,d,l);
 const filePath=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas,fileType:'png',destWidth:l.width,destHeight:l.height,success:r=>resolve(r.tempFilePath),fail:reject},page));
 return {filePath,width:l.width,height:l.height};
}
module.exports={model,layout,paint,render,themes};
