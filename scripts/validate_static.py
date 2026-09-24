from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [
    ROOT / "index.html",
    ROOT / "privacy.html",
    ROOT / "terms.html",
    ROOT / "admin" / "index.html",
    ROOT / "admin" / "calendar.html",
    ROOT / "admin" / "technology.html",
    ROOT / "admin" / "guide-editor.html",
    ROOT / "admin" / "payments.html",
    ROOT / "admin" / "backup.html",
    ROOT / "admin" / "accounting.html",
    ROOT / "admin" / "invoice.html",
    ROOT / "order" / "index.html",
    ROOT / "status" / "index.html",
    ROOT / "q" / "index.html",
    ROOT / "guide-app" / "index.html",
    ROOT / "guide-app" / "index-v13.html",
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
    required = ["supabaseUrl", "supabasePublishableKey", "photoUploadUrl", "masterQrPath", "minimumMobileOrder", "vehicleLookupUrl"]
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
        "i18n-runtime-fixes.js",
        "i18n.js",
        "meta-i18n.js",
    )
    for script in required_scripts:
        if script not in index:
            errors.append(f"Public site is missing required script: {script}")
    positions = [index.find(script) for script in ("privacy-consent.js", "status-link.js", "app.js")]
    if any(pos < 0 for pos in positions) or positions != sorted(positions):
        errors.append("Consent/status wrappers must load before app.js in the documented order")
    i18n_positions = [index.find(script) for script in ("i18n-runtime-fixes.js", "i18n.js", "meta-i18n.js")]
    if any(pos < 0 for pos in i18n_positions) or i18n_positions != sorted(i18n_positions):
        errors.append("Dynamic translation completion must load before the main i18n and metadata layers")
    if 'data-lang="no" class="active"' not in index or '<html lang="nb">' not in index:
        errors.append("Norwegian must remain the default public storefront language")
    for marker in ('content="no-referrer"', "object-src 'none'", 'href="terms.html"'):
        if marker not in index:
            errors.append(f"Public site security/legal marker is missing: {marker}")

    privacy = (ROOT / "assets" / "privacy-consent.js").read_text(encoding="utf-8")
    if "public_submit_order_v2" not in privacy or "privacy_accepted=true" not in privacy.replace(" ", ""):
        errors.append("Privacy wrapper must route public orders through v2 with explicit consent")
    for marker in ("sirTermsAcknowledgement", "terms_acknowledged", "terms_version"):
        if marker not in privacy:
            errors.append(f"Terms acknowledgement is missing marker: {marker}")

    terms = (ROOT / "terms.html").read_text(encoding="utf-8")
    for marker in ("Veiledende pris", "Indicative price", "Ориентировочная цена", "ENK"):
        if marker not in terms:
            errors.append(f"Terms page is missing marker: {marker}")
    for marker in ("request_not_contract", "priceNotice", "requestNotice"):
        if marker not in app:
            errors.append(f"Public request/price protection is missing marker: {marker}")

    status_link = (ROOT / "assets" / "status-link.js").read_text(encoding="utf-8")
    if "'/rest/v1/rpc/public_submit_order'" not in status_link or "status_token" not in status_link:
        errors.append("Status-link wrapper must capture the protected order response token")

    minimum_ui = (ROOT / "assets" / "minimum-order-ui.js").read_text(encoding="utf-8")
    if "minimumMobileOrder" not in minimum_ui:
        errors.append("Customer estimate must display the configured mobile minimum")

    vehicle = (ROOT / "assets" / "vehicle.js").read_text(encoding="utf-8")
    if "C.supabaseUrl?" in vehicle or "functions/v1/vehicle-lookup`" in vehicle:
        errors.append("Vehicle lookup must stay disabled until vehicleLookupUrl is explicitly configured")
    if "C.vehicleLookupUrl" not in vehicle:
        errors.append("Vehicle lookup must be controlled by vehicleLookupUrl")

    runtime_i18n = (ROOT / "assets" / "i18n-runtime-fixes.js").read_text(encoding="utf-8")
    for marker in ("места", "/ шт.", "Полный пакет включает все основные зоны", "Фото не прикрепились"):
        if marker not in runtime_i18n:
            errors.append(f"Dynamic storefront translation coverage missing marker: {marker}")

    for page in (ROOT / "order" / "index.html", ROOT / "status" / "index.html"):
        text = page.read_text(encoding="utf-8")
        if '<html lang="nb">' not in text:
            errors.append(f"Norwegian must be the default language in {page.relative_to(ROOT)}")

    technology = (ROOT / "admin" / "technology.html").read_text(encoding="utf-8")
    if "technology-procedures.js" not in technology:
        errors.append("SIR Technology is missing the editable procedure integration")

    technology_js = (ROOT / "admin" / "technology.js").read_text(encoding="utf-8")
    for marker in ("approve_order_technology_card", "raise_order_stop", "service_type==='rug'", "wanted.add('carpet')", "technology.load"):
        if marker not in technology_js:
            errors.append(f"SIR Technology hardening marker is missing: {marker}")
    if "technology.js?v=20260924-audit3" not in technology:
        errors.append("SIR Technology cache-bust is stale")

    admin_index = (ROOT / "admin" / "index.html").read_text(encoding="utf-8")
    if "guide-editor.html" not in admin_index:
        errors.append("Admin navigation is missing Guide Editor")

    admin_js = (ROOT / "admin" / "admin.js").read_text(encoding="utf-8")
    for marker in ("sir-admin-control-center", "table:'orders'", "table:'appointments'", "table:'chemicals'", "nextStatusAction", "order_events", "stock_status", "payment_status", "data-sms-status", "data-sms-review", "smsReviewText", "review_url", "translateRuText", "googleTranslateUrl", "data-sms-custom"):
        if marker not in admin_js:
            errors.append(f"Admin control-center marker is missing: {marker}")
    if 'data-view="inventory"' not in admin_index or "Центр контроля" not in admin_index:
        errors.append("Admin navigation is missing the central control/inventory workspace")

    admin_runtime = ROOT / "admin" / "runtime.js"
    if not admin_runtime.exists():
        errors.append("Admin runtime guard is missing")
    else:
        runtime_text = admin_runtime.read_text(encoding="utf-8")
        for marker in ("SIR_ADMIN_SB", "unhandledrejection", "sirRuntimeBanner", "offline", "fatal"):
            if marker not in runtime_text:
                errors.append(f"Admin runtime guard marker is missing: {marker}")

    admin_pages = (
        ROOT / "admin" / "index.html",
        ROOT / "admin" / "calendar.html",
        ROOT / "admin" / "technology.html",
        ROOT / "admin" / "guide-editor.html",
        ROOT / "admin" / "payments.html",
        ROOT / "admin" / "backup.html",
        ROOT / "admin" / "accounting.html",
        ROOT / "admin" / "invoice.html",
    )
    for page in admin_pages:
        text = page.read_text(encoding="utf-8")
        if "@supabase/supabase-js@2.117.1" not in text:
            errors.append(f"Admin page does not pin Supabase JS 2.117.1: {page.relative_to(ROOT)}")
        if not re.search(r'src="runtime\.js\?v=[^"]+"', text):
            errors.append(f"Admin page does not load runtime guard: {page.relative_to(ROOT)}")
        if re.search(r"@supabase/supabase-js@2(?:[\"'/<])", text):
            errors.append(f"Floating Supabase JS major version found: {page.relative_to(ROOT)}")
        for marker in ("Content-Security-Policy", "object-src 'none'", "base-uri 'self'", 'name="referrer" content="no-referrer"'):
            if marker not in text:
                errors.append(f"Admin browser hardening marker is missing in {page.relative_to(ROOT)}: {marker}")

    for obsolete in ("signupForm", "signupOwnerCode", 'id="ownerCode"'):
        if obsolete in admin_index:
            errors.append(f"Obsolete OWNER bootstrap UI is still exposed: {obsolete}")

    for marker in ("SIR_ADMIN_SB", "showDataLoadError", "save_admin_settings_bundle", "create_manual_order", "orders.load", "save_order_decision", "_expected_updated_at", "orderEditorDirty", "workReady", "orderActionError"):
        if marker not in admin_js:
            errors.append(f"Admin fail-safe marker is missing: {marker}")

    backup_js = (ROOT / "admin" / "backup.js").read_text(encoding="utf-8")
    for marker in ("order_assessments", "accounting_entries", "accounting_mileage", "accounting_assets", "accounting_invoices"):
        if marker not in backup_js:
            errors.append(f"Business backup coverage is missing: {marker}")
    for marker in ("format_version:2", "manifest_sha256", "SHA-256", "backup.export"):
        if marker not in backup_js:
            errors.append(f"Business backup integrity marker is missing: {marker}")

    for migration in (
        "20260924083540_sir_admin_final_hardening.sql",
        "20260924084814_sir_order_stop_gate.sql",
        "20260924085114_sir_revoke_dangerous_table_privileges.sql",
        "20260924085408_sir_order_workflow_gate.sql",
        "20260924085616_sir_atomic_order_decision.sql",
        "20260924085757_sir_order_completion_review_gate.sql",
        "20260924090641_sir_atomic_technology_approval.sql",
        "20260924090749_sir_rug_technology_flow.sql",
        "20260924091915_sir_atomic_stop_and_clearance_gate.sql",
        "20260924092025_sir_owner_admin_risk_downgrade.sql",
        "20260924092356_sir_explicit_rate_limit_deny_policy.sql",
        "20260924092740_sir_verified_library_constraints.sql",
        "20260924093037_sir_scheduled_requires_appointment.sql",
        "20260924093145_sir_no_prescheduled_inserts.sql",
        "20260924111103_sir_admin_atomic_write_bundle.sql",
        "20260924112122_sir_order_optimistic_lock.sql",
    ):
        if not (ROOT / "supabase" / "migrations" / migration).exists():
            errors.append(f"Admin hardening migration is missing: {migration}")

    stop_gate = (ROOT / "supabase" / "migrations" / "20260924084814_sir_order_stop_gate.sql").read_text(encoding="utf-8")
    if "STOP risk blocks work start/completion" not in stop_gate or "in_progress" not in stop_gate or "completed" not in stop_gate:
        errors.append("Database STOP gate protection is incomplete")

    workflow_gate = (ROOT / "supabase" / "migrations" / "20260924085757_sir_order_completion_review_gate.sql").read_text(encoding="utf-8")
    for marker in ("reviewed technology card required before work starts", "reviewed technology card required before completion", "assigned_to", "final_price", "STOP risk"):
        if marker not in workflow_gate:
            errors.append(f"Professional order workflow gate is missing: {marker}")

    atomic_order = (ROOT / "supabase" / "migrations" / "20260924085616_sir_atomic_order_decision.sql").read_text(encoding="utf-8")
    for marker in ("save_order_decision", "security invoker", "appointments", "orders", "revoke all", "grant execute"):
        if marker not in atomic_order.lower():
            errors.append(f"Atomic order decision migration is missing: {marker}")

    privilege_hardening = (ROOT / "supabase" / "migrations" / "20260924085114_sir_revoke_dangerous_table_privileges.sql").read_text(encoding="utf-8").lower()
    for marker in ("revoke truncate", "trigger", "references", "anon", "authenticated", "alter default privileges"):
        if marker not in privilege_hardening:
            errors.append(f"Dangerous privilege hardening is missing: {marker}")

    rug_flow = (ROOT / "supabase" / "migrations" / "20260924090749_sir_rug_technology_flow.sql").read_text(encoding="utf-8")
    for marker in ("service_type='rug'", "array['carpet']", "high_risk", "Ковёр: STOP"):
        if marker not in rug_flow:
            errors.append(f"Rug technology fail-safe is missing: {marker}")

    stop_clearance = (ROOT / "supabase" / "migrations" / "20260924091915_sir_atomic_stop_and_clearance_gate.sql").read_text(encoding="utf-8")
    for marker in ("raise_order_stop", "reviewed_by=null", "reviewed_at=null", "sir_guard_order_risk_downgrade"):
        if marker not in stop_clearance:
            errors.append(f"Atomic STOP protection is missing: {marker}")

    risk_downgrade = (ROOT / "supabase" / "migrations" / "20260924092025_sir_owner_admin_risk_downgrade.sql").read_text(encoding="utf-8")
    for marker in ("owner','admin", "v_new_rank < v_old_rank", "newly reviewed technology card"):
        if marker not in risk_downgrade:
            errors.append(f"Risk downgrade protection is missing: {marker}")

    verified_library = (ROOT / "supabase" / "migrations" / "20260924092740_sir_verified_library_constraints.sql").read_text(encoding="utf-8")
    for marker in ("procedures_verified_completeness_check", "chemicals_manufacturer_verified_completeness_check", "jsonb_array_length", "cardinality(intended_surfaces)"):
        if marker not in verified_library:
            errors.append(f"Verified library database constraint is missing: {marker}")

    scheduled_gate = (ROOT / "supabase" / "migrations" / "20260924093145_sir_no_prescheduled_inserts.sql").read_text(encoding="utf-8")
    for marker in ("scheduled", "appointment required before scheduling", "new order cannot start as scheduled"):
        if marker not in scheduled_gate:
            errors.append(f"Scheduled-order invariant is missing: {marker}")

    deny_policy = (ROOT / "supabase" / "migrations" / "20260924092356_sir_explicit_rate_limit_deny_policy.sql").read_text(encoding="utf-8")
    if "using (false)" not in deny_policy.lower() or "with check (false)" not in deny_policy.lower():
        errors.append("Vehicle lookup rate-limit deny policy is incomplete")

    technology_procedures = (ROOT / "admin" / "technology-procedures.js").read_text(encoding="utf-8")
    if "SIR_ADMIN_SB" not in technology_procedures:
        errors.append("Technology procedures must reuse the shared admin Supabase client")
    if "confirmed:{status:'scheduled'" in admin_js:
        errors.append("Confirmed orders must not have a direct scheduled quick-action without a calendar slot")
    if 'data-view="finance"' in admin_index:
        errors.append("Legacy duplicate finance view must stay removed")

    photo_function = (ROOT / "supabase" / "functions" / "order-photo-upload" / "index.ts").read_text(encoding="utf-8")
    if 'npm:@supabase/supabase-js@2.117.1' not in photo_function:
        errors.append("Order photo Edge Function must pin Supabase JS 2.117.1")

    status_page = (ROOT / "status" / "index.html").read_text(encoding="utf-8")
    for marker in ("public_get_order_status", "setInterval", "15000", "Обновляется автоматически"):
        if marker not in status_page:
            errors.append(f"Public order live-status marker is missing: {marker}")

    control_migration = ROOT / "supabase" / "migrations" / "20260924073831_sir_admin_control_center_realtime_inventory.sql"
    if not control_migration.exists():
        errors.append("Control-center realtime/inventory migration is missing")

    guide = (ROOT / "guide-app" / "index-v13.html").read_text(encoding="utf-8")
    guide_scripts = ("photos-v13.js", "inventory-v13-1.js", "inventory-v13-2.js", "inventory-v13-3.js", "inventory-v13-4.js", "hse-v13.js", "guide-wizard.js", "app-v13.js")
    guide_positions = [guide.find(script) for script in guide_scripts]
    if any(pos < 0 for pos in guide_positions) or guide_positions != sorted(guide_positions):
        errors.append("SIR Guide scripts are missing or load in an unsafe order")
    for marker in ("HMS / Stoffkartotek", "id=\"hseBoard\"", "id=\"cleaningWizard\""):
        if marker not in guide:
            errors.append(f"SIR Guide professional safety marker is missing: {marker}")

    sw = (ROOT / "guide-app" / "sw.js").read_text(encoding="utf-8")
    for marker in ("hse-v13.js", "ignoreSearch:true", "networkWithTimeout"):
        if marker not in sw:
            errors.append(f"SIR Guide service-worker hardening marker is missing: {marker}")

    if errors:
        print("SIR static validation FAILED")
        for e in errors:
            print("-", e)
        return 1
    print("SIR static validation OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())
