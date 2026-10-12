/* Lousa: desenho com a Apple Pencil (ou dedo/mouse quando não há Pencil).
   Coordenadas lógicas fixas (w x h); o canvas se adapta ao tamanho na tela.
   Traço: { t:'pen'|'hl', c:'#hex', w:largura, p:[x,y,pressão, x,y,pressão, ...] }
   Imagem colada (caderno): { src:dataUrl, x, y, w, h } */
(function () {
'use strict';
let temPen = false; // depois que a Pencil aparece, o dedo deixa de desenhar (só rola/amplia)
const imgCache = {};
function img(src) {
  if (!imgCache[src]) { const i = new Image(); i.src = src; imgCache[src] = i; }
  return imgCache[src];
}
function desenhaTraco(ctx, s, k) {
  const p = s.p; const n = p.length / 3; if (!n) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = s.c;
  if (s.t === 'hl') { ctx.globalAlpha = 0.38; ctx.lineCap = 'butt'; ctx.lineWidth = s.w * 4 * k; ctx.beginPath(); ctx.moveTo(p[0] * k, p[1] * k); for (let i = 1; i < n; i++) ctx.lineTo(p[i * 3] * k, p[i * 3 + 1] * k); ctx.stroke(); ctx.restore(); return; }
  if (n === 1) { ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(p[0] * k, p[1] * k, s.w * (0.5 + p[2] * 0.6) * k / 2, 0, 7); ctx.fill(); ctx.restore(); return; }
  for (let i = 1; i < n; i++) {
    const x0 = p[(i - 1) * 3], y0 = p[(i - 1) * 3 + 1], x1 = p[i * 3], y1 = p[i * 3 + 1];
    const pr = (p[(i - 1) * 3 + 2] + p[i * 3 + 2]) / 2;
    ctx.lineWidth = Math.max(0.6, s.w * (0.45 + pr * 0.9) * k);
    ctx.beginPath();
    if (i > 1) { const xa = (p[(i - 2) * 3] + x0) / 2, ya = (p[(i - 2) * 3 + 1] + y0) / 2; ctx.moveTo(xa * k, ya * k); ctx.quadraticCurveTo(x0 * k, y0 * k, (x0 + x1) / 2 * k, (y0 + y1) / 2 * k); }
    else { ctx.moveTo(x0 * k, y0 * k); ctx.lineTo((x0 + x1) / 2 * k, (y0 + y1) / 2 * k); }
    ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo((p[(n - 2) * 3] + p[(n - 1) * 3]) / 2 * k, (p[(n - 2) * 3 + 1] + p[(n - 1) * 3 + 1]) / 2 * k); ctx.lineTo(p[(n - 1) * 3] * k, p[(n - 1) * 3 + 1] * k); ctx.stroke();
  ctx.restore();
}
// desenha tudo num contexto qualquer (tela, exportação), escala k = pixels por unidade lógica
function pinta(ctx, dados, k, opt) {
  opt = opt || {};
  (dados.i || []).forEach((m, idx) => {
    const im = img(m.src);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, m.x * k, m.y * k, m.w * k, m.h * k);
    else im.addEventListener('load', () => opt.depois && opt.depois(), { once: true });
    if (opt.sel === idx) {
      ctx.save(); ctx.strokeStyle = '#C4161E'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(m.x * k, m.y * k, m.w * k, m.h * k); ctx.setLineDash([]);
      ctx.fillStyle = '#C4161E'; ctx.fillRect((m.x + m.w) * k - 9, (m.y + m.h) * k - 9, 18, 18);
      ctx.beginPath(); ctx.arc((m.x + m.w) * k, m.y * k, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); const cx = (m.x + m.w) * k, cy = m.y * k;
      ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke(); ctx.restore();
    }
  });
  (dados.s || []).forEach((s) => desenhaTraco(ctx, s, k));
}
function serializa(d) {
  return JSON.stringify({ v: 1, w: d.w, h: d.h, s: d.s.map((s) => ({ t: s.t, c: s.c, w: s.w, p: s.p.map((v, i) => i % 3 === 2 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10) })), i: d.i });
}

/* Cria a lousa dentro de `box` (um elemento com tamanho definido pelo CSS).
   opts: { w, h, dados?, editavel, ferramenta:{t,c,w}, aoMudar() } */
function Lousa(box, opts) {
  const d = Object.assign({ w: opts.w, h: opts.h, s: [], i: [] }, opts.dados || {});
  d.w = opts.w; d.h = opts.h;
  const cv = document.createElement('canvas'); cv.className = 'lousa'; box.appendChild(cv);
  const ctx = cv.getContext('2d');
  const L = { dados: d, ferramenta: opts.ferramenta || { t: 'pen', c: '#1E3A8A', w: 3 }, sel: -1, mudou: false };
  const desfaz = [], refaz = [];
  const foto = () => ({ s: d.s.slice(), i: d.i.map((m) => Object.assign({}, m)) });
  const guarda = () => { desfaz.push(foto()); if (desfaz.length > 60) desfaz.shift(); refaz.length = 0; };
  let k = 1;
  function ajusta() {
    const r = box.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    k = r.width / d.w;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(d.h * k * dpr);
    cv.style.width = r.width + 'px'; cv.style.height = (d.h * k) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redesenha();
  }
  function redesenha() { ctx.clearRect(0, 0, cv.width, cv.height); pinta(ctx, d, k, { sel: L.sel, depois: redesenha }); }
  L.ajusta = ajusta; L.redesenha = redesenha;
  L.vazio = () => !d.s.length && !d.i.length;
  L.json = () => serializa(d);
  L.desfazer = () => { if (!desfaz.length) return; refaz.push(foto()); const f = desfaz.pop(); d.s = f.s; d.i = f.i; L.sel = -1; redesenha(); mudou(); };
  L.refazer = () => { if (!refaz.length) return; desfaz.push(foto()); const f = refaz.pop(); d.s = f.s; d.i = f.i; L.sel = -1; redesenha(); mudou(); };
  L.podeDesfazer = () => desfaz.length > 0; L.podeRefazer = () => refaz.length > 0;
  L.colaImagem = (src, nw, nh) => {
    guarda(); const larg = Math.min(d.w * 0.5, nw); const alt = larg * nh / nw;
    const y = 120 + (d.i.length % 4) * 40; d.i.push({ src, x: 60 + (d.i.length % 4) * 40, y, w: Math.round(larg), h: Math.round(alt) });
    L.sel = d.i.length - 1; redesenha(); mudou();
  };
  function mudou() { L.mudou = true; opts.aoMudar && opts.aoMudar(); }
  if (!opts.editavel) { cv.style.pointerEvents = 'none'; new ResizeObserver(ajusta).observe(box); ajusta(); return L; }

  // ---- entrada ----
  const ponto = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * d.w, (e.clientY - r.top) / r.height * d.h, e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5]; };
  let atual = null, arrasto = null, ativo = null;
  const pode = (e) => e.pointerType === 'pen' || e.pointerType === 'mouse' || (e.pointerType === 'touch' && !temPen);
  const atualizaToque = () => { cv.style.touchAction = temPen ? 'pan-x pan-y pinch-zoom' : 'none'; };
  atualizaToque();
  // a Pencil não pode rolar a página: segura o toque dela (o dedo continua rolando)
  cv.addEventListener('touchstart', (e) => { for (const t of e.changedTouches) if (t.touchType === 'stylus') { e.preventDefault(); return; } }, { passive: false });
  cv.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.touchType === 'stylus') { e.preventDefault(); return; } }, { passive: false });
  function apagaPerto(x, y) {
    const raio = 10 + L.ferramenta.w * 2; let tirou = false;
    d.s = d.s.filter((s) => { for (let i = 0; i < s.p.length; i += 3) if (Math.hypot(s.p[i] - x, s.p[i + 1] - y) < raio + s.w) { tirou = true; return false; } return true; });
    if (tirou) redesenha(); return tirou;
  }
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen' && !temPen) { temPen = true; atualizaToque(); opts.aoPen && opts.aoPen(); }
    if (!pode(e) || ativo !== null) return;
    e.preventDefault(); ativo = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    const [x, y, pr] = ponto(e); const t = L.ferramenta.t;
    if (t === 'move') {
      if (L.sel >= 0) { const m = d.i[L.sel];
        if (Math.hypot(x - (m.x + m.w), y - m.y) < 22 / k + 6) { guarda(); d.i.splice(L.sel, 1); L.sel = -1; redesenha(); mudou(); ativo = null; return; }
        if (Math.abs(x - (m.x + m.w)) < 18 / k + 4 && Math.abs(y - (m.y + m.h)) < 18 / k + 4) { guarda(); arrasto = { modo: 'tam', m, x0: x, y0: y, w0: m.w, h0: m.h }; return; } }
      let idx = -1; for (let i = d.i.length - 1; i >= 0; i--) { const m = d.i[i]; if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) { idx = i; break; } }
      L.sel = idx; redesenha();
      if (idx >= 0) { guarda(); const m = d.i[idx]; arrasto = { modo: 'mov', m, dx: x - m.x, dy: y - m.y }; }
      return;
    }
    if (t === 'er') { guarda(); atual = { er: true, tirou: apagaPerto(x, y) }; return; }
    guarda(); atual = { t, c: L.ferramenta.c, w: L.ferramenta.w, p: [x, y, pr] };
    d.s.push(atual); redesenha();
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerId !== ativo) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (arrasto) { const [x, y] = ponto(e); const m = arrasto.m;
      if (arrasto.modo === 'mov') { m.x = Math.round(x - arrasto.dx); m.y = Math.round(y - arrasto.dy); }
      else { const nw = Math.max(60, arrasto.w0 + (x - arrasto.x0)); m.h = Math.round(arrasto.h0 * nw / arrasto.w0); m.w = Math.round(nw); }
      redesenha(); return; }
    if (!atual) return;
    if (atual.er) { evs.forEach((ev) => { const [x, y] = ponto(ev); if (apagaPerto(x, y)) atual.tirou = true; }); return; }
    evs.forEach((ev) => { const q = ponto(ev); const n = atual.p.length; if (Math.hypot(q[0] - atual.p[n - 3], q[1] - atual.p[n - 2]) > 0.8) atual.p.push(q[0], q[1], q[2]); });
    redesenha();
  });
  const fim = (e) => {
    if (e.pointerId !== ativo) return; ativo = null;
    if (arrasto) { arrasto = null; mudou(); return; }
    if (atual) { if (atual.er) { if (!atual.tirou) desfaz.pop(); else mudou(); } else mudou(); atual = null; }
  };
  cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
  new ResizeObserver(ajusta).observe(box); ajusta();
  return L;
}
// imagem final (foto + desenho ou página inteira) em JPEG
function exporta(dados, largura, fundo, q) {
  const k = largura / dados.w; const c = document.createElement('canvas'); c.width = Math.round(largura); c.height = Math.round(dados.h * k);
  const x = c.getContext('2d');
  if (fundo && fundo.img) x.drawImage(fundo.img, 0, 0, c.width, c.height);
  else { x.fillStyle = (fundo && fundo.cor) || '#FFFDF8'; x.fillRect(0, 0, c.width, c.height);
    if (fundo && fundo.pontos) { x.fillStyle = '#D6CFC6'; const passo = 32 * k; for (let yy = passo; yy < c.height; yy += passo) for (let xx = passo; xx < c.width; xx += passo) { x.beginPath(); x.arc(xx, yy, Math.max(1, 1.6 * k), 0, 7); x.fill(); } } }
  pinta(x, dados, k, {});
  return c.toDataURL('image/jpeg', q || 0.82);
}
window.Lousa = { cria: Lousa, pinta, exporta, ler: (t) => { try { const j = JSON.parse(t); return { w: j.w, h: j.h, s: j.s || [], i: j.i || [] }; } catch (e) { return null; } }, temPen: () => temPen, carrega: img };
})();
