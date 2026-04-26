const BASE = '/api'

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())

export const loginPatient = (email) => post('/patient/login', { email })
export const startSession = (patient_id) => post('/session/start', { patient_id })
export const submitRep = (repData) => post('/rep', repData)
export const endSession = (session_id) => post('/session/end', { session_id })
export const getPatients = () => fetch(`${BASE}/clinician/patients`).then(r => r.json())
export const getPatientDetail = (id) => fetch(`${BASE}/clinician/patient/${id}`).then(r => r.json())
