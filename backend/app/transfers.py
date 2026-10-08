"""Owned hosted-zone exports and atomic, create-only BIND imports."""
import json
import sqlite3
import uuid
from typing import Literal

import dns.exception
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .auth import User
from .db import connection
from .records import check_record, serialize_record
from .zone_files import export_bind, export_json, parse_bind
from .zones import get_owned_zone, serialize_zone

router = APIRouter(prefix="/zones/{zone_id}", tags=["Zone files"])


class ImportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=1_000_000)
    preview: bool = True


@router.get("/export")
def export_zone(zone_id: str, user: User, format: Literal["json", "bind"] = "json"):
    with connection() as db:
        db.execute("BEGIN")
        zone = serialize_zone(get_owned_zone(db, zone_id, user))
        records = [serialize_record(row) for row in db.execute(
            "SELECT * FROM records WHERE zone_id=? ORDER BY name,type", (zone_id,))]
    content = export_json(zone, records) if format == "json" else export_bind(zone["name"], records)
    suffix = "json" if format == "json" else "zone"
    return Response(content, media_type="application/json" if format == "json" else "text/plain",
                    headers={"Content-Disposition": f'attachment; filename="{zone["name"]}.{suffix}"',
                             "Cache-Control": "no-store"})


@router.post("/import")
def import_records(zone_id: str, body: ImportInput, user: User):
    if len(body.content.encode("utf-8")) > 1_000_000:
        raise HTTPException(422, "Zone files must be no larger than 1 MB.")
    try:
        with connection() as db:
            db.execute("BEGIN IMMEDIATE")
            zone = get_owned_zone(db, zone_id, user)
            records, skipped = parse_bind(body.content, zone["name"])
            preview = []
            for record in records:
                name = check_record(db, zone, record)
                if db.execute("SELECT 1 FROM records WHERE zone_id=? AND name=? AND type=?",
                              (zone_id, name, record.type)).fetchone():
                    raise HTTPException(409, f"{name} {record.type} already exists. No records were imported.")
                db.execute("INSERT INTO records (id,zone_id,name,type,ttl,values_json) VALUES (?,?,?,?,?,?)",
                           (uuid.uuid4().hex, zone_id, name, record.type, record.ttl, json.dumps(record.values)))
                preview.append({**record.model_dump(), "name": name})
            if body.preview:
                db.rollback()
            return {"records": preview, "skipped": skipped, "imported": 0 if body.preview else len(preview)}
    except ValidationError as error:
        raise HTTPException(422, error.errors()[0]["msg"]) from None
    except (dns.exception.DNSException, ValueError) as error:
        raise HTTPException(422, f"Invalid zone file: {error}") from None
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Conflicting records. No records were imported.") from None
