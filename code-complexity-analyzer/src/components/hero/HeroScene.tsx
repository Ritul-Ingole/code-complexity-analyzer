"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

// Geodesic orrery (matches the reference render): detailed wireframe sphere
// core, tilted orbit rings carrying traveling hex-prism nodes and bead dots,
// soft ground shadow, warm fog. Vanilla three.js in a Next.js client component.
// ponytail: single scene file; split only if a second 3D view appears

const RINGS = [
  { radius: 3.2, tilt: [0.28, 0, 0.08] as const, speed: 0.1, dir: 1 },
  { radius: 3.9, tilt: [-0.45, 0, 0.4] as const, speed: 0.07, dir: -1 },
  { radius: 4.5, tilt: [0.65, 0, -0.35] as const, speed: 0.05, dir: 1 },
]

const NODES = [
  { ring: 0, color: "#77864a", size: 0.28 },
  { ring: 0, color: "#c99b2f", size: 0.5 },
  { ring: 1, color: "#7a3b2e", size: 0.48 },
  { ring: 1, color: "#77864a", size: 0.44 },
  { ring: 1, color: "#c99b2f", size: 0.26 },
  { ring: 2, color: "#c99b2f", size: 0.52 },
  { ring: 2, color: "#7a3b2e", size: 0.3 },
]

function makeShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
    grad.addColorStop(0, "rgba(150, 138, 115, 0.32)")
    grad.addColorStop(1, "rgba(150, 138, 115, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 256)
  }
  return new THREE.CanvasTexture(canvas)
}

export default function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // WebGL unavailable — the panel keeps its warm gradient
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
    scene.fog = new THREE.Fog(0xf4f1ea, 10, 26)

    const camera = new THREE.PerspectiveCamera(
      50,
      host.clientWidth > 0 && host.clientHeight > 0 ? host.clientWidth / host.clientHeight : 1,
      0.1,
      100
    )
    camera.position.set(0, 0, 9.5)

    const orrery = new THREE.Group()
    scene.add(orrery)

    // ===== Geodesic wireframe core =====
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.7, 2),
      new THREE.MeshBasicMaterial({ color: 0xc9c0ae, wireframe: true, transparent: true, opacity: 0.55 })
    )
    orrery.add(core)

    // ===== Tilted orbit rings + hex-prism nodes + beads =====
    const ringGroups = RINGS.map((ring) => {
      const g = new THREE.Group()
      g.rotation.set(ring.tilt[0], ring.tilt[1], ring.tilt[2])
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a) * ring.radius, 0, Math.sin(a) * ring.radius))
      }
      g.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0xb3a890, transparent: true, opacity: 0.35 })
        )
      )
      orrery.add(g)
      return g
    })

    const beadGeo = new THREE.SphereGeometry(0.045, 8, 8)
    const beadMat = new THREE.MeshBasicMaterial({ color: 0xa89d86, transparent: true, opacity: 0.7 })

    RINGS.forEach((ring) => {
      for (let i = 0; i < 10; i++) {
        const bead = new THREE.Mesh(beadGeo, beadMat)
        const a = Math.random() * Math.PI * 2
        bead.position.set(Math.cos(a) * ring.radius, 0, Math.sin(a) * ring.radius)
        ringGroups[RINGS.indexOf(ring)].add(bead)
      }
    })

    const travelers: Array<{
      group: THREE.Group
      mesh: THREE.Mesh
      ring: number
      angle: number
    }> = []

    NODES.forEach((node, i) => {
      const ring = RINGS[node.ring]
      const angle = (i / NODES.length) * Math.PI * 2

      const group = new THREE.Group()
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
      mesh.rotation.y = Math.random() * Math.PI
      group.add(mesh)
      group.position.set(Math.cos(angle) * ring.radius, 0, Math.sin(angle) * ring.radius)
      ringGroups[node.ring].add(group)

      travelers.push({ group, mesh, ring: node.ring, angle })
    })

    // ===== Ambient particles =====
    const PARTICLES = 40
    const pPos = new Float32Array(PARTICLES * 3)
    for (let i = 0; i < PARTICLES * 3; i++) pPos[i] = (Math.random() - 0.5) * 16
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pPos, 3)),
      new THREE.PointsMaterial({
        color: 0xc99b2f,
        size: 0.05,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    )
    scene.add(particles)

    // ===== Soft ground shadow =====
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({
        map: makeShadowTexture(),
        transparent: true,
        depthWrite: false,
      })
    )
    shadow.rotation.x = -Math.PI / 2 + 0.55
    shadow.position.y = -2.5
    scene.add(shadow)

    // ===== Warm lighting =====
    scene.add(new THREE.AmbientLight(0xffe4c4, 0.6))
    const key = new THREE.DirectionalLight(0xfde68a, 1.2)
    key.position.set(5, 6, 7)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xf97316, 0.5)
    rim.position.set(-6, -4, 5)
    scene.add(rim)

    // ===== Cursor parallax targets (lerped in the loop) =====
    let targetX = 0
    let targetY = 0
    const onMouse = (e: MouseEvent) => {
      targetY = (e.clientX / window.innerWidth) * 2 - 1
      targetX = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener("mousemove", onMouse, { passive: true })

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Resizing the buffer clears the canvas, and ResizeObserver fires after
      // this frame's rAF render — without an immediate re-render the browser
      // paints a blank canvas on every scroll frame (disappears-while-scrolling)
      renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const clock = new THREE.Clock()
    let elapsed = 0
    let autoRot = 0
    let raf = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      elapsed += dt

      // Slow autorotate; cursor adds a ±0.14/±0.09 rad tilt, all lerped
      autoRot += dt * 0.06
      orrery.rotation.y += (targetY * 0.14 + autoRot - orrery.rotation.y) * 0.05
      orrery.rotation.x += (targetX * 0.09 - orrery.rotation.x) * 0.05

      core.rotation.y += dt * 0.06
      core.rotation.x += dt * 0.02

      for (const tr of travelers) {
        const ring = RINGS[tr.ring]
        tr.angle += ring.speed * ring.dir * dt
        tr.group.position.set(
          Math.cos(tr.angle) * ring.radius,
          0,
          Math.sin(tr.angle) * ring.radius
        )
        tr.mesh.rotation.y += dt * 0.4
      }

      particles.rotation.y = elapsed * 0.02

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("mousemove", onMouse)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh | THREE.Points | THREE.Line
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
  }, [])

  return <div ref={hostRef} className="h-full w-full" />
}
