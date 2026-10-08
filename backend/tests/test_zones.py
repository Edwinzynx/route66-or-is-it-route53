from fastapi.testclient import TestClient
from app.main import app


def test_zone_crud_and_defaults(signed_in):
    created = signed_in.post("/api/zones", json={"name": "Example.COM.", "description": "My domain"})
    assert created.status_code == 201
    zone = created.json()
    assert zone["name"] == "example.com"
    assert zone["record_count"] == 2
    path = f'/api/zones/{zone["id"]}'
    assert signed_in.get(path).json() == zone
    assert signed_in.patch(path, json={"description": "Updated"}).json()["description"] == "Updated"
    assert signed_in.delete(path).status_code == 204
    assert signed_in.get(path).status_code == 404


def test_zone_search_filter_pagination(signed_in):
    for name, kind in [("a.test", "Public"), ("b.test", "Private"), ("c.test", "Public")]:
        assert signed_in.post("/api/zones", json={"name": name, "type": kind}).status_code == 201
    data = signed_in.get("/api/zones?page_size=1&page=2&order=desc").json()
    assert data["total"] == 3 and data["items"][0]["name"] == "b.test"
    assert signed_in.get("/api/zones?type=Private").json()["total"] == 1
    assert signed_in.get("/api/zones?search=c.test").json()["total"] == 1
    assert signed_in.get("/api/zones?search=%25").json()["total"] == 0
    assert signed_in.get("/api/zones?page=0").status_code == 422


def test_zone_validation_duplicates_and_ownership(signed_in):
    assert signed_in.post("/api/zones", json={"name": "-bad..com"}).status_code == 422
    zone = signed_in.post("/api/zones", json={"name": "test.com"}).json()
    assert signed_in.post("/api/zones", json={"name": "TEST.COM."}).status_code == 409
    assert signed_in.patch(f'/api/zones/{zone["id"]}', json={"name": "rename.com", "description": ""}).status_code == 422
    signed_in.post("/api/auth/login", json={"username": "another-user"})
    assert signed_in.get("/api/zones").json()["total"] == 0
    assert signed_in.delete(f'/api/zones/{zone["id"]}').status_code == 404


def test_zones_persist_after_restart(signed_in):
    zone = signed_in.post("/api/zones", json={"name": "persist.test"}).json()
    with TestClient(app) as restarted:
        restarted.post("/api/auth/login", json={"username": "demo"})
        assert restarted.get(f'/api/zones/{zone["id"]}').json()["name"] == "persist.test"


def test_zone_requires_auth(client):
    assert client.get("/api/zones").status_code == 401
