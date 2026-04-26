import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are Recova, an AI assistant helping patients do physical therapy at home. Keep feedback to 2 sentences. Plain language only. Never diagnose. Never tell patients to push through pain. Always warm and encouraging. If they mention pain, say: Stop and call your physical therapist."""


def get_rep_feedback(rep_data):
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=120,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"""
Exercise: {rep_data.get("exercise_name", "squat")}
Rep {rep_data.get("rep_number")}, knee angle reached: {rep_data.get("knee_angle")}°
Target range: {rep_data.get("target_min", 70)}° to {rep_data.get("target_max", 170)}°
Form flags: {rep_data.get("flags") or "none"}
Form score: {rep_data.get("form_score")}%
Give one piece of encouraging feedback in 2 sentences."""}]
        )
        return msg.content[0].text
    except Exception:
        return "Good effort on that rep! Keep your movements slow and controlled."


def get_session_summary(reps):
    if not reps:
        return "Great job starting your session today! Keep up the consistent effort."
    try:
        avg_score = sum(r.get("form_score", 0) for r in reps) / len(reps)
        flags_all = [r.get("flags", "") for r in reps if r.get("flags")]
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"""
Session complete. {len(reps)} reps performed.
Average form score: {avg_score:.0f}%
Common flags: {", ".join(flags_all) if flags_all else "none"}
Write a 3-sentence session summary: one encouraging sentence for the patient, one clinical observation for the clinician's records, and one tip for next session."""}]
        )
        return msg.content[0].text
    except Exception:
        return f"You completed {len(reps)} reps today — excellent dedication to your recovery! Your therapist will review your progress."
