"use client"
import { useEffect, useMemo, useRef, useState } from "react"

export interface GraphNode {
  path: string;
  loc: number;
  functions: number;
  complexity: number;
}

export interface GraphData {
  version: 1;
  engine: string;
  nodes: GraphNode[];
  edges: Array<{
    source: string;
    target: string;
    kind: 'call' | 'import';
    count: number;
    symbols: string[]
  }>;
  coverage: {
    fetched: number;
    parsed: number;
    failed: string[];
    unresolvedModules: number;
    totalEdges: number;
    truncated: boolean;
  }
}

export const riskLevel = (score: number) => score > 40 ? 'high' : score > 25 ? 'medium' : 'low'
export const riskColor = (score: number) => score > 40 ? '#b4493d' : score > 25 ? '#947011' : '#4d7142'

type P = { x: number; y: number }

function layout(graph?: GraphData) {
  const nodes = graph?.nodes || [];
  const p = nodes.map((_, i) => ({
    x: Math.cos(i * 2.39996) * Math.sqrt((i + 1) / Math.max(nodes.length, 1)) * 230,
    y: Math.sin(i * 2.39996) * Math.sqrt((i + 1) / Math.max(nodes.length, 1)) * 190
  }));
  const ids = new Map(nodes.map((n, i) => [n.path, i]));

  for (let step = 0; step < 85; step++) {
    const d = p.map(v => ({ x: -v.x * .004, y: -v.y * .004 }));
    
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const x = p[i].x - p[j].x,
              y = p[i].y - p[j].y,
              f = Math.min(.8, 460 / Math.max(30, x * x + y * y));
        d[i].x += x * f;
        d[i].y += y * f;
        d[j].x -= x * f;
        d[j].y -= y * f;
      }
    }
    
    for (const e of graph?.edges || []) {
      const i = ids.get(e.source),
            j = ids.get(e.target);
      if (i === undefined || j === undefined) continue;
      
      const x = p[j].x - p[i].x,
            y = p[j].y - p[i].y,
            l = Math.hypot(x, y) || 1,
            f = (l - 85) * .018 / l;
      d[i].x += x * f;
      d[i].y += y * f;
      d[j].x -= x * f;
      d[j].y -= y * f;
    }
    
    p.forEach((v, i) => {
      v.x += Math.max(-9, Math.min(9, d[i].x)) * (1 - step / 100);
      v.y += Math.max(-9, Math.min(9, d[i].y)) * (1 - step / 100);
    });
  }
  return new Map(nodes.map((n, i) => [n.path, p[i]]));
}

export default function FileGraph({ graph }: { graph?: GraphData }) {
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [imports, setImports] = useState(false);
  const [returns, setReturns] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [size, setSize] = useState({ w: 800, h: 460 });

  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const positions = useMemo(() => layout(graph), [graph]);
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const shown = nodes.filter(n => 
    n.path.toLowerCase().includes(query.toLowerCase()) && 
    (risk === 'all' || riskLevel(n.complexity) === risk)
  );
  
  const visible = new Set(shown.map(n => n.path));
  const active = hover || selected;
  const chosen = nodes.find(n => n.path === selected);

  const extent = Math.max(260, ...[...positions.values()].flatMap(p => [Math.abs(p.x) + 50, Math.abs(p.y) + 50]));
  const scale = Math.min(size.w / (extent * 2), size.h / (extent * 2)) * .82;

  const screen = (p: P) => ({ 
    x: size.w / 2 + p.x * scale * camera.zoom + camera.x, 
    y: size.h / 2 + p.y * scale * camera.zoom + camera.y 
  });

  useEffect(() => { 
    setSelected(null); 
    setCamera({ x: 0, y: 0, zoom: 1 }); 
  }, [graph]);

  useEffect(() => {
    if (!canvas.current) return;
    const ro = new ResizeObserver(es => 
      setSize({ w: es[0].contentRect.width, h: es[0].contentRect.height })
    );
    ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [graph]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    ctx.scale(dpr, dpr);

    const project = (path: string) => screen(positions.get(path) || { x: 0, y: 0 });
    const neighbors = new Set([active]);
    
    if (active) {
      edges.forEach(e => {
        if (e.source === active) neighbors.add(e.target);
        if (e.target === active) neighbors.add(e.source);
      });
    }

    const arrow = (a: P, b: P, color: string, dashed: boolean, offset = 0) => {
      const dx = b.x - a.x, 
            dy = b.y - a.y, 
            l = Math.hypot(dx, dy);
      if (l < 24) return;
      
      const x = dx / l, 
            y = dy / l, 
            ax = a.x + x * 12 - y * offset, 
            ay = a.y + y * 12 + x * offset, 
            bx = b.x - x * 13 - y * offset, 
            by = b.y - y * 13 + x * offset;
            
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash(dashed ? [4, 5] : []);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - x * 7 - y * 3, by - y * 7 + x * 3);
      ctx.lineTo(bx - x * 7 + y * 3, by - y * 7 - x * 3);
      ctx.fill();
    };

    edges.forEach(e => {
      if (!visible.has(e.source) || !visible.has(e.target) || (!imports && e.kind === 'import')) return;
      ctx.globalAlpha = !active || e.source === active || e.target === active ? .65 : .1;
      arrow(project(e.source), project(e.target), e.kind === 'call' ? '#a85c42' : '#8c8373', e.kind === 'import');
      if (returns && e.kind === 'call') {
        arrow(project(e.target), project(e.source), '#7a8172', true, 7);
      }
    });

    shown.forEach(n => {
      const p = project(n.path);
      const focused = n.path === active;
      ctx.globalAlpha = !active || neighbors.has(n.path) ? 1 : .2;
      
      if (focused) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = '#e8ddc8';
        ctx.fill();
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, focused ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = riskColor(n.complexity);
      ctx.fill();
      ctx.strokeStyle = '#faf8f3';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Hover/selection labels avoid dense default label collisions; list remains fully accessible.
    if (active && visible.has(active)) {
      const p = project(active);
      const label = active.split('/').pop() || active;
      
      ctx.globalAlpha = 1;
      ctx.font = '600 14px ui-monospace,monospace';
      
      const width = ctx.measureText(label).width;
      const x = Math.max(8, Math.min(size.w - width - 8, p.x - width / 2));
      const y = Math.max(20, Math.min(size.h - 8, p.y - 20));
      
      ctx.fillStyle = '#faf8f3';
      ctx.fillRect(x - 4, y - 16, width + 8, 22);
      ctx.fillStyle = '#51483d';
      ctx.fillText(label, x, y);
    }
    // Event-driven drawing; no perpetual physics loop.
  });

  const hit = (x: number, y: number) => {
    let id: string | null = null;
    let distance = 20;
    for (const n of shown) {
      const p = screen(positions.get(n.path)!);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < distance) {
        distance = d;
        id = n.path;
      }
    }
    return id;
  };

  const focus = (path: string) => {
    setSelected(path);
    const p = positions.get(path);
    if (p) setCamera({ x: -p.x * scale, y: -p.y * scale, zoom: 1 });
  };

  if (!graph) return (
    <section className="paper-card graph-empty">
      <p className="eyebrow">FILE CONNECTIONS</p>
      <h3>A fresh analysis unlocks the graph.</h3>
      <p>This report predates file connections, or its graph exceeded the storage limit. Run the repository again to build a new map.</p>
    </section>
  );

  if (!nodes.length) return (
    <section className="paper-card graph-empty">
      <h3>No source files to map</h3>
      <p>No supported JavaScript or TypeScript files were analyzed.</p>
    </section>
  );

  return (
    <section className="paper-card file-graph" aria-label="File connection graph">
      <header className="graph-header">
        <div>
          <p className="eyebrow">02 — FOLLOW THE CONNECTIONS</p>
          <h3>Your repository, connected.</h3>
          <p>Find the hotspots. See what depends on them.</p>
        </div>
        <span>{nodes.length} files · {edges.filter(e => e.kind === 'call').length} call links</span>
      </header>

      <div className="graph-toolbar">
        <label className="graph-search">
          <span className="sr-only">Search graph files</span>
          <input 
            type="search" 
            placeholder="Find a file…" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Complexity level</span>
          <select value={risk} onChange={e => setRisk(e.target.value)}>
            <option value="all">All complexity levels</option>
            <option value="low">Low · ≤25</option>
            <option value="medium">Medium · 26–40</option>
            <option value="high">High · &gt;40</option>
          </select>
        </label>
        <label className="graph-toggle">
          <input 
            type="checkbox" 
            checked={imports} 
            onChange={e => setImports(e.target.checked)}
          /> 
          Imports
        </label>
        <label className="graph-toggle">
          <input 
            type="checkbox" 
            checked={returns} 
            onChange={e => setReturns(e.target.checked)}
          /> 
          Return paths*
        </label>
      </div>

      <div className="graph-body">
        <div className="graph-visual">
          <div className="graph-stage">
            <canvas 
              ref={canvas} 
              role="img" 
              aria-label="Directed file graph. Drag to pan, use zoom controls, or explore using the adjacent file list."
              onPointerDown={e => {
                drag.current = { x: e.clientX, y: e.clientY, moved: false };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (drag.current) {
                  const dx = e.clientX - drag.current.x, 
                        dy = e.clientY - drag.current.y;
                  if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
                  drag.current.x = e.clientX;
                  drag.current.y = e.clientY;
                  setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
                } else {
                  setHover(hit(e.clientX - rect.left, e.clientY - rect.top));
                }
              }}
              onPointerUp={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (!drag.current?.moved) setSelected(hit(e.clientX - rect.left, e.clientY - rect.top));
                drag.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
              }} 
              onPointerCancel={() => { drag.current = null; }} 
              onPointerLeave={() => setHover(null)}
            />
            {!shown.length && <p className="graph-message">No files match these filters.</p>}
          </div>

          <div className="graph-controls">
            <button 
              type="button" 
              aria-label="Zoom out" 
              onClick={() => setCamera(c => ({ ...c, zoom: Math.max(.4, c.zoom / 1.3) }))}
            >−</button>
            <button 
              type="button" 
              aria-label="Zoom in" 
              onClick={() => setCamera(c => ({ ...c, zoom: Math.min(5, c.zoom * 1.3) }))}
            >+</button>
            <button 
              type="button" 
              onClick={() => { setCamera({ x: 0, y: 0, zoom: 1 }); setSelected(null); }}
            >Reset view</button>
          </div>
          <div className="graph-legend">
            {[
              [10, 'Low ≤25'],
              [30, 'Medium 26–40'],
              [50, 'High >40']
            ].map(([score, label]) => (
              <span key={label as string}>
                <i style={{ background: riskColor(Number(score)) }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="graph-inspector" aria-label="Graph file explorer">
          {chosen ? (
            <>
              <button className="text-action" type="button" onClick={() => setSelected(null)}>
                ← All files
              </button>
              <h4>{chosen.path}</h4>
              <p style={{ color: riskColor(chosen.complexity) }}>
                {riskLevel(chosen.complexity)} · {chosen.complexity}
              </p>
              <p>{chosen.loc} lines · {chosen.functions} functions</p>
              
              <div className="graph-file-list">
                {edges.filter(e => e.source === selected || e.target === selected).map((e, i) => (
                  <button 
                    type="button" 
                    key={i} 
                    onClick={() => focus(e.source === selected ? e.target : e.source)}
                  >
                    <span>{e.source === selected ? '→' : '←'} {e.kind} · {e.count} sites</span>
                    <strong>{e.source === selected ? e.target : e.source}</strong>
                    <span>{e.symbols.join(', ')}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">FILE EXPLORER</p>
              <h4>{shown.length} files in view</h4>
              <p>Select a node or file to inspect connections.</p>
              
              <div className="graph-file-list">
                {shown.map(n => (
                  <button type="button" key={n.path} onClick={() => focus(n.path)}>
                    <strong>{n.path}</strong>
                    <span style={{ color: riskColor(n.complexity) }}>
                      {riskLevel(n.complexity)} · {n.complexity}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className="graph-footnote">
        <p>Solid arrows: statically resolved imported calls, caller → imported module. Dashed: imports. *Return paths are illustrative reverse directions, not runtime traces.</p>
        <p>
          Coverage: {graph.coverage.parsed}/{graph.coverage.fetched} fetched files parsed; {graph.coverage.failed.length} fetch/parse failures; {graph.coverage.unresolvedModules} external/unresolved references. Relative JS/TS imports and root tsconfig/jsconfig paths are resolved. Inherited/monorepo aliases, dynamic dispatch and final re-export implementations are not traced.{graph.coverage.truncated && ` Storage cap: ${edges.length}/${graph.coverage.totalEdges} links shown.`}
        </p>
      </footer>
    </section>
  )
}