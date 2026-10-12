"""Reference-led guide layout; isolated browser and mocked read-only catalog."""
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
    artifacts = ROOT / 'tests' / 'artifacts' / 'show-guide-neon'
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 390, 768, 1024, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 1100})
                def backend(route):
                    assert route.request.method == 'GET', 'Guide must not write to backend'
                    url = route.request.url
                    payload = [dict(s, ends_at='22:00:00') for s in SHOWS] if '/shows?' in url else CATEGORIES if '/ticket_categories?' in url else []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))
                context.route('https://*.supabase.co/**', backend)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.clock.install(time=datetime.fromisoformat('2026-10-11T12:00:00+07:00'))
                page.goto(f'http://127.0.0.1:{server.server_port}/schedule.html?show=bieber')
                page.wait_for_selector('html[data-page-ready]')
                image = page.locator('.guide-intro-image')
                assert image.count() == 1, 'Compact native stadium banner is missing'
                assert image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                assert page.locator('main h1').count() == 1
                assert page.locator('.guide-sidebar').evaluate('(el) => getComputedStyle(el).backgroundColor === "rgb(25, 25, 26)"')
                assert page.locator('.guide-status').inner_text() == 'UPCOMING'
                assert page.locator('.guide-slot-marker i').evaluate_all('(nodes) => nodes.every(el => getComputedStyle(el).backgroundColor === "rgb(255, 253, 249)")')
                for slug, name in [('weeknd', 'The Weeknd'), ('bieber', 'Justin Bieber'), ('bruno', 'Bruno Mars')]:
                    page.locator(f'[data-guide-show="{slug}"]').click()
                    assert page.locator('#guide-artist').inner_text().upper() == name.upper()
                    assert page.locator('#guide-ticket-link').get_attribute('href') == f'tickets.html?show={slug}'
                    assert page.locator('[aria-selected="true"]').count() == 1
                    assert page.locator('.guide-timeline .time-row').count() == 5
                    assert page.locator('.guide-live-badge').inner_text() == 'HEADLINER'
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, slug)
                page.locator('[data-guide-show="bruno"]').focus()
                page.keyboard.press('Home')
                assert page.locator('[data-guide-show="weeknd"]').get_attribute('aria-selected') == 'true'
                page.keyboard.press('ArrowRight')
                assert page.locator('#guide-artist').inner_text().upper() == 'JUSTIN BIEBER'
                page.go_back()
                assert page.locator('#guide-artist').inner_text().upper() == 'THE WEEKND'
                if width <= 820:
                    essentials = page.locator('.guide-essentials').bounding_box()
                    timeline = page.locator('#guide-timeline').bounding_box()
                    assert essentials['y'] >= timeline['y'] + timeline['height'], 'Arrival info must follow schedule on mobile'
                    assert page.locator('.guide-night-name').first.is_visible()
                else:
                    assert image.bounding_box()['height'] <= 340, 'Banner dominates rundown'
                page.goto(f'http://127.0.0.1:{server.server_port}/schedule.html')
                page.wait_for_selector('html[data-page-ready]')
                page.screenshot(path=str(artifacts / f'guide-{width}.png'), full_page=True, animations='disabled')
                before = page.locator('#guide-artist').bounding_box()
                page.clock.run_for(500)
                assert before == page.locator('#guide-artist').bounding_box(), 'Late typography shift'
                assert not errors, errors
                print('PASS neon guide', width, 'native banner, nights, keyboard, history, responsive arrival info', flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
