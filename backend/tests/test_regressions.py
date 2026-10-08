"""Regression coverage for invalid DNS text and oversized pagination."""
import json

import dns.rdata
import dns.zone
import pytest

from app.db import connection


@pytest.fixture
def zone_api(signed_in):
    zone = signed_in.post("/api/zones", json={"name": "regression.example"}).json()
    return signed_in, f'/api/zones/{zone["id"]}'


@pytest.mark.parametrize("value", [
    r'"bad\999"', r'"bad\12"', r'"bad\256"',
    '"' + r'\097' * 256 + '"', '"' + '\u00e9' * 128 + '"',
], ids=["escape-999", "short-escape", "escape-256", "256-decoded-bytes", "256-utf8-bytes"])
def test_invalid_txt_escapes_rejected_without_writes(zone_api, value):
    client, path = zone_api
    body = {"name": "txt", "type": "TXT", "values": [value]}
    response = client.post(path + "/records", json=body)
    assert response.status_code == 422, response.text
    assert client.get(path + "/records").json()["total"] == 2

    body["values"] = ['"original"']
    record = client.post(path + "/records", json=body).json()
    response = client.put(path + "/records/" + record["id"], json={**body, "values": [value]})
    assert response.status_code == 422, response.text
    assert client.get(path + "/records/" + record["id"]).json()["values"] == ['"original"']
    assert client.get(path + "/export?format=bind").status_code == 200


@pytest.mark.parametrize("value,expected", [
    (r'"say \"hello\" and \092"', (b'say "hello" and \\',)),
    ('"' + r'\097' * 255 + '"', (b'a' * 255,)),
    (r'plain\999', (br'plain\999',)),
    ('"' + '\u00e9' * 127 + 'a"', (('\u00e9' * 127 + 'a').encode('utf-8'),)),
    ('"' + 'a' * 255 + '" "' + 'b' * 255 + '"', (b'a' * 255, b'b' * 255)),
], ids=["escaped-quote-and-backslash", "255-decoded-bytes", "literal-backslash", "255-utf8-bytes", "multiple-chunks"])
def test_valid_txt_escapes_export_without_changing_bytes(zone_api, value, expected):
    client, path = zone_api
    record = client.post(path + "/records", json={"name": "txt", "type": "TXT", "values": [value]})
    assert record.status_code == 201, record.text
    exported = client.get(path + "/export?format=bind")
    assert exported.status_code == 200, exported.text
    parsed = dns.zone.from_text(exported.text, origin="regression.example.")
    assert next(iter(parsed.get_rdataset("txt", "TXT"))).strings == expected
    # Reimport after removal proves exported text remains compatible with the importer.
    assert client.delete(path + "/records/" + record.json()["id"]).status_code == 204
    imported = client.post(path + "/import", json={"content": exported.text, "preview": False})
    assert imported.status_code == 200, imported.text
    stored = client.get(path + "/records?type=TXT").json()["items"][0]
    assert dns.rdata.from_text("IN", "TXT", stored["values"][0]).strings == expected


def test_legacy_invalid_txt_export_returns_actionable_error(zone_api):
    client, path = zone_api
    record = client.post(path + "/records", json={"name": "legacy", "type": "TXT", "values": ['"ok"']}).json()
    # Simulate a record saved before strict escape validation was introduced.
    with connection() as db:
        db.execute("UPDATE records SET values_json=? WHERE id=?", (json.dumps([r'"bad\999"']), record["id"]))
    response = client.get(path + "/export?format=bind")
    assert response.status_code == 422
    assert "legacy.regression.example" in response.json()["detail"]
    assert "JSON" in response.json()["detail"]
    exported = client.get(path + "/export?format=json")
    assert exported.status_code == 200
    assert next(r for r in exported.json()["records"] if r["id"] == record["id"])["values"] == [r'"bad\999"']


@pytest.mark.parametrize("resource", ["zones", "records"])
@pytest.mark.parametrize("page", [1_000_001, 10**30])
def test_oversized_page_is_validation_error(zone_api, resource, page):
    client, path = zone_api
    endpoint = "/api/zones" if resource == "zones" else path + "/records"
    response = client.get(endpoint, params={"page": page, "page_size": 100})
    assert response.status_code == 422
    assert any(error["loc"] == ["query", "page"] for error in response.json()["detail"])


@pytest.mark.parametrize("resource", ["zones", "records"])
def test_largest_supported_page_and_normal_pages(zone_api, resource):
    client, path = zone_api
    endpoint = "/api/zones" if resource == "zones" else path + "/records"
    response = client.get(endpoint, params={"page": 1_000_000, "page_size": 100})
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == (1 if resource == "zones" else 2)
    response = client.get(endpoint, params={"page": 1, "page_size": 1})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
