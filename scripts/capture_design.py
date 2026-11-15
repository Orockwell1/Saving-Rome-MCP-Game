"""Capture version-pinned Figma evidence outside every Git checkout.

This developer tool never modifies Figma, publishes assets, or approves a design.
The personal access token needs file_content:read and is sent only to api.figma.com.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import struct
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
MAX_RESPONSE_BYTES = 32 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Redirect refused; no credential or private request may change origin.")


def read_source(path: Path) -> dict:
    path = path.resolve()
    if ROOT in path.parents or any((parent / ".git").exists() for parent in path.parents):
        raise ValueError("Private design metadata must live outside Git checkouts.")
    source = json.loads(path.read_text())
    allowed = {"schemaVersion", "contractId", "fileKey", "nodeIds", "status", "bindings"}
    if (not isinstance(source, dict) or set(source) - allowed or
            type(source.get("schemaVersion")) is not int or source["schemaVersion"] != 1):
        raise ValueError("Expected a version 1 private source record without extra properties.")
    if not isinstance(source.get("fileKey"), str) or not re.fullmatch(r"[A-Za-z0-9_-]{3,128}", source["fileKey"]):
        raise ValueError("Private source requires a file key, not a URL.")
    ids = source.get("nodeIds")
    if (not isinstance(ids, list) or not 1 <= len(ids) <= 32 or
            any(not isinstance(node, str) or not re.fullmatch(r"I?\d+:\d+(?:;\d+:\d+)*", node) for node in ids) or
            len(ids) != len(set(ids))):
        raise ValueError("Provide 1–32 unique exact Figma node IDs in the private source record.")
    return source


def read_token(env_file: Path) -> str:
    token = os.environ.get("FIGMA_ACCESS_TOKEN", "").strip()
    if not token and env_file.is_file():
        if stat.S_IMODE(env_file.stat().st_mode) & 0o077:
            raise ValueError("Protect the local credential file with chmod 600 before capture.")
        for line in env_file.read_text().splitlines():
            key, separator, value = line.strip().partition("=")
            if separator and key == "FIGMA_ACCESS_TOKEN":
                token = value.strip()
                if token[:1] in ("'", '"') and token[-1:] == token[:1]:
                    token = token[1:-1]
                break
    if not token or any(character.isspace() for character in token):
        raise ValueError("Set FIGMA_ACCESS_TOKEN locally with file_content:read; never paste it into a public contract.")
    return token


def fetch(url: str, token: str | None = None) -> bytes:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Only HTTPS design reads on standard ports are permitted.")
    host = parsed.hostname or ""
    if token is not None and host != "api.figma.com":
        raise ValueError("Figma credentials may only be sent to api.figma.com.")
    if token is None and not (host.endswith(".figma.com") or host == "figma-alpha-api.s3.us-west-2.amazonaws.com"):
        raise ValueError("Image host is not approved; review its origin before downloading.")
    headers = {"X-Figma-Token": token} if token is not None else {}
    try:
        with build_opener(NoRedirect()).open(Request(url, headers=headers), timeout=45) as response:
            data = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise ValueError(f"Figma evidence request failed with HTTP {error.code}; private URL/body omitted.") from None
    except URLError:
        raise ValueError("Figma evidence request failed; private URL/body omitted.") from None
    if len(data) > MAX_RESPONSE_BYTES:
        raise ValueError("Evidence exceeds the capture limit; select a narrower source node.")
    return data


def capture(source_path: Path, env_file: Path) -> Path:
    source = read_source(source_path)
    token = read_token(env_file)
    key = source["fileKey"]

    def api(path: str, **query):
        return json.loads(fetch(f"https://api.figma.com/v1/{path}?{urlencode(query)}", token))

    index = api(f"files/{key}", depth=2)
    version = index.get("version")
    if not isinstance(version, str) or not version:
        raise ValueError("Figma did not identify a source version; refusing an unpinned comparison.")
    ids = ",".join(source["nodeIds"])
    nodes = api(f"files/{key}/nodes", ids=ids, version=version, geometry="paths")
    if any(not nodes.get("nodes", {}).get(node_id) for node_id in source["nodeIds"]):
        raise ValueError("A requested source node is missing; no mapping has been approved.")
    images = api(f"images/{key}", ids=ids, version=version, format="png", scale=1, use_absolute_bounds="true")
    if any(not images.get("images", {}).get(node_id) for node_id in source["nodeIds"]):
        raise ValueError("A requested node could not be rendered; no comparison has been approved.")

    timestamp = datetime.now(timezone.utc)
    destination = source_path.resolve().parent / "captures" / timestamp.strftime("%Y%m%dT%H%M%S.%fZ")
    destination.mkdir(mode=0o700, parents=True)
    records = []

    def save(name: str, content: bytes):
        with (destination / name).open("xb") as output:
            os.chmod(output.name, 0o600)
            output.write(content)

    save("frame-index.json", json.dumps(index, indent=2).encode())
    save("nodes.json", json.dumps(nodes, indent=2).encode())
    for number, node_id in enumerate(source["nodeIds"], start=1):
        png = fetch(images["images"][node_id])
        if len(png) < 24 or not png.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("A source render was not a PNG; capture is incomplete.")
        width, height = struct.unpack(">II", png[16:24])
        filename = f"reference-{number:02}.png"
        save(filename, png)
        records.append({"nodeId": node_id, "image": filename, "width": width, "height": height,
                        "sha256": hashlib.sha256(png).hexdigest(),
                        "bounds": nodes["nodes"][node_id]["document"].get("absoluteBoundingBox")})
    save("capture.json", json.dumps({"schemaVersion": 1, "fileKey": key, "sourceVersion": version,
         "capturedAt": timestamp.isoformat(), "renders": records,
         "approval": "unreviewed", "publicAssetsPromoted": False}, indent=2).encode())
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Private source.json outside all Git checkouts")
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env.local")
    args = parser.parse_args()
    try:
        destination = capture(args.source, args.env_file)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Capture stopped: {error}\n")
    print(f"Private evidence saved to {destination}. Review is still required; no public assets changed.")


if __name__ == "__main__":
    main()
