import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Notification Service")
setup_otel("notification-service", app)
logger = logging.getLogger("notification-service")

class NotificationRequest(BaseModel):
    message: str

@app.post("/notify")
def notify(req: NotificationRequest):
    logger.info(f"Notification received: {req.message}")
    # In a real system this could push to SMS, email, etc.
    return {"status": "sent", "message": req.message}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
