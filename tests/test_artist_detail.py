"""Artist detail redesign: full pages, mocked catalog/audio, no real backend writes."""
import io
import json
import math
import struct
import wave
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES


def audio_fixture():
    data = io.BytesIO()
    with wave.open(data, 'wb') as clip:
        clip.setnchannels(1)
        clip.setsampwidth(2)
        clip.setframerate(8000)
        clip.writeframes(b''.join(struct.pack('<h', int(2000 * math.sin(i * .15))) for i in range(10000)))
    return data.getvalue()


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    artifacts = ROOT / 'tests' / 'artifacts' / 'artist-detail'
    artifacts.mkdir(parents=True, exist_ok=True)
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            for width in (320, 390, 768, 1024, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 1000}, timezone_id='America/Los_Angeles')
                empty = False
                fail = False
                missing_audio = False
                def backend(route):
                    assert route.request.method == 'GET', 'No backend writes permitted'
                    url = route.request.url
                    if '/shows?' in url:
                        payload = SHOWS
                    elif '/ticket_categories?' in url:
                        if fail:
                            route.fulfill(status=503, content_type='application/json', body='{"message":"Catalog unavailable"}')
                            return
                        offset = 100000 if 'show-bieber' in url else 200000 if 'show-bruno' in url else 0
                        payload = [] if empty else [dict(c, price_idr=c['price_idr'] + offset, active=c['code'] != 'cat2') for c in CATEGORIES]
                    else:
                        payload = []
                    route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))
                context.route('https://*.supabase.co/**', backend)
                def audio_route(route):
                    if missing_audio:
                        route.fulfill(status=404, body='Audio fixture missing')
                    else:
                        data = audio_fixture()
                        requested = route.request.headers.get('range', '')
                        if requested.startswith('bytes='):
                            start, end = requested[6:].split('-', 1)
                            start = int(start or 0)
                            end = min(int(end) if end else len(data) - 1, len(data) - 1)
                            route.fulfill(status=206, content_type='audio/wav', body=data[start:end + 1], headers={'Accept-Ranges': 'bytes', 'Content-Range': f'bytes {start}-{end}/{len(data)}'})
                        else:
                            route.fulfill(status=200, content_type='audio/wav', body=data, headers={'Accept-Ranges': 'bytes'})
                context.route('**/assets/audio/*.mp3', audio_route)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                for index, (slug, artist, filename, weekday) in enumerate([
                    ('weeknd', 'The Weeknd', 'the-weeknd', 'FRIDAY'),
                    ('bieber', 'Justin Bieber', 'justin-bieber', 'SATURDAY'),
                    ('bruno', 'Bruno Mars', 'bruno-mars', 'SUNDAY'),
                ]):
                    page.goto(base + '/shows.html')
                    page.wait_for_selector('html[data-page-ready]')
                    page.locator(f'.show-card a[href="show.html?show={slug}"]').last.click()
                    page.wait_for_url(f'**/show.html?show={slug}')
                    page.wait_for_selector('html[data-page-ready]')
                    detail = page.locator('.artist-detail-page')
                    assert detail.count() == 1, 'New artist detail composition missing'
                    assert detail.locator('h1').inner_text().upper() == artist.upper()
                    assert weekday in detail.locator('.artist-detail-date').inner_text()
                    assert 'NOVEMBER 2026' in detail.locator('.artist-detail-date').inner_text()
                    image = detail.locator('.artist-detail-photo')
                    assert image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                    assert detail.locator('#show-song-preview').count() == 1
                    audio = detail.locator('audio')
                    assert audio.get_attribute('src').endswith(filename + '.mp3')
                    assert detail.locator('.song-track-name').inner_text() == ('Blinding Lights' if slug == 'weeknd' else artist)
                    detail.locator('.song-track-toggle').click()
                    page.wait_for_function('document.querySelector("audio").readyState >= 3')
                    assert abs(audio.evaluate('(el) => el.duration') - 1.25) < .01, 'Duration must come from file'
                    assert detail.locator('.song-track-duration').inner_text() == '0:01'
                    detail.locator('.song-track-mute').click()
                    assert audio.evaluate('(el) => el.muted')
                    detail.locator('.song-track-mute').click()
                    assert not audio.evaluate('(el) => el.muted')
                    seek = detail.locator('.song-track-seek')
                    if not audio.evaluate('(el) => el.paused'):
                        detail.locator('.song-track-toggle').click()
                    seek.focus()
                    page.keyboard.press('Home')
                    page.wait_for_function('!document.querySelector("audio").seeking && document.querySelector("audio").readyState >= 3')
                    page.keyboard.press('ArrowRight')
                    page.wait_for_function('document.querySelector("audio").currentTime > 0')
                    assert detail.locator('.booking-map-legend-zone').count() == 5
                    assert detail.locator('.booking-map-legend-zone.cat2[aria-disabled="true"]').count() == 1
                    price = ['Rp2.250.000', 'Rp2.350.000', 'Rp2.450.000'][index]
                    assert detail.locator('.booking-map-price').first.inner_text() == price
                    assert detail.locator('a.booking-map-legend-zone.vip').get_attribute('href') == f'tickets.html?show={slug}&zone=vip'
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, slug)
                    if width <= 800:
                        parts = [detail.locator(selector).bounding_box() for selector in ('.artist-detail-heading', '.artist-detail-portrait', '.artist-detail-copy', '.artist-detail-meta', '#show-song-preview')]
                        assert all(a['y'] + a['height'] <= b['y'] + 1 for a, b in zip(parts, parts[1:])), 'Mobile content order'
                    page.keyboard.press('Control+Home')
                    page.wait_for_timeout(500)
                    page.screenshot(path=str(artifacts / f'{slug}-{width}.png'), full_page=True, animations='disabled')
                    def typography():
                        return detail.locator('h1').evaluate('(el) => { const r=el.getBoundingClientRect(), s=getComputedStyle(el); return [r.width,r.height,s.fontFamily,s.fontSize,s.color]; }')
                    before = typography()
                    page.wait_for_timeout(250)
                    assert typography() == before, 'Late hero adjustment'
                    detail.locator('a.booking-map-legend-zone.vip').focus()
                    page.keyboard.press('Tab')
                    page.keyboard.press('Shift+Tab')
                    assert detail.locator('a.booking-map-legend-zone.vip').evaluate('(el) => el.matches(":focus-visible")')
                    print('PASS artist detail', width, slug, 'date, audio metadata, live prices, keyboard, layout', flush=True)
                empty = True
                page.goto(base + '/show.html?show=weeknd')
                page.wait_for_selector('.booking-map-empty')
                assert page.locator('.booking-map-legend-zone').count() == 0
                fail = True
                page.reload()
                page.wait_for_selector('#retry-show')
                fail = False
                empty = False
                page.locator('#retry-show').click()
                page.wait_for_selector('.artist-detail-page')
                missing_audio = True
                page.reload()
                page.wait_for_selector('html[data-page-ready]')
                page.locator('.song-track-toggle').click()
                page.wait_for_selector('.song-track-retry:not([hidden])')
                assert page.locator('.song-track-status').inner_text() == 'Audio unavailable. Try again later.'
                missing_audio = False
                page.locator('.song-track-retry').click()
                page.wait_for_function('document.querySelector("audio").readyState >= 1 && !document.querySelector("audio").paused')
                assert page.locator('.song-track-retry').is_hidden()
                context.route('**/artists/the-weeknd.jpg', lambda route: route.abort())
                page.reload()
                page.wait_for_selector('html[data-page-ready]')
                assert page.locator('.artist-detail-photo').is_hidden()
                assert page.locator('.artist-detail-photo-frame').get_attribute('aria-label') == 'Artist portrait unavailable'
                assert page.locator('.artist-detail-actions a').first.is_visible()
                assert not errors, errors
                context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
