import sqlite3
import datetime

DB_PATH = "recova.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE,
        condition TEXT, clinician_name TEXT,
        exercise_name TEXT, target_sets INTEGER, target_reps INTEGER,
        target_angle_min REAL, target_angle_max REAL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY, patient_id INTEGER,
        started_at TEXT, ended_at TEXT,
        total_reps INTEGER, avg_form_score REAL,
        claude_summary TEXT, danger_flag INTEGER DEFAULT 0
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS reps (
        id INTEGER PRIMARY KEY, session_id INTEGER,
        rep_number INTEGER, set_number INTEGER,
        knee_angle REAL, hip_angle REAL, form_score REAL,
        flags TEXT, claude_feedback TEXT, created_at TEXT
    )""")
    conn.commit()
    conn.close()


def get_patient(email):
    conn = get_db()
    row = conn.execute("SELECT * FROM patients WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def insert_session(patient_id):
    conn = get_db()
    now = datetime.datetime.utcnow().isoformat()
    cur = conn.execute(
        "INSERT INTO sessions (patient_id, started_at) VALUES (?, ?)",
        (patient_id, now)
    )
    session_id = cur.lastrowid
    conn.commit()
    conn.close()
    return session_id


def insert_rep(data):
    conn = get_db()
    now = datetime.datetime.utcnow().isoformat()
    cur = conn.execute(
        """INSERT INTO reps
           (session_id, rep_number, set_number, knee_angle, hip_angle,
            form_score, flags, claude_feedback, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("session_id"),
            data.get("rep_number"),
            data.get("set_number", 1),
            data.get("knee_angle"),
            data.get("hip_angle"),
            data.get("form_score"),
            data.get("flags", ""),
            data.get("claude_feedback", ""),
            now,
        )
    )
    conn.commit()
    conn.close()
    return cur.lastrowid


def get_session_reps(session_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM reps WHERE session_id = ? ORDER BY rep_number",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_session(session_id, summary, total_reps, avg_score, danger=0):
    conn = get_db()
    now = datetime.datetime.utcnow().isoformat()
    conn.execute(
        """UPDATE sessions SET ended_at=?, total_reps=?, avg_form_score=?,
           claude_summary=?, danger_flag=? WHERE id=?""",
        (now, total_reps, avg_score, summary, danger, session_id)
    )
    conn.commit()
    conn.close()


def get_all_patients_with_last_session():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.*,
               s.id as session_id, s.started_at, s.total_reps,
               s.avg_form_score, s.claude_summary, s.danger_flag
        FROM patients p
        LEFT JOIN sessions s ON s.id = (
            SELECT id FROM sessions WHERE patient_id = p.id
            ORDER BY started_at DESC LIMIT 1
        )
        ORDER BY p.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]
