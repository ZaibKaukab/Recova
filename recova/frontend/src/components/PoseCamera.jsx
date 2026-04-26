import { useEffect, useRef, useState } from 'react'

// Globals from MediaPipe CDN in index.html:
// window.Pose, window.Camera, window.drawConnectors,
// window.drawLandmarks, window.POSE_CONNECTIONS

// ─────────────────────────────────────────────────────────────────────────────
// Exercise configuration map
// leftJoints / rightJoints: [proximal, vertex, distal] landmark indices
// trackMin: true → record lowest angle (squat, bicep_curl)
//           false → record highest angle (shoulder_flexion)
// ─────────────────────────────────────────────────────────────────────────────
const EXERCISE_CONFIGS = {
  squat: {
    leftJoints:  [23, 25, 27],   // hip, knee, ankle
    rightJoints: [24, 26, 28],
    angleLabel:  'KNEE',
    angleKey:    'knee_angle',
    trackMin:    true,
    stateLabels: { IDLE: 'IDLE', DESCENDING: 'DESCENDING', HOLD: 'HOLD', ASCENDING: 'ASCENDING' },
    audio:       { start: 'Going down', hold: 'Good, hold it', return: 'Push back up' },
  },
  shoulder_flexion: {
    leftJoints:  [23, 11, 13],   // hip, shoulder, elbow  (shoulder is vertex)
    rightJoints: [24, 12, 14],
    angleLabel:  'SHOULDER',
    angleKey:    'shoulder_angle',
    trackMin:    false,           // record peak (highest) angle
    stateLabels: { IDLE: 'IDLE', DESCENDING: 'LIFTING', HOLD: 'HOLD', ASCENDING: 'LOWERING' },
    audio:       { start: 'Lift your arm', hold: 'Hold it there', return: 'Lower slowly' },
  },
  bicep_curl: {
    leftJoints:  [11, 13, 15],   // shoulder, elbow, wrist  (elbow is vertex)
    rightJoints: [12, 14, 16],
    angleLabel:  'ELBOW',
    angleKey:    'elbow_angle',
    trackMin:    true,
    stateLabels: { IDLE: 'IDLE', DESCENDING: 'CURLING', HOLD: 'HOLD', ASCENDING: 'LOWERING' },
    audio:       { start: 'Curl up', hold: 'Hold it', return: 'Lower slowly' },
  },
}

const STATE = { IDLE: 'IDLE', DESCENDING: 'DESCENDING', HOLD: 'HOLD', ASCENDING: 'ASCENDING' }

const STATE_COLOR = {
  IDLE: '#6B7280',
  DESCENDING: '#14B8A6',
  HOLD: '#14B8A6',
  ASCENDING: '#F97316',
}

function getAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const dot = ba.x * bc.x + ba.y * bc.y
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2)
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2)
  return Math.acos(Math.min(1, Math.max(-1, dot / (magBA * magBC)))) * (180 / Math.PI)
}

function avgVis(lm, indices) {
  return indices.reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0) / indices.length
}

// All text on a CSS-mirrored canvas comes out backwards.
// counter-transform undoes scaleX(-1) so text draws readable at visual coords.
function withCounterMirror(ctx, canvas, fn) {
  ctx.save()
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  fn()
  ctx.restore()
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function repStateColor(displayLabel) {
  if (['IDLE'].includes(displayLabel)) return 'IDLE'
  if (['DESCENDING', 'LIFTING', 'CURLING'].includes(displayLabel)) return 'DESCENDING'
  if (['HOLD'].includes(displayLabel)) return 'HOLD'
  if (['ASCENDING', 'LOWERING'].includes(displayLabel)) return 'ASCENDING'
  return 'IDLE'
}

function drawCanvasHUD(ctx, canvas, angle, stateLabel, repCount, angleLabel) {
  withCounterMirror(ctx, canvas, () => {
    const stateColor = STATE_COLOR[repStateColor(stateLabel)] ?? '#6B7280'
    const pad = 14

    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    drawRoundRect(ctx, pad, pad, 200, 68, 10)
    ctx.fill()
    ctx.fillStyle = stateColor
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillText(stateLabel, pad + 12, pad + 22)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 32px system-ui, sans-serif'
    ctx.fillText(`${Math.round(angle)}°`, pad + 12, pad + 58)
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText(angleLabel, pad + 80, pad + 58)

    const repLabel = `REPS  ${repCount}`
    ctx.font = 'bold 15px system-ui, sans-serif'
    const tw = ctx.measureText(repLabel).width
    const rx = canvas.width - pad - tw - 20
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    drawRoundRect(ctx, rx - 8, pad, tw + 16, 34, 8)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(repLabel, rx, pad + 23)
  })
}

function drawAngleAtKnee(ctx, canvas, vertexLandmark, angle) {
  withCounterMirror(ctx, canvas, () => {
    const kx = (1 - vertexLandmark.x) * canvas.width
    const ky = vertexLandmark.y * canvas.height
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    drawRoundRect(ctx, kx + 14, ky - 24, 56, 22, 5)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.fillText(`${Math.round(angle)}°`, kx + 18, ky - 7)
  })
}

function drawWarningOnCanvas(ctx, canvas, message) {
  withCounterMirror(ctx, canvas, () => {
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    drawRoundRect(ctx, cx - 230, cy - 30, 460, 60, 12)
    ctx.fill()
    ctx.fillStyle = '#FBBF24'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚠  ' + message, cx, cy + 7)
    ctx.textAlign = 'left'
  })
}

const speak = (text) => {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const macVoice = voices.find(v =>
    v.name === 'Samantha' ||
    v.name === 'Daniel' ||
    v.voiceURI.includes('Premium')
  )
  if (macVoice) utterance.voice = macVoice
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

// ─────────────────────────────────────────────────────────────────────────────
// mockMode: skips camera entirely and draws a static placeholder.
// Used by Student D's demo fallback when the live camera fails during judging.
// ─────────────────────────────────────────────────────────────────────────────
function drawMockCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  canvas.width  = 640
  canvas.height = 480
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, 640, 480)
  ctx.fillStyle = '#374151'
  ctx.fillRect(240, 60, 160, 360)
  ctx.fillStyle = '#6B7280'
  ctx.font = 'bold 18px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('DEMO MODE', 320, 260)
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#9CA3AF'
  ctx.fillText('Pre-recorded session active', 320, 285)
  ctx.textAlign = 'left'
}

export default function PoseCamera({ patient, sessionId, onRep, exerciseType = 'squat', mockMode = false }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  // Forwarding refs — always-current, no stale-closure risk
  const onRepRef        = useRef(onRep)
  const patientRef      = useRef(patient)
  const exerciseTypeRef = useRef(exerciseType)
  useEffect(() => { onRepRef.current = onRep },               [onRep])
  useEffect(() => { patientRef.current = patient },           [patient])
  useEffect(() => { exerciseTypeRef.current = exerciseType }, [exerciseType])

  // State machine refs
  const repStateRef    = useRef(STATE.IDLE)
  const repCountRef    = useRef(0)
  const angleHistoryRef = useRef([])
  const repFiredRef    = useRef(false)

  // Peak angle tracking: squat/bicep_curl track min, shoulder_flexion tracks max
  const minAngleThisRepRef = useRef(Infinity)
  const maxAngleThisRepRef = useRef(-Infinity)

  // Feature 2: ghost frame patience
  const badFrameCountRef = useRef(0)

  // Feature 4: eccentric velocity tracking
  const lastTimeRef  = useRef(null)
  const lastAngleRef = useRef(null)

  // Per-rep accumulated flags (velocity + posture events)
  const currentRepFlagsRef = useRef([])

  // Bicep curl: baseline torso angle at start of CURLING
  const torsoAtCurlStartRef = useRef(null)

  // Audio: dedup so warnings speak only once per distinct condition
  const lastWarningRef = useRef('')

  const [repCount, setRepCount]     = useState(0)
  const [cameraError, setCameraError] = useState(false)

  // Mock mode: draw placeholder and skip all camera + MediaPipe logic
  useEffect(() => {
    if (!mockMode) return
    const canvas = canvasRef.current
    if (canvas) drawMockCanvas(canvas)
  }, [mockMode])

  useEffect(() => {
    if (mockMode) return   // camera not needed in demo mode

    const video  = videoRef.current
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    if (!window.Pose) {
      ctx.fillStyle = '#EF4444'
      ctx.font = '16px system-ui'
      ctx.fillText('MediaPipe not loaded — refresh the page.', 20, 40)
      return
    }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    pose.onResults((results) => {
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      const lm  = results.poseLandmarks
      const cfg = EXERCISE_CONFIGS[exerciseTypeRef.current] ?? EXERCISE_CONFIGS.squat

      // ── Feature 1: Dynamic side selection ────────────────────────────
      const leftVis  = lm ? avgVis(lm, cfg.leftJoints)  : 0
      const rightVis = lm ? avgVis(lm, cfg.rightJoints) : 0
      const useLeft  = leftVis >= rightVis
      const activeVis = Math.max(leftVis, rightVis)

      // ── Feature 2: Ghost frame patience counter ───────────────────────
      const isBadFrame = !lm || activeVis < 0.6
      if (isBadFrame) {
        badFrameCountRef.current += 1
        if (badFrameCountRef.current > 5) {
          drawWarningOnCanvas(ctx, canvas, 'Please step fully into the frame.')
          if (lastWarningRef.current !== 'step') {
            lastWarningRef.current = 'step'
            speak('Please step fully into the frame')
          }
        }
        return
      }
      badFrameCountRef.current = 0
      lastWarningRef.current   = ''

      const joints       = useLeft ? cfg.leftJoints : cfg.rightJoints
      const j1           = lm[joints[0]]
      const j2           = lm[joints[1]]
      const j3           = lm[joints[2]]
      const activeIndices = joints
      const vertexIdx    = joints[1]

      // ── Feature 3: Perspective validation ────────────────────────────
      const shoulderWidth = Math.abs(lm[11].x - lm[12].x)
      if (shoulderWidth > 0.15) {
        window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: '#374151', lineWidth: 2 })
        window.drawLandmarks(ctx, lm, { color: '#6B7280', lineWidth: 1, radius: 3 })
        drawWarningOnCanvas(ctx, canvas, 'Please turn sideways to the camera.')
        if (lastWarningRef.current !== 'sideways') {
          lastWarningRef.current = 'sideways'
          speak('Please turn sideways to the camera')
        }
        return
      }

      // ── Standard skeleton ─────────────────────────────────────────────
      window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: '#374151', lineWidth: 2 })
      window.drawLandmarks(ctx, lm, { color: '#6B7280', lineWidth: 1, radius: 3 })

      const mainAngle   = getAngle(j1, j2, j3)
      const isDanger    = exerciseTypeRef.current === 'squat' && mainAngle < 60
      const highlightColor = isDanger ? '#EF4444' : '#00E5A0'

      // ── Highlighted active joints ─────────────────────────────────────
      for (const idx of activeIndices) {
        const lx = lm[idx].x * canvas.width
        const ly = lm[idx].y * canvas.height
        ctx.beginPath()
        ctx.arc(lx, ly, idx === vertexIdx ? 12 : 9, 0, 2 * Math.PI)
        ctx.fillStyle = highlightColor
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(j1.x * canvas.width, j1.y * canvas.height)
      ctx.lineTo(j2.x * canvas.width, j2.y * canvas.height)
      ctx.lineTo(j3.x * canvas.width, j3.y * canvas.height)
      ctx.strokeStyle = highlightColor
      ctx.lineWidth = 4
      ctx.stroke()

      // ── Canvas HUD ────────────────────────────────────────────────────
      const stateLabel = cfg.stateLabels[repStateRef.current] ?? repStateRef.current
      drawCanvasHUD(ctx, canvas, mainAngle, stateLabel, repCountRef.current, cfg.angleLabel)
      drawAngleAtKnee(ctx, canvas, j2, mainAngle)

      // ── Smoothed angle (8-frame rolling average) ──────────────────────
      angleHistoryRef.current.push(mainAngle)
      if (angleHistoryRef.current.length > 8) angleHistoryRef.current.shift()
      const smoothAngle =
        angleHistoryRef.current.reduce((a, b) => a + b, 0) /
        angleHistoryRef.current.length

      const p         = patientRef.current
      const targetMin = p?.target_angle_min ?? 85
      const targetMax = p?.target_angle_max ?? 170
      const state     = repStateRef.current
      const now       = performance.now()
      const exType    = exerciseTypeRef.current

      // ── Exercise-specific state machines ─────────────────────────────
      if (exType === 'squat') {
        const torsoShoulder = lm[useLeft ? 11 : 12]
        const torsoAngle    = getAngle(torsoShoulder, j1, j2)

        if (state === STATE.IDLE && smoothAngle < 160) {
          repStateRef.current = STATE.DESCENDING
          minAngleThisRepRef.current = Infinity
          repFiredRef.current = false
          currentRepFlagsRef.current = []
          speak(cfg.audio.start)

        } else if (state === STATE.DESCENDING) {
          minAngleThisRepRef.current = Math.min(minAngleThisRepRef.current, mainAngle)
          if (lastTimeRef.current !== null && lastAngleRef.current !== null) {
            const dt     = (now - lastTimeRef.current) / 1000
            const dAngle = lastAngleRef.current - mainAngle
            if (dt > 0 && dAngle / dt > 45 &&
                !currentRepFlagsRef.current.includes('descent_too_fast')) {
              currentRepFlagsRef.current.push('descent_too_fast')
              speak('Slow down')
            }
          }
          if (torsoAngle < 60 && !currentRepFlagsRef.current.includes('leaning_forward')) {
            currentRepFlagsRef.current.push('leaning_forward')
            speak('Stand up straighter')
          }
          if (smoothAngle <= targetMin + 10) {
            repStateRef.current = STATE.HOLD
            speak(cfg.audio.hold)
          }

        } else if (state === STATE.HOLD) {
          minAngleThisRepRef.current = Math.min(minAngleThisRepRef.current, mainAngle)
          if (torsoAngle < 60 && !currentRepFlagsRef.current.includes('leaning_forward')) {
            currentRepFlagsRef.current.push('leaning_forward')
            speak('Stand up straighter')
          }
          if (smoothAngle > targetMin + 15) {
            repStateRef.current = STATE.ASCENDING
            speak(cfg.audio.return)
          }

        } else if (state === STATE.ASCENDING && smoothAngle >= 160) {
          if (!repFiredRef.current) {
            repFiredRef.current = true
            repStateRef.current = STATE.IDLE
            repCountRef.current += 1
            setRepCount(repCountRef.current)

            const lowestAngle = Math.round(minAngleThisRepRef.current)
            const depthScore  = lowestAngle <= 100 ? 50 : Math.max(0, 50 - (lowestAngle - 100) * 2)
            const torsoDelta  = Math.abs(torsoAngle - 90)
            const alignScore  = torsoDelta <= 15 ? 30 : Math.max(0, 30 - (torsoDelta - 15))
            const structuralFlags = []
            if (lowestAngle > 100) structuralFlags.push('too_shallow')
            if (torsoDelta > 30)   structuralFlags.push('hip_misalignment')
            if (lowestAngle < 60)  structuralFlags.push('dangerously deep')
            const allFlags  = [...structuralFlags, ...currentRepFlagsRef.current]
            const formScore = Math.max(0, Math.min(100, Math.round(depthScore + alignScore + 20 - allFlags.length * 10)))

            speak(`Rep ${repCountRef.current} done. Form score ${formScore} percent.`)
            onRepRef.current?.({
              exercise_name: p?.exercise_name ?? 'squat',
              [cfg.angleKey]: lowestAngle,
              hip_angle:     Math.round(torsoAngle),
              form_score:    formScore,
              flags:         allFlags.join(','),
              rep_number:    repCountRef.current,
              set_number:    1,
              session_id:    sessionId,
              target_min:    targetMin,
              target_max:    targetMax,
            })
            currentRepFlagsRef.current = []
          }
        }

      } else if (exType === 'shoulder_flexion') {
        if (state === STATE.IDLE && smoothAngle >= 40) {
          repStateRef.current = STATE.DESCENDING
          maxAngleThisRepRef.current = -Infinity
          repFiredRef.current = false
          currentRepFlagsRef.current = []
          speak(cfg.audio.start)

        } else if (state === STATE.DESCENDING) {
          maxAngleThisRepRef.current = Math.max(maxAngleThisRepRef.current, mainAngle)
          if (smoothAngle >= 150) {
            repStateRef.current = STATE.HOLD
            speak(cfg.audio.hold)
          }

        } else if (state === STATE.HOLD) {
          maxAngleThisRepRef.current = Math.max(maxAngleThisRepRef.current, mainAngle)
          if (smoothAngle < 140) {
            repStateRef.current = STATE.ASCENDING
            speak(cfg.audio.return)
          }

        } else if (state === STATE.ASCENDING) {
          if (lastTimeRef.current !== null && lastAngleRef.current !== null) {
            const dt     = (now - lastTimeRef.current) / 1000
            const dAngle = lastAngleRef.current - mainAngle
            if (dt > 0 && dAngle / dt > 60 &&
                !currentRepFlagsRef.current.includes('dropping_too_fast')) {
              currentRepFlagsRef.current.push('dropping_too_fast')
              speak('Lower more slowly')
            }
          }
          if (smoothAngle < 30 && !repFiredRef.current) {
            repFiredRef.current = true
            repStateRef.current = STATE.IDLE
            repCountRef.current += 1
            setRepCount(repCountRef.current)

            const peakAngle  = Math.round(maxAngleThisRepRef.current)
            const rangeScore = peakAngle >= 150 ? 50 : Math.max(0, 50 - (150 - peakAngle) * 1.5)
            const allFlags   = [...currentRepFlagsRef.current]
            const formScore  = Math.max(0, Math.min(100, Math.round(rangeScore + 50 - allFlags.length * 10)))

            speak(`Rep ${repCountRef.current} done. Form score ${formScore} percent.`)
            onRepRef.current?.({
              exercise_name: p?.exercise_name ?? 'shoulder_flexion',
              [cfg.angleKey]: peakAngle,
              form_score:    formScore,
              flags:         allFlags.join(','),
              rep_number:    repCountRef.current,
              set_number:    1,
              session_id:    sessionId,
            })
            currentRepFlagsRef.current = []
          }
        }

      } else if (exType === 'bicep_curl') {
        const hipIdx    = useLeft ? 23 : 24
        const kneeIdx   = useLeft ? 25 : 26
        const torsoAngle = getAngle(j1, lm[hipIdx], lm[kneeIdx])

        if (state === STATE.IDLE && smoothAngle < 140) {
          repStateRef.current = STATE.DESCENDING
          minAngleThisRepRef.current = Infinity
          repFiredRef.current = false
          currentRepFlagsRef.current = []
          torsoAtCurlStartRef.current = torsoAngle
          speak(cfg.audio.start)

        } else if (state === STATE.DESCENDING) {
          minAngleThisRepRef.current = Math.min(minAngleThisRepRef.current, mainAngle)
          if (torsoAtCurlStartRef.current !== null &&
              Math.abs(torsoAngle - torsoAtCurlStartRef.current) > 15 &&
              !currentRepFlagsRef.current.includes('swinging_torso')) {
            currentRepFlagsRef.current.push('swinging_torso')
            speak('Keep your torso still')
          }
          if (smoothAngle < 50) {
            repStateRef.current = STATE.HOLD
            speak(cfg.audio.hold)
          }

        } else if (state === STATE.HOLD) {
          minAngleThisRepRef.current = Math.min(minAngleThisRepRef.current, mainAngle)
          if (smoothAngle > 60) {
            repStateRef.current = STATE.ASCENDING
            speak(cfg.audio.return)
          }

        } else if (state === STATE.ASCENDING) {
          if (smoothAngle > 150 && !repFiredRef.current) {
            repFiredRef.current = true
            repStateRef.current = STATE.IDLE
            repCountRef.current += 1
            setRepCount(repCountRef.current)

            const lowestAngle = Math.round(minAngleThisRepRef.current)
            const depthScore  = lowestAngle <= 50 ? 50 : Math.max(0, 50 - (lowestAngle - 50) * 1.5)
            const allFlags    = [...currentRepFlagsRef.current]
            const formScore   = Math.max(0, Math.min(100, Math.round(depthScore + 50 - allFlags.length * 10)))

            speak(`Rep ${repCountRef.current} done. Form score ${formScore} percent.`)
            onRepRef.current?.({
              exercise_name: p?.exercise_name ?? 'bicep_curl',
              [cfg.angleKey]: lowestAngle,
              form_score:    formScore,
              flags:         allFlags.join(','),
              rep_number:    repCountRef.current,
              set_number:    1,
              session_id:    sessionId,
            })
            currentRepFlagsRef.current  = []
            torsoAtCurlStartRef.current = null
          }
        }
      }

      lastTimeRef.current  = now
      lastAngleRef.current = mainAngle
    })

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then((stream) => {
        video.srcObject = stream
        video.play()
        const camera = new window.Camera(video, {
          onFrame: async () => { await pose.send({ image: video }) },
          width: 640,
          height: 480,
        })
        camera.start()
      })
      .catch(() => setCameraError(true))

    return () => {
      pose.close()
      if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop())
    }
  }, [sessionId, mockMode])

  if (cameraError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 rounded-xl p-10 text-center border border-red-800">
        <p className="text-2xl mb-2">📷</p>
        <p className="text-red-400 font-semibold mb-1">Camera access denied</p>
        <p className="text-gray-400 text-sm">
          Open browser settings → allow camera for this site → refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <video ref={videoRef} className="hidden" playsInline muted />
      {/* CSS scaleX(-1): natural selfie view. Canvas HUD uses counter-transform for readable text. */}
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl shadow-xl"
        style={{ transform: mockMode ? 'none' : 'scaleX(-1)' }}
      />
      {mockMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
          DEMO MODE — pre-recorded session
        </div>
      )}
    </div>
  )
}
