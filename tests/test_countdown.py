"""Homepage countdown regression: time transitions, timezone, spacing and links."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
html = re.sub(r'<link[^>]+href="css/[^"]+"[^>]*>', '', html)
html = re.sub(r'<script[^>]+src="js/[^"]+"[^>]*></script>', '', html)
css = '\n'.join((ROOT/'css'/name).read_text() for name in ('preview.css','type-refinement.css','live.css','countdown.css'))
css = re.sub(r'^@import.*$', '',css,flags=re.MULTILINE)
html = html.replace('</head>', f'<style>{css}</style></head>')
js = (ROOT/'js/preview.js').read_text() + '\n' + (ROOT/'js/countdown.js').read_text()
html = html.replace('</body>',f'<script>{js}</script></body>')

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    for timezone in ('Asia/Jakarta','America/Los_Angeles'):
        for width in (320,375,390,768,1024,1440,1920):
            p=browser.new_page(viewport={'width':width,'height':840}, timezone_id=timezone)
            errors=[]
            p.on('pageerror', lambda e: errors.append(str(e)))
            p.set_content(html,wait_until='domcontentloaded')
            p.locator('#concert-countdown').wait_for()
            assert p.locator('.concert-countdown').count()==1
            assert p.locator('.tickers').count()==0
            assert p.locator('.stats-strip strong').all_text_contents()==['03','03','01']
            assert p.locator('.show-grid .show-card').count()==3
            assert p.locator('.hero h1').count()==1
            state=p.evaluate('''() => ({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth, gap:document.querySelector('.stats-strip + .section .preview-label').getBoundingClientRect().top - document.querySelector('.stats-strip').getBoundingClientRect().bottom, timerCount:window.NADAKITA_LIVE_COUNTDOWN?.stateAt(Date.parse('2026-11-19T20:00:00+07:00')).show?.night})''')
            assert state['overflow']<=1,(width,timezone,state)
            assert (21<=state['gap']<=50),(width,timezone,'gap',state)
            assert state['timerCount']=='01'
            def display_at(ts):
                p.evaluate('(timestamp) => { Date.now=()=>timestamp; }',ts)
                p.wait_for_timeout(1090)
                return p.locator('#countdown-title').inner_text(),p.locator('#countdown-clock').is_visible()
            epochs={key: __import__('datetime').datetime.fromisoformat(iso).timestamp()*1000 for key,iso in {
                'before1':'2026-11-20T19:59:58+07:00',
                'live1':'2026-11-20T20:00:00+07:00',
                'before2':'2026-11-21T19:59:58+07:00',
                'live2':'2026-11-21T20:00:00+07:00',
                'before3':'2026-11-22T19:59:58+07:00',
                'live3':'2026-11-22T20:00:00+07:00',
                'done':'2026-11-22T22:00:00+07:00'}.items()}
            # Deterministic pure state transitions (no 1-second wait per boundary).
            states=p.evaluate('''(times) => Object.fromEntries(Object.entries(times).map(([k, v]) => {
              const s=window.NADAKITA_LIVE_COUNTDOWN.stateAt(v);
              return [k,[s.type,s.show?.slug || null,s.remaining ?? null]]
            }))''',epochs)
            assert states['before1'][:2]==['upcoming','weeknd']
            assert states['live1'][:2]==['live','weeknd']
            assert states['before2'][:2]==['upcoming','bieber']
            assert states['live2'][:2]==['live','bieber']
            assert states['before3'][:2]==['upcoming','bruno']
            assert states['live3'][:2]==['live','bruno']
            assert states['done'][:2]==['completed',None]
            assert all(s[2] is None or s[2]>=0 for s in states.values())
            assert p.locator('a[href="shows.html"]').count()>=1
            assert p.locator('a[href="tickets.html"]').count()>=1
            assert p.locator('a[href="show.html?show=weeknd"]').count()>=1
            assert not errors,(width,timezone,errors)
            if timezone=='Asia/Jakarta' and width in (320,390,768,1440):
                p.screenshot(path=str(ROOT/'tests'/f'countdown-{width}.png'),full_page=True,animations='disabled')
            print(f'PASS {timezone} {width}px: transitions, layout, nav',flush=True)
            p.close()
    # Realtime numbers and status rendering, on one browser to avoid slow sleeps across many viewports
    p=browser.new_page(viewport={'width':1440,'height':840})
    p.set_content(html,wait_until='domcontentloaded')
    p.evaluate('''() => {Date.now=()=>Date.parse('2026-11-20T19:59:57+07:00')}''')
    p.wait_for_timeout(1050)
    assert p.locator('#countdown-title').inner_text().upper()=='COUNTDOWN TO NIGHT 01 — THE WEEKND'
    assert p.locator('[data-countdown="seconds"]').inner_text()=='03'
    p.evaluate('''() => {Date.now=()=>Date.parse('2026-11-20T20:00:00+07:00')}''')
    p.wait_for_timeout(1050)
    assert 'IS LIVE' in p.locator('#countdown-title').inner_text()
    assert not p.locator('#countdown-clock').is_visible()
    p.evaluate('''() => {Date.now=()=>Date.parse('2026-11-20T22:00:00+07:00')}''')
    p.wait_for_timeout(1050)
    assert 'NIGHT 02' in p.locator('#countdown-title').inner_text()
    assert p.locator('#countdown-clock').is_visible()
    # Database-supplied schedule drives timer rather than preview data.
    p.evaluate('''() => window.NADAKITA_LIVE_COUNTDOWN.setShows([
      {slug:'weeknd',show_date:'2026-12-20',starts_at:'20:00:00',ends_at:'22:00:00',artists:{name:'The Weeknd'}},
      {slug:'bieber',show_date:'2026-12-21',starts_at:'20:00:00',ends_at:'22:00:00',artists:{name:'Justin Bieber'}},
      {slug:'bruno',show_date:'2026-12-22',starts_at:'20:00:00',ends_at:'22:00:00',artists:{name:'Bruno Mars'}}
    ])''')
    assert 'NIGHT 01' in p.locator('#countdown-title').inner_text()
    assert p.evaluate('''() => window.NADAKITA_LIVE_COUNTDOWN.stateAt(Date.parse('2026-12-21T20:10:00+07:00')).show.slug''')=='bieber'
    # No duplicate intervals on schedule refresh or lifecycle events.
    active=p.evaluate('''() => {
      const oldSet=window.setInterval.bind(window),oldClear=window.clearInterval.bind(window);
      const ids=new Set();
      window.setInterval=(fn,interval)=>{const id=oldSet(fn,interval);ids.add(id);return id};
      window.clearInterval=id=>{ids.delete(id);return oldClear(id)};
      window.NADAKITA_LIVE_COUNTDOWN.setShows([
        {slug:'weeknd',show_date:'2026-12-20',starts_at:'20:00',ends_at:'22:00',artists:{name:'The Weeknd'}}
      ]);
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('pageshow'));
      return ids.size;
    }''')
    assert active==1,('duplicate countdown intervals',active)
    p.evaluate('''() => {Date.now=()=>Date.parse('2026-12-22T22:00:00+07:00')}''')
    p.wait_for_timeout(1080)
    assert p.locator('#countdown-title').inner_text()=='ALL SHOWS HAVE ENDED'
    p.evaluate('''() => window.NADAKITA_LIVE_COUNTDOWN.setUnavailable()''')
    assert p.locator('#countdown-title').inner_text()=='CONCERT SCHEDULE UNAVAILABLE'
    p.close()
    browser.close()
print('PASS: countdown transitions, timezone independence, update cadence, live status, Supabase injection, unavailable state')
