const test = require('node:test');
const assert = require('node:assert/strict');
const { Input } = require('../js/core/input');

function mapInput() {
  const actions = [], deltas = [];
  const input = new Input(action => actions.push(action), delta => deltas.push(delta));
  input.scrollRegion = { x: 20, y: 100, w: 335, h: 360 };
  input.setTargets([{ id: 'level-1', x: 80, y: 125, w: 148, h: 52, action: { type: 'level', index: 0 } }]);
  return { input, actions, deltas };
}

test('地图空白处开始滚动，反向经过起点仍连续滚动', () => {
  const { input, actions, deltas } = mapInput();
  input.start({ x: 280, y: 200 }, 1);
  input.move({ x: 280, y: 180 }, 1);
  input.move({ x: 280, y: 190 }, 1);
  input.move({ x: 280, y: 200 }, 1);
  input.move({ x: 280, y: 205 }, 1);
  input.end({ x: 280, y: 205 }, 1);
  assert.deepEqual(deltas, [20, -10, -10, -5]);
  assert.deepEqual(actions, []);
  assert.equal(input.active, null);
});

test('从关卡节点拖动再回到节点松手不打开关卡，后续正常点击仍有效', () => {
  const { input, actions, deltas } = mapInput();
  input.start({ x: 120, y: 150 }, 3);
  assert.equal(input.pressedId, 'level-1');
  input.move({ x: 120, y: 134 }, 3);
  assert.equal(input.pressedId, null);
  input.move({ x: 120, y: 143 }, 3);
  input.move({ x: 120, y: 150 }, 3);
  input.end({ x: 120, y: 150 }, 3);
  assert.deepEqual(deltas, [16, -9, -7]);
  assert.deepEqual(actions, []);
  input.start({ x: 120, y: 150 }, 4);
  input.end({ x: 120, y: 150 }, 4);
  assert.deepEqual(actions, [{ type: 'level', index: 0 }]);
});

test('其他手指不接管或结束本次拖动，取消后迟到事件不滚动或点击', () => {
  const { input, actions, deltas } = mapInput();
  input.start({ x: 120, y: 150 }, 7);
  input.start({ x: 120, y: 150 }, 8);
  input.move({ x: 120, y: 110 }, 8);
  input.end({ x: 120, y: 110 }, 8);
  assert.deepEqual(deltas, []);
  assert.deepEqual(actions, []);
  assert.equal(input.active.id, 7);
  input.move({ x: 120, y: 130 }, 7);
  assert.deepEqual(deltas, [20]);
  input.cancel();
  input.move({ x: 120, y: 150 }, 7);
  input.end({ x: 120, y: 150 }, 7);
  assert.deepEqual(deltas, [20]);
  assert.deepEqual(actions, []);
  input.start({ x: 120, y: 150 }, 9);
  input.end({ x: 120, y: 150 }, 9);
  input.end({ x: 120, y: 150 }, 9);
  assert.deepEqual(actions, [{ type: 'level', index: 0 }]);
});
