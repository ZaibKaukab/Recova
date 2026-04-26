# Recova — AI Physical Therapy Coach

Claude Builder Hackathon · React + Vite · Python Flask · SQLite · MediaPipe · Claude Haiku

## Quick Start (2 terminals)

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python seed.py      # seed 3 demo patients (run once)
python app.py       # → http://localhost:5000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev         # → http://localhost:5173
```

Open http://localhost:5173 — allow camera — log in as a demo patient.

## Demo Logins
| Name | Email |
|------|-------|
| Eleanor Voss | eleanor@demo.com |
| Marcus Chen | marcus@demo.com |
| Rosa Delgado | rosa@demo.com |

## Team Workstreams

| Student | Area | Key files |
|---------|------|-----------|
| A (you) | Pose engine | `frontend/src/components/PoseCamera.jsx` |
| B | UI + Clinician dashboard | `FeedbackPanel.jsx`, `SessionSummary.jsx`, `ClinicianView.jsx` |
| C | Flask API + Claude | `backend/app.py`, `backend/claude.py`, `backend/database.py` |
| D | Integration + demo prep | `backend/seed.py`, demo fixture JSON |

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/patient/login` | POST | `{email}` → patient record |
| `/api/session/start` | POST | `{patient_id}` → `{session_id}` |
| `/api/rep` | POST | rep data → Claude feedback |
| `/api/session/end` | POST | `{session_id}` → Claude summary |
| `/api/clinician/patients` | GET | all patients + last session stats |

## MediaPipe Landmarks Used
- **Knee angle**: `lm[23]` (hip) → `lm[25]` (knee) → `lm[27]` (ankle)
- **Hip angle**: `lm[11]` (shoulder) → `lm[23]` (hip) → `lm[25]` (knee)
