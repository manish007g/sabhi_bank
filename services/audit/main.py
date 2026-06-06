import sqlite3
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Audit Service")
setup_otel("audit-service", app)
logger = logging.getLogger("audit-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/audit.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT,
            action TEXT,
            detail TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class AuditRequest(BaseModel):
    service: str
    action: str
    detail: str

@app.post("/audit")
def audit_log(req: AuditRequest):
    logger.info(f"Audit log: {req.service} {req.action} {req.detail}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO audit_logs (service, action, detail) VALUES (?, ?, ?)",
        (req.service, req.action, req.detail),
    )
    conn.commit()
    log_id = c.lastrowid
    conn.close()
    return {"status": "logged", "id": log_id}

@app.get("/audit")
def get_audit_logs():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, service, action, detail, timestamp FROM audit_logs ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    return [
        {"id": r[0], "service": r[1], "action": r[2], "detail": r[3], "timestamp": r[4]}
        for r in rows
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
