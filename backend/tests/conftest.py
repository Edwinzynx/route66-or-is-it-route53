import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as client:
        yield client


@pytest.fixture
def signed_in(client):
    assert client.post("/api/auth/login", json={"username": "demo"}).status_code == 200
    return client
