import sqlite3
import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Fixed Deposit Service")
setup_otel("fd-service", app)
logger = logging.getLogger("fd-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/fd.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS fds (
            fd_id TEXT PRIMARY KEY,
            user_id INTEGER,
            amount REAL,
            start_date TEXT,
            maturity_date TEXT,
            interest_rate REAL,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class FDCreateRequest(BaseModel):
    user_id: int
    amount: float
    interest_rate: float
    maturity_date: str  # ISO date string

@app.post("/fds")
def create_fd(req: FDCreateRequest):
    logger.info(f"Creating FD for user {req.user_id}")
    import uuid, datetime
    fd_id = str(uuid.uuid4())
    start_date = datetime.date.today().isoformat()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO fds (fd_id, user_id, amount, start_date, maturity_date, interest_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (fd_id, req.user_id, req.amount, start_date, req.maturity_date, req.interest_rate, "active")
    )
    conn.commit()
    conn.close()
    return {"fd_id": fd_id, "status": "active"}

@app.get("/fds/{fd_id}")
def get_fd(fd_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT fd_id, user_id, amount, start_date, maturity_date, interest_rate, status FROM fds WHERE fd_id = ?", (fd_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="FD not found")
    return {
        "fd_id": row[0],
        "user_id": row[1],
        "amount": row[2],
        "start_date": row[3],
        "maturity_date": row[4],
        "interest_rate": row[5],
        "status": row[6]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
