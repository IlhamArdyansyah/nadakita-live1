/* Reveal the completed page once, after fonts and visible artwork are ready. */
(() => {
  const html = document.documentElement;
  html.dataset.pagePending = '';
  document.querySelector('main')?.setAttribute('aria-busy', 'true');
  let revealed = false;
  const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
  /** Tunggu font/gambar terlihat sebelum membuka halaman; panggilan berulang tidak merender lagi. */
  async function reveal() {
    if (revealed) return;
    revealed = true;
    await Promise.race([document.fonts.ready, timeout(2500)]);
    const images = [...document.querySelectorAll('main img')].filter(image => {
      const bounds = image.getBoundingClientRect();
      return bounds.top < innerHeight && bounds.bottom > 0 && !image.hidden;
    });
    await Promise.race([
      Promise.all(images.map(image => image.decode().catch(() => {}))),
      timeout(2500),
    ]);
    html.removeAttribute('data-page-pending');
    html.dataset.pageReady = '';
    document.querySelector('main')?.removeAttribute('aria-busy');
    window.dispatchEvent(new Event('nadakita:page-ready'));
  }
  window.NADAKITA_NAVIGATION = { reveal };
  // Prefetch only static HTML, without executing auth or reservation actions.
  const prefetched = new Set();
  const warm = event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.download || anchor.target) return;
    const url = new URL(anchor.href, location.href);
    if (
      url.origin !== location.origin ||
      !url.pathname.endsWith('.html') ||
      url.href === location.href ||
      prefetched.has(url.href)
    )
      return;
    prefetched.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.href;
    document.head.append(hint);
  };
  document.addEventListener('pointerover', warm);
  document.addEventListener('focusin', warm);
  addEventListener('pageshow', event => {
    if (event.persisted) {
      html.removeAttribute('data-page-pending');
      html.dataset.pageReady = '';
    }
  });
  // If the module itself cannot load, release the page with a visible recovery.
  setTimeout(() => {
    if (revealed) return;
    const main = document.querySelector('main');
    if (main?.querySelector('.show-loading')) {
      main.innerHTML =
        '<div class="wrap live-page"><h1>Unable to load this page</h1><p>Please reload to try again.</p><a class="btn pink">RELOAD PAGE</a></div>';
      main.querySelector('a').href = location.pathname + location.search;
    }
    reveal();
  }, 15000);
})();
