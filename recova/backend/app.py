from flask import Flask, request, jsonify
from flask_cors import CORS
from database import (
    init_db, insert_rep, get_patient, get_session_reps,
    insert_session, update_session, get_all_patients_with_last_session
)
from claude import get_rep_feedback, get_session_summary
from email_service import send_session_email

app = Flask(__name__)
CORS(app)
init_db()


@app.route("/api/patient/login", methods=["POST"])
def patient_login():
    email = request.json.get("email", "").strip()
    if not email:
        return jsonify({"error": "email required"}), 400
    patient = get_patient(email)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify(patient)


@app.route("/api/session/start", methods=["POST"])
def session_start():
    patient_id = request.json.get("patient_id")
    if not patient_id:
        return jsonify({"error": "patient_id required"}), 400
    session_id = insert_session(patient_id)
    return jsonify({"session_id": session_id})


@app.route("/api/rep", methods=["POST"])
def save_rep():
    data = request.json
    if not data:
        return jsonify({"error": "body required"}), 400
    feedback = get_rep_feedback(data)
    data["claude_feedback"] = feedback
    insert_rep(data)
    return jsonify({"feedback": feedback})


@app.route("/api/session/end", methods=["POST"])
def end_session():
    session_id = request.json.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    reps = get_session_reps(session_id)
    summary = get_session_summary(reps)
    total = len(reps)
    avg = sum(r.get("form_score", 0) for r in reps) / total if total else 0
    danger = 1 if any("danger" in (r.get("flags") or "") for r in reps) else 0
    update_session(session_id, summary, total, avg, danger)
    return jsonify({"summary": summary, "total_reps": total, "avg_form_score": round(avg, 1)})


@app.route("/api/clinician/patients", methods=["GET"])
def clinician_patients():
    patients = get_all_patients_with_last_session()
    return jsonify({"patients": patients})


@app.route("/api/clinician/patient/<int:patient_id>", methods=["GET"])
def clinician_patient_detail(patient_id):
    from database import get_db
    conn = get_db()
    sessions = conn.execute(
        "SELECT * FROM sessions WHERE patient_id = ? ORDER BY started_at DESC",
        (patient_id,)
    ).fetchall()
    result = []
    for s in sessions:
        s_dict = dict(s)
        s_dict["reps"] = get_session_reps(s_dict["id"])
        result.append(s_dict)
    conn.close()
    return jsonify({"sessions": result})


@app.route("/api/session/email", methods=["POST"])
def email_summary():
    data = request.json or {}
    to_email = data.get("email")
    patient_name = data.get("patient_name", "")
    form_score = data.get("avg_form_score", 0)
    total_reps = data.get("total_reps", 0)
    summary = data.get("summary", "")
    reps = data.get("reps", [])

    if not to_email:
        return jsonify({"error": "email required"}), 400

    result = send_session_email(to_email, patient_name, form_score, total_reps, summary, reps)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
