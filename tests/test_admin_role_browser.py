"""Role separation in the real UI; all Auth/database requests are synthetic."""
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import json, re, time
from playwright.sync_api import sync_playwright
from test_navigation_browser import ROOT, QuietHandler, SHOWS, CATEGORIES

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    ref=re.search(r'https://([^.]+)',(ROOT/'js/live/config.js').read_text()).group(1)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='chrome',headless=True)
            for admin in (True,False):
                user={'id':'role-qa','email':'role@example.test'}
                session={'access_token':'synthetic','refresh_token':'synthetic','expires_at':int(time.time())+3600,'user':user}
                for width in (390,1440):
                    context=browser.new_context(viewport={'width':width,'height':950})
                    context.add_init_script('localStorage.setItem('+json.dumps('sb-'+ref+'-auth-token')+','+json.dumps(json.dumps(session))+');')
                    writes=[]
                    def backend(route):
                        url=route.request.url
                        if route.request.method not in ('GET','OPTIONS') and '/rpc/is_admin' not in url and '/rpc/get_stock' not in url and '/rpc/admin_' not in url:writes.append(url)
                        if '/auth/v1/user' in url:payload=user
                        elif '/rpc/is_admin' in url:payload=admin
                        elif '/rest/v1/shows?' in url:payload=SHOWS
                        elif '/rest/v1/ticket_categories?' in url:payload=CATEGORIES
                        elif '/rpc/get_stock' in url:payload=[{'category_id':c['id'],'available':100} for c in CATEGORIES]
                        elif '/rpc/admin_stats' in url:payload={}
                        elif '/rest/v1/profiles?' in url:payload={'id':user['id'],'full_name':'Role QA','phone':'08123456789'}
                        else:payload=[]
                        route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
                    context.route('https://*.supabase.co/**',backend)
                    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    for path in ('tickets.html?show=weeknd','checkout.html?show=weeknd&vip=1','dashboard.html'):
                        page.goto(base+'/'+path)
                        if admin:
                            page.wait_for_url('**/admin.html');page.wait_for_selector('html[data-page-ready]');page.wait_for_selector('.admin-sidebar',state='attached')
                            assert page.locator('.header-cta[href="tickets.html"]').count()==0
                            assert page.locator('#checkout-demo, #live-checkout, #my-orders').count()==0
                        else:
                            page.wait_for_selector('html[data-page-ready]')
                            assert 'admin.html' not in page.url
                            assert page.locator('.header-cta').get_attribute('href')=='tickets.html'
                    if admin:
                        page.goto(base+'/admin.html#profile');page.wait_for_selector('#admin-profile-form')
                        assert page.locator('#admin-profile-form input[name="full_name"]').input_value()=='Role QA'
                        assert page.locator('#admin-profile-form').inner_text().find(user['email'])>=0
                        page.screenshot(path=str(ROOT/('tests/admin-role-'+str(width)+'.png')))
                    page.goto(base+'/index.html');page.wait_for_selector('html[data-page-ready]')
                    if admin:
                        assert page.locator('a[href^="tickets.html"], a[href^="checkout.html"], .nav a[href="dashboard.html"]').count()==0
                        assert page.locator('.nav a[href="admin.html"]').inner_text()=='CONTROL ROOM'
                    else:
                        assert page.locator('.nav a[href="dashboard.html"]').count()==1
                    assert not writes,writes
                    assert not errors,errors
                    print('PASS role separation', 'admin' if admin else 'customer',width,flush=True)
                    context.close()
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
