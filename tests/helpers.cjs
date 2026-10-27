const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTypeScript(filename, apiFetch = () => {}) {
  const absolute = path.resolve(filename);
  const mod = new Module(absolute, module);
  mod.require = (name) => {
    if (name === '@/lib/api') return { apiFetch };
    if (name.startsWith('@/')) return loadTypeScript(path.join(__dirname, '../src', name.slice(2) + '.ts'), apiFetch);
    return require(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, absolute);
  return mod.exports;
}
module.exports = { loadTypeScript };
