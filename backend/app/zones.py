import json
import sqlite3
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from .auth import User
from .db import connection
from .schemas import ZoneCreate, ZoneUpdate

router = APIRouter(prefix="/zones", tags=["Hosted zones"])


def get_owned_zone(db, zone_id: str, owner: str):
    row = db.execute("SELECT z.*, (SELECT count(*) FROM records r WHERE r.zone_id=z.id) AS record_count FROM hosted_zones z WHERE z.id=? AND z.owner=?", (zone_id, owner)).fetchone()
    if not row:
        raise HTTPException(404, "Hosted zone not found.")
    return row


def serialize_zone(row):
    return {key: row[key] for key in ("id", "name", "description", "type", "created_at", "record_count")}


def search_pattern(value: str) -> str:
    return "%" + value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@router.get("")
def list_zones(user: User, search: str = Query("", max_length=253), type: Literal["Public", "Private"] | None = None,
               page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
               sort: Literal["name", "type", "record_count", "created_at"] = "name", order: Literal["asc", "desc"] = "asc"):
    where = "z.owner=? AND (z.name LIKE ? ESCAPE '\\' OR z.description LIKE ? ESCAPE '\\')"
    args = [user, search_pattern(search), search_pattern(search)]
    if type:
        where += " AND z.type=?"
        args.append(type)
    with connection() as db:
        total = db.execute(f"SELECT count(*) FROM hosted_zones z WHERE {where}", args).fetchone()[0]
        rows = db.execute(f"SELECT z.*, (SELECT count(*) FROM records r WHERE r.zone_id=z.id) AS record_count FROM hosted_zones z WHERE {where} ORDER BY {sort} {order}, z.id LIMIT ? OFFSET ?", [*args, page_size, (page - 1) * page_size]).fetchall()
    return {"items": [serialize_zone(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_zone(body: ZoneCreate, user: User):
    zone_id = "Z" + uuid.uuid4().hex[:20].upper()
    nameservers = [f"ns-{n}.{zone_id.lower()}.route53.invalid." for n in range(1, 5)]
    try:
        with connection() as db:
            db.execute("INSERT INTO hosted_zones (id, owner, name, description, type) VALUES (?, ?, ?, ?, ?)", (zone_id, user, body.name, body.description.strip(), body.type))
            for record_type, ttl, values in [
                ("NS", 172800, nameservers),
                ("SOA", 900, [f"{nameservers[0]} hostmaster.route53.invalid. 1 7200 900 1209600 86400"]),
            ]:
                db.execute("INSERT INTO records (id, zone_id, name, type, ttl, values_json, system) VALUES (?, ?, ?, ?, ?, ?, 1)", (uuid.uuid4().hex, zone_id, body.name, record_type, ttl, json.dumps(values)))
            result = serialize_zone(get_owned_zone(db, zone_id, user))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A hosted zone with this domain and type already exists.") from None
    return result


@router.get("/{zone_id}")
def get_zone(zone_id: str, user: User):
    with connection() as db:
        return serialize_zone(get_owned_zone(db, zone_id, user))


@router.patch("/{zone_id}")
def edit_zone(zone_id: str, body: ZoneUpdate, user: User):
    with connection() as db:
        get_owned_zone(db, zone_id, user)
        db.execute("UPDATE hosted_zones SET description=? WHERE id=?", (body.description.strip(), zone_id))
        return serialize_zone(get_owned_zone(db, zone_id, user))


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: str, user: User):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        get_owned_zone(db, zone_id, user)
        if db.execute("SELECT count(*) FROM records WHERE zone_id=? AND system=0", (zone_id,)).fetchone()[0]:
            raise HTTPException(409, "Delete all custom records before deleting this hosted zone. The default NS and SOA records can remain.")
        db.execute("DELETE FROM hosted_zones WHERE id=?", (zone_id,))
