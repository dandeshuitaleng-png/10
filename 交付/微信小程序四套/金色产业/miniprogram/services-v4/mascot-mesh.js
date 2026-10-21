'use strict';
// Deform one continuous rectangle of the original bitmap. Shared vertices and
// fixed outer edges keep the arm/prop joined to the stationary body.
const round=n=>Math.abs(n)<1e-10?0:Number(n.toFixed(8));
function affine(source,target){
 const [p,q,r]=source,[u,v,w]=target,det=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
 if(Math.abs(det)<1e-9)throw Error('DEGENERATE_MASCOT_MESH');
 const a=((v[0]-u[0])*(r[1]-p[1])-(w[0]-u[0])*(q[1]-p[1]))/det;
 const c=((q[0]-p[0])*(w[0]-u[0])-(r[0]-p[0])*(v[0]-u[0]))/det;
 const b=((v[1]-u[1])*(r[1]-p[1])-(w[1]-u[1])*(q[1]-p[1]))/det;
 const d=((q[0]-p[0])*(w[1]-u[1])-(r[0]-p[0])*(v[1]-u[1]))/det;
 return [a,b,c,d,u[0]-a*p[0]-c*p[1],u[1]-b*p[0]-d*p[1]].map(round);
}
module.exports={affine};
