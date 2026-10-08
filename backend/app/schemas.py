import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def domain_name(value: str) -> str:
    value = value.strip().lower().removesuffix(".")
    if len(value) > 253 or not value:
        raise ValueError("Enter a valid domain name, such as example.com.")
    if any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in value.split(".")):
        raise ValueError("Domain labels must contain letters, numbers, or hyphens and cannot start or end with a hyphen.")
    return value


class ZoneCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=254)
    description: str = Field(default="", max_length=256)
    type: Literal["Public", "Private"] = "Public"

    @field_validator("name")
    @classmethod
    def valid_name(cls, value):
        return domain_name(value)


class ZoneUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(max_length=256)
