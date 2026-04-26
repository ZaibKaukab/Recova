import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { getPatients } from '../api.js'
import ClinicalSessionReport from './ClinicalSessionReport.jsx'

// ── Weekly AI Digest banner ─────────────────────────────────────────────────
function DigestBanner({ patients }) {
  const total = patients.length
  const activeCount = patients.filter(p => p.session_id).length
  const alertCount = patients.filter(p => p.danger_flag).length
  const adherence = total > 0 ? Math.round((activeCount / total) * 100) : 0
  const avgScore = total > 0
    ? Math.round(patients.filter(p => p.avg_form_score).reduce((a, p) => a + p.avg_form_score, 0) / (patients.filter(p => p.avg_form_score).length || 1))
    : 0
  const recoveryDelta = avgScore >= 75 ? '+12.4%' : avgScore >= 50 ? '+4.2%' : '-1.8%'

  return (
    <div className="bg-primary rounded-xl p-8 text-white relative overflow-hidden shadow-lg mb-6">
      <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <path d="M0,50 Q25,20 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,60 Q25,30 50,60 T100,60" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0,40 Q25,10 50,40 T100,40" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined fill-icon" style={{ color: '#D5B893' }}>auto_awesome</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">Weekly AI Digest</h2>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-1">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Recovery Velocity</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold">{recoveryDelta}</span>
              <span className="material-symbols-outlined mb-1" style={{ color: '#86efac' }}>trending_up</span>
            </div>
            <p className="text-[11px] text-white/40">Higher than cohort average</p>
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Adherence Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold">{adherence}%</span>
              {adherence >= 80 && (
                <span className="text-xs font-bold text-green-300 mb-1 px-2 py-0.5 bg-white/10 rounded-full">OPTIMAL</span>
              )}
            </div>
            <p className="text-[11px] text-white/40">{activeCount} of {total} patients active</p>
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Risk Alerts</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold">{String(alertCount).padStart(2, '0')}</span>
              {alertCount > 0 && (
                <span className="material-symbols-outlined mb-1" style={{ color: '#fca5a5' }}>warning</span>
              )}
            </div>
            <p className="text-[11px] text-white/40">Manual review required</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({ patient }) {
  if (patient.danger_flag)
    return <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase">CRITICAL ALERT</span>
  if (patient.session_id)
    return <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold uppercase">ON TRACK</span>
  return <span className="px-2.5 py-1 rounded-full bg-primary/10 text-secondary text-[10px] font-bold uppercase">NO SESSION</span>
}

// ── Phase progress bar ───────────────────────────────────────────────────────
function PhaseBar({ score }) {
  const pct = Math.min(100, Math.round(score ?? 0))
  const color = pct >= 70 ? '#25344F' : pct >= 40 ? '#D5B893' : '#ef4444'
  return (
    <div className="w-28">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-secondary">FORM</span>
        <span className="text-[10px] font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Clinical Alerts sidebar ─────────────────────────────────────────────────
function AlertsSidebar({ patients }) {
  const dangerPatients = patients.filter(p => p.danger_flag)
  const missedPatients = patients.filter(p => !p.session_id && !p.danger_flag).slice(0, 2)
  const milestonePatients = patients.filter(p => p.session_id && !p.danger_flag && p.avg_form_score >= 80).slice(0, 1)

  const alertCount = dangerPatients.length + (missedPatients.length > 0 ? 1 : 0)

  return (
    <div className="bg-white/40 border border-primary/10 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-primary flex items-center gap-2 text-base">
          Clinical Alerts
          {alertCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {String(alertCount).padStart(2, '0')}
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {dangerPatients.map(p => (
          <div key={p.id} className="p-4 rounded-lg bg-red-50 border-l-4 border-red-500">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Urgent Action</span>
              <span className="text-[10px] text-secondary/60">Recent</span>
            </div>
            <p className="text-sm font-bold text-primary mb-1">Dangerous Movement</p>
            <p className="text-xs text-secondary leading-relaxed">
              {p.name} triggered a danger flag during last session — review immediately.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-600 transition-colors">
                REVIEW NOW
              </button>
              <button className="px-3 py-1.5 bg-white border border-primary/10 text-primary text-[10px] font-bold rounded hover:bg-primary/5 transition-colors">
                DISMISS
              </button>
            </div>
          </div>
        ))}

        {missedPatients.length > 0 && (
          <div className="p-4 rounded-lg bg-orange-50 border-l-4 border-orange-500">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Compliance Drop</span>
              <span className="text-[10px] text-secondary/60">Today</span>
            </div>
            <p className="text-sm font-bold text-primary mb-1">Missing Sessions</p>
            <p className="text-xs text-secondary leading-relaxed">
              {missedPatients.map(p => p.name).join(' & ')} {missedPatients.length === 1 ? 'has' : 'have'} no active session recorded.
            </p>
            <div className="mt-3">
              <button className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-bold rounded hover:bg-orange-600 transition-colors">
                SEND REMINDER
              </button>
            </div>
          </div>
        )}

        {milestonePatients.map(p => (
          <div key={p.id} className="p-4 rounded-lg bg-blue-50 border-l-4 border-primary">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Milestone</span>
              <span className="text-[10px] text-secondary/60">Recent</span>
            </div>
            <p className="text-sm font-bold text-primary mb-1">Form Milestone Met</p>
            <p className="text-xs text-secondary leading-relaxed">
              {p.name} achieved {Math.round(p.avg_form_score)}% avg form. Progression advancement suggested.
            </p>
          </div>
        ))}

        {alertCount === 0 && milestonePatients.length === 0 && (
          <p className="text-sm text-secondary/60 italic text-center pt-4">No active alerts.</p>
        )}
      </div>

      {/* Capacity meter */}
      <div className="mt-auto pt-5 border-t border-primary/10">
        <div className="bg-primary/5 rounded-lg p-4">
          <p className="text-xs font-bold text-secondary mb-2">Facility Capacity</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '78%' }} />
            </div>
            <span className="text-[10px] font-bold text-primary">78%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bottom visualization cards ───────────────────────────────────────────────
function BottomCards({ patients }) {
  const nextPatient = patients.find(p => p.session_id) ?? patients[0]
  const avgRecovery = 42

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Patient Volume Trend bar chart */}
      <div className="bg-white/40 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-bold text-primary text-sm">Patient Volume Trend</h4>
          <span className="material-symbols-outlined text-secondary/40" style={{ fontSize: '18px' }}>more_horiz</span>
        </div>
        <div className="h-28 w-full flex items-end gap-2 px-1">
          {[0.5, 0.75, 0.9, 0.65, 0.8, 1, 0.72].map((h, i) => (
            <motion.div
              key={i}
              className={`flex-1 rounded-t ${i === 5 ? 'bg-primary' : 'bg-primary/20'}`}
              style={{ height: `${h * 100}%` }}
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3 text-[10px] font-bold text-secondary">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* Average Recovery Days donut */}
      <div className="bg-white/40 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-bold text-primary text-sm">Avg Recovery Days</h4>
          <span className="material-symbols-outlined text-secondary/40" style={{ fontSize: '18px' }}>timer</span>
        </div>
        <div className="flex items-center justify-center h-28">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-primary/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="transparent" stroke="currentColor" strokeWidth="3"
              />
              <path
                className="text-primary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="transparent" stroke="currentColor"
                strokeDasharray="75, 100" strokeLinecap="round" strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-primary">{avgRecovery}</span>
              <p className="text-[8px] font-bold text-secondary uppercase">DAYS</p>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-secondary mt-2 font-medium">-4 days from last month</p>
      </div>

      {/* Next Scheduled Session */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="relative z-10">
          <h4 className="font-bold text-primary text-sm mb-4">Next Session</h4>
          {nextPatient ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-white flex flex-col items-center justify-center border border-primary/10 shadow-sm">
                  <span className="text-[10px] font-bold text-secondary uppercase">
                    {new Date().toLocaleString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-black text-primary">{new Date().getDate()}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{nextPatient.name}</p>
                  <p className="text-xs text-secondary">{nextPatient.condition}</p>
                </div>
              </div>
              <button className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-md">
                PREPARE SESSION
              </button>
            </>
          ) : (
            <p className="text-sm text-secondary italic">No sessions scheduled</p>
          )}
        </div>
        <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-primary/5 rotate-12" style={{ fontSize: '100px' }}>event</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ClinicianView() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)

  useEffect(() => {
    getPatients()
      .then(data => setPatients(data.patients ?? []))
      .catch(() => setError('Could not load patients. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (selectedPatient) {
    return (
      <div className="p-6 max-w-[1280px] mx-auto">
        <ClinicalSessionReport patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-outline border-t-primary rounded-full"
          />
          <p className="text-secondary text-sm">Loading patient records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
          <AlertTriangle size={32} className="text-error mx-auto mb-3" />
          <p className="text-error font-bold text-lg mb-1">Connection Error</p>
          <p className="text-secondary text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const alertPatients = patients.filter(p => p.danger_flag)
  const activePatients = patients.filter(p => !p.danger_flag && p.session_id)
  const inactivePatients = patients.filter(p => !p.danger_flag && !p.session_id)
  const orderedPatients = [...alertPatients, ...activePatients, ...inactivePatients]

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Clinician Dashboard</h1>
        <p className="text-sm text-secondary mt-0.5">
          {alertPatients.length > 0
            ? `You have ${alertPatients.length} high-priority alert${alertPatients.length !== 1 ? 's' : ''} across ${patients.length} active patients.`
            : `${patients.length} patient${patients.length !== 1 ? 's' : ''} · All clear`}
        </p>
      </div>

      {/* Weekly AI Digest */}
      {patients.length > 0 && <DigestBanner patients={patients} />}

      {patients.length === 0 ? (
        <div className="bg-white/40 border border-primary/10 rounded-xl p-12 text-center backdrop-blur-sm">
          <p className="text-secondary text-lg italic mb-2">No patients found.</p>
          <p className="text-secondary/60 text-sm">
            Run <code className="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs">python seed.py</code> in the backend folder to add demo patients.
          </p>
        </div>
      ) : (
        <>
          {/* Main 2-column grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Patient Watchlist table — 9 cols */}
            <section className="col-span-12 lg:col-span-9">
              <div className="bg-white/40 border border-primary/10 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-4 border-b border-primary/10 flex justify-between items-center">
                  <h3 className="font-bold text-primary text-base">Patient Watchlist</h3>
                  <button className="text-secondary text-sm font-semibold flex items-center hover:text-primary transition-colors">
                    View All
                    <span className="material-symbols-outlined ml-1" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-primary/5 text-secondary text-[11px] font-bold uppercase tracking-wider">
                        {['Patient', 'Condition', 'Avg Form', 'Reps', 'Status', ''].map(h => (
                          <th key={h} className="px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {orderedPatients.map((p, i) => (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`hover:bg-primary/5 transition-colors cursor-pointer ${p.danger_flag ? 'bg-red-50/60' : ''}`}
                          onClick={() => setSelectedPatient(p)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                {p.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">{p.name}</p>
                                <p className="text-xs text-secondary/60">{p.clinician_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">{p.condition}</td>
                          <td className="px-6 py-4">
                            {p.session_id ? <PhaseBar score={p.avg_form_score} /> : <span className="text-xs text-secondary/40">—</span>}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-primary">
                            {p.total_reps ?? <span className="text-secondary/40">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <StatusChip patient={p} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-secondary/40 hover:text-primary transition-colors">
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Danger patient alert banners */}
              {alertPatients.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="mt-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3"
                >
                  <AlertTriangle size={16} className="text-error flex-shrink-0" />
                  <p className="text-sm font-semibold text-error">
                    <span className="font-bold">{p.name}</span> — Potentially dangerous movement detected. Review session notes.
                  </p>
                  <button
                    onClick={() => setSelectedPatient(p)}
                    className="ml-auto px-3 py-1.5 bg-error text-white text-xs font-bold rounded hover:opacity-90 transition-all flex-shrink-0"
                  >
                    Review
                  </button>
                </motion.div>
              ))}
            </section>

            {/* Clinical Alerts sidebar — 3 cols */}
            <section className="col-span-12 lg:col-span-3">
              <AlertsSidebar patients={patients} />
            </section>
          </div>

          {/* Bottom visualization cards */}
          <BottomCards patients={patients} />
        </>
      )}
    </div>
  )
}
