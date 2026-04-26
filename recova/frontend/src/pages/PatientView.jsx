import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PoseCamera from '../components/PoseCamera.jsx'
import FeedbackPanel from '../components/FeedbackPanel.jsx'
import FormMeter from '../components/FormMeter.jsx'
import SessionSummary from '../components/SessionSummary.jsx'
import { loginPatient, startSession, submitRep, endSession, emailSessionSummary } from '../api.js'

const EXERCISES = [
  { value: 'squat',            label: 'Squat' },
  { value: 'shoulder_flexion', label: 'Shoulder Flexion' },
  { value: 'bicep_curl',       label: 'Bicep Curl' },
]

export default function PatientView() {
  const [phase, setPhase] = useState('login')
  const [email, setEmail] = useState('')
  const [patient, setPatient] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [currentFormScore, setCurrentFormScore] = useState(0)
  const [reps, setReps] = useState([])
  const [summaryData, setSummaryData] = useState(null)
  const [error, setError] = useState('')
  const [exerciseType, setExerciseType] = useState('squat')
  const [mockMode, setMockMode] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setIsLoggingIn(true)
    try {
      const p = await loginPatient(email)
      if (p.error) { setError(p.error); return }
      const s = await startSession(p.id)
      setPatient(p)
      setSessionId(s.session_id)
      setExerciseType(p.exercise_name ?? 'squat')
      setPhase('exercise')
    } catch {
      setError('Could not reach the server. Make sure the backend is running.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleRep(repData) {
    const newCount = repCount + 1
    setRepCount(newCount)
    setCurrentFormScore(repData.form_score)
    setReps(prev => [...prev, repData])
    setFeedbackLoading(true)
    try {
      const res = await submitRep({ ...repData, session_id: sessionId })
      setFeedback(res.feedback)
    } catch {
      setFeedback('Good rep! Keep your core engaged and maintain steady breathing.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleEndSession() {
    let finalData
    try {
      const res = await endSession(sessionId)
      finalData = { ...res, reps }
    } catch {
      finalData = {
        summary: "Great session today! You maintained consistent form throughout. Focus on deepening your range of motion next time.",
        total_reps: repCount,
        avg_form_score: reps.length > 0 ? Math.round(reps.reduce((a, r) => a + r.form_score, 0) / reps.length) : 0,
        reps,
      }
    }
    setSummaryData(finalData)
    setPhase('summary')
    try {
      await emailSessionSummary({
        email,
        patient_name: patient?.name ?? '',
        avg_form_score: finalData.avg_form_score,
        total_reps: finalData.total_reps,
        summary: finalData.summary,
        reps: finalData.reps ?? [],
      })
      setEmailSent(true)
    } catch {
      // Email is best-effort
    }
  }

  function handleRestart() {
    setPhase('login')
    setEmail('')
    setPatient(null)
    setSessionId(null)
    setFeedback('')
    setRepCount(0)
    setCurrentFormScore(0)
    setReps([])
    setSummaryData(null)
    setError('')
    setMockMode(false)
    setEmailSent(false)
  }

  const exerciseLabel = EXERCISES.find(e => e.value === exerciseType)?.label ?? exerciseType

  return (
    <AnimatePresence mode="wait">

      {/* ── Login ─────────────────────────────────────── */}
      {phase === 'login' && (
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="min-h-[80vh] flex items-center justify-center px-6 py-12"
        >
          <div className="w-full max-w-md">
            <div className="data-card-solid p-10" style={{ borderRadius: '20px' }}>
              <div className="mb-8 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-primary fill-icon" style={{ fontSize: '28px' }}>favorite</span>
                </div>
                <h1 className="text-3xl font-black text-primary mb-2 tracking-tight">Good to see you.</h1>
                <p className="text-secondary text-base leading-relaxed">
                  Enter your email and your AI coach will guide you through today's exercises.
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" style={{ fontSize: '18px' }}>mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-11 pr-4 py-3.5 text-base bg-surface border border-outline rounded-lg text-on-surface placeholder-secondary/50 focus:outline-none focus:border-primary focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': 'rgba(37,52,79,0.15)' }}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-error text-sm font-semibold px-1"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:opacity-90 active:opacity-80 text-white text-base font-bold rounded-lg transition-all shadow-sm min-h-[52px] disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      Begin My Session
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-secondary/60 text-xs mt-6 leading-relaxed font-medium">
                Demo accounts: <span className="text-secondary">eleanor@demo.com</span> ·{' '}
                <span className="text-secondary">marcus@demo.com</span> ·{' '}
                <span className="text-secondary">rosa@demo.com</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Exercise ──────────────────────────────────── */}
      {phase === 'exercise' && (
        <motion.div
          key="exercise"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* Session sub-header */}
          <div
            className="h-12 px-6 flex items-center justify-between border-b border-outline/60"
            style={{ background: 'rgba(225,217,205,0.8)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">
                Live Session: {exerciseLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Exercise picker */}
              <div className="relative">
                <select
                  value={exerciseType}
                  onChange={e => setExerciseType(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-surface-white border border-outline rounded text-xs font-bold text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
                >
                  {EXERCISES.map(ex => (
                    <option key={ex.value} value={ex.value}>{ex.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" style={{ fontSize: '14px' }}>expand_more</span>
              </div>
              {/* Demo mode */}
              <button
                onClick={() => setMockMode(m => !m)}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                  mockMode
                    ? 'bg-gold/20 border-gold/40 text-primary'
                    : 'bg-surface border-outline text-secondary hover:text-primary'
                }`}
              >
                {mockMode ? '● Demo' : 'Demo Mode'}
              </button>
            </div>
          </div>

          {/* Main layout */}
          <div className="flex gap-6 p-6 items-start" style={{ minHeight: 'calc(100vh - 112px)' }}>

            {/* Left icon sidebar */}
            <aside className="flex flex-col items-center gap-6 py-2 w-12 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm cursor-pointer">
                <span className="material-symbols-outlined text-white fill-icon" style={{ fontSize: '18px' }}>dashboard</span>
              </div>
              <div className="flex flex-col gap-5" style={{ color: 'rgba(97,120,145,0.4)' }}>
                {['group', 'fitness_center', 'event_note', 'analytics'].map(icon => (
                  <span key={icon} className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors" style={{ fontSize: '20px' }}>{icon}</span>
                ))}
              </div>
            </aside>

            {/* Camera column */}
            <div className="flex-[2] min-w-0 flex flex-col gap-4">
              {/* Camera feed wrapper */}
              <div className="rounded-xl overflow-hidden flex-1" style={{ background: '#25344F', minHeight: '400px' }}>
                <PoseCamera
                  patient={patient}
                  sessionId={sessionId}
                  onRep={handleRep}
                  mockMode={mockMode}
                  exerciseType={exerciseType}
                />
              </div>

              {/* Metrics strip */}
              <div className="grid grid-cols-4 gap-3">
                {/* REPS */}
                <div className="data-card p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Reps</span>
                  <span className="text-2xl font-black text-primary leading-none">
                    {repCount}
                    <span className="text-base font-medium text-secondary/40">/{patient?.target_reps ?? '—'}</span>
                  </span>
                  <div className="w-full h-1 bg-primary/10 mt-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${Math.min(100, (repCount / (patient?.target_reps || 1)) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* FORM */}
                <div className="data-card p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Form</span>
                  <motion.span
                    key={currentFormScore}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="text-2xl font-black text-primary leading-none"
                  >
                    {currentFormScore}<span className="text-base font-medium text-secondary/40">%</span>
                  </motion.span>
                  <span className="text-[10px] font-bold mt-1 uppercase tracking-wide" style={{ color: currentFormScore >= 70 ? '#25344F' : currentFormScore >= 40 ? '#917A4A' : '#BA1A1A' }}>
                    {currentFormScore >= 70 ? 'Optimal' : currentFormScore >= 40 ? 'Good' : currentFormScore > 0 ? 'Adjust' : '—'}
                  </span>
                </div>

                {/* EXERCISE */}
                <div className="data-card p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Exercise</span>
                  <span className="text-sm font-black text-primary leading-tight text-center">{exerciseLabel}</span>
                </div>

                {/* PATIENT */}
                <div className="data-card p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Patient</span>
                  <span className="text-sm font-black text-primary leading-tight">{patient?.name?.split(' ')[0] ?? '—'}</span>
                  <span className="text-[10px] text-secondary mt-0.5 uppercase tracking-wide font-semibold">
                    {patient?.condition?.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
              {/* AI Feedback panel */}
              <FeedbackPanel feedback={feedback} isLoading={feedbackLoading} repCount={repCount} />

              {/* Form meter */}
              <div className="data-card p-5 flex flex-col items-center">
                <FormMeter score={currentFormScore} />
              </div>

              {/* Patient mini */}
              <div className="data-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border border-primary/20">
                    {patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary leading-tight">{patient?.name}</h4>
                    <p className="text-[10px] text-secondary uppercase font-semibold tracking-wide mt-0.5">{patient?.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-primary/5 rounded-lg">
                    <span className="block text-[10px] font-bold text-secondary/70 uppercase tracking-wide">Target</span>
                    <span className="text-base font-black text-primary">{patient?.target_reps ?? '—'} <span className="text-xs font-medium text-secondary">reps</span></span>
                  </div>
                  <div className="p-2.5 bg-primary/5 rounded-lg">
                    <span className="block text-[10px] font-bold text-secondary/70 uppercase tracking-wide">Done</span>
                    <span className="text-base font-black text-primary">{repCount} <span className="text-xs font-medium text-secondary">reps</span></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMockMode(m => !m)}
                  className="flex-1 py-3 data-card flex items-center justify-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pause_circle</span>
                  {mockMode ? 'Live Mode' : 'Demo Mode'}
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex-1 py-3 bg-primary text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-sm hover:opacity-90 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>analytics</span>
                  End Session
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ── Summary ───────────────────────────────────── */}
      {phase === 'summary' && (
        <motion.div
          key="summary"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <SessionSummary
            summary={summaryData?.summary}
            totalReps={summaryData?.total_reps ?? repCount}
            avgFormScore={summaryData?.avg_form_score ?? 0}
            reps={summaryData?.reps ?? reps}
            patientName={patient?.name}
            onRestart={handleRestart}
            emailSent={emailSent}
          />
        </motion.div>
      )}

    </AnimatePresence>
  )
}
