"""Full homepage countdown copy/layout check with isolated Chrome and mocked data."""
import json
from datetime import datetime
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    artifacts = ROOT / 'tests' / 'artifacts' / 'countdown-english'
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 390, 768, 1024, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 1000}, timezone_id='America/Los_Angeles')
                def backend(route):
                    url = route.request.url
                    assert route.request.method == 'GET', 'No backend writes allowed'
                    payload = [dict(show, ends_at='22:00:00') for show in SHOWS] if '/shows?' in url else CATEGORIES if '/ticket_categories?' in url else []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))
                context.route('https://*.supabase.co/**', backend)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.clock.install(time=datetime.fromisoformat('2026-10-11T12:00:00+07:00'))
                page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
                page.wait_for_selector('html[data-page-ready]')
                countdown = page.locator('#concert-countdown')
                countdown.scroll_into_view_if_needed()
                assert page.locator('#countdown-title').inner_text().upper() == 'COUNTDOWN TO NIGHT 01 — THE WEEKND'
                assert page.locator('#countdown-eyebrow').inner_text() == 'THE WAIT IS ALMOST OVER'
                assert countdown.locator('.countdown-unit span').all_text_contents() == ['DAYS', 'HOURS', 'MINUTES', 'SECONDS']
                assert 'seconds until The Weeknd' in page.locator('#countdown-clock').get_attribute('aria-label')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                assert countdown.locator('.countdown-title, .countdown-unit').evaluate_all('(nodes) => nodes.every(el => el.scrollWidth <= el.clientWidth + 1)')
                assert 'COUNTDOWN TO NIGHT 01' in countdown.aria_snapshot()
                page.screenshot(path=str(artifacts / f'countdown-{width}.png'))
                before = page.locator('[data-countdown="seconds"]').inner_text()
                page.clock.run_for(1000)
                assert page.locator('[data-countdown="seconds"]').inner_text() != before
                assert not errors, errors
                print('PASS English countdown', width, 'copy, responsive layout, ARIA, ticking, non-WIB viewer timezone', flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
