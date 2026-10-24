import { readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

/** Load pure TypeScript domain modules with a fresh module graph per test fixture. */
export function loadTypescript(entry) {
  const cache = new Map(), require = createRequire(import.meta.url);
  const load = filename => {
    const path = resolve(filename);
    if (cache.has(path)) return cache.get(path).exports;
    const module = {exports:{}}; cache.set(path,module);
    const js = ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInThisContext('(function(exports,module,require){'+js+'\n})',{filename:path})(module.exports,module,specifier=>specifier.startsWith('.') ? load(resolve(dirname(path),specifier+(extname(specifier)?'':'.ts'))) : require(specifier));
    return module.exports;
  };
  return load(entry);
}
