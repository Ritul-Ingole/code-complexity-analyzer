import { parse, parseExpression } from "@babel/parser"
import { posix } from "node:path"

export interface FileMetric { 
  path: string; 
  loc: number; 
  functions: number; 
  complexity: number 
}

export interface FileGraph { 
  version: 1; 
  engine: "babel-static-v1"; 
  nodes: FileMetric[]; 
  edges: Array<{
    source: string; 
    target: string; 
    kind: "import" | "call"; 
    count: number; 
    symbols: string[]
  }>; 
  coverage: {
    fetched: number; 
    parsed: number; 
    failed: string[]; 
    unresolvedModules: number; 
    totalEdges: number; 
    truncated: boolean
  } 
}

// Permissive Babel AST boundary stays inside the extractor.
type Ast = { type: string; [key: string]: any }
type Binding = { target: string; symbol: string; namespace: boolean } | null
export interface ResolverConfig { baseUrl?: string; paths?: Record<string, string[]> }

export function readResolverConfig(content: string | null): ResolverConfig {
  if (!content) return {}
  try {
    const object = parseExpression(content) as unknown as Ast
    const property = (n: Ast, name: string) => 
      n?.type === 'ObjectExpression' 
        ? n.properties.find((p: Ast) => p.type === 'ObjectProperty' && !p.computed && (p.key.name || p.key.value) === name)?.value 
        : undefined
        
    const compiler = property(object, 'compilerOptions'), 
          base = property(compiler, 'baseUrl'), 
          aliases = property(compiler, 'paths')
          
    const paths: Record<string, string[]> = {}
    
    if (aliases?.type === 'ObjectExpression') {
      for (const p of aliases.properties) {
        if (p.type !== 'ObjectProperty' || p.computed || p.value.type !== 'ArrayExpression') continue;
        const name = p.key.name || p.key.value;
        if (typeof name === 'string') {
          paths[name] = p.value.elements
            .filter((e: Ast) => e?.type === 'StringLiteral')
            .map((e: Ast) => e.value)
        }
      }
    }
    return { ...(base?.type === 'StringLiteral' ? { baseUrl: base.value } : {}), paths }
  } catch { 
    return {} 
  }
}

export function buildFileGraph(files: Array<{path: string; content: string | null}>, metrics: FileMetric[], config: ResolverConfig = {}): FileGraph {
  const paths = new Set(metrics.map(f => f.path)), 
        edges = new Map<string, FileGraph['edges'][number]>(), 
        failed: string[] = []
  let parsed = 0, unresolvedModules = 0

  const add = (source: string, target: string, kind: 'import' | 'call', symbol = '') => {
    if (source === target) return;
    const key = JSON.stringify([source, target, kind]);
    const e = edges.get(key) || { source, target, kind, count: 0, symbols: [] };
    e.count++;
    if (symbol && !e.symbols.includes(symbol) && e.symbols.length < 6) {
      e.symbols.push(symbol.slice(0, 100));
    }
    edges.set(key, e)
  }

  const resolve = (from: string, spec: string) => {
    const candidates: string[] = []
    if (spec.startsWith('.')) {
      candidates.push(posix.join(posix.dirname(from), spec))
    } else {
      for (const [pattern, targets] of Object.entries(config.paths || {}).sort((a, b) => b[0].length - a[0].length)) {
        const star = pattern.indexOf('*'), 
              prefix = star < 0 ? pattern : pattern.slice(0, star), 
              suffix = star < 0 ? '' : pattern.slice(star + 1);
              
        if (star < 0 ? spec !== pattern : !spec.startsWith(prefix) || !spec.endsWith(suffix)) continue;
        
        const wildcard = star < 0 ? '' : spec.slice(prefix.length, suffix.length ? -suffix.length : undefined);
        for (const target of targets) {
          candidates.push(posix.join(config.baseUrl || '.', target.replace('*', wildcard)))
        }
      }
      if (config.baseUrl) candidates.push(posix.join(config.baseUrl, spec))
    }
    
    for (const c of candidates) {
      const stem = posix.normalize(c);
      if (stem.startsWith('../') || posix.isAbsolute(stem)) continue;
      
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
        if (paths.has(stem + ext)) return stem + ext;
      }
      
      if (/\.jsx?$/.test(stem)) {
        for (const ext of ['.ts', '.tsx']) {
          const x = stem.replace(/\.jsx?$/, ext);
          if (paths.has(x)) return x;
        }
      }
    }
  }

  const children = (n: Ast): Ast[] => 
    Object.entries(n).flatMap(([key, v]) => 
      ['loc', 'comments', 'tokens', 'errors'].includes(key) ? [] : (Array.isArray(v) ? v : [v]).filter(x => x && typeof x === 'object' && typeof x.type === 'string')
    )

  const names = (p: Ast | undefined): string[] => {
    if (!p) return [];
    if (p.type === 'Identifier') return [p.name];
    if (p.type === 'AssignmentPattern') return names(p.left);
    if (p.type === 'RestElement') return names(p.argument);
    if (p.type === 'ObjectPattern') return p.properties.flatMap((x: Ast) => names(x.type === 'RestElement' ? x.argument : x.value));
    if (p.type === 'ArrayPattern') return p.elements.flatMap((x: Ast) => names(x));
    return []
  }

  const isFunction = (n: Ast) => /Function/.test(n.type) || ['ObjectMethod', 'ClassMethod', 'ClassPrivateMethod'].includes(n.type)
  const isScope = (n: Ast) => isFunction(n) || ['Program', 'BlockStatement', 'CatchClause', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'SwitchStatement', 'ClassDeclaration', 'ClassExpression'].includes(n.type)

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    if (file.content === null) { failed.push(file.path); continue }
    let ast: Ast
    try {
      const result = parse(file.content, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'], errorRecovery: true });
      if (result.errors?.length) { failed.push(file.path); continue }
      ast = result.program as unknown as Ast; 
      parsed++
    } catch { 
      failed.push(file.path); 
      continue 
    }
    
    const imports = new Map<string, Binding>()
    const dependency = (spec: string) => {
      const target = resolve(file.path, spec);
      if (target) add(file.path, target, 'import');
      else unresolvedModules++;
      return target
    }
    
    for (const n of ast.body) {
      if (n.type === 'ImportDeclaration') {
        if (n.importKind === 'type') continue;
        const runtime = n.specifiers.filter((s: Ast) => s.importKind !== 'type');
        if (n.specifiers.length && !runtime.length) continue;
        
        const target = dependency(n.source.value);
        for (const spec of runtime) {
          if (target) {
            imports.set(spec.local.name, {
              target, 
              namespace: spec.type === 'ImportNamespaceSpecifier', 
              symbol: spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported?.name || spec.imported?.value || '*'
            })
          }
        }
      } else if (['ExportNamedDeclaration', 'ExportAllDeclaration'].includes(n.type) && n.source && n.exportKind !== 'type') {
        dependency(n.source.value)
      }
    }
    
    const visit = (node: Ast, stack: Array<Map<string, Binding>>) => {
      let scopes = stack
      if (isScope(node)) {
        const scope = node.type === 'Program' ? new Map(imports) : new Map<string, Binding>();
        const bind = (p: Ast | undefined) => names(p).forEach(name => scope.set(name, null))
        
        if (isFunction(node)) {
          node.params?.forEach(bind);
          if (node.id) bind(node.id)
        }
        if (node.type === 'CatchClause') bind(node.param);
        if (node.type.startsWith('Class')) bind(node.id)
        
        const collect = (n: Ast, root: boolean) => {
          if (!root && isFunction(n)) {
            if (n.type === 'FunctionDeclaration') bind(n.id);
            return
          }
          if (!root && n.type.startsWith('Class')) {
            if (n.type === 'ClassDeclaration') bind(n.id);
            return
          }
          if (!root && isScope(n)) {
            if (isFunction(node) || node.type === 'Program') {
              const hoist = (c: Ast) => {
                if (isFunction(c) || c.type.startsWith('Class')) return;
                if (c.type === 'VariableDeclaration' && c.kind === 'var') c.declarations.forEach((d: Ast) => bind(d.id));
                children(c).forEach(hoist)
              };
              hoist(n)
            }
            return
          }
          if (n.type === 'VariableDeclaration') n.declarations.forEach((d: Ast) => bind(d.id));
          children(n).forEach(c => collect(c, false))
        }
        collect(node, true);
        scopes = [...stack, scope]
      }
      
      const lookup = (name: string) => {
        for (let i = scopes.length - 1; i >= 0; i--) {
          if (scopes[i].has(name)) return scopes[i].get(name);
        }
        return undefined
      }
      
      if (['CallExpression', 'OptionalCallExpression', 'NewExpression'].includes(node.type)) {
        const c = node.callee
        if ((c?.type === 'Import' || (c?.type === 'Identifier' && c.name === 'require' && lookup('require') === undefined)) && node.arguments?.[0]?.type === 'StringLiteral') {
          dependency(node.arguments[0].value)
        } else {
          let binding: Binding | undefined, symbol = '';
          if (c?.type === 'Identifier') {
            binding = lookup(c.name);
            if (binding?.namespace) binding = null;
            symbol = binding?.symbol || ''
          } else if (['MemberExpression', 'OptionalMemberExpression'].includes(c?.type) && c.object?.type === 'Identifier') {
            const value = lookup(c.object.name);
            if (value?.namespace && (!c.computed || c.property?.type === 'StringLiteral')) {
              binding = value;
              symbol = c.property.name || c.property.value
            }
          }
          if (binding) add(file.path, binding.target, 'call', symbol)
        }
      }
      children(node).forEach(c => visit(c, scopes))
    };
    
    visit(ast, [])
  }
  
  const allEdges = [...edges.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
  const graph: FileGraph = {
    version: 1, 
    engine: 'babel-static-v1', 
    nodes: [...metrics].sort((a, b) => a.path.localeCompare(b.path)), 
    edges: allEdges, 
    coverage: {
      fetched: files.filter(f => f.content !== null).length, 
      parsed, 
      failed, 
      unresolvedModules, 
      totalEdges: allEdges.length, 
      truncated: false
    }
  }
  
  // Keep calls ahead of imports. Reserve substantial DynamoDB item overhead.
  while (Buffer.byteLength(JSON.stringify(graph), 'utf8') > 220000 && graph.edges.length) {
    graph.edges.splice(Math.max(0, graph.edges.length - 100));
    graph.coverage.truncated = true
  }
  
  return graph
}