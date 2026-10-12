"""Chromium parse + orders detail/approval smoke test for the admin module.

The original broken code passed node --check yet failed Chromium parsing.
This regression test deliberately validates source with Chromium, then renders
and exercises the organizer review UI against stubbed data (no live writes).
"""
from pathlib import Path
from source_helpers import without_imports
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
SOURCE = (BASE / 'js/live/admin.js').read_text(encoding='utf-8')
SRC_INJECTABLE = without_imports(SOURCE)
SRC_INJECTABLE = SRC_INJECTABLE.replace('export async function', 'async function')
MOCK = r'''
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const req=async p=>{const r=await p;if(r.error)throw r.error;return r.data};
const report=error=>{window.__errors.push(String(error))};
window.__errors=[];
window.__calls=[];
const fixture={
 shows:[{id:'show-01',title:'The Weeknd — Night 01',show_date:'2026-11-20',status:'published'}],
 orders:[{id:'00000000-0000-4000-8000-000000000333',customer_name:'Test Buyer',customer_email:'test@example.com',status:'under_review',total_idr:2250000,created_at:'2026-10-10T01:00:00Z',expires_at:'2099-10-10T01:00:00Z',submitted_at:'2026-10-10T01:02:00Z',reviewed_at:null,review_note:'',shows:{title:'The Weeknd — Night 01'},order_items:[{quantity:1,ticket_categories:{name:'VIP EXPERIENCE'}}]}],
 tickets:[],
 order_items:[{quantity:1,unit_price_idr:2250000,ticket_categories:{name:'VIP EXPERIENCE'}}]
};
function query(table){return new Proxy({},{get(_,key){
 if(key==='then')return (yes,no)=>Promise.resolve({data:fixture[table]||[],error:null,count:(fixture[table]||[]).length}).then(yes,no);
 return ()=>query(table);
}})}
const db={from:table=>query(table),rpc:(method,values)=>{
 window.__calls.push({method,values});
 let data=null;
 if(method==='get_stock')data=[];
 if(method==='admin_stats')data={demo_booking_value:2250000,real_revenue:0,tickets_issued:1,total_orders:1,attendees_checked_in:0,available_tickets:6959,pending_review:1,pending_demo:0};
 if(method==='admin_review_demo_order')data={status:values.p_approve?'confirmed_demo':'rejected'};
 return Promise.resolve({data,error:null});
},auth:{signOut:async()=>({error:null})}};
'''
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page_errors = []
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.on('dialog', lambda dialog: dialog.accept())
    # Both syntax and UI must execute in a real Chromium engine, not Node.
    page.set_content('<!doctype html><html><body><div id="admin-root"></div></body></html>')
    page.add_script_tag(content=MOCK + '\n' + SRC_INJECTABLE + '\nmountAdmin(document.getElementById("admin-root"));')
    page.wait_for_selector('.admin-kpi-grid')
    assert 'Rp2.250.000' in page.locator('#admin-body').inner_text()
    page.evaluate("location.hash='orders';render()")
    page.wait_for_selector('#detail-00000000-0000-4000-8000-000000000333')
    page.locator('#detail-00000000-0000-4000-8000-000000000333').click()
    page.wait_for_selector('#approve-selected')
    assert 'VIP EXPERIENCE' in page.locator('#order-details').inner_text()
    page.locator('#approve-selected').click()
    page.wait_for_function('window.__calls.some(x=>x.method==="admin_review_demo_order")')
    assert page.evaluate('window.__calls.find(x=>x.method==="admin_review_demo_order").values.p_approve') is True
    assert page_errors == [], page_errors
    assert page.evaluate('window.__errors') == [], page.evaluate('window.__errors')
    browser.close()
print('PASS: Chromium parse, overview, orders detail, approve review RPC (mock).')
