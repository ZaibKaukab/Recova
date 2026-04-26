import { motion } from 'framer-motion'

const getTheme = (score) => {
  if (score >= 70) return { stroke: '#25344F', label: 'Great Form', color: '#25344F' }
  if (score >= 40) return { stroke: '#D5B893', label: 'Good Effort', color: '#917A4A' }
  return { stroke: '#BA1A1A', label: 'Needs Work', color: '#BA1A1A' }
}

export default function FormMeter({ score = 0 }) {
  const { stroke, label, color } = getTheme(score)
  const r = 40
  const circumference = 2 * Math.PI * r
  const dashoffset = circumference * (1 - score / 100)

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Form Score</p>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={r}
            fill="transparent"
            stroke="rgba(37,52,79,0.1)"
            strokeWidth="8"
          />
          <motion.circle
            cx="50" cy="50" r={r}
            fill="transparent"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={score}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="text-3xl font-black leading-none"
            style={{ color }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-bold mt-0.5" style={{ color }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
