import sqlite3
import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Auth Service")
setup_otel("auth-service", app)
logger = logging.getLogger("auth-service")

SECRET_KEY = "sabhi_bank_super_secret"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MAX_PASSWORD_BYTES = 72

def validate_password(password: str):
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Password is too long. Maximum {MAX_PASSWORD_BYTES} bytes are supported.",
        )

# Database setup
os.makedirs("/data", exist_ok=True)
DB_FILE = os.getenv("DB_FILE", "/data/auth.db")
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            email TEXT,
            full_name TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class UserRegister(BaseModel):
    username: str
    password: str
    email: str
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/register")
def register(user: UserRegister):
    logger.info(f"Registering user: {user.username}")
    validate_password(user.password)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    hashed = pwd_context.hash(user.password)
    try:
        c.execute("INSERT INTO users (username, password, email, full_name) VALUES (?, ?, ?, ?)",
                  (user.username, hashed, user.email, user.full_name))
        conn.commit()
        user_id = c.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()
    
    logger.info(f"Successfully registered user {user.username} with ID {user_id}")
    return {"message": "User registered successfully", "user_id": user_id}

@app.post("/login", response_model=Token)
def login(credentials: UserLogin):
    logger.info(f"Login attempt for user: {credentials.username}")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, password FROM users WHERE username = ?", (credentials.username,))
    row = c.fetchone()
    
    validate_password(credentials.password)

    # Auto-register if user doesn't exist
    if not row:
        logger.info(f"User {credentials.username} not found, auto-registering...")
        hashed = pwd_context.hash(credentials.password)
        try:
            c.execute("INSERT INTO users (username, password, email, full_name) VALUES (?, ?, ?, ?)",
                      (credentials.username, hashed, f"{credentials.username}@bank.com", credentials.username))
            conn.commit()
            user_id = c.lastrowid
            logger.info(f"Auto-registered user {credentials.username} with ID {user_id}")
        except sqlite3.IntegrityError:
            conn.close()
            logger.warning(f"Failed to auto-register user: {credentials.username}")
            raise HTTPException(status_code=400, detail="Username already exists")
    else:
        # Verify password for existing user
        if not pwd_context.verify(credentials.password, row[1]):
            conn.close()
            logger.warning(f"Failed login attempt for user: {credentials.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        user_id = row[0]
    
    conn.close()
    
    token_data = {"sub": credentials.username, "user_id": user_id}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"Successful login for user: {credentials.username}")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/verify")
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload.get("sub"), "user_id": payload.get("user_id")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
