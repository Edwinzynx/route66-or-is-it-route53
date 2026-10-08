import hashlib
import os
import secrets
import time
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from .db import connection

router = APIRouter(prefix="/auth", tags=["Authentication"])
COOKIE = "route53_session"
MAX_AGE = 7 * 24 * 60 * 60


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(route53_session: Annotated[str | None, Cookie()] = None) -> str:
    if route53_session:
        with connection() as db:
            session = db.execute("SELECT username FROM sessions WHERE token_hash = ? AND expires_at > ?", (digest(route53_session), int(time.time()))).fetchone()
        if session:
            return session["username"]
    raise HTTPException(401, "Your session has expired. Please sign in again.")


User = Annotated[str, Depends(current_user)]


class Login(BaseModel):
    username: str = Field(min_length=2, max_length=80, pattern=r"^[a-zA-Z0-9@._+\-]+$")


@router.post("/login")
def login(body: Login, response: Response, route53_session: Annotated[str | None, Cookie()] = None):
    token = secrets.token_urlsafe(32)
    username = body.username.lower()
    with connection() as db:
        db.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        if route53_session:
            db.execute("DELETE FROM sessions WHERE token_hash = ?", (digest(route53_session),))
        db.execute("INSERT INTO sessions VALUES (?, ?, ?)", (digest(token), username, int(time.time()) + MAX_AGE))
    response.set_cookie(COOKIE, token, max_age=MAX_AGE, httponly=True, samesite="lax", secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", path="/")
    return {"username": username}


@router.get("/session")
def session(user: User):
    return {"username": user}


@router.post("/logout", status_code=204)
def logout(response: Response, route53_session: Annotated[str | None, Cookie()] = None):
    if route53_session:
        with connection() as db:
            db.execute("DELETE FROM sessions WHERE token_hash = ?", (digest(route53_session),))
    response.delete_cookie(COOKIE, path="/")
