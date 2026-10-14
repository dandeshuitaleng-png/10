const { THEMES } = require('./themes');

// Read-only formal progress until a verified progress source is connected.
// Local playtests never mutate these values or write them to player storage.
const THEME_PROGRESS = Object.freeze(Object.fromEntries(THEMES.map((theme) => [
  theme.id,
  Object.freeze({ completed: 0, nodes: Object.freeze(['current', 'locked', 'locked', 'locked']) }),
])));

module.exports = { THEME_PROGRESS };
