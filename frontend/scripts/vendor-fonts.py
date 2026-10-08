"""Vendor the Open Sans weights supplied by Cloudscape; no npm dependency."""
import base64
import io
from pathlib import Path
import re
import tarfile
from urllib.request import urlopen

SOURCE = "https://registry.npmjs.org/@cloudscape-design/global-styles/-/global-styles-1.0.71.tgz"
out = Path(__file__).resolve().parents[1] / "public" / "fonts"
out.mkdir(parents=True, exist_ok=True)
with urlopen(SOURCE, timeout=30) as response:
    archive = tarfile.open(fileobj=io.BytesIO(response.read()))
css = archive.extractfile("package/fonts.css").read().decode()
for block in re.findall(r"@font-face\s*\{[^}]+\}", css):
    if "'Open Sans'" not in block or "font-style: normal" not in block:
        continue
    weight = re.search(r"font-weight: (\d+)", block).group(1)
    if weight in {"400", "700"}:
        data = re.search(r"base64,([A-Za-z0-9+/=]+)", block).group(1)
        (out / f"open-sans-{weight}.woff2").write_bytes(base64.b64decode(data))
for name in ("LICENSE", "NOTICE", "THIRD-PARTY-LICENSES.txt"):
    (out / name).write_bytes(archive.extractfile(f"package/{name}").read())
assert all((out / f"open-sans-{weight}.woff2").is_file() for weight in (400, 700))
print("Vendored Open Sans fonts and licenses from Cloudscape 1.0.71.")
