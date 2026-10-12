"""Verify the compact headliner panel with real CSS and an isolated catalog."""
import json
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright
from test_navigation_browser import QuietHandler, SHOWS, CATEGORIES

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'tests' / 'artifacts' / 'shows-focus'


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (1440, 1024, 768, 390, 320):
                context = browser.new_context(viewport={'width': width, 'height': 1000})

                def backend(route):
                    url = route.request.url
                    data = SHOWS if '/rest/v1/shows?' in url else CATEGORIES if '/rest/v1/ticket_categories?' in url else []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(data))

                context.route('https://*.supabase.co/**', backend)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}/shows.html', wait_until='domcontentloaded')
                page.wait_for_selector('html[data-page-ready]', timeout=12000)
                panel = page.locator('.shows-focus')
                if not panel.count():
                    page.screenshot(path=str(ARTIFACTS / 'before-1440.png'), full_page=True, animations='disabled')
                assert panel.count() == 1, 'Missing compact headliner panel'
                assert panel.get_attribute('aria-labelledby') == 'shows-focus-title'
                assert panel.locator('h2').inner_text() == 'JUST THE\nHEADLINER.'
                assert panel.locator('dl > div').count() == 3
                assert 'No opening acts' in panel.inner_text()
                assert 'One concert night per ticket' in panel.inner_text()
                assert page.locator('.show-grid .show-card').count() == 3
                assert page.locator('h1').count() == 1
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                heading = panel.locator('h2')
                before = heading.evaluate('(el) => [el.offsetWidth, el.offsetHeight, getComputedStyle(el).color]')
                page.wait_for_timeout(500)
                assert heading.evaluate('(el) => [el.offsetWidth, el.offsetHeight, getComputedStyle(el).color]') == before
                copy = panel.locator('.shows-focus-copy').bounding_box()
                facts = panel.locator('.shows-focus-facts').bounding_box()
                if width > 800:
                    assert facts['x'] >= copy['x'] + copy['width'] - 1, 'Unused right side'
                    assert panel.bounding_box()['height'] <= 430, 'Panel remains too tall'
                else:
                    assert facts['y'] >= copy['y'] + copy['height'] - 1, 'Mobile facts must follow copy'
                link = panel.get_by_role('link', name='PLAN YOUR NIGHT')
                assert link.get_attribute('href') == 'schedule.html'
                assert link.bounding_box()['height'] >= 44
                link.focus()
                assert link.evaluate('(el) => el === document.activeElement')
                panel.screenshot(path=str(ARTIFACTS / f'panel-{width}.png'), animations='disabled')
                page.keyboard.press('Enter')
                page.wait_for_url('**/schedule.html')
                page.wait_for_selector('html[data-page-ready]', timeout=12000)
                assert not errors, errors
                print('PASS shows focus', width, flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
