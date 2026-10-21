'use strict';
throw new Error('该角色重绘稿已撤下：不得覆盖当前用户原始 IP。请查看 design-source/README.md。');
// Editable native vector source and deterministic transparent exports; supplied raster references are untouched.
const fs=require('node:fs'),path=require('node:path');
const sharp=require('./asset-runtime.cjs').sharp();
const root=path.resolve(__dirname,'..'),dest=path.join(root,'miniprogram/assets/brand/actor'),source=path.join(root,'design-source/actor');
fs.mkdirSync(dest,{recursive:true});fs.mkdirSync(source,{recursive:true});
const outline='fill="#fff" stroke="#171716" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
const leaf='<path d="M0 0Q-21-13-10-34Q8-25 0 0Z" fill="#83B928"/>';
const parts={
 body:`<g ${outline}><path d="M126 280Q112 309 118 357L120 425Q120 440 141 440H164Q179 439 179 420V398H204V422Q204 440 221 440H248Q266 439 266 424L268 339Q268 300 255 280Z"/><path d="M183 398H201"/><g fill="#4BAA43" stroke="none"><path d="M191 325Q178 314 191 302Q204 315 191 325Z"/><path d="M182 330Q165 330 166 311Q182 314 182 330Z"/><path d="M200 330Q201 314 217 311Q217 329 200 330Z"/></g></g>`,
 head:`<g ${outline}><path d="M190 70V30" fill="none"/><circle cx="190" cy="21" r="12" fill="#4BAA43"/><path d="M43 214Q48 151 90 112Q134 78 167 83Q190 84 208 95Q234 105 260 105Q325 124 340 198Q352 247 331 272Q308 303 252 300Q214 296 190 296Q159 301 121 299Q63 300 46 269Q36 247 43 214Z"/><g fill="#9FC82B"><path d="M82 141Q53 120 68 90Q91 110 82 141Z"/><path d="M89 120Q89 90 120 91Q115 117 89 120Z"/><path d="M63 172Q33 158 39 132Q66 142 63 172Z"/><path d="M90 154Q107 128 134 142Q119 165 90 154Z"/><path d="M294 139Q318 114 307 89Q285 107 294 139Z"/><path d="M285 119Q283 94 255 93Q258 116 285 119Z"/><path d="M320 171Q345 157 340 132Q316 141 320 171Z"/><path d="M289 153Q270 129 248 142Q262 164 289 153Z"/></g><path d="M73 224Q74 167 129 155Q182 144 238 156Q304 166 309 224Q313 256 291 262Q266 270 239 258Q211 246 190 250Q163 253 142 264Q117 275 89 260Q69 251 73 224Z" fill="#88CFE4" stroke="none"/></g>`,
 eyes:`<g fill="none" stroke="#171716" stroke-width="6.5" stroke-linecap="round"><path d="M127 213Q138 202 149 213"/><path d="M229 213Q241 202 252 213"/></g>`,
 'eyes-think':`<g fill="#171716"><ellipse cx="140" cy="211" rx="7" ry="11"/><ellipse cx="241" cy="211" rx="7" ry="11"/></g>`,
 'eyes-happy':`<g fill="none" stroke="#171716" stroke-width="6.5" stroke-linecap="round"><path d="M126 214Q137 199 150 214"/><path d="M228 214Q241 199 253 214"/></g>`,
 mouth:`<path d="M179 231Q190 242 202 231" fill="none" stroke="#171716" stroke-width="6" stroke-linecap="round"/>`,
 'mouth-think':`<path d="M181 234Q191 230 200 234" fill="none" stroke="#171716" stroke-width="5" stroke-linecap="round"/>`,
 'mouth-happy':`<path d="M176 230H206Q205 249 191 250Q178 247 176 230Z" fill="#E88472" stroke="#171716" stroke-width="5" stroke-linejoin="round"/>`,
 'arm-left-rest':`<path d="M126 309Q101 321 100 353Q102 374 116 375Q131 374 133 354Q143 334 144 329" ${outline}/>`,
 'arm-left-think':`<path d="M127 314Q106 320 108 344Q113 362 133 353Q155 343 174 318Q186 299 174 289Q159 278 146 299L132 318" ${outline}/>`,
 'arm-left-celebrate':`<path d="M128 313Q107 311 92 282Q81 259 67 267Q49 278 64 306Q87 346 119 346" ${outline}/>`,
 'arm-right-rest':`<path d="M256 307Q279 321 281 350Q284 371 267 374Q253 376 249 354Q241 338 240 329" ${outline}/>`,
 'arm-right-wave':`<path d="M253 309Q279 313 285 281Q287 254 305 257Q324 260 315 294Q307 343 267 345" ${outline}/>`,
 'arm-right-point':`<path d="M253 310Q272 323 290 310Q302 301 312 302Q333 305 320 323Q296 351 265 346" ${outline}/>`,
 'prop-observe':`<g fill="none" stroke="#171716" stroke-width="5.5" stroke-linecap="round"><path d="M295 309L310 280"/><circle cx="317" cy="266" r="22" fill="#F2D988"/><circle cx="317" cy="266" r="14" fill="#D7F0EE"/><path d="M311 260L321 256" stroke="#fff" stroke-width="4"/></g>`,
 'prop-think':`<g fill="#73A874"><circle cx="283" cy="75" r="4"/><circle cx="295" cy="58" r="6"/><path d="M309 39Q298 19 316 10Q333 6 339 20Q347 34 330 40Z" fill="#E6F2DD" stroke="#42835A" stroke-width="4"/></g>`,
 'prop-celebrate':`<g stroke="#171716" stroke-width="5" stroke-linejoin="round"><path d="M267 304L320 290L336 340L283 355Z" fill="#FFF4D8"/><path d="M278 314L313 305M281 325L314 316" fill="none" stroke="#BA9F68" stroke-width="4"/><circle cx="313" cy="336" r="9" fill="#E8B756"/><path d="M308 342L309 354L317 348L324 350L319 339" fill="#D5684D"/></g>`
};
const order=['body','head','eyes','mouth','arm-left-rest','arm-right-wave'];
const poseParts={welcome:order,observe:['body','head','eyes-think','mouth','prop-observe','arm-left-rest','arm-right-point'],think:['body','head','eyes-think','mouth-think','arm-right-rest','arm-left-think','prop-think'],celebrate:['body','head','eyes-happy','mouth-happy','prop-celebrate','arm-left-celebrate','arm-right-wave']};
function svg(names,layered=false){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="384" height="456" viewBox="0 0 384 456"><title>智小谷 · 统一二维角色</title><desc>白色身体、浅蓝面罩、绿色穗叶；各图层可单独编辑。基于用户提供的角色外形重绘。</desc>${names.map(n=>layered?`<g id="${n}" inkscape:groupmode="layer" inkscape:label="${n}">${parts[n]}</g>`:parts[n]).join('')}</svg>`;}
(async()=>{for(const [name,part]of Object.entries(parts)){fs.writeFileSync(path.join(source,name+'.svg'),svg([name],true));await sharp(Buffer.from(svg([name]))).png({palette:true,colours:128}).toFile(path.join(dest,name+'.png'));}for(const [pose,names]of Object.entries(poseParts)){const data=svg(names,true);fs.writeFileSync(path.join(source,pose+'-layered.svg'),data);await sharp(Buffer.from(data)).png({palette:true,colours:192}).toFile(path.join(dest,pose+'.png'));}fs.writeFileSync(path.join(source,'layers.json'),JSON.stringify({canvas:[384,456],feetY:443,poses:poseParts,parts:Object.keys(parts),pivots:{head:[192,285],leftArm:[128,318],rightArm:[259,319],eyes:[192,213]},provenance:'Native editable SVG redraw from the supplied 2D 智小谷 references. No raster reference modified.'},null,2)+'\n');console.log(JSON.stringify({exported:Object.keys(parts).length+4,dest,source}));})().catch(e=>{console.error(e);process.exitCode=1;});
