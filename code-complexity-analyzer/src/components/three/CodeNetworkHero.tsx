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
const NODES: FileNode[] = [
  { name: "analyzer.ts", color: "#22d3ee", position: [-2.5, 1.5, 0.6], size: 0.22 },
  { name: "parser.ts", color: "#22d3ee", position: [-1.5, 2.4, -0.7], size: 0.15 },
  { name: "lambda.ts", color: "#a78bfa", position: [2.3, 1.8, 0.5], size: 0.2 },
  { name: "session.ts", color: "#a78bfa", position: [1.3, 2.5, -0.8], size: 0.13 },
  { name: "dashboard.tsx", color: "#34d399", position: [-2.7, -0.5, -0.5], size: 0.18 },
  { name: "trends.ts", color: "#34d399", position: [-1.7, -1.7, 0.6], size: 0.12 },
  { name: "oauth.ts", color: "#fbbf24", position: [2.5, -0.7, 0.5], size: 0.17 },
  { name: "dynamo.ts", color: "#fbbf24", position: [1.8, -1.9, -0.4], size: 0.12 },
  { name: "index.ts", color: "#60a5fa", position: [0.1, -2.6, 0.3], size: 0.14 },
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
      <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.3} />
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
          roughness={0.35}
          metalness={0.15}
          emissive={node.color}
          emissiveIntensity={0.3}
        />
      </mesh>
      <Html distanceFactor={9} occlude={false} className="pointer-events-none select-none">
        <span className="text-[11px] font-mono text-slate-300/70 whitespace-nowrap block -translate-y-5">
          {node.name}
        </span>
      </Html>
    </group>
  )
}

function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <circleGeometry args={[2.8, 64]} />
      <meshBasicMaterial color="#0ea5e9" transparent opacity={0.05} />
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
      <GroundShadow />
    </Canvas>
  )
}