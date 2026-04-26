import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const STATE = { IDLE: 'IDLE', PHASE1: 'PHASE1', HOLD: 'HOLD', PHASE2: 'PHASE2' }

function getAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const dot = ba.x * bc.x + ba.y * bc.y
  const mag = Math.sqrt(ba.x ** 2 + ba.y ** 2) * Math.sqrt(bc.x ** 2 + bc.y ** 2)
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * (180 / Math.PI)
}

// Per-exercise config: how to get the primary angle and when to detect a rep
const EXERCISE_CONFIG = {
  squat: {
    getPrimaryAngle: (lm) => getAngle(lm[23], lm[25], lm[27]),
    getSecondaryAngle: (lm) => getAngle(lm[11], lm[23], lm[25]),
    startAngle: 170,      // standing — above this = IDLE
    phase1Threshold: 150, // start descending
    holdThreshold: 90,    // bottom of squat
    completeAngle: 158,   // back to standing
    angleLabel: 'Knee',
    cues: {
      ready: 'Ready — perform a squat',
      phase1: 'Descending — keep going',
      hold: 'Good depth! Hold briefly...',
      phase2: 'Ascending — push through!',
      done: (n, s) => `Rep ${n} done! Form: ${s}%`,
    },
  },
  bicep_curl: {
    getPrimaryAngle: (lm) => getAngle(lm[11], lm[13], lm[15]),
    getSecondaryAngle: () => 90,
    startAngle: 160,
    phase1Threshold: 150, // start curling
    holdThreshold: 55,    // fully curled
    completeAngle: 155,   // arm extended
    angleLabel: 'Elbow',
    cues: {
      ready: 'Ready — perform a bicep curl',
      phase1: 'Curling up — keep it controlled',
      hold: 'Full contraction! Hold...',
      phase2: 'Lowering — control the descent',
      done: (n, s) => `Rep ${n} done! Form: ${s}%`,
    },
  },
  shoulder_flexion: {
    getPrimaryAngle: (lm) => getAngle(lm[23], lm[11], lm[13]),
    getSecondaryAngle: () => 90,
    startAngle: 165,
    phase1Threshold: 158, // arm starts rising
    holdThreshold: 85,    // arm at ~90°
    completeAngle: 158,   // arm back at side
    angleLabel: 'Shoulder',
    cues: {
      ready: 'Ready — raise your arm forward',
      phase1: 'Raising arm — slow and steady',
      hold: 'Hold at 90° — good control!',
      phase2: 'Lowering — resist gravity',
      done: (n, s) => `Rep ${n} done! Form: ${s}%`,
    },
  },
}

// ── Mock skeleton ──────────────────────────────────────────────────────────
const MOCK_CONNECTIONS = [
  ['nose', 'leftShoulder'], ['nose', 'rightShoulder'],
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
]

function getMockJoints(phase, exerciseType) {
  if (exerciseType === 'bicep_curl') {
    const curl = phase
    return {
      nose: [320, 50],
      leftShoulder: [272, 165], rightShoulder: [368, 165],
      leftElbow: [238, 252], rightElbow: [402, 252],
      leftWrist:  [220 + curl * 22, 335 - curl * 115],
      rightWrist: [420 - curl * 22, 335 - curl * 115],
      leftHip: [280, 316], rightHip: [360, 316],
      leftKnee: [268, 390], rightKnee: [372, 390],
      leftAnkle: [260, 440], rightAnkle: [380, 440],
    }
  }
  if (exerciseType === 'shoulder_flexion') {
    const raise = phase
    return {
      nose: [320, 50],
      leftShoulder: [272, 165], rightShoulder: [368, 165],
      leftElbow:  [272 - raise * 28, 252 - raise * 120],
      rightElbow: [402, 252],
      leftWrist:  [265 - raise * 40, 338 - raise * 200],
      rightWrist: [420, 338],
      leftHip: [280, 316], rightHip: [360, 316],
      leftKnee: [268, 390], rightKnee: [372, 390],
      leftAnkle: [260, 440], rightAnkle: [380, 440],
    }
  }
  // squat (default)
  const kY = 0.60 + phase * 0.14
  return {
    nose: [320, 50],
    leftShoulder: [272, 165], rightShoulder: [368, 165],
    leftElbow: [238, 248], rightElbow: [402, 248],
    leftWrist: [220, 330], rightWrist: [420, 330],
    leftHip: [280, 316], rightHip: [360, 316],
    leftKnee: [264, kY * 480], rightKnee: [376, kY * 480],
    leftAnkle: [256, 422], rightAnkle: [384, 422],
  }
}

// Which joints to highlight for each exercise
const ACTIVE_BONES = {
  squat:            (a, b) => a.includes('Knee') || b.includes('Knee') || a.includes('Hip') || b.includes('Hip'),
  bicep_curl:       (a, b) => a.includes('Elbow') || b.includes('Elbow') || a.includes('Wrist') || b.includes('Wrist'),
  shoulder_flexion: (a, b) => a.includes('Shoulder') || b.includes('Shoulder') || a.includes('Elbow') || b.includes('Elbow'),
}

// ── Component ──────────────────────────────────────────────────────────────
export default function PoseCamera({ patient, sessionId, onRep, mockMode = false, exerciseType = 'squat' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const repStateRef = useRef(STATE.IDLE)
  const repCountRef = useRef(0)
  const angleHistoryRef = useRef([])
  const repAnglesRef = useRef([])

  const [status, setStatus] = useState('Initializing...')
  const [currentAngle, setCurrentAngle] = useState(null)
  const [cameraError, setCameraError] = useState(false)

  const config = EXERCISE_CONFIG[exerciseType] ?? EXERCISE_CONFIG.squat
  const isActiveBone = ACTIVE_BONES[exerciseType] ?? ACTIVE_BONES.squat

  // Reset rep state when exercise type changes
  useEffect(() => {
    repStateRef.current = STATE.IDLE
    repAnglesRef.current = []
    angleHistoryRef.current = []
    setCurrentAngle(null)
  }, [exerciseType])

  // ── Mock mode ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mockMode) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 640
    canvas.height = 480

    let frame = 0
    let animId
    let mockRepState = 'idle'
    let mockRepCount = 0

    const animate = () => {
      frame++
      const t = frame / 60
      // 0→1→0 smooth cycle over ~4 seconds
      const phase = (Math.sin(t * 0.78 - Math.PI / 2) + 1) / 2
      const mockAngle = config.startAngle - phase * (config.startAngle - config.holdThreshold + 10)

      // Detect mock rep
      if (mockRepState === 'idle' && mockAngle < config.phase1Threshold) {
        mockRepState = 'phase1'
      } else if (mockRepState === 'phase1' && mockAngle <= config.holdThreshold + 5) {
        mockRepState = 'hold'
      } else if (mockRepState === 'hold' && mockAngle > config.holdThreshold + 10) {
        mockRepState = 'phase2'
      } else if (mockRepState === 'phase2' && mockAngle >= config.completeAngle) {
        mockRepState = 'idle'
        mockRepCount += 1
        const formScore = 72 + Math.floor(Math.random() * 22)
        onRep?.({
          rep_number: mockRepCount,
          set_number: 1,
          knee_angle: Math.round(mockAngle),
          hip_angle: 88,
          form_score: formScore,
          flags: '',
          exercise_name: exerciseType,
          target_min: patient?.target_angle_min ?? 70,
          target_max: patient?.target_angle_max ?? 170,
          session_id: sessionId,
          angleHistory: Array.from({ length: 12 }, (_, i) =>
            Math.round(config.startAngle - Math.sin((i / 11) * Math.PI) * (config.startAngle - config.holdThreshold))
          ),
        })
      }

      setCurrentAngle(Math.round(mockAngle))

      // Draw background
      ctx.fillStyle = '#0C0A09'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x < 640; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 480); ctx.stroke() }
      for (let y = 0; y < 480; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke() }

      const joints = getMockJoints(phase, exerciseType)
      const isMoving = mockRepState !== 'idle'

      // Bones
      MOCK_CONNECTIONS.forEach(([a, b]) => {
        const highlight = isActiveBone(a, b) && isMoving
        ctx.strokeStyle = highlight ? 'rgba(194, 82, 58, 0.85)' : 'rgba(250, 245, 238, 0.45)'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(joints[a][0], joints[a][1])
        ctx.lineTo(joints[b][0], joints[b][1])
        ctx.stroke()
      })

      // Joints
      Object.entries(joints).forEach(([name, [x, y]]) => {
        const highlight = isActiveBone(name, name) && isMoving
        ctx.beginPath()
        ctx.arc(x, y, highlight ? 7 : 4.5, 0, Math.PI * 2)
        ctx.fillStyle = highlight ? '#C2523A' : '#FF6B7A'
        ctx.fill()
      })

      // Angle label
      const anchor = exerciseType === 'bicep_curl' ? joints.leftElbow
        : exerciseType === 'shoulder_flexion' ? joints.leftShoulder
        : joints.leftKnee
      const [kx, ky] = anchor
      ctx.fillStyle = 'rgba(12, 10, 9, 0.75)'
      ctx.beginPath(); ctx.roundRect(kx + 12, ky - 22, 80, 24, 5); ctx.fill()
      ctx.fillStyle = '#FAF5EE'
      ctx.font = 'bold 13px Inter, system-ui'
      ctx.fillText(`${config.angleLabel} ${Math.round(mockAngle)}°`, kx + 17, ky - 4)

      animId = requestAnimationFrame(animate)
    }

    animate()
    setStatus(`Demo — ${exerciseType.replace('_', ' ')} simulation`)
    return () => cancelAnimationFrame(animId)
  }, [mockMode, exerciseType])

  // ── Real MediaPipe ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mockMode) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!window.Pose) { setStatus('MediaPipe failed to load — refresh the page.'); return }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })

    pose.onResults((results) => {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      if (!results.poseLandmarks) { setStatus('No body detected — step back so your full body is visible'); return }

      const lm = results.poseLandmarks
      const keyIndices = [11, 13, 15, 23, 25, 27]
      const lowConf = keyIndices.some(i => lm[i].visibility < 0.5)
      setStatus(lowConf ? "Move to better lighting — can't see your full body clearly" : config.cues.ready)

      window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: '#A0C0A3', lineWidth: 2.5 })
      window.drawLandmarks(ctx, lm, { color: '#FF6B7A', lineWidth: 1, radius: 4 })

      const primaryAngle = config.getPrimaryAngle(lm)
      const secondaryAngle = config.getSecondaryAngle(lm)
      setCurrentAngle(Math.round(primaryAngle))

      // Angle label on canvas
      const refLm = exerciseType === 'bicep_curl' ? lm[13]
        : exerciseType === 'shoulder_flexion' ? lm[11]
        : lm[25]
      const kx = refLm.x * canvas.width
      const ky = refLm.y * canvas.height
      ctx.fillStyle = 'rgba(12, 10, 9, 0.7)'
      ctx.beginPath(); ctx.roundRect(kx + 10, ky - 22, 84, 24, 5); ctx.fill()
      ctx.fillStyle = '#FAF5EE'
      ctx.font = 'bold 13px Inter, system-ui'
      ctx.fillText(`${config.angleLabel} ${Math.round(primaryAngle)}°`, kx + 14, ky - 4)

      // Smooth angle
      angleHistoryRef.current.push(primaryAngle)
      if (angleHistoryRef.current.length > 8) angleHistoryRef.current.shift()
      const smooth = angleHistoryRef.current.reduce((a, b) => a + b, 0) / angleHistoryRef.current.length

      const targetMin = patient?.target_angle_min ?? config.holdThreshold
      const targetMax = patient?.target_angle_max ?? config.startAngle
      const state = repStateRef.current

      if (state === STATE.IDLE && smooth < config.phase1Threshold) {
        repStateRef.current = STATE.PHASE1
        setStatus(config.cues.phase1)
        repAnglesRef.current = [Math.round(primaryAngle)]
      } else if (state === STATE.PHASE1 && smooth <= config.holdThreshold + 8) {
        repStateRef.current = STATE.HOLD
        setStatus(config.cues.hold)
        repAnglesRef.current.push(Math.round(primaryAngle))
      } else if (state === STATE.HOLD && smooth > config.holdThreshold + 12) {
        repStateRef.current = STATE.PHASE2
        setStatus(config.cues.phase2)
        repAnglesRef.current.push(Math.round(primaryAngle))
      } else if (state === STATE.PHASE2 && smooth >= config.completeAngle) {
        repStateRef.current = STATE.IDLE
        repCountRef.current += 1

        const depthDelta = smooth - targetMin
        const depthScore = depthDelta <= 0 ? 40 : Math.max(0, 40 - depthDelta * 1.2)
        const secDelta = Math.abs(secondaryAngle - 90)
        const alignScore = secDelta <= 20 ? 25 : Math.max(0, 25 - (secDelta - 20) * 0.8)
        const formScore = Math.min(100, Math.round(depthScore + alignScore + 35))

        const flags = []
        if (depthDelta > 20) flags.push('insufficient_depth')
        if (secDelta > 30) flags.push('alignment_issue')

        setStatus(config.cues.done(repCountRef.current, formScore))

        onRep?.({
          rep_number: repCountRef.current,
          set_number: 1,
          knee_angle: Math.round(primaryAngle),
          hip_angle: Math.round(secondaryAngle),
          form_score: formScore,
          flags: flags.join(','),
          exercise_name: exerciseType,
          target_min: targetMin,
          target_max: targetMax,
          session_id: sessionId,
          angleHistory: [...repAnglesRef.current],
        })
        repAnglesRef.current = []
      } else if ([STATE.PHASE1, STATE.HOLD, STATE.PHASE2].includes(state)) {
        repAnglesRef.current.push(Math.round(primaryAngle))
      }
    })

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then((stream) => {
        video.srcObject = stream
        video.play()
        setStatus('Camera ready — stand back so your full body is visible')
        const camera = new window.Camera(video, {
          onFrame: async () => { await pose.send({ image: video }) },
          width: 640, height: 480,
        })
        camera.start()
      })
      .catch(() => { setCameraError(true); setStatus('Camera access denied.') })

    return () => {
      pose.close()
      if (video?.srcObject) video.srcObject.getTracks().forEach(t => t.stop())
    }
  }, [mockMode, exerciseType])

  if (cameraError && !mockMode) {
    return (
      <div className="w-full bg-white rounded-3xl shadow-soft p-10 text-center border border-danger-light">
        <p className="text-danger font-semibold text-xl mb-2">Camera access denied</p>
        <p className="text-charcoal-300 text-base leading-relaxed">
          Allow camera access in your browser settings, then refresh.<br />
          Or switch to Demo Mode to preview the UI.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-card bg-charcoal-600">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full block" style={{ transform: 'scaleX(-1)' }} />

      {/* Status — bottom */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="glass-dark text-canvas-50 px-4 py-2 rounded-full text-sm font-medium max-w-[65%]">
          {status}
        </div>
        {currentAngle !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-dark text-canvas-50 px-4 py-2 rounded-full text-sm font-bold"
          >
            {config.angleLabel} {currentAngle}°
          </motion.div>
        )}
      </div>

      {/* LIVE badge — top left */}
      <div className="absolute top-4 left-4 flex items-center gap-2 glass-dark px-3 py-1.5 rounded-full">
        <motion.div
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-2 h-2 rounded-full bg-terra-400"
        />
        <span className="text-canvas-50 text-xs font-semibold uppercase tracking-wider">
          {mockMode ? 'Demo' : 'Live'}
        </span>
      </div>
    </div>
  )
}
