"""Verify poster cards, alignment and artist navigation with a read-only mock catalog."""
import json
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    artifacts = ROOT / 'tests' / 'artifacts' / 'lineup-posters'
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 768, 1024, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 1000})
                def backend(route):
                    assert route.request.method == 'GET'
                    data = SHOWS if '/shows?' in route.request.url else CATEGORIES if '/ticket_categories?' in route.request.url else []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(data))
                context.route('https://*.supabase.co/**', backend)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                for entry in ('index', 'shows'):
                    page.goto(f'http://127.0.0.1:{server.server_port}/{entry}.html')
                    page.wait_for_selector('html[data-page-ready]')
                    cards = page.locator('.lineup-card')
                    assert cards.count() == 3
                    assert page.locator('.lineup-art svg').count() == 3
                    for photo in page.locator('.lineup-photo').all():
                        photo.scroll_into_view_if_needed()
                        photo.evaluate('(img) => img.decode()')
                        assert photo.is_visible()
                        assert photo.evaluate('(img) => img.naturalWidth > 0')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    buttons = cards.locator('.btn').all()
                    if width > 800:
                        tops = [button.bounding_box()['y'] for button in buttons]
                        assert max(tops) - min(tops) < 2, 'Buttons must align'
                    for button in buttons:
                        assert button.bounding_box()['height'] >= 44
                    page.locator('.show-grid').screenshot(path=str(artifacts / f'{entry}-{width}.png'))
                    for i, slug in enumerate(('weeknd', 'bieber', 'bruno')):
                        assert cards.nth(i).locator('.artist-card-link').get_attribute('href') == f'show.html?show={slug}'
                    buttons[0].focus()
                    page.keyboard.press('Enter')
                    page.wait_for_url('**/show.html?show=weeknd')
                    page.wait_for_selector('.artist-detail-page')
                    assert page.locator('audio').evaluate('(a) => a.paused'), 'No autoplay'
                    assert not errors, errors
                    print('PASS lineup posters', entry, width, flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
