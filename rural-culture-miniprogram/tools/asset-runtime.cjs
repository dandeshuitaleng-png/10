'use strict';
const { dependency } = require('./lib/project-tools.cjs');
function sharp() {
  return dependency('sharp');
}
module.exports = { sharp };
