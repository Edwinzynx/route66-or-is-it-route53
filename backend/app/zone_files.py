"""BIND conversion, without file includes, network access, or DNS resolution."""
import json
from typing import get_args

import dns.name
import dns.rdata
import dns.rdataclass
import dns.rdatatype
import dns.tokenizer
import dns.zone
import dns.zonefile

from .dns_validation import RecordInput, RecordType, record_name

MAX_IMPORT_RECORDS = 1000


def parse_bind(content: str, zone_name: str):
    parsed = dns.zone.Zone(zone_name + ".", relativize=False)
    count = 0

    def validate_put(txn, name, dataset):
        nonlocal count
        count += 1
        if count > 10000:
            raise ValueError("Import is limited to 10,000 individual record values.")
        owner = record_name(name.to_text(), zone_name)
        kind = dns.rdatatype.to_text(dataset.rdtype)
        if kind not in get_args(RecordType) and not (kind == "SOA" and owner == zone_name):
            raise ValueError(f"Unsupported record type: {kind}.")
        node = txn.get_node(name)
        if node:
            for old in node.rdatasets:
                if old.rdtype != dataset.rdtype and dns.rdatatype.CNAME in (old.rdtype, dataset.rdtype):
                    raise ValueError(f"CNAME conflicts with another record at {owner}.")
                if old.rdtype == dataset.rdtype == dns.rdatatype.CNAME and old != dataset:
                    raise ValueError(f"CNAME must have only one destination at {owner}.")

    with parsed.writer(replacement=True) as txn:
        txn.check_put_rdataset(validate_put)
        tokenizer = dns.tokenizer.Tokenizer(content, "zone file")
        reader = dns.zonefile.Reader(tokenizer, dns.rdataclass.IN, txn, allow_include=False,
                                     allow_directives=["$ORIGIN", "$TTL"])
        # Reader otherwise silently ignores out-of-zone owners. Widen its input
        # boundary so the transaction rejects them; retain the real transaction
        # origin for SOA checks and current_origin for relative target names.
        reader.zone_origin = dns.name.root
        try:
            reader.read()
        except KeyError:
            raise ValueError("All record names must belong to this hosted zone.") from None
    records, skipped = [], []
    for name, dataset in parsed.iterate_rdatasets():
        owner = record_name(name.to_text(), zone_name)
        kind = dns.rdatatype.to_text(dataset.rdtype)
        if owner == zone_name and kind in ("NS", "SOA"):
            skipped.append(f"{owner} {kind}: kept this hosted zone's default record.")
            continue
        records.append(RecordInput(name=owner + ".", type=kind, ttl=dataset.ttl,
                                   values=[value.to_text(origin=dns.name.root, relativize=False) for value in dataset]))
    if len(records) > MAX_IMPORT_RECORDS:
        raise ValueError(f"Import is limited to {MAX_IMPORT_RECORDS} record sets.")
    if not records and not skipped:
        raise ValueError("The file does not contain any DNS records.")
    return records, skipped


def export_bind(zone_name: str, records: list[dict]) -> str:
    lines = ["; Route 53 Clone export — simulated DNS; not a live delegation.", f"$ORIGIN {zone_name}.", "$TTL 300"]
    for record in records:
        for value in record["values"]:
            if record["type"] == "TXT" and not value.startswith('"'):
                value = '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
            # Stored target names are fully qualified, even without a final dot.
            rdata = dns.rdata.from_text("IN", record["type"], value, origin=dns.name.root, relativize=False)
            lines.append(f'{record["name"]}. {record["ttl"]} IN {record["type"]} {rdata.to_text()}')
    return "\n".join(lines) + "\n"


def export_json(zone: dict, records: list[dict]) -> str:
    return json.dumps({"version": 1, "zone": dict(zone), "records": records}, indent=2) + "\n"
