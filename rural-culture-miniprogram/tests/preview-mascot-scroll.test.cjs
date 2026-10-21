'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const {createCanvas,loadImage}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));
const {createAnimator}=require('../miniprogram/services-v4/mascot-canvas'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
const source=fs.readFileSync(path.join(__dirname,'../preview/v4-runtime.js'),'utf8'),start=source.indexOf('  function morph('),end=source.indexOf('  // Canvas 2D',start),context={};vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.morph=morph;',context);
class Element {
 constructor(tag,attrs={},children=[]){this.nodeType=1;this.nodeName=this.tagName=tag;this.attrs=new Map(Object.entries(attrs));this.childNodes=children;}
 get attributes(){return [...this.attrs].map(([name,value])=>({name,value}));}
 hasAttribute(name){return this.attrs.has(name);}
 getAttribute(name){return this.attrs.get(name)??null;}
 setAttribute(name,value){this.attrs.set(name,String(value));}
 removeAttribute(name){this.attrs.delete(name);}
}
class CanvasElement extends Element {
 constructor(){super('CANVAS',{class:'mascot-motion-canvas'});this.buffer=createCanvas(300,150);}
 get width(){return this.buffer.width;}set width(n){this.setAttribute('width',n);}
 get height(){return this.buffer.height;}set height(n){this.setAttribute('height',n);}
 setAttribute(name,value){super.setAttribute(name,value);if(name==='width'||name==='height')this.buffer[name]=Number(value);}
 // The HTML Canvas default dimensions apply when its content attributes vanish.
 removeAttribute(name){super.removeAttribute(name);if(name==='width')this.buffer.width=300;if(name==='height')this.buffer.height=150;}
 getContext(type){return this.buffer.getContext(type);}
}
test('scroll-driven DOM morph preserves the live canvas buffer, transform and original-pixel frame for all four poses',async()=>{
 for(const pose of ['welcome','celebrate','observe','think'])for(const pixelRatio of [1,2,3]){
  const rig=rigs[pose],canvas=new CanvasElement(),image=await loadImage(path.join(__dirname,'../miniprogram',rig.source));
  const actor=createAnimator({canvas,image,rig,width:76,height:120,pixelRatio});canvas._mascotAnimator=actor;actor.drawFrame(.4);const before=canvas.buffer.toBuffer('image/png'),matrix=canvas.getContext('2d').getTransform();
  const scroll=new Element('SCROLL-VIEW',{},[canvas]);scroll._scrollTop=100;scroll.scrollTop=100;
  for(let i=0;i<40;i++){
   scroll.scrollTop=100+i;const nextCanvas=new Element('CANVAS',{class:'mascot-motion-canvas','data-cycle':String(i)}),next=new Element('SCROLL-VIEW',{},[nextCanvas]);next._scrollTop=100;
   context.morph(scroll,next);
   assert.equal(canvas.width,76*pixelRatio,pose+' live width reset during scrolling');assert.equal(canvas.height,120*pixelRatio,pose+' live height reset during scrolling');
   assert.equal(canvas.getContext('2d').getTransform().a,matrix.a,pose+' drawing transform reset');assert.equal(scroll.scrollTop,100+i,'user scroll must not snap back to focus');
   actor.drawFrame(.4);assert(canvas.buffer.toBuffer('image/png').equals(before),pose+' same held gesture frame changed after a scroll repaint');
  }
  actor.stop();
 }
});
