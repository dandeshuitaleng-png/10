'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const { createCanvas, loadImage } = require('../tools/lib/project-tools.cjs').dependency(
  '@napi-rs/canvas'
);
const { createAnimator } = require('../miniprogram/services-v4/mascot-canvas'),
  { rigs } = require('../miniprogram/services-v4/mascot-rig');
const source = fs.readFileSync(path.join(__dirname, '../preview/v4-runtime.js'), 'utf8');
class Element {
  constructor(tag, attrs = {}, children = []) {
    this.nodeType = 1;
    this.nodeName = this.tagName = tag;
    this.attrs = new Map(Object.entries(attrs));
    this.childNodes = children;
    this.style = {};
    this.classList = {
      contains: (name) => (this.getAttribute('class') || '').split(/\s+/).includes(name)
    };
  }
  get attributes() {
    return [...this.attrs].map(([name, value]) => ({ name, value }));
  }
  hasAttribute(name) {
    return this.attrs.has(name);
  }
  getAttribute(name) {
    return this.attrs.get(name) ?? null;
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
  }
  removeAttribute(name) {
    this.attrs.delete(name);
  }
  append(child) {
    this.childNodes.push(child);
  }
}
class CanvasElement extends Element {
  constructor() {
    super('CANVAS');
    this.buffer = createCanvas(300, 150);
  }
  get width() {
    return this.buffer.width;
  }
  set width(n) {
    this.setAttribute('width', n);
  }
  get height() {
    return this.buffer.height;
  }
  set height(n) {
    this.setAttribute('height', n);
  }
  setAttribute(name, value) {
    super.setAttribute(name, value);
    if (name === 'width' || name === 'height') this.buffer[name] = Number(value);
  }
  // The HTML Canvas default dimensions apply when its content attributes vanish.
  removeAttribute(name) {
    super.removeAttribute(name);
    if (name === 'width') this.buffer.width = 300;
    if (name === 'height') this.buffer.height = 150;
  }
  getContext(type) {
    return this.buffer.getContext(type);
  }
}
const context = {
  components: new Map(),
  document: {
    createElement: (tag) =>
      tag === 'canvas' ? new CanvasElement() : new Element(tag.toUpperCase())
  }
};
vm.createContext(context);
vm.runInContext(
  source.slice(source.indexOf('  function expression('), source.indexOf('  function parse(')) +
    source.slice(source.indexOf('  function children('), source.indexOf('  // Canvas 2D')) +
    ';this.morph=morph;this.renderNode=renderNode;',
  context
);
// The shipped mascot is now image-only. Keep the legacy canvas adapter check
// as an offline renderer/DOM-morph regression, not a current component fixture.
const canvasAttributes = {
  type: '2d',
  id: 'original-motion',
  class: 'mascot-motion-canvas',
  'data-mascot-pose': '{{pose}}',
  'data-playing': '{{playing}}',
  'data-responding': '{{responding}}',
  'data-cycle': '{{cycle}}'
};
function renderScroll(pose, cycle) {
  const parent = new Element('DIV'),
    template = new Element('scroll-view', { 'scroll-y': 'true', 'scroll-top': '100' }, [
      new Element('canvas', canvasAttributes)
    ]);
  context.renderNode(template, parent, { pose, playing: true, responding: false, cycle }, {});
  return parent.childNodes[0];
}
test('legacy canvas adapter, scroll morph and animation preserve pixels and dimensions for all four poses', async () => {
  for (const pose of ['welcome', 'celebrate', 'observe', 'think'])
    for (const pixelRatio of [1, 2, 3]) {
      const rig = rigs[pose],
        scroll = renderScroll(pose, 0),
        canvas = scroll.childNodes[0],
        image = await loadImage(path.join(__dirname, '../miniprogram', rig.source));
      const actor = createAnimator({ canvas, image, rig, width: 76, height: 120, pixelRatio });
      canvas._mascotAnimator = actor;
      actor.drawFrame(0.4);
      const before = canvas.buffer.toBuffer('image/png'),
        matrix = canvas.getContext('2d').getTransform();
      scroll.scrollTop = 100;
      for (let i = 0; i < 40; i++) {
        scroll.scrollTop = 100 + i;
        const next = renderScroll(pose, i);
        context.morph(scroll, next);
        assert.equal(canvas.width, 76 * pixelRatio, pose + ' live width reset during scrolling');
        assert.equal(canvas.height, 120 * pixelRatio, pose + ' live height reset during scrolling');
        assert.equal(
          canvas.getContext('2d').getTransform().a,
          matrix.a,
          pose + ' drawing transform reset'
        );
        assert.equal(scroll.scrollTop, 100 + i, 'user scroll must not snap back to focus');
        actor.drawFrame(0.4);
        assert(
          canvas.buffer.toBuffer('image/png').equals(before),
          pose + ' same held gesture frame changed after a scroll repaint'
        );
      }
      actor.stop();
    }
});
test('live animator owns buffer attributes even if an incoming template declares stale dimensions', () => {
  const canvas = new CanvasElement();
  canvas.width = 152;
  canvas.height = 240;
  canvas._mascotAnimator = {};
  canvas.getContext('2d').scale(0.3, 0.3);
  const scale = canvas.getContext('2d').getTransform().a;
  for (const attrs of [{ width: '750', height: '1000' }, {}]) {
    context.morph(canvas, new Element('CANVAS', { class: 'mascot-motion-canvas', ...attrs }));
    assert.equal(canvas.width, 152);
    assert.equal(canvas.height, 240);
    assert.equal(canvas.getContext('2d').getTransform().a, scale);
  }
});
test('certificate and share canvases retain generic defaults and declared size updates', () => {
  for (const id of ['certificate-canvas', 'share-cover-canvas']) {
    const parent = new Element('DIV');
    context.renderNode(new Element('canvas', { id }), parent, {}, {});
    const canvas = parent.childNodes[0];
    assert.equal(canvas.width, 750);
    assert.equal(canvas.height, 1000);
    context.morph(canvas, new Element('CANVAS', { id, width: '900', height: '1280' }));
    assert.equal(canvas.width, 900);
    assert.equal(canvas.height, 1280);
  }
});
