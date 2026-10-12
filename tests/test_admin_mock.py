from pathlib import Path
from source_helpers import without_imports
import re,sys
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
source=(base/'js/live/admin.js').read_text()
source=without_imports(source).replace('export async function','async function')
css='\n'.join((base/'css'/n).read_text() for n in ('preview.css','type-refinement.css','live.css'))
css=re.sub(r'^@import.*$','',css,flags=re.MULTILINE)
mock=r'''const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const report=e=>{console.error(e)};
const fixtures={
  shows:[{id:'s1',slug:'weeknd',title:'The Weeknd - Night 01',show_date:'2026-11-20',artists:{name:'The Weeknd'},venues:{name:'GBK'},artist_id:'a1',venue_id:'v1',status:'published',description:'Demo concept',gates_at:'16:00',starts_at:'20:00',ends_at:'22:00'}],
  artists:[{id:'a1',name:'The Weeknd'}],venues:[{id:'v1',name:'GBK'}],
  ticket_categories:[{id:'c1',show_id:'s1',shows:{title:'The Weeknd - Night 01'},code:'vip',name:'VIP EXPERIENCE',price_idr:2250000,capacity:120,active:true}],
  orders:[{id:'00000000-0000-4000-8000-000000000001',customer_name:'Sample',customer_email:'sample@test.example',status:'confirmed_demo',total_idr:2250000,created_at:'2026-10-10T12:00:00Z',shows:{title:'The Weeknd - Night 01'},order_items:[{quantity:1,ticket_categories:{name:'VIP'}}],expires_at:'2026-10-10T12:10:00Z'}],
  tickets:[{id:'t1',attendee_name:'Sample',code:'NDKT-EXAMPLE',issued_at:'2026-10-10T12:00:00Z',checkins:[],ticket_categories:{name:'VIP'},orders:{customer_email:'sample@test.example',show_id:'s1',shows:{title:'The Weeknd - Night 01'},status:'confirmed_demo'}}],
  site_content:[{key:'hero_title',value:'THREE NIGHTS. ONE CITY.'}],faqs:[{id:'f1',question:'Real event?',answer:'No',published:true,sort_order:1}],announcements:[],general_settings:[{key:'currency',value:'IDR'},{key:'timezone',value:'Asia/Jakarta'}]
};
function builder(table){const t=fixtures[table]??[];return new Proxy({},{get(_,k){if(k==='then')return (yes,no)=>Promise.resolve({data:[...t],error:null,count:t.length}).then(yes,no);return (...a)=>builder(table)}})}
const db={from:t=>builder(t),rpc:(name)=>Promise.resolve({data: name==='admin_stats'?{real_revenue:0, tickets_issued:1, total_orders:1, attendees_checked_in:0,available_tickets:100,pending_demo:0,demo_booking_value:2250000}:name==='get_stock'?[{category_id:'c1',show_id:'s1',capacity:120,reserved:1,available:119}]:null,error:null}),auth:{signOut:async()=>({error:null})}};
const req=async p=>{let x=await p;if(x.error)throw x.error;return x.data};
'''
fail=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,channel='chrome',args=['--no-sandbox'])
 for width in (1440,390):
  page=b.new_page(viewport={'width':width,'height':844})
  page.on('pageerror',lambda e:fail.append('JS '+str(e)))
  html=f'<html><head><style>{css}</style></head><body><main id="main-content"></main><script>{mock}\n{source}\nmountAdmin(document.querySelector("main"))</script></body></html>'
  page.set_content(html,wait_until='domcontentloaded',timeout=10000)
  page.wait_for_timeout(200)
  for key in ['overview','concerts','tickets','orders','attendees','validation','reports','content','settings']:
   page.evaluate(f"location.hash='{key}';render();")
   page.wait_for_timeout(110)
   title=page.locator('.admin-section-title h2').inner_text()
   if title.lower()!={'overview':'overview','concerts':'concert management','tickets':'ticket management','orders':'orders & transactions','attendees':'attendees','validation':'ticket validation','reports':'analytics & reports','content':'website content','settings':'general settings'}[key]:fail.append(f'{width} {key} title: {title}')
   state=page.evaluate('''() => ({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})''')
   if state['s']>state['w']+1:fail.append(f'{width} {key} overflow: {state}')
  if width==390:page.screenshot(path=str(base/'tests'/'admin-mobile-test.png'),full_page=False)
  page.close()
 b.close()
print('Admin mock tested 9 modules at 1440px and 390px. Failures:',len(fail))
for x in fail:print(x)
sys.exit(bool(fail))
