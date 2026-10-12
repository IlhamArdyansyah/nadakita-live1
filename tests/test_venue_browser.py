"""Night venue: real document/CSS, mocked read-only catalog, no database writes."""
import asyncio
import json
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright
from test_navigation_browser import QuietHandler, SHOWS, CATEGORIES

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'tests' / 'artifacts' / 'venue-night'


async def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 390, 768, 1024, 1440):
                context = await browser.new_context(viewport={'width': width, 'height': 1000})
                errors = []
                writes = []
                fail_categories = False
                empty_categories = False

                async def backend(route):
                    nonlocal fail_categories, empty_categories
                    url = route.request.url
                    if route.request.method not in ('GET', 'OPTIONS') and '/rpc/get_stock' not in url:
                        writes.append(url)
                    if '/ticket_categories?' in url:
                        slug = parse_qs(urlparse(url).query).get('show_id', ['eq.show-weeknd'])[0]
                        await asyncio.sleep(.3 if 'bieber' in slug else .04)
                        if fail_categories:
                            await route.fulfill(status=503, content_type='application/json', body='{"message":"Test catalog unavailable"}')
                            return
                        offset = 100000 if 'bieber' in slug else 200000 if 'bruno' in slug else 0
                        payload = [] if empty_categories else [dict(c, price_idr=c['price_idr'] + offset) for c in CATEGORIES]
                    elif '/rest/v1/shows?' in url:
                        payload = SHOWS
                    elif '/rpc/get_stock' in url:
                        payload = [{'category_id': c['id'], 'available': 0 if c['code'] == 'cat2' else 100} for c in CATEGORIES]
                    else:
                        payload = []
                    await route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))

                await context.route('https://*.supabase.co/**', backend)
                page = await context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                for path in ('index.html', 'schedule.html?show=bruno', 'show.html?show=bieber', 'tickets.html?show=weeknd'):
                    await page.goto(base + '/' + path, wait_until='domcontentloaded')
                    await page.wait_for_selector('html[data-page-ready]', timeout=12000)
                    venue = page.locator('.booking-map--night')
                    assert await venue.count() == 1, path
                    await venue.scroll_into_view_if_needed()
                    expected = 'Rp2.450.000' if 'bruno' in path else 'Rp2.350.000' if 'bieber' in path else 'Rp2.250.000'
                    assert expected in await venue.locator('.booking-map-legend').inner_text(), path
                    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), path
                    assert await venue.locator('.booking-map-legend-zone').count() == 5
                    assert await venue.locator('.booking-map-legend-zone').first.evaluate('(el) => el.getBoundingClientRect().height >= 44')
                    assert 'NOT TO SCALE' in (await venue.inner_text()).upper()
                    assert await venue.locator('.booking-map-note').count() == 0
                    assert 'Academic simulation' not in await venue.inner_text()
                    assert 'GATE A' not in await venue.inner_text()
                    await venue.screenshot(path=str(ARTIFACTS / f'{path.split(".")[0]}-{width}.png'))
                    if path.startswith('tickets'):
                        button = venue.locator('button.booking-map-legend-zone.festa')
                        await button.focus()
                        await page.keyboard.press('Enter')
                        assert await button.get_attribute('aria-pressed') == 'true'
                        assert await page.locator('#live-total').inner_text() == 'Rp0'
                        assert await venue.locator('.booking-map-zone.festa.is-active').count() == 2
                        assert await venue.locator('button.cat2:disabled').count() == 2
                        await page.locator('[data-cat="category-festa"][data-step="1"]').click()
                        assert await page.locator('#live-total').inner_text() == 'Rp1.500.000'
                    if path.startswith('index'):
                        picker = page.locator('[data-public-venue-select]')
                        await picker.select_option('bieber')
                        await picker.select_option('bruno')
                        await page.wait_for_function("document.querySelector('#public-venue-map').getAttribute('aria-busy') === 'false'")
                        await page.wait_for_timeout(400)
                        assert 'Rp2.450.000' in await venue.inner_text(), 'Stale night response'
                        assert await venue.locator('a.booking-map-legend-zone').first.get_attribute('href') == 'tickets.html?show=bruno&zone=vip'
                    if path.startswith('schedule'):
                        await page.locator('[data-guide-show="bieber"]').click()
                        await page.wait_for_function("document.querySelector('#public-venue-map').getAttribute('aria-busy') === 'false'")
                        assert 'Rp2.350.000' in await venue.inner_text()
                    print('PASS venue', width, path, flush=True)

                # Failure / retry / empty states: no prototype prices masquerading as live.
                fail_categories = True
                await page.goto(base + '/index.html')
                await page.wait_for_selector('.booking-map[data-price-state="error"]')
                assert 'Rp' not in await page.locator('#public-venue-map').inner_text()
                fail_categories = False
                await page.locator('[data-venue-price-retry]').click()
                await page.wait_for_selector('.booking-map[data-price-state="ready"]')
                assert 'Rp2.250.000' in await page.locator('#public-venue-map').inner_text()
                empty_categories = True
                await page.goto(base + '/schedule.html')
                await page.wait_for_selector('.booking-map-empty')
                assert await page.locator('.booking-map-legend-zone').count() == 0
                assert not errors, errors
                assert not writes, writes
                await context.close()
            await browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    asyncio.run(run())
