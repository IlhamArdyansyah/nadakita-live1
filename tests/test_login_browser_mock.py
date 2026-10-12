"""Browser smoke tests for login startup using mock Auth SDK (no external secrets)."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
from source_helpers import without_imports

SITE = Path(__file__).resolve().parents[1]
preview = (SITE / 'js/preview.js').read_text()
app = (SITE / 'js/live/app.js').read_text()
assert re.search(r"form\.dataset\.authReady\s*=\s*'true';", app)
assert ' const existing=await currentUser()' not in app
assert re.search(r'import\s*\{\s*supabase as db,\s*configured,\s*sdkLoadError', app)
# Convert imports into injected dependencies for isolated browser testing.
app = without_imports(app)
app = "const {db,configured,sdkLoadError,money,esc,req,currentUser,isAdmin,requireUser,report} = window.__deps;\nconst mountAdmin=()=>{};\n" + app
app, redirects = re.subn(r"location\.href\s*=\s*\(await isAdmin\(\)\)\s*\?\s*'admin.html'\s*:\s*'dashboard.html';\s*return;", "window.__redirect=(await isAdmin())?'admin.html':'dashboard.html';return;", app)
assert redirects == 1, 'The real post-login redirect must still be tested'
app = '(()=>{\n' + app + '\n})();'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,channel='chrome',args=['--no-sandbox'])
    for mode in ('no_sdk','stale_session','admin_login'):
        page = browser.new_page(viewport={'width':375,'height':812})
        page.set_content('<!doctype html><html><head></head><body data-page="login"><div id="app"></div></body></html>')
        page.add_script_tag(content=preview)
        page.evaluate('''(mode) => {
          window.__requests=0;
          window.__deps={
            db: mode==='no_sdk' ? null : {auth:{signInWithPassword:async()=>{window.__requests++;return mode==='stale_session'?{error:new Error('Invalid login credentials')}:{data:{user:{id:'demo'}}}},}},
            configured:true,sdkLoadError:new Error('SDK blocked'),
            money:x=>'Rp'+x,esc:x=>String(x),req:async x=>x,
            currentUser:()=>Promise.reject(new Error('stale session should not block login')),
            isAdmin:async()=>true,requireUser:()=>{},report:e=>{let m=document.getElementById('live-message');m.textContent=e.message;m.hidden=false}
          };
        }''',mode)
        page.add_script_tag(content=app)
        page.wait_for_timeout(500)
        if mode=='no_sdk':
            assert page.locator('#auth-demo').get_attribute('data-auth-ready')=='true'
            assert page.locator('#live-message').is_visible()
            assert 'Unable to load' in page.locator('#live-message').inner_text()
            assert page.locator('#auth-demo button[type="submit"]').is_disabled()
        else:
            assert page.locator('#auth-demo').get_attribute('data-auth-ready')=='true'
            assert page.locator('#auth-demo button[type="submit"]').is_enabled()
            page.locator('#email').fill('admin@example.com')
            page.locator('#password').fill('StrongTestPassword!')
            page.locator('#auth-demo button[type="submit"]').click()
            page.wait_for_timeout(300)
            assert page.evaluate('window.__requests')==1, mode
            if mode=='stale_session':
                assert 'Invalid login credentials' in page.locator('#live-message').inner_text()
            else:
                assert page.evaluate('window.__redirect')=='admin.html'
        print(mode,'PASS')
        page.close()
    browser.close()
