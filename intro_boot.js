// intro_boot.js — Intro πέπλο πάνω από τη σκηνή (εμφάνιση ΠΡΙΝ φανεί οτιδήποτε από το stage)
(function () {
  // 1) Κλείδωσε αμέσως το stage (για να μη φαίνεται loading πριν ανέβει το πέπλο)
  try { document.documentElement.setAttribute('data-intro-active', '1'); } catch(e){}

  // 2) Μικρό global CSS (μπαίνει στο <head> όσο νωρίς γίνεται)
  (function injectEarlyStyle(){
    var st = document.getElementById('intro-early-style');
    if (st) return;
    st = document.createElement('style');
    st.id = 'intro-early-style';
    st.textContent =
      'html{background:#000;}\n' +
      'html[data-intro-active="1"] body{overflow:hidden;}\n' +
      'html[data-intro-active="1"] #stage{visibility:hidden;}\n';
    (document.head || document.documentElement).appendChild(st);
  })();

  function createOverlayIfMissing() {
    if (document.getElementById('intro-root')) return;

    var root = document.createElement('div');
    root.id = 'intro-root';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '5000',
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(0,0,0,.90)',      // πέπλο με μικρή διαφάνεια
      backdropFilter: 'blur(1.5px)',
      WebkitBackdropFilter: 'blur(1.5px)',
      padding: '16px',
      boxSizing: 'border-box'
    });

    var box = document.createElement('div');
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

    var frame = document.createElement('iframe');
    frame.title = 'Πρόγραμμα παράστασης';
    frame.loading = 'eager';
    frame.referrerPolicy = 'no-referrer';
    frame.src = 'intro.html';
    Object.assign(frame.style, { width: '100%', height: '100%', border: '0', background: 'transparent' });
    box.appendChild(frame);

    var footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex',
      justifyContent: 'center',
      padding: '12px',
      background: 'rgba(0,0,0,.35)',
      borderTop: '1px solid rgba(255,255,255,.14)'
    });

    var btn = document.createElement('button');
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

    btn.addEventListener('click', function () {
      // ξεκλείδωμα stage + fade out
      try { document.documentElement.removeAttribute('data-intro-active'); } catch(e){}
      root.style.transition = 'opacity 180ms ease';
      root.style.opacity = '0';
      setTimeout(function () { root.remove(); }, 190);
    });

    footer.appendChild(btn);
    box.appendChild(footer);

    // append ASAP (ακόμα κι αν δεν υπάρχει body)
    (document.body || document.documentElement).appendChild(root);
  }

  async function applyCfg() {
    try {
      var r = await fetch('intro.json', { cache: 'no-cache' });
      if (!r.ok) return;
      var cfg = await r.json();
      if (cfg && cfg.enabled === false) {
        // Αν είναι disabled, καθάρισε και ξεκλείδωσε
        try { document.documentElement.removeAttribute('data-intro-active'); } catch(e){}
        var root = document.getElementById('intro-root');
        if (root) root.remove();
        return;
      }
      // ενημέρωσε κουμπί (αν υπάρχει)
      var root2 = document.getElementById('intro-root');
      if (root2 && cfg && cfg.buttonLabel) {
        var b = root2.querySelector('button');
        if (b) b.textContent = String(cfg.buttonLabel);
      }
    } catch (e) { /* ignore */ }
  }

  // Δημιούργησε αμέσως
  createOverlayIfMissing();

  // Όταν υπάρχει DOM/δίκτυο, φέρε ρυθμίσεις (δεν επηρεάζει το "πρώτο render")
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCfg, { once: true });
  } else {
    applyCfg();
  }
})();
