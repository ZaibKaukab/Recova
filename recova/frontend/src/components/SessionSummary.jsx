import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Trophy, RotateCcw, CheckCircle, AlertCircle, TrendingUp, Mail, Check } from 'lucide-react'
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
