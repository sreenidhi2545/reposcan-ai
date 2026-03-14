import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function lightAccent(accent) {
  const c = new THREE.Color(accent)
  return c.clone().lerp(new THREE.Color('#ffffff'), 0.45)
}

function createRobotMaterial(accent, glow = false) {
  const base = lightAccent(accent)
  return new THREE.MeshPhongMaterial({
    color: glow ? new THREE.Color(accent) : base,
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.4,
    shininess: glow ? 95 : 62,
    specular: new THREE.Color('#ffffff'),
    transparent: false,
    opacity: 1,
  })
}

function createGlowMaterial(accent) {
  return createRobotMaterial(accent, true)
}

function makeBox(size, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(...size), material)
}

function makeCylinder(radiusTop, radiusBottom, height, material, radialSegments = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material)
}

function createRobotRig(color, { seated = false } = {}) {
  const root = new THREE.Group()
  const shellMaterial = createRobotMaterial(color, false)
  const glowMaterial = createGlowMaterial(color)

  const torso = makeBox([1.2, 1.45, 0.8], shellMaterial)
  torso.position.y = 0.6
  root.add(torso)

  const chestLight = makeBox([0.34, 0.34, 0.06], glowMaterial)
  chestLight.position.set(0, 0.72, 0.43)
  root.add(chestLight)

  const headPivot = new THREE.Group()
  headPivot.position.set(0, 1.55, 0)
  root.add(headPivot)

  const head = makeBox([0.86, 0.58, 0.68], shellMaterial)
  headPivot.add(head)

  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), glowMaterial)
  const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), glowMaterial)
  eyeLeft.position.set(-0.16, 0.02, 0.35)
  eyeRight.position.set(0.16, 0.02, 0.35)
  headPivot.add(eyeLeft, eyeRight)

  const leftArmPivot = new THREE.Group()
  leftArmPivot.position.set(-0.75, 1.15, 0)
  const rightArmPivot = new THREE.Group()
  rightArmPivot.position.set(0.75, 1.15, 0)
  root.add(leftArmPivot, rightArmPivot)

  const leftArm = makeCylinder(0.11, 0.11, 1, shellMaterial)
  const rightArm = makeCylinder(0.11, 0.11, 1, shellMaterial)
  leftArm.position.y = -0.48
  rightArm.position.y = -0.48
  leftArmPivot.add(leftArm)
  rightArmPivot.add(rightArm)

  const leftLegPivot = new THREE.Group()
  leftLegPivot.position.set(-0.28, -0.1, 0)
  const rightLegPivot = new THREE.Group()
  rightLegPivot.position.set(0.28, -0.1, 0)
  root.add(leftLegPivot, rightLegPivot)

  const leftLeg = makeCylinder(0.12, 0.12, 1.05, shellMaterial)
  const rightLeg = makeCylinder(0.12, 0.12, 1.05, shellMaterial)
  leftLeg.position.y = seated ? -0.2 : -0.55
  rightLeg.position.y = seated ? -0.2 : -0.55
  leftLegPivot.add(leftLeg)
  rightLegPivot.add(rightLeg)

  if (seated) {
    leftLegPivot.rotation.x = -1.1
    rightLegPivot.rotation.x = -1.1
  }

  return {
    root,
    glowMaterial,
    parts: {
      torso,
      chestLight,
      headPivot,
      eyeLeft,
      eyeRight,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
    },
  }
}

function buildCoderRobot(scene, color, robotVariant) {
  const { root, parts } = createRobotRig(color, { seated: true })
  root.position.set(0.35, -0.85, 0)
  root.rotation.y = robotVariant === 'code-quality-header' ? Math.PI * 0.78 : -0.45
  root.rotation.x = robotVariant === 'code-quality-header' ? -0.16 : 0
  scene.add(root)

  const keyboard = makeBox([1.25, 0.08, 0.58], createRobotMaterial(color, false))
  keyboard.position.set(0.55, -0.1, 1.05)
  keyboard.rotation.x = -0.35
  scene.add(keyboard)

  const screen = makeBox([1.1, 0.7, 0.05], createGlowMaterial(color))
  screen.position.set(0.85, 0.58, 1.12)
  screen.rotation.y = -0.1
  scene.add(screen)

  const fingerMaterial = createGlowMaterial(color)
  const fingers = Array.from({ length: 4 }, (_, index) => {
    const finger = makeBox([0.08, 0.08, 0.08], fingerMaterial)
    finger.position.set(0.05 + index * 0.15, 0.08, 0.94)
    scene.add(finger)
    return finger
  })

  const bracketGroup = new THREE.Group()
  const leftTop = makeBox([0.06, 0.28, 0.04], createGlowMaterial(color))
  const leftBase = makeBox([0.18, 0.06, 0.04], createGlowMaterial(color))
  const rightTop = leftTop.clone()
  const rightBase = leftBase.clone()
  leftTop.position.set(-0.18, 0, 0)
  leftBase.position.set(-0.1, -0.12, 0)
  rightTop.position.set(0.18, 0, 0)
  rightBase.position.set(0.1, -0.12, 0)
  bracketGroup.add(leftTop, leftBase, rightTop, rightBase)
  bracketGroup.position.set(0.15, 1.95, 0.2)
  scene.add(bracketGroup)

  return (t) => {
    root.position.y = -0.85 + Math.sin(t * 1.4) * 0.04
    parts.headPivot.rotation.x = Math.sin(t * 2.8) * 0.06
    if (robotVariant === 'code-quality-header') {
      parts.headPivot.rotation.y = Math.sin(t * 0.9) * 0.42
    }
    parts.leftArmPivot.rotation.x = -0.95 + Math.sin(t * 5.5) * 0.08
    parts.rightArmPivot.rotation.x = -0.95 + Math.sin(t * 5.5 + 0.8) * 0.08
    fingers.forEach((finger, index) => {
      finger.position.y = 0.08 + Math.sin(t * 8 + index * 0.5) * 0.05
    })
    bracketGroup.rotation.y = t * 0.9
    bracketGroup.position.y = 1.95 + Math.sin(t * 1.6) * 0.05
  }
}

function buildGuardRobot(scene, color) {
  const { root, parts } = createRobotRig(color)
  root.position.set(0.2, -0.7, 0)
  scene.add(root)

  parts.leftArmPivot.rotation.z = -0.35
  parts.leftArmPivot.rotation.x = -0.4

  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 6), createGlowMaterial(color))
  shield.rotation.z = Math.PI / 2
  shield.position.set(-1.08, 0.68, 0.42)
  scene.add(shield)

  return (t) => {
    root.rotation.y = Math.sin(t * 1.1) * 0.22
    parts.headPivot.rotation.y = Math.sin(t * 1.1) * 0.18
    shield.scale.setScalar(1 + Math.sin(t * 2.1) * 0.04)
  }
}

function buildReaderRobot(scene, color) {
  const { root, parts } = createRobotRig(color, { seated: true })
  root.position.set(0.35, -0.95, 0)
  scene.add(root)

  const leftPage = makeBox([0.36, 0.46, 0.04], createGlowMaterial(color))
  const rightPage = makeBox([0.36, 0.46, 0.04], createGlowMaterial(color))
  leftPage.position.set(-0.18, 0.12, 0.88)
  rightPage.position.set(0.18, 0.12, 0.88)
  scene.add(leftPage, rightPage)

  const question = new THREE.Group()
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 24, Math.PI * 1.25), createGlowMaterial(color))
  const stem = makeBox([0.06, 0.16, 0.04], createGlowMaterial(color))
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), createGlowMaterial(color))
  stem.position.set(0.08, -0.1, 0)
  dot.position.set(0.02, -0.28, 0)
  question.add(hook, stem, dot)
  question.position.set(0.1, 1.95, 0.25)
  scene.add(question)

  return (t) => {
    parts.headPivot.rotation.z = Math.sin(t * 1.4) * 0.18
    leftPage.rotation.y = -0.25 + Math.sin(t * 3.1) * 0.08
    rightPage.rotation.y = 0.25 - Math.sin(t * 3.1) * 0.08
    question.rotation.y = t * 0.8
    question.position.y = 1.95 + Math.sin(t * 1.4) * 0.04
  }
}

function buildInspectorRobot(scene, color) {
  const { root, parts } = createRobotRig(color)
  root.position.set(0.15, -0.72, 0)
  root.rotation.y = -0.3
  scene.add(root)

  const packageMaterial = createGlowMaterial(color)
  const stack = [0, 1, 2].map((level) => {
    const box = makeBox([0.42, 0.28, 0.42], packageMaterial)
    box.position.set(0.9, -0.68 + level * 0.32, 0.65)
    scene.add(box)
    return box
  })

  return (t) => {
    const cycle = (Math.sin(t * 1.3) + 1) / 2
    root.position.y = -0.72 + Math.sin(t * 1.5) * 0.03
    parts.rightArmPivot.rotation.x = -0.25 + cycle * 1.2
    parts.headPivot.rotation.y = -0.1 + cycle * 0.35

    stack.forEach((box, index) => {
      box.position.y = -0.68 + index * 0.32 + Math.sin(t * 1.6 + index * 0.5) * 0.03
    })

    stack[2].position.x = 0.9 - cycle * 0.62
    stack[2].position.y = 0.08 + Math.sin(t * 1.3) * 0.05
    stack[2].position.z = 0.65 + cycle * 0.12
  }
}

function buildPresenterRobot(scene, color) {
  const { root, parts } = createRobotRig(color)
  root.position.set(0.15, -0.76, 0)
  scene.add(root)

  const barMaterial = createGlowMaterial(color)
  const bars = [0.4, 0.65, 0.95].map((height, index) => {
    const bar = makeBox([0.22, height, 0.16], barMaterial)
    bar.position.set(0.95 + index * 0.28, -0.75 + height / 2, 0.2)
    scene.add(bar)
    return { bar, baseHeight: height }
  })

  return (t) => {
    const sweep = Math.sin(t * 1.6) * 0.55
    parts.leftArmPivot.rotation.z = -1 + sweep * 0.25
    parts.rightArmPivot.rotation.z = 1 - sweep * 0.25
    parts.leftArmPivot.rotation.x = -0.2
    parts.rightArmPivot.rotation.x = -0.2
    bars.forEach(({ bar, baseHeight }, index) => {
      const scaleY = 0.75 + (Math.sin(t * 2 + index * 0.8) + 1) * 0.18
      bar.scale.y = scaleY
      bar.position.y = -0.75 + (baseHeight * scaleY) / 2
    })
  }
}

function buildCelebratorRobot(scene, color) {
  const { root, parts } = createRobotRig(color)
  root.position.set(0.12, -0.76, 0)
  scene.add(root)

  parts.leftArmPivot.rotation.z = -0.4
  parts.leftArmPivot.rotation.x = -1.2

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), createGlowMaterial(color))
  scene.add(star)

  return (t) => {
    root.position.y = -0.76 + Math.sin(t * 2.4) * 0.08
    parts.rightArmPivot.rotation.z = Math.sin(t * 2) * 0.45
    parts.headPivot.rotation.z = Math.sin(t * 1.6) * 0.08
    star.position.set(Math.cos(t * 0.9) * 0.95, 1.45 + Math.sin(t * 1.6) * 0.18, Math.sin(t * 0.9) * 0.35)
    star.rotation.y = t * 1.4
  }
}

function buildCheckerRobot(scene, color) {
  const { root, parts } = createRobotRig(color)
  root.position.set(0.18, -0.72, 0)
  root.rotation.y = -0.28
  scene.add(root)

  const clipboard = makeBox([0.46, 0.62, 0.05], createGlowMaterial(color))
  clipboard.position.set(0.92, 0.48, 0.42)
  scene.add(clipboard)

  const pen = makeCylinder(0.025, 0.025, 0.48, createGlowMaterial(color), 8)
  pen.rotation.z = Math.PI / 4
  pen.position.set(-0.72, 0.82, 0.45)
  scene.add(pen)

  const checkA = makeBox([0.08, 0.28, 0.04], createGlowMaterial(color))
  const checkB = makeBox([0.08, 0.48, 0.04], createGlowMaterial(color))
  checkA.rotation.z = -0.7
  checkB.rotation.z = 0.7
  const checkGroup = new THREE.Group()
  checkGroup.add(checkA, checkB)
  checkGroup.position.set(0.15, 1.95, 0.2)
  scene.add(checkGroup)

  return (t) => {
    parts.headPivot.rotation.x = Math.sin(t * 1.8) * 0.12
    parts.rightArmPivot.rotation.x = -0.8 + Math.sin(t * 4.2) * 0.18
    pen.position.y = 0.82 + Math.sin(t * 4.2) * 0.12
    checkGroup.visible = true
    checkGroup.rotation.y = t * 0.6
  }
}

function buildThinkerRobot(scene, color) {
  const { root, parts } = createRobotRig(color, { seated: true })
  root.position.set(0.18, -0.96, 0)
  scene.add(root)

  parts.leftArmPivot.rotation.x = -0.8
  parts.leftArmPivot.rotation.z = -0.4

  const bulbGroup = new THREE.Group()
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), createGlowMaterial(color))
  const bulbBase = makeCylinder(0.05, 0.06, 0.12, createGlowMaterial(color), 8)
  bulbBase.position.y = -0.16
  bulbGroup.add(bulb, bulbBase)
  bulbGroup.position.set(0.22, 2.02, 0.2)
  scene.add(bulbGroup)

  const orbitNode = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), createGlowMaterial(color))
  scene.add(orbitNode)

  return (t) => {
    root.position.y = -0.96 + Math.sin(t * 1.2) * 0.04
    parts.rightArmPivot.rotation.z = 0.35 + Math.sin(t * 1.1) * 0.18
    parts.headPivot.rotation.z = Math.sin(t * 0.9) * 0.08
    bulb.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06)
    orbitNode.position.set(Math.cos(t * 0.8) * 0.95, 1.45 + Math.sin(t * 1.6) * 0.12, Math.sin(t * 0.8) * 0.35)
  }
}

const ROBOT_BUILDERS = {
  coder: buildCoderRobot,
  guard: buildGuardRobot,
  reader: buildReaderRobot,
  inspector: buildInspectorRobot,
  presenter: buildPresenterRobot,
  celebrator: buildCelebratorRobot,
  checker: buildCheckerRobot,
  thinker: buildThinkerRobot,
}

export default function SectionRobot({ accentColor, robotType, size = 200, anchor = 'bottom-right', robotVariant }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
    camera.position.set(0, 0.6, 6.8)
    camera.lookAt(0.25, 0.45, 0)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(size, size, false)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    host.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight('#ffffff', 0.6)
    const keyLight = new THREE.PointLight(accentColor, 0.5, 28)
    keyLight.position.set(0, 3, 2)
    const fillLight = new THREE.PointLight('#ffffff', 0.5, 28)
    fillLight.position.set(0, 0, 4)
    scene.add(ambient, keyLight, fillLight)

    const animateRobot = (ROBOT_BUILDERS[robotType] || ROBOT_BUILDERS.coder)(scene, accentColor, robotVariant)

    let rafId = 0
    const start = performance.now()
    const loop = (now) => {
      const t = (now - start) / 1000
      animateRobot(t)
      renderer.render(scene, camera)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose())
          else child.material.dispose()
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [accentColor, robotType, size, robotVariant])

  return (
    <div
      ref={hostRef}
      className={`section-robot-overlay ${anchor === 'top-right' ? 'section-robot-overlay-top-right' : ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    />
  )
}