"""Inline source rendering and UI interaction tests for NADAKITA LIVE Show Guide."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

css='\n'.join((ROOT/'css'/part).read_text() for part in ('preview.css','type-refinement.css','live.css','show-guide.css'))
css=re.sub(r'^@import.*$', '', css, flags=re.MULTILINE)
preview=(ROOT/'js/preview.js').read_text()
guide=(ROOT/'js/show-guide.js').read_text()
source=(ROOT/'schedule.html').read_text()
source=re.sub(r'<link[^>]+href="css/[^"]+"[^>]*>', '', source)
source=re.sub(r'<script[^>]+src="js/[^"]+"[^>]*></script>', '', source)
source=source.replace('</head>',f'<style>{css}</style></head>')
script='<script>window.__PUSHES__=[];history.pushState=(s,t,u)=>window.__PUSHES__.push(u);</script>'
source=source.replace('</body>',script+f'<script>{preview}</script><script>{guide}</script></body>')

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    for width in (320, 375, 390, 768, 1024, 1440, 1920):
        page = browser.new_page(viewport={'width':width, 'height':850}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(source,wait_until='domcontentloaded')
        page.locator('#guide-night-options [role="tab"]').first.wait_for()
        assert page.locator('[role="tab"]').count()==3,(width,'tab count')
        for show,artist,date in [('weeknd','THE WEEKND','FRIDAY, 20 NOVEMBER 2026'),('bieber','JUSTIN BIEBER','SATURDAY, 21 NOVEMBER 2026'),('bruno','BRUNO MARS','SUNDAY, 22 NOVEMBER 2026')]:
            page.locator(f'[data-guide-show="{show}"]').click()
            assert page.locator('#guide-artist').inner_text()==artist,(width,show,'artist')
            assert page.locator('#guide-date').inner_text()==date,(width,show,'date')
            assert page.locator('.guide-night-tab[aria-selected="true"]').count()==1,(width,show,'active')
            assert page.locator(f'[data-guide-show="{show}"]').get_attribute('aria-selected')=='true'
            assert page.locator('#guide-ticket-link').get_attribute('href')==f'tickets.html?show={show}',(width,show,'tickets')
            assert page.locator('.guide-timeline .time-row').count()==5,(width,show,'rows')
            assert page.locator('.guide-timeline .highlight').count()==1,(width,show,'highlight')
            assert artist.lower().replace(' ','') in page.locator('.highlight h3').inner_text().lower().replace(' ','')
            assert [t.split(' WIB')[0] for t in page.locator('.guide-timeline .guide-slot-time').all_text_contents()][:4]==['16.00','16.00–19.00','19.00–19.45','20.00–22.00'],(width,show,'time')
            assert page.locator('#guide-venue').inner_text()=='Stadion Utama GBK, Jakarta'
            state=page.evaluate('''()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('#guide-timeline')?.getBoundingClientRect().width})''')
            assert state['scroll']<=state['viewport']+1,(width,show,'overflow',state)
            assert state['main']>0,(width,show,'content hidden')
        assert page.evaluate('String(window.__PUSHES__.at(-1))').endswith('?show=bruno'),(width,'URL update')
        page.locator('[data-guide-show="bieber"]').click()
        assert page.locator('#guide-artist').inner_text()=='JUSTIN BIEBER'
        # The public guide is driven by the same data returned for public concert cards.
        page.evaluate('''()=>window.NADAKITA_SHOW_GUIDE.setShows([
            {slug:'weeknd',artists:{name:'The Weeknd'},show_date:'2026-11-20',gates_at:'16:00:00',starts_at:'20:00:00',ends_at:'22:00:00',venues:{name:'Stadion Utama GBK'}},
            {slug:'bieber',artists:{name:'Justin Bieber'},show_date:'2026-11-21',gates_at:'16:00:00',starts_at:'20:00:00',ends_at:'22:00:00',venues:{name:'Stadion Utama GBK'}},
            {slug:'bruno',artists:{name:'Bruno Mars'},show_date:'2026-11-22',gates_at:'16:00:00',starts_at:'20:00:00',ends_at:'22:00:00',venues:{name:'Stadion Utama GBK'}}
        ])''')
        assert page.locator('#guide-artist').inner_text()=='JUSTIN BIEBER',(width,'remote update preserves selection')
        assert page.locator('#guide-date').inner_text()=='SATURDAY, 21 NOVEMBER 2026'
        # Ensure tabs support keyboard navigation and update without a reload.
        page.locator('[data-guide-show="bieber"]').focus()
        page.keyboard.press('ArrowRight')
        assert page.locator('#guide-artist').inner_text()=='BRUNO MARS',(width,'keyboard')
        assert not errors,(width,errors)
        print(f'PASS viewport={width} 3 nights + URL + no overflow + keyboard + Supabase update',flush=True)
        if width in (390,1024,1440):
            page.screenshot(path=str(ROOT/'tests'/f'guide-{width}.png'), full_page=True, animations='disabled')
        page.close()
    browser.close()
print('PASS all guide checks')
