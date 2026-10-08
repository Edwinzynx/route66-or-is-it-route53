"""Use the same DNS parser for API validation and BIND serialization."""
import dns.name
import dns.rdata


def parse_value(record_type: str, value: str) -> dns.rdata.Rdata:
    # Unquoted TXT input is literal text. Quoted input uses BIND escape syntax.
    if record_type == "TXT" and not value.startswith('"'):
        value = '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    # Stored target names are absolute, including those without a trailing dot.
    return dns.rdata.from_text(
        "IN", record_type, value, origin=dns.name.root, relativize=False
    )
