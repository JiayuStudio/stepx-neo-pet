import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '../web/node_modules/typescript/lib/typescript.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let bundle = fs.readFileSync(path.join(root, 'engine/host.js'), 'utf8');
for (const name of ['types','progression','stories','save','transfer','store']) {
  const input = fs.readFileSync(path.join(root, 'vendor/mori-game', name + '.ts'), 'utf8');
  const output = ts.transpileModule(input, { compilerOptions: {
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, downlevelIteration: true,
  }}).outputText;
  bundle += `\nmodules[${JSON.stringify(name)}] = function(module, exports, require) {\n${output}\n};\n`;
}
bundle += fs.readFileSync(path.join(root, 'engine/api.js'), 'utf8');
fs.writeFileSync(path.join(root, 'app/assets/mori-engine.js'), bundle);
console.log('Mori engine bundled from 6 upstream modules');
