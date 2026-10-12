"""Favicon metadata/asset smoke test with isolated Chrome and no backend writes."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    artifacts = ROOT / 'tests' / 'artifacts' / 'favicon'
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
            context = browser.new_context()
            context.route('https://*.supabase.co/**', lambda route: route.fulfill(status=200, content_type='application/json', body='[]'))
            page = context.new_page()
            for entry in ('index.html', 'show.html?show=weeknd', 'login.html', 'admin.html'):
                page.goto(base + '/' + entry, wait_until='domcontentloaded')
                icon = page.locator('link[rel="icon"]')
                assert icon.count() == 1
                url = icon.evaluate('(el) => el.href')
                response = context.request.get(url)
                assert response.status == 200
                assert 'image/svg+xml' in response.headers['content-type']
            # Synthetic image fixture shows the actual vector at browser-tab sizes.
            page.set_content(f'<img src="{base}/assets/icons/favicon.svg" width="32" height="32" alt="NADAKITA icon">')
            image = page.locator('img')
            page.wait_for_function('document.querySelector("img").complete && document.querySelector("img").naturalWidth > 0')
            image.screenshot(path=str(artifacts / 'favicon-32.png'))
            browser.close()
            print('PASS favicon served as SVG and declared on Home, Show, Login and Admin', flush=True)
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
