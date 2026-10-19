import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { ActionSignal, CareAction, CharacterId, GrowthStageId, IncidentId, KeepsakeId, PersonalityId, PetMood, ThemeDefinition } from '../game/types'

const CARE_ACTIONS = new Set<CareAction>(['feed', 'play', 'wash', 'rest', 'cuddle', 'explore'])
interface ActionSpec {
  duration: number
  anticipateEnd: number
  contactEnd: number
  holdEnd: number
}

const ACTION_SPEC: Record<CareAction, ActionSpec> = {
  feed: { duration: 2.35, anticipateEnd: 0.16, contactEnd: 0.52, holdEnd: 0.78 },
  play: { duration: 2.45, anticipateEnd: 0.18, contactEnd: 0.63, holdEnd: 0.8 },
  wash: { duration: 2.5, anticipateEnd: 0.16, contactEnd: 0.58, holdEnd: 0.78 },
  rest: { duration: 3.2, anticipateEnd: 0.22, contactEnd: 0.42, holdEnd: 0.84 },
  cuddle: { duration: 3, anticipateEnd: 0.18, contactEnd: 0.48, holdEnd: 0.83 },
  explore: { duration: 2.7, anticipateEnd: 0.16, contactEnd: 0.62, holdEnd: 0.8 },
}

const smoothRange = (value: number, start: number, end: number) => {
  const progress = THREE.MathUtils.clamp((value - start) / Math.max(0.001, end - start), 0, 1)
  return progress * progress * (3 - 2 * progress)
}

const ARM_POSES: Record<CareAction | 'idle', {
  left: [number, number, number]
  right: [number, number, number]
  leftRotation: number
  rightRotation: number
}> = {
  idle: { left: [-0.68, -0.06, 0.28], right: [0.68, -0.06, 0.28], leftRotation: -0.35, rightRotation: 0.35 },
  feed: { left: [-0.3, 0.02, 0.7], right: [0.3, 0.02, 0.7], leftRotation: -0.88, rightRotation: 0.88 },
  play: { left: [-0.67, 0.45, 0.3], right: [0.67, 0.45, 0.3], leftRotation: 1.05, rightRotation: -1.05 },
  wash: { left: [-0.78, 0.2, 0.32], right: [0.78, 0.2, 0.32], leftRotation: -1.1, rightRotation: 1.1 },
  rest: { left: [-0.4, -0.24, 0.58], right: [0.4, -0.24, 0.58], leftRotation: -0.72, rightRotation: 0.72 },
  cuddle: { left: [-0.24, -0.02, 0.75], right: [0.24, -0.02, 0.78], leftRotation: -1.15, rightRotation: 1.15 },
  explore: { left: [-0.65, -0.04, 0.3], right: [0.72, 0.32, 0.42], leftRotation: -0.28, rightRotation: -1.12 },
}


function isCareAction(action: ActionSignal): action is CareAction {
  return action !== null && CARE_ACTIONS.has(action as CareAction)
}

function Heart({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, 0, Math.PI]}>
      <mesh position={[-0.09, 0, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color="#ff7897" /></mesh>
      <mesh position={[0.09, 0, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color="#ff7897" /></mesh>
      <mesh position={[0, 0.12, 0]}><coneGeometry args={[0.2, 0.34, 4]} /><meshBasicMaterial color="#ff7897" /></mesh>
    </group>
  )
}

function Wearable({ itemId }: { itemId: KeepsakeId | null }) {
  if (itemId === 'star-ribbon') {
    return (
      <group position={[-0.52, 0.66, 0.62]} rotation={[0, 0.15, -0.18]}>
        <mesh position={[-0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.14, 0.28, 4]} /><meshStandardMaterial color="#ff7897" /></mesh>
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.14, 0.28, 4]} /><meshStandardMaterial color="#ff7897" /></mesh>
        <mesh><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#fff0a8" /></mesh>
      </group>
    )
  }
  if (itemId === 'sprout-crown') {
    return (
      <group position={[0, 1.05, 0]}>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.035, 0.05, 0.3, 8]} /><meshStandardMaterial color="#537c59" /></mesh>
        <mesh position={[-0.12, 0.24, 0]} rotation={[0, 0, 0.8]} scale={[1.5, 0.65, 1]}><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#79b16f" /></mesh>
        <mesh position={[0.12, 0.27, 0]} rotation={[0, 0, -0.8]} scale={[1.5, 0.65, 1]}><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#a5d27d" /></mesh>
      </group>
    )
  }
  if (itemId === 'moon-charm') {
    return <group position={[0.42, -0.22, 0.78]} scale={0.45}><mesh rotation={[0, 0, 0.45]}><torusGeometry args={[0.22, 0.055, 8, 20, Math.PI * 1.5]} /><meshStandardMaterial color="#fff0a8" emissive="#ffe59a" emissiveIntensity={0.3} /></mesh></group>
  }
  return null
}

function RoomKeepsake({ itemId, accent }: { itemId: KeepsakeId | null; accent: string }) {
  if (itemId === 'memory-lantern') {
    return (
      <group position={[1.75, -0.55, -0.5]}>
        <mesh>
          <boxGeometry args={[0.42, 0.62, 0.38]} />
          <meshStandardMaterial color="#fff0a8" emissive="#ffd66f" emissiveIntensity={0.55} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[0.16, 0.035, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#4c2933" />
        </mesh>
      </group>
    )
  }

  if (itemId === 'tiny-garden') {
    return (
      <group position={[1.7, -0.72, -0.45]}>
        {[-0.24, 0, 0.24].map((x, index) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.035, 0.42, 7]} />
              <meshStandardMaterial color="#537c59" />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <sphereGeometry args={[0.11, 10, 7]} />
              <meshStandardMaterial color={index === 1 ? accent : '#ff9ca4'} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  if (itemId === 'dream-mobile') {
    return (
      <group position={[1.65, 1.05, -0.65]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.38, 0.025, 6, 24]} />
          <meshStandardMaterial color={accent} />
        </mesh>
        {[-0.25, 0, 0.25].map((x, index) => (
          <group key={x} position={[x, -0.3 - index * 0.08, 0]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.42, 5]} />
              <meshBasicMaterial color="#4c2933" />
            </mesh>
            <mesh position={[0, -0.26, 0]}>
              <octahedronGeometry args={[0.08]} />
              <meshStandardMaterial color="#fff0a8" />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  return null
}

function IncidentSignal({ incidentId }: { incidentId: IncidentId | null }) {
  if (incidentId === 'static-cloud') {
    return (
      <group position={[-1.15, 1.25, 0]}>
        {[-0.22, 0, 0.22].map((x) => (
          <mesh key={x} position={[x, Math.abs(x), 0]}>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color="#a59bb8" transparent opacity={0.82} />
          </mesh>
        ))}
      </group>
    )
  }

  if (incidentId === 'tangled-sprout') {
    return (
      <mesh position={[0, -0.7, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.74, 0.04, 7, 30]} />
        <meshStandardMaterial color="#83b679" />
      </mesh>
    )
  }

  if (incidentId === 'wandering-signal') {
    return (
      <group position={[1.2, 0.75, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.2]} />
          <meshStandardMaterial color="#bff7ff" emissive="#76dfff" emissiveIntensity={0.5} />
        </mesh>
      </group>
    )
  }

  return null
}

function ActionEffects({ action, color, reducedMotion }: { action: CareAction; color: string; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const effectItems = useRef<Array<THREE.Group | null>>([])
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    elapsed.current += delta
    const spec = ACTION_SPEC[action]
    const progress = Math.min(1, elapsed.current / spec.duration)
    const anticipation = smoothRange(progress, 0, spec.anticipateEnd)
    const contact = smoothRange(progress, spec.anticipateEnd, spec.contactEnd)
    const hold = smoothRange(progress, spec.contactEnd, spec.holdEnd)
    const recovery = smoothRange(progress, spec.holdEnd, 1)
    const contactPulse = Math.sin(contact * Math.PI)
    const holdPulse = Math.sin(hold * Math.PI)
    const travel = reducedMotion ? 0 : 1
    let x = 0
    let y = 0
    let rotateY = 0
    let rotateZ = 0
    let scale = 1.02 + anticipation * 0.08 + contactPulse * 0.14 + holdPulse * 0.07 - recovery * 0.08

    if (action === 'feed') {
      x = -0.4 * contact * (1 - recovery) * travel
      y = 0.12 * contact * (1 - recovery) * travel
    } else if (action === 'play') {
      y = 0.24 * contactPulse * travel
      rotateY = 0.6 * contactPulse * travel
      scale += 0.12 * contactPulse
    } else if (action === 'wash') {
      y = 0.06 * holdPulse * travel
      rotateZ = Math.sin(contact * Math.PI * 5) * 0.14 * (1 - recovery) * travel
    } else if (action === 'rest') {
      y = -0.08 * anticipation * (1 - recovery) * travel
      scale = 1.02 + anticipation * 0.06 + holdPulse * 0.04 - recovery * 0.04
    } else if (action === 'cuddle') {
      y = 0.035 * holdPulse * travel
      scale = 1.02 + anticipation * 0.04 + contactPulse * 0.09 + holdPulse * 0.05 - recovery * 0.04
    } else if (action === 'explore') {
      x = 0.18 * contactPulse * travel
      rotateY = 0.4 * contactPulse * travel
    }

    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, x, 12, delta)
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, y, 12, delta)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, rotateY, 12, delta)
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, rotateZ, 12, delta)
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 12, delta))

    for (let index = 0; index < effectItems.current.length; index += 1) {
      const item = effectItems.current[index]
      if (!item) continue
      const stagger = smoothRange(progress, spec.anticipateEnd + index * 0.025, Math.min(spec.holdEnd, spec.contactEnd + 0.24 + index * 0.035))
      const pulse = Math.sin(stagger * Math.PI)
      const itemTravel = reducedMotion ? 0 : 1
      const lift = action === 'wash'
        ? stagger * (0.18 + index * 0.025)
        : action === 'cuddle'
          ? pulse * (0.1 + index * 0.02)
          : pulse * (0.08 + index * 0.018)
      const itemTurn = action === 'play' || action === 'explore' ? stagger * (0.45 + index * 0.12) : pulse * 0.12
      const itemScale = reducedMotion
        ? 0.94 + pulse * 0.08
        : 0.72 + stagger * 0.38 + pulse * 0.16 - recovery * 0.16
      item.position.y = THREE.MathUtils.damp(item.position.y, lift * itemTravel, 14, delta)
      item.rotation.y = THREE.MathUtils.damp(item.rotation.y, itemTurn * itemTravel, 14, delta)
      item.rotation.z = THREE.MathUtils.damp(item.rotation.z, (index % 2 ? -1 : 1) * itemTurn * 0.45 * itemTravel, 14, delta)
      item.scale.setScalar(THREE.MathUtils.damp(item.scale.x, itemScale, 14, delta))
    }
  })

  const bubblePositions: [number, number, number][] = [[-0.7, 0.2, 0.6], [-0.45, 0.9, 0.4], [0.62, 0.45, 0.6], [0.4, 1.1, 0.2], [0, 1.35, 0.1]]
  const starPositions: [number, number, number][] = [[-0.9, 0.9, 0.4], [0.9, 0.7, 0.2], [-0.55, 1.45, 0], [0.45, 1.55, 0.2]]

  return (
    <group ref={group} position={[0, 0, 0.5]}>
      {action === 'feed' && (
        <group>
          <group ref={(node) => { effectItems.current[0] = node }}>
            <mesh position={[0.52, 0.14, 0.7]}><sphereGeometry args={[0.18, 14, 10]} /><meshStandardMaterial color="#e68a45" /></mesh>
          </group>
          {[-0.24, 0, 0.25].map((x, index) => (
            <group key={x} position={[x, 0.46 + index * 0.1, 0.82]}>
              <group ref={(node) => { effectItems.current[index + 1] = node }}><mesh><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#fff1a8" /></mesh></group>
            </group>
          ))}
        </group>
      )}
      {action === 'play' && starPositions.map((position, index) => (
        <group key={index} position={position}>
          <group ref={(node) => { effectItems.current[index] = node }}>
            <mesh rotation={[0.4, 0.3, index]}><octahedronGeometry args={[0.16]} /><meshStandardMaterial color={index % 2 ? color : '#fff4a8'} emissive={color} emissiveIntensity={0.3} /></mesh>
          </group>
        </group>
      ))}
      {action === 'wash' && bubblePositions.map((position, index) => (
        <group key={index} position={position}>
          <group ref={(node) => { effectItems.current[index] = node }}>
            <mesh><sphereGeometry args={[0.11 + index * 0.018, 14, 10]} /><meshStandardMaterial color="#bff7ff" transparent opacity={0.58} roughness={0.18} /></mesh>
          </group>
        </group>
      ))}
      {action === 'rest' && (
        <group position={[0.75, 1.25, 0.2]}>
          <group ref={(node) => { effectItems.current[0] = node }}>
            <mesh rotation={[0, 0, 0.5]}><torusGeometry args={[0.3, 0.065, 10, 24, Math.PI * 1.45]} /><meshBasicMaterial color="#fff0a8" /></mesh>
            <mesh position={[-0.55, 0.15, 0]}><sphereGeometry args={[0.055, 8, 6]} /><meshBasicMaterial color="#fff" /></mesh>
          </group>
        </group>
      )}
      {action === 'cuddle' && (
        <group>
          <group position={[-0.38, 0.78, 0.4]}><group ref={(node) => { effectItems.current[0] = node }}><Heart position={[0, 0, 0]} scale={0.82} /></group></group>
          <group position={[0.38, 0.93, 0.3]}><group ref={(node) => { effectItems.current[1] = node }}><Heart position={[0, 0, 0]} scale={0.7} /></group></group>
          <group position={[0, 1.38, 0.1]}><group ref={(node) => { effectItems.current[2] = node }}><Heart position={[0, 0, 0]} scale={0.58} /></group></group>
        </group>
      )}
      {action === 'explore' && (
        <group position={[0, 0.85, 0.25]}>
          <group ref={(node) => { effectItems.current[0] = node }}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.75, 0.035, 8, 38]} /><meshBasicMaterial color={color} /></mesh>
            {[0, 1, 2, 3].map((index) => <mesh key={index} position={[Math.cos(index * Math.PI / 2) * 0.75, Math.sin(index * Math.PI / 2) * 0.75, 0]} rotation={[0, 0, -index * Math.PI / 2]}><coneGeometry args={[0.1, 0.28, 4]} /><meshBasicMaterial color="#fff4a8" /></mesh>)}
          </group>
        </group>
      )}
    </group>
  )
}


interface PetProps {
  mood: PetMood
  character: CharacterId
  headphones: boolean
  effectColor: string
  lastAction: ActionSignal
  actionNonce: number
  reducedMotion: boolean
  personality: PersonalityId
  growthStage: GrowthStageId
  wearableId: KeepsakeId | null
  onPlay: () => void
}


/** 星跃的圆润五角星轮廓（可编辑 Shape + Extrude，倒角出质感） */
/** 星跃连续轮廓：顶部单圆尖 → 右肩 → 右侧圆尖手 → 右腿 → 底部中央上凹 →
 *  左腿 → 左侧圆尖手 → 左肩 → 顶部（一条闭合路径，无分离手脚） */
function createStarShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, 1.06)                              // 顶部短圆尖（0.3.4 更圆钝）
  shape.quadraticCurveTo(0.3, 0.94, 0.56, 0.58)      // 圆尖右沿 → 右肩
  shape.quadraticCurveTo(0.94, 0.32, 1.0, -0.06)     // 右肩 → 右侧贴身短手（最外）
  shape.quadraticCurveTo(0.94, -0.3, 0.8, -0.34)     // 短手内沿
  shape.quadraticCurveTo(0.66, -0.6, 0.58, -0.82)    // 右腿外沿
  shape.quadraticCurveTo(0.54, -1.04, 0.34, -1.02)   // 右腿底
  shape.quadraticCurveTo(0.16, -0.98, 0.12, -0.86)   // 右腿内沿
  shape.quadraticCurveTo(0, -0.72, -0.12, -0.86)     // 底部中央上凹
  shape.quadraticCurveTo(-0.16, -0.98, -0.34, -1.02) // 左腿内沿 → 左腿底
  shape.quadraticCurveTo(-0.54, -1.04, -0.58, -0.82) // 左腿外沿
  shape.quadraticCurveTo(-0.66, -0.6, -0.8, -0.34)   // 左腿 → 左手内沿
  shape.quadraticCurveTo(-0.94, -0.3, -1.0, -0.06)   // 左侧贴身短手（最外）
  shape.quadraticCurveTo(-0.94, 0.32, -0.56, 0.58)   // 左手外沿 → 左肩
  shape.quadraticCurveTo(-0.3, 0.94, 0, 1.06)        // 左肩 → 顶部
  shape.closePath()
  return shape
}

/** 方跃连续轮廓：宽扁身体 + 左右不对称阶梯头顶（向右上收）+ 两侧矩形手 + 双腿中缺口（直角） */
function createBlockShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-0.6, -0.98)      // 左腿底外
  shape.lineTo(-0.56, -0.6)      // 左腿外沿
  shape.lineTo(-0.9, -0.42)      // 左手外沿（贴身短手）
  shape.lineTo(-0.92, 0.1)       // 左手顶
  shape.lineTo(-0.78, 0.24)      // 左手内沿
  shape.lineTo(-0.76, 0.06)      // 身体左缘
  shape.lineTo(-0.7, 0.44)       // 阶梯 1（左低）
  shape.lineTo(-0.2, 0.52)
  shape.lineTo(-0.1, 0.74)       // 阶梯 2
  shape.lineTo(0.26, 0.8)
  shape.lineTo(0.36, 1.02)       // 阶梯 3（顶，偏右）
  shape.lineTo(0.76, 1.04)
  shape.lineTo(0.8, 0.72)        // 顶阶右沿
  shape.lineTo(0.82, 0.06)       // 身体右缘
  shape.lineTo(0.92, -0.1)       // 右手外沿（贴身短手）
  shape.lineTo(0.9, -0.46)
  shape.lineTo(0.62, -0.6)       // 右手内沿 → 右腿外
  shape.lineTo(0.6, -0.98)       // 右腿底外
  shape.lineTo(0.14, -0.92)      // 右腿底内
  shape.quadraticCurveTo(0, -0.7, -0.14, -0.92) // 两腿中间缺口
  shape.lineTo(-0.56, -0.98)     // 左腿底内
  shape.closePath()
  return shape
}
const BLOCK_SHAPE = createBlockShape()
const STAR_SHAPE = createStarShape()
const STAR_EXTRUDE_OPTIONS = {
  depth: 0.5, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.16, bevelSegments: 5, curveSegments: 12,
}

/** 黑橙耳机（两个角色共用，按角色头部高度定位） */
function Headphones({ character, reducedMotion }: { character: CharacterId; reducedMotion: boolean }) {
  const band = useRef<THREE.Mesh>(null)
  const leftCup = useRef<THREE.Mesh>(null)
  const rightCup = useRef<THREE.Mesh>(null)
  // 耳罩贴主体左右头侧（x≈±0.75, y≈0.35），头梁从两侧跨头顶（不上飘）
  const earY = 0.35
  const bandR = character === 'block' ? 0.62 : 0.58
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const bounce = reducedMotion ? 0 : Math.sin(time * 1.9) * 0.015
    if (band.current) band.current.position.y = earY + bounce
    if (leftCup.current) leftCup.current.position.y = earY + bounce
    if (rightCup.current) rightCup.current.position.y = earY + bounce
  })
  return (
    <group>
      <mesh ref={band} position={[0, earY, -0.06]}>
        <torusGeometry args={[bandR, 0.05, 10, 32, Math.PI]} />
        <meshStandardMaterial color="#191a20" roughness={0.42} />
      </mesh>
      <mesh ref={leftCup} position={[-0.75, earY, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.15, 0.14, 4, 12]} />
        <meshStandardMaterial color="#ff7a1a" roughness={0.35} emissive="#c24e00" emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={rightCup} position={[0.75, earY, 0.04]} rotation={[0, 0, -Math.PI / 2]}>
        <capsuleGeometry args={[0.15, 0.14, 4, 12]} />
        <meshStandardMaterial color="#ff7a1a" roughness={0.35} emissive="#c24e00" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function Pet({ mood, effectColor, lastAction, actionNonce, reducedMotion, personality, growthStage, wearableId, character, headphones, onPlay }: PetProps) {
  const rig = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Mesh>(null)
  const rightArm = useRef<THREE.Mesh>(null)
  const leftEye = useRef<THREE.Mesh>(null)
  const rightEye = useRef<THREE.Mesh>(null)
  const leftFoot = useRef<THREE.Mesh>(null)
  const rightFoot = useRef<THREE.Mesh>(null)
  const actionElapsed = useRef(10)
  const pulse = useRef(0)
  const [activeAction, setActiveAction] = useState<CareAction | null>(null)

  useEffect(() => {
    pulse.current = 1
    if (!isCareAction(lastAction)) {
      setActiveAction(null)
      return
    }
    actionElapsed.current = 0
    setActiveAction(lastAction)
    const timer = window.setTimeout(() => setActiveAction(null), ACTION_SPEC[lastAction].duration * 1_000)
    return () => window.clearTimeout(timer)
  }, [actionNonce, lastAction])

  useFrame((state, delta) => {
    if (!rig.current) return
    const time = state.clock.elapsedTime
    actionElapsed.current += delta
    pulse.current = Math.max(0, pulse.current - delta * 1.8)

    const spec = activeAction ? ACTION_SPEC[activeAction] : null
    const progress = spec ? Math.min(1, actionElapsed.current / spec.duration) : 0
    const anticipation = spec ? smoothRange(progress, 0, spec.anticipateEnd) : 0
    const contact = spec ? smoothRange(progress, spec.anticipateEnd, spec.contactEnd) : 0
    const hold = spec ? smoothRange(progress, spec.contactEnd, spec.holdEnd) : 0
    const recovery = spec ? smoothRange(progress, spec.holdEnd, 1) : 0
    const poseWeight = anticipation * (1 - recovery)
    const travel = reducedMotion ? 0.04 : 1
    const bodyMotion = reducedMotion ? 0.12 : 1
    const idleMotion = reducedMotion ? 0 : 1
    const idleBreath = (Math.sin(time * 1.72) * 0.014 + Math.sin(time * 0.63 + 0.8) * 0.006) * idleMotion
    const idleY = (Math.sin(time * 1.13) * 0.035 + Math.sin(time * 0.47 + 1.4) * 0.012) * idleMotion
    const idleTilt = Math.sin(time * 0.69 + 0.3) * 0.025 * idleMotion
    const attentionPhase = personality === 'curious' ? 1.8 : personality === 'playful' ? 0.7 : 2.6
    const attentionSignal = (Math.sin(time * 0.37 + attentionPhase) + Math.sin(time * 0.19 + attentionPhase * 0.6) + 2) * 0.25
    const attention = activeAction || reducedMotion ? 0 : smoothRange(attentionSignal, 0.82, 0.98)
    const attentionDirection = Math.sin(time * 0.23 + attentionPhase)
    const attentionAmount = personality === 'curious' ? 0.14 : personality === 'playful' ? 0.1 : 0.075
    const stageScale = growthStage === 'luminary' ? 1.1 : growthStage === 'bloom' ? 1.04 : 0.94
    let x = 0
    let y = idleY
    let rotateX = 0
    let rotateY = attention * attentionDirection * attentionAmount
    let rotateZ = idleTilt + attention * attentionDirection * 0.018
    let scaleX = stageScale
    let scaleY = stageScale + idleBreath
    let scaleZ = stageScale
    let exploreScan = 0

    if (activeAction === 'feed') {
      const reach = anticipation * (1 - contact)
      const chew = Math.sin(contact * Math.PI * 6) * (1 - hold * 0.72) * (1 - recovery)
      const swallow = Math.sin(hold * Math.PI)
      rotateX = (reach * 0.12 + chew * 0.055 - swallow * 0.08) * bodyMotion
      y -= (reach * 0.07 + Math.abs(chew) * 0.025) * travel
      scaleX += Math.abs(chew) * 0.045 * bodyMotion
      scaleY -= Math.abs(chew) * 0.04 * bodyMotion
    } else if (activeAction === 'play') {
      const crouch = anticipation * (1 - contact)
      const jump = Math.sin(contact * Math.PI)
      const landing = Math.sin(smoothRange(progress, spec!.contactEnd, Math.min(spec!.holdEnd, spec!.contactEnd + 0.11)) * Math.PI)
      const rebound = Math.sin(hold * Math.PI)
      y += (jump * 0.72 - crouch * 0.16 + rebound * 0.11) * travel
      rotateY = jump * 0.72 * travel
      rotateZ += Math.sin(contact * Math.PI * 2) * 0.08 * travel
      scaleX += (crouch * 0.1 + landing * 0.18) * bodyMotion
      scaleY += (jump * 0.08 - crouch * 0.1 - landing * 0.15) * bodyMotion
      scaleZ += landing * 0.08 * bodyMotion
    } else if (activeAction === 'wash') {
      const brace = anticipation * (1 - contact)
      const scrub = Math.sin(contact * Math.PI * 6) * (1 - hold) * (1 - recovery)
      const shake = Math.sin(hold * Math.PI) * Math.sin(hold * Math.PI * 2)
      x = (scrub * 0.08 + shake * 0.15) * travel
      rotateZ += (brace * -0.08 + scrub * 0.14 + shake * 0.24) * travel
      scaleX += Math.abs(shake) * 0.07 * bodyMotion
      scaleY -= Math.abs(shake) * 0.05 * bodyMotion
    } else if (activeAction === 'rest') {
      const lower = poseWeight
      const exhale = Math.sin(contact * Math.PI)
      const sleepBreath = Math.sin(time * 1.25) * (1 - recovery)
      const wakeStretch = Math.sin(recovery * Math.PI)
      y += (-lower * 0.3 - exhale * 0.04 + wakeStretch * 0.09) * travel
      rotateZ -= lower * 0.13 * bodyMotion
      scaleX += (lower * 0.13 + sleepBreath * 0.018) * bodyMotion
      scaleY += (-lower * 0.17 + sleepBreath * 0.012 + wakeStretch * 0.08) * bodyMotion
    } else if (activeAction === 'cuddle') {
      const embrace = contact * (1 - recovery)
      const heartBeat = Math.sin(hold * Math.PI * 3) * (1 - recovery)
      y -= embrace * 0.07 * travel
      rotateX = embrace * 0.13 * bodyMotion
      scaleX += (embrace * 0.16 + Math.abs(heartBeat) * 0.025) * bodyMotion
      scaleY -= embrace * 0.11 * bodyMotion
      scaleZ += embrace * 0.1 * bodyMotion
    } else if (activeAction === 'explore') {
      const step = Math.sin(contact * Math.PI * 4) * (1 - hold) * (1 - recovery)
      const footLift = Math.abs(Math.sin(contact * Math.PI * 2)) * (1 - hold)
      exploreScan = -0.38 * smoothRange(hold, 0, 0.28)
        + 0.72 * smoothRange(hold, 0.48, 0.72)
        - 0.34 * smoothRange(hold, 0.82, 1)
      x = (poseWeight * 0.13 + step * 0.08) * travel
      y += footLift * 0.11 * travel
      rotateY = exploreScan * travel
      rotateZ += (step * 0.09 - anticipation * (1 - contact) * 0.11) * travel
    } else {
      const bounce = Math.sin((1 - pulse.current) * Math.PI) * pulse.current * 0.18
      scaleX += bounce
      scaleY += bounce
      scaleZ += bounce
    }

    rig.current.position.x = THREE.MathUtils.damp(rig.current.position.x, x, 13, delta)
    rig.current.position.y = THREE.MathUtils.damp(rig.current.position.y, y, 13, delta)
    rig.current.position.z = THREE.MathUtils.damp(rig.current.position.z, 0, 13, delta)
    rig.current.rotation.x = THREE.MathUtils.damp(rig.current.rotation.x, rotateX, 13, delta)
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, rotateY, 13, delta)
    rig.current.rotation.z = THREE.MathUtils.damp(rig.current.rotation.z, rotateZ, 13, delta)
    rig.current.scale.x = THREE.MathUtils.damp(rig.current.scale.x, scaleX, 13, delta)
    rig.current.scale.y = THREE.MathUtils.damp(rig.current.scale.y, scaleY, 13, delta)
    rig.current.scale.z = THREE.MathUtils.damp(rig.current.scale.z, scaleZ, 13, delta)

    const idleArms = ARM_POSES.idle
    const actionArms = activeAction ? ARM_POSES[activeAction] : idleArms
    let leftArmX = THREE.MathUtils.lerp(idleArms.left[0], actionArms.left[0], poseWeight)
    let leftArmY = THREE.MathUtils.lerp(idleArms.left[1], actionArms.left[1], poseWeight)
    let leftArmZ = THREE.MathUtils.lerp(idleArms.left[2], actionArms.left[2], poseWeight)
    let rightArmX = THREE.MathUtils.lerp(idleArms.right[0], actionArms.right[0], poseWeight)
    let rightArmY = THREE.MathUtils.lerp(idleArms.right[1], actionArms.right[1], poseWeight)
    let rightArmZ = THREE.MathUtils.lerp(idleArms.right[2], actionArms.right[2], poseWeight)
    let leftArmRotation = THREE.MathUtils.lerp(idleArms.leftRotation, actionArms.leftRotation, poseWeight)
    let rightArmRotation = THREE.MathUtils.lerp(idleArms.rightRotation, actionArms.rightRotation, poseWeight)

    if (activeAction === 'cuddle') {
      const open = anticipation * (1 - contact)
      const close = contact * (1 - recovery)
      leftArmX = THREE.MathUtils.lerp(idleArms.left[0], -0.82, open)
      leftArmY = THREE.MathUtils.lerp(idleArms.left[1], 0.22, open)
      leftArmZ = THREE.MathUtils.lerp(idleArms.left[2], 0.42, open)
      rightArmX = THREE.MathUtils.lerp(idleArms.right[0], 0.82, open)
      rightArmY = THREE.MathUtils.lerp(idleArms.right[1], 0.22, open)
      rightArmZ = THREE.MathUtils.lerp(idleArms.right[2], 0.42, open)
      leftArmRotation = THREE.MathUtils.lerp(idleArms.leftRotation, 1.08, open)
      rightArmRotation = THREE.MathUtils.lerp(idleArms.rightRotation, -1.08, open)
      leftArmX = THREE.MathUtils.lerp(leftArmX, actionArms.left[0], close)
      leftArmY = THREE.MathUtils.lerp(leftArmY, actionArms.left[1], close)
      leftArmZ = THREE.MathUtils.lerp(leftArmZ, actionArms.left[2], close)
      rightArmX = THREE.MathUtils.lerp(rightArmX, actionArms.right[0], close)
      rightArmY = THREE.MathUtils.lerp(rightArmY, actionArms.right[1], close)
      rightArmZ = THREE.MathUtils.lerp(rightArmZ, actionArms.right[2], close)
      leftArmRotation = THREE.MathUtils.lerp(leftArmRotation, actionArms.leftRotation, close)
      rightArmRotation = THREE.MathUtils.lerp(rightArmRotation, actionArms.rightRotation, close)
    } else if (activeAction === 'wash') {
      const scrub = Math.sin(contact * Math.PI * 6) * (1 - hold) * (1 - recovery)
      leftArmY += scrub * 0.12
      rightArmY -= scrub * 0.12
      leftArmRotation += scrub * 0.18
      rightArmRotation += scrub * 0.18
    } else if (activeAction === 'explore') {
      const step = Math.sin(contact * Math.PI * 4) * (1 - hold) * (1 - recovery)
      leftArmY += step * 0.13
      rightArmY -= step * 0.13
      leftArmRotation += step * 0.25
      rightArmRotation += step * 0.25
    } else if (activeAction === 'rest') {
      const wakeStretch = Math.sin(recovery * Math.PI)
      leftArmY += wakeStretch * 0.48
      rightArmY += wakeStretch * 0.48
      leftArmRotation += wakeStretch * 1.28
      rightArmRotation -= wakeStretch * 1.28
    } else if (activeAction === 'feed') {
      const chew = Math.sin(contact * Math.PI * 6) * (1 - hold * 0.7) * (1 - recovery)
      leftArmY += chew * 0.035
      rightArmY -= chew * 0.035
    }

    if (leftArm.current && rightArm.current) {
      leftArm.current.position.x = THREE.MathUtils.damp(leftArm.current.position.x, leftArmX, 15, delta)
      leftArm.current.position.y = THREE.MathUtils.damp(leftArm.current.position.y, leftArmY, 15, delta)
      leftArm.current.position.z = THREE.MathUtils.damp(leftArm.current.position.z, leftArmZ, 15, delta)
      leftArm.current.rotation.z = THREE.MathUtils.damp(leftArm.current.rotation.z, leftArmRotation, 15, delta)
      rightArm.current.position.x = THREE.MathUtils.damp(rightArm.current.position.x, rightArmX, 15, delta)
      rightArm.current.position.y = THREE.MathUtils.damp(rightArm.current.position.y, rightArmY, 15, delta)
      rightArm.current.position.z = THREE.MathUtils.damp(rightArm.current.position.z, rightArmZ, 15, delta)
      rightArm.current.rotation.z = THREE.MathUtils.damp(rightArm.current.rotation.z, rightArmRotation, 15, delta)
    }

    let leftFootY = -0.62
    let rightFootY = -0.62
    let leftFootRotation = 0
    let rightFootRotation = 0
    if (activeAction === 'explore') {
      const stride = Math.sin(contact * Math.PI * 4) * (1 - hold) * (1 - recovery)
      leftFootY += Math.max(0, stride) * 0.12 * travel
      rightFootY += Math.max(0, -stride) * 0.12 * travel
      leftFootRotation = -stride * 0.22 * travel
      rightFootRotation = -stride * 0.22 * travel
    } else if (activeAction === 'play') {
      const crouch = anticipation * (1 - contact)
      const jump = Math.sin(contact * Math.PI)
      leftFootY -= crouch * 0.06 * bodyMotion
      rightFootY -= crouch * 0.06 * bodyMotion
      leftFootRotation = (-crouch * 0.16 + jump * 0.22) * bodyMotion
      rightFootRotation = (crouch * 0.16 - jump * 0.22) * bodyMotion
    } else if (activeAction === 'rest') {
      leftFootY -= poseWeight * 0.04 * bodyMotion
      rightFootY -= poseWeight * 0.04 * bodyMotion
      leftFootRotation = poseWeight * 0.16 * bodyMotion
      rightFootRotation = -poseWeight * 0.16 * bodyMotion
    } else if (activeAction === 'wash') {
      const shake = Math.sin(hold * Math.PI) * Math.sin(hold * Math.PI * 2)
      leftFootRotation = shake * 0.18 * travel
      rightFootRotation = shake * 0.18 * travel
    }
    if (leftFoot.current && rightFoot.current) {
      leftFoot.current.position.y = THREE.MathUtils.damp(leftFoot.current.position.y, leftFootY, 16, delta)
      rightFoot.current.position.y = THREE.MathUtils.damp(rightFoot.current.position.y, rightFootY, 16, delta)
      leftFoot.current.rotation.z = THREE.MathUtils.damp(leftFoot.current.rotation.z, leftFootRotation, 16, delta)
      rightFoot.current.rotation.z = THREE.MathUtils.damp(rightFoot.current.rotation.z, rightFootRotation, 16, delta)
    }

    const restingEye = mood === 'sleepy' || mood === 'unwell' ? 0.12 : mood === 'grumpy' ? 0.72 : mood === 'radiant' ? 1.16 : 1
    const naturalBlink = !activeAction && restingEye > 0.2 && Math.sin(time * 0.79) + Math.sin(time * 0.31 + 0.7) > 1.82
    let eyeTarget = naturalBlink ? 0.08 : restingEye
    let gazeX = attention * attentionDirection * 0.035
    let gazeY = attention * 0.012
    if (activeAction === 'rest') eyeTarget = THREE.MathUtils.lerp(restingEye, 0.1, contact * (1 - recovery))
    else if (activeAction === 'cuddle') eyeTarget = THREE.MathUtils.lerp(restingEye, 0.1, contact * (1 - recovery))
    else if (activeAction === 'feed') {
      eyeTarget = 0.52 + Math.abs(Math.sin(contact * Math.PI * 6)) * 0.12 * (1 - hold)
      gazeX = 0.018 * poseWeight
      gazeY = -0.018 * poseWeight
    } else if (activeAction === 'wash') eyeTarget = 0.28 + Math.abs(Math.sin(contact * Math.PI * 6)) * 0.48 * (1 - hold)
    else if (activeAction === 'play') {
      eyeTarget = 1.24
      gazeY = Math.sin(contact * Math.PI) * 0.045
    } else if (activeAction === 'explore') {
      eyeTarget = 1.08
      gazeX = exploreScan * 0.065
      gazeY = 0.012 * poseWeight
    }
    if (leftEye.current && rightEye.current) {
      leftEye.current.scale.y = THREE.MathUtils.damp(leftEye.current.scale.y, eyeTarget, 18, delta)
      rightEye.current.scale.y = THREE.MathUtils.damp(rightEye.current.scale.y, eyeTarget, 18, delta)
      leftEye.current.position.x = THREE.MathUtils.damp(leftEye.current.position.x, -0.27 + gazeX, 16, delta)
      rightEye.current.position.x = THREE.MathUtils.damp(rightEye.current.position.x, 0.27 + gazeX, 16, delta)
      leftEye.current.position.y = THREE.MathUtils.damp(leftEye.current.position.y, 0.25 + gazeY, 16, delta)
      rightEye.current.position.y = THREE.MathUtils.damp(rightEye.current.position.y, 0.25 + gazeY, 16, delta)
    }

  })


  return (
    <group
      position={[0, 0, 0.4]}
      onClick={(event) => { event.stopPropagation(); onPlay() }}
      onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
      onPointerLeave={() => { document.body.style.cursor = 'default' }}
    >
      <group ref={rig}>
        {character === 'block' ? (
          /* 方跃：一个连续剪影（不对称阶梯顶 + 双手 + 双腿中缺口，直角 Shape+Extrude） */
          <>
            <mesh castShadow position={[0, 0.05, 0]}>
              <extrudeGeometry args={[BLOCK_SHAPE, { depth: 0.5, bevelEnabled: false }]} />
              <meshStandardMaterial color="#f0552d" roughness={0.58} />
            </mesh>
            {/* 阶梯顶的暗一档描边层（同轮廓略小，做出像素台阶层次） */}
            <mesh position={[0, 0.05, 0.26]} scale={0.995}>
              <extrudeGeometry args={[BLOCK_SHAPE, { depth: 0.02, bevelEnabled: false }]} />
              <meshStandardMaterial color="#c43c1a" roughness={0.6} />
            </mesh>
            {/* 手尖 / 脚尖的小关节球（同色，属剪影一部分，保留可动动画） */}
            <mesh ref={leftArm} castShadow position={[-0.82, -0.16, 0.1]} scale={[0.9, 0.9, 0.9]}>
              <sphereGeometry args={[0.16, 12, 10]} />
              <meshStandardMaterial color="#f0552d" roughness={0.58} />
            </mesh>
            <mesh ref={rightArm} castShadow position={[0.82, -0.16, 0.1]} scale={[0.9, 0.9, 0.9]}>
              <sphereGeometry args={[0.16, 12, 10]} />
              <meshStandardMaterial color="#f0552d" roughness={0.58} />
            </mesh>
            <mesh ref={leftFoot} castShadow position={[-0.4, -0.92, 0.08]} scale={[1.05, 0.72, 1.05]}>
              <sphereGeometry args={[0.15, 12, 10]} />
              <meshStandardMaterial color="#c43c1a" roughness={0.6} />
            </mesh>
            <mesh ref={rightFoot} castShadow position={[0.4, -0.92, 0.08]} scale={[1.05, 0.72, 1.05]}>
              <sphereGeometry args={[0.15, 12, 10]} />
              <meshStandardMaterial color="#c43c1a" roughness={0.6} />
            </mesh>
            {/* 两只清晰的黑色方眼（身体正面最外层） */}
            <mesh ref={leftEye} position={[-0.3, 0.18, 0.52]} scale={[1, 1, 0.55]}>
              <boxGeometry args={[0.19, 0.21, 0.1]} />
              <meshStandardMaterial color="#20140f" roughness={0.3} />
            </mesh>
            <mesh ref={rightEye} position={[0.3, 0.18, 0.52]} scale={[1, 1, 0.55]}>
              <boxGeometry args={[0.19, 0.21, 0.1]} />
              <meshStandardMaterial color="#20140f" roughness={0.3} />
            </mesh>
          </>
        ) : (
          /* 星跃：一个连续轮廓（顶部单圆尖 → 双侧圆尖手 → 双腿 → 底中上凹） */
          <>
            <mesh castShadow position={[0, 0.08, 0]}>
              <extrudeGeometry args={[STAR_SHAPE, STAR_EXTRUDE_OPTIONS]} />
              <meshStandardMaterial color="#f8bd4a" roughness={0.42} />
            </mesh>
            {/* 中央红橙渐变（内嵌小红星 + 自发光；缩小后移，不侵占眼睛空间） */}
            <mesh position={[0, 0.02, 0.14]} scale={0.56}>
              <sphereGeometry args={[0.78, 28, 20]} />
              <meshStandardMaterial color="#e8642a" roughness={0.5} emissive="#b2320e" emissiveIntensity={0.4} />
            </mesh>
            {/* 手尖 / 脚尖关节球（同色，属剪影一部分） */}
            <mesh ref={leftArm} castShadow position={[-0.9, -0.06, 0.08]} scale={[0.95, 0.95, 0.95]}>
              <sphereGeometry args={[0.17, 14, 10]} />
              <meshStandardMaterial color="#f8bd4a" roughness={0.44} />
            </mesh>
            <mesh ref={rightArm} castShadow position={[0.9, -0.06, 0.08]} scale={[0.95, 0.95, 0.95]}>
              <sphereGeometry args={[0.17, 14, 10]} />
              <meshStandardMaterial color="#f8bd4a" roughness={0.44} />
            </mesh>
            <mesh ref={leftFoot} castShadow position={[-0.36, -0.98, 0.08]} scale={[1.05, 0.78, 1.05]}>
              <sphereGeometry args={[0.18, 14, 10]} />
              <meshStandardMaterial color="#f7b32b" roughness={0.48} />
            </mesh>
            <mesh ref={rightFoot} castShadow position={[0.36, -0.98, 0.08]} scale={[1.05, 0.78, 1.05]}>
              <sphereGeometry args={[0.18, 14, 10]} />
              <meshStandardMaterial color="#f7b32b" roughness={0.48} />
            </mesh>
            {/* 两根白色竖眼（深色背衬 + 白色竖条；z 在 extrude 前表面 0.66 之前，不被埋） */}
            <mesh position={[-0.26, 0.42, 0.7]} scale={[1.05, 1, 0.5]}>
              <boxGeometry args={[0.14, 0.4, 0.08]} />
              <meshStandardMaterial color="#3a1f10" roughness={0.4} />
            </mesh>
            <mesh position={[0.26, 0.42, 0.7]} scale={[1.05, 1, 0.5]}>
              <boxGeometry args={[0.14, 0.4, 0.08]} />
              <meshStandardMaterial color="#3a1f10" roughness={0.4} />
            </mesh>
            <mesh ref={leftEye} position={[-0.26, 0.42, 0.77]} scale={[1, 1, 0.55]}>
              <capsuleGeometry args={[0.055, 0.22, 4, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh ref={rightEye} position={[0.26, 0.42, 0.77]} scale={[1, 1, 0.55]}>
              <capsuleGeometry args={[0.055, 0.22, 4, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </>
        )}
        {growthStage !== 'seedling' && (
          <mesh position={[0, 0.17, -0.73]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[growthStage === 'luminary' ? 0.62 : 0.5, 0.035, 8, 28]} />
            <meshStandardMaterial color="#fff0a8" emissive="#ffe59a" emissiveIntensity={growthStage === 'luminary' ? 0.45 : 0.15} />
          </mesh>
        )}
        {headphones && <Headphones character={character} reducedMotion={reducedMotion} />}
      <Wearable itemId={wearableId} />
      </group>
      {activeAction && (
        <group scale={1.35} position={[0, -0.08, 0.05]}>
          <ActionEffects key={`${activeAction}-${actionNonce}`} action={activeAction} color={effectColor} reducedMotion={reducedMotion} />
        </group>
      )}
    </group>
  )
}


function ThemeDecor({ theme }: { theme: ThemeDefinition }) {
  if (theme.id === 'cyber') {
    return (
      <group position={[0, -0.7, -1.25]}>
        {[-2.2, -1.45, 1.45, 2.2].map((x, index) => (
          <RoundedBox key={x} args={[0.38, 1 + index % 2 * 0.45, 0.35]} radius={0.06} position={[x, 0, 0]}>
            <meshStandardMaterial color={theme.shellDark} emissive={theme.glow} emissiveIntensity={0.55} />
          </RoundedBox>
        ))}
      </group>
    )
  }
  if (theme.id === 'moss') {
    return (
      <group position={[0, -0.78, -1]}>
        {[-2, -1.45, 1.55, 2.1].map((x, index) => (
          <group key={x} position={[x, 0, index % 2 * 0.2]} scale={0.7 + index * 0.08}>
            <mesh castShadow><cylinderGeometry args={[0.08, 0.12, 0.55, 8]} /><meshStandardMaterial color="#f2dfb5" /></mesh>
            <mesh castShadow position={[0, 0.3, 0]}><sphereGeometry args={[0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={index % 2 ? '#d6755f' : theme.accent} /></mesh>
          </group>
        ))}
      </group>
    )
  }
  if (theme.id === 'moon') {
    return (
      <group position={[1.9, 1.1, -1.4]}>
        <mesh><sphereGeometry args={[0.62, 24, 18]} /><meshStandardMaterial color={theme.glow} emissive={theme.glow} emissiveIntensity={0.35} roughness={0.9} /></mesh>
        <mesh rotation={[Math.PI / 2.8, 0.2, 0]}><torusGeometry args={[0.85, 0.06, 10, 36]} /><meshStandardMaterial color={theme.accent} /></mesh>
      </group>
    )
  }
  return (
    <group position={[-1.9, -0.5, -1.2]}>
      <mesh castShadow position={[0, 0.55, 0]}><cylinderGeometry args={[0.13, 0.2, 1.5, 8]} /><meshStandardMaterial color="#6e4d3c" /></mesh>
      {[[0, 1.35], [-0.45, 1.05], [0.42, 1.05], [-0.22, 1.62], [0.28, 1.58]].map(([x, y], index) => (
        <mesh castShadow key={index} position={[x, y, 0]}><sphereGeometry args={[0.37, 14, 10]} /><meshStandardMaterial color={index % 2 ? '#ff9ca4' : '#ffc5bd'} /></mesh>
      ))}
    </group>
  )
}

interface WorldProps {
  theme: ThemeDefinition
  mood: PetMood
  character: CharacterId
  headphones: boolean
  lastAction: ActionSignal
  actionNonce: number
  reducedMotion: boolean
  compact: boolean
  personality: PersonalityId
  growthStage: GrowthStageId
  incidentId: IncidentId | null
  wearableId: KeepsakeId | null
  roomItemId: KeepsakeId | null
  onPlay: () => void
}

interface PetSceneProps extends WorldProps {
  active: boolean
}

function World({ theme, mood, lastAction, actionNonce, reducedMotion, compact, personality, growthStage, incidentId, wearableId, roomItemId, character, headphones, onPlay }: WorldProps) {
  const shadowSize = compact ? 512 : 1024

  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.sky, 8, 16]} />
      <hemisphereLight args={[theme.glow, theme.ground, 1.8]} />
      <directionalLight castShadow position={[3, 6, 4]} intensity={2.2} color={theme.glow} shadow-mapSize={[shadowSize, shadowSize]} />
      <pointLight position={[-3, 1.8, 2]} intensity={12} distance={7} color={theme.particle} />
      <mesh receiveShadow position={[0, -1.05, -0.1]}>
        <cylinderGeometry args={[3.8, 3.35, 0.38, 48]} />
        <meshStandardMaterial color={theme.ground} roughness={0.86} />
      </mesh>
      <RoundedBox args={[6.8, 4.1, 0.28]} radius={0.5} position={[0, 0.45, -2.1]}>
        <meshStandardMaterial color={theme.screen} roughness={0.9} />
      </RoundedBox>
      <ThemeDecor theme={theme} />
      <RoomKeepsake itemId={roomItemId} accent={theme.accent} />
      <IncidentSignal incidentId={incidentId} />
      <Pet
        mood={mood}
        character={character}
        headphones={headphones}
        effectColor={theme.particle}
        lastAction={lastAction}
        actionNonce={actionNonce}
        reducedMotion={reducedMotion}
        personality={personality}
        growthStage={growthStage}
        wearableId={wearableId}
        onPlay={onPlay}
      />
      <Sparkles count={reducedMotion ? 10 : compact ? 18 : 34} scale={[6.4, 3.4, 3]} size={2.2} speed={reducedMotion ? 0 : 0.35} color={theme.particle} />
      <ContactShadows position={[0, -1.03, 0.4]} opacity={0.32} scale={5} blur={2.4} far={3.5} resolution={compact ? 256 : 512} />
    </>
  )
}

export function PetScene({ active, compact, ...worldProps }: PetSceneProps) {
  return (
    <Canvas
      shadows="soft"
      frameloop={active ? 'always' : 'never'}
      dpr={compact ? [1, 1.35] : [1, 1.75]}
      camera={{ position: [0, 1.05, 7.4], fov: 38, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: false, powerPreference: compact ? 'low-power' : 'high-performance' }}
      fallback={<div className="webgl-fallback">3D 画面暂不可用，养成进度仍会保存。</div>}
    >
      <World {...worldProps} compact={compact} />
    </Canvas>
  )
}
