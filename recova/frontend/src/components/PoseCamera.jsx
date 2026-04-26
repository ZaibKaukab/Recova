import { useEffect, useRef, useState } from 'react'

// Globals injected by MediaPipe CDN scripts in index.html:
// window.Pose, window.Camera, window.drawConnectors,
// window.drawLandmarks, window.POSE_CONNECTIONS

const STATE = { IDLE: 'IDLE', DESCENDING: 'DESCENDING', HOLD: 'HOLD', ASCENDING: 'ASCENDING' }

function getAngle(a, b, c) {
  // b is the vertex joint being measured
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const dot = ba.x * bc.x + ba.y * bc.y
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2)
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2)
  const cosAngle = Math.min(1, Math.max(-1, dot / (magBA * magBC)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

export default function PoseCamera({ patient, sessionId, onRep }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const cameraRef = useRef(null)

  // Use refs for state machine so stale closures don't trap old values
  const repStateRef = useRef(STATE.IDLE)
  const repCountRef = useRef(0)
  const angleHistoryRef = useRef([])

  const [status, setStatus] = useState('Initializing camera...')
  const [repCount, setRepCount] = useState(0)
  const [currentAngle, setCurrentAngle] = useState(null)
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!window.Pose) {
      setStatus('MediaPipe failed to load — refresh the page.')
      return
    }

    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    pose.onResults((results) => {
      // Resize canvas to match video
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      if (!results.poseLandmarks) {
        setStatus('No body detected — step back so your full body is visible')
        return
      }

      const lm = results.poseLandmarks

      // Check that key leg landmarks are visible
      const keyIndices = [11, 23, 24, 25, 26, 27, 28]
      const lowConf = keyIndices.some(i => lm[i].visibility < 0.5)
      if (lowConf) {
        setStatus('Move to better lighting — can\'t see your full body clearly')
      } else {
        setStatus('Tracking — do a squat')
      }

      // Draw skeleton overlay
      window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, {
        color: '#00E5A0',
        lineWidth: 3,
      })
      window.drawLandmarks(ctx, lm, {
        color: '#FF4F4F',
        lineWidth: 1,
        radius: 4,
      })

      // Angles — left side: hip=23, knee=25, ankle=27; shoulder=11
      const kneeAngle = getAngle(lm[23], lm[25], lm[27])
      const hipAngle = getAngle(lm[11], lm[23], lm[25])

      setCurrentAngle(Math.round(kneeAngle))

      // Draw angle label at left knee landmark
      const kx = lm[25].x * canvas.width
      const ky = lm[25].y * canvas.height
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.roundRect(kx + 8, ky - 22, 58, 24, 4)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 16px system-ui'
      ctx.fillText(`${Math.round(kneeAngle)}°`, kx + 12, ky - 4)
      ctx.restore()

      // Smooth angle over last 8 frames to avoid noise-triggered reps
      angleHistoryRef.current.push(kneeAngle)
      if (angleHistoryRef.current.length > 8) angleHistoryRef.current.shift()
      const smoothAngle =
        angleHistoryRef.current.reduce((a, b) => a + b, 0) /
        angleHistoryRef.current.length

      const targetMin = patient?.target_angle_min ?? 70
      const targetMax = patient?.target_angle_max ?? 170

      const state = repStateRef.current

      if (state === STATE.IDLE && smoothAngle < 150) {
        repStateRef.current = STATE.DESCENDING
        setStatus('Descending — keep going down')
      } else if (state === STATE.DESCENDING && smoothAngle <= targetMin + 10) {
        repStateRef.current = STATE.HOLD
        setStatus('Good depth! Hold briefly...')
      } else if (state === STATE.HOLD && smoothAngle > targetMin + 15) {
        repStateRef.current = STATE.ASCENDING
        setStatus('Ascending — push through!')
      } else if (state === STATE.ASCENDING && smoothAngle >= 160) {
        // Rep complete
        repStateRef.current = STATE.IDLE
        repCountRef.current += 1
        setRepCount(repCountRef.current)

        // Form score calculation
        const depthDelta = smoothAngle - targetMin
        const depthScore = depthDelta <= 0 ? 40 : Math.max(0, 40 - depthDelta * 1.2)
        const hipDelta = Math.abs(hipAngle - 90)
        const alignScore = hipDelta <= 20 ? 25 : Math.max(0, 25 - (hipDelta - 20) * 0.8)
        const smoothScore = 35 // TODO: derive from angle history variance
        const formScore = Math.min(100, Math.round(depthScore + alignScore + smoothScore))

        const flags = []
        if (depthDelta > 20) flags.push('insufficient_depth')
        if (hipDelta > 30) flags.push('hip_misalignment')

        setStatus(`Rep ${repCountRef.current} done! Form: ${formScore}%`)

        onRep?.({
          rep_number: repCountRef.current,
          set_number: 1,
          knee_angle: Math.round(kneeAngle),
          hip_angle: Math.round(hipAngle),
          form_score: formScore,
          flags: flags.join(','),
          exercise_name: patient?.exercise_name ?? 'squat',
          target_min: targetMin,
          target_max: targetMax,
          session_id: sessionId,
        })
      }
    })

    poseRef.current = pose

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then((stream) => {
        video.srcObject = stream
        video.play()
        setStatus('Camera ready — stand back so your full body is visible')

        const camera = new window.Camera(video, {
          onFrame: async () => {
            await pose.send({ image: video })
          },
          width: 640,
          height: 480,
        })
        camera.start()
        cameraRef.current = camera
      })
      .catch(() => {
        setCameraError(true)
        setStatus('Camera permission denied. Allow camera access and refresh.')
      })

    return () => {
      pose.close()
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, []) // run once on mount; patient/sessionId accessed via closure via onRep callback

  if (cameraError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 rounded-xl p-8 text-center border border-red-900">
        <p className="text-red-400 font-semibold mb-2">Camera access denied</p>
        <p className="text-gray-400 text-sm">
          Allow camera access in your browser settings, then refresh the page.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Hidden video element — MediaPipe reads from this */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* Canvas renders the mirrored video + skeleton overlay */}
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl shadow-lg"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Status HUD — bottom left */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm max-w-[65%]">
        {status}
      </div>

      {/* Knee angle — top right */}
      {currentAngle !== null && (
        <div className="absolute top-3 right-3 bg-teal-700/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-bold">
          Knee {currentAngle}°
        </div>
      )}

      {/* Rep counter — top left */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-bold">
        Reps: {repCount}
      </div>
    </div>
  )
}
