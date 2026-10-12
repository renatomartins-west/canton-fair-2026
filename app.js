/* Canton Fair 26 · Westwing
   App instalável (PWA): funciona offline, guarda registros no celular e envia para a planilha quando há internet. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
const brl = (v) => (v == null || v === '' || isNaN(v)) ? '' : v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
const usd = (v) => v == null || v === '' ? '' : 'US$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = (p) => p + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
// Data_Hora vem do servidor já no horário de Brasília ("2026-10-12T00:24:10") ou, logo após o envio, do celular em UTC ("...Z")
const quando = (s) => {
  s = String(s || ''); let d;
  if (/Z$|[+-]\d\d:\d\d$/.test(s)) d = new Date(s);
  else { const m = s.match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)/); if (!m) return s; return `${m[3]}/${m[2]} às ${m[4]}:${m[5]}`; }
  if (isNaN(d)) return s;
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.day}/${p.month} às ${p.hour}:${p.minute}`;
};
const nomeDe = (email) => String(email || '').split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
  off: '<svg viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46A5.497 5.497 0 0 1 17.5 11v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 17.6 24 16.13 24 14.5c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>',
  img: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>'
};
const ph = (cls) => `<div class="${cls}">${I.img}</div>`;

/* ================= armazenamento local (IndexedDB) ================= */
let db;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('cf26app', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const kvGet = (k) => new Promise((res) => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); });
const kvSet = (k, v) => new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); });

const S = { token: null, email: null, projetos: [], times: [], produtos: [], fornecedores: [], outbox: [], img: null, agora: '', lastSup: null };
const saveCore = () => Promise.all([kvSet('produtos', S.produtos), kvSet('fornecedores', S.fornecedores), kvSet('agora', S.agora)]);
const saveOutbox = () => kvSet('outbox', S.outbox);

/* ================= servidor ================= */
class LoginErr extends Error {}
async function api(acao, body) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000);
  try {
    const r = await fetch(window.CF26.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ acao, token: S.token }, body || {})), signal: ctl.signal });
    const j = await r.json();
    if (!j.ok) {
      if (j.erro === 'LOGIN') throw new LoginErr('LOGIN');
      let msg = j.erro || 'erro';
      if (/permiss|authoriz|https?:\/\/|Exception|TypeError/i.test(msg)) { console.warn('servidor:', msg); msg = 'O servidor do app está em manutenção. Tente de novo em alguns minutos ou avise o Renato.'; }
      const e = new Error(msg); e.servidor = true; throw e;
    }
    return j;
  } finally { clearTimeout(tm); }
}

/* ================= dados derivados ================= */
const imgKey = (path) => String(path || '').split('/').pop().replace(/\.\w+$/, '');
function proj(id) { return S.projetos.find((p) => p.ID_Projeto === id); }
function projImg(p) { return p && S.img && S.img.projetos[imgKey(p.Foto_Referencia)] || ''; }
function timesOrdenados() { return S.times.slice().sort((a, b) => (a.Ordem || 0) - (b.Ordem || 0)).map((t) => t.Time); }
function todosProdutos() {
  const pend = S.outbox.filter((o) => o.kind === 'prod').map((o) => Object.assign({}, o.payload, { _pend: true }));
  return pend.concat(S.produtos.slice().reverse());
}
function todosFornecedores() {
  const pend = S.outbox.filter((o) => o.kind === 'forn').map((o) => Object.assign({}, o.payload, { _pend: true }));
  return S.fornecedores.concat(pend);
}
function forn(id) { return todosFornecedores().find((f) => f.ID_Fornecedor === id); }
function prodsDoProjeto(id) { return todosProdutos().filter((p) => p.ID_Projeto === id); }
function contaPorProjeto() { const c = {}; todosProdutos().forEach((p) => { if (p.ID_Projeto) c[p.ID_Projeto] = (c[p.ID_Projeto] || 0) + 1; }); return c; }
function faixaAlvo(p) { const ns = String(p && p.FOB_Alvo || '').match(/\d+([.,]\d+)?/g); return ns ? ns.map(num) : null; }

/* ================= navegação ================= */
const st = { stack: [{ v: 'home' }], q: '', form: null, ns: null, dd: false, ddq: '' };
const cur = () => st.stack[st.stack.length - 1];
function go(view) { cur().scroll = $('scr').scrollTop; st.stack.push(view); render(0); }
function back() { if (st.stack.length > 1) st.stack.pop(); render(cur().scroll || 0); }
function tab(t) { st.stack = [{ v: t }]; st.q = ''; render(0); }

/* ================= barra ================= */
let syncing = false;
function bar(title, canBack) {
  const n = S.outbox.length; const on = navigator.onLine;
  $('bar').innerHTML = `${canBack ? `<button class="ib" data-go="back" aria-label="Voltar">${I.back}</button>` : ''}<h2>${esc(title)}</h2>
   <button class="ib ${syncing ? 'spin' : ''}" data-go="sync" aria-label="Sincronizar">${on ? I.sync : I.off}${n ? `<span class="badge ${on ? '' : 'off'}">${n}</span>` : ''}</button>`;
}
function refreshBar() { const v = cur(); render.lastBar && bar(render.lastBar[0], render.lastBar[1]); }

/* ================= telas ================= */
function projRow(p, cont) {
  const n = cont[p.ID_Projeto] || 0; const im = projImg(p);
  return `<button class="row" data-proj="${esc(p.ID_Projeto)}">${im ? `<img class="th" src="${im}" alt="">` : ph('th')}<div class="t"><div class="t1">${esc(p.Projeto)}</div>
   <div class="t2">${esc([p.Tipo, p['Coleção']].filter(Boolean).join(' · ') || p.Subcategoria)}</div>
   <span class="cnt ${n ? 'has' : ''}">${n} produto${n !== 1 ? 's' : ''} na feira</span>${p.Origem === 'Control Chart 2027' ? '<span class="nobl">Control Chart 2027</span>' : ''}</div>
   <div class="r">${num(p.CMV_12M) ? `<span class="num">${brl(num(p.CMV_12M))}</span>` : ''}</div></button>`;
}
const fab = () => `<button class="fab" data-go="novo">${I.plus}Produto</button>`;

function vHome() {
  const T = timesOrdenados(); const cont = contaPorProjeto(); const prods = todosProdutos();
  const comAchado = S.projetos.filter((p) => cont[p.ID_Projeto]).length;
  const capa = S.img && S.img.app.capa;
  const tiles = T.map((t) => {
    const ps = S.projetos.filter((p) => p.Time === t); const feitos = ps.filter((p) => cont[p.ID_Projeto]).length;
    const tt = S.times.find((x) => x.Time === t); const im = S.img && S.img.app[imgKey(tt && tt.Foto_Card)];
    const subs = new Set(ps.map((p) => p.Subcategoria)).size; const ach = prods.filter((p) => p.Time === t).length;
    return `<button class="tile" data-time="${esc(t)}">${im ? `<img src="${im}" alt="${esc(t)}">` : `<img alt="${esc(t)}">`}
     <div class="prog"><i style="width:${ps.length ? Math.round(feitos / ps.length * 100) : 0}%"></i></div>
     <div class="mini"><span>${ach} achado${ach !== 1 ? 's' : ''}</span><span>${subs} subcategorias</span></div></button>`;
  }).join('');
  const corpo = st.q.trim() ? resultados() : `<div class="hello"><b>Roteiro da feira</b>${S.projetos.length} projetos em ${T.length} times · toque num time para começar</div>
   <div class="sec">Times<span>${comAchado} de ${S.projetos.length} com produto achado</span></div><div class="tiles">${tiles}</div><div style="height:80px"></div>`;
  return `${capa ? `<img class="banner" src="${capa}" alt="Canton Fair 2026">` : '<div class="banner"></div>'}
   <label class="search">${I.search}<input id="q" type="search" placeholder="Buscar projeto, coleção ou tipo" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
   <div id="res">${corpo}</div>${fab()}`;
}
function resultados() {
  const q = st.q.trim().toLowerCase(); const cont = contaPorProjeto();
  const r = S.projetos.filter((p) => [p.Projeto, p['Coleção'], p.Subcategoria, p.Tipo, p.Time].join(' ').toLowerCase().includes(q));
  return `<div class="sec">Resultados<span>${r.length} projeto${r.length !== 1 ? 's' : ''}</span></div>${r.map((p) => projRow(p, cont)).join('') || '<div class="empty">Nada encontrado. Use o botão Produto para registrar um achado novo.</div>'}<div style="height:80px"></div>`;
}
function vTime(t) {
  const cont = contaPorProjeto(); const g = {};
  S.projetos.filter((p) => p.Time === t).forEach((p) => (g[p.Subcategoria] = g[p.Subcategoria] || []).push(p));
  return Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `<div class="ghead">${esc(k)}<span>${v.length}</span></div>${v.sort((a, b) => (num(b.CMV_12M) || 0) - (num(a.CMV_12M) || 0)).map((p) => projRow(p, cont)).join('')}`).join('') + '<div style="height:90px"></div>' + fab();
}
function vProjeto(id) {
  const p = proj(id); if (!p) return '<div class="empty">Projeto não encontrado.</div>';
  const im = projImg(p); const ps = prodsDoProjeto(id).slice().sort((a, b) => (num(a.FOB_USD) || 9e9) - (num(b.FOB_USD) || 9e9));
  return `<div class="refwrap">${im ? `<img class="refimg" src="${im}" alt="Foto de referência">` : `<div class="refimg refnone">${I.img}Sem foto na buylist</div>`}${im ? '<span class="reftag">Foto da buylist</span>' : ''}</div>
   <div class="hero"><div class="k">${esc([p.Time, p.Subcategoria, p.Tipo].filter(Boolean).join(' · '))}</div><div class="v">${esc(p.Projeto)}</div>
    <div class="g"><div><small>FOB alvo</small>${p.FOB_Alvo ? `<b class="num">${esc(p.FOB_Alvo)}</b>` : '<span class="todo">A preencher</span>'}</div>
    <div><small>MOQ alvo</small>${p.MOQ_Alvo !== '' && p.MOQ_Alvo != null ? `<b class="num">${esc(p.MOQ_Alvo)} pcs</b>` : '<span class="todo">A preencher</span>'}</div>
    <div><small>CMV 12M</small><b class="num">${num(p.CMV_12M) ? brl(num(p.CMV_12M)) : 'Sem dado'}</b></div><div><small>SKUs</small><b class="num">${p.SKUs !== '' && p.SKUs != null ? esc(p.SKUs) : 'Sem dado'}</b></div></div></div>
   <button class="addp" data-go="novoproj">Adicionar produto encontrado</button>
   <div class="sec">Produtos encontrados na feira<span>${ps.length}</span></div>
   ${ps.map((x, i) => rowProduto(x, { semProjeto: true, melhor: i === 0 && ps.length > 1 })).join('') || '<div class="empty">Nenhum ainda.</div>'}<div style="height:24px"></div>`;
}
function rowProduto(x, o) {
  o = o || {}; const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor);
  const titulo = o.semProjeto ? (f ? f.Empresa : 'Fornecedor') : (p ? p.Projeto : 'Achado livre · ' + (x.Subcategoria || x.Time || ''));
  const linha2 = o.semProjeto ? `${usd(x.FOB_USD)}${x.MOQ ? ' · MOQ ' + esc(x.MOQ) : ''}` : esc(f ? f.Empresa : '');
  const linha3 = o.semProjeto ? (x.Interesse ? 'Interesse ' + esc(String(x.Interesse).toLowerCase()) : '') + (x.Anotacoes ? (x.Interesse ? ' · ' : '') + esc(x.Anotacoes) : '') : `${usd(x.FOB_USD)}${x.MOQ ? ' · MOQ ' + esc(x.MOQ) : ''}`;
  return `<button class="row" data-prod="${esc(x.ID_Produto)}">${x.thumb ? `<img class="th" src="${x.thumb}" alt="">` : ph('th')}<div class="t"><div class="t1">${esc(titulo)}</div>
   <div class="t2">${linha2}</div>${linha3 ? `<div class="t2">${linha3}</div>` : ''}
   ${o.melhor ? '<span class="cnt has">Melhor FOB</span>' : ''}${!o.semProjeto && !x.ID_Projeto ? '<span class="chip free">Fora da buylist</span>' : ''}${x._pend ? '<span class="chip fila">Na fila</span>' : ''}</div></button>`;
}
function vProdutos() {
  const ps = todosProdutos(); if (!ps.length) return '<div class="empty">Nenhum produto registrado ainda. Toque em <b>Produto</b> para registrar o primeiro achado.</div>' + fab();
  return timesOrdenados().map((t) => { const a = ps.filter((p) => p.Time === t); return a.length ? `<div class="ghead">${esc(t)}<span>${a.length}</span></div>${a.map((x) => rowProduto(x)).join('')}` : ''; }).join('') + '<div style="height:90px"></div>' + fab();
}
function vProduto(id) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x) return '<div class="empty">Produto não encontrado.</div>';
  const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor);
  const fotos = (x.fotos && x.fotos.length ? x.fotos : (x.thumb ? [x.thumb] : []));
  const fld = (l, v, data) => `<div class="field" ${data || ''}><div class="l">${l}</div><div class="v ${v ? '' : 'muted'}">${v || 'Não informado'}</div></div>`;
  const alvo = faixaAlvo(p); const fob = num(x.FOB_USD);
  return `${fotos.length ? `<div class="gal">${fotos.map((u) => `<img src="${u}" alt="">`).join('')}</div>${fotos.length > 1 ? `<div class="galnote">${fotos.length} fotos · deslize para o lado</div>` : ''}` : `<div class="refimg refnone">${I.img}Sem foto</div>`}
   <div class="hero"><div class="k">${esc([x.Time, x.Subcategoria].filter(Boolean).join(' · '))}</div><div class="v">${esc(p ? p.Projeto : 'Achado livre')}</div>
    <div class="g"><div><small>FOB</small><b class="num">${usd(fob)}</b></div><div><small>MOQ</small><b class="num">${x.MOQ ? esc(x.MOQ) + ' pcs' : '<span class="todo">Não informado</span>'}</b></div>
    ${alvo ? `<div><small>FOB alvo</small><b class="num">${esc(p.FOB_Alvo)}</b></div>` : ''}<div><small>Interesse</small><b>${esc(x.Interesse || 'Não informado')}</b></div></div></div>
   ${fld('Fornecedor', f ? esc(f.Empresa) : '', f ? `data-forn="${esc(f.ID_Fornecedor)}" role="button"` : '')}
   ${fld('Anotações', esc(x.Anotacoes))}
   ${fld('Registrado por', x._pend ? 'Você · aguardando envio' : esc(nomeDe(x.Registrado_Por)) + (x.Data_Hora ? ' · ' + esc(quando(x.Data_Hora)) : ''))}
   ${p ? `<button class="addp" data-proj="${esc(p.ID_Projeto)}" style="background:#fff;color:var(--red);box-shadow:inset 0 0 0 1px var(--red)">Ver projeto na buylist</button>` : ''}<div style="height:20px"></div>`;
}
function vFornecedores() {
  const fs = todosFornecedores().slice().sort((a, b) => String(a.Empresa).localeCompare(String(b.Empresa)));
  if (!fs.length) return '<div class="empty">Nenhum fornecedor ainda. Eles entram aqui quando você registra um produto e cria o fornecedor.</div>' + fab();
  const ps = todosProdutos();
  return `<div class="gallery">${fs.map((f) => { const n = ps.filter((p) => p.ID_Fornecedor === f.ID_Fornecedor).length; const im = f.thumb || '';
    return `<button class="gcard" data-forn="${esc(f.ID_Fornecedor)}">${im ? `<img class="im" src="${im}" alt="">` : `<div class="im">${I.store}</div>`}<div class="c"><b>${esc(f.Empresa)}</b><span>${n} produto${n !== 1 ? 's' : ''}${f.Contato ? ' · ' + esc(f.Contato) : ''}${f._pend ? ' · na fila' : ''}</span></div></button>`; }).join('')}</div><div style="height:90px"></div>${fab()}`;
}
function vFornecedor(id) {
  const f = forn(id); if (!f) return '<div class="empty">Fornecedor não encontrado.</div>';
  const ps = todosProdutos().filter((p) => p.ID_Fornecedor === id);
  const fld = (l, v) => `<div class="field"><div class="l">${l}</div><div class="v ${v ? '' : 'muted'}">${v ? esc(v) : 'Preencher depois'}</div></div>`;
  return `${f.cartao || f.thumb ? `<img class="cardimg" src="${f.cartao || f.thumb}" alt="Cartão de visita">` : `<div class="cardimg refnone">${I.store}Sem foto do cartão</div>`}
   ${fld('Contato', f.Contato)}${fld('E-mail', f.Email)}${fld('Telefone / WeChat', f.Telefone_WeChat)}${fld('Estande', f.Estande)}
   <div class="sec">Produtos<span>${ps.length}</span></div>${ps.map((x) => rowProduto(x)).join('') || '<div class="empty">Nenhum produto ligado a este fornecedor.</div>'}<div style="height:24px"></div>`;
}

/* ---------- formulário de produto ---------- */
function novoForm(projId, time) {
  const p = projId ? proj(projId) : null;
  st.form = { fixed: !!p, proj: p ? p.ID_Projeto : null, time: p ? p.Time : (time || null), sub: p ? p.Subcategoria : null, forn: null, fob: '', moq: '', int: null, nota: '', ph: [], th: [] };
  go({ v: 'form' });
}
function vForm() {
  const f = st.form; const p = f.proj ? proj(f.proj) : null; const s = f.forn ? forn(f.forn) : null;
  const subs = f.time ? [...new Set(S.projetos.filter((x) => x.Time === f.time).map((x) => x.Subcategoria))].sort() : [];
  const sugg = (!f.fixed && f.time && f.sub) ? S.projetos.filter((x) => x.Time === f.time && x.Subcategoria === f.sub) : [];
  return `<div class="form">
  <div class="fi"><span class="lab">Fotos do produto</span><div class="imgf">${[0, 1, 2, 3].map((k) => `<label class="imgbtn ${k === 0 && !f.ph[0] ? 'first' : ''}">${f.th[k] ? `<img src="${f.th[k]}" alt="">` : I.cam + (k === 0 ? 'Foto' : '+')}<input type="file" accept="image/*" capture="environment" data-ph="${k}" hidden></label>`).join('')}</div></div>
  ${f.fixed ? `<div class="fi"><span class="lab">Projeto da buylist</span><div class="ro">${esc(p.Projeto)}<small>${esc(p.Time)} · ${esc(p.Subcategoria)}${p.FOB_Alvo ? ' · alvo ' + esc(p.FOB_Alvo) : ''}</small></div></div>` : `
  <div class="fi"><span class="lab req">Time</span><div class="enum">${timesOrdenados().map((t) => `<button type="button" data-ftime="${esc(t)}" aria-pressed="${f.time === t}">${esc(t)}</button>`).join('')}</div></div>
  ${f.time ? `<div class="fi"><span class="lab req">Subcategoria</span><div class="enum">${subs.map((x) => `<button type="button" data-fsub="${esc(x)}" aria-pressed="${f.sub === x}">${esc(x)}</button>`).join('')}</div></div>` : ''}
  ${sugg.length ? `<div class="fi"><span class="lab">Atende algum projeto da buylist?</span><div class="sugg">${sugg.map((x) => `<button type="button" data-fproj="${esc(x.ID_Projeto)}" aria-pressed="${f.proj === x.ID_Projeto}">${esc(x.Projeto)}<small>${x.FOB_Alvo ? 'alvo ' + esc(x.FOB_Alvo) : ''}</small></button>`).join('')}<button type="button" data-fproj="" aria-pressed="${!!f.sub && !f.proj}">Nenhum, é um achado novo</button></div></div>` : ''}`}
  <div class="fi"><span class="lab req">Fornecedor</span><button type="button" class="sel ${s ? '' : 'ph'}" data-go="dd">${s ? esc(s.Empresa) : 'Escolher ou criar novo'}${I.down}</button></div>
  <div class="fi"><label for="fFob" class="req">FOB (USD)</label><input id="fFob" inputmode="decimal" value="${esc(f.fob)}" placeholder="0,00" autocomplete="off"><div class="delta" id="dl">${deltaTxt()}</div></div>
  <div class="fi"><label for="fMoq">MOQ (pcs)</label><input id="fMoq" inputmode="numeric" value="${esc(f.moq)}" placeholder="0" autocomplete="off"></div>
  <div class="fi"><span class="lab">Interesse</span><div class="enum">${['Alto', 'Médio', 'Baixo'].map((x) => `<button type="button" data-fint="${x}" aria-pressed="${f.int === x}">${x}</button>`).join('')}</div></div>
  <div class="fi"><label for="fNote">Anotações</label><textarea id="fNote" placeholder="MOQ por cor, material, prazo…">${esc(f.nota)}</textarea><div class="hint">Dá para ditar pelo microfone do teclado.</div></div>
 </div><div class="formbar"><button type="button" data-go="back">Cancelar</button><button type="button" class="save" data-go="salvar">Salvar</button></div>${st.dd ? ddHtml() : ''}`;
}
function deltaTxt() {
  const f = st.form; const p = f && f.proj ? proj(f.proj) : null; const a = faixaAlvo(p); const v = num(f && f.fob);
  if (!a || v == null) return '';
  const max = Math.max(...a); const min = Math.min(...a);
  if (v <= max) return `<span style="color:var(--good)">Dentro da faixa alvo (${esc(p.FOB_Alvo)})</span>`;
  return `<span style="color:var(--red)">${Math.round((v / max - 1) * 100)}% acima do teto alvo de ${usd(max)}${min !== max ? '' : ''}</span>`;
}
function ddHtml() {
  const q = st.ddq.toLowerCase(); const all = todosFornecedores(); const last = S.lastSup ? forn(S.lastSup) : null;
  const list = all.filter((s) => s.ID_Fornecedor !== (last && last.ID_Fornecedor) && String(s.Empresa).toLowerCase().includes(q)).sort((a, b) => String(a.Empresa).localeCompare(String(b.Empresa)));
  const opt = (s) => `<button type="button" class="opt" data-pick="${esc(s.ID_Fornecedor)}">${s.thumb ? `<img class="th" src="${s.thumb}" alt="">` : `<div class="th">${I.store}</div>`}<div><b style="font-weight:500">${esc(s.Empresa)}</b><small>${esc(s.Contato || 'Sem contato')}${s.Estande ? ' · ' + esc(s.Estande) : ''}</small></div></button>`;
  return `<div class="dd" data-go="ddclose"><div class="box"><div class="h">Fornecedor</div>
   <label class="q">${I.search}<input id="ddq" placeholder="Buscar pelo nome" value="${esc(st.ddq)}" autocomplete="off"></label>
   ${last && String(last.Empresa).toLowerCase().includes(q) ? `<div class="lbl">Último usado</div>${opt(last)}` : ''}
   ${list.length ? `<div class="lbl">Todos</div>${list.map(opt).join('')}` : ''}
   <button type="button" class="opt new" data-go="novoforn">${I.plus} Novo fornecedor</button></div></div>`;
}
function vNovoForn() {
  const n = st.ns;
  return `<div class="form">
  <div class="fi"><span class="lab">Cartão de visita</span><label class="imgbtn first big">${n.th ? `<img src="${n.th}" alt="">` : I.cam + 'Fotografar cartão'}<input type="file" accept="image/*" capture="environment" id="nsCard" hidden></label>
   <div class="hint">Com o cartão fotografado, o resto pode ficar em branco e ser preenchido depois.</div></div>
  <div class="fi"><label for="nsN" class="req">Empresa</label><input id="nsN" value="${esc(n.n)}" placeholder="Nome da empresa" autocomplete="off"></div>
  <div class="fi"><label for="nsC">Contato</label><input id="nsC" value="${esc(n.ct)}" placeholder="Opcional" autocomplete="off"></div>
  <div class="fi"><label for="nsE">E-mail</label><input id="nsE" type="email" value="${esc(n.em)}" placeholder="Opcional" autocomplete="off"></div>
  <div class="fi"><label for="nsP">Telefone / WeChat</label><input id="nsP" value="${esc(n.ph)}" placeholder="Opcional" autocomplete="off"></div>
  <div class="fi"><label for="nsS">Estande</label><input id="nsS" value="${esc(n.st)}" placeholder="Opcional, ex.: 12.1 D05" autocomplete="off"></div>
 </div><div class="formbar"><button type="button" data-go="back">Cancelar</button><button type="button" class="save" data-go="salvarforn">Salvar</button></div>`;
}
function keep() {
  const f = st.form; if (f) { const a = $('fFob'), b = $('fMoq'), c = $('fNote'); if (a) f.fob = a.value; if (b) f.moq = b.value; if (c) f.nota = c.value; }
  const n = st.ns; if (n && cur().v === 'novoforn') { ['n:nsN', 'ct:nsC', 'em:nsE', 'ph:nsP', 'st:nsS'].forEach((k) => { const [prop, id] = k.split(':'); if ($(id)) n[prop] = $(id).value; }); }
}

/* ================= render ================= */
function render(scroll) {
  const v = cur(); const tabOf = { home: 'home', time: 'home', projeto: 'home', produtos: 'produtos', produto: 'produtos', forn: 'forn', fornecedor: 'forn' };
  let h = '', t = 'Canton Fair 2026', b = st.stack.length > 1;
  if (v.v === 'home') h = vHome();
  else if (v.v === 'time') { t = v.time; h = vTime(v.time); }
  else if (v.v === 'projeto') { const p = proj(v.id); t = p ? p.Projeto : 'Projeto'; h = vProjeto(v.id); }
  else if (v.v === 'produtos') { t = 'Produtos'; h = vProdutos(); }
  else if (v.v === 'produto') { t = 'Produto'; h = vProduto(v.id); }
  else if (v.v === 'forn') { t = 'Fornecedores'; h = vFornecedores(); }
  else if (v.v === 'fornecedor') { const f = forn(v.id); t = f ? f.Empresa : 'Fornecedor'; h = vFornecedor(v.id); }
  else if (v.v === 'form') { t = st.form.fixed ? 'Novo produto' : 'Produto livre'; h = vForm(); }
  else if (v.v === 'novoforn') { t = 'Novo fornecedor'; h = vNovoForn(); }
  render.lastBar = [t, b]; bar(t, b);
  const s = $('scr'); s.innerHTML = h; s.scrollTop = scroll || 0;
  const inForm = v.v === 'form' || v.v === 'novoforn';
  $('nav').classList.toggle('hidden', inForm);
  const at = tabOf[v.v] || (st.stack[0] && st.stack[0].v);
  document.querySelectorAll('#nav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === at));
  wire();
}
function wire() {
  const q = $('q');
  if (q) q.oninput = () => { st.q = q.value; $('res').innerHTML = st.q.trim() ? resultados() : ''; if (!st.q.trim()) { render(0); $('q').focus(); } };
  const ddq = $('ddq'); if (ddq) ddq.oninput = () => { st.ddq = ddq.value; const pos = ddq.selectionStart; keep(); render($('scr').scrollTop); const n = $('ddq'); n.focus(); n.setSelectionRange(pos, pos); };
  const fob = $('fFob'); if (fob) fob.oninput = () => { keep(); $('dl').innerHTML = deltaTxt(); };
  document.querySelectorAll('#scr [data-ph]').forEach((inp) => inp.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return; keep(); const k = +inp.dataset.ph;
    try { const full = await compress(file, 1400, 0.74); st.form.ph[k] = full; st.form.th[k] = await reduz(full, 320, 0.7); render($('scr').scrollTop); }
    catch (err) { toast('Não consegui ler a foto. Tente de novo.'); }
  });
  const card = $('nsCard'); if (card) card.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return; keep();
    try { st.ns.card = await compress(file, 1400, 0.74); st.ns.th = await reduz(st.ns.card, 360, 0.7); render($('scr').scrollTop); }
    catch (err) { toast('Não consegui ler a foto. Tente de novo.'); }
  };
}

/* ================= fotos ================= */
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function compress(file, max, q) {
  const url = URL.createObjectURL(file);
  try { return await reduz(url, max, q); } finally { URL.revokeObjectURL(url); }
}
async function reduz(src, max, q) {
  const im = await loadImg(src); const k = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q);
}

/* ================= salvar ================= */
async function salvarProduto() {
  keep(); const f = st.form;
  if (!f.fixed && !f.time) return toast('Escolha o time.');
  if (!f.fixed && !f.sub) return toast('Escolha a subcategoria.');
  if (!f.forn) return toast('Escolha ou crie o fornecedor.');
  if (num(f.fob) == null) return toast('Preencha o FOB em dólar.');
  const fotos = f.ph.filter(Boolean); const thumbs = f.th.filter(Boolean);
  const p = { ID_Produto: uid('PR'), ID_Projeto: f.proj || '', ID_Fornecedor: f.forn, Time: f.time, Subcategoria: f.sub, FOB_USD: num(f.fob), MOQ: num(f.moq) == null ? '' : num(f.moq), Interesse: f.int || '', Anotacoes: f.nota.trim(), fotos, thumb: thumbs[0] || '', Data_Hora: new Date().toISOString() };
  S.outbox.push({ kind: 'prod', id: p.ID_Produto, payload: p }); S.lastSup = f.forn;
  await saveOutbox(); kvSet('lastSup', S.lastSup);
  st.form = null; st.stack.pop();
  render(cur().scroll || 0);
  toast(navigator.onLine ? 'Produto salvo. Enviando…' : 'Produto salvo no celular. Envia sozinho quando voltar a internet.');
  sync();
}
async function salvarFornecedor() {
  keep(); const n = st.ns;
  if (!n.n.trim() && !n.card) return toast('Fotografe o cartão ou informe a empresa.');
  const fo = { ID_Fornecedor: uid('FO'), Empresa: n.n.trim() || 'Novo fornecedor (ver cartão)', Contato: n.ct.trim(), Email: n.em.trim(), Telefone_WeChat: n.ph.trim(), Estande: n.st.trim(), cartao: n.card || '', thumb: n.th || '' };
  S.outbox.unshift({ kind: 'forn', id: fo.ID_Fornecedor, payload: fo }); // fornecedores sobem antes dos produtos
  await saveOutbox();
  st.ns = null; st.stack.pop();
  if (st.form) st.form.forn = fo.ID_Fornecedor; S.lastSup = fo.ID_Fornecedor; kvSet('lastSup', S.lastSup);
  render(cur().scroll || 0); sync();
}

/* ================= sincronização ================= */
async function sync(manual) {
  if (syncing || !S.token) return;
  if (!navigator.onLine) { if (manual) toast(S.outbox.length ? `Sem internet. ${S.outbox.length} registro${S.outbox.length > 1 ? 's' : ''} guardado${S.outbox.length > 1 ? 's' : ''} no celular; envia sozinho quando a conexão voltar.` : 'Sem internet no momento.'); refreshBar(); return; }
  syncing = true; refreshBar(); let mudou = false, erroRede = false;
  try {
    const fila = S.outbox.slice().sort((a, b) => (a.kind === 'forn' ? 0 : 1) - (b.kind === 'forn' ? 0 : 1));
    for (const item of fila) {
      try {
        if (item.kind === 'forn') await api('salvarFornecedor', { f: item.payload });
        else await api('salvarProduto', { p: item.payload });
        S.outbox = S.outbox.filter((o) => o.id !== item.id); await saveOutbox();
        const leve = Object.assign({}, item.payload); delete leve.fotos; delete leve.cartao; leve.Registrado_Por = S.email;
        if (item.kind === 'forn') S.fornecedores.push(leve); else S.produtos.push(leve);
        mudou = true;
      } catch (e) {
        if (e instanceof LoginErr) throw e;
        if (!e.servidor) { erroRede = true; break; }
        item.erro = e.message; // erro do servidor: segue com os próximos
      }
    }
    if (!erroRede) {
      const r = await api('dados', { desde: S.agora });
      const merge = (lista, novos, key) => { novos.forEach((n) => { const i = lista.findIndex((x) => x[key] === n[key]); if (i >= 0) lista[i] = Object.assign(lista[i], n); else lista.push(n); }); };
      if (r.produtos.length || r.fornecedores.length) mudou = true;
      merge(S.produtos, r.produtos, 'ID_Produto'); merge(S.fornecedores, r.fornecedores, 'ID_Fornecedor');
      S.agora = r.agora; await saveCore();
      if (!S.img || !S.img.app || !S.img.app.capa) { try { await baixaImagens(); mudou = true; } catch (e) {} }
    }
  } catch (e) {
    if (e instanceof LoginErr) { S.token = null; await kvSet('token', null); mostraLogin('Sua sessão expirou. Entre de novo: os registros guardados no celular não se perdem.'); }
  } finally {
    syncing = false;
    const v = cur().v;
    if (mudou && v !== 'form' && v !== 'novoforn') render($('scr').scrollTop); else refreshBar();
  }
}
async function baixaImagens() { const r = await api('imagens', {}); S.img = r.pacote; await kvSet('img', S.img); }

/* ================= login ================= */
let loginEl = null;
function mostraLogin(msg) {
  if (loginEl) loginEl.remove();
  loginEl = document.createElement('div'); loginEl.className = 'login';
  const passo1 = () => {
    loginEl.innerHTML = `<div class="k">WESTWING · GUANGZHOU</div><div class="rule"></div><h1>Canton Fair</h1><div class="y">2026</div>
     <p>${msg ? esc(msg) : 'Entre com seu e-mail da Westwing. Vamos mandar um código de 6 dígitos para o seu e-mail.'}</p>
     <input id="lgE" type="email" inputmode="email" autocomplete="email" placeholder="nome.sobrenome@westwing.com.br" value="${esc(S.email || '')}">
     <button class="go" id="lgB">Receber código</button><div class="err" id="lgX"></div>`;
    loginEl.querySelector('#lgB').onclick = async () => {
      const email = loginEl.querySelector('#lgE').value.trim().toLowerCase(); const x = loginEl.querySelector('#lgX'); const b = loginEl.querySelector('#lgB');
      if (!/@westwing\.com\.br$/.test(email)) { x.textContent = 'Use o seu e-mail @westwing.com.br'; return; }
      if (!navigator.onLine) { x.textContent = 'Sem internet. O primeiro acesso precisa de conexão.'; return; }
      b.disabled = true; b.textContent = 'Enviando…'; x.textContent = '';
      try { await api('pedirCodigo', { email }); passo2(email); }
      catch (e) { x.textContent = e.servidor ? e.message : 'Não consegui conectar. Tente de novo.'; b.disabled = false; b.textContent = 'Receber código'; }
    };
  };
  const passo2 = (email) => {
    loginEl.innerHTML = `<div class="k">WESTWING · GUANGZHOU</div><div class="rule"></div><h1>Canton Fair</h1><div class="y">2026</div>
     <p>Mandamos um código para <b>${esc(email)}</b>. Ele chega em instantes (confira também o spam).</p>
     <input id="lgC" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
     <button class="go" id="lgB">Entrar</button><div class="err" id="lgX"></div><button class="lnk" id="lgV">Usar outro e-mail</button>`;
    loginEl.querySelector('#lgV').onclick = passo1;
    const entrar = async () => {
      const codigo = loginEl.querySelector('#lgC').value.trim(); const x = loginEl.querySelector('#lgX'); const b = loginEl.querySelector('#lgB');
      if (codigo.length !== 6) { x.textContent = 'Digite os 6 números do código.'; return; }
      b.disabled = true; b.textContent = 'Entrando…'; x.textContent = '';
      try {
        const r = await api('entrar', { email, codigo });
        S.token = r.token; S.email = r.email; await kvSet('token', S.token); await kvSet('email', S.email);
        loginEl.remove(); loginEl = null; await inicia();
      } catch (e) { x.textContent = e.servidor ? e.message : 'Não consegui conectar. Tente de novo.'; b.disabled = false; b.textContent = 'Entrar'; }
    };
    loginEl.querySelector('#lgB').onclick = entrar;
    loginEl.querySelector('#lgC').oninput = (e) => { if (e.target.value.trim().length === 6) entrar(); };
  };
  passo1(); document.body.appendChild(loginEl);
}

/* ================= início ================= */
async function inicia() {
  if (!S.projetos.length) {
    bar('Canton Fair 2026', false); $('nav').classList.add('hidden');
    $('scr').innerHTML = '<div class="load"><b>Preparando o roteiro</b>Baixando os projetos e as fotos da buylist para funcionar sem internet. Só acontece na primeira vez.</div>';
    try {
      const r = await api('dados', { desde: '' });
      S.projetos = r.projetos; S.times = r.times; S.produtos = r.produtos; S.fornecedores = r.fornecedores; S.agora = r.agora;
      await Promise.all([kvSet('projetos', S.projetos), kvSet('times', S.times), saveCore()]);
      try { await baixaImagens(); } catch (e) {}
    } catch (e) {
      if (e instanceof LoginErr) { S.token = null; await kvSet('token', null); return mostraLogin(); }
      $('scr').innerHTML = '<div class="load"><b>Sem conexão</b>O primeiro acesso precisa de internet para baixar o roteiro. Conecte e toque em sincronizar.</div>';
      return;
    }
    $('nav').classList.remove('hidden');
  }
  render(0); sync();
}

/* ================= eventos ================= */
let toastT;
function toast(m) { document.querySelectorAll('.toast').forEach((t) => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3200); }

document.addEventListener('click', (e) => {
  let el;
  if ((el = e.target.closest('#nav [data-tab]'))) { tab(el.dataset.tab); return; }
  if (!e.target.closest('#app')) return;
  if ((el = e.target.closest('[data-pick]'))) { keep(); st.form.forn = el.dataset.pick; st.dd = false; st.ddq = ''; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-ftime]'))) { keep(); const f = st.form; if (f.time !== el.dataset.ftime) { f.time = el.dataset.ftime; f.sub = null; f.proj = null; } render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fsub]'))) { keep(); st.form.sub = el.dataset.fsub; st.form.proj = null; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fproj]'))) { keep(); st.form.proj = el.dataset.fproj || null; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fint]'))) { keep(); st.form.int = st.form.int === el.dataset.fint ? null : el.dataset.fint; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-time]'))) { go({ v: 'time', time: el.dataset.time }); return; }
  if ((el = e.target.closest('[data-proj]'))) { go({ v: 'projeto', id: el.dataset.proj }); return; }
  if ((el = e.target.closest('[data-prod]'))) { go({ v: 'produto', id: el.dataset.prod }); return; }
  if ((el = e.target.closest('[data-forn]'))) { go({ v: 'fornecedor', id: el.dataset.forn }); return; }
  if (!(el = e.target.closest('[data-go]'))) return;
  const a = el.dataset.go;
  if (a === 'ddclose') { if (e.target === el) { st.dd = false; st.ddq = ''; render($('scr').scrollTop); } return; }
  if (a === 'back') { if (cur().v === 'form') { st.form = null; st.dd = false; } if (cur().v === 'novoforn') st.ns = null; back(); return; }
  if (a === 'sync') { sync(true); return; }
  if (a === 'novo') { const v = cur(); novoForm(null, v.v === 'time' ? v.time : null); return; }
  if (a === 'novoproj') { novoForm(cur().id); return; }
  if (a === 'dd') { keep(); st.dd = true; st.ddq = ''; render($('scr').scrollTop); return; }
  if (a === 'novoforn') { keep(); st.dd = false; st.ns = { card: null, th: null, n: st.ddq || '', ct: '', em: '', ph: '', st: '' }; st.ddq = ''; go({ v: 'novoforn' }); return; }
  if (a === 'salvar') { salvarProduto(); return; }
  if (a === 'salvarforn') { salvarFornecedor(); return; }
});
window.addEventListener('online', () => { refreshBar(); sync(); });
window.addEventListener('offline', refreshBar);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
setInterval(() => sync(), 30000);

/* ================= partida ================= */
(async function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  db = await openDB();
  const ks = ['token', 'email', 'projetos', 'times', 'produtos', 'fornecedores', 'outbox', 'img', 'agora', 'lastSup'];
  const vs = await Promise.all(ks.map(kvGet));
  ks.forEach((k, i) => { if (vs[i] !== undefined && vs[i] !== null) S[k] = vs[i]; });
  S.outbox = S.outbox || [];
  if (!S.token) { bar('Canton Fair 2026', false); mostraLogin(); return; }
  inicia();
})();
})();
