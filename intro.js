// intro.js — Intro πέπλο πάνω από τη σκηνή (μόνο κουμπί «Συνέχεια»)
(() => {
  async function loadCfg() {
    try {
      const r = await fetch('intro.json', { cache: 'no-cache' });
      if (!r.ok) return { enabled: true, src: 'intro.html' };
      const cfg = await r.json();
      return cfg || { enabled: true, src: 'intro.html' };
    } catch {
      return { enabled: true, src: 'intro.html' };
    }
  }

  function ensureRoot() {
    let root = document.getElementById('intro-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'intro-root';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '5000',
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(0,0,0,.90)',   // «πολύ μικρή διαφάνεια»
      backdropFilter: 'blur(1.5px)',
      WebkitBackdropFilter: 'blur(1.5px)',
      padding: '16px',
      boxSizing: 'border-box'
    });

    // Container
    const box = document.createElement('div');
    Object.assign(box.style, {
      width: 'min(1040px, 94vw)',
      height: 'min(92vh, 860px)',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 18px 70px rgba(0,0,0,.55)',
      border: '1px solid rgba(255,255,255,.16)',
      display: 'grid',
      gridTemplateRows: '1fr auto'
    });
    root.appendChild(box);

    // Iframe (intro content)
    const frame = document.createElement('iframe');
    frame.title = 'Πρόγραμμα παράστασης';
    frame.loading = 'eager';
    frame.referrerPolicy = 'no-referrer';
    Object.assign(frame.style, {
      width: '100%',
      height: '100%',
      border: '0',
      background: 'transparent'
    });
    box.appendChild(frame);

    // Footer (μόνο κουμπί)
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex',
      justifyContent: 'center',
      padding: '12px',
      background: 'rgba(0,0,0,.35)',
      borderTop: '1px solid rgba(255,255,255,.14)'
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Συνέχεια';
    Object.assign(btn.style, {
      padding: '10px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,.22)',
      background: 'rgba(255,255,255,.10)',
      color: '#fff',
      cursor: 'pointer',
      fontWeight: '700',
      letterSpacing: '.2px'
    });

    btn.addEventListener('click', () => {
      // fade out
      root.style.transition = 'opacity 180ms ease';
      root.style.opacity = '0';
      setTimeout(() => root.remove(), 190);
    });

    footer.appendChild(btn);
    box.appendChild(footer);

    document.body.appendChild(root);
    return root;
  }

  async function showIntro() {
    const cfg = await loadCfg();
    if (cfg && cfg.enabled === false) return;

    const root = ensureRoot();
    const frame = root.querySelector('iframe');
    const src = (cfg && cfg.src) ? cfg.src : 'intro.html';
    if (frame && frame.getAttribute('src') !== src) frame.setAttribute('src', src);

    // αν κάτι έμεινε hidden από fallback
    root.style.display = 'grid';
    root.style.opacity = '1';
  }

  // Show ASAP (μόλις έχουμε body)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showIntro, { once: true });
  } else {
    showIntro();
  }
})();
