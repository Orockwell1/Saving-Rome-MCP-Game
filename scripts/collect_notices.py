"""Preserve production npm and vendored font notices in the single-file widget.

Run after npm ci. This reads the locked dependency set, not registry metadata.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Reviewed upstream packages whose complete license is embedded in their README.
EMBEDDED_NOTICES = {"murmurhash-js": ("README.md",)}
lock = json.loads((ROOT / "package-lock.json").read_text())
sections = ["Saving Rome — third-party notices\n\n"
            "Original upstream license and notice files follow. These packages retain "
            "their own licenses; the project's MIT license does not replace them. "
            "Some listed dependencies supply types or optional runtime paths.\n"]
missing = []
for relative, entry in sorted(lock["packages"].items()):
    if not relative or entry.get("dev") or entry.get("link"):
        continue
    directory = ROOT / relative
    manifest = json.loads((directory / "package.json").read_text())
    files = sorted(path for path in directory.iterdir()
                   if path.is_file() and path.name.lower().split(".")[0] in
                   {"license", "licence", "copying", "notice"})
    if not files:
        files = [directory / name for name in EMBEDDED_NOTICES.get(manifest["name"], ())]
    if not files:
        missing.append(manifest["name"])
        continue
    sections.append(f"\n{'=' * 72}\n{manifest['name']} {manifest['version']}\n"
                    f"Package license declaration: {manifest.get('license', 'see files below')}\n")
    for path in files:
        sections.append(f"\n--- {path.name} ---\n{path.read_text().strip()}\n")
if missing:
    raise SystemExit("Missing upstream notice files: " + ", ".join(missing))
font_license = ROOT / "ui/src/assets/fonts/source-sans/LICENSE.md"
sections.append(f"\n{'=' * 72}\nAdobe Source Sans 3, version 3.052R\n"
                "Source: https://github.com/adobe-fonts/source-sans/releases/tag/3.052R\n"
                f"\n--- LICENSE.md ---\n{font_license.read_text().strip()}\n")
output = ROOT / "THIRD_PARTY_NOTICES.txt"
output.write_text("".join(sections))
print(f"Collected notices into {output.name} ({output.stat().st_size:,} bytes).")
