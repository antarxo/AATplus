const BOOK_STORAGE_KEY = 'aatBookData';

  let VIEWERS = [];
  let ACT1 = [];
  let ACT2 = [];
  let FOYER = [];

  // επιπλέον config από book*.json (πρόσθετα)
  let BOOK_CFG = null;

  // παγκόσμιες παράμετροι για διαγράμματα / templates
  let gA = 3.0;
  let gT = 6.0;
  let gOmega = 2*Math.PI/6.0;
  let gX0 = 0.0;
  let gPhi0Deg = 0.0;
  let gPhi0Rad = 0.0;
  let gV0 = 0.0;
  let gVSignSymbol = 'υ=0';
  let gVSignWord = 'μηδενική';
  let gPhaseZeroT = 0.0; // tZero
  let gM1 = 70.0;
  let gD1 = NaN;
  let gEmech = NaN; // Eμηχ


  const urlParams = new URLSearchParams(window.location.search);
  const lang = (urlParams.get('lang') === 'en') ? 'en' : 'gr';
  document.documentElement.lang = (lang === 'en') ? 'en' : 'el';

  // λίστα διαγραμμάτων που θα σχεδιαστούν μετά το χτίσιμο του DOM
  const diagramJobs = [];

  function localizeTrig(text){
    if(!text) return '';
    let out = String(text);
    if(lang === 'gr'){
      out = out.replace(/sin/g,'ημ').replace(/cos/g,'συν');
    }
    return out;
  }

  function loadBookData(){
    try{
      const raw = localStorage.getItem(BOOK_STORAGE_KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      return data || null;
    }catch(e){
      console.error('loadBookData error', e);
      return null;
    }
  }

  function setParam(name, valueStr){
    document.querySelectorAll('[data-param="'+name+'"]').forEach(el=>{
      el.textContent = valueStr;
    });
  }

  // expand {A},{T},{omega},{x0},{phi0},{vSignSymbol},{vSignWord}
  function expandDynTemplate(tpl){
    if(!tpl) return '';
    const s = String(tpl);
    return s
      .replaceAll('{A}', String(gA.toFixed(2)))
      .replaceAll('{T}', String(gT.toFixed(2)))
      .replaceAll('{omega}', String(gOmega.toFixed(2)))
      .replaceAll('{x0}', String(gX0.toFixed(2)))
      .replaceAll('{phi0}', String(gPhi0Deg.toFixed(1)))
      .replaceAll('{phi0rad}', String(((((gPhi0Rad%(2*Math.PI)) + 2*Math.PI)%(2*Math.PI))).toFixed(3)))
      .replaceAll('{phi0Rad}', String(((((gPhi0Rad%(2*Math.PI)) + 2*Math.PI)%(2*Math.PI))).toFixed(3)))
      .replaceAll('{vSignSymbol}', gVSignSymbol)
      .replaceAll('{vSignWord}', gVSignWord)
      .replaceAll('{tZero}', (isFinite(gPhaseZeroT) ? String(gPhaseZeroT.toFixed(2)) : ''))
      .replaceAll('{m1}', (isFinite(gM1) ? String(gM1.toFixed(2)) : ''))
      .replaceAll('{D1}', (isFinite(gD1) ? String(gD1.toFixed(2)) : ''))
      .replaceAll('{Emech}', (isFinite(gEmech) ? String(gEmech.toFixed(2)) : ''))
      .replaceAll('{Eμηχ}', (isFinite(gEmech) ? String(gEmech.toFixed(2)) : ''));
  }

  // Χτίσιμο πίνακα t–x από τα δείγματα
  function buildTXTable(samples){
    const tbody = document.getElementById('txTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if(!Array.isArray(samples) || !samples.length){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.textContent = (lang === 'en')
        ? 'No t–x samples available. Play the scene at least once with the Book button.'
        : 'Δεν υπάρχουν δείγματα t–x. Παίξε τουλάχιστον μία φορά τη σκηνή με το κουμπί Βιβλίο.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    samples.forEach(pair=>{
      const tr = document.createElement('tr');
      const tdT = document.createElement('td');
      const tdX = document.createElement('td');

      tdT.textContent = (pair.t != null) ? pair.t.toFixed(2) : '';
      tdX.textContent = (pair.x != null) ? pair.x.toFixed(2) : '';

      tr.appendChild(tdT);
      tr.appendChild(tdX);
      tbody.appendChild(tr);
    });
  }

  // Δημιουργία badge ομιλητή
  function viewerName(viewerIdx1){
    const idx0 = (viewerIdx1 || 1) - 1;
    if(idx0 < 0 || idx0 >= VIEWERS.length) return '';
    const v = VIEWERS[idx0];
    if(!v) return '';
    if(lang === 'en'){
      return v.name_en || v.name_gr || ('Viewer ' + viewerIdx1);
    }else{
      return v.name_gr || ('Θεατής ' + viewerIdx1);
    }
  }

  function viewerInitial(viewerIdx1){
    const name = viewerName(viewerIdx1);
    return name ? (name.trim()[0] || '?') : '?';
  }

  function viewerColor(viewerIdx1){
    const idx0 = (viewerIdx1 || 1) - 1;
    const v = VIEWERS[idx0];
    return (v && v.color) ? v.color : '#4b5563';
  }

  function viewerImg(viewerIdx1){
    const idx0 = (viewerIdx1 || 1) - 1;
    const v = VIEWERS[idx0];
    return (v && v.img) ? v.img : null;
  }

  function createAvatarElement(viewerIdx1){
    const imgUrl = viewerImg(viewerIdx1);
    if(imgUrl){
      const img = document.createElement('img');
      img.className = 'speaker-avatar-img';
      img.src = imgUrl;
      img.alt = viewerName(viewerIdx1);
      return img;
    }
    const span = document.createElement('span');
    span.className = 'speaker-avatar-circle';
    span.style.background = viewerColor(viewerIdx1);
    span.textContent = viewerInitial(viewerIdx1);
    return span;
  }

  // Χτίσιμο μίας γραμμής διαλόγου
  function buildDialogRow(ev, contextLabel){
    const row = document.createElement('div');
    row.className = 'dialog-row';

    const leftCell = document.createElement('div');
    leftCell.className = 'dialog-cell dialog-cell-left';

    const rightCell = document.createElement('div');
    rightCell.className = 'dialog-cell dialog-cell-right';

    const hasLeftRaw  = ev.left  && String(ev.left).trim()  !== '';
    const hasRightRaw = ev.right && String(ev.right).trim() !== '';

    const leftText  = hasLeftRaw  ? expandDynTemplate(ev.left)  : '';
    const rightText = hasRightRaw ? expandDynTemplate(ev.right) : '';

    const hasLeft  = leftText.trim()  !== '';
    const hasRight = rightText.trim() !== '';

    // Αριστερά: θεατής + λόγια
    if(hasLeft){
      const sp = document.createElement('div');
      sp.className = 'speaker-line';

      const badge = document.createElement('div');
      badge.className = 'speaker-badge';

      const avatar = createAvatarElement(ev.viewer);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'speaker-name';

      const nm = viewerName(ev.viewer);
      if(nm){
        nameSpan.textContent = nm;
      }else{
        nameSpan.textContent = (lang === 'en') ? 'Narration' : 'Αφήγηση';
      }

      badge.appendChild(avatar);
      badge.appendChild(nameSpan);
      sp.appendChild(badge);

      const speech = document.createElement('div');
      speech.className = 'speech';
      speech.innerHTML = leftText.replaceAll('\n','<br>');

      leftCell.appendChild(sp);
      leftCell.appendChild(speech);
    }else if(leftText){
      const p = document.createElement('div');
      p.className = 'speech';
      p.innerHTML = leftText.replaceAll('\n','<br>');
      leftCell.appendChild(p);
    }

    // Δεξιά: νόμοι / διαγράμματα / πρόσθετα
    let anythingRight = false;

    if(hasRight){
      const p = document.createElement('div');
      p.className = 'speech';
      p.innerHTML = rightText.replaceAll('\n','<br>');
      rightCell.appendChild(p);
      anythingRight = true;
    }

    // νόμοι (laws array)
    if(ev.laws && Array.isArray(ev.laws) && ev.laws.length){
      const lawTitle = document.createElement('div');
      lawTitle.className = 'block-title';
      lawTitle.textContent = (lang === 'en')
        ? 'Relations used at this step'
        : 'Σχέσεις που χρησιμοποιούνται σε αυτό το βήμα';
      rightCell.appendChild(lawTitle);

      const pre = document.createElement('div');
      pre.className = 'law-text';
      pre.textContent = localizeTrig(ev.laws.join('\n'));
      rightCell.appendChild(pre);
      anythingRight = true;
    }

    if(ev.tag){
      const tag = document.createElement('span');
      tag.className = 'inline-tag';
      const dot = document.createElement('span');
      dot.className = 'inline-dot';
      const lbl = document.createElement('span');
      lbl.textContent = ev.tag;
      tag.appendChild(dot);
      tag.appendChild(lbl);
      rightCell.appendChild(tag);
      anythingRight = true;
    }

    function addDiagram(kind, caption, extraOpts){
      const box = document.createElement('div');
      box.className = 'diagram-inline';
      const canv = document.createElement('canvas');
      const id = `${contextLabel}-${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      canv.id = id;
      box.appendChild(canv);
      if(caption){
        const cap = document.createElement('div');
        cap.className = 'diagram-caption';
        cap.textContent = caption;
        box.appendChild(cap);
      }
      rightCell.appendChild(box);
      diagramJobs.push(Object.assign({ id, kind }, (extraOpts || {})));
      anythingRight = true;
    }

    const hasXtMark = !!ev.xtZeroMark || !!ev.xtMarkTail;

    if(ev.graph === 'xt' || hasXtMark){
      addDiagram(
        'xt',
        (lang === 'en') ? 'x–t diagram' : 'Διάγραμμα x–t',
        {
          tZeroMark: ev.xtZeroMark,
          tZeroHasTail: ev.xtMarkTail
        }
      );
    }

    if(ev.graph === 'v'){
      addDiagram(
        'v',
        (lang === 'en') ? 'v–t diagram' : 'Διάγραμμα υ–t'
      );
    }

    if(ev.graph === 'a'){
      addDiagram(
        'a',
        (lang === 'en') ? 'a–t diagram' : 'Διάγραμμα α–t'
      );
    }

    if(ev.graph === 'ax'){
      addDiagram(
        'ax',
        (lang === 'en') ? 'a–x diagram' : 'Διάγραμμα α–x'
      );
    }

    if(!anythingRight){
      rightCell.classList.add('dialog-cell-right-empty');
    }

    row.appendChild(leftCell);
    row.appendChild(rightCell);
    return row;
  }

  // Plain πίνακας διαλόγων (fallback χωρίς book*.json)
  function buildDialogTable(events, contextLabel){
    const container = document.createElement('div');
    container.className = 'dialog-block';

    if(!Array.isArray(events) || !events.length){
      const p = document.createElement('p');
      p.className = 'small-note';
      p.textContent = (lang === 'en')
        ? 'No dialogue available for this part.'
        : 'Δεν υπάρχουν διάλογοι για αυτό το μέρος.';
      container.appendChild(p);
      return container;
    }

    events.forEach(ev=>{
      const row = buildDialogRow(ev, contextLabel);
      container.appendChild(row);
    });

    return container;
  }

  function applyColumnAlignment(div, column){
    if(column === 'left'){
      div.style.maxWidth = '60%';
    }else if(column === 'right'){
      div.style.maxWidth = '40%';
      div.style.marginLeft = 'auto';
    }
  }

  // Απόδοση section με βάση book*.json (αν υπάρχει), αλλιώς full διάλογος
  function renderSection(sectionId, events, container, contextLabel){
    const cfg = BOOK_CFG;
    const sec = cfg && Array.isArray(cfg.sections)
      ? cfg.sections.find(s => s.id === sectionId)
      : null;

    if(!sec || !Array.isArray(sec.blocks) || !sec.blocks.length){
      container.appendChild( buildDialogTable(events, contextLabel) );
      return;
    }

    sec.blocks.forEach(block=>{
      if(block.type === 'dialogs'){
        const from = (typeof block.from === 'number' && block.from >= 0) ? block.from : 0;
        const to   = (typeof block.to   === 'number' && block.to   >= 0) ? block.to   : (events.length-1);
        const slice = events.slice(from, to+1);
        const dlg = buildDialogTable(slice, contextLabel);
        container.appendChild(dlg);
        return;
      }

      if(block.type === 'note' || block.type === 'html'){
        const div = document.createElement('div');
        div.className = 'card';
        applyColumnAlignment(div, block.column);
        div.innerHTML = expandDynTemplate(block.html || block.text || '');
        container.appendChild(div);
        return;
      }

      if(block.type === 'diagram'){
        const wrapper = document.createElement('div');
        wrapper.className = 'card';
        applyColumnAlignment(wrapper, block.column);

        if(block.title){
          const h3 = document.createElement('h3');
          h3.textContent = expandDynTemplate(block.title);
          wrapper.appendChild(h3);
        }

        const diagWrap = document.createElement('div');
        diagWrap.className = 'diagram-wrapper';

        const label = document.createElement('div');
        label.className = 'diagram-label';
        label.textContent = expandDynTemplate(block.caption || '');
        diagWrap.appendChild(label);

        const cwrap = document.createElement('div');
        cwrap.className = 'diagram-inline';
        const canvas = document.createElement('canvas');
        const id = block.id || `${sectionId}-${block.kind || 'custom'}`;
        canvas.id = id;
        cwrap.appendChild(canvas);
        diagWrap.appendChild(cwrap);

        diagramJobs.push({
          id,
          kind: block.kind || 'xt',
          tZeroMark: block.tZeroMark,
          tZeroHasTail: block.tZeroHasTail
        });

        wrapper.appendChild(diagWrap);
        container.appendChild(wrapper);
        return;
      }

      if(block.type === 'image'){
        const card = document.createElement('div');
        card.className = 'card';
        applyColumnAlignment(card, block.column);

        const img = document.createElement('img');
        img.className = 'block-image';
        img.src = block.src || '';
        if(block.alt){
          img.alt = block.alt;
        }
        card.appendChild(img);

        if(block.caption){
          const cap = document.createElement('div');
          cap.className = 'image-caption';
          cap.textContent = block.caption;
          card.appendChild(cap);
        }

        container.appendChild(card);
        return;
      }

      // unsupported: quietly ignore
    });
  }

  // ----- Σχεδίαση διαγραμμάτων (χρησιμοποιούν gA, gT, gOmega, gPhi0Rad, gX0) -----

  function renderDiagramJobs(){
    diagramJobs.forEach(job=>{
      const canvas = document.getElementById(job.id);
      if(!canvas) return;
      if(job.kind === 'xt'){
        drawXTChart(canvas, job);
      }else if(job.kind === 'v'){
        drawVChart(canvas, job);
      }else if(job.kind === 'a'){
        drawAChart(canvas, job);
      }else if(job.kind === 'ax'){
        drawAXChart(canvas, job);
      }else if(job.kind === 'xsin'){
        drawXSinChart(canvas, job);
      }
    });
  }

  function drawXTChart(canvas, job){
    const ctx = canvas.getContext('2d');
    const w = canvas.width  = 340;
    const h = canvas.height = 180;

    const tMin = 0;
    const tMax = 2*gT;
    const xMin = -gA*1.1;
    const xMax = +gA*1.1;

    function tToX(t){
      return 40 + (w-70)*(t - tMin)/(tMax - tMin);
    }
    function xToY(x){
      const frac = (x - xMin)/(xMax - xMin);
      return h-30 - (h-60)*frac;
    }

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);

    const tTicks = [0,gT,2*gT];
    tTicks.forEach(t=>{
      const xf = tToX(t);
      ctx.beginPath();
      ctx.moveTo(xf,20);
      ctx.lineTo(xf,h-30);
      ctx.stroke();
    });

    const xTicks = [-gA,0,+gA];
    xTicks.forEach(x=>{
      const yf = xToY(x);
      ctx.beginPath();
      ctx.moveTo(40,yf);
      ctx.lineTo(w-30,yf);
      ctx.stroke();
    });

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for(let i=0;i<=200;i++){
      const t = tMin + (tMax-tMin)*i/200;
      const x = gA*Math.sin(gOmega*t + gPhi0Rad);
      const xf = tToX(t);
      const yf = xToY(x);
      if(i===0) ctx.moveTo(xf,yf);
      else      ctx.lineTo(xf,yf);
    }
    ctx.stroke();
    ctx.restore();

    if(job && job.tZeroMark != null){
      const t0 = job.tZeroMark;
      const x0 = gA*Math.sin(gOmega*t0 + gPhi0Rad);
      const xf = tToX(t0);
      const yf = xToY(x0);

      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(xf,20);
      ctx.lineTo(xf,h-30);
      ctx.stroke();

      if(job.tZeroHasTail){
        const tEnd = tMax;
        ctx.beginPath();
        ctx.moveTo(xf,yf);
        for(let i=0;i<=120;i++){
          const t = t0 + (tEnd - t0)*i/120;
          const x = gA*Math.sin(gOmega*t + gPhi0Rad);
          const xx = tToX(t);
          const yy = xToY(x);
          if(i===0) ctx.moveTo(xx,yy);
          else      ctx.lineTo(xx,yy);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(xf,yf,3,0,2*Math.PI);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText((lang==='en'?'t (s)':'t (s)'), w-45, h-8);
    ctx.save();
    ctx.translate(15,h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('x (m)', 0,0);
    ctx.restore();
    ctx.restore();
  }

  function drawVChart(canvas){
    const ctx = canvas.getContext('2d');
    const w = canvas.width  = 260;
    const h = canvas.height = 160;

    const tMin = 0;
    const tMax = 2*gT;
    const vMax = gOmega*gA*1.1;
    const vMin = -vMax;

    function tToX(t){
      return 35 + (w-60)*(t - tMin)/(tMax - tMin);
    }
    function vToY(v){
      const frac = (v - vMin)/(vMax - vMin);
      return h-25 - (h-50)*frac;
    }

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.setLineDash([3,3]);
    ctx.lineWidth = 1;

    const tTicks = [0,gT,2*gT];
    tTicks.forEach(t=>{
      const xf = tToX(t);
      ctx.beginPath();
      ctx.moveTo(xf,15);
      ctx.lineTo(xf,h-25);
      ctx.stroke();
    });

    ctx.beginPath();
    const y0 = vToY(0);
    ctx.moveTo(35,y0);
    ctx.lineTo(w-25,y0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    for(let i=0;i<=200;i++){
      const t = tMin + (tMax-tMin)*i/200;
      const v = gOmega*gA*Math.cos(gOmega*t + gPhi0Rad);
      const xf = tToX(t);
      const yf = vToY(v);
      if(i===0) ctx.moveTo(xf,yf);
      else      ctx.lineTo(xf,yf);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('t (s)', w-42, h-6);
    ctx.save();
    ctx.translate(14,h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText((lang==='en'?'v (m/s)':'υ (m/s)'), 0,0);
    ctx.restore();
    ctx.restore();
  }

  function drawAChart(canvas){
    const ctx = canvas.getContext('2d');
    const w = canvas.width  = 260;
    const h = canvas.height = 160;

    const tMin = 0;
    const tMax = 2*gT;
    const aMax = gOmega*gOmega*gA*1.1;
    const aMin = -aMax;

    function tToX(t){
      return 35 + (w-60)*(t - tMin)/(tMax - tMin);
    }
    function aToY(a){
      const frac = (a - aMin)/(aMax - aMax);
      return h-25 - (h-50)*frac;
    }

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.setLineDash([3,3]);
    ctx.lineWidth = 1;

    const tTicks = [0,gT,2*gT];
    tTicks.forEach(t=>{
      const xf = tToX(t);
      ctx.beginPath();
      ctx.moveTo(xf,15);
      ctx.lineTo(xf,h-25);
      ctx.stroke();
    });

    ctx.beginPath();
    const y0 = aToY(0);
    ctx.moveTo(35,y0);
    ctx.lineTo(w-25,y0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    for(let i=0;i<=200;i++){
      const t = tMin + (tMax-tMin)*i/200;
      const a = -gOmega*gOmega*gA*Math.sin(gOmega*t + gPhi0Rad);
      const xf = tToX(t);
      const yf = aToY(a);
      if(i===0) ctx.moveTo(xf,yf);
      else      ctx.lineTo(xf,yf);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('t (s)', w-42, h-6);
    ctx.save();
    ctx.translate(14,h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText((lang==='en'?'a (m/s²)':'α (m/s²)'), 0,0);
    ctx.restore();
    ctx.restore();
  }

  function drawAXChart(canvas){
    const ctx = canvas.getContext('2d');
    const w = canvas.width  = 260;
    const h = canvas.height = 160;

    const xMin = -gA*1.1;
    const xMax = +gA*1.1;
    const aMax = gOmega*gOmega*gA*1.1;
    const aMin = -aMax;

    function xToXpx(x){
      return 35 + (w-60)*(x - xMin)/(xMax - xMin);
    }
    function aToY(a){
      const frac = (a - aMin)/(aMax - aMax);
      return h-25 - (h-50)*frac;
    }

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.setLineDash([3,3]);
    ctx.lineWidth = 1;

    const xTicks = [xMin,0,xMax];
    xTicks.forEach(x=>{
      const xf = xToXpx(x);
      ctx.beginPath();
      ctx.moveTo(xf,15);
      ctx.lineTo(xf,h-25);
      ctx.stroke();
    });

    ctx.beginPath();
    const y0 = aToY(0);
    ctx.moveTo(35,y0);
    ctx.lineTo(w-25,y0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    const x1 = xMin;
    const a1 = -gOmega*gOmega*x1;
    const x2 = xMax;
    const a2 = -gOmega*gOmega*x2;
    ctx.moveTo(xToXpx(x1), aToY(a1));
    ctx.lineTo(xToXpx(x2), aToY(a2));
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('x (m)', w-42, h-6);
    ctx.save();
    ctx.translate(14,h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText((lang==='en'?'a (m/s²)':'α (m/s²)'), 0,0);
    ctx.restore();
    ctx.restore();
  }

  function drawXSinChart(canvas){
    const ctx = canvas.getContext('2d');
    const w = canvas.width  = 260;
    const h = canvas.height = 160;

    const sMin = -1.1;
    const sMax = +1.1;
    const xMin = -gA*1.1;
    const xMax = +gA*1.1;

    function sToXpx(s){
      return 35 + (w-60)*(s - sMin)/(sMax - sMin);
    }
    function xToYpx(x){
      const frac = (x - xMin)/(xMax - xMin);
      return h-25 - (h-50)*frac;
    }

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.setLineDash([3,3]);
    ctx.lineWidth = 1;

    const sTicks = [-1,0,+1];
    sTicks.forEach(s=>{
      const xf = sToXpx(s);
      ctx.beginPath();
      ctx.moveTo(xf,15);
      ctx.lineTo(xf,h-25);
      ctx.stroke();
    });

    const xTicks = [-gA,0,+gA];
    xTicks.forEach(x=>{
      const yf = xToYpx(x);
      ctx.beginPath();
      ctx.moveTo(35,yf);
      ctx.lineTo(w-25,yf);
      ctx.stroke();
    });

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    const s1 = -1.0;
    const x1 = gA*s1;
    const s2 = +1.0;
    const x2 = gA*s2;
    ctx.moveTo(sToXpx(s1), xToYpx(x1));
    ctx.lineTo(sToXpx(s2), xToYpx(x2));
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText((lang==='en'?'sin(ωt)':'ημ(ωt)'), w-70, h-6);
    ctx.save();
    ctx.translate(14,h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('x (m)', 0,0);
    ctx.restore();
    ctx.restore();
  }

  async function loadDialogsAndBuild(){
    const file = (lang === 'en') ? 'dialogs-en.json' : 'dialogs-gr.json';
    diagramJobs.length = 0;

    const bookData = loadBookData();
    const DEFAULT_A = 3.0;
    const DEFAULT_T = 6.0;

    gA = (bookData && typeof bookData.A === 'number') ? bookData.A : DEFAULT_A;
    gT = (bookData && typeof bookData.T === 'number') ? bookData.T : DEFAULT_T;
    gOmega = (bookData && typeof bookData.omega === 'number')
      ? bookData.omega
      : (2*Math.PI/gT);

    gX0 = (bookData && typeof bookData.x0 === 'number') ? bookData.x0 : 1.80;
    gPhi0Deg = (bookData && typeof bookData.phi0Deg === 'number') ? bookData.phi0Deg : 35.0;
    gPhi0Rad = gPhi0Deg * Math.PI/180;

    if(bookData && typeof bookData.tZero === 'number'){
      gPhaseZeroT = bookData.tZero;
    }else{
      gPhaseZeroT = 0.0;
    }

    const DEFAULT_M1 = 70.0;
    gM1 = (bookData && typeof bookData.m1 === 'number') ? bookData.m1 : DEFAULT_M1;

    if(bookData && typeof bookData.D1 === 'number'){
      gD1 = bookData.D1;
    }else if(isFinite(gM1) && isFinite(gOmega)){
      gD1 = gM1 * gOmega * gOmega;
    }else{
      gD1 = NaN;
    }

    if(bookData && typeof bookData.Emech === 'number'){
      gEmech = bookData.Emech;
    }else if(isFinite(gD1) && isFinite(gA)){
      gEmech = 0.5 * gD1 * gA * gA;
    }else{
      gEmech = NaN;
    }

    gV0 = gOmega * gA * Math.cos(gPhi0Rad);
    const eps = 1e-6;
    if(gV0 > eps){
      gVSignSymbol = 'υ>0';
      gVSignWord = (lang === 'en') ? 'positive' : 'θετική';
    }else if(gV0 < -eps){
      gVSignSymbol = 'υ<0';
      gVSignWord = (lang === 'en') ? 'negative' : 'αρνητική';
    }else{
      gVSignSymbol = 'υ=0';
      gVSignWord = (lang === 'en') ? 'zero' : 'μηδενική';
    }

    setParam('A', gA.toFixed(2));
    setParam('T', gT.toFixed(2));
    setParam('omega', gOmega.toFixed(2));
    setParam('x0', gX0.toFixed(2));
    setParam('phi0Deg', gPhi0Deg.toFixed(1));
    setParam('v0', gV0.toFixed(2));
    setParam('vSignSymbol', gVSignSymbol);
    setParam('vSignWord', gVSignWord);
    setParam('tZero', isFinite(gPhaseZeroT) ? gPhaseZeroT.toFixed(2) : '');
    setParam('m1', isFinite(gM1) ? gM1.toFixed(2) : '');
    setParam('D1', isFinite(gD1) ? gD1.toFixed(2) : '');
    setParam('Emech', isFinite(gEmech) ? gEmech.toFixed(2) : '');
    setParam('Eμηχ', isFinite(gEmech) ? gEmech.toFixed(2) : '');

    if(!bookData){
      const note = document.getElementById('paramNote');
      if(note){
        note.textContent = (lang === 'en')
          ? 'No stage data were found. Using indicative values (A=3.00 m, T=6.00 s, etc.).'
          : 'Δεν βρέθηκαν δεδομένα από τη σκηνή. Χρησιμοποιούνται ενδεικτικές τιμές (A=3.00 m, T=6.00 s κ.λπ.).';
      }
    }

    if(bookData && Array.isArray(bookData.samples)){
      buildTXTable(bookData.samples);
    }else{
      buildTXTable([]);
    }

    try{
      const resp = await fetch(file,{cache:'no-store'});
      if(!resp.ok){
        console.error('Δεν βρέθηκε', file);
        return;
      }
      const data = await resp.json();
      VIEWERS = data.viewers || [];
      ACT1 = data.act1 || [];
      ACT2 = data.act2 || [];
      FOYER = data.foyer || [];

      const act1Cont = document.getElementById('act1Transcript');
      const act2Cont = document.getElementById('act2Transcript');
      const foyerCont = document.getElementById('foyerTranscript');

      act1Cont.innerHTML  = '';
      act2Cont.innerHTML  = '';
      foyerCont.innerHTML = '';

      // book.json / book-*.json (πρόσθετα)
      BOOK_CFG = null;
      try{
        const bookFile = (lang === 'en') ? 'book-en.json' : 'book-gr.json';
        let br = await fetch(bookFile,{cache:'no-store'});
        if(!br.ok){
          // fallback σε παλιό ενιαίο book.json
          br = await fetch('book.json',{cache:'no-store'});
        }
        if(br.ok){
          BOOK_CFG = await br.json();
        }
      }catch(e2){
        console.warn('book*.json όχι διαθέσιμο ή μη έγκυρο', e2);
        BOOK_CFG = null;
      }

      // Απόδοση sections με βάση book*.json αν υπάρχει, αλλιώς full διάλογος
      renderSection('act1', ACT1, act1Cont, 'act1');
      renderSection('act2', ACT2, act2Cont, 'act2');
      renderSection('foyer', FOYER, foyerCont, 'foyer');

      renderDiagramJobs();
    }catch(err){
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', loadDialogsAndBuild);
