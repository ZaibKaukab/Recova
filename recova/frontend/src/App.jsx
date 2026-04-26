import { useState } from 'react'
import PatientView from './pages/PatientView.jsx'
import ClinicianView from './pages/ClinicianView.jsx'

export default function App() {
  const [page, setPage] = useState('patient')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-teal-400">Recova</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage('patient')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              page === 'patient'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Patient View
          </button>
          <button
            onClick={() => setPage('clinician')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              page === 'clinician'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Clinician Dashboard
          </button>
        </div>
      </nav>

      <main className="p-6">
        {page === 'patient' ? <PatientView /> : <ClinicianView />}
      </main>
    </div>
  )
}
