/* Reads the actual WXML, WXSS, Page, Component and services. Browser validation
 * stays distinct from WeChat simulator/device validation. No state injection. */
(function () {
  'use strict';
  const resourceBase=(location.pathname.match(/^\/native\/(?:culture|red|industry|ecology)/)||[''])[0];
  const resourceURL=file=>resourceBase+file;
  const modules = new Map(), sources = new Map(), components = new Map();
  let current = null, app = null, stack = [], route = '', painting = false, firstPage='/pages/game/index';
  const navigation = { title: '', color: '#000000', background: '#ffffff' };
  const normalize = path => '/' + path.split('/').reduce((parts, bit) => { if (bit === '..') parts.pop(); else if (bit && bit !== '.') parts.push(bit); return parts; }, []).join('/');
  const resolve = (file, spec) => { const target = spec.startsWith('/') ? spec : file.slice(0, file.lastIndexOf('/') + 1) + spec; return normalize(target) + (/\.(?:js|json)$/.test(spec) ? '' : '.js'); };
  async function fetchText(file) { const response = await fetch(resourceURL(file), { cache: 'no-store' }); if (!response.ok) throw Error('文件无法加载：' + file); return response.text(); }
  async function preload(file) { if (sources.has(file)) return; sources.set(file, ''); const source = await fetchText(file); sources.set(file, source); if (file.endsWith('.json')) return; for (const match of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) await preload(resolve(file, match[1])); }
  function execute(file) { if (modules.has(file)) return modules.get(file).exports; const module = { exports: {} }; modules.set(file, module); if (file.endsWith('.json')) module.exports = JSON.parse(sources.get(file)); else new Function('module', 'exports', 'require', sources.get(file) + '\n//# sourceURL=' + file)(module, module.exports, spec => execute(resolve(file, spec))); return module.exports; }
  function expression(source, scope) { try { return new Function('scope', 'with(scope){return (' + source + ')}')(scope); } catch (error) { console.error('WXML expression failed', source, error); return ''; } }
  function value(source, scope) { if (source == null) return ''; const full = source.match(/^\{\{((?:(?!\{\{|\}\})[\s\S])*)\}\}$/); if (full) return expression(full[1], scope); return source.replace(/\{\{([\s\S]*?)\}\}/g, (_, part) => { const result = expression(part, scope); return result == null ? '' : String(result); }); }
  function parse(source) { const text = source.replace(/\b(wx|bind|catch):/g, '$1-').replace(/\bwx-else(?=\s|\/?>)(?!\s*=)/g, 'wx-else=""').replace(/\{\{[\s\S]*?\}\}/g, part => part.replace(/</g, '&lt;')).replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;'); const result = new DOMParser().parseFromString('<root>' + text + '</root>', 'application/xml'); const error = result.querySelector('parsererror'); if (error) throw Error('WXML 解析失败：' + error.textContent.slice(0, 240)); return result.documentElement; }
  function dataset(node, scope) { return Object.fromEntries([...node.attributes].filter(attribute => attribute.name.startsWith('data-')).map(attribute => [attribute.name.slice(5).replace(/-([a-z])/g, (_, character) => character.toUpperCase()), value(attribute.value, scope)])); }
  function eventData(node, scope, event, detail) { return { type: event?.type || 'tap', detail: detail || event?.detail || {}, currentTarget: { id: node.getAttribute('id') || '', dataset: dataset(node, scope) }, target: { id: event?.target?.id || node.getAttribute('id') || '', dataset: event?.target?.dataset || {} }, touches: event?.type?.startsWith('pointer') && !['pointerup','pointercancel'].includes(event.type) ? [{clientX:event.clientX,clientY:event.clientY}] : [], changedTouches: event?.type?.startsWith('pointer') ? [{clientX:event.clientX,clientY:event.clientY}] : [], timeStamp: Date.now() }; }
  function children(source, parent, scope, owner) { let chain = false, taken = false; for (const node of source.childNodes) { if (node.nodeType === 1) { if (node.hasAttribute('wx-if')) { chain = true; taken = !!value(node.getAttribute('wx-if'), scope); if (!taken) continue; } else if (node.hasAttribute('wx-elif')) { if (!chain || taken) continue; taken = !!value(node.getAttribute('wx-elif'), scope); if (!taken) continue; } else if (node.hasAttribute('wx-else')) { if (!chain || taken) continue; taken = true; } else { chain = false; taken = false; } } else if (node.nodeType === 3 && !node.textContent.trim()) continue; renderNode(node, parent, scope, owner); } }
  function renderNode(node, parent, scope, owner) {
    if (node.nodeType === 3) { parent.append(document.createTextNode(value(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    if (node.hasAttribute('wx-for')) { const list = value(node.getAttribute('wx-for'), scope) || []; Object.entries(list).forEach(([key, item]) => { const clone = node.cloneNode(true); clone.removeAttribute('wx-for'); const index = Array.isArray(list) ? Number(key) : key; renderNode(clone, parent, { ...scope, [node.getAttribute('wx-for-item') || 'item']: item, [node.getAttribute('wx-for-index') || 'index']: index }, owner); }); return; }
    const tag = node.tagName;
    if (tag === 'block') { children(node, parent, scope, owner); return; }
    const component = components.get(tag);
    if (component) {
      const host = document.createElement(tag); parent.append(host); host.className = String(value(node.getAttribute('class'), scope) || ''); for(const attribute of node.attributes){if(/^(?:id|style|aria-.+|data-.+)$/.test(attribute.name))host.setAttribute(attribute.name,String(value(attribute.value,scope)));}
      const data = structuredClone(component.def.data || {});
      for (const [key, definition] of Object.entries(component.def.properties || {})) { const attribute = node.getAttribute(key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())); const declared = typeof definition === 'object' ? definition : { type: definition }; data[key] = attribute == null ? declared.value !== undefined ? structuredClone(declared.value) : declared.type === Boolean ? false : declared.type === String ? '' : undefined : value(attribute, scope); }
      const instance = { data, properties: data, setData(patch) { Object.assign(data, patch); }, triggerEvent(name, detail) { const handler = node.getAttribute('bind-' + name) || node.getAttribute('bind' + name); if (handler && typeof owner[handler] === 'function') owner[handler](eventData(node, scope, null, detail)); } };
      for (const [key, method] of Object.entries(component.def.methods || {})) instance[key] = method.bind(instance);
      children(component.xml, host, data, instance); return;
    }
    const map = { view: 'div', text: 'span', image: 'img', video: 'video', canvas: 'canvas', 'scroll-view': 'scroll-view', picker: 'select', slider:'input', switch:'input' };
    const element = document.createElement(map[tag] || tag); parent.append(element);
    for (const attribute of node.attributes) { const name = attribute.name; if (/^(?:wx-|bind|catch)/.test(name) || ['hover-class', 'hover-stay-time', 'hover-start-time', 'mode', 'open-type', 'scroll-y', 'scroll-x', 'enhanced', 'show-scrollbar'].includes(name)) continue; let output = value(attribute.value, scope); if ((name === 'src' || name === 'poster') && typeof output === 'string' && output.startsWith('/assets/')) output = resourceURL('/miniprogram' + output); if (['disabled', 'controls', 'autoplay', 'loop', 'muted'].includes(name)) { if (output && output !== 'false') element.setAttribute(name, ''); } else if (output != null) element.setAttribute(name, output); }
    if(tag==='slider'){element.type='range';element.style.accentColor=value(node.getAttribute('activeColor'),scope)||'#497B36';}
    if(tag==='switch'){element.type='checkbox';element.checked=!!value(node.getAttribute('checked'),scope);if(element.checked)element.setAttribute('checked','');else element.removeAttribute('checked');element.style.accentColor=value(node.getAttribute('color'),scope)||'#497B36';}
    if (tag === 'scroll-view') { const scrollY = value(node.getAttribute('scroll-y'), scope); if (scrollY === true || scrollY === '' && node.hasAttribute('scroll-y') || scrollY === 'true') element.style.overflowY = 'auto'; element.style.webkitOverflowScrolling = 'touch'; if (node.hasAttribute('scroll-top')) element._scrollTop = Number(value(node.getAttribute('scroll-top'), scope)) || 0; element._scrollInto = value(node.getAttribute('scroll-into-view'), scope); }
    if (tag === 'image') { if (node.getAttribute('mode') === 'widthFix') element.style.height = 'auto'; const mode = node.getAttribute('mode'); element.style.objectFit = mode === 'aspectFit' ? 'contain' : mode === 'aspectFill' ? 'cover' : element.style.objectFit; }
    if (tag === 'canvas') { if (!element.hasAttribute('width')) element.setAttribute('width', '750'); if (!element.hasAttribute('height')) element.setAttribute('height', '1000'); }
    if (tag === 'picker') { const range = value(node.getAttribute('range'), scope) || [], rangeKey = node.getAttribute('range-key'); range.forEach((item, index) => { const option = document.createElement('option'); option.value = index; option.textContent = rangeKey ? item[rangeKey] : item; option.selected = index === Number(value(node.getAttribute('value'), scope)); element.append(option); }); }
    else if (tag !== 'image') children(node, element, scope, owner);
    const events = { touchstart:'pointerdown',touchmove:'pointermove',touchend:'pointerup',touchcancel:'pointercancel',tap: 'click', input: 'input', changing:'input', change: 'change', error: 'error', loadedmetadata: 'loadedmetadata', load:'load', timeupdate: 'timeupdate', ended: 'ended', scroll: 'scroll' };
    for (const [native, browser] of Object.entries(events)) { const handler = node.getAttribute('bind' + native) || node.getAttribute('bind-' + native) || node.getAttribute('catch' + native) || node.getAttribute('catch-' + native); if (handler) element['on' + browser] = event => { if (node.hasAttribute('catch' + native) || node.hasAttribute('catch-' + native)) event.stopPropagation(); if (element.disabled) return; if(browser==='pointerdown'&&element.setPointerCapture)element.setPointerCapture(event.pointerId); const detail = browser === 'input' || browser === 'change' ? { value: tag==='switch'?event.target.checked:tag==='slider'?Number(event.target.value):event.target.value } : browser === 'timeupdate' ? {currentTime:event.target.currentTime,duration:event.target.duration} : browser === 'scroll' ? { scrollTop: event.target.scrollTop, scrollLeft: event.target.scrollLeft } : {}; if (typeof owner[handler] === 'function') owner[handler](eventData(node, scope, event, detail)); else console.error('Missing WXML handler', handler); }; }
    if (node.getAttribute('open-type') === 'share') { const tap = element.onclick; element.onclick = event => { if (element.disabled) return; if (tap) tap(event); const info = current.onShareAppMessage ? current.onShareAppMessage({ from: 'button', target: { id: element.id, dataset: element.dataset } }) : {}; showDialog({ title: info.title || '分享学习成果', content: '可在微信中与朋友分享你的学习收获。', showCancel: false, confirmText: '返回游戏' }).then(() => current.onShow && current.onShow()); }; }
  }
  // Morphing retains the actual scroll-view, focus, image/video and canvas nodes
  // while a one-second timer updates text. It never reconstructs the whole page.
  function morph(previous, next) {
    if (previous.nodeType !== next.nodeType || previous.nodeName !== next.nodeName) { previous.replaceWith(next); return next; }
    if (next.nodeType === 3) { if (previous.textContent !== next.textContent) previous.textContent = next.textContent; return previous; }
    if (next.nodeType !== 1) return previous;
    for (const attribute of [...previous.attributes]) if (!next.hasAttribute(attribute.name)) previous.removeAttribute(attribute.name);
    for (const attribute of next.attributes) if (previous.getAttribute(attribute.name) !== attribute.value) previous.setAttribute(attribute.name, attribute.value);
    if(next.tagName==='INPUT'){previous.checked=next.checked;if(previous.value!==next.value)previous.value=next.value;}
    for (const event of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onclick', 'oninput', 'onchange', 'onerror', 'onloadedmetadata','onload', 'ontimeupdate', 'onended', 'onscroll']) previous[event] = next[event];
    if (next._scrollTop != null && previous._scrollTop !== next._scrollTop) { previous.scrollTop = next._scrollTop; previous._scrollTop = next._scrollTop; }
    if (next._scrollInto && previous._scrollInto !== next._scrollInto) { previous._scrollInto = next._scrollInto; requestAnimationFrame(() => { const target = document.getElementById(next._scrollInto); if (target && previous.contains(target)) previous.scrollTo({ top: previous.scrollTop + target.getBoundingClientRect().top - previous.getBoundingClientRect().top, behavior: 'smooth' }); }); }
    if (!next._scrollInto) previous._scrollInto = '';
    const oldChildren = [...previous.childNodes], newChildren = [...next.childNodes];
    for (let index = 0; index < Math.max(oldChildren.length, newChildren.length); index++) { if (!newChildren[index]) oldChildren[index]?.remove(); else if (!oldChildren[index]) previous.append(newChildren[index]); else morph(oldChildren[index], newChildren[index]); }
    return previous;
  }
  // Canvas 2D is the same original-pixel renderer used by the native component.
  // The preview adapter supplies DOM canvas/image lifecycle; game state is unchanged.
  const mascotCanvases = new Set();
  function syncMascotCanvases() {
    for(const node of mascotCanvases)if(!node.isConnected){node._mascotAnimator?.stop();mascotCanvases.delete(node);}
    for(const node of document.querySelectorAll('canvas.mascot-motion-canvas')){
      mascotCanvases.add(node);const pose=node.dataset.mascotPose,rig=execute('/miniprogram/services-v4/mascot-rig.js').rigs[pose];if(!rig||rig.extension)continue;
      const update=()=>{const ready=!!node._mascotAnimator;node.closest('.actor-original')?.classList.toggle('canvas-ready',ready);node._mascotAnimator?.update({playing:node.dataset.playing==='true',responding:node.dataset.responding==='true',cycle:Number(node.dataset.cycle)||0});};
      if(node._mascotPose!==pose){node._mascotAnimator?.stop();node._mascotAnimator=null;node._mascotPose=pose;const image=new Image();image.onload=()=>{if(!node.isConnected||node._mascotPose!==pose)return;const bounds=node.getBoundingClientRect();if(!bounds.width||!bounds.height)return;node._mascotAnimator=execute('/miniprogram/services-v4/mascot-canvas.js').createAnimator({canvas:node,image,rig,width:bounds.width,height:bounds.height,pixelRatio:devicePixelRatio,onError:()=>{node._mascotAnimator=null;node.closest('.actor-original')?.classList.remove('canvas-ready');}});update();};image.src=resourceURL('/miniprogram'+rig.source);}
      update();
    }
  }
  function paint() { if (!current?.xml || painting) return; painting = true; try { const next = document.createElement('main'); next.id = 'app'; children(current.xml, next, current.data, current); if(current._paintedRoute!==current.data.route){document.getElementById('app').replaceWith(next);current._paintedRoute=current.data.route;}else morph(document.getElementById('app'), next); } finally { painting = false; } syncMascotCanvases(); }
  function setPath(target, key, value) { const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.'); let object = target; parts.slice(0, -1).forEach(part => { if (!object[part]) object[part] = {}; object = object[part]; }); object[parts.at(-1)] = value; }
  function toast(title) { const element = document.getElementById('native-toast'); element.textContent = title; element.style.display = 'block'; clearTimeout(window._nativeToastTimer); window._nativeToastTimer = setTimeout(() => { element.style.display = 'none'; }, 2400); }
  function showDialog(options) { return new Promise(resolve => { const backdrop = document.createElement('div'); backdrop.className = 'native-dialog-backdrop'; const dialog = document.createElement('section'); dialog.className = 'native-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); const heading = document.createElement('h2'); heading.textContent = options.title || '提示'; const content = document.createElement('p'); content.textContent = options.content || ''; if(options.imageSource){const image=document.createElement('img');image.src=options.imageSource;image.alt=options.title||'荣誉证书';image.style.cssText='display:block;width:100%;height:auto';content.replaceChildren(image);dialog.style.cssText='width:min(92vw,620px);max-height:92vh;overflow-y:auto';} const actions = document.createElement('div'); actions.className = 'native-dialog-actions'; const finish = confirm => { backdrop.remove(); const result = { confirm, cancel: !confirm }; options.success?.(result); options.complete?.(result); resolve(result); }; if (options.showCancel !== false) { const cancel = document.createElement('button'); cancel.textContent = options.cancelText || '取消'; cancel.onclick = () => finish(false); actions.append(cancel); } const confirm = document.createElement('button'); confirm.textContent = options.confirmText || '确定'; confirm.onclick = () => finish(true); actions.append(confirm); dialog.append(heading, content, actions); backdrop.append(dialog); document.body.append(backdrop); confirm.focus(); }); }
  function windowInfo() { return { pixelRatio: window.devicePixelRatio || 1, windowWidth: innerWidth, windowHeight: innerHeight, screenWidth: innerWidth, screenHeight: innerHeight, statusBarHeight: 24, safeArea: { top: 24, bottom: innerHeight - 20, left: 0, right: innerWidth, width: innerWidth, height: innerHeight - 44 }, platform: 'devtools', system: 'Browser preview', model: 'WXML preview' }; }
  window.Page = definition => { window._definition = definition; };
  window.Component = definition => { window._component = definition; };
  window.App = definition => { app = { ...definition, globalData: { ...(definition.globalData || {}) } }; };
  window.getApp = () => app || { globalData: {} };
  window.getCurrentPages = () => stack;
  window.wx = {
    getStorageSync(key) { const value = localStorage.getItem(key); return value == null ? '' : JSON.parse(value); },
    setStorageSync(key, value) { localStorage.setItem(key, JSON.stringify(value)); }, removeStorageSync(key) { localStorage.removeItem(key); },
    getStorageInfoSync() { return { keys: Object.keys(localStorage), currentSize: JSON.stringify(localStorage).length / 1024, limitSize: 10240 }; },
    openGamePreview({ url }) { const target = new URL(url); if (target.hostname !== '127.0.0.1' || !['6493','6494','6495','6496'].includes(target.port) || target.pathname !== '/preview/v4.html') throw Error('INVALID_PREVIEW_DESTINATION'); location.assign(target.href); },
    navigateTo({ url }) { return navigate(url); }, redirectTo({ url }) { return navigate(url, true); }, reLaunch({ url }) { stack = []; return navigate(url, true); },
    navigateBack({ delta = 1 } = {}) { if (stack.length > delta) { stack.splice(-delta); navigate(stack.at(-1)._url, true); } else history.back(); },
    showToast({ title }) { toast(title); }, hideToast() { document.getElementById('native-toast').style.display = 'none'; }, showModal(options) { return showDialog(options); },
    showLoading({ title = '加载中' } = {}) { toast(title); }, hideLoading() { this.hideToast(); },
    getWindowInfo: windowInfo, getSystemInfoSync: windowInfo,
    getMenuButtonBoundingClientRect() { return { width: 87, height: 32, top: 28, bottom: 60, left: innerWidth - 97, right: innerWidth - 10 }; },
    setNavigationBarTitle({ title }) { navigation.title = title; document.title = title + ' · 原生预览'; }, setNavigationBarColor(options) { Object.assign(navigation, options); },
    showShareMenu(options = {}) { options.success?.({}); }, hideShareMenu() {}, vibrateShort(options = {}) { options.success?.({}); },
    request(options) { fetch(options.url, { method: options.method || 'GET', headers: options.header, body: /^(?:POST|PUT|PATCH)$/i.test(options.method || '') ? JSON.stringify(options.data) : undefined }).then(async response => { const result = { statusCode: response.status, data: await response.json(), header: Object.fromEntries(response.headers) }; options.success?.(result); options.complete?.(result); }).catch(error => { options.fail?.({ errMsg: error.message }); options.complete?.({ errMsg: error.message }); }); },
    createInnerAudioContext(){
      const element=new Audio(),listeners={play:new Set(),error:new Set()},emit=(name,event)=>{if(!disposed)listeners[name].forEach(fn=>fn(event));};let source='',disposed=false;
      element.addEventListener('play',()=>emit('play'));element.addEventListener('error',()=>emit('error',{errMsg:'Audio unavailable',errCode:element.error?.code||0}));
      const context={play(){if(!disposed)element.play().catch(error=>emit('error',{errMsg:error.message}));},pause(){element.pause();},stop(){element.pause();try{element.currentTime=0;}catch{}},seek(time){try{element.currentTime=time;}catch{}},destroy(){disposed=true;element.pause();element.removeAttribute('src');element.load();listeners.play.clear();listeners.error.clear();},onPlay(fn){listeners.play.add(fn);},offPlay(fn){listeners.play.delete(fn);},onError(fn){listeners.error.add(fn);},offError(fn){listeners.error.delete(fn);}};
      Object.defineProperties(context,{src:{get:()=>source,set:value=>{source=value;element.src=value.startsWith('/assets/')?resourceURL('/miniprogram'+value):value;}},volume:{get:()=>element.volume,set:value=>{element.volume=Math.max(0,Math.min(1,value));}},loop:{get:()=>element.loop,set:value=>{element.loop=value;}},autoplay:{get:()=>element.autoplay,set:value=>{element.autoplay=value;}},paused:{get:()=>element.paused}});return context;
    },
    createVideoContext(id){const video=()=>document.getElementById(id);return {pause(){video()?.pause();},play(){return video()?.play();},seek(time){if(video())video().currentTime=time;}};},
    createSelectorQuery() { let selector = '', all = false, callback = null, mode = 'bounds', computedStyle = []; const query = { in() { return query; }, select(value) { selector = value; all = false; return query; }, selectAll(value) { selector = value; all = true; return query; }, fields(options, fn) { mode = options?.node ? 'node' : 'bounds'; computedStyle=options?.computedStyle||[]; callback = fn; return query; }, boundingClientRect(fn) { mode = 'bounds'; callback = fn; return query; }, exec(fn) { const elements = [...document.querySelectorAll(selector)]; const map = element => { const bounds = element.getBoundingClientRect(); if(mode==='node'&&element.tagName==='CANVAS'&&!element.createImage)element.createImage=()=>{const image=new Image(),src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(image,'src',{get:()=>src.get.call(image),set:value=>src.set.call(image,typeof value==='string'&&value.startsWith('/assets/')?resourceURL('/miniprogram'+value):value)});return image;}; return { ...Object.fromEntries(computedStyle.map(key=>[key,getComputedStyle(element)[key]])), id: element.id, dataset: { ...element.dataset }, node: mode === 'node' ? element : undefined, left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height }; }; const result = all ? elements.map(map) : elements[0] ? map(elements[0]) : null; callback?.(result); fn?.([result]); } }; return query; },
    canvasToTempFilePath(options) { try { const canvas = options.canvas || document.querySelector('#' + options.canvasId); const result = { tempFilePath: canvas.toDataURL(options.fileType==='jpg'?'image/jpeg':'image/png',options.quality) }; options.success?.(result); } catch (error) { options.fail?.({ errMsg: error.message }); } },
    previewImage(options){return showDialog({title:'荣誉证书',imageSource:options.current||options.urls?.[0],showCancel:false,confirmText:'关闭',success:options.success});},
    saveImageToPhotosAlbum({ filePath, success, fail }) { try { const anchor = document.createElement('a'); anchor.href = filePath; anchor.download = '荣誉证书.png'; anchor.click(); success?.({}); } catch (error) { fail?.({ errMsg: error.message }); } },
    downloadFile({ url, success, fail }) { fetch(url).then(response => response.blob()).then(blob => success?.({ statusCode: 200, tempFilePath: URL.createObjectURL(blob) })).catch(error => fail?.({ errMsg: error.message })); },
    openSetting({ success }) { success?.({ authSetting: { 'scope.writePhotosAlbum': true } }); }, getSetting({ success }) { success?.({ authSetting: { 'scope.writePhotosAlbum': true } }); },
    pageScrollTo({ scrollTop = 0 }) { scrollTo({ top: scrollTop, behavior: 'smooth' }); }, nextTick(fn) { requestAnimationFrame(fn); }, onWindowResize(fn) { window.addEventListener('resize', () => fn({ size: { windowWidth: innerWidth, windowHeight: innerHeight } })); }
  };
  async function readStyle(file, trail = []) {
    if (trail.includes(file)) throw Error('WXSS circular import: ' + file);
    const source = await fetchText(file), imports = [...source.matchAll(/@import\s+["']([^"']+)["']\s*;/g)];
    let output = '', position = 0;
    for (const match of imports) {
      const target = normalize(match[1].startsWith('/') ? match[1] : file.slice(0, file.lastIndexOf('/') + 1) + match[1]);
      output += source.slice(position, match.index) + await readStyle(target, [...trail, file]);
      position = match.index + match[0].length;
    }
    return output + source.slice(position);
  }
  async function loadStyle(file, componentName) { if (document.querySelector('style[data-file="' + file + '"]')) return; const source = await readStyle(file); const style = document.createElement('style'); style.dataset.file = file; style.textContent = source.replace(/(^|[},])([^{}]+)\{/g, (_, prefix, selector) => prefix + selector.replace(/(^|[\s,>+~])(page|image|text|view)(?=[\s,.#:[>+~]|$)/g, (whole, before, tag) => before + ({ page: 'body', image: 'img', text: 'span', view: 'div' })[tag]) + '{').replace(/:host/g, componentName || ':root').replace(/([\d.]+)rpx\b/g, (_, number) => 'calc(' + Number(number) / 750 + ' * 100vw)'); document.head.append(style); }
  async function loadComponent(name, source) { if (components.has(name)) return; const file = normalize('/miniprogram' + source); await preload(file + '.js'); window._component = null; execute(file + '.js'); const definition = window._component; if (!definition) throw Error('组件未注册：' + name); components.set(name, { def: definition, xml: parse(await fetchText(file + '.wxml')) }); await loadStyle(file + '.wxss', name); }
  let navigationTask=Promise.resolve();
  function navigate(url,replace=false,fromHash=false){navigationTask=navigationTask.then(()=>runNavigate(url,replace,fromHash));return navigationTask;}
  async function runNavigate(url, replace = false, fromHash = false) {
    try {
      const [path, query = ''] = url.replace(/^\//, '').split('?');
      if (current) { current.onHide?.(); current.onUnload?.(); }
      const file = '/miniprogram/' + path + '.js'; await preload(file); window._definition = null; modules.delete(file); execute(file); const definition = window._definition; if (!definition) throw Error('页面不存在：' + path);
      const page = { ...definition, data: structuredClone(definition.data || {}), _url: '/' + path + (query ? '?' + query : ''), setData(patch, callback) { for (const [key, data] of Object.entries(patch)) setPath(this.data, key, data); if (this === current) paint(); if (callback) requestAnimationFrame(callback); } };
      for (const [key, method] of Object.entries(page)) if (typeof method === 'function') page[key] = method.bind(page);
      page.xml = parse(await fetchText('/miniprogram/' + path + '.wxml'));
      const configuration = JSON.parse(await fetchText('/miniprogram/' + path + '.json'));
      for (const [name, source] of Object.entries(configuration.usingComponents || {})) await loadComponent(name, source);
      await loadStyle('/miniprogram/app.wxss'); await loadStyle('/miniprogram/' + path + '.wxss');
      current = page; route = path; if (replace) stack.pop(); stack.push(page);
      window._nativePreview = { page, route, evidenceScope: 'Actual WXML/WXSS/Page/Component source; browser only', navigation };
      page.onLoad?.(Object.fromEntries(new URLSearchParams(query))); paint(); window.scrollTo(0, 0);
      if (!fromHash) history[replace ? 'replaceState' : 'pushState']({}, '', '#/' + path + (query ? '?' + query : ''));
      if (page.onShow) await page.onShow(); document.title = (configuration.navigationBarTitleText || '趣味闯关') + ' · 原生预览';
    } catch (error) { console.error(error); const root = document.getElementById('app'); root.replaceChildren(); const panel = document.createElement('div'); panel.className = 'native-fatal'; panel.textContent = '页面加载失败：' + error.message; const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.onclick = () => location.reload(); panel.append(retry); root.append(panel); }
  }
  window.addEventListener('keydown',event=>{if(!current||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.metaKey||event.ctrlKey)return;const options=[...document.querySelectorAll('button.option:not(:disabled)')];if(/^[1-4]$/.test(event.key)){options[Number(event.key)-1]?.click();event.preventDefault();}if(event.key==='Enter'&&current.data.route==='quiz'){document.querySelector('#footer-primary button:not(:disabled)')?.click();event.preventDefault();}});
  window.addEventListener('resize',()=>current?.onResize?.());
  window.addEventListener('popstate', () => navigate(location.hash.slice(1) || firstPage, true, true));
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>current?.readMotionPreference?.());
  document.addEventListener('visibilitychange', () => { if (document.hidden) current?.onHide?.(); else current?.onShow?.(); });
  (async () => { try { const appConfig=JSON.parse(await fetchText('/miniprogram/app.json'));firstPage='/'+appConfig.pages[0];await preload('/miniprogram/app.js'); execute('/miniprogram/app.js'); app?.onLaunch?.(); await navigate(location.hash.slice(1) || firstPage, true, true); } catch (error) { console.error(error); document.getElementById('app').textContent = error.message; } })();
})();
