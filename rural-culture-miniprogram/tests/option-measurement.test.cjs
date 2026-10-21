'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('./v4-page.cjs');
// Execute the actual Page and actual service. Geometry callbacks model the
// subpixel feedback loop and late native callbacks that broke phone layouts.
test('100 actual selections cannot inflate answers with subpixel native geometry',async()=>{
 const queue=[],env=environment({geometry:(selector,callback,p)=>queue.push(()=>callback(Array.from({length:4},()=>({height:(p.data.optionHeight??56)+.015625}))))});
 try{await env.begin();for(let i=0;i<100;i++){await env.choose(i%2);while(queue.length)queue.shift()();}assert((env.page.data.optionHeight??56)<=57,'repeated native measurements inflated answer height');assert.equal(env.page.data.challenge.selected,1);}finally{env.page.onUnload();}
});
test('late geometry from the previous question cannot resize the next one',async()=>{
 const queue=[],env=environment({questionCount:2,geometry:(selector,callback)=>queue.push(()=>callback(Array.from({length:4},()=>({height:148}))))});
 try{await env.begin();await env.answer(0);const before=env.page.data.challenge.question.id;await env.action('next');assert.notEqual(env.page.data.challenge.question.id,before);while(queue.length)queue.shift()();assert.equal(env.page.data.optionHeight??56,56);}finally{env.page.onUnload();}
});
