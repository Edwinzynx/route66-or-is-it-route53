"""Validate the assignment's nine simple DNS record types without resolving DNS."""
import ipaddress
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .schemas import domain_name

RecordType = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]


def record_name(value: str, zone: str) -> str:
    value = value.strip().lower()
    if value in ("", "@"):
        return zone
    absolute = value.endswith(".")
    value = value.removesuffix(".")
    if value != zone and not value.endswith("." + zone):
        if absolute:
            raise ValueError("The record name must belong to this hosted zone.")
        value += "." + zone
    if len(value) > 253:
        raise ValueError("Record names cannot exceed 253 characters.")
    for index, label in enumerate(value.split(".")):
        if index == 0 and label == "*":
            continue
        if not re.fullmatch(r"[a-z0-9_](?:[a-z0-9_\-]{0,61}[a-z0-9_])?", label):
            raise ValueError("Enter a valid record name. Wildcards are allowed only as the first label.")
    return value


def valid_target(value: str):
    domain_name(value)


def number(value: str, maximum: int = 65535):
    if not value.isascii() or not value.isdigit() or not 0 <= int(value) <= maximum:
        raise ValueError(f"Numeric fields must be integers from 0 to {maximum}.")


class RecordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(default="", max_length=254)
    type: RecordType
    ttl: int = Field(default=300, ge=0, le=2147483647, strict=True)
    values: list[str] = Field(min_length=1, max_length=100)

    @field_validator("values")
    @classmethod
    def clean_values(cls, values):
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 4096 or "\n" in value or "\r" in value for value in cleaned):
            raise ValueError("Provide non-empty record values, one per line, up to 4096 characters each.")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Remove duplicate record values.")
        return cleaned

    @model_validator(mode="after")
    def validate_values(self):
        if self.type == "CNAME" and len(self.values) != 1:
            raise ValueError("CNAME records must contain exactly one destination.")
        for value in self.values:
            try:
                match self.type:
                    case "A":
                        ipaddress.IPv4Address(value)
                    case "AAAA":
                        ipaddress.IPv6Address(value)
                    case "CNAME" | "NS" | "PTR":
                        valid_target(value)
                    case "MX":
                        parts = value.split()
                        if len(parts) != 2:
                            raise ValueError("Use priority and mail server, for example 10 mail.example.com.")
                        number(parts[0])
                        if parts[1] != ".":
                            valid_target(parts[1])
                        elif parts[0] != "0":
                            raise ValueError("A null MX value must be 0 .")
                    case "SRV":
                        parts = value.split()
                        if len(parts) != 4:
                            raise ValueError("Use priority weight port target, for example 10 5 443 service.example.com.")
                        for item in parts[:3]:
                            number(item)
                        if parts[3] != ".":
                            valid_target(parts[3])
                    case "CAA":
                        matched = re.fullmatch(r'(\d+)\s+(issue|issuewild|iodef)\s+"([^"\r\n]+)"', value)
                        if not matched:
                            raise ValueError('Use flags tag "value", for example 0 issue "letsencrypt.org".')
                        number(matched.group(1), 255)
                    case "TXT":
                        # DNS strings can be split into multiple quoted chunks, each at most 255 bytes.
                        if value.startswith('"'):
                            chunks = re.findall(r'"((?:[^"\\]|\\.)*)"', value)
                            remainder = re.sub(r'"(?:[^"\\]|\\.)*"', "", value).strip()
                            if remainder or not chunks or any(len(chunk.encode()) > 255 for chunk in chunks):
                                raise ValueError("Use quoted TXT strings of at most 255 bytes each.")
                        elif '"' in value or len(value.encode()) > 255:
                            raise ValueError("TXT values over 255 bytes must be split into quoted strings.")
            except ValueError as error:
                raise ValueError(f"Invalid {self.type} value: {error}") from None
        return self
