const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const modules = [];
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(file);
    else if(entry.name.endsWith('.js')) {
      const id='/'+path.relative(root,file).split(path.sep).join('/');
      modules.push(`${JSON.stringify(id)}:function(module,exports,require){\n${fs.readFileSync(file,'utf8')}\n}`);
    }
  }
}
walk(path.join(root,'js'));
modules.push('"/design/fixtures.js":function(module,exports,require){\n'+fs.readFileSync(path.join(root,'design/fixtures.js'),'utf8')+'\n}');
const loader=`(function(){const modules={${modules.join(',\n')}};const cache={};window.quizRequire=function load(id,from='/'){let resolved=id.startsWith('/')?id:from.slice(0,from.lastIndexOf('/')+1)+id;const parts=[];for(const p of resolved.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}resolved='/'+parts.join('/');if(!resolved.endsWith('.js'))resolved+='.js';if(cache[resolved])return cache[resolved].exports;if(!modules[resolved])throw new Error('Unknown module '+resolved);const module={exports:{}};cache[resolved]=module;modules[resolved](module,module.exports,(next)=>load(next,resolved));return module.exports;};})();`;
fs.writeFileSync(path.join(root,'design/runtime-bundle.js'),loader);
console.log('Editable preview bundle built; no third-party modules.');
