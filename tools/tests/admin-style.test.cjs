'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const admin = path.resolve(__dirname, '../../quiz-admin');
const postcss = createRequire(path.join(admin, 'package.json'))('postcss');

test('actual built styles retain approved spacing regardless of deferred form/table load order', () => {
  const dist = path.join(admin, 'dist');
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'));
  const css = (entry) =>
    manifest[entry].css.map((file) =>
      postcss.parse(fs.readFileSync(path.join(dist, file), 'utf8'))
    );
  const initial = css('index.html'),
    forms = css('src/ui/form-components.js'),
    tables = css('src/ui/table-components.js');
  function winner(roots, selector, property) {
    let result,
      priority = -1;
    for (const root of roots)
      root.walkRules((rule) => {
        if (rule.selector !== selector) return;
        let layered = false;
        for (let parent = rule.parent; parent; parent = parent.parent)
          if (parent.type === 'atrule' && parent.name === 'layer') layered = true;
        rule.walkDecls((decl) => {
          let value = decl.value;
          if (property === 'padding-left' && decl.prop === 'padding')
            value = decl.value.split(/\s+/)[1] || decl.value;
          else if (decl.prop !== property) return;
          const rank = layered ? 0 : 1;
          if (rank >= priority) {
            priority = rank;
            result = value;
          }
        });
      });
    return result;
  }
  for (const roots of [
    [...initial, ...forms, ...tables],
    [...initial, ...tables, ...forms]
  ]) {
    assert.equal(winner(roots, '.el-dialog', '--el-dialog-padding-primary'), '24px');
    assert.equal(winner(roots, '.el-form-item', 'margin-bottom'), '22px');
    assert.equal(winner(roots, '.el-table .cell', 'padding-left'), '15px');
  }
});
