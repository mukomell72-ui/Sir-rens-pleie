from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [ROOT / "index.html", ROOT / "privacy.html", ROOT / "admin" / "index.html", ROOT / "admin" / "technology.html", ROOT / "admin" / "payments.html", ROOT / "order" / "index.html", ROOT / "q" / "index.html"]

class Parser(HTMLParser):
    def __init__(self, path: Path):
        super().__init__()
        self.path = path
        self.refs: list[str] = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for key in ("src", "href"):
            v = d.get(key)
            if v:
                self.refs.append(v)

def local_target(base: Path, ref: str) -> Path | None:
    ref = ref.split("#", 1)[0].split("?", 1)[0]
    if not ref or ref.startswith(("http://", "https://", "tel:", "sms:", "mailto:", "data:", "javascript:")):
        return None
    p = (base.parent / ref).resolve()
    # Directory links are valid if an index.html exists.
    if ref.endswith("/"):
        p = p / "index.html"
    return p

def main() -> int:
    errors: list[str] = []
    for path in HTML_FILES:
        if not path.exists():
            errors.append(f"Missing HTML file: {path.relative_to(ROOT)}")
            continue
        text = path.read_text(encoding="utf-8")
        parser = Parser(path)
        try:
            parser.feed(text)
        except Exception as exc:
            errors.append(f"HTML parse error {path.relative_to(ROOT)}: {exc}")
            continue
        if "<html" not in text.lower() or "</html>" not in text.lower():
            errors.append(f"Incomplete HTML document: {path.relative_to(ROOT)}")
        for ref in parser.refs:
            target = local_target(path, ref)
            if target is not None and not target.exists():
                errors.append(f"Broken local reference in {path.relative_to(ROOT)}: {ref}")

    config = (ROOT / "assets" / "config.js").read_text(encoding="utf-8")
    required = ["supabaseUrl", "supabasePublishableKey", "photoUploadUrl", "masterQrPath"]
    for key in required:
        if not re.search(rf"\b{re.escape(key)}\s*:\s*[^,\n]+", config):
            errors.append(f"Missing SIR_CONFIG key: {key}")

    app = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
    if "public_submit_order" not in app:
        errors.append("Public app no longer calls public_submit_order")
    if "localStorage" in app and "sir_lang" not in app:
        errors.append("Business order data must not be stored in localStorage")

    if errors:
        print("SIR static validation FAILED")
        for e in errors:
            print("-", e)
        return 1
    print("SIR static validation OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())
