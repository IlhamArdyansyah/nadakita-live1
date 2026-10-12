"""Local hero/browser checks; Supabase is mocked, no external writes."""
import json
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES

ARTIFACTS = ROOT / 'tests' / 'artifacts' / 'jakarta-hero'


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 390, 768, 1024, 1440, 1672):
                context = browser.new_context(viewport={'width': width, 'height': 1100})
                blocks = []
                broken_image = False
                def backend(route):
                    url = route.request.url
                    if '/site_content?' in url:
                        payload = blocks
                    elif '/shows?' in url:
                        payload = SHOWS
                    elif '/ticket_categories?' in url:
                        payload = CATEGORIES
                    else:
                        payload = []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))
                def artwork(route):
                    if broken_image:
                        route.abort()
                    else:
                        route.continue_()
                context.route('https://*.supabase.co/**', backend)
                context.route('**/neon-jakarta-gbk-hero.png', artwork)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/index.html')
                page.wait_for_selector('html[data-page-ready]')
                page.screenshot(path=str(ARTIFACTS / f'initial-{width}.png'))
                hero = page.locator('.hero--jakarta')
                assert hero.count() == 1, 'Expected Jakarta stadium hero'
                image = hero.locator('.hero-image')
                assert image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                assert image.get_attribute('fetchpriority') == 'high'
                assert image.get_attribute('alt') == ''
                assert hero.locator('h1').count() == 1
                assert hero.locator('.planet, .overlay-word, .floating-label').count() == 0
                assert hero.locator('h1 em').evaluate('(el) => parseFloat(getComputedStyle(el).fontSize) < parseFloat(getComputedStyle(el.parentElement).fontSize)')
                assert hero.locator('.hero-illustration-note').count() == 0
                assert 'Academic concert concept' not in hero.inner_text()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                for selector in ('h1', '.hero-sub', '.hero-meta', '.hero .btn'):
                    assert page.locator(selector).first.evaluate('(el) => { const r=el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1; }'), selector
                if width <= 800:
                    assert hero.locator('.hero-art').bounding_box()['y'] >= hero.locator('.hero-copy').bounding_box()['y'] + hero.locator('.hero-copy').bounding_box()['height'] - 1
                def snapshot():
                    return hero.evaluate('(el) => [...el.querySelectorAll("h1,p,a,.hero-meta,img")].map(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node); return [r.x,r.y,r.width,r.height,s.color,s.fontFamily];})')
                before = snapshot()
                page.wait_for_timeout(500)
                assert snapshot() == before, 'Late hero layout shift'
                cta = hero.locator('a.btn')
                page.screenshot(path=str(ARTIFACTS / f'hero-{width}.png'))
                cta.focus()
                assert cta.evaluate('(el) => el.matches(":focus-visible")')
                assert 'heading' in hero.aria_snapshot()
                page.keyboard.press('Enter')
                page.wait_for_url('**/shows.html')
                page.wait_for_selector('html[data-page-ready]')
                # Existing admin-managed content still applies to the new native image.
                blocks = [
                    {'key': 'hero_title', 'value': 'A DIFFERENT NIGHT IN JAKARTA.'},
                    {'key': 'hero_subtitle', 'value': 'A custom organizer description.'},
                    {'key': 'hero_banner_url', 'value': base + '/assets/images/banners/about-atmosphere.png'},
                ]
                page.goto(base + '/index.html')
                page.wait_for_selector('html[data-page-ready]')
                assert hero.locator('h1').inner_text() == blocks[0]['value']
                assert hero.locator('.hero-sub').inner_text() == blocks[1]['value']
                assert image.get_attribute('src') == blocks[2]['value']
                assert image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                # Broken default image must not trap navigation or conceal the CTA.
                blocks = []
                broken_image = True
                page.goto(base + '/index.html')
                page.wait_for_selector('html[data-page-ready]')
                assert hero.locator('h1').is_visible() and hero.locator('a.btn').is_visible()
                page.emulate_media(reduced_motion='reduce')
                assert hero.locator('.hero-art').evaluate('(el) => getComputedStyle(el,"::after").animationName === "none"')
                assert not errors, errors
                print('PASS Jakarta hero', width, 'layout, reveal, keyboard, override, failure, reduced motion', flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
