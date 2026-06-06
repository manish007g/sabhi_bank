import sqlite3
import os
import logging
from fastapi import FastAPI
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Analytics Service")
setup_otel("analytics-service", app)
logger = logging.getLogger("analytics-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/analytics.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric TEXT,
            value REAL,
            tags TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class MetricRequest(BaseModel):
    metric: str
    value: float
    tags: str = ""

@app.post("/metrics")
def ingest_metric(req: MetricRequest):
    logger.info(f"Ingesting metric {req.metric} value={req.value} tags={req.tags}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO analytics (metric, value, tags) VALUES (?, ?, ?)",
        (req.metric, req.value, req.tags),
    )
    conn.commit()
    metric_id = c.lastrowid
    conn.close()
    return {"status": "ingested", "id": metric_id}

@app.get("/metrics")
def get_metrics():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, metric, value, tags, timestamp FROM analytics ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    return [
        {"id": r[0], "metric": r[1], "value": r[2], "tags": r[3], "timestamp": r[4]}
        for r in rows
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
