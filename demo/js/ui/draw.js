const T = require('./tokens');

function rounded(ctx, x, y, w, h, radius, fill, stroke) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function text(ctx, value, x, y, size = 16, color = T.colors.ink, weight = 400, align = 'left') {
  ctx.font = `${weight} ${size}px ${T.font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(String(value), x, y);
}
function wrap(ctx, value, x, y, maxWidth, size = 16, color = T.colors.ink, weight = 400) {
  ctx.font = `${weight} ${size}px ${T.font}`; const lines=[];let line='';
  const closing=/[，。！？；：、）》」』】,.!?;:)]/;
  for(const char of String(value)) {
    if(char==='\n'){lines.push(line);line='';continue;}
    if(line && ctx.measureText(line+char).width>maxWidth){
      if(closing.test(char) && line.length>1){const last=line.slice(-1);lines.push(line.slice(0,-1));line=last+char;}
      else {lines.push(line);line=char;}
    }else line+=char;
  }
  if(line)lines.push(line);
  lines.forEach((row,i)=>text(ctx,row,x,y+i*size*1.5,size,color,weight));
  return lines.length*size*1.5;
}
function imageCover(ctx, image, x, y, w, h, radius = 16) {
  ctx.save(); rounded(ctx, x, y, w, h, radius); ctx.clip();
  const ratio = Math.max(w / image.width, h / image.height);
  const dw = image.width * ratio, dh = image.height * ratio;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
}
function line(ctx, points, color, width = 2) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x,y]) => ctx.lineTo(x,y)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function circle(ctx, x, y, r, fill, stroke) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();} }
function motif(ctx, type, x, y, size = 40) {
  const C=T.colors;ctx.save();ctx.translate(x,y);ctx.scale(size/40,size/40);
  if(type==='village') { rounded(ctx,5,17,30,21,3,C.surface,C.ink); line(ctx,[[2,18],[20,5],[38,18]],C.lake,4);rounded(ctx,16,25,8,13,2,C.orange);line(ctx,[[28,6],[28,0],[37,2],[28,5]],C.orange,2); }
  if(type==='book') { ctx.fillStyle=C.surface;ctx.beginPath();ctx.moveTo(2,9);ctx.quadraticCurveTo(12,4,20,11);ctx.quadraticCurveTo(28,4,38,9);ctx.lineTo(38,35);ctx.quadraticCurveTo(28,29,20,36);ctx.quadraticCurveTo(12,29,2,35);ctx.closePath();ctx.fill();ctx.strokeStyle=C.lake;ctx.lineWidth=2;ctx.stroke();line(ctx,[[20,11],[20,36]],C.lake,2);line(ctx,[[7,16],[15,17]],C.orange,2);line(ctx,[[25,17],[33,16]],C.orange,2); }
  if(type==='field') { line(ctx,[[20,37],[20,5]],C.lake,2);for(let i=0;i<4;i++){const yy=8+i*6;ctx.fillStyle=C.orange;ctx.beginPath();ctx.ellipse(15,yy,6,3,.55,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(25,yy+2,6,3,-.55,0,Math.PI*2);ctx.fill();}line(ctx,[[4,38],[36,38]],C.lake,2); }
  if(type==='water') { ctx.fillStyle=C.lakeLight;ctx.beginPath();ctx.moveTo(0,24);ctx.lineTo(12,5);ctx.lineTo(25,24);ctx.lineTo(32,15);ctx.lineTo(40,27);ctx.closePath();ctx.fill();line(ctx,[[0,31],[9,28],[18,32],[28,28],[40,31]],C.lake,2);line(ctx,[[3,38],[13,35],[24,38],[37,35]],C.lake,2);circle(ctx,32,6,4,C.orange); }
  ctx.restore();
}
module.exports={rounded,text,wrap,imageCover,line,circle,motif};
