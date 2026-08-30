from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [
    ROOT / "index.html",
    ROOT / "privacy.html",
    ROOT / "admin" / "index.html",
    ROOT / "admin" / "calendar.html",
    ROOT / "admin" / "technology.html",
    ROOT / "admin" / "guide-editor.html",
    ROOT / "admin" / "payments.html",
    ROOT / "admin" / "backup.html",
    ROOT / "order" / "index.html",
    ROOT / "status" / "index.html",
    ROOT / "q" / "index.html",
]

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
    required = ["supabaseUrl", "supabasePublishableKey", "photoUploadUrl", "masterQrPath", "minimumMobileOrder"]
    for key in required:
        if not re.search(rf"\b{re.escape(key)}\s*:\s*[^,\n]+", config):
            errors.append(f"Missing SIR_CONFIG key: {key}")

    app = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
    if "public_submit_order" not in app:
        errors.append("Public app no longer calls the protected order-submission flow")
    if "localStorage" in app and "sir_lang" not in app:
        errors.append("Business order data must not be stored in localStorage")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    required_scripts = (
        "referral.js",
        "privacy-consent.js",
        "status-link.js",
        "app.js",
        "minimum-order-ui.js",
        "vehicle.js",
        "mobile-ux.js",
        "i18n.js",
        "meta-i18n.js",
    )
    for script in required_scripts:
        if script not in index:
            errors.append(f"Public site is missing required script: {script}")
    positions = [index.find(script) for script in ("privacy-consent.js", "status-link.js", "app.js")]
    if any(pos < 0 for pos in positions) or positions != sorted(positions):
        errors.append("Consent/status wrappers must load before app.js in the documented order")
    if 'data-lang="no" class="active"' not in index or '<html lang="nb">' not in index:
        errors.append("Norwegian must remain the default public storefront language")

    privacy = (ROOT / "assets" / "privacy-consent.js").read_text(encoding="utf-8")
    if "public_submit_order_v2" not in privacy or "privacy_accepted=true" not in privacy.replace(" ", ""):
        errors.append("Privacy wrapper must route public orders through v2 with explicit consent")

    status_link = (ROOT / "assets" / "status-link.js").read_text(encoding="utf-8")
    if "'/rest/v1/rpc/public_submit_order'" not in status_link or "status_token" not in status_link:
        errors.append("Status-link wrapper must capture the protected order response token")

    minimum_ui = (ROOT / "assets" / "minimum-order-ui.js").read_text(encoding="utf-8")
    if "minimumMobileOrder" not in minimum_ui:
        errors.append("Customer estimate must display the configured mobile minimum")

    technology = (ROOT / "admin" / "technology.html").read_text(encoding="utf-8")
    if "technology-procedures.js" not in technology:
        errors.append("SIR Technology is missing the editable procedure integration")

    admin_index = (ROOT / "admin" / "index.html").read_text(encoding="utf-8")
    if "guide-editor.html" not in admin_index:
        errors.append("Admin navigation is missing Guide Editor")

    if errors:
        print("SIR static validation FAILED")
        for e in errors:
            print("-", e)
        return 1
    print("SIR static validation OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())
