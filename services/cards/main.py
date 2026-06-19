import sqlite3
import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Cards Service")
setup_otel("cards-service", app)
logger = logging.getLogger("cards-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/cards.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            card_number TEXT PRIMARY KEY,
            user_id INTEGER,
            status TEXT,
            limit_amount REAL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class CardCreateRequest(BaseModel):
    user_id: int
    limit_amount: float

class CardStatusUpdateRequest(BaseModel):
    status: str

@app.post("/cards")
def create_card(req: CardCreateRequest):
    logger.info(f"Creating card for user {req.user_id}")
    import random, string
    card_num = "".join(random.choices(string.digits, k=16))
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO cards (card_number, user_id, status, limit_amount) VALUES (?, ?, ?, ?)",
        (card_num, req.user_id, "active", req.limit_amount),
    )
    conn.commit()
    conn.close()
    return {"card_number": card_num, "status": "active", "limit_amount": req.limit_amount}

@app.get("/cards")
def list_cards():
    logger.info("Listing all cards")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT card_number, user_id, status, limit_amount FROM cards")
    rows = c.fetchall()
    conn.close()
    return [{"card_number": r[0], "user_id": r[1], "status": r[2], "limit_amount": r[3]} for r in rows]

@app.put("/cards/{card_number}/status")
def update_card_status(card_number: str, req: CardStatusUpdateRequest):
    logger.info(f"Updating status for card {card_number} to {req.status}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT card_number FROM cards WHERE card_number = ?", (card_number,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Card not found")
    c.execute("UPDATE cards SET status = ? WHERE card_number = ?", (req.status, card_number))
    conn.commit()
    conn.close()
    return {"card_number": card_number, "status": req.status}

@app.get("/cards/user/{user_id}")
def get_user_cards(user_id: int):
    logger.info(f"Fetching cards for user {user_id}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT card_number, status, limit_amount FROM cards WHERE user_id = ?", (user_id,))
    rows = c.fetchall()
    conn.close()
    return [{"card_number": r[0], "status": r[1], "limit_amount": r[2]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
