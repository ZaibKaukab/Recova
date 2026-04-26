import { useState } from 'react'
import PoseCamera from '../components/PoseCamera.jsx'
import FeedbackPanel from '../components/FeedbackPanel.jsx'
import SessionSummary from '../components/SessionSummary.jsx'
import { loginPatient, startSession, submitRep, endSession } from '../api.js'

export default function PatientView() {
  const [phase, setPhase] = useState('login')   // login | exercise | summary
  const [email, setEmail] = useState('')
  const [patient, setPatient] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [summaryData, setSummaryData] = useState(null)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const p = await loginPatient(email)
      if (p.error) { setError(p.error); return }
      const s = await startSession(p.id)
      setPatient(p)
      setSessionId(s.session_id)
      setPhase('exercise')
    } catch {
      setError('Could not connect to server. Is the backend running?')
    }
  }

  async function handleRep(repData) {
    setRepCount(c => c + 1)
    setFeedbackLoading(true)
    try {
      const res = await submitRep({ ...repData, session_id: sessionId })
      setFeedback(res.feedback)
    } catch {
      setFeedback('Great rep! Keep up the good work.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleEndSession() {
    try {
      const res = await endSession(sessionId)
      setSummaryData(res)
      setPhase('summary')
    } catch {
      setSummaryData({ summary: 'Session complete! Great work today.', total_reps: repCount, avg_form_score: 0 })
      setPhase('summary')
    }
  }

  function handleRestart() {
    setPhase('login')
    setEmail('')
    setPatient(null)
    setSessionId(null)
    setFeedback('')
    setRepCount(0)
    setSummaryData(null)
    setError('')
  }

  if (phase === 'login') {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Recova</h1>
        <p className="text-gray-400 text-center text-sm mb-8">Enter your email to begin your session.</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors"
          >
            Start Session
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center mt-6">
          Demo: eleanor@demo.com · marcus@demo.com · rosa@demo.com
        </p>
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <SessionSummary
        summary={summaryData?.summary}
        totalReps={summaryData?.total_reps ?? repCount}
        avgFormScore={Math.round(summaryData?.avg_form_score ?? 0)}
        onRestart={handleRestart}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{patient?.name}</h1>
          <p className="text-sm text-gray-400">{patient?.exercise_name} · {patient?.condition}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-teal-400">{repCount}</span>
          <span className="text-gray-400 text-sm ml-1">/ {patient?.target_reps} reps</span>
        </div>
      </div>

      <PoseCamera patient={patient} sessionId={sessionId} onRep={handleRep} />

      <div className="mt-4">
        <FeedbackPanel feedback={feedback} isLoading={feedbackLoading} />
      </div>

      <button
        onClick={handleEndSession}
        className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        End Session & Get Summary
      </button>
    </div>
  )
}
