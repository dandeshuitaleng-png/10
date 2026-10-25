'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const pattern = require('../tools/native-metrics-source.cjs');

test('native size fixtures replace exactly one real metrics expression after source formatting', () => {
  const source = fs.readFileSync(require.resolve('../miniprogram/pages/game/index.js'), 'utf8');
  assert.equal([...source.matchAll(new RegExp(pattern.source, 'g'))].length, 1);
  const replacement = 'const i={windowWidth:320},m=homeLayout.metrics(i,null,skin.gameId);';
  const staged = source.replace(pattern, replacement);
  assert.ok(staged.includes(replacement));
  new vm.Script(staged);
  const compressed =
    'const i=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),m=homeLayout.metrics(i,wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null,skin.gameId);';
  assert.equal(compressed.replace(pattern, replacement), replacement);
});
