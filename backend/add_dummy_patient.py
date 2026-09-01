import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.database import SessionLocal
from models.db_models import Patient

db = SessionLocal()
if not db.query(Patient).filter(Patient.name == "Jane Doe").first():
    dummy = Patient(
        name="Jane Doe",
        room_no="101A",
        consultant="Dr. Smith",
        procedure="Appendectomy",
        admitted_date="2026-09-01",
        status="admitted"
    )
    db.add(dummy)
    db.commit()
    print("Dummy patient added!")
else:
    print("Dummy patient already exists.")
