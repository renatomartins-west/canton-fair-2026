/* Canton Fair 26 - teste offline
   Registros ficam no IndexedDB do celular e sobem para o Apps Script quando há internet. */
(function () {
  const $ = (id) => document.getElementById(id);
  const DB_NAME = 'cf26', STORE = 'registros';
  let db, fotoB64 = null, syncing = false;

  // ---------- IndexedDB ----------
  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  function tx(mode, fn) {
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  const all = () => tx('readonly', (s) => s.getAll());
  const put = (r) => tx('readwrite', (s) => s.put(r));

  // ---------- Foto: reduz para no máx 1600px, JPEG ----------
  function compress(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }
  function thumb(dataUrl) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 120;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 120, 120);
        res(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  }

  $('photo').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    $('photoHint').textContent = 'processando…';
    try {
      fotoB64 = await compress(f);
      $('preview').src = fotoB64; $('preview').hidden = false; $('photoHint').hidden = true;
    } catch (err) { $('photoHint').textContent = 'não consegui ler a foto, tente de novo'; }
  });

  // ---------- Salvar ----------
  $('save').addEventListener('click', async () => {
    const fob = $('fob').value.trim().replace(',', '.');
    if (!fotoB64) return say('Tire a foto primeiro.', true);
    if (!fob || isNaN(Number(fob))) return say('Preencha o FOB.', true);
    $('save').disabled = true;
    const id = 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await put({
      id, criado: new Date().toISOString(), fob: Number(fob), nota: $('nota').value.trim(),
      foto: fotoB64, thumb: await thumb(fotoB64), status: 'fila', erro: ''
    });
    fotoB64 = null; $('fob').value = ''; $('nota').value = ''; $('photo').value = '';
    $('preview').hidden = true; $('photoHint').hidden = false;
    $('photoHint').innerHTML = '<b>Tirar foto</b><br>toque para abrir a câmera';
    $('save').disabled = false;
    say(navigator.onLine ? 'Salvo. Enviando…' : 'Salvo no celular. Envia quando voltar a internet.');
    await render(); sync();
  });

  function say(t, bad) { $('msg').textContent = t; $('msg').style.color = bad ? 'var(--red)' : 'var(--ok)'; }

  // ---------- Sincronização ----------
  async function sync() {
    if (syncing || !navigator.onLine || !window.CF26.ENDPOINT) return;
    syncing = true;
    try {
      const pend = (await all()).filter((r) => r.status !== 'enviado');
      for (const r of pend) {
        try {
          const resp = await fetch(window.CF26.ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              key: window.CF26.KEY, id: r.id, criado: r.criado, fob: r.fob, nota: r.nota,
              foto: r.foto.split(',')[1], ua: navigator.userAgent.slice(0, 120)
            })
          });
          const j = await resp.json();
          if (j.ok) { r.status = 'enviado'; r.foto = ''; r.erro = ''; }
          else { r.status = 'erro'; r.erro = j.error || 'erro'; }
        } catch (err) {
          r.status = 'fila'; r.erro = '';
          await put(r); break; // sem conexão de verdade: para e tenta depois
        }
        await put(r); await render();
      }
    } finally { syncing = false; render(); }
  }

  // ---------- Tela ----------
  async function render() {
    const rs = (await all()).sort((a, b) => b.criado.localeCompare(a.criado));
    const fila = rs.filter((r) => r.status !== 'enviado').length;
    $('empty').hidden = rs.length > 0;
    $('list').innerHTML = rs.map((r) => {
      const h = new Date(r.criado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const tag = r.status === 'enviado' ? '<span class="tag s">ENVIADO</span>'
        : r.status === 'erro' ? '<span class="tag e" title="' + r.erro + '">ERRO</span>'
        : '<span class="tag q">NA FILA</span>';
      return '<li><img src="' + r.thumb + '" alt=""><div class="t"><b>US$ ' +
        r.fob.toFixed(2).replace('.', ',') + '</b><small>' + h + (r.nota ? ' · ' + esc(r.nota) : '') +
        '</small></div>' + tag + '</li>';
    }).join('');
    net(fila);
  }
  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function net(fila) {
    const on = navigator.onLine;
    $('net').className = 'pill' + (on ? '' : ' off');
    $('net').textContent = (on ? 'ONLINE' : 'OFFLINE') + (fila ? ' · ' + fila + ' na fila' : '');
  }

  $('sync').addEventListener('click', () => sync());
  window.addEventListener('online', () => { render(); sync(); });
  window.addEventListener('offline', () => render());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(sync, 20000);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

  openDB().then((d) => { db = d; render(); sync(); });
})();
