from fastapi.testclient import TestClient
from app.main import app


def test_login_session_logout(client):
    assert client.get("/api/auth/session").status_code == 401
    result = client.post("/api/auth/login", json={"username": "Demo"})
    assert result.json() == {"username": "demo"}
    assert "HttpOnly" in result.headers["set-cookie"]
    assert client.get("/api/auth/session").json()["username"] == "demo"
    token = client.cookies.get("route53_session")
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.set("route53_session", token)
    assert client.get("/api/auth/session").status_code == 401


def test_session_survives_application_restart(signed_in):
    token = signed_in.cookies.get("route53_session")
    with TestClient(app) as restarted:
        restarted.cookies.set("route53_session", token)
        assert restarted.get("/api/auth/session").status_code == 200


def test_invalid_login(client):
    assert client.post("/api/auth/login", json={"username": " "}).status_code == 422
