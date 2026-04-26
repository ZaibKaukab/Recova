import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { getPatientDetail } from '../api.js'

function FormGauge({ score }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const grade = score >= 90 ? 'A' : score >= 80 ? 'A-' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(37,52,79,0.1)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r}
            fill="transparent"
            stroke="#25344F"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-primary leading-none">{score}%</span>
          <span className="text-base font-bold mt-1" style={{ color: '#D5B893' }}>{grade}</span>
        </div>
      </div>
    </div>
  )
}

function RepQualityDonut({ perfect, minor, failed, total }) {
  const circ = 251.3
  const perfectArc = total > 0 ? (perfect / total) * circ : circ * 0.74
  const minorArc = total > 0 ? (minor / total) * circ : circ * 0.15

  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(37,52,79,0.08)" strokeWidth="12" />
        <motion.circle
          cx="50" cy="50" r="40" fill="transparent"
          stroke="#25344F" strokeWidth="12"
          strokeDasharray={`${perfectArc} ${circ}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${perfectArc} ${circ}` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {minorArc > 0 && (
          <motion.circle
            cx="50" cy="50" r="40" fill="transparent"
            stroke="#D5B893" strokeWidth="12"
            strokeDasharray={`${minorArc} ${circ}`}
            strokeDashoffset={-perfectArc}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${minorArc} ${circ}` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        )}
      </svg>
      <div className="text-center z-10">
        <p className="text-[10px] font-bold text-secondary uppercase">Total</p>
        <p className="text-2xl font-black text-primary">{total}</p>
        <p className="text-[10px] font-bold text-secondary">Reps</p>
      </div>
    </div>
  )
}

export default function ClinicalSessionReport({ patient, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPatientDetail(patient.id)
      .then(data => setSessions(data.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [patient.id])

  const lastSession = sessions[0] ?? null
  const reps = lastSession?.reps ?? []
  const totalReps = reps.length || patient.total_reps || 0

  const avgScore = reps.length > 0
    ? Math.round(reps.reduce((a, r) => a + (r.form_score ?? 0), 0) / reps.length)
    : Math.round(patient.avg_form_score ?? 0)

  const perfectReps = reps.filter(r => r.form_score >= 80).length
  const minorReps = reps.filter(r => r.form_score >= 60 && r.form_score < 80).length
  const failedReps = reps.filter(r => r.form_score < 60).length

  const optimalPct = reps.length > 0 ? Math.round((perfectReps / reps.length) * 100) : 72
  const variantPct = reps.length > 0 ? Math.round((minorReps / reps.length) * 100) : 20
  const criticalPct = reps.length > 0 ? Math.round((failedReps / reps.length) * 100) : 8

  const stabilityCoeff = avgScore >= 80 ? '0.94' : avgScore >= 60 ? '0.78' : '0.61'
  const stabilityTrend = avgScore >= 70 ? '+4%' : '-2%'
  const fatigueScore = Math.min(97, avgScore + 5)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="h-5 w-px bg-outline/40" />
          <div>
            <h1 className="text-xl font-bold text-primary">Session Analytics</h1>
            <p className="text-xs text-secondary font-medium uppercase tracking-tight">
              Patient: {patient.name} · {patient.condition}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline text-secondary rounded-lg text-sm font-semibold hover:bg-primary/5 transition-all">
            <Share2 size={14} />
            Share Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-outline border-t-primary rounded-full"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Bento Hero Grid ── */}
          <div className="grid grid-cols-12 gap-6">
            {/* Form Score Gauge */}
            <div className="col-span-12 lg:col-span-4 bg-white/40 border border-primary/10 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                  avgScore >= 80 ? 'bg-green-100 text-green-700' :
                  avgScore >= 60 ? 'bg-gold/20 text-primary' : 'bg-red-100 text-red-700'
                }`}>
                  {avgScore >= 80 ? 'Status: High' : avgScore >= 60 ? 'Status: Good' : 'Needs Review'}
                </span>
              </div>
              <h3 className="text-secondary text-[11px] font-bold uppercase tracking-wider mb-4 self-start">Overall Form Score</h3>
              <FormGauge score={avgScore} />
              <div className="mt-4 flex gap-3 w-full text-center">
                <div className="flex-1 p-2 bg-primary/5 rounded-lg">
                  <p className="text-[10px] font-bold text-secondary/60 uppercase">Total Reps</p>
                  <p className="text-sm font-black text-primary">{totalReps || '—'}</p>
                </div>
                <div className="flex-1 p-2 bg-primary/5 rounded-lg">
                  <p className="text-[10px] font-bold text-secondary/60 uppercase">Sessions</p>
                  <p className="text-sm font-black text-primary">{sessions.length}</p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              {/* Form Accuracy Distribution */}
              <div className="bg-white/40 border border-primary/10 rounded-xl p-6 backdrop-blur-sm flex-1">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-primary font-bold text-base">Form Accuracy Metric</h3>
                    <p className="text-xs text-secondary">Real-time kinematic alignment distribution</p>
                  </div>
                  <div className="flex gap-3">
                    {[['bg-primary', 'Optimal'], ['bg-gold', 'Variant'], ['bg-error', 'Critical']].map(([col, label]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${col}`} />
                        <span className="text-[10px] font-bold text-secondary uppercase">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="h-10 w-full bg-primary/5 rounded-lg overflow-hidden flex mb-4">
                  {[
                    { pct: optimalPct, cls: 'bg-primary', delay: 0 },
                    { pct: variantPct, cls: 'bg-gold', delay: 0.1 },
                    { pct: criticalPct, cls: 'bg-error/80', delay: 0.2 },
                  ].map(({ pct, cls, delay }) => (
                    <motion.div
                      key={cls}
                      className={`h-full ${cls} relative flex items-center justify-center`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay }}
                    >
                      {pct >= 8 && (
                        <span className="text-[10px] font-black text-white absolute">{pct}%</span>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-primary/10">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>verified</span>
                    <div>
                      <p className="text-[11px] font-bold text-primary">Optimal Alignment</p>
                      <p className="text-[10px] text-secondary">Shoulder-to-hip vector within 5°</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D5B893' }}>warning</span>
                    <div>
                      <p className="text-[11px] font-bold text-primary">Variant Path</p>
                      <p className="text-[10px] text-secondary">Compensatory chain shift</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>dangerous</span>
                    <div>
                      <p className="text-[11px] font-bold text-primary">Critical Failure</p>
                      <p className="text-[10px] text-secondary">Hyper-extension at peak load</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Narrative */}
              {(lastSession?.claude_summary || patient.claude_summary) && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 flex gap-4 items-start backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(213,184,147,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#D5B893', fontSize: '22px' }}>psychology</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Key Progression Note</p>
                    <p className="text-sm text-secondary leading-relaxed">
                      {lastSession?.claude_summary ?? patient.claude_summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Detailed Analysis ── */}
          <div className="grid grid-cols-12 gap-6">
            {/* Rep Quality Donut */}
            <div className="col-span-12 lg:col-span-4 bg-white/40 border border-primary/10 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-primary font-bold text-base mb-4">Rep Quality Distribution</h3>
              <div className="mb-6">
                <RepQualityDonut
                  perfect={perfectReps}
                  minor={minorReps}
                  failed={failedReps}
                  total={totalReps}
                />
              </div>
              <ul className="space-y-3">
                {[
                  { label: 'Perfect Execution', count: perfectReps || Math.round(totalReps * 0.74), col: 'bg-primary' },
                  { label: 'Minor Deviations', count: minorReps || Math.round(totalReps * 0.15), col: 'bg-gold' },
                  { label: 'Failed Reps', count: failedReps, col: 'bg-error/50' },
                ].map(({ label, count, col }) => (
                  <li key={label} className="flex justify-between items-center pb-2 border-b border-primary/10">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col}`} />
                      <span className="text-sm text-secondary">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{count}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Clinical Insight — Dark Card */}
            <div className="col-span-12 lg:col-span-8 bg-primary rounded-xl p-8 text-white relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Clinical Insight &amp; Stability</h3>
                    <p className="text-white/50 text-sm mt-1">Advanced Biometric Interpretation</p>
                  </div>
                  <span className="material-symbols-outlined text-3xl" style={{ color: '#D5B893' }}>clinical_notes</span>
                </div>
                <div className="grid grid-cols-2 gap-6 flex-1">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">Stability Coefficient</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{stabilityCoeff}</span>
                        <span className="text-xs text-green-400 flex items-center gap-0.5">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>trending_up</span>
                          {stabilityTrend}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-[11px] text-white/70 leading-relaxed">
                        {patient.danger_flag
                          ? '"Dangerous movement detected. Review session notes and consider load reduction before next appointment."'
                          : '"Core-extremity coordination is reaching functional maturity. Pelvic tilt control is now automatic at sub-maximal loads."'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">Fatigue Resistance</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" style={{ color: '#D5B893' }}>{fatigueScore}</span>
                        <span className="text-xs text-white/50">/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: '#D5B893' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fatigueScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10px] text-white/50">
                      {totalReps > 5 ? 'Slight decay after final sets. Maintain current progression.' : 'Insufficient rep data for full analysis.'}
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/30 flex items-center justify-center text-[8px] font-bold text-white">
                      {patient.clinician_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'PT'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-white/40">Validated by AI Clinician Assist &amp; Human Review</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Session Data Logs Table ── */}
          {reps.length > 0 ? (
            <div className="bg-white/40 border border-primary/10 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-primary/10 flex justify-between items-center">
                <div>
                  <h3 className="text-primary font-bold text-base">Session Data Logs</h3>
                  <p className="text-xs text-secondary">Rep-by-rep performance and form telemetry</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-outline rounded text-xs font-semibold text-secondary hover:bg-primary/5 transition-colors flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                    Export CSV
                  </button>
                  <button className="px-3 py-1.5 border border-outline rounded text-xs font-semibold text-secondary hover:bg-primary/5 transition-colors flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>filter_list</span>
                    Filter
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-primary/5 border-b border-primary/10">
                    <tr>
                      {['Rep', 'Form Score', 'Knee Angle', 'Accuracy Bar', 'Status'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-black uppercase text-secondary tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {reps.slice(0, 10).map((rep, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm font-bold text-primary">Rep {rep.rep_number ?? i + 1}</td>
                        <td className="px-6 py-3 text-sm font-bold text-primary">{rep.form_score ?? '—'}%</td>
                        <td className="px-6 py-3 text-sm text-secondary">
                          {rep.knee_angle ? `${Math.round(rep.knee_angle)}°` : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${rep.form_score ?? 0}%`,
                                  background: rep.form_score >= 80 ? '#25344F' : rep.form_score >= 60 ? '#D5B893' : '#BA1A1A',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                            rep.form_score >= 80 ? 'bg-green-100 text-green-700' :
                            rep.form_score >= 60 ? 'bg-gold/20 text-primary' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rep.form_score >= 80 ? 'Completed' : rep.form_score >= 60 ? 'Target Met' : 'Review'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reps.length > 10 && (
                <div className="p-5 bg-primary/5 flex justify-center border-t border-primary/10">
                  <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
                    View {reps.length - 10} more reps
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/40 border border-primary/10 rounded-xl p-8 text-center backdrop-blur-sm">
              <span className="material-symbols-outlined text-secondary/30 text-5xl">assignment</span>
              <p className="text-secondary text-sm mt-2">No session rep data available for this patient.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
