"use client"

import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import * as THREE from "three"

interface HeroSceneProps {
  labelOpacity: MutableRefObject<number>
  bleedZoom: MutableRefObject<number>
  canvasSize: MutableRefObject<{ w: number; h: number }>
}

// Geodesic core + spoke-connected hex file nodes with WebGL sprite labels,
// and a scanner ring sweeping up/down through the structure (game-style
// scan). Labels fade via the shared ref as the panel expands.
// ponytail: single scene file; split only if a second 3D view appears

const NODE_RADIUS = 3.6

// Scanner disc geometry — used by the ring mesh, the sweep and the camera
// fit; the fit must frame the disc's widest reach at the sweep extremes
const DISC_INNER = 4.25 // clears the widest node (3.6 + 0.55)
const DISC_OUTER = 4.8
const SWEEP = 3.0

// Cursor attraction — nearby nodes get pulled toward the pointer
const ATTRACT_RADIUS = 2.6
const ATTRACT_STRENGTH = 1.2

const NODES = [
  { name: "analyzer.ts", color: "#77864a", size: 0.55 },
  { name: "parser.ts", color: "#b8862f", size: 0.24 },
  { name: "lambda.ts", color: "#7a3b2e", size: 0.5 },
  { name: "session.ts", color: "#b8862f", size: 0.28 },
  { name: "dashboard.tsx", color: "#77864a", size: 0.42 },
  { name: "trends.ts", color: "#6b7a3f", size: 0.26 },
  { name: "oauth.ts", color: "#7a3b2e", size: 0.4 },
  { name: "dynamo.ts", color: "#b8862f", size: 0.24 },
  { name: "index.ts", color: "#7a3b2e", size: 0.28 },
  { name: "types.ts", color: "#77864a", size: 0.3 },
  { name: "hooks.ts", color: "#b8862f", size: 0.32 },
  { name: "utils.ts", color: "#7a3b2e", size: 0.26 },
]

// Even distribution over the full sphere (all directions), Fibonacci-style
function nodePosition(i: number, total: number): [number, number, number] {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / total)
  const theta = Math.PI * (1 + Math.sqrt(5)) * i
  return [
    NODE_RADIUS * Math.sin(phi) * Math.cos(theta),
    NODE_RADIUS * Math.cos(phi),
    NODE_RADIUS * Math.sin(phi) * Math.sin(theta),
  ]
}

function makeLabel(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 384
  canvas.height = 72
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.font = "400 34px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.fillStyle = "#7a7163"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(name, 192, 36)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  )
  sprite.scale.set(2.0, 0.375, 1)
  sprite.renderOrder = 10
  return sprite
}

function makeRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")
  if (ctx) {
    // Transparent hole (center) → bright band at the inner edge → soft outer
    // falloff. Gradient r0 = hole radius, r1 = outer edge, both in canvas px.
    const grad = ctx.createRadialGradient(128, 128, 98, 128, 128, 128)
    grad.addColorStop(0, "rgba(193, 105, 79, 0)")
    grad.addColorStop(0.1, "rgba(193, 105, 79, 0.95)")
    grad.addColorStop(0.35, "rgba(193, 105, 79, 0.55)")
    grad.addColorStop(1, "rgba(193, 105, 79, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 256)
  }
  return new THREE.CanvasTexture(canvas)
}

export default function HeroScene({ labelOpacity, bleedZoom, canvasSize }: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // WebGL unavailable — the hero keeps the plain page background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    // CSS size must follow the panel (100%), not fixed px — a fixed px style
    // freezes the canvas at its initial size and the scene never grows.
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const fog = new THREE.Fog(0xf4f1ea, 10, 26)
    scene.fog = fog

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

    const orrery = new THREE.Group()
    scene.add(orrery)

    // ===== Geodesic wireframe core =====
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 2),
      new THREE.MeshBasicMaterial({ color: 0xc9c0ae, wireframe: true, transparent: true, opacity: 0.5 })
    )
    orrery.add(core)

    // ===== Spokes: thin lines from core to each node =====
    const spokePos: number[] = []
    for (let i = 0; i < NODES.length; i++) {
      const [x, y, z] = nodePosition(i, NODES.length)
      spokePos.push(0, 0, 0, x, y, z)
    }
    const spokeGeo = new THREE.BufferGeometry()
    spokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(spokePos, 3))
    orrery.add(
      new THREE.LineSegments(
        spokeGeo,
        new THREE.LineBasicMaterial({ color: 0xb0aa9c, transparent: true, opacity: 0.5 })
      )
    )

    // ===== Hex file nodes + labels =====
    const hexes: THREE.Mesh[] = []
    const labelSprites: THREE.Sprite[] = []
    const nodeGroups: THREE.Group[] = []
    const basePositions: THREE.Vector3[] = []

    NODES.forEach((node, i) => {
      const [x, y, z] = nodePosition(i, NODES.length)
      const group = new THREE.Group()
      group.position.set(x, y, z)
      basePositions.push(new THREE.Vector3(x, y, z))

      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(node.size, node.size, node.size * 0.85, 6),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          emissive: new THREE.Color(node.color),
          emissiveIntensity: 0.08,
          metalness: 0.35,
          roughness: 0.45,
          flatShading: true,
        })
      )
      mesh.rotation.y = i * 0.9
      group.add(mesh)

      const label = makeLabel(node.name)
      label.position.y = node.size * 0.9 + 0.35
      group.add(label)

      orrery.add(group)
      nodeGroups.push(group)
      hexes.push(mesh)
      labelSprites.push(label)
    })

    // ===== Scanner ring sweeping up and down through the structure =====
    // The hole clears the node sphere (3.6 radius + largest node), so the
    // ring encircles it and the scan reads as passing over the files
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(DISC_INNER, DISC_OUTER, 96),
      new THREE.MeshBasicMaterial({
        map: makeRingTexture(),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        opacity: 0.9,
      })
    )
    ring.rotation.x = -Math.PI / 2
    scene.add(ring)

    // ===== Warm lighting =====
    scene.add(new THREE.AmbientLight(0xffe4c4, 0.6))
    const key = new THREE.DirectionalLight(0xfde68a, 1.2)
    key.position.set(5, 6, 7)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xf97316, 0.5)
    rim.position.set(-6, -4, 5)
    scene.add(rim)

    // ===== Cursor: parallax targets + pointer for node attraction =====
    let targetX = 0
    let targetY = 0
    const pointerNDC = new THREE.Vector2(9, 9) // offscreen until first move
    let pointerSeen = false
    const onMouse = (e: MouseEvent) => {
      targetY = (e.clientX / window.innerWidth) * 2 - 1
      targetX = -((e.clientY / window.innerHeight) * 2 - 1)
      // Canvas-local NDC — the panel may be offset from the window
      const rect = renderer.domElement.getBoundingClientRect()
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      pointerSeen = true
    }
    window.addEventListener("mousemove", onMouse, { passive: true })

    // Framed distance at zoom 1 — recomputed each frame when size changes,
    // the render loop re-derives camera/fog from it divided by the bleed zoom
    let baseDist = 0
    // Track the last canvas buffer size so we only call renderer.setSize when
    // the container actually changes — avoids wasted GPU uploads
    let lastW = 0
    let lastH = 0

    // Compute baseDist and update camera for a given width/height. Called
    // synchronously in the rAF loop (not from ResizeObserver) so the canvas
    // buffer, aspect, and camera distance all update in the same paint frame.
    const refit = (w: number, h: number) => {
      if (w === 0 || h === 0) return
      if (w !== lastW || h !== lastH) {
        renderer.setSize(w, h, false)
        lastW = w
        lastH = h
      }
      camera.aspect = w / h
      const tV = Math.tan((camera.fov * Math.PI) / 360)
      const tH = tV * camera.aspect
      baseDist =
        Math.max(DISC_OUTER + SWEEP / tV, DISC_OUTER * Math.sqrt(1 + 1 / (tH * tH))) * 1.05
      camera.updateProjectionMatrix()
    }

    // Initial fit from the host element — before the first scroll event
    // canvasSize ref may be (0,0); use the host's natural size
    refit(host.clientWidth, host.clientHeight)

    const clock = new THREE.Clock()
    let elapsed = 0
    let autoRot = 0
    let raf = 0

    // ── Cursor attraction helpers ──
    const raycaster = new THREE.Raycaster()
    const pullPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const cursorWorld = new THREE.Vector3()
    const cursorLocal = new THREE.Vector3()
    const pullTarget = new THREE.Vector3()
    const pullDir = new THREE.Vector3()

    // Smoothly interpolated zoom — chases bleedZoom.current each frame
    let smoothZoom = bleedZoom.current

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      elapsed += dt

      // ── Synchronous canvas resize ──
      // canvasSize is updated by HeroSection's scroll handler; reading it
      // here (same rAF tick) keeps buffer resize, aspect, and camera all
      // in the same paint — zero ResizeObserver lag.
      const { w, h } = canvasSize.current
      if (w > 0 && h > 0) {
        refit(w, h)
      }

      // Slow autorotate; cursor adds a ±0.14/±0.09 rad tilt, all lerped
      autoRot += dt * 0.06
      orrery.rotation.y += (targetY * 0.14 + autoRot - orrery.rotation.y) * 0.05
      orrery.rotation.x += (targetX * 0.09 - orrery.rotation.x) * 0.05

      core.rotation.y += dt * 0.06
      core.rotation.x += dt * 0.02

      // ── Smooth zoom ──
      // Lerp toward the scroll-driven target so the zoom ramps
      // continuously even while the user is actively scrolling.
      // The lerp factor (0.12) keeps it buttery at 60 fps (~7-8 frames to
      // settle) without noticeable delay.
      const zoomTarget = bleedZoom.current
      smoothZoom += (zoomTarget - smoothZoom) * 0.12
      if (baseDist > 0) {
        const camDist = baseDist / smoothZoom
        camera.position.z = camDist
        fog.near = camDist * 1.05
        fog.far = camDist * 2.75
      }

      // Gentle pulse — scale only, so spokes stay attached
      for (let i = 0; i < hexes.length; i++) {
        hexes[i].scale.setScalar(1 + Math.sin(elapsed * 1.4 + i * 1.9) * 0.05)
      }

      // ── Cursor attraction: nearby nodes pulled toward the pointer ──
      // Pointer → world point on the z=0 plane → orb-local space, then each
      // node lerps toward (base + pull) with a squared falloff; spokes are
      // re-baked from the live positions every frame so they stay attached.
      let cursorValid = false
      if (pointerSeen) {
        raycaster.setFromCamera(pointerNDC, camera)
        if (raycaster.ray.intersectPlane(pullPlane, cursorWorld)) {
          cursorLocal.copy(cursorWorld)
          orrery.worldToLocal(cursorLocal)
          cursorValid = true
        }
      }
      const posAttr = spokeGeo.attributes.position as THREE.BufferAttribute
      const spokeArr = posAttr.array as Float32Array
      for (let i = 0; i < nodeGroups.length; i++) {
        const g = nodeGroups[i]
        pullTarget.copy(basePositions[i])
        if (cursorValid) {
          pullDir.subVectors(cursorLocal, basePositions[i])
          const d = pullDir.length()
          if (d < ATTRACT_RADIUS && d > 1e-4) {
            const falloff = 1 - d / ATTRACT_RADIUS
            pullTarget.addScaledVector(
              pullDir.normalize(),
              falloff * falloff * ATTRACT_STRENGTH
            )
          }
        }
        g.position.lerp(pullTarget, 0.08)
        spokeArr[i * 6 + 3] = g.position.x
        spokeArr[i * 6 + 4] = g.position.y
        spokeArr[i * 6 + 5] = g.position.z
      }
      posAttr.needsUpdate = true

      // Scanner sweep: slower cycle easing at the extremes, brightest as it
      // passes through the middle of the sphere
      const cycle = (Math.sin(elapsed * 0.5 - Math.PI / 2) + 1) / 2
      ring.position.y = -SWEEP + cycle * SWEEP * 2
      const ringMat = ring.material as THREE.MeshBasicMaterial
      // Ring fades out with the file-name labels during expansion
      ringMat.opacity = (0.7 + Math.sin(cycle * Math.PI) * 0.3) * labelOpacity.current

      // Labels fade out as the panel expands
      const lo = labelOpacity.current
      for (const s of labelSprites) {
        ;(s.material as THREE.SpriteMaterial).opacity = lo
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMouse)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh | THREE.Sprite | THREE.Points | THREE.Line
        if (o.geometry) o.geometry.dispose()
        const mat = o.material as THREE.Material | THREE.Material[] | undefined
        if (mat) {
          for (const m of Array.isArray(mat) ? mat : [mat]) {
            const withMap = m as THREE.Material & { map?: THREE.Texture }
            if (withMap.map) withMap.map.dispose()
            m.dispose()
          }
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [labelOpacity, bleedZoom, canvasSize])

  return <div ref={hostRef} className="h-full w-full" />
}
