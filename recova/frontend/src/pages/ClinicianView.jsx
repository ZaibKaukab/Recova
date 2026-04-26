import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Clock, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { getPatients } from '../api.js'

function StatusBadge({ patient }) {
  if (patient.danger_flag) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger-light text-danger text-xs font-semibold border border-danger/30">
        <AlertTriangle size={12} strokeWidth={2.5} />
        Alert
      </span>
    )
  }
  if (patient.session_id) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-50 text-sage-500 text-xs font-semibold border border-sage-100">
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Active
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-200 text-charcoal-300 text-xs font-semibold border border-canvas-300">
      <Clock size={12} strokeWidth={2.5} />
      No sessions
    </span>
  )
}

function ScoreBar({ value }) {
  const pct = Math.min(100, value)
  const color = value >= 70 ? 'bg-sage-400' : value >= 40 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-canvas-200 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-semibold text-charcoal-500 w-10 text-right">{Math.round(value)}%</span>
    </div>
  )
}

function PatientCard({ patient, index }) {
  const [expanded, setExpanded] = useState(false)
  const isDanger = patient.danger_flag
  const hasSession = !!patient.session_id

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className={`bg-white rounded-3xl shadow-soft overflow-hidden border transition-all ${
        isDanger ? 'border-danger/40 shadow-[0_4px_32px_rgba(192,82,74,0.10)]' : 'border-canvas-300'
      }`}
    >
      {isDanger && (
        <div className="bg-danger-light border-b border-danger/20 px-6 py-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-danger flex-shrink-0" strokeWidth={2.5} />
          <p className="text-danger text-sm font-semibold">
            Potentially dangerous movement detected — review session notes
          </p>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-charcoal-500 truncate">{patient.name}</h2>
              <StatusBadge patient={patient} />
            </div>
            <p className="text-charcoal-400 text-base">{patient.condition}</p>
            <p className="text-charcoal-300 text-sm mt-0.5">Clinician: {patient.clinician_name}</p>
          </div>

          {hasSession && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-charcoal-300 hover:text-charcoal-500 hover:bg-canvas-100 transition-all min-h-[44px] border border-canvas-300"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
        </div>

        {hasSession && (
          <div className="mt-5 pt-5 border-t border-canvas-300">
            <div className="grid grid-cols-2 gap-5 mb-4">
              <div>
                <p className="text-xs font-semibold text-charcoal-200 uppercase tracking-wider mb-1.5">Last Session</p>
                <p className="text-2xl font-bold text-charcoal-500">
                  {patient.total_reps ?? 0}
                  <span className="text-base font-medium text-charcoal-300 ml-1">reps</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-charcoal-200 uppercase tracking-wider mb-2.5">Avg Form Score</p>
                <ScoreBar value={patient.avg_form_score ?? 0} />
              </div>
            </div>

            {expanded && patient.claude_summary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className="mt-4 pt-4 border-t border-canvas-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-terra-400" />
                  <p className="text-xs font-semibold text-charcoal-200 uppercase tracking-wider">Coach's Notes</p>
                </div>
                <p className="text-charcoal-400 text-base leading-relaxed">{patient.claude_summary}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ClinicianView() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPatients()
      .then(data => setPatients(data.patients ?? []))
      .catch(() => setError('Could not load patients. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const alertPatients = patients.filter(p => p.danger_flag)
  const activePatients = patients.filter(p => !p.danger_flag && p.session_id)
  const inactivePatients = patients.filter(p => !p.danger_flag && !p.session_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-canvas-300 border-t-terra-400 rounded-full"
          />
          <p className="text-charcoal-300 text-base">Loading patient records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-danger-light rounded-3xl p-8 text-center border border-danger/20">
        <AlertTriangle size={32} className="text-danger mx-auto mb-3" />
        <p className="text-danger font-semibold text-lg mb-1">Connection Error</p>
        <p className="text-charcoal-400 text-base">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-charcoal-500 flex items-center justify-center">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal-500">Patient Overview</h1>
          <p className="text-charcoal-300 text-base">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} · {alertPatients.length} alert{alertPatients.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-soft p-12 text-center">
          <p className="text-charcoal-300 text-lg italic mb-2">No patients found.</p>
          <p className="text-charcoal-200 text-base">
            Run <code className="bg-canvas-200 text-terra-400 px-2 py-0.5 rounded-lg text-sm">python seed.py</code> in the backend folder to add demo patients.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {alertPatients.map((p, i) => <PatientCard key={p.id} patient={p} index={i} />)}
          {activePatients.map((p, i) => <PatientCard key={p.id} patient={p} index={alertPatients.length + i} />)}
          {inactivePatients.map((p, i) => <PatientCard key={p.id} patient={p} index={alertPatients.length + activePatients.length + i} />)}
        </div>
      )}
    </div>
  )
}
