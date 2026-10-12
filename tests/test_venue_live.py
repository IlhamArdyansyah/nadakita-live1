"""Read-only public Supabase venue smoke test. No auth session or order writes."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import QuietHandler, ROOT


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    artifacts = ROOT / 'tests' / 'artifacts' / 'venue-night'
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (390, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 1800})
                forbidden = []
                api_statuses = []
                def read_only(route):
                    if route.request.method in ('GET', 'HEAD', 'OPTIONS') or route.request.url.endswith('/rpc/get_stock'):
                        route.continue_()
                    else:
                        forbidden.append(route.request.url)
                        route.abort()
                context.route('https://*.supabase.co/**', read_only)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: api_statuses.append(response.status) if '.supabase.co/rest/' in response.url else None)
                for path in ('index.html', 'schedule.html?show=bruno', 'show.html?show=bieber', 'tickets.html?show=weeknd'):
                    page.goto(f'http://127.0.0.1:{server.server_port}/{path}')
                    page.wait_for_selector('html[data-page-ready]', timeout=20000)
                    venue = page.locator('.booking-map[data-price-state="ready"]')
                    venue.wait_for()
                    if path == 'index.html':
                        hero_image = page.locator('.hero--jakarta .hero-image')
                        assert hero_image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                        assert page.locator('.hero-illustration-note').count() == 0
                        page.screenshot(path=str(ROOT / 'tests' / 'artifacts' / 'jakarta-hero' / f'live-home-{width}.png'))
                    prices = venue.locator('.booking-map-price').all_text_contents()
                    assert prices == ['Rp2.250.000', 'Rp1.500.000', 'Rp1.200.000', 'Rp950.000', 'Rp650.000'], prices
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    target = page.locator('.venue-feature') if path == 'index.html' else venue
                    target.scroll_into_view_if_needed()
                    page.mouse.wheel(0, -150)
                    page.wait_for_timeout(200)
                    target.screenshot(path=str(artifacts / f'live-{path.split(".")[0]}-{width}.png'))
                    print('PASS live read-only venue', width, path, prices, flush=True)
                assert not errors, errors
                assert not forbidden, forbidden
                assert all(200 <= status < 300 for status in api_statuses), api_statuses
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
