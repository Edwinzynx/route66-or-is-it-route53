import json
import sqlite3
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from .auth import User
from .db import connection
from .dns_validation import RecordInput, record_name
from .pagination import PageNumber, PageSize
from .zones import get_owned_zone, search_pattern

router = APIRouter(prefix="/zones/{zone_id}/records", tags=["DNS records"])


def serialize_record(row):
    return {"id": row["id"], "zone_id": row["zone_id"], "name": row["name"], "type": row["type"], "ttl": row["ttl"], "values": json.loads(row["values_json"]), "system": bool(row["system"])}


def get_record(db, zone_id, record_id):
    row = db.execute("SELECT * FROM records WHERE zone_id=? AND id=?", (zone_id, record_id)).fetchone()
    if not row:
        raise HTTPException(404, "DNS record not found.")
    return row


def check_record(db, zone, body, exclude_id=""):
    try:
        name = record_name(body.name, zone["name"])
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    if body.type == "CNAME" and name == zone["name"]:
        raise HTTPException(422, "A CNAME record cannot be created at the zone apex. Enter a subdomain.")
    if body.type == "NS" and name.startswith("*."):
        raise HTTPException(422, "NS records cannot use a wildcard name.")
    existing = db.execute("SELECT type FROM records WHERE zone_id=? AND name=? AND id<>?", (zone["id"], name, exclude_id)).fetchall()
    if existing and (body.type == "CNAME" or any(row["type"] == "CNAME" for row in existing)):
        raise HTTPException(409, "A CNAME cannot share its name with another record. Remove the conflicting record first.")
    return name


@router.get("")
def list_records(zone_id: str, user: User, search: str = Query("", max_length=253),
                 type: Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"] | None = None,
                 page: PageNumber = 1, page_size: PageSize = 10,
                 sort: Literal["name", "type", "ttl"] = "name", order: Literal["asc", "desc"] = "asc"):
    where = "zone_id=? AND (name LIKE ? ESCAPE '\\' OR values_json LIKE ? ESCAPE '\\')"
    args = [zone_id, search_pattern(search), search_pattern(search)]
    if type:
        where += " AND type=?"
        args.append(type)
    with connection() as db:
        get_owned_zone(db, zone_id, user)
        total = db.execute(f"SELECT count(*) FROM records WHERE {where}", args).fetchone()[0]
        rows = db.execute(f"SELECT * FROM records WHERE {where} ORDER BY {sort} {order}, type, id LIMIT ? OFFSET ?", [*args, page_size, (page - 1) * page_size]).fetchall()
    return {"items": [serialize_record(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_record(zone_id: str, body: RecordInput, user: User):
    record_id = uuid.uuid4().hex
    try:
        with connection() as db:
            db.execute("BEGIN IMMEDIATE")
            zone = get_owned_zone(db, zone_id, user)
            name = check_record(db, zone, body)
            db.execute("INSERT INTO records (id, zone_id, name, type, ttl, values_json) VALUES (?, ?, ?, ?, ?, ?)", (record_id, zone_id, name, body.type, body.ttl, json.dumps(body.values)))
            return serialize_record(get_record(db, zone_id, record_id))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A record with this name and type already exists. Edit that record to add values.") from None


@router.get("/{record_id}")
def read_record(zone_id: str, record_id: str, user: User):
    with connection() as db:
        get_owned_zone(db, zone_id, user)
        return serialize_record(get_record(db, zone_id, record_id))


@router.put("/{record_id}")
def update_record(zone_id: str, record_id: str, body: RecordInput, user: User):
    try:
        with connection() as db:
            db.execute("BEGIN IMMEDIATE")
            zone = get_owned_zone(db, zone_id, user)
            old = get_record(db, zone_id, record_id)
            if old["system"]:
                raise HTTPException(409, "Default NS and SOA records are read-only in this clone.")
            name = check_record(db, zone, body, record_id)
            db.execute("UPDATE records SET name=?, type=?, ttl=?, values_json=? WHERE id=?", (name, body.type, body.ttl, json.dumps(body.values), record_id))
            return serialize_record(get_record(db, zone_id, record_id))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A record with this name and type already exists.") from None


@router.delete("/{record_id}", status_code=204)
def delete_record(zone_id: str, record_id: str, user: User):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        get_owned_zone(db, zone_id, user)
        record = get_record(db, zone_id, record_id)
        if record["system"]:
            raise HTTPException(409, "Default NS and SOA records are deleted with their hosted zone.")
        db.execute("DELETE FROM records WHERE id=?", (record_id,))
