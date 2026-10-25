'use strict';

// Constrained-size renderer fixtures may replace this one metrics expression.
// Accept ordinary formatting so readability changes do not break the harness.
module.exports =
  /const\s+i\s*=\s*wx\.getWindowInfo\s*\?\s*wx\.getWindowInfo\(\)\s*:\s*wx\.getSystemInfoSync\(\),\s*m\s*=\s*homeLayout\.metrics\(\s*i,\s*wx\.getMenuButtonBoundingClientRect\s*\?\s*wx\.getMenuButtonBoundingClientRect\(\)\s*:\s*null,\s*skin\.gameId\s*\);/;
