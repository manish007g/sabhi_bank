import sqlite3
import os
import logging
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel
from opentelemetry.propagate import inject

app = FastAPI(title="Sabhi Bank Transactions Service")
setup_otel("transactions-service", app)
logger = logging.getLogger("transactions-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/transactions.db")
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_account TEXT,
            to_account TEXT,
            amount REAL,
            type TEXT, -- "transfer", "deposit", "withdraw"
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class TransactionRequest(BaseModel):
    from_account: str = None
    to_account: str = None
    amount: float
    type: str  # "transfer", "deposit", "withdraw"

ACCOUNTS_SERVICE_URL = os.getenv("ACCOUNTS_SERVICE_URL", "http://accounts:8002")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification:8007")
AUDIT_SERVICE_URL = os.getenv("AUDIT_SERVICE_URL", "http://audit:8008")

@app.post("/transactions")
async def create_transaction(req: TransactionRequest):
    logger.info(f"Initiating transaction: {req.type} of amount {req.amount}")
    
    headers = {}
    inject(headers)
    
    async with httpx.AsyncClient() as client:
        # 1. Update accounts
        if req.type == "deposit":
            # Add balance
            res = await client.post(f"{ACCOUNTS_SERVICE_URL}/{req.to_account}/adjust-balance", 
                                    json={"amount": req.amount}, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
        elif req.type == "withdraw":
            # Subtract balance
            res = await client.post(f"{ACCOUNTS_SERVICE_URL}/{req.from_account}/adjust-balance", 
                                    json={"amount": -req.amount}, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
        elif req.type == "transfer":
            # Subtract from origin
            res1 = await client.post(f"{ACCOUNTS_SERVICE_URL}/{req.from_account}/adjust-balance", 
                                     json={"amount": -req.amount}, headers=headers)
            if res1.status_code != 200:
                raise HTTPException(status_code=res1.status_code, detail=res1.text)
            
            # Add to destination
            res2 = await client.post(f"{ACCOUNTS_SERVICE_URL}/{req.to_account}/adjust-balance", 
                                     json={"amount": req.amount}, headers=headers)
            if res2.status_code != 200:
                # Rollback source
                await client.post(f"{ACCOUNTS_SERVICE_URL}/{req.from_account}/adjust-balance", 
                                  json={"amount": req.amount}, headers=headers)
                raise HTTPException(status_code=res2.status_code, detail="Failed transfer to destination account; rolled back origin.")
        else:
            raise HTTPException(status_code=400, detail="Invalid transaction type")

        # 2. Record locally
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO transactions (from_account, to_account, amount, type) VALUES (?, ?, ?, ?)",
                  (req.from_account, req.to_account, req.amount, req.type))
        conn.commit()
        tx_id = c.lastrowid
        conn.close()

        # 3. Call Audit asynchronously
        try:
            audit_payload = {
                "service": "transactions-service",
                "action": f"create_transaction_{req.type}",
                "detail": f"TX {tx_id}: {req.amount} from {req.from_account} to {req.to_account}"
            }
            await client.post(f"{AUDIT_SERVICE_URL}/audit", json=audit_payload, headers=headers)
        except Exception as e:
            logger.error(f"Audit log failed: {str(e)}")

        # 4. Call Notification asynchronously
        try:
            notif_payload = {
                "message": f"Alert: {req.type.upper()} of ${req.amount} completed successfully."
            }
            await client.post(f"{NOTIFICATION_SERVICE_URL}/notify", json=notif_payload, headers=headers)
        except Exception as e:
            logger.error(f"Notification failed: {str(e)}")

        logger.info(f"Transaction {tx_id} successfully recorded.")
        return {"message": "Transaction successful", "transaction_id": tx_id}

@app.get("/transactions")
def list_transactions():
    logger.info("Listing all transactions")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        SELECT id, from_account, to_account, amount, type, timestamp 
        FROM transactions 
        ORDER BY timestamp DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "from_account": r[1],
            "to_account": r[2],
            "amount": r[3],
            "type": r[4],
            "timestamp": r[5]
        }
        for r in rows
    ]

@app.get("/transactions/account/{account_number}")
def get_account_transactions(account_number: str):
    logger.info(f"Fetching transactions for account {account_number}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        SELECT id, from_account, to_account, amount, type, timestamp 
        FROM transactions 
        WHERE from_account = ? OR to_account = ?
        ORDER BY timestamp DESC
    """, (account_number, account_number))
    rows = c.fetchall()
    conn.close()
    
    txs = [{
        "id": r[0],
        "from_account": r[1],
        "to_account": r[2],
        "amount": r[3],
        "type": r[4],
        "timestamp": r[5]
    } for r in rows]
    return txs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
