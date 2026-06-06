import os
import json
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import httpx
from shared.otel import setup_otel

app = FastAPI(title="Sabhi Bank Gateway Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
setup_otel("gateway-service", app)
logger = logging.getLogger("gateway-service")

# Environment variables pointing to other services
SERVICE_URLS = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://auth:8001"),
    "accounts": os.getenv("ACCOUNTS_SERVICE_URL", "http://accounts:8002"),
    "transactions": os.getenv("TRANSACTIONS_SERVICE_URL", "http://transactions:8003"),
    "cards": os.getenv("CARDS_SERVICE_URL", "http://cards:8004"),
    "loans": os.getenv("LOANS_SERVICE_URL", "http://loans:8005"),
    "fd": os.getenv("FD_SERVICE_URL", "http://fd:8006"),
    "notification": os.getenv("NOTIFICATION_SERVICE_URL", "http://notification:8007"),
    "audit": os.getenv("AUDIT_SERVICE_URL", "http://audit:8008"),
    "analytics": os.getenv("ANALYTICS_SERVICE_URL", "http://analytics:8009"),
}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "gateway"}

@app.api_route("/proxy/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(service_name: str, path: str, request: Request):
    if service_name not in SERVICE_URLS:
        raise HTTPException(status_code=404, detail="Service not found")
    target = f"{SERVICE_URLS[service_name]}/{path}"
    logger.info(f"Proxying request to {target}")

    headers = {key: value for key, value in request.headers.items() if key.lower() != 'host'}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                request.method,
                target,
                headers=headers,
                params=request.query_params,
                content=await request.body(),
                timeout=30.0,
            )
    except httpx.RequestError as exc:
        logger.error(f"Request to {target} failed: {exc}")
        return Response(
            content=json.dumps({"detail": "Unable to reach downstream service."}),
            status_code=502,
            media_type="application/json",
        )
    except Exception as exc:
        logger.exception(f"Unexpected proxy error for {target}")
        return Response(
            content=json.dumps({"detail": "Gateway proxy error."}),
            status_code=500,
            media_type="application/json",
        )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
