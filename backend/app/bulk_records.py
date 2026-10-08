"""Atomic bulk actions on explicitly selected records in an owned zone."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import User
from .db import connection
from .records import get_record
from .zones import get_owned_zone

router = APIRouter(prefix="/zones/{zone_id}/records", tags=["DNS records"])


class BulkInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation: Literal["delete", "ttl"]
    ids: list[str] = Field(min_length=1, max_length=100)
    ttl: int | None = Field(default=None, ge=0, le=2147483647, strict=True)

    @model_validator(mode="after")
    def validate_action(self):
        if len(set(self.ids)) != len(self.ids):
            raise ValueError("Each selected record must appear only once.")
        if self.operation == "ttl" and self.ttl is None:
            raise ValueError("Enter a TTL for the selected records.")
        if self.operation == "delete" and self.ttl is not None:
            raise ValueError("TTL is not applicable to deletion.")
        return self


@router.post("/bulk")
def bulk_records(zone_id: str, body: BulkInput, user: User):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        get_owned_zone(db, zone_id, user)
        for record_id in body.ids:
            record = get_record(db, zone_id, record_id)
            if record["system"]:
                raise HTTPException(409, "Default NS/SOA records cannot be changed by bulk actions. Nothing was changed.")
        if body.operation == "delete":
            db.executemany("DELETE FROM records WHERE zone_id=? AND id=?", [(zone_id, rid) for rid in body.ids])
        else:
            db.executemany("UPDATE records SET ttl=? WHERE zone_id=? AND id=?", [(body.ttl, zone_id, rid) for rid in body.ids])
    return {"affected": len(body.ids)}
