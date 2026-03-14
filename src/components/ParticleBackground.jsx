import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function ResizeSync() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      gl.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [camera, gl])

  return null
}

function PerspectiveGridFloor() {
  const refA = useRef()
  const refB = useRef()

  useFrame((state) => {
    if (!refA.current || !refB.current) return
    const t = state.clock.elapsedTime
    refA.current.position.z = -18 + ((t * 0.45) % 1.8)
    refB.current.position.z = -18 + (((t * 0.45) + 0.9) % 1.8)
  })

  return (
    <group>
      <gridHelper ref={refA} args={[220, 120, '#2a3f9f', '#1a275a']} position={[0, -2.4, -18]} />
      <gridHelper ref={refB} args={[220, 120, '#22347f', '#13204a']} position={[0, -2.4, -18.9]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.39, -18]}>
        <planeGeometry args={[220, 220]} />
        <meshBasicMaterial color="#0a0e1a" transparent opacity={0.88} />
      </mesh>
    </group>
  )
}

function StarField({ count = 1400 }) {
  const ref = useRef()
  const { positions, velocities } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const v = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      p[i3 + 0] = (Math.random() - 0.5) * 120
      p[i3 + 1] = (Math.random() - 0.5) * 50
      p[i3 + 2] = -Math.random() * 130
      v[i] = 0.45 + Math.random() * 1.15
    }

    return { positions: p, velocities: v }
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current) return
    const arr = ref.current.geometry.attributes.position.array
    for (let i = 0; i < velocities.length; i++) {
      const i3 = i * 3
      arr[i3 + 2] += velocities[i] * delta * 2.2
      if (arr[i3 + 2] > 4) arr[i3 + 2] = -130
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#8fd6ff" size={0.18} transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

function FogLayer({ color = '#5b6dff', y = 0, z = -45, speed = 0.1, scale = 1 }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.x = Math.sin(t * speed) * 6
    ref.current.position.y = y + Math.cos(t * speed * 0.75) * 1.1
    ref.current.rotation.z = Math.sin(t * speed * 0.6) * 0.06
  })

  return (
    <mesh ref={ref} position={[0, y, z]} scale={[65 * scale, 24 * scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

function RobotBody({ bodyColor = '#334155', glowColor = '#67e8f9', seated = false, headRef, leftArmRef, rightArmRef, leftLegRef, rightLegRef }) {
  const shell = { color: bodyColor, metalness: 0.45, roughness: 0.42, emissive: '#0b1220' }
  const glow = { color: glowColor, metalness: 0.2, roughness: 0.15, emissive: glowColor, emissiveIntensity: 0.35 }

  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.4, 1.8, 0.9]} />
        <meshStandardMaterial {...shell} />
      </mesh>

      <group ref={headRef} position={[0, 1.95, 0.02]}>
        <mesh>
          <boxGeometry args={[1.05, 0.72, 0.78]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        <mesh position={[0, 0.02, 0.41]}>
          <boxGeometry args={[0.62, 0.12, 0.05]} />
          <meshStandardMaterial {...glow} />
        </mesh>
      </group>

      <group ref={leftArmRef} position={[-0.9, 1.28, 0]}>
        <mesh position={[0, -0.45, 0]}>
          <boxGeometry args={[0.28, 1.06, 0.28]} />
          <meshStandardMaterial {...shell} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.9, 1.28, 0]}>
        <mesh position={[0, -0.45, 0]}>
          <boxGeometry args={[0.28, 1.06, 0.28]} />
          <meshStandardMaterial {...shell} />
        </mesh>
      </group>

      <group ref={leftLegRef} position={[-0.34, seated ? -0.22 : -0.2, 0]}>
        <mesh position={[0, -0.58, seated ? 0.28 : 0]} rotation={[seated ? -0.8 : 0, 0, 0]}>
          <boxGeometry args={[0.35, 1.2, 0.35]} />
          <meshStandardMaterial {...shell} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.34, seated ? -0.22 : -0.2, 0]}>
        <mesh position={[0, -0.58, seated ? 0.28 : 0]} rotation={[seated ? -0.8 : 0, 0, 0]}>
          <boxGeometry args={[0.35, 1.2, 0.35]} />
          <meshStandardMaterial {...shell} />
        </mesh>
      </group>
    </group>
  )
}

function HoloTag({ type = 'code', position = [0, 0, 0], color = '#7dd3fc' }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.08
    ref.current.rotation.y = t * 0.7
  })

  return (
    <group ref={ref} position={position}>
      <mesh>
        <planeGeometry args={[1.1, 0.65]} />
        <meshBasicMaterial color={color} transparent opacity={0.17} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {type === 'code' && (
        <group>
          <mesh position={[-0.24, 0.12, 0.02]}><boxGeometry args={[0.42, 0.06, 0.03]} /><meshBasicMaterial color="#67e8f9" /></mesh>
          <mesh position={[-0.08, -0.02, 0.02]}><boxGeometry args={[0.62, 0.05, 0.03]} /><meshBasicMaterial color="#93c5fd" /></mesh>
          <mesh position={[-0.2, -0.16, 0.02]}><boxGeometry args={[0.48, 0.05, 0.03]} /><meshBasicMaterial color="#a78bfa" /></mesh>
        </group>
      )}
      {type === 'bug' && (
        <group>
          <mesh position={[0, 0.02, 0.03]}><sphereGeometry args={[0.12, 12, 12]} /><meshBasicMaterial color="#f87171" /></mesh>
          <mesh position={[0, -0.1, 0.03]}><sphereGeometry args={[0.09, 12, 12]} /><meshBasicMaterial color="#fb7185" /></mesh>
        </group>
      )}
      {type === 'shield' && (
        <mesh position={[0, 0, 0.03]}>
          <cylinderGeometry args={[0.14, 0.22, 0.28, 6]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      )}
      {type === 'chart' && (
        <group>
          <mesh position={[-0.2, -0.12, 0.03]}><boxGeometry args={[0.08, 0.2, 0.03]} /><meshBasicMaterial color="#67e8f9" /></mesh>
          <mesh position={[0, -0.06, 0.03]}><boxGeometry args={[0.08, 0.32, 0.03]} /><meshBasicMaterial color="#93c5fd" /></mesh>
          <mesh position={[0.2, 0.02, 0.03]}><boxGeometry args={[0.08, 0.48, 0.03]} /><meshBasicMaterial color="#22d3ee" /></mesh>
        </group>
      )}
    </group>
  )
}

function TypingRobot() {
  const groupRef = useRef()
  const headRef = useRef()
  const lArm = useRef()
  const rArm = useRef()
  const lLeg = useRef()
  const rLeg = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !headRef.current || !lArm.current || !rArm.current) return
    groupRef.current.position.y = -1.6 + Math.sin(t * 1.1) * 0.05
    headRef.current.rotation.y = Math.sin(t * 0.9) * 0.18
    lArm.current.rotation.x = -0.75 + Math.sin(t * 4) * 0.2
    rArm.current.rotation.x = -0.75 + Math.sin(t * 4 + 1.2) * 0.2
    if (lLeg.current && rLeg.current) {
      lLeg.current.rotation.x = -0.2
      rLeg.current.rotation.x = -0.2
    }
  })

  return (
    <group ref={groupRef} position={[-8.5, -1.6, -6.2]} scale={0.9}>
      <RobotBody headRef={headRef} leftArmRef={lArm} rightArmRef={rArm} leftLegRef={lLeg} rightLegRef={rLeg} />
      <mesh position={[0, 0.1, 1.1]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.8, 0.12, 1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.45} />
      </mesh>
      <HoloTag type="code" position={[0, 1.1, 1.45]} color="#67e8f9" />
    </group>
  )
}

function ScannerRobot() {
  const groupRef = useRef()
  const headRef = useRef()
  const laserRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !headRef.current || !laserRef.current) return
    groupRef.current.rotation.y = t * 0.16
    headRef.current.rotation.y = Math.sin(t * 1.3) * 0.36
    laserRef.current.rotation.y = Math.sin(t * 1.8) * 0.8
  })

  return (
    <group ref={groupRef} position={[-1.4, -1.72, -8.8]} scale={1.05}>
      <RobotBody headRef={headRef} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#2f3f57" glowColor="#a78bfa" />
      <group ref={laserRef} position={[0, 2.0, 0.55]}>
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.03, 1.6, 8]} />
          <meshBasicMaterial color="#f472b6" transparent opacity={0.52} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <HoloTag type="bug" position={[1.45, 1.4, 0.4]} color="#fb7185" />
    </group>
  )
}

function PatrolRobot() {
  const groupRef = useRef()
  const headRef = useRef()
  const lArm = useRef()
  const rArm = useRef()
  const lLeg = useRef()
  const rLeg = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !lArm.current || !rArm.current || !lLeg.current || !rLeg.current) return
    groupRef.current.position.x = Math.sin(t * 0.35) * 8
    groupRef.current.position.z = -10.4 + Math.cos(t * 0.35) * 1.4
    groupRef.current.rotation.y = Math.cos(t * 0.35) > 0 ? -0.2 : Math.PI - 0.2

    const swing = Math.sin(t * 2.3) * 0.34
    lArm.current.rotation.x = swing
    rArm.current.rotation.x = -swing
    lLeg.current.rotation.x = -swing
    rLeg.current.rotation.x = swing

    if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.8) * 0.16
  })

  return (
    <group ref={groupRef} position={[0, -1.78, -10.4]} scale={0.85}>
      <RobotBody headRef={headRef} leftArmRef={lArm} rightArmRef={rArm} leftLegRef={lLeg} rightLegRef={rLeg} bodyColor="#334155" glowColor="#5eead4" />
    </group>
  )
}

function ThinkingRobot() {
  const groupRef = useRef()
  const headRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !headRef.current) return
    groupRef.current.position.y = -2.0 + Math.sin(t * 0.8) * 0.04
    headRef.current.rotation.z = -0.22 + Math.sin(t * 1.1) * 0.08
  })

  return (
    <group ref={groupRef} position={[4.7, -2.0, -7.4]} scale={0.92}>
      <RobotBody seated headRef={headRef} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#3b4a62" glowColor="#93c5fd" />
      <HoloTag type="code" position={[1.15, 2.0, 0.35]} color="#93c5fd" />
    </group>
  )
}

function InspectorRobot() {
  const groupRef = useRef()
  const headRef = useRef()
  const armRef = useRef()
  const lensRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !headRef.current || !armRef.current || !lensRef.current) return
    groupRef.current.position.y = -1.68 + Math.sin(t) * 0.05
    headRef.current.rotation.y = Math.sin(t * 1.2) * 0.2
    armRef.current.rotation.x = -0.35 + Math.sin(t * 1.8) * 0.12
    lensRef.current.rotation.y = t * 1.3
  })

  return (
    <group ref={groupRef} position={[8.6, -1.68, -9]} scale={0.86}>
      <RobotBody headRef={headRef} leftArmRef={armRef} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#374151" glowColor="#22d3ee" />
      <mesh ref={lensRef} position={[-1.0, 1.03, 0.58]}>
        <torusGeometry args={[0.2, 0.04, 10, 40]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.95, 1.42, 0.65]}>
        <boxGeometry args={[0.95, 0.62, 0.05]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} />
      </mesh>
      <HoloTag type="shield" position={[1.62, 1.7, 0.4]} color="#34d399" />
    </group>
  )
}

function GuardRobot() {
  const groupRef = useRef()
  const headRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!groupRef.current || !headRef.current) return
    groupRef.current.rotation.y = 0.35 + Math.sin(t * 0.25) * 0.08
    headRef.current.rotation.y = Math.sin(t * 0.7) * 0.22
  })

  return (
    <group ref={groupRef} position={[0, -2.3, -17]} scale={1.85}>
      <RobotBody headRef={headRef} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#1f2937" glowColor="#818cf8" />
      <HoloTag type="shield" position={[0, 2.75, 0.4]} color="#60a5fa" />
    </group>
  )
}

function JetpackMiniRobot({ position = [-10, 4, -7], phase = 0 }) {
  const groupRef = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    if (!groupRef.current) return
    groupRef.current.position.y = position[1] + Math.sin(t * 1.6) * 0.35
    groupRef.current.position.x = position[0] + Math.cos(t * 0.8) * 0.45
    groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.4
  })

  return (
    <group ref={groupRef} position={position} scale={0.48}>
      <RobotBody headRef={null} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#334155" glowColor="#22d3ee" />
      <mesh position={[-0.42, -0.45, -0.38]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.11, 0.32, 10]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.42, -0.45, -0.38]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.11, 0.32, 10]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.52} />
      </mesh>
    </group>
  )
}

function AgentReporterRobot() {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!ref.current) return
    ref.current.position.y = -3.4 + Math.sin(t * 1.1) * 0.07
  })

  return (
    <group ref={ref} position={[2.2, -3.4, -10.4]} scale={0.72}>
      <RobotBody headRef={null} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#334155" glowColor="#67e8f9" />
      <HoloTag type="code" position={[0.95, 1.4, 0.4]} color="#67e8f9" />
    </group>
  )
}

function AgentClipboardRobot() {
  const armRef = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (armRef.current) armRef.current.rotation.x = -0.5 + Math.sin(t * 2.4) * 0.12
  })

  return (
    <group position={[5.8, -3.45, -10.8]} scale={0.68}>
      <RobotBody headRef={null} leftArmRef={armRef} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#2f3f57" glowColor="#93c5fd" />
      <mesh position={[-0.95, 1.0, 0.42]} rotation={[0.2, -0.2, 0]}>
        <boxGeometry args={[0.52, 0.72, 0.06]} />
        <meshBasicMaterial color="#bfdbfe" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function AgentChartRobot() {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!ref.current) return
    ref.current.rotation.y = -0.15 + Math.sin(t * 0.9) * 0.12
  })

  return (
    <group ref={ref} position={[9.2, -3.55, -11.4]} scale={0.78}>
      <RobotBody headRef={null} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#374151" glowColor="#a78bfa" />
      <HoloTag type="chart" position={[-1.28, 1.6, 0.45]} color="#a5b4fc" />
    </group>
  )
}

function SideObserverRobot({
  position = [-12, -3.2, -12],
  scale = 0.66,
  phase = 0,
  bodyColor = '#334155',
  glowColor = '#67e8f9',
  tagType = 'bug',
  tagColor = '#fb7185',
  facing = 0,
}) {
  const groupRef = useRef()
  const headRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    if (!groupRef.current || !headRef.current) return
    groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.05
    groupRef.current.rotation.y = facing + Math.sin(t * 0.6) * 0.12
    headRef.current.rotation.y = Math.sin(t * 1.4) * 0.2
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <RobotBody headRef={headRef} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor={bodyColor} glowColor={glowColor} />
      <HoloTag type={tagType} position={[0.9, 1.45, 0.35]} color={tagColor} />
    </group>
  )
}

function HoverScoutRobot({ position = [0, 4, -8], phase = 0, color = '#67e8f9' }) {
  const groupRef = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    if (!groupRef.current) return
    groupRef.current.position.x = position[0] + Math.cos(t * 0.9) * 0.55
    groupRef.current.position.y = position[1] + Math.sin(t * 1.6) * 0.3
    groupRef.current.rotation.y = Math.sin(t * 1.1) * 0.35
  })

  return (
    <group ref={groupRef} position={position} scale={0.46}>
      <RobotBody headRef={null} leftArmRef={null} rightArmRef={null} leftLegRef={null} rightLegRef={null} bodyColor="#2f3f57" glowColor={color} />
      <mesh position={[0, -0.58, -0.34]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.14, 0.45, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function RobotField() {
  return (
    <group>
      <TypingRobot />
      <ScannerRobot />
      <PatrolRobot />
      <ThinkingRobot />
      <InspectorRobot />
      <GuardRobot />
      <JetpackMiniRobot position={[-11.6, 4.5, -8]} phase={0.2} />
      <JetpackMiniRobot position={[11.8, 4.1, -9]} phase={2.2} />
      <AgentReporterRobot />
      <AgentClipboardRobot />
      <AgentChartRobot />
      <SideObserverRobot position={[-12.8, -3.3, -12.8]} phase={0.3} bodyColor="#3b4a62" glowColor="#5eead4" tagType="code" tagColor="#67e8f9" facing={0.18} />
      <SideObserverRobot position={[-6.4, -3.25, -11.8]} phase={1.4} bodyColor="#334155" glowColor="#93c5fd" tagType="shield" tagColor="#34d399" facing={0.08} />
      <SideObserverRobot position={[-0.8, -3.3, -12.2]} phase={2.1} bodyColor="#374151" glowColor="#a78bfa" tagType="chart" tagColor="#c4b5fd" facing={-0.04} />
      <SideObserverRobot position={[12.8, -3.35, -12.6]} phase={2.8} bodyColor="#2f3f57" glowColor="#7dd3fc" tagType="bug" tagColor="#fda4af" facing={-0.16} />
      <HoverScoutRobot position={[-13.8, 3.8, -9.2]} phase={0.5} color="#67e8f9" />
      <HoverScoutRobot position={[-3.4, 5.0, -10]} phase={1.8} color="#a78bfa" />
      <HoverScoutRobot position={[3.2, 4.4, -9.6]} phase={2.5} color="#5eead4" />
      <HoverScoutRobot position={[13.9, 3.6, -9.1]} phase={3.2} color="#93c5fd" />
    </group>
  )
}

export default function ParticleBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0.3, 10], fov: 58, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100vw', height: '100vh', display: 'block' }}>
        <ResizeSync />
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.72} color="#9dc3ff" />
        <directionalLight intensity={0.5} position={[6, 8, 6]} color="#c9dbff" />
        <pointLight intensity={0.35} position={[-8, 2, 2]} color="#67e8f9" />
        <pointLight intensity={0.32} position={[10, 3, -3]} color="#a78bfa" />

        <PerspectiveGridFloor />
        <StarField />
        <FogLayer color="#6d5dfc" y={1.6} z={-42} speed={0.12} scale={1.1} />
        <FogLayer color="#4f9dff" y={-0.8} z={-36} speed={0.09} scale={1.25} />
        <FogLayer color="#8b5cf6" y={3.2} z={-55} speed={0.07} scale={1.5} />
        <RobotField />
      </Canvas>
    </div>
  )
}
