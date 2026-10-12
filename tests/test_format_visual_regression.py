"""Compare pre-format snapshot to current source using isolated browsers and mocked APIs."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import io, json, sys
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES

class BeforeHandler(QuietHandler):
    def __init__(self, *args, snapshot, **kwargs):
        self.snapshot = snapshot
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        current = Path(super().translate_path(path))
        relative = current.relative_to(ROOT)
        original = self.snapshot / relative
        # Snapshot source (including CSS) takes precedence; unchanged assets
        # are served from the project for both versions.
        return str(original if original.is_file() else current)

def run(snapshot, focus=None):
    before = ThreadingHTTPServer(('127.0.0.1', 0), partial(BeforeHandler, snapshot=snapshot))
    after = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    for server in (before, after):
        Thread(target=server.serve_forever, daemon=True).start()
    paths = ['index.html', 'shows.html', 'show.html?show=weeknd', 'schedule.html',
             'tickets.html', 'checkout.html?show=weeknd&cat-category-vip=1',
             'about.html', 'login.html', 'dashboard.html', 'admin.html']
    if focus:
        paths = [path for path in paths if path == focus]
        assert paths, 'Focus path must be one of the full-suite paths'
    pixel_failures = []
    def backend(route):
        url = route.request.url
        if '/rest/v1/shows?' in url:
            payload = SHOWS
        elif '/rest/v1/ticket_categories?' in url:
            payload = CATEGORIES
        elif '/rpc/get_stock' in url:
            payload = [{'category_id': c['id'], 'available': 100} for c in CATEGORIES]
        elif '/rpc/is_admin' in url:
            payload = False
        else:
            payload = []
        route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            for width in (390, 1440):
                for path in paths:
                    outputs = []
                    for server in (before, after):
                        context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
                        context.add_init_script('Date.now = () => 1791583200000;')
                        context.route('https://*.supabase.co/**', backend)
                        page = context.new_page()
                        errors = []
                        page.on('pageerror', lambda e: errors.append(str(e)))
                        page.goto('http://127.0.0.1:' + str(server.server_port) + '/' + path)
                        page.wait_for_selector('html[data-page-ready]')
                        # Force layout before waiting: pseudo-element glyphs can trigger
                        # a late font request after the dynamically rendered page appears.
                        page.evaluate('document.body.getBoundingClientRect()')
                        page.evaluate('document.fonts.ready')
                        # Generated glyphs (the login star) need their exact font
                        # loaded too; they are absent from normal text nodes.
                        page.evaluate('''async () => {
                            const pending = [];
                            for (const element of document.querySelectorAll('body *')) {
                                for (const pseudo of ['::before', '::after']) {
                                    const style = getComputedStyle(element, pseudo);
                                    if (style.content === 'none' || style.content === 'normal' || style.content === '""') continue;
                                    const font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
                                    pending.push(document.fonts.load(font, style.content));
                                }
                            }
                            await Promise.all(pending);
                            await document.fonts.ready;
                        }''')
                        # Full-page captures include lazy images below the viewport.
                        # Finish decoding them before comparing pixels, not partial JPEGs.
                        page.evaluate('''async () => {
                            await Promise.all([...document.images].map(async image => {
                                image.loading = 'eager';
                                try { await image.decode(); } catch {}
                            }));
                            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                        }''')
                        pixels = page.screenshot(animations='disabled', full_page=True)
                        state = page.evaluate('''({text:document.querySelector('main').innerText,
                            width:document.documentElement.scrollWidth,
                            links:[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href'))})''')
                        assert not errors, errors
                        outputs.append((Image.open(io.BytesIO(pixels)).convert('RGB'), state))
                        context.close()
                    assert outputs[0][1] == outputs[1][1], (width, path, 'DOM/layout changed')
                    assert outputs[0][0].size == outputs[1][0].size, (width, path, 'page size changed')
                    difference = ImageChops.difference(outputs[0][0], outputs[1][0]).getbbox()
                    if difference:
                        artifacts = ROOT / 'tests/artifacts/source-cleanup'
                        artifacts.mkdir(parents=True, exist_ok=True)
                        for name, output in zip(('before', 'after'), outputs):
                            output[0].save(artifacts / (name + '-' + str(width) + '.png'))
                            output[0].save(artifacts / (path.split('.html')[0] + '-' + name + '-' + str(width) + '.png'))
                        pixel_failures.append((width, path, 'pixels changed', difference))
                        print('FAIL pixels changed', width, path, difference, flush=True)
                    else:
                        print('PASS identical pixels and DOM', width, path, flush=True)
            browser.close()
            # Collect every visual finding, but still fail the suite for any pixel change.
            assert not pixel_failures, pixel_failures
    finally:
        before.shutdown()
        after.shutdown()

if __name__ == '__main__':
    run(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else None)
