"""Browser smoke tests for zone selection and checkout navigation; no Supabase project required."""
from pathlib import Path
import re
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def run():
    # Headless browser disallows both file:// and localhost URLs here. Inject the
    # unchanged page scripts & CSS into about:blank for isolated UI behavior QA.
    css = '\n'.join((ROOT/name).read_text() for name in ['css/preview.css','css/type-refinement.css','css/live.css','css/booking-flow.css'])
    zones = (ROOT/'js/ticket-zones.js').read_text()
    preview = (ROOT/'js/preview.js').read_text()
    def document(filename, query=''):
        html = (ROOT/filename).read_text()
        html = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', html)
        html = re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
        html = html.replace('</head>', f'<style>{css}</style></head>')
        return html.replace('</body>', f'<script>window.__PREVIEW_QUERY__={json.dumps(query)};history.replaceState=function(){{}};</script><script>{zones}</script><script>{preview}</script></body>')
    
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, args=['--no-sandbox'])
        for width in (320,375,390,768,1024,1440):
            page=browser.new_page(viewport={'width':width,'height':850})
            errors=[]
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.set_content(document('tickets.html','show=weeknd&zone=festa'),wait_until='domcontentloaded',timeout=5000)
            page.locator('[data-zone-code="festa"]').wait_for()
            assert page.locator('[data-zone-code="festa"]').get_attribute('aria-pressed')=='true'
            assert 'FESTIVAL A' in page.locator('#selected-zone-label').inner_text()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
            if width==390:
                page.screenshot(path=str(ROOT/'tests/booking-mobile-390.png'),full_page=True)
            if width==1440:
                page.screenshot(path=str(ROOT/'tests/booking-desktop-1440.png'),full_page=True)
            page.locator('[data-zone-code="vip"]').click()
            assert 'VIP EXPERIENCE' in page.locator('#selected-zone-label').inner_text()
            page.locator('[data-qty="vip"][data-delta="1"]').click()
            assert page.locator('#ticket-total').inner_text()=='Rp2.250.000'
            assert page.locator('#ticket-next').get_attribute('href')=='checkout.html?show=weeknd&vip=1'
            page.locator('#ticket-tabs [data-show="bieber"]').click()
            assert 'JUSTIN BIEBER' in page.locator('#summary-show').inner_text()
            assert page.locator('#ticket-total').inner_text()=='Rp0'
            assert page.locator('#ticket-next').get_attribute('aria-disabled')=='true'
            assert not errors, errors
            print(f'PASS booking zones {width}px')
            page.close()
        for slug in ('weeknd','bieber','bruno'):
            page=browser.new_page()
            page.set_default_timeout(2500)
            print('check detail',slug,flush=True)
            page.set_content(document('show.html','show='+slug),wait_until='domcontentloaded',timeout=5000)
            button=page.locator(f'.booking-map a.booking-map-zone.festa')
            assert button.get_attribute('href')==f'tickets.html?show={slug}&zone=festa'
            # URL navigation is blocked by the test browser; verify destination markup and its target rendering.
            page.close()
            page=browser.new_page()
            page.set_default_timeout(2500)
            page.set_content(document('tickets.html',f'show={slug}&zone=festa'),wait_until='domcontentloaded',timeout=5000)
            assert page.locator('[data-zone-code="festa"]').get_attribute('aria-pressed')=='true'
            print(f'PASS detail->tickets {slug}')
            page.close()
        page=browser.new_page()
        page.set_default_timeout(2500)
        print('check checkout',flush=True)
        page.set_content(document('tickets.html','show=bruno'),wait_until='domcontentloaded',timeout=5000)
        for _ in range(6): page.locator('[data-qty="festa"][data-delta="1"]').click(force=True)
        assert page.locator('#count-festa').inner_text()=='4'
        assert page.locator('#ticket-next').get_attribute('href')=='checkout.html?show=bruno&festa=4'
        page.close()
        page=browser.new_page()
        page.set_default_timeout(2500)
        page.set_content(document('checkout.html','show=bruno&festa=4'),wait_until='domcontentloaded',timeout=5000)
        assert page.locator('#checkout-demo [id^="attendee-"]').count()==4
        assert page.locator('.summary-total').inner_text().find('6.000.000')!=-1
        page.close()
        browser.close()
    print('PASS total frontend booking QA')


if __name__=='__main__': run()
