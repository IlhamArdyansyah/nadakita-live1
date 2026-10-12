"""Exercise real document navigation with deliberately delayed Supabase responses."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOWS = [
    {"id": "show-" + slug, "slug": slug, "title": name, "show_date": date,
     "status": "published", "starts_at": "20:00:00", "description": "A night of live music.",
     "artists": {"name": name, "slug": slug}, "venues": {"name": "Stadion Utama GBK"}}
    for slug, name, date in [
        ("weeknd", "The Weeknd", "2026-11-20"),
        ("bieber", "Justin Bieber", "2026-11-21"),
        ("bruno", "Bruno Mars", "2026-11-22")
    ]
]
CATEGORIES = [
    {"id": "category-" + code, "code": code, "name": name, "price_idr": price,
     "active": True, "description": "Concert zone"}
    for code, name, price in [
        ("vip", "VIP EXPERIENCE", 2250000), ("festa", "FESTIVAL A", 1500000),
        ("festb", "FESTIVAL B", 1200000), ("cat1", "CAT 1", 950000),
        ("cat2", "CAT 2", 650000)
    ]
]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def run():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:" + str(server.server_port)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True)
            for width in (390, 1440):
                context = browser.new_context(viewport={"width": width, "height": 1000})
                def backend(route):
                    time.sleep(.12)
                    url = route.request.url
                    if "/rest/v1/shows?" in url:
                        payload = SHOWS
                    elif "/rest/v1/ticket_categories?" in url:
                        payload = CATEGORIES
                    elif "/rpc/get_stock" in url:
                        payload = [{"category_id": c["id"], "available": 100} for c in CATEGORIES]
                    else:
                        payload = []
                    route.fulfill(status=200, content_type="application/json", body=json.dumps(payload))
                context.route("https://*.supabase.co/**", backend)
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                for path in ("index.html", "shows.html", "show.html?show=weeknd",
                             "show.html?show=bieber", "show.html?show=bruno", "tickets.html",
                             "checkout.html?show=weeknd&cat-category-vip=1", "schedule.html",
                             "about.html", "login.html", "register.html", "forgot-password.html",
                             "reset-password.html", "dashboard.html", "admin.html"):
                    page.goto(base + "/" + path, wait_until="domcontentloaded")
                    page.wait_for_selector("html[data-page-ready]", timeout=12000)
                    page.wait_for_timeout(200)
                    def snapshot():
                        return page.evaluate("""() => [...document.querySelectorAll('main h1,main h2,main h3,main .poster-artist')].map(el=>{
                            const r=el.getBoundingClientRect(),s=getComputedStyle(el);
                            return [el.textContent,r.width,r.height,s.color,s.fontFamily];
                        })""")
                    before = snapshot()
                    page.wait_for_timeout(500)
                    assert snapshot() == before, "Late typography/layout change: " + path
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Overflow: " + path
                    if path.startswith("show.html"):
                        assert page.locator("#show-song-preview").count() == 1
                        assert page.locator("[data-artist-preview]").count() == 0
                    print("PASS", width, path, flush=True)
                page.goto(base + "/shows.html")
                page.wait_for_selector("html[data-page-ready]")
                page.locator('.show-card .show-card-body a').first.click()
                page.wait_for_url("**/show.html?show=weeknd")
                page.wait_for_selector("html[data-page-ready]")
                assert page.locator("#show-song-preview").count() == 1
                assert not errors, errors
                context.close()
            browser.close()
    finally:
        server.shutdown()

if __name__ == "__main__":
    run()
