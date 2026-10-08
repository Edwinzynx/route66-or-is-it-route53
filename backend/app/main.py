from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import auth, zones, records
from .db import connection, initialize


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    yield


app = FastAPI(title="Route 53 Clone API", version="1.0.0", lifespan=lifespan)
app.include_router(auth.router, prefix="/api")
app.include_router(zones.router, prefix="/api")
app.include_router(records.router, prefix="/api")


@app.get("/api/health", tags=["System"])
def health():
    with connection() as db:
        db.execute("SELECT 1")
    return {"status": "ok"}
