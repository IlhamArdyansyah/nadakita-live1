"""Authenticated dashboard and PNG export against synthetic Supabase fixtures."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from threading import Thread
import json
import re
import time
from playwright.sync_api import sync_playwright
from test_navigation_browser import QuietHandler, ROOT

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    ref=re.search(r'https://([^.]+)',(ROOT/'js/live/config.js').read_text()).group(1)
    user={'id':'wallet-user','email':'wallet@example.test','app_metadata':{}}
    show={'title':'The Weeknd — Night 01','show_date':'2026-11-20','venues':{'name':'Stadion Utama GBK','city':'Jakarta'}}
    ticket={'id':'ticket-1','code':'NK-WALLET-1234','attendee_name':'Sari <script>','ticket_categories':{'name':'VIP EXPERIENCE'},'checkins':[]}
    orders=[{'id':'order-'+status,'status':status,'total_idr':2250000,'shows':show,'tickets':[ticket],'order_items':[{'quantity':1,'ticket_categories':{'name':'VIP EXPERIENCE'}}],'expires_at':'2099-11-20T00:00:00Z'} for status in ('confirmed_demo','under_review','cancelled')]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
            for width in (320,768,1024,1440):
                ticket['attendee_name']='Sari <script>'+(' Long Attendee Name'*8 if width==768 else '')
                context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True)
                # Test-only synthetic credentials. Never inspect or use a real user's session.
                session={'access_token':'synthetic-test-token','refresh_token':'synthetic-refresh','expires_at':int(time.time())+3600,'user':user}
                context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
                def backend(route):
                    url=route.request.url
                    if '/auth/v1/user' in url: payload=user
                    elif '/rest/v1/orders?' in url: payload=orders
                    elif '/rest/v1/profiles?' in url: payload={'id':user['id'],'full_name':'Wallet Tester','phone':'08123456789'}
                    elif '/rpc/is_admin' in url: payload=False
                    else: payload=[]
                    route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
                context.route('https://*.supabase.co/**',backend)
                page=context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/dashboard.html')
                page.wait_for_selector('html[data-page-ready]')
                assert page.locator('.concert-ticket').count()==1
                assert page.locator('.order-zone-summary').count()==3
                assert page.locator('.concert-ticket').inner_text().find('Sari <script>')>=0
                assert page.locator('[data-download-ticket]').is_enabled()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
                assert page.locator('.concert-ticket .qr-slot canvas').count()==1
                with page.expect_download() as download:
                    page.locator('[data-download-ticket]').click()
                item=download.value
                assert item.suggested_filename=='nadakita-NK-WALLET-1234.png'
                data=Path(item.path()).read_bytes()
                assert data[:8]==b'\x89PNG\r\n\x1a\n'
                assert int.from_bytes(data[16:20],'big')==2400
                assert int.from_bytes(data[20:24],'big')>=900
                if width==768: assert int.from_bytes(data[20:24],'big')>900
                if width==1440:
                    page.locator('.concert-ticket').screenshot(path=str(ROOT/'tests/ticket-wallet-desktop.png'))
                    item.save_as(str(ROOT/'tests/ticket-wallet-export.png'))
                assert not errors,errors
                print('PASS wallet layout and actual PNG download',width,flush=True)
                context.close()
            context=browser.new_context(viewport={'width':390,'height':900})
            context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
            context.route('https://*.supabase.co/**',backend)
            context.route('**/js/vendor/qrcode-1.0.0.min.js',lambda route:route.abort())
            page=context.new_page();page.goto(base+'/dashboard.html');page.wait_for_selector('html[data-page-ready]')
            assert page.locator('[data-download-ticket]').is_disabled()
            assert 'QR unavailable' in page.locator('.ticket-download-note').inner_text()
            assert 'QR unavailable' in page.locator('[data-ticket-qr]').text_content()
            print('PASS QR failure disables download')
            browser.close()
    finally: server.shutdown()

if __name__=='__main__': run()
