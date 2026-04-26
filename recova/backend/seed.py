import sqlite3
from database import init_db, DB_PATH

init_db()

patients = [
    {
        "name": "Eleanor Voss",
        "email": "eleanor@demo.com",
        "condition": "Post knee replacement (left)",
        "clinician_name": "Dr. Rivera",
        "exercise_name": "squat",
        "target_sets": 3,
        "target_reps": 10,
        "target_angle_min": 70.0,
        "target_angle_max": 170.0,
    },
    {
        "name": "Marcus Chen",
        "email": "marcus@demo.com",
        "condition": "ACL reconstruction recovery",
        "clinician_name": "Dr. Rivera",
        "exercise_name": "squat",
        "target_sets": 2,
        "target_reps": 8,
        "target_angle_min": 80.0,
        "target_angle_max": 170.0,
    },
    {
        "name": "Rosa Delgado",
        "email": "rosa@demo.com",
        "condition": "Hip flexor rehabilitation",
        "clinician_name": "Dr. Patel",
        "exercise_name": "squat",
        "target_sets": 3,
        "target_reps": 12,
        "target_angle_min": 75.0,
        "target_angle_max": 170.0,
    },
]

conn = sqlite3.connect(DB_PATH)
for p in patients:
    try:
        conn.execute(
            """INSERT INTO patients
               (name, email, condition, clinician_name, exercise_name,
                target_sets, target_reps, target_angle_min, target_angle_max)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (p["name"], p["email"], p["condition"], p["clinician_name"],
             p["exercise_name"], p["target_sets"], p["target_reps"],
             p["target_angle_min"], p["target_angle_max"])
        )
        print(f"Inserted: {p['name']}")
    except sqlite3.IntegrityError:
        print(f"Already exists: {p['name']}")
conn.commit()
conn.close()
print("Done. Login with: eleanor@demo.com, marcus@demo.com, or rosa@demo.com")
