import sqlite3
import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Loans Service")
setup_otel("loans-service", app)
logger = logging.getLogger("loans-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/loans.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS loans (
            loan_id TEXT PRIMARY KEY,
            user_id INTEGER,
            amount REAL,
            interest_rate REAL,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class LoanRequest(BaseModel):
    user_id: int
    amount: float
    interest_rate: float

@app.post("/loans")
def create_loan(req: LoanRequest):
    logger.info(f"Creating loan for user {req.user_id}")
    import uuid
    loan_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO loans (loan_id, user_id, amount, interest_rate, status) VALUES (?, ?, ?, ?, ?)",
        (loan_id, req.user_id, req.amount, req.interest_rate, "pending")
    )
    conn.commit()
    conn.close()
    return {"loan_id": loan_id, "status": "pending"}

@app.get("/loans/{loan_id}")
def get_loan(loan_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT loan_id, user_id, amount, interest_rate, status FROM loans WHERE loan_id = ?", (loan_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Loan not found")
    return {
        "loan_id": row[0],
        "user_id": row[1],
        "amount": row[2],
        "interest_rate": row[3],
        "status": row[4]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
