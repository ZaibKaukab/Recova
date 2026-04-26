import { useEffect, useState } from 'react'
import { getPatients } from '../api.js'

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

  if (loading) return <p className="text-gray-400">Loading patients...</p>
  if (error) return <p className="text-red-400">{error}</p>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Clinician Dashboard</h1>

      {patients.length === 0 ? (
        <p className="text-gray-500 italic">No patients found. Run <code className="text-teal-400">python seed.py</code> in the backend folder.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {patients.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-white">{p.name}</h2>
                  <p className="text-sm text-gray-400">{p.condition}</p>
                  <p className="text-xs text-gray-500 mt-1">Clinician: {p.clinician_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.danger_flag ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-900 text-red-300 text-xs font-medium">⚠ Alert</span>
                  ) : p.session_id ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-900 text-green-300 text-xs font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs font-medium">No sessions</span>
                  )}
                </div>
              </div>

              {p.session_id && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex gap-6 text-sm mb-2">
                    <span className="text-gray-400">Last session: <span className="text-white">{p.total_reps ?? 0} reps</span></span>
                    <span className="text-gray-400">Avg form: <span className="text-white">{Math.round(p.avg_form_score ?? 0)}%</span></span>
                  </div>
                  {p.claude_summary && (
                    <p className="text-xs text-gray-400 leading-relaxed">{p.claude_summary}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
