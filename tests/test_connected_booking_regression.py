"""Live UI booking regression with mock Supabase; no production writes."""
from http.server import ThreadingHTTPServer
from functools import partial
from threading import Thread
from datetime import datetime,timedelta,timezone
import json,re,time
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT,QuietHandler,SHOWS,CATEGORIES

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    ref=re.search(r'https://([^.]+)',(ROOT/'js/live/config.js').read_text()).group(1)
    user={'id':'booking-qa-user','email':'booking@example.test'}
    session={'access_token':'synthetic-token','refresh_token':'synthetic-refresh','expires_at':int(time.time())+3600,'user':user}
    submissions=[];order=None
    def backend(route):
        nonlocal order
        url=route.request.url
        if '/auth/v1/user' in url:payload=user
        elif '/rpc/is_admin' in url:payload=False
        elif '/rest/v1/shows?' in url:payload=SHOWS
        elif '/rest/v1/ticket_categories?' in url:payload=CATEGORIES
        elif '/rpc/get_stock' in url:payload=[{'category_id':c['id'],'available':100} for c in CATEGORIES]
        elif '/rest/v1/profiles?' in url:payload={'id':user['id'],'full_name':'Booking QA','phone':'08123456789'}
        elif '/rpc/create_demo_reservation' in url:
            body=route.request.post_data_json;submissions.append(body)
            order={'id':'booking-test-order','status':'pending_demo','shows':next(s for s in SHOWS if s['id']==body['p_show_id']),'total_idr':2250000,'expires_at':(datetime.now(timezone.utc)+timedelta(minutes=10)).isoformat(),'order_items':[],'tickets':[]}
            payload=order
        elif '/rpc/submit_demo_order' in url:
            order['status']='under_review';payload=order
        elif '/rest/v1/orders?' in url:payload=[order] if order else []
        else:payload=[]
        route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
            for width in (390,1440):
                for slug in ('weeknd','bieber','bruno'):
                    context=browser.new_context(viewport={'width':width,'height':1000})
                    context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
                    context.route('https://*.supabase.co/**',backend)
                    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto(base+'/tickets.html?show='+slug+'&zone=festa');page.wait_for_selector('html[data-page-ready]')
                    assert 'FESTIVAL A' in page.locator('#live-zone-context').inner_text()
                    page.locator('[data-cat="category-vip"][data-step="1"]').click()
                    assert page.locator('#live-total').inner_text()=='Rp2.250.000'
                    page.locator('#live-checkout').click();page.wait_for_url('**/checkout.html?**');page.wait_for_selector('html[data-page-ready]')
                    assert page.locator('#buyer-name').input_value()=='Booking QA'
                    assert page.locator('#buyer-email').input_value()==user['email']
                    assert page.locator('#attendee-0').input_value()==''
                    page.locator('#attendee-0').fill('Booking Attendee QA')
                    page.locator('#checkout-demo button[type="submit"]').click()
                    page.locator('#confirm-demo').wait_for();page.locator('#confirm-demo').click()
                    page.wait_for_url('**/dashboard.html');page.wait_for_selector('html[data-page-ready]')
                    assert 'Awaiting organizer review' in page.locator('.live-order').inner_text()
                    assert page.locator('.concert-ticket').count()==0
                    assert page.locator('[data-download-ticket]').count()==0
                    assert submissions[-1]['p_items']==[{'category_id':'category-vip','attendees':['Booking Attendee QA']}]
                    assert submissions[-1]['p_show_id']=='show-'+slug
                    assert not errors,errors
                    print('PASS connected booking -> review, profile fill, no premature QR',width,slug,flush=True)
                    context.close()
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
