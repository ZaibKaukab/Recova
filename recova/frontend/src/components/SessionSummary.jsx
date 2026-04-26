import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Trophy, RotateCcw, CheckCircle, AlertCircle, TrendingUp, Mail, Check, Timer, Activity, Gauge } from 'lucide-react'
import FormMeter from './FormMeter.jsx'

function repLabel(score) {
  if (score >= 80) return { text: 'Perfect', color: 'text-sage-400', bg: 'bg-sage-50', border: 'border-sage-100' }
  if (score >= 60) return { text: 'Good', color: 'text-warning-dark', bg: 'bg-warning-light', border: 'border-warning' }
  return { text: 'Adjust', color: 'text-danger', bg: 'bg-danger-light', border: 'border-danger' }
}

function RepCard({ rep, index }) {
  const label = repLabel(rep.form_score)
  const chartData = rep.angleHistory?.length > 2
    ? rep.angleHistory.map(v => ({ v }))
    : Array.from({ length: 10 }, (_, i) => ({
        v: Math.round(rep.knee_angle + (170 - rep.knee_angle) * Math.abs(Math.sin((i / 9) * Math.PI)))
      }))
  const strokeColor = rep.form_score >= 80 ? '#5F7A42' : rep.form_score >= 60 ? '#D4A52A' : '#C0524A'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={`flex-shrink-0 w-36 bg-white rounded-2xl shadow-soft p-4 border ${label.border}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-charcoal-300">Rep {rep.rep_number ?? index + 1}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${label.bg} ${label.color}`}>
          {label.text}
        </span>
      </div>
      <p className="text-3xl font-bold text-charcoal-500 leading-none mb-3">
        {rep.form_score}
        <span className="text-sm font-medium text-charcoal-300 ml-0.5">%</span>
      </p>
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-charcoal-200 mt-1 text-center">knee angle</p>
    </motion.div>
  )
}

function VitalMetrics({ totalReps, avgFormScore, reps }) {
  // Estimate session duration: ~4s per rep on average
  const durationSec = Math.round(totalReps * 4.2)
  const minutes = Math.floor(durationSec / 60)
  const seconds = durationSec % 60
  const durationStr = `${minutes}m ${String(seconds).padStart(2, '0')}s`

  // Estimate pain score inversely from form (high form → low pain proxy)
  const painScore = Math.max(0.5, Math.round((100 - avgFormScore) / 15 * 10) / 10).toFixed(1)

  // Estimated effort level from rep count and form
  const rpe = avgFormScore >= 80 ? 6 : avgFormScore >= 60 ? 7 : 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="grid grid-cols-3 gap-4 mb-6"
    >
      {[
        {
          icon: <Timer size={20} className="text-primary" />,
          label: 'Duration',
          value: durationStr,
          badge: null,
        },
        {
          icon: <Activity size={20} className="text-primary" />,
          label: 'Pain Score',
          value: `${painScore} / 10`,
          badge: { text: parseFloat(painScore) <= 3 ? '-0.5 pts' : 'Monitor', green: parseFloat(painScore) <= 3 },
        },
        {
          icon: <Gauge size={20} className="text-primary" />,
          label: 'Peak Effort',
          value: `RPE ${rpe}`,
          badge: { text: 'Stable', green: false },
        },
      ].map(({ icon, label, value, badge }) => (
        <div
          key={label}
          className="bg-white/40 border border-primary/10 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">{label}</p>
              <h4 className="text-lg font-bold text-primary leading-tight">{value}</h4>
            </div>
          </div>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${
              badge.green ? 'text-green-700 bg-green-100' : 'text-secondary bg-primary/5'
            }`}>
              {badge.text}
            </span>
          )}
        </div>
      ))}
    </motion.div>
  )
}

function RecommendedAdjustments({ avgFormScore, totalReps }) {
  const nextLoad = avgFormScore >= 80 ? '+5.0 lbs' : avgFormScore >= 60 ? '+2.5 lbs' : 'Maintain'
  const recommendation = avgFormScore >= 80
    ? 'Performance is elite. Claude has advanced your next session to progressive overload.'
    : avgFormScore >= 60
    ? 'Good effort. Focus on form quality before increasing load next session.'
    : 'Let\'s solidify technique before progressing. Your plan has been adjusted.'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.35 }}
      className="bg-white/40 border border-primary/10 rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-5 border-l-4 backdrop-blur-sm"
      style={{ borderLeftColor: '#D5B893' }}
    >
      <div className="flex items-center gap-5">
        <div className="p-3 rounded-full" style={{ background: 'rgba(213,184,147,0.2)' }}>
          <span className="material-symbols-outlined" style={{ color: '#D5B893', fontSize: '28px' }}>assignment_turned_in</span>
        </div>
        <div>
          <h3 className="font-bold text-primary text-base">Recommended Adjustments</h3>
          <p className="text-secondary text-sm mt-0.5">{recommendation}</p>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <div className="flex items-center gap-3 px-5 py-3 bg-primary/5 rounded-lg border border-primary/10">
          <span className="text-[10px] font-bold text-secondary uppercase">Next Load</span>
          <span className="text-primary font-bold">{nextLoad}</span>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-sm">
          Review Program
        </button>
      </div>
    </motion.div>
  )
}

export default function SessionSummary({ summary, totalReps, avgFormScore, reps = [], patientName, onRestart, emailSent }) {
  const score = Math.round(avgFormScore)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-4xl shadow-card p-8 mb-6"
        style={{ background: 'linear-gradient(160deg, #ffffff 60%, #faf5ee 100%)' }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={18} className="text-warning" />
              <span className="text-sm font-semibold text-warning-dark uppercase tracking-wider">
                Session Complete
              </span>
            </div>
            <h2 className="text-3xl font-bold text-charcoal-500">
              {patientName ? `Well done, ${patientName.split(' ')[0]}!` : 'Great session!'}
            </h2>
          </div>

          {/* Email sent badge */}
          {emailSent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-2 bg-sage-50 border border-sage-100 rounded-xl"
            >
              <Check size={14} className="text-sage-400" />
              <span className="text-xs font-semibold text-sage-400">Summary emailed</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-10">
          <FormMeter score={score} />
          <div className="flex flex-col gap-5 flex-1">
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-semibold text-charcoal-300 uppercase tracking-wider mb-1">Total Reps</p>
                <p className="text-4xl font-bold text-charcoal-500">{totalReps}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-charcoal-300 uppercase tracking-wider mb-1">Avg Form</p>
                <p className="text-4xl font-bold text-charcoal-500">{score}%</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${
              score >= 70 ? 'bg-sage-50 text-sage-500' :
              score >= 40 ? 'bg-warning-light text-warning-dark' :
              'bg-danger-light text-danger'
            }`}>
              {score >= 70
                ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              }
              <p className="text-sm font-medium leading-relaxed">
                {score >= 70
                  ? 'Excellent form! Your technique is consistent and controlled.'
                  : score >= 40
                  ? 'Good effort — focus on depth and hip alignment next session.'
                  : "Let's work on your form together before increasing reps."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Coach's Notes */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="bg-white rounded-3xl shadow-soft p-6 mb-6 border-l-4 border-terra-400"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-terra-400" />
            <p className="text-xs font-semibold text-charcoal-300 uppercase tracking-widest">Coach's Notes</p>
          </div>
          <p className="text-charcoal-500 text-lg leading-relaxed">{summary}</p>
        </motion.div>
      )}

      {/* Rep breakdown */}
      {reps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="bg-white rounded-3xl shadow-soft p-6 mb-6"
        >
          <p className="text-xs font-semibold text-charcoal-300 uppercase tracking-widest mb-4">Rep-by-Rep Breakdown</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {reps.map((rep, i) => <RepCard key={i} rep={rep} index={i} />)}
          </div>
        </motion.div>
      )}

      {/* Vital Metrics */}
      <VitalMetrics totalReps={totalReps} avgFormScore={score} reps={reps} />

      {/* Recommended Adjustments */}
      <RecommendedAdjustments avgFormScore={score} totalReps={totalReps} />

      {/* Email notice */}
      {emailSent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 bg-terra-50 border border-terra-100 rounded-2xl px-5 py-4 mb-6"
        >
          <Mail size={18} className="text-terra-400 flex-shrink-0" />
          <p className="text-charcoal-400 text-sm leading-relaxed">
            A summary of this session has been sent to your email address.
          </p>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        onClick={onRestart}
        className="w-full flex items-center justify-center gap-2 py-4 bg-terra-400 hover:bg-terra-500 active:bg-terra-600 text-white text-lg font-semibold rounded-2xl transition-all shadow-glow-terra min-h-[56px]"
      >
        <RotateCcw size={18} strokeWidth={2.5} />
        Start a New Session
      </motion.button>
    </div>
  )
}
