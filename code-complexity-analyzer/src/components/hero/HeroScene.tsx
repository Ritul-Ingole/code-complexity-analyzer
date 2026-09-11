"use client"

import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import * as THREE from "three"
import { introState, markReady } from "@/lib/intro"

interface HeroSceneProps {
  labelOpacity: MutableRefObject<number>
  bleedZoom: MutableRefObject<number>
  canvasSize: MutableRefObject<{ w: number; h: number }>
  scrollProgress: MutableRefObject<number>
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

// Cursor attraction — pull strength when cursor is over a node
const ATTRACT_STRENGTH = 1.2
// ===== Intro pop-out (preloader only) =====
// While the loading bar fills, each node springs from inside the core out to
// its home orbit (along its own ray origin → home), staggered one after
// another, overshooting ~12% and bouncing back — that is the "inertia" in the
// reference clip. The wave completes by progress 0.65, so the form is frozen
// in its perfect state during the settling slide. Only touches the intro;
// every scroll-driven transformation below is untouched.
const INTRO_CORE_SCALE = 0.055 // node rest inside the core (radius ≈ 0.2 vs 3.6 orbit)
const INTRO_STAGGER = 0.4 // wave spans progress 0.05 → 0.45 (+0.2 ramp)
const INTRO_RAMP = 0.2 // width of each node's own travel window
const INTRO_SPRING = 0.09 // spring stiffness
const INTRO_DAMP = 0.82 // velocity damping → overshoot then settle

const NODES = [
  { name: "analyzer.ts",   color: "#77864a", size: 0.55 },
  { name: "parser.ts",     color: "#b8862f", size: 0.24 },
  { name: "lambda.ts",     color: "#7a3b2e", size: 0.50 },
  { name: "session.ts",    color: "#b8862f", size: 0.28 },
  { name: "dashboard.tsx", color: "#77864a", size: 0.42 },
  { name: "trends.ts",     color: "#6b7a3f", size: 0.26 },
  { name: "oauth.ts",      color: "#7a3b2e", size: 0.40 },
  { name: "dynamo.ts",     color: "#b8862f", size: 0.24 },
  { name: "index.ts",      color: "#7a3b2e", size: 0.28 },
  { name: "types.ts",      color: "#77864a", size: 0.30 },
  { name: "hooks.ts",      color: "#b8862f", size: 0.32 },
  { name: "utils.ts",      color: "#7a3b2e", size: 0.26 },
  { name: "router.ts",     color: "#77864a", size: 0.36 },
  { name: "metrics.ts",    color: "#b8862f", size: 0.29 },
  { name: "auth.ts",       color: "#7a3b2e", size: 0.44 },
  { name: "cache.ts",      color: "#6b7a3f", size: 0.22 },
  { name: "config.ts",     color: "#77864a", size: 0.34 },
  { name: "logger.ts",     color: "#b8862f", size: 0.20 },
  { name: "queue.ts",      color: "#7a3b2e", size: 0.38 },
  { name: "schema.ts",     color: "#77864a", size: 0.31 },
  { name: "events.ts",     color: "#6b7a3f", size: 0.25 },
  { name: "worker.ts",     color: "#b8862f", size: 0.45 },
  { name: "middleware.ts", color: "#7a3b2e", size: 0.33 },
  { name: "store.ts",      color: "#77864a", size: 0.27 },
  { name: "api.ts",        color: "#b8862f", size: 0.48 },
  { name: "models.ts",     color: "#6b7a3f", size: 0.23 },
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
// Feathered circular particle sprite texture
function makeParticleSprite(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, "rgba(255, 255, 255, 1)")
    grad.addColorStop(0.35, "rgba(255, 255, 255, 0.8)")
    grad.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  return new THREE.CanvasTexture(canvas)
}

export default function HeroScene({
  labelOpacity,
  bleedZoom,
  canvasSize,
  scrollProgress,
}: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // Unblock the preloader — there will never be a scene to wait for.
      markReady("hero-scene")
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
    const spokes = new THREE.LineSegments(
      spokeGeo,
      new THREE.LineBasicMaterial({ color: 0xb0aa9c, transparent: true, opacity: 0.5 })
    )
    orrery.add(spokes)

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

    // ===== Per-node intro pop-out state =====
    // Deterministic (hash-based, not Math.random) so the intro looks identical
    // on every visit and never differs between two tabs. Nodes parked inside
    // the core (scale 0.055) when the intro plays, at home (1) otherwise.
    const introHash = (n: number) => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
      return v - Math.floor(v)
    }
    const introStart: number[] = []
    const introScale: number[] = []
    const introVel: number[] = []
    const introPlays = introState.progress < 1
    for (let i = 0; i < NODES.length; i++) {
      introStart.push(0.05 + introHash(i + 71) * INTRO_STAGGER)
      introScale.push(introPlays ? INTRO_CORE_SCALE : 1)
      introVel.push(0)
    }

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

    // Fresnel membrane, never an opaque replacement for the file nodes.
    const shellMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uPressure: { value: 0 } },
      vertexShader: `varying vec3 vNormal; varying vec3 vView;
        void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float uOpacity;uniform float uPressure;varying vec3 vNormal;varying vec3 vView;
        void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),3.2);vec3 pearl=mix(vec3(0.82,0.79,0.71),vec3(1.0,0.98,0.91),rim);gl_FragColor=vec4(pearl,(0.025+rim*(0.55+uPressure*0.25))*uOpacity);}`,
      transparent:true,depthWrite:false,side:THREE.FrontSide,
    })
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.62,48,32),shellMat)
    shell.renderOrder=3
    orrery.add(shell)

    // ===== 6. Particle System (Fluid Burst Field from particles.zip) =====
    const N = window.innerWidth < 768 ? 6000 : 14000
    const A = new Float32Array(N * 3) // Target A: dense sphere shell
    const B = new Float32Array(N * 3) // Target B: radial burst explosion
    const C = new Float32Array(N * 3) // Target C: undulating ambient fluid field

    const gold = Math.PI * (3 - Math.sqrt(5))
    const BRAND_COLORS = [
      new THREE.Color("#c1694f"),
      new THREE.Color("#2b2620"),
      new THREE.Color("#77864a"),
      new THREE.Color("#b8862f"),
      new THREE.Color("#7a3b2e"),
      new THREE.Color("#d9a441"),
    ]

    const particleColors = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const col = BRAND_COLORS[i % BRAND_COLORS.length]
      particleColors[i * 3] = col.r
      particleColors[i * 3 + 1] = col.g
      particleColors[i * 3 + 2] = col.b

      const parent=i%NODES.length
      const center=basePositions[parent].clone().multiplyScalar(0.29)
      const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)}
      const incA=Math.acos(1-2*hash(i+1)),azA=gold*i
      const radius=NODES[parent].size*0.86*Math.cbrt(hash(i+72))
      A[i*3]=center.x+radius*Math.sin(incA)*Math.cos(azA)
      A[i*3+1]=center.y+radius*Math.cos(incA)
      A[i*3+2]=center.z+radius*Math.sin(incA)*Math.sin(azA)
      const color=new THREE.Color(NODES[parent].color)
      particleColors[i*3]=color.r;particleColors[i*3+1]=color.g;particleColors[i*3+2]=color.b
      const direction=new THREE.Vector3(A[i*3],A[i*3+1],A[i*3+2]).normalize()
      const rB=4.5+hash(i+193)*8
      B[i*3]=direction.x*rB;B[i*3+1]=direction.y*rB*0.85;B[i*3+2]=direction.z*rB

      // Target C: Fluid undulating field
      const segC = i / N
      const turnsC = 5
      const angC = segC * Math.PI * 2 * turnsC
      const rC = 3.2 + Math.sin(segC * 12) * 1.8
      C[i * 3] = (segC - 0.5) * 24 + Math.cos(angC) * 2.0
      C[i * 3 + 1] = Math.sin(angC) * rC + Math.sin(segC * 8) * 1.5
      C[i * 3 + 2] = Math.cos(angC * 0.7) * 4.0
    }

    const pos = new Float32Array(A)
    const vel = new Float32Array(N * 3)

    const ptsGeo = new THREE.BufferGeometry()
    ptsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    ptsGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3))

    const ptsMat = new THREE.PointsMaterial({
      size: 0.065,
      map: makeParticleSprite(),
      transparent: true,
      opacity: 0,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const pts = new THREE.Points(ptsGeo, ptsMat)
    pts.frustumCulled=false
    orrery.add(pts)

    // ===== Warm lighting =====
    scene.add(new THREE.AmbientLight(0xffe4c4, 0.6))
    const key = new THREE.DirectionalLight(0xfde68a, 1.2)
    key.position.set(5, 6, 7)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xf97316, 0.5)
    rim.position.set(-6, -4, 5)
    scene.add(rim)

    // ===== Cursor: parallax targets + pointer for node attraction & fluid disturbance =====
    let targetX = 0
    let targetY = 0
    const pointerNDC = new THREE.Vector2(9, 9) // offscreen until first move
    let pointerSeen = false
    let pEnergy = 0
    let pLastX = 0
    let pLastY = 0

    const onMouse = (e: MouseEvent) => {
      targetY = (e.clientX / window.innerWidth) * 2 - 1
      targetX = -((e.clientY / window.innerHeight) * 2 - 1)
      const rect = renderer.domElement.getBoundingClientRect()
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const ddx = e.clientX - pLastX
      const ddy = e.clientY - pLastY
      pLastX = e.clientX
      pLastY = e.clientY
      if (pointerSeen) {
        pEnergy = Math.min(1, pEnergy + Math.sqrt(ddx * ddx + ddy * ddy) * 0.012)
      }
      pointerSeen = true
    }
    window.addEventListener("mousemove", onMouse, { passive: true })

    let baseDist = 0
    let lastW = 0
    let lastH = 0

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

    refit(host.clientWidth, host.clientHeight)

    const clock = new THREE.Clock()
    let elapsed = 0
    let autoRot = 0
    let raf = 0

    const ray = new THREE.Ray()
    const ndcPt = new THREE.Vector3()
    const nodeWorld = new THREE.Vector3()
    const closestOnRay = new THREE.Vector3()
    const closestLocal = new THREE.Vector3()
    const pullDir = new THREE.Vector3()

    let smoothZoom = bleedZoom.current
    let smoothSp = scrollProgress.current

    // Spring physics constants from particles.zip
    const SPRING = 0.05
    const DAMP = 0.87
    const R_CUR = 4.5
    const R_CUR2 = R_CUR * R_CUR

    let prevLocalCurX = 0
    let prevLocalCurY = 0
    let prevLocalCurZ = 0
    let havePrevCur = false

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      elapsed += dt

      // Synchronous canvas resize
      const { w, h } = canvasSize.current
      if (w > 0 && h > 0) {
        refit(w, h)
      }

      // Smooth scroll progress interpolation
      smoothSp += (scrollProgress.current - smoothSp) * 0.08
      const sp = smoothSp

      // Intro pop-out amount. Rises with the loading bar and deliberately does
      // NOT fall during the settling slide — the form must stay frozen while
      // the panel glides centre → right. Zero shape change, zero pop-ins.
      const introPop = introState.progress
      const introActive = introPop < 1

      // Slow autorotate + cursor tilt
      autoRot += dt * 0.06
      orrery.rotation.y += (targetY * 0.14 + autoRot - orrery.rotation.y) * 0.05
      orrery.rotation.x += (targetX * 0.09 - orrery.rotation.x) * 0.05

      core.rotation.y += dt * 0.06
      core.rotation.x += dt * 0.02

      // Smooth zoom
      const zoomTarget = bleedZoom.current
      smoothZoom += (zoomTarget - smoothZoom) * 0.12
      if (baseDist > 0) {
        const camDist = baseDist / smoothZoom
        camera.position.z = camDist
        fog.near = camDist * 1.05
        fog.far = camDist * 2.85
      }

      // Node pulse
      for (let i = 0; i < hexes.length; i++) {
        hexes[i].scale.setScalar(1 + Math.sin(elapsed * 1.4 + i * 1.9) * 0.05)
      }

      // Cursor ray calculation
      let cursorValid = false
      if (pointerSeen) {
        ndcPt.set(pointerNDC.x, pointerNDC.y, 0.5)
        ndcPt.unproject(camera)
        ray.origin.copy(camera.position)
        ray.direction.subVectors(ndcPt, camera.position).normalize()
        cursorValid = true
      }

      // ─────────────────────────────────────────────────────────────
      // Compress, strain, release. Keep the original .52 → .80 burst/spiral timing.
      const smoothstep=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)}
      const kComp=smoothstep(0.15,0.40,sp)
      const pressure=smoothstep(0.34,0.52,sp)
      const kBurst=Math.min(Math.max((sp-0.52)/0.28,0),1)
      const fragment=smoothstep(0,0.12,kBurst)
      const orreryNodeScale=1-kComp
      const packingRadius=lerp(1,0.29,kComp)
      core.scale.setScalar(lerp(1,1.08,kComp))
      ;(core.material as THREE.MeshBasicMaterial).opacity=0.5*(1-kComp)
      ring.scale.setScalar(Math.max(0.0001,orreryNodeScale))
      ;(spokes.material as THREE.LineBasicMaterial).opacity=0.5*(1-kComp)
      shell.visible=kComp>0&&fragment<1
      shellMat.uniforms.uOpacity.value=kComp*(1-fragment)
      shellMat.uniforms.uPressure.value=pressure
      shell.scale.setScalar(1+Math.sin(elapsed*31)*pressure*0.012+fragment*0.18)

      // Node groups attraction & compression
      const posAttr = spokeGeo.attributes.position as THREE.BufferAttribute
      const spokeArr = posAttr.array as Float32Array

      for (let i = 0; i < nodeGroups.length; i++) {
        const g = nodeGroups[i]
        const base = basePositions[i]

        // Compressed rest position pulls toward origin
        const jitter=pressure*(1-fragment)*0.065
        let px=base.x*packingRadius+Math.sin(elapsed*37+i*2.7)*jitter
        let py=base.y*packingRadius+Math.cos(elapsed*43+i*1.3)*jitter
        let pz=base.z*packingRadius+Math.sin(elapsed*41+i*3.1)*jitter

        // Intro: node springs from inside the core out to its home orbit —
        // position scales along its own ray origin → home, overshooting ~12%
        // and settling. Once settled it stays at 1 forever (no fly-back).
        const s = introScale[i]
        if (introActive || Math.abs(s - 1) > 1e-4) {
          const local = Math.max(0, Math.min((introPop - introStart[i]) / INTRO_RAMP, 1))
          const eased = local * local * (3 - 2 * local)
          const target = INTRO_CORE_SCALE + (1 - INTRO_CORE_SCALE) * eased
          let v = introVel[i]
          v += (target - s) * INTRO_SPRING
          v *= INTRO_DAMP
          const ns = s + v
          introScale[i] = ns
          introVel[i] = v
          px *= ns
          py *= ns
          pz *= ns
        }

        let tx = px
        let ty = py
        let tz = pz

        // Node cursor attraction (active only when still expanded)
        if (cursorValid && orreryNodeScale > 0.3) {
          orrery.localToWorld(nodeWorld.set(base.x, base.y, base.z))
          ray.closestPointToPoint(nodeWorld, closestOnRay)

          const nodeNDC = nodeWorld.clone().project(camera)
          const dist2D = Math.sqrt(
            (nodeNDC.x - pointerNDC.x) ** 2 + (nodeNDC.y - pointerNDC.y) ** 2
          )

          const attractRadiusNDC = 0.45
          if (dist2D < attractRadiusNDC) {
            const falloff = 1 - dist2D / attractRadiusNDC
            const strength = falloff * falloff * ATTRACT_STRENGTH * orreryNodeScale

            orrery.worldToLocal(closestLocal.copy(closestOnRay))
            pullDir.set(closestLocal.x - base.x, closestLocal.y - base.y, closestLocal.z - base.z)
            const dLen = pullDir.length()
            if (dLen > 1e-4) {
              pullDir.multiplyScalar(1 / dLen)
              tx = px + pullDir.x * strength
              ty = py + pullDir.y * strength
              tz = pz + pullDir.z * strength
            }
          }
        }

        const follow=introActive?0.42:(pressure>0.1?0.65:0.12)
        g.position.x+=(tx-g.position.x)*follow
        g.position.y+=(ty-g.position.y)*follow
        g.position.z+=(tz-g.position.z)*follow
        g.scale.setScalar(lerp(1,0.86,kComp))
        g.visible=fragment<1
        const material=hexes[i].material as THREE.MeshStandardMaterial
        material.transparent=true;material.opacity=1-fragment
        hexes[i].rotation.x=Math.sin(elapsed*29+i)*pressure*0.09
        hexes[i].rotation.z=Math.cos(elapsed*33+i)*pressure*0.08

        spokeArr[i * 6 + 3] = g.position.x
        spokeArr[i * 6 + 4] = g.position.y
        spokeArr[i * 6 + 5] = g.position.z
      }
      posAttr.needsUpdate = true

      // ─────────────────────────────────────────────────────────────
      // Crossfade fragments at their parent origins; B → C fluid physics remain unchanged.
      // Particle visibility & dynamics
      pEnergy *= 0.93

      // Project cursor into local space for fluid particle disturbance
      let localCurX = 0
      let localCurY = 0
      let localCurZ = 0
      let curVelX = 0
      let curVelY = 0
      let curVelZ = 0
      let curActive = false

      if (cursorValid) {
        const centerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
        const hit = new THREE.Vector3()
        if (ray.intersectPlane(centerPlane, hit)) {
          const lHit = hit.clone()
          orrery.worldToLocal(lHit)
          localCurX = lHit.x
          localCurY = lHit.y
          localCurZ = lHit.z
          curActive = true

          if (havePrevCur) {
            curVelX = Math.max(-0.7, Math.min(0.7, localCurX - prevLocalCurX))
            curVelY = Math.max(-0.7, Math.min(0.7, localCurY - prevLocalCurY))
            curVelZ = Math.max(-0.7, Math.min(0.7, localCurZ - prevLocalCurZ))
          }
          prevLocalCurX = localCurX
          prevLocalCurY = localCurY
          prevLocalCurZ = localCurZ
          havePrevCur = true
        } else {
          havePrevCur = false
        }
      } else {
        havePrevCur = false
      }

      ptsMat.opacity=kBurst>0?Math.min(kBurst/0.035,1)*0.92:0
      if(kBurst<=0){pos.set(A);vel.fill(0);ptsGeo.attributes.position.needsUpdate=true}

      // Only simulate particle physics when visible
      if (ptsMat.opacity > 0.01) {
        const wob = elapsed * 0.75
        const posArr = ptsGeo.attributes.position.array as Float32Array

        for (let i = 0; i < N; i++) {
          const idx = i * 3
          let hx: number, hy: number, hz: number

          if (kBurst <= 0) {
            // Clustered on dense sphere
            hx = A[idx]
            hy = A[idx + 1]
            hz = A[idx + 2]
          } else if (kBurst < 0.45) {
            // Exploding outward from sphere (A) to burst shell (B)
            const k = 1 - Math.pow(1 - kBurst / 0.45, 3)
            hx = lerp(A[idx], B[idx], k)
            hy = lerp(A[idx + 1], B[idx + 1], k)
            hz = lerp(A[idx + 2], B[idx + 2], k)
          } else {
            // Evolving from burst cloud (B) to living undulating fluid field (C)
            const k = (kBurst - 0.45) / 0.55
            hx = lerp(B[idx], C[idx], k)
            hy = lerp(B[idx + 1], C[idx + 1], k)
            hz = lerp(B[idx + 2], C[idx + 2], k)
          }

          // Harmonic living wobble
          hx += Math.sin(wob + i) * 0.06
          hy += Math.cos(wob * 1.1 + i) * 0.06

          let px = posArr[idx]
          let py = posArr[idx + 1]
          let pz = posArr[idx + 2]

          let vx = vel[idx]
          let vy = vel[idx + 1]
          let vz = vel[idx + 2]

          // 1) Spring back toward home target
          vx += (hx - px) * SPRING
          vy += (hy - py) * SPRING
          vz += (hz - pz) * SPRING

          // 2) Fluid cursor dynamics: radial lift + tangential swirl + wake
          if (curActive && kBurst > 0.15) {
            const dx = px - localCurX
            const dy = py - localCurY
            const dz = pz - localCurZ
            const d2 = dx * dx + dy * dy + dz * dz

            if (d2 < R_CUR2) {
              const dist = Math.sqrt(d2) + 1e-4
              const w = 1 - dist / R_CUR
              const inv = 1 / dist
              const en = 0.5 + pEnergy

              // Radial lift
              const fr = w * 0.12 * en
              vx += dx * inv * fr
              vy += dy * inv * fr
              vz += dz * inv * fr

              // Tangential swirl
              const tl = Math.sqrt(dz * dz + dx * dx) + 1e-4
              const ft = w * 0.22 * en
              vx += (-dz / tl) * ft
              vz += (dx / tl) * ft

              // Cursor drag / wake
              const fd = w * 0.95
              vx += curVelX * fd
              vy += curVelY * fd
              vz += curVelZ * fd
            }
          }

          // 3) Velocity damping & integration
          vx *= DAMP
          vy *= DAMP
          vz *= DAMP

          px += vx
          py += vy
          pz += vz

          vel[idx] = vx
          vel[idx + 1] = vy
          vel[idx + 2] = vz

          posArr[idx] = px
          posArr[idx + 1] = py
          posArr[idx + 2] = pz
        }
        ptsGeo.attributes.position.needsUpdate = true
      }

      // Scanner sweep. Fades up as the pop-out wave completes (progress
      // 0.5 → 0.65), then stays up — no sudden pop-in during the slide.
      const cycle = (Math.sin(elapsed * 0.5 - Math.PI / 2) + 1) / 2
      ring.position.y = -SWEEP + cycle * SWEEP * 2
      const ringMat = ring.material as THREE.MeshBasicMaterial
      ringMat.opacity =
        (0.7 + Math.sin(cycle * Math.PI) * 0.3) *
        labelOpacity.current *
        orreryNodeScale *
        introState.labels *
        Math.max(0, Math.min((introPop - 0.5) / 0.15, 1))

      // Labels fade. Each label rides its own node's spring: hidden inside the
      // core, smoothly appearing as the node arrives and settles at home.
      const lo = labelOpacity.current * orreryNodeScale * introState.labels
      for (let i = 0; i < labelSprites.length; i++) {
        ;(labelSprites[i].material as THREE.SpriteMaterial).opacity =
          lo * Math.max(0, Math.min((introScale[i] - INTRO_CORE_SCALE) / (1 - INTRO_CORE_SCALE), 1))
      }

      renderer.render(scene, camera)
    }
    animate()
    // First frame is on screen — tell the preloader the hero is genuinely ready.
    markReady("hero-scene")

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
  }, [labelOpacity, bleedZoom, canvasSize, scrollProgress])

  return <div ref={hostRef} className="h-full w-full" />
}
