import { AnimatePresence, motion } from 'framer-motion'

export default function FeedbackPanel({ feedback, isLoading, repCount = 0 }) {
  return (
    <div className="data-card flex flex-col overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white fill-icon" style={{ fontSize: '15px' }}>auto_awesome</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary leading-none">AI Physical Therapist</h3>
            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Real-time guidance</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-4 min-h-[120px]">
        {isLoading ? (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Analysing rep...</span>
              <div className="flex items-center gap-1.5 mt-2">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay }}
                    className="w-1.5 h-1.5 rounded-full block"
                    style={{ background: '#617891' }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={feedback || 'empty'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 ring-4"
                  style={{
                    background: feedback ? '#D5B893' : '#CBC3B7',
                    ringColor: feedback ? 'rgba(213,184,147,0.15)' : 'transparent',
                  }}
                />
              </div>
              <div>
                {feedback ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#D5B893' }}>
                      {repCount > 0 ? `Rep ${repCount} feedback` : 'Live Analysis'}
                    </span>
                    <p className="text-sm text-primary font-medium mt-1 leading-relaxed">{feedback}</p>
                    <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                      style={{ background: 'rgba(213,184,147,0.12)', border: '1px solid rgba(213,184,147,0.25)' }}>
                      <span className="material-symbols-outlined flex-shrink-0" style={{ color: '#D5B893', fontSize: '16px' }}>lightbulb</span>
                      <p className="text-xs text-secondary leading-relaxed">Focus on controlled movement and steady breathing throughout each rep.</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm italic text-secondary mt-1">Complete a rep to hear from your coach.</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
