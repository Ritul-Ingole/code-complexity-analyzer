const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildFileGraph, readResolverConfig } = require(process.env.GRAPH_ENGINE_PATH || '../dist/fileGraph.js');

const graph = (src, config = {}) => buildFileGraph(
  Object.entries(src).map(([path, content]) => ({ path, content })),
  Object.entries(src).filter(([, c]) => c !== null).map(([path]) => ({ path, loc: 10, functions: 1, complexity: 12 })),
  config
);

const calls = g => g.edges.filter(e => e.kind === 'call');

test('named imports and repeated call counts', () => {
  const g = graph({
    'a.ts': 'import {go as run} from "./b";run();run()',
    'b.ts': 'export function go(){}'
  });
  assert.equal(calls(g)[0].count, 2);
  assert.deepEqual(calls(g)[0].symbols, ['go']);
});

test('namespace, optional and string-member calls', () => {
  const g = graph({
    'a.ts': 'import * as util from "./b.js";util.go();util?.go?.();util["go"]();util[unknown]()',
    'b.ts': 'export const go=()=>1'
  });
  assert.equal(calls(g)[0].count, 3);
});

test('default imports and emitted js paths', () => {
  const g = graph({
    'a.ts': 'import run from "./b.js";run()',
    'b.ts': 'export default ()=>1'
  });
  assert.equal(calls(g)[0].target, 'b.ts');
  assert.deepEqual(calls(g)[0].symbols, ['default']);
});

test('block, parameter, catch and hoisted var shadowing', () => {
  const g = graph({
    'a.ts': 'import {go} from "./b";function f(go){go()} {const go=()=>0;go()} try{}catch(go){go()} function h(){go();if(true){var go=()=>1}} go()',
    'b.ts': 'export function go(){}'
  });
  assert.equal(calls(g)[0].count, 1);
});

test('loop and nested function shadows', () => {
  const g = graph({
    'a.ts': 'import {go} from "./b";for(let go of []){go()} function f(){function go(){};go()} go()',
    'b.ts': 'export function go(){}'
  });
  assert.equal(calls(g)[0].count, 1);
});

test('type-only and external imports do not invent edges', () => {
  const g = graph({
    'a.ts': 'import type {T} from "./b";import {type U} from "./b";import fs from "node:fs";fs.readFileSync("x")',
    'b.ts': 'export type T=string;export type U=number'
  });
  assert.equal(g.edges.length, 0);
  assert.equal(g.coverage.unresolvedModules, 1);
});

test('index and barrel imports stop at imported module', () => {
  const g = graph({
    'a.ts': 'import {go} from "./lib";go()',
    'lib/index.ts': 'export {go} from "./impl"',
    'lib/impl.ts': 'export const go=()=>1'
  });
  assert.equal(calls(g)[0].target, 'lib/index.ts');
  assert.ok(g.edges.some(e => e.source === 'lib/index.ts' && e.target === 'lib/impl.ts'));
});

test('require and dynamic imports are dependency-only', () => {
  const g = graph({
    'a.js': 'const b=require("./b");b.go();import("./b")',
    'b.js': 'exports.go=()=>1'
  });
  assert.equal(calls(g).length, 0);
  assert.equal(g.edges[0].count, 2);
});

test('shadowed require does not create a dependency', () => {
  assert.equal(graph({
    'a.js': 'function f(require){require("./b")}',
    'b.js': 'exports.x=1'
  }).edges.length, 0);
});

test('failed fetches and parses reported; isolated files retained', () => {
  const g = graph({
    'bad.ts': 'const = ;',
    'lost.ts': null,
    'ok.ts': 'const x=2'
  });
  assert.equal(g.nodes.length, 2);
  assert.equal(g.coverage.parsed, 1);
  assert.equal(g.coverage.failed.length, 2);
});

test('root config aliases read as syntax, never executed', () => {
  const config = readResolverConfig('{/*comment*/"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}},}');
  const g = graph({
    'src/a.ts': 'import {go} from "@/b";go()',
    'src/b.ts': 'export const go=()=>1'
  }, config);
  assert.equal(calls(g)[0].target, 'src/b.ts');
  assert.deepEqual(readResolverConfig('process.exit(1)'), { paths: {} });
});

test('missing alias config never guesses links', () => {
  const g = graph({
    'a.ts': 'import {go} from "@/b";go()',
    'src/b.ts': 'export const go=()=>1'
  });
  assert.equal(g.edges.length, 0);
  assert.equal(g.coverage.unresolvedModules, 1);
});

test('deterministic results and valid edge endpoints', () => {
  const s = {
    'a.ts': 'import {go} from "./b";go()',
    'b.ts': 'export const go=()=>1'
  };
  const g = graph(s);
  assert.deepEqual(g, graph(s));
  
  const ids = new Set(g.nodes.map(n => n.path));
  for (const e of g.edges) {
    assert.ok(ids.has(e.source));
    assert.ok(ids.has(e.target));
  }
});

test('large graphs respect storage budget with truncation metadata', () => {
  const src = {};
  for (let i = 0; i < 100; i++) {
    src[`f${i}.ts`] = Array.from({ length: 100 }, (_, j) => 
      i !== j ? `import {run as run${j}} from './f${j}';run${j}();` : ''
    ).join('\n') + '\nexport function run(){}';
  }
  
  const g = graph(src);
  assert.ok(g.coverage.truncated);
  assert.ok(g.coverage.totalEdges > g.edges.length);
  assert.ok(Buffer.byteLength(JSON.stringify(g)) <= 220000);
});