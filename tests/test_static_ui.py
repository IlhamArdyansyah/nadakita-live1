from pathlib import Path
import re,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css='\n'.join((root/'css'/name).read_text() for name in ('preview.css','type-refinement.css','live.css'))
css=re.sub(r'^@import.*$', '',css,flags=re.MULTILINE)
preview=(root/'js/preview.js').read_text()
zones=(root/'js/ticket-zones.js').read_text()
app=(root/'js/live/app.js').read_text()
from source_helpers import without_imports
app=without_imports(app)
setup="""const configured=false,db=null;
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));
const req=async x=>x,currentUser=async()=>null,isAdmin=async()=>false,requireUser=async()=>null,report=e=>console.error(e),mountAdmin=async()=>{};
"""
errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    for width in (1440,390,320):
        for file in sorted(root.glob('*.html')):
            page=browser.new_page(viewport={'width':width,'height':840})
            page.on('pageerror',lambda e:errors.append(f'JS: {e}'))
            s=file.read_text()
            s=re.sub(r'<link[^>]+href="css/[^\"]+"[^>]*>', '',s)
            s=re.sub(r'<script[^>]+src="js/[^\"]+"[^>]*></script>','',s)
            s=s.replace('</head>',f'<style>{css}</style></head>')
            s=s.replace('</body>',f'<script>{zones}</script><script>(()=>{{{preview}}})();</script><script>(()=>{{{setup}{app}}})();</script></body>')
            try:
                page.set_content(s,wait_until='domcontentloaded',timeout=8000)
                page.wait_for_timeout(20)
                state=page.evaluate('''() => ({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,main:!!document.querySelector('main'),text:document.querySelector('main')?.innerText.slice(0,130)})''')
                if not state['main'] or state['scroll']>state['width']+1:
                    errors.append(f'{width} {file.name}: {state}')
                if file.name in ('admin.html','login.html','dashboard.html','checkout.html','tickets.html') and 'SETUP REQUIRED' not in state['text']:
                    errors.append(f'No config guard: {file.name} {state}')
            except Exception as e:errors.append(f'FAIL {width} {file.name}: {e}')
            finally:page.close()
        print('Validated',width,'px',flush=True)
    browser.close()
for e in errors[:35]:print(e)
print('Smoke test failures:',len(errors))
sys.exit(bool(errors))
