"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Line, Html } from "@react-three/drei"
import * as THREE from "three"

interface FileNode {
  name: string
  color: string
  position: [number, number, number]
  size: number
}

// Node layout: loosely mirrors a real dependency graph — core repo,
// orbiting analyzed files at varying depth/size to suggest hierarchy.
// Muted, desaturated palette — dusty coral / soft mustard / soft mint / pale slate-blue.
// Deliberately avoiding neon saturation so the cluster reads as calm and premium, not toy-like.
// Warm palette — terracotta, amber, olive, sand — to match a light, warm background
// instead of the cool mint/coral/blue set used on the dark theme.
const NODES: FileNode[] = [
  { name: "analyzer.ts", color: "#8a9a5b", position: [-2.5, 1.5, 0.6], size: 0.22 },
  { name: "parser.ts", color: "#d9a441", position: [-1.5, 2.4, -0.7], size: 0.15 },
  { name: "lambda.ts", color: "#c1694f", position: [2.3, 1.8, 0.5], size: 0.2 },
  { name: "session.ts", color: "#d9a441", position: [1.3, 2.5, -0.8], size: 0.13 },
  { name: "dashboard.tsx", color: "#8a9a5b", position: [-2.7, -0.5, -0.5], size: 0.18 },
  { name: "trends.ts", color: "#a3ab6f", position: [-1.7, -1.7, 0.6], size: 0.12 },
  { name: "oauth.ts", color: "#c1694f", position: [2.5, -0.7, 0.5], size: 0.17 },
  { name: "dynamo.ts", color: "#c2a878", position: [1.8, -1.9, -0.4], size: 0.12 },
  { name: "index.ts", color: "#a85c42", position: [0.1, -2.6, 0.3], size: 0.14 },
]

function NetworkCore() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.08
    meshRef.current.rotation.x += delta * 0.025
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.15, 1]} />
      <meshBasicMaterial color="#7a6f5d" wireframe transparent opacity={0.45} />
    </mesh>
  )
}

function Connections() {
  return (
    <>
      {NODES.map((node) => (
        <Line
          key={node.name}
          points={[
            [0, 0, 0],
            node.position,
          ]}
          color="#475569"
          transparent
          opacity={0.35}
          lineWidth={1}
        />
      ))}
    </>
  )
}

function FileNodeMesh({ node, index }: { node: FileNode; index: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const basePos = useMemo(() => new THREE.Vector3(...node.position), [node.position])

  // Gentle independent bob per node so the cluster feels alive, not static
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    const offset = index * 1.7
    groupRef.current.position.y = basePos.y + Math.sin(t * 0.55 + offset) * 0.09
    groupRef.current.position.x = basePos.x + Math.cos(t * 0.35 + offset) * 0.05
  })

  return (
    <group ref={groupRef} position={node.position}>
      <mesh>
        <icosahedronGeometry args={[node.size, 0]} />
        <meshStandardMaterial
          color={node.color}
          roughness={0.55}
          metalness={0.05}
          emissive={node.color}
          emissiveIntensity={0.12}
        />
      </mesh>
      <Html distanceFactor={9} occlude={false} className="pointer-events-none select-none">
        <span className="text-[11px] font-mono text-[#5c5346]/80 whitespace-nowrap block -translate-y-5">
          {node.name}
        </span>
      </Html>
    </group>
  )
}

function ScannerDisk() {
  const diskRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (!diskRef.current || !materialRef.current) return
    const t = clock.getElapsedTime()

    // Smooth 0→1→0 cycle (not a raw sine, so it eases at the top/bottom
    // instead of moving fastest at the extremes) driving the sweep.
    const cycle = (Math.sin(t * 0.32 - Math.PI / 2) + 1) / 2
    diskRef.current.position.y = -1.9 + cycle * 3.8

    // Brighten slightly as it passes through the core's middle, fade at the extremes —
    // reads as an active "scan" rather than a flat oscillation.
    const midPass = Math.sin(cycle * Math.PI)
    materialRef.current.opacity = 0.1 + midPass * 0.16
  })

  return (
    <mesh ref={diskRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.3, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#9c8f78"
        transparent
        opacity={0.16}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null)
  const target = useRef({ x: 0, y: 0 })

  // Subtle mouse-reactive tilt — lerped, not snapped, so it never feels jerky
  useFrame((state) => {
    target.current.x = (state.pointer.x * Math.PI) / 12
    target.current.y = (state.pointer.y * Math.PI) / 16

    if (groupRef.current) {
      groupRef.current.rotation.y += (target.current.x - groupRef.current.rotation.y) * 0.035
      groupRef.current.rotation.x += (-target.current.y - groupRef.current.rotation.x) * 0.035
    }
  })

  return (
    <group ref={groupRef}>
      <NetworkCore />
      <Connections />
      {NODES.map((node, i) => (
        <FileNodeMesh key={node.name} node={node} index={i} />
      ))}
    </group>
  )
}

export default function CodeNetworkHero() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.9} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#a78bfa" />
      <Scene />
      <ScannerDisk />
    </Canvas>
  )
}