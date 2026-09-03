"use client"

import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import * as THREE from "three"

interface HeroSceneProps {
  labelOpacity: MutableRefObject<number>
}

// Orrery: wireframe core + glowing nucleus, three tilted orbit rings carrying
// labeled file nodes that travel at different speeds, ambient particles, warm
// fog. Labels are WebGL sprites (canvas textures) — no DOM overlays at all.
// ponytail: single scene file; split only if a second 3D view appears

const RINGS = [
  { radius: 2.1, tilt: [0.5, 0, 0.12] as const, speed: 0.22, dir: 1, color: "#8a9a5b" },
  { radius: 2.8, tilt: [-0.35, 0, 0.55] as const, speed: 0.14, dir: -1, color: "#c2a878" },
  { radius: 3.5, tilt: [0.95, 0, -0.4] as const, speed: 0.08, dir: 1, color: "#c1694f" },
]

const NODES = [
  { ring: 0, name: "analyzer.ts", color: "#8a9a5b" },
  { ring: 0, name: "parser.ts", color: "#d9a441" },
  { ring: 0, name: "lambda.ts", color: "#c1694f" },
  { ring: 1, name: "session.ts", color: "#d9a441" },
  { ring: 1, name: "oauth.ts", color: "#c1694f" },
  { ring: 1, name: "dynamo.ts", color: "#c2a878" },
  { ring: 2, name: "dashboard.tsx", color: "#8a9a5b" },
  { ring: 2, name: "trends.ts", color: "#a3ab6f" },
  { ring: 2, name: "index.ts", color: "#a85c42" },
]

function makeLabel(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.font = "500 34px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.fillStyle = "#6f665a"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(name, 128, 32)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  )
  sprite.scale.set(1.35, 0.34, 1)
  sprite.position.y = 0.5
  sprite.renderOrder = 10
  return sprite
}

export default function HeroScene({ labelOpacity }: HeroSceneProps) {
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

    // Core: wireframe shell + glowing nucleus
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 1),
      new THREE.MeshBasicMaterial({ color: 0xb0a58e, wireframe: true, transparent: true, opacity: 0.45 })
    )
    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: 0xd9a441,
        emissive: 0xd9a441,
        emissiveIntensity: 0.5,
        metalness: 0.4,
        roughness: 0.35,
      })
    )
    orrery.add(core, nucleus)

    // Tilted orbit rings
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
          new THREE.LineBasicMaterial({ color: new THREE.Color(ring.color), transparent: true, opacity: 0.28 })
        )
      )
      orrery.add(g)
      return g
    })

    // Labeled nodes traveling their rings
    const travelers: Array<{ group: THREE.Group; ring: number; angle: number }> = []
    const nodeMeshes: THREE.Mesh[] = []
    const labelSprites: THREE.Sprite[] = []

    NODES.forEach((node) => {
      const ring = RINGS[node.ring]
      const ringNodes = NODES.filter((n) => n.ring === node.ring)
      const angle = (ringNodes.indexOf(node) / ringNodes.length) * Math.PI * 2

      const group = new THREE.Group()
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          emissive: new THREE.Color(node.color),
          emissiveIntensity: 0.35,
          metalness: 0.45,
          roughness: 0.4,
        })
      )
      const label = makeLabel(node.name)
      group.add(mesh, label)
      group.position.set(Math.cos(angle) * ring.radius, 0, Math.sin(angle) * ring.radius)
      ringGroups[node.ring].add(group)

      travelers.push({ group, ring: node.ring, angle })
      nodeMeshes.push(mesh)
      labelSprites.push(label)
    })

    // Ambient particles
    const PARTICLES = 120
    const pPos = new Float32Array(PARTICLES * 3)
    for (let i = 0; i < PARTICLES * 3; i++) pPos[i] = (Math.random() - 0.5) * 18
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pPos, 3)),
      new THREE.PointsMaterial({
        color: 0xd9a441,
        size: 0.07,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    scene.add(particles)

    // Warm lighting
    scene.add(new THREE.AmbientLight(0xffe4c4, 0.6))
    const key = new THREE.DirectionalLight(0xfde68a, 1.2)
    key.position.set(5, 6, 7)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xc1694f, 0.5)
    rim.position.set(-6, -4, 5)
    scene.add(rim)

    // Subtle cursor parallax on top of slow autorotation
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

      autoRot += dt * 0.04
      orrery.rotation.y += (targetY * 0.14 + autoRot - orrery.rotation.y) * 0.05
      orrery.rotation.x += (targetX * 0.09 - orrery.rotation.x) * 0.05

      core.rotation.y += dt * 0.1
      core.rotation.x += dt * 0.03
      nucleus.rotation.y -= dt * 0.2

      for (const tr of travelers) {
        const ring = RINGS[tr.ring]
        tr.angle += ring.speed * ring.dir * dt
        tr.group.position.set(
          Math.cos(tr.angle) * ring.radius,
          0,
          Math.sin(tr.angle) * ring.radius
        )
      }

      nodeMeshes.forEach((m, i) => {
        m.scale.setScalar(1 + Math.sin(elapsed * 1.6 + i * 1.9) * 0.12)
        const mat = m.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.3 + Math.sin(elapsed * 2 + i * 1.9) * 0.15
      })

      const lo = labelOpacity.current
      for (const s of labelSprites) {
        ;(s.material as THREE.SpriteMaterial).opacity = lo
      }

      particles.rotation.y = elapsed * 0.04
      particles.rotation.x = elapsed * 0.02

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
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
  }, [labelOpacity])

  return <div ref={hostRef} className="h-full w-full" />
}
