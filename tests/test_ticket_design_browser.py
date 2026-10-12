"""15 design variants, exact QR payload round trips and HD PNG export.
Uses synthetic Supabase auth/data; never creates orders or check-ins in production.
Test dependencies: Playwright, Pillow, zxing-cpp.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from threading import Thread
import json
import re
import time
import io
from PIL import Image
import zxingcpp
from playwright.sync_api import sync_playwright
from test_navigation_browser import QuietHandler,ROOT

ARTISTS=[('weeknd','The Weeknd','01','2026-11-20'),('bieber','Justin Bieber','02','2026-11-21'),('bruno','Bruno Mars','03','2026-11-22')]
ZONES=[('vip','VIP EXPERIENCE'),('festa','FESTIVAL A'),('festb','FESTIVAL B'),('cat1','CAT 1'),('cat2','CAT 2')]

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    ref=re.search(r'https://([^.]+)',(ROOT/'js/live/config.js').read_text()).group(1)
    user={'id':'ticket-design-user','email':'design@example.test','app_metadata':{}}
    orders=[]
    for index,(slug,name,night,date) in enumerate(ARTISTS):
        for zoneIndex,(code,zone) in enumerate(ZONES):
            suffix=str(index*5+zoneIndex+1).zfill(12)
            ticket={'id':'ticket-'+slug+'-'+code,'code':'NDKT-00000000000040008000'+suffix,'attendee_name':'QA Attendee '+name,'ticket_categories':{'name':zone,'code':code},'checkins':[{'checked_at':'2026-11-20T13:00:00Z'}] if code=='cat2' else []}
            orders.append({'id':'00000000-0000-4000-8000-'+suffix,'owner_id':user['id'],'status':'confirmed_demo','total_idr':2250000,'shows':{'slug':slug,'title':name+' — Night '+night,'artists':{'slug':slug,'name':name},'show_date':date,'venues':{'name':'Stadion Utama Gelora Bung Karno','city':'Jakarta'}},'tickets':[ticket],'order_items':[{'quantity':1,'ticket_categories':{'name':zone}}]})
    approved=orders[0]
    for status in ('pending_demo','under_review','cancelled','rejected','expired'):
        orders.append({**approved,'id':'not-issued-'+status,'status':status,'expires_at':'2099-01-01T00:00:00Z'})
    artifacts=ROOT/'tests/artifacts/tickets';artifacts.mkdir(parents=True,exist_ok=True)
    requests=[]
    def backend(route):
        url=route.request.url;requests.append(url)
        if '/auth/v1/user' in url:payload=user
        elif '/rest/v1/orders?' in url:
            assert 'owner_id=eq.ticket-design-user' in url
            payload=orders
        elif '/rest/v1/profiles?' in url:payload={'id':user['id'],'full_name':'Design QA','phone':''}
        elif '/rpc/is_admin' in url:payload=False
        else:payload=[]
        route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
            for width in (320,768,1024,1440):
                context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True)
                session={'access_token':'synthetic-token','refresh_token':'synthetic-refresh','expires_at':int(time.time())+3600,'user':user}
                context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
                context.route('https://*.supabase.co/**',backend)
                page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(base+'/dashboard.html');page.wait_for_selector('html[data-page-ready]')
                cards=page.locator('.concert-ticket');assert cards.count()==15
                assert page.locator('.dashboard-cards .stat-card strong').all_text_contents()==['20','15','3']
                assert page.locator('[data-download-ticket]:enabled').count()==15
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
                assert page.evaluate('''() => [...document.querySelectorAll('.ticket-preview>svg')].every(svg=>{
                    const root=svg.getBoundingClientRect();return [...svg.querySelectorAll('text')].every(text=>{
                        const r=text.getBoundingClientRect();return r.left>=root.left-1&&r.right<=root.right+1&&r.top>=root.top-1&&r.bottom<=root.bottom+1;
                    });
                })'''), 'Ticket text outside SVG bounds'
                for index in range(15):
                    card=cards.nth(index);ticket=orders[index]['tickets'][0]
                    assert card.locator('[data-ticket-qr] path').count()==1
                    assert card.locator('.ticket-admission').inner_text()==('CHECKED IN' if ticket['checkins'] else 'NOT CHECKED IN')
                    if width==1440 or (width==320 and index==0):
                        with page.expect_download() as event:card.locator('[data-download-ticket]').click()
                        download=event.value;data=Path(download.path()).read_bytes()
                        image=Image.open(io.BytesIO(data));assert image.width==2400 and image.height>=900
                        results=zxingcpp.read_barcodes(image)
                        assert len(results)==1 and results[0].text==ticket['code'],(width,index,[r.text for r in results])
                        assert download.suggested_filename=='nadakita-'+ticket['code']+'.png'
                        if width==1440:
                            slug=orders[index]['shows']['slug'];zone=ticket['ticket_categories']['code']
                            download.save_as(str(artifacts/(slug+'-'+zone+'.png')))
                            card.screenshot(path=str(artifacts/(slug+'-'+zone+'-preview.png')))
                if width==320:cards.first.screenshot(path=str(artifacts/'mobile-preview.png'))
                assert not errors,errors
                print('PASS 15 variants, statuses, layout and '+('15 PNG/QR round trips' if width==1440 else 'mobile HD export' if width==320 else 'preview')+' at '+str(width),flush=True)
                context.close()
            # Check every field with long strings and a real UUID without cropping.
            orders[0]['tickets'][0]['attendee_name']='W'*120
            orders[0]['shows']['title']='Long concert title '+('W'*80)
            context=browser.new_context(viewport={'width':390,'height':900},accept_downloads=True)
            context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
            context.route('https://*.supabase.co/**',backend)
            page=context.new_page();page.goto(base+'/dashboard.html');page.wait_for_selector('html[data-page-ready]')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            with page.expect_download() as event:page.locator('[data-download-ticket]').first.click()
            data=Path(event.value.path()).read_bytes();image=Image.open(io.BytesIO(data));assert image.height>900
            assert zxingcpp.read_barcodes(image)[0].text==orders[0]['tickets'][0]['code']
            print('PASS long title, 120-character holder and exact exported QR')
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
