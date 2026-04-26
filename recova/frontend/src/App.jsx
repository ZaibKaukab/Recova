import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PatientView from './pages/PatientView.jsx'
import ClinicianView from './pages/ClinicianView.jsx'

export default function App() {
  const [page, setPage] = useState('patient')

  return (
    <div className="min-h-screen" style={{ background: '#E7E2DB' }}>
      <header
        className="sticky top-0 z-50 h-16 px-6 flex items-center justify-between border-b border-outline"
        style={{ background: 'rgba(225, 217, 205, 0.92)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white fill-icon" style={{ fontSize: '16px' }}>fitness_center</span>
          </div>
          <span className="text-lg font-black text-primary tracking-tight">Recova PT</span>
        </div>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => setPage('patient')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              page === 'patient'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:bg-primary/5'
            }`}
          >
            My Session
          </button>
          <button
            onClick={() => setPage('clinician')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              page === 'clinician'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:bg-primary/5'
            }`}
          >
            Clinician
          </button>
        </nav>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {page === 'patient' ? <PatientView /> : <ClinicianView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
