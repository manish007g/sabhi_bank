import sqlite3
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Accounts Service")
setup_otel("accounts-service", app)
logger = logging.getLogger("accounts-service")

os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/accounts.db")
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            account_number TEXT PRIMARY KEY,
            user_id INTEGER,
            account_type TEXT,
            balance REAL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class CreateAccountRequest(BaseModel):
    user_id: int
    account_type: str  # "savings" or "checking"
    initial_deposit: float

class BalanceUpdateRequest(BaseModel):
    amount: float

@app.post("/accounts")
def create_account(req: CreateAccountRequest):
    logger.info(f"Creating account for user {req.user_id} with type {req.account_type}")
    import random
    account_num = "".join([str(random.randint(0, 9)) for _ in range(10)])
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO accounts (account_number, user_id, account_type, balance) VALUES (?, ?, ?, ?)",
              (account_num, req.user_id, req.account_type, req.initial_deposit))
    conn.commit()
    conn.close()
    logger.info(f"Created account {account_num} for user {req.user_id}")
    return {"account_number": account_num, "balance": req.initial_deposit, "account_type": req.account_type}

@app.get("/accounts/user/{user_id}")
def get_user_accounts(user_id: int):
    logger.info(f"Fetching accounts for user {user_id}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT account_number, account_type, balance FROM accounts WHERE user_id = ?", (user_id,))
    rows = c.fetchall()
    conn.close()
    
    accounts = [{"account_number": r[0], "account_type": r[1], "balance": r[2]} for r in rows]
    return accounts

@app.get("/accounts/{account_number}")
def get_account(account_number: str):
    logger.info(f"Fetching details for account {account_number}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT account_number, user_id, account_type, balance FROM accounts WHERE account_number = ?", (account_number,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"account_number": row[0], "user_id": row[1], "account_type": row[2], "balance": row[3]}

@app.post("/accounts/{account_number}/adjust-balance")
def adjust_balance(account_number: str, req: BalanceUpdateRequest):
    logger.info(f"Adjusting balance for account {account_number} by {req.amount}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT balance FROM accounts WHERE account_number = ?", (account_number,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
        
    current_balance = row[0]
    new_balance = current_balance + req.amount
    if new_balance < 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    c.execute("UPDATE accounts SET balance = ? WHERE account_number = ?", (new_balance, account_number))
    conn.commit()
    conn.close()
    logger.info(f"Account {account_number} new balance: {new_balance}")
    return {"account_number": account_number, "balance": new_balance}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
