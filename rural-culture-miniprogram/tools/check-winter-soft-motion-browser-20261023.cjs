'use strict';
const path = require('node:path');
const { checkWinterBrowser } = require('./lib/check-winter-browser.cjs');
checkWinterBrowser(path.resolve(__dirname, '../qa/winter-soft-motion-20261023'))
  .then((checks) => console.log(JSON.stringify({ passed: true, checks: checks.length })))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
