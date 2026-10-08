import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def record_api(signed_in):
    zone = signed_in.post("/api/zones", json={"name": "example.com"}).json()
    return signed_in, f'/api/zones/{zone["id"]}/records', zone["id"]


@pytest.mark.parametrize("kind,value", [
    ("A", "192.0.2.1"), ("AAAA", "2001:db8::1"), ("CNAME", "target.example.net."),
    ("TXT", '"v=spf1 -all"'), ("MX", "10 mail.example.com."), ("NS", "ns.example.net."),
    ("PTR", "host.example.com."), ("SRV", "10 5 443 service.example.com."), ("CAA", '0 issue "letsencrypt.org"'),
])
def test_all_record_types_crud(record_api, kind, value):
    client, path, zone_id = record_api
    body = {"name": "www", "type": kind, "ttl": 300, "values": [value]}
    response = client.post(path, json=body)
    assert response.status_code == 201, response.text
    record = response.json()
    assert record["name"] == "www.example.com"
    assert client.get(path + "/" + record["id"]).json()["values"] == [value]
    body["ttl"] = 600
    assert client.put(path + "/" + record["id"], json=body).json()["ttl"] == 600
    assert client.delete(f"/api/zones/{zone_id}").status_code == 409
    assert client.delete(path + "/" + record["id"]).status_code == 204
    assert client.get(path + "/" + record["id"]).status_code == 404
    assert client.delete(f"/api/zones/{zone_id}").status_code == 204


@pytest.mark.parametrize("kind,value", [("A", "999.1.2.3"), ("AAAA", "1.2.3.4"), ("MX", "mail.example.com"), ("SRV", "10 20 99999 x.com"), ("CAA", '256 issue "x.com"'), ("TXT", '"unclosed'), ("NS", "https://x.com")])
def test_invalid_values_rejected(record_api, kind, value):
    client, path, _ = record_api
    assert client.post(path, json={"name": "www", "type": kind, "values": [value]}).status_code == 422


def test_defaults_conflicts_and_scope(record_api):
    client, path, _ = record_api
    defaults = client.get(path).json()["items"]
    assert {row["type"] for row in defaults} == {"NS", "SOA"}
    for record in defaults:
        assert client.delete(path + "/" + record["id"]).status_code == 409
    base = {"name": "www", "type": "A", "values": ["192.0.2.1"]}
    assert client.post(path, json=base).status_code == 201
    assert client.post(path, json=base).status_code == 409
    assert client.post(path, json={"name": "www", "type": "CNAME", "values": ["target.com"]}).status_code == 409
    assert client.post(path, json={"name": "@", "type": "CNAME", "values": ["target.com"]}).status_code == 422
    assert client.post(path, json={**base, "name": "outside.com."}).status_code == 422
    assert client.post(path, json={**base, "name": "new", "ttl": -1}).status_code == 422
    assert client.post(path, json={**base, "name": "new", "ttl": 1.5}).status_code == 422
    assert client.post(path, json={"name": "*", "type": "NS", "values": ["ns.example.com"]}).status_code == 422


def test_record_search_pagination_restart_and_isolation(record_api):
    client, path, zone_id = record_api
    record = client.post(path, json={"name": "www", "type": "A", "values": ["192.0.2.1"]}).json()
    assert client.get(path + "?search=192.0.2.1").json()["total"] == 1
    assert client.get(path + "?type=A").json()["total"] == 1
    assert len(client.get(path + "?page_size=1&page=2").json()["items"]) == 1
    with TestClient(app) as restarted:
        restarted.post("/api/auth/login", json={"username": "demo"})
        assert restarted.get(path + "/" + record["id"]).json()["values"] == ["192.0.2.1"]
    other_zone = client.post("/api/zones", json={"name": "other.com"}).json()["id"]
    assert client.delete(f'/api/zones/{other_zone}/records/{record["id"]}').status_code == 404
    client.post("/api/auth/login", json={"username": "other-user"})
    assert client.get(path).status_code == 404
    assert client.delete(path + "/" + record["id"]).status_code == 404
