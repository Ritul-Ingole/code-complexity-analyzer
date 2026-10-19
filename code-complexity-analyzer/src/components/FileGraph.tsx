"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js"
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"

interface GraphNode { path: string; loc: number; functions: number; complexity: number }
export interface GraphData {
  version: 1
  engine: string
  nodes: GraphNode[]
  edges: Array<{ source: string; target: string; kind: "call" | "import"; count: number; symbols: string[] }>
  coverage: { fetched: number; parsed: number; failed: string[]; unresolvedModules: number; totalEdges: number; truncated: boolean }
}

// Cream theme keeps these muted tones across the report and the 3D stage.
const riskLevel = (score: number) => (score > 40 ? "high" : score > 25 ? "medium" : "low")
export const riskColor = (score: number) => (score > 40 ? "#b4493d" : score > 25 ? "#947011" : "#4d7142")

interface V3 { x: number; y: number; z: number }

// ─── GRAPH TUNING — adjust these to change the look ─────────────────────
// NODE SIZE: base radius of every node sphere (world units). Bigger = larger nodes.
const NODE_BASE_SIZE = 20.4
// NODE SIZE: extra radius added per point of complexity (capped at complexity 80).
const NODE_COMPLEXITY_SCALE = 50  // complexity 80 adds 80/24 ≈ 3.3 to the base size
// SPACING: how far apart folder clusters sit from each other. Smaller = tighter.
const CLUSTER_SPREAD = 34
// SPACING: radius of the initial sphere nodes start on within each cluster.
const SHELL_RADIUS = 120
// SPACING: ideal length of a connection line during layout. Smaller = nodes pull closer.
const EDGE_REST_LENGTH = 5
// SPACING: repulsion strength pushing unconnected nodes apart. Smaller = denser graph.
const REPULSION = 320
// LABEL: on-screen height of filename labels, as a fraction of camera distance.
// Bigger = larger labels. They stay this size at every zoom level.
const LABEL_SCREEN_SIZE = 0.075
// ─────────────────────────────────────────────────────────────────────────

// ─── WHEEL ARMING — the 3D stage and the file-explorer list must not hijack the
// page scroll: when the cursor merely passes over them mid-scroll, the wheel
// belongs to the page. They take over only after the user has stopped (a gap
// in wheel ticks) or is already mid-interaction with them.
const WHEEL_ARM_GAP = 500 // ms without a wheel tick before graph interaction arms
let lastWheelAt = 0
let wheelTaken = false
const GRAPH_WHEEL_SELECTOR = ".graph-stage-3d, .graph-file-list"

// Timestamps every wheel tick on the page; a tick outside the graph hands the
// wheel back to the page (ends an interaction session).
const trackGraphWheel = (e: WheelEvent) => {
  lastWheelAt = e.timeStamp
  if (!(e.target as Element | null)?.closest?.(GRAPH_WHEEL_SELECTOR)) wheelTaken = false
}

// True when this tick starts or continues a deliberate interaction with the graph.
const graphWheelArmed = (e: WheelEvent) =>
  e.timeStamp - lastWheelAt > WHEEL_ARM_GAP || wheelTaken

// File-explorer list: consumes only when it can actually scroll in the tick's
// direction, so it never traps the wheel at its ends or when fully collapsed.
const onGraphListWheel = (e: WheelEvent) => {
  const list = e.currentTarget as HTMLDivElement
  if (!graphWheelArmed(e)) return
  if (list.scrollHeight <= list.clientHeight + 1) return
  if (e.deltaY > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 1) return
  if (e.deltaY < 0 && list.scrollTop <= 1) return
  wheelTaken = true
  e.preventDefault()
  e.stopPropagation()
  list.scrollTop += e.deltaY
}


const hash = (text: string, seed: number) => {
  let h = 2166136261 ^ seed
  for (let i = 0; i < text.length; i++) h = (h ^ text.charCodeAt(i)) * 16777619
  return ((h >>> 0) % 100000) / 100000
}

// Deterministic 3D force layout: seeded shell + folder-cluster offsets,
// spring attraction on edges, repulsion between nodes, gentle gravity.
// Runs to rest once per dataset — no perpetual physics loop.
function layout3D(nodes: GraphNode[], edges: GraphData["edges"]): Map<string, V3> {
  const n = nodes.length
  const gold = Math.PI * (3 - Math.sqrt(5))
  const folderOffsets = new Map<string, V3>()
  const pos: V3[] = nodes.map((node, i) => {
    const folder = node.path.split("/").slice(0, -1).join("/") || "."
    if (!folderOffsets.has(folder)) {
      folderOffsets.set(folder, {
        x: (hash(folder, 11) - 0.5) * CLUSTER_SPREAD * 2,
        y: (hash(folder, 23) - 0.5) * CLUSTER_SPREAD * 2,
        z: (hash(folder, 37) - 0.5) * CLUSTER_SPREAD * 2,
      })
    }
    const off = folderOffsets.get(folder)!
    const y0 = 1 - ((i + 0.5) / Math.max(n, 1)) * 2
    const r0 = Math.sqrt(Math.max(0, 1 - y0 * y0))
    const th = gold * i
    return {
      x: off.x + Math.cos(th) * r0 * SHELL_RADIUS,
      y: off.y + y0 * SHELL_RADIUS,
      z: off.z + Math.sin(th) * r0 * SHELL_RADIUS,
    }
  })
  const ids = new Map(nodes.map((node, i) => [node.path, i]))
  for (let step = 0; step < 120; step++) {
    const cool = 1 - step / 130
    const d: V3[] = pos.map((p) => ({ x: -p.x * 0.006, y: -p.y * 0.006, z: -p.z * 0.006 }))
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y, dz = pos[i].z - pos[j].z
      const d2 = Math.max(16, dx * dx + dy * dy + dz * dz)
      const f = Math.min(1.4, REPULSION / d2)
      d[i].x += dx * f; d[i].y += dy * f; d[i].z += dz * f
      d[j].x -= dx * f; d[j].y -= dy * f; d[j].z -= dz * f
    }
    for (const e of edges) {
      const i = ids.get(e.source), j = ids.get(e.target)
      if (i === undefined || j === undefined) continue
      const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y, dz = pos[j].z - pos[i].z
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const f = ((len - EDGE_REST_LENGTH) * 0.02) / len
      d[i].x += dx * f; d[i].y += dy * f; d[i].z += dz * f
      d[j].x -= dx * f; d[j].y -= dy * f; d[j].z -= dz * f
    }
    pos.forEach((p, i) => {
      p.x += Math.max(-4, Math.min(4, d[i].x)) * cool
      p.y += Math.max(-4, Math.min(4, d[i].y)) * cool
      p.z += Math.max(-4, Math.min(4, d[i].z)) * cool
    })
  }
  return new Map(nodes.map((node, i) => [node.path, pos[i]]))
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.font = "500 40px ui-monospace, SFMono-Regular, Menlo, monospace"
    const w = Math.min(ctx.measureText(text).width + 48, 500)
    ctx.fillStyle = "rgba(250, 248, 243, 0.94)"
    ctx.beginPath()
    ctx.roundRect((512 - w) / 2, 12, w, 72, 14)
    ctx.fill()
    ctx.strokeStyle = "rgba(43, 38, 32, 0.16)"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = "#2b2620"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, 256, 48, 460)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0.72 }))
  // Scale is recalculated every frame from the camera distance, so the label
  // keeps a constant on-screen size. 5.33 is the label canvas aspect (512/96).
  sprite.userData.aspect = canvas.width / canvas.height
  sprite.scale.set(LABEL_SCREEN_SIZE * 5.33, LABEL_SCREEN_SIZE, 1)
  sprite.renderOrder = 20
  return sprite
}

export default function FileGraph({ graph }: { graph?: GraphData }) {
  const [query, setQuery] = useState("")
  const [risk, setRisk] = useState<"all" | "low" | "medium" | "high">("all")
  const [selected, setSelected] = useState<string | null>(null)
  const [imports, setImports] = useState(true)
  const [returns, setReturns] = useState(true)
  const hostRef = useRef<HTMLDivElement>(null)
  // Native (non-passive) wheel listener on whichever file list is mounted —
  // React's synthetic wheel events are passive at the root, so they can't
  // preventDefault. Cleanup runs because React 18 calls this back with null.
  const graphListRef = useRef<HTMLDivElement | null>(null)
  const attachGraphList = useCallback((node: HTMLDivElement | null) => {
    graphListRef.current?.removeEventListener("wheel", onGraphListWheel)
    graphListRef.current = node
    node?.addEventListener("wheel", onGraphListWheel, { passive: false })
  }, [])
  const stateRef = useRef<{ hover: string | null; select: (path: string | null) => void }>({ hover: null, select: () => {} })
  stateRef.current.select = setSelected

  const nodes = useMemo(() => graph?.nodes || [], [graph])
  const edges = useMemo(() => graph?.edges || [], [graph])
  const positions = useMemo(() => layout3D(nodes, edges), [nodes, edges])
  const shown = useMemo(
    () => nodes.filter((n) => n.path.toLowerCase().includes(query.toLowerCase()) && (risk === "all" || riskLevel(n.complexity) === risk)),
    [nodes, query, risk]
  )
  const shownSet = useMemo(() => new Set(shown.map((n) => n.path)), [shown])
  const chosen = nodes.find((n) => n.path === selected)
  const connections = edges.filter((e) => e.source === selected || e.target === selected)

  useEffect(() => {
    setSelected(null)
  }, [graph])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !nodes.length) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // Transparent clear: the dot-grid paper canvas (.graph-stage-3d) shows through.
    //scene.fog = new THREE.FogExp2(0x14110d, 0.0045)
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000)

    //const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ===== Nodes: glowing spheres with soft halo =====
    const sphereGeo = new THREE.SphereGeometry(1, 20, 16)
    const meshes = new Map<string, THREE.Mesh>()
    const halos = new Map<string, THREE.Sprite>()
    const haloCanvas = document.createElement("canvas")
    haloCanvas.width = 64; haloCanvas.height = 64
    const hctx = haloCanvas.getContext("2d")
    if (hctx) {
      const g = hctx.createRadialGradient(32, 32, 2, 32, 32, 32)
      g.addColorStop(0, "rgba(255,255,255,0.85)")
      g.addColorStop(0.4, "rgba(255,255,255,0.18)")
      g.addColorStop(1, "rgba(255,255,255,0)")
      hctx.fillStyle = g
      hctx.fillRect(0, 0, 64, 64)
    }
    const haloTex = new THREE.CanvasTexture(haloCanvas)
    for (const node of nodes) {
      const p = positions.get(node.path)!
      const radius = NODE_BASE_SIZE + Math.min(node.complexity, 80) / NODE_COMPLEXITY_SCALE
      const mesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: riskColor(node.complexity) }))
      mesh.position.set(p.x, p.y, p.z)
      mesh.scale.setScalar(radius)
      mesh.userData.path = node.path
      scene.add(mesh)
      meshes.set(node.path, mesh)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: riskColor(node.complexity), transparent: true, opacity: 0.32, depthWrite: false }))
      halo.position.set(p.x, p.y, p.z)
      halo.scale.setScalar(radius * 3.4)
      scene.add(halo)
      halos.set(node.path, halo)
    }

    // ===== Edges: fat rounded arcs — calls solid, imports faint, returns fainter =====
    const edgeGroup = new THREE.Group()
    scene.add(edgeGroup)
    const toggleState = { imports: true, returns: true }
    const fatMat = (opacity: number) =>
      new LineMaterial({ vertexColors: true, linewidth: 2, transparent: true, opacity, depthWrite: false })
    const edgeMats = { call: fatMat(0.75), import: fatMat(0.45), ret: fatMat(0.38) }
    const edgeColors = {
      call: new THREE.Color(0xc06a48).convertSRGBToLinear(),
      import: new THREE.Color(0x8a8172).convertSRGBToLinear(),
      ret: new THREE.Color(0x7f8670).convertSRGBToLinear(),
    }
    const SEGMENTS_PER_EDGE = 8
    const buildEdges = (visible: Set<string>) => {
      edgeGroup.children.forEach((c) => (c as LineSegments2).geometry.dispose())
      edgeGroup.clear()
      const pts = { call: [] as number[], import: [] as number[], ret: [] as number[] }
      const cols = { call: [] as number[], import: [] as number[], ret: [] as number[] }
      for (const e of edges) {
        // An edge exists only while both of its endpoints pass the filters.
        if (!visible.has(e.source) || !visible.has(e.target)) continue
        const a = positions.get(e.source), b = positions.get(e.target)
        if (!a || !b) continue
        const kind = e.kind === "call" ? "call" : "import"
        // Gentle deterministic arc so connections read as soft strands, not sticks.
        const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z)
        const len = dir.length() || 1
        const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
        if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0)
        perp.normalize().multiplyScalar((hash(e.source + ">" + e.target, 71) - 0.5) * len * 0.24)
        const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).add(perp)
        const col = edgeColors[kind as keyof typeof edgeColors]
        const sinks: Array<{ p: number[]; c: number[] }> =
          kind === "call"
            ? [{ p: pts.call, c: cols.call }, { p: pts.ret, c: cols.ret }]
            : [{ p: pts.import, c: cols.import }]
        for (const sink of sinks) {
          let px = a.x, py = a.y, pz = a.z
          for (let s = 1; s <= SEGMENTS_PER_EDGE; s++) {
            const t = s / SEGMENTS_PER_EDGE
            const it = 1 - t
            const x = it * it * a.x + 2 * it * t * mid.x + t * t * b.x
            const y = it * it * a.y + 2 * it * t * mid.y + t * t * b.y
            const z = it * it * a.z + 2 * it * t * mid.z + t * t * b.z
            sink.p.push(px, py, pz, x, y, z)
            for (let v = 0; v < 2; v++) sink.c.push(col.r, col.g, col.b)
            px = x; py = y; pz = z
          }
        }
      }
      const attach = (p: number[], c: number[], mat: LineMaterial) => {
        if (!p.length) return
        const geo = new LineSegmentsGeometry()
        geo.setPositions(p)
        geo.setColors(c)
        edgeGroup.add(new LineSegments2(geo, mat))
      }
      attach(pts.call, cols.call, edgeMats.call)
      if (toggleState.imports) attach(pts.import, cols.import, edgeMats.import)
      if (toggleState.returns) attach(pts.ret, cols.ret, edgeMats.ret)
    }
    buildEdges(new Set(nodes.map((n) => n.path)))

    // // ===== Ambient star dust for depth =====
    // const dustN = 900
    // const dust = new Float32Array(dustN * 3)
    // for (let i = 0; i < dustN; i++) {
    //   const th = gold2(i), rr = 90 + hash(String(i), 5) * 220
    //   const y = 1 - ((i + 0.5) / dustN) * 2, rr2 = Math.sqrt(Math.max(0, 1 - y * y))
    //   dust[i * 3] = Math.cos(th) * rr2 * rr
    //   dust[i * 3 + 1] = y * rr
    //   dust[i * 3 + 2] = Math.sin(th) * rr2 * rr
    // }
    // function gold2(i: number) { return i * 2.39996 }
    // const dustGeo = new THREE.BufferGeometry()
    // dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3))
    // const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcabfa8, size: 0.8, transparent: true, opacity: 0.35, sizeAttenuation: true }))
    // scene.add(dustPts)

    // ===== Name labels =====
    // One sprite per path, created lazily and toggled visible. Two sources:
    // the hovered/selected node always gets its tag, and while navigating
    // (drag/zoom/pan) the nodes nearest the view centre are labelled too.
    const labelCache = new Map<string, THREE.Sprite>()
    let focusPath: string | null = null
    let labelsDirty = true
    const getLabelSprite = (path: string) => {
      let s = labelCache.get(path)
      if (!s) {
        s = makeLabelSprite(path.split("/").pop() || path)
        const mesh = meshes.get(path)
        if (mesh) s.position.copy(mesh.position).add(new THREE.Vector3(0, 3.4, 0))
        s.visible = false
        scene.add(s)
        labelCache.set(path, s)
      }
      return s
    }
    const LABEL_MAX_AMBIENT = 8     // ambient tags at once, so the canvas stays readable
    const projVec = new THREE.Vector3()
    const updateLabels = () => {
      labelsDirty = false
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const scored: Array<{ path: string; d: number }> = []
      meshes.forEach((mesh, path) => {
        if (!mesh.visible) return
        projVec.copy(mesh.position).project(camera)
        if (projVec.z < -1 || projVec.z > 1) return // behind the camera or beyond the far plane
        // Rank by real distance to the camera: the closest nodes get the tags.
        scored.push({ path, d: camera.position.distanceTo(mesh.position) })
      })
      scored.sort((a, b) => a.d - b.d)
      const keep = new Set<string>()
      // Ambient tags only exist when zoomed in: at a distance the canvas would
      // just be wallpapered with pills, so out here only the focus tag shows.
      if (cam.r < graphRadius * 1.5) {
        // "Nearby" means spatially close to the camera: within half the camera
        // distance, closest first, capped so the canvas stays readable.
        const nearCut = cam.r * 1
        for (const s of scored) {
          if (keep.size >= LABEL_MAX_AMBIENT) break
          if (s.d <= nearCut) keep.add(s.path)
        }
      }
      if (focusPath && meshes.get(focusPath)?.visible) keep.add(focusPath)
      labelCache.forEach((s, path) => { if (!keep.has(path)) s.visible = false })
      keep.forEach((path) => { getLabelSprite(path).visible = true })
    }
    const setLabel = (path: string | null) => {
      if (focusPath === path) return
      focusPath = path
      labelsDirty = true
    }

    // ===== Camera orbit controls (drag orbit, wheel/pinch zoom, shift/right-drag pan) =====
    // Bounding sphere of the graph: the camera opens framed on all of it, centred
    // on the bounding-box centre — not the origin — so no cluster sits off-screen.
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (const n of nodes) {
      const p = positions.get(n.path)!
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); minZ = Math.min(minZ, p.z)
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z)
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
    const graphRadius = Math.max(60, ...nodes.map((n) => { const p = positions.get(n.path)!; return Math.hypot(p.x - cx, p.y - cy, p.z - cz) }))
    const cam = { theta: 0.7, phi: 1.05, r: graphRadius * 2.2, tx: cx, ty: cy, tz: cz }
    const applyCam = () => {
      // Keep the far plane ahead of the camera at any zoom level, otherwise
      // zooming out clips nodes against an invisible wall (camera.far was fixed).
      camera.far = Math.max(2000, cam.r + graphRadius * 2.5)
      camera.updateProjectionMatrix()
      labelsDirty = true // camera moved: re-evaluate which nodes are labelled
      camera.position.set(
        cam.tx + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta),
        cam.ty + cam.r * Math.cos(cam.phi),
        cam.tz + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta)
      )
      camera.lookAt(cam.tx, cam.ty, cam.tz)
    }
    applyCam()
    // Distance at which the bounding sphere fits inside both FOVs (+8% margin).
    const fitCamera = () => {
      const vFov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      cam.r = (graphRadius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.08
      applyCam()
    }
    let fitted = false

    const el = renderer.domElement
    el.style.cursor = "grab"
    const pointers = new Map<number, { x: number; y: number }>()
    let lastPinch = 0
    let moved = false
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 0 }

    const pick = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(Array.from(meshes.values()).filter((m) => m.visible))
      return hits.length ? (hits[0].object.userData.path as string) : null
    }

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved = false
      el.style.cursor = "grabbing"
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) {
        const hit = pick(e.clientX, e.clientY)
        stateRef.current.hover = hit
        setLabel(hit)
        el.style.cursor = hit ? "pointer" : "grab"
        return
      }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true
      prev.x = e.clientX; prev.y = e.clientY
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (lastPinch > 0) cam.r = Math.max(graphRadius * 0.15, Math.min(graphRadius * 4, cam.r * (lastPinch / dist)))
        lastPinch = dist
        applyCam()
        return
      }
      if (e.shiftKey || e.button === 2) {
        const panScale = cam.r * 0.0011
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0)
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1)
        cam.tx -= right.x * dx * panScale; cam.ty -= right.y * dx * panScale; cam.tz -= right.z * dx * panScale
        cam.tx += up.x * dy * panScale; cam.ty += up.y * dy * panScale; cam.tz += up.z * dy * panScale
      } else {
        cam.theta -= dx * 0.0055
        cam.phi = Math.max(0.12, Math.min(Math.PI - 0.12, cam.phi - dy * 0.0055))
      }
      applyCam()
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      lastPinch = 0
      el.style.cursor = "grab"
      if (!moved && pointers.size === 0) {
        const hit = pick(e.clientX, e.clientY)
        stateRef.current.select(hit)
        setLabel(hit)
      }
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      // Not armed = the user is still scrolling the page: pass through untouched.
      if (!graphWheelArmed(e)) return
      wheelTaken = true
      e.preventDefault()
      e.stopPropagation()
      cam.r = Math.max(graphRadius * 0.15, Math.min(graphRadius * 4, cam.r * (1 + e.deltaY * 0.0012)))
      applyCam()
    }
    const onLeave = () => { stateRef.current.hover = null; setLabel(null) }
    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerleave", onLeave)
    el.addEventListener("contextmenu", (e) => e.preventDefault())
    // Fresh mount counts as "recent activity": a tick right at load passes to
    // the page until the user deliberately interacts with the graph.
    lastWheelAt = performance.now()
    wheelTaken = false
    window.addEventListener("wheel", trackGraphWheel, { passive: true })

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width && height) {
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        Object.values(edgeMats).forEach((m) => m.resolution.set(width, height))
        if (!fitted) {
          fitted = true
          fitCamera()
        }
      }
    })
    ro.observe(host)

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      // Refresh which nodes are labelled after camera moves (at most once per frame).
      if (labelsDirty) updateLabels()
      // Keep every visible filename label a constant on-screen size regardless of
      // zoom: sprite size scales with its distance from the camera.
      labelCache.forEach((s) => {
        if (!s.visible) return
        const dist = camera.position.distanceTo(s.position)
        const h = dist * LABEL_SCREEN_SIZE
        s.scale.set(h * (s.userData.aspect as number), h, 1)
      })
      // Static scene otherwise: the camera only moves when the user drags, zooms or pans.
      renderer.render(scene, camera)
    }
    animate()

    // Imperative bridge: parent state (filters/selection) applied imperatively per render below.
    ;(host as HTMLDivElement & { __apply?: (s: { shown: Set<string>; selected: string | null; imports: boolean; returns: boolean }) => void }).__apply = ({ shown, selected: sel, imports: imp, returns: ret }) => {
      toggleState.imports = imp
      toggleState.returns = ret
      const focus = stateRef.current.hover || sel
      labelsDirty = true
      const neighbors = new Set<string>()
      if (focus) edges.forEach((e) => {
        if (e.source === focus) neighbors.add(e.target)
        if (e.target === focus) neighbors.add(e.source)
      })
      meshes.forEach((mesh, path) => {
        const inFilter = shown.has(path)
        mesh.visible = inFilter
        halos.get(path)!.visible = inFilter
        if (!inFilter) return
        const dimmed = !!focus && path !== focus && !neighbors.has(path)
        ;(mesh.material as THREE.MeshBasicMaterial).color.set(dimmed ? "#c9c1b2" : riskColor(nodes.find((n) => n.path === path)!.complexity))
        const base = NODE_BASE_SIZE + Math.min(nodes.find((n) => n.path === path)!.complexity, 80) / NODE_COMPLEXITY_SCALE
        mesh.scale.setScalar(path === focus ? base * 1.6 : base)
      })
      buildEdges(shown)
      setLabel(focus || sel)
      labelsDirty = true
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("wheel", trackGraphWheel)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh | THREE.Sprite | THREE.Points | THREE.Line
        if (o.geometry && o.geometry !== sphereGeo) o.geometry.dispose()
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
        if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) {
          const withMap = m as THREE.Material & { map?: THREE.Texture }
          if (withMap.map && withMap.map !== haloTex) withMap.map.dispose()
          m.dispose()
        }
      })
      sphereGeo.dispose()
      haloTex.dispose()
      Object.values(edgeMats).forEach((m) => m.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [graph, nodes, edges, positions])

  // Apply filters / selection / toggles to the live scene without rebuilding it.
  useEffect(() => {
    const host = hostRef.current as (HTMLDivElement & { __apply?: (s: { shown: Set<string>; selected: string | null; imports: boolean; returns: boolean }) => void }) | null
    host?.__apply?.({ shown: shownSet, selected, imports, returns })
  }, [shownSet, selected, imports, returns])

  const focusNode = (path: string) => setSelected(path)

  if (!graph) return (
    <section className="paper-card graph-empty">
      <p className="eyebrow">FILE CONNECTIONS</p>
      <h3>A fresh analysis unlocks the graph.</h3>
      <p>This report predates file connections, or its graph exceeded the storage limit. Run the repository again to build a new map.</p>
    </section>
  )
  if (!nodes.length) return (
    <section className="paper-card graph-empty">
      <h3>No source files to map</h3>
      <p>No supported JavaScript or TypeScript files were analyzed.</p>
    </section>
  )

  return (
    <section className="paper-card file-graph" aria-label="3D file connection graph">
      <header className="graph-header">
        <div>
          <p className="eyebrow">02 — FOLLOW THE CONNECTIONS</p>
          <h3>Your repository, connected.</h3>
          <p>Drag to orbit, scroll to zoom, shift-drag to pan. Click a node to inspect it.</p>
        </div>
        <span>{nodes.length} files · {edges.filter((e) => e.kind === "call").length} call links</span>
      </header>

      <div className="graph-toolbar">
        <label className="graph-search"><span className="sr-only">Search graph files</span>
          <input type="search" placeholder="Find a file…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label><span className="sr-only">Complexity level</span>
          <select value={risk} onChange={(e) => setRisk(e.target.value as typeof risk)}>
            <option value="all">All complexity levels</option>
            <option value="low">Low · ≤25</option>
            <option value="medium">Medium · 26–40</option>
            <option value="high">High · &gt;40</option>
          </select>
        </label>
        <label className="graph-toggle"><input type="checkbox" checked={imports} onChange={(e) => setImports(e.target.checked)} /> Imports</label>
        <label className="graph-toggle"><input type="checkbox" checked={returns} onChange={(e) => setReturns(e.target.checked)} /> Return paths*</label>
      </div>

      <div className="graph-body">
        <div className="graph-visual">
          <div ref={hostRef} className="graph-stage-3d" role="img" aria-label="Interactive 3D file graph. Use the adjacent file list for keyboard exploration." />
          {!shown.length && <p className="graph-message">No files match these filters.</p>}
          <div className="graph-legend">
            {[[10, "Low ≤25"], [30, "Medium 26–40"], [50, "High >40"]].map(([score, label]) => (
              <span key={label as string}><i style={{ background: riskColor(Number(score)) }} />{label}</span>
            ))}
          </div>
        </div>
        <aside className="graph-inspector" aria-label="Graph file explorer">
          {chosen ? (
            <>
              <button className="text-action" type="button" onClick={() => setSelected(null)}>← All files</button>
              <h4>{chosen.path}</h4>
              <p style={{ color: riskColor(chosen.complexity) }}>{riskLevel(chosen.complexity)} · {chosen.complexity}</p>
              <p>{chosen.loc} lines · {chosen.functions} functions</p>
              <div className="graph-file-list" ref={attachGraphList}>
                {connections.length ? connections.map((e, i) => (
                  <button type="button" key={i} onClick={() => focusNode(e.source === selected ? e.target : e.source)}>
                    <span>{e.source === selected ? "→" : "←"} {e.kind} · {e.count} site{e.count !== 1 ? "s" : ""}</span>
                    <strong>{e.source === selected ? e.target : e.source}</strong>
                    {e.symbols.length > 0 && <span>{e.symbols.join(", ")}</span>}
                  </button>
                )) : <p>No resolved cross-file connections.</p>}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">FILE EXPLORER</p>
              <h4>{shown.length} files in view</h4>
              <p>Select a node or file to inspect its connections.</p>
              <div className="graph-file-list" ref={attachGraphList}>
                {shown.map((n) => (
                  <button type="button" key={n.path} onClick={() => focusNode(n.path)}>
                    <strong>{n.path}</strong>
                    <span style={{ color: riskColor(n.complexity) }}>{riskLevel(n.complexity)} · {n.complexity}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className="graph-footnote">
        <p>Warm lines: statically resolved imported calls, caller → imported module. Faint lines: imports. *Return paths are illustrative reverse directions, not runtime traces.</p>
        <p>Coverage: {graph.coverage.parsed}/{graph.coverage.fetched} fetched files parsed; {graph.coverage.failed.length} fetch/parse failures; {graph.coverage.unresolvedModules} external/unresolved references. Relative JS/TS imports and root tsconfig/jsconfig paths are resolved. Inherited/monorepo aliases, dynamic dispatch and final re-export implementations are not traced.{graph.coverage.truncated && ` Storage cap: ${edges.length}/${graph.coverage.totalEdges} links shown.`}</p>
      </footer>
    </section>
  )
}
