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
  down: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  zoom: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/></svg>'
};
const ADMIN = 'renato.martins@westwing.com.br';
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
const kvDel = (k) => new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; t.onerror = res; });

/* fotos em alta: as do próprio celular ficam guardadas; as dos outros são baixadas ao abrir e guardadas (até 80 itens) */
const FOTOS = {}; // id -> [dataUrl|'' x4]
async function fotosLocais(id) { if (!(id in FOTOS)) FOTOS[id] = (await kvGet('fotos:' + id)) || null; return FOTOS[id]; }
async function guardaFotos(id, arr, deOutro) {
  FOTOS[id] = arr; await kvSet('fotos:' + id, arr);
  const idx = ((await kvGet('fotosIdx')) || []).filter((x) => x !== id);
  if (!deOutro) await kvSet('fotosIdx', idx);
  else {
    idx.push(id);
    while (idx.length > 80) { const v = idx.shift(); delete FOTOS[v]; await kvDel('fotos:' + v); }
    await kvSet('fotosIdx', idx);
  }
}
async function apagaFotos(id) { delete FOTOS[id]; await kvDel('fotos:' + id); }

const S = { token: null, email: null, projetos: [], times: [], produtos: [], fornecedores: [], paginas: [], anotacoes: [], outbox: [], img: null, agora: '', lastSup: null };
const saveCore = () => Promise.all([kvSet('produtos', S.produtos), kvSet('fornecedores', S.fornecedores), kvSet('paginas', S.paginas), kvSet('anotacoes', S.anotacoes), kvSet('agora', S.agora)]);

/* arquivos JSON (páginas do caderno e anotações): guardados no celular com o endereço de origem */
const JSONS = {};
async function jsonLocal(key) { if (!(key in JSONS)) JSONS[key] = (await kvGet('json:' + key)) || null; return JSONS[key]; }
async function guardaJson(key, u, t) { JSONS[key] = { u, t }; await kvSet('json:' + key, JSONS[key]); }
async function apagaJson(key) { delete JSONS[key]; await kvDel('json:' + key); }
const PEGANDO = new Set();
// devolve o texto do JSON (do celular ou baixando); null se não der
async function pegaJson(key, url) {
  const c = await jsonLocal(key);
  if (c && (!url || !c.u || c.u === url)) return c.t;
  if (!url || !navigator.onLine || !S.token || PEGANDO.has(key)) return c ? c.t : null;
  PEGANDO.add(key);
  try { const r = await api('foto', { id: url }); await guardaJson(key, url, r.texto); return r.texto; }
  catch (e) { return c ? c.t : null; } finally { PEGANDO.delete(key); }
}
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
function go(view) { guardaRolagem(); cur().scroll = $('scr').scrollTop; st.stack.push(view); render(0); }
function back() { if (st.stack.length > 1) st.stack.pop(); render(cur().scroll || 0); }
function tab(t) { st.stack = [{ v: t }]; st.q = ''; render(0); }

/* ================= barra ================= */
let syncing = false;
function bar(title, canBack) {
  const n = S.outbox.length; const on = navigator.onLine;
  $('bar').innerHTML = `<div class="brand">WESTWING · CANTON 26</div>${canBack ? `<button class="ib" data-go="back" aria-label="Voltar">${I.back}</button>` : ''}<h2>${esc(title)}</h2>
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
  const corpo = st.q.trim() ? resultados() : `<div class="hello"><b>Roteiro da feira</b>${S.projetos.length} projetos em ${T.length} times</div>
   <div class="sec">Times<span>${comAchado} de ${S.projetos.length} com produto achado</span></div><div class="tiles">${tiles}</div><div style="height:80px"></div>`;
  return `${capa ? `<img class="banner" src="${capa}" alt="Canton Fair 2026">` : '<div class="banner"></div>'}
   <label class="search">${I.search}<input id="q" type="search" placeholder="Buscar projeto, coleção ou tipo" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
   <div id="res">${corpo}</div>${fab()}`;
}
function resultados() {
  const q = st.q.trim().toLowerCase(); const cont = contaPorProjeto();
  const r = S.projetos.filter((p) => [p.Projeto, p['Coleção'], p.Subcategoria, p.Tipo, p.Time].join(' ').toLowerCase().includes(q));
  return `<div class="sec">Resultados<span>${r.length} projeto${r.length !== 1 ? 's' : ''}</span></div>${r.length ? `<div class="list">${r.map((p) => projRow(p, cont)).join('')}</div>` : '<div class="empty">Nada encontrado. Use o botão Produto para registrar um achado novo.</div>'}<div style="height:80px"></div>`;
}
function vTime(t) {
  const cont = contaPorProjeto(); const g = {};
  S.projetos.filter((p) => p.Time === t).forEach((p) => (g[p.Subcategoria] = g[p.Subcategoria] || []).push(p));
  return Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `<div class="ghead">${esc(k)}<span>${v.length}</span></div><div class="list">${v.sort((a, b) => (num(b.CMV_12M) || 0) - (num(a.CMV_12M) || 0)).map((p) => projRow(p, cont)).join('')}</div>`).join('') + '<div style="height:90px"></div>' + fab();
}
function vProjeto(id) {
  const p = proj(id); if (!p) return '<div class="empty">Projeto não encontrado.</div>';
  const im = projImg(p); const ps = prodsDoProjeto(id).slice().sort((a, b) => (num(a.FOB_USD) || 9e9) - (num(b.FOB_USD) || 9e9));
  return `<div class="split"><div class="sl"><div class="refwrap">${im ? `<img class="refimg" src="${im}" alt="Foto de referência">` : `<div class="refimg refnone">${I.img}Sem foto na buylist</div>`}${im ? '<span class="reftag">Foto da buylist</span>' : ''}</div></div><div class="sr">
   <div class="hero"><div class="k">${esc([p.Time, p.Subcategoria, p.Tipo].filter(Boolean).join(' · '))}</div><div class="v">${esc(p.Projeto)}</div>
    <div class="g"><div><small>FOB alvo</small>${p.FOB_Alvo ? `<b class="num">${esc(p.FOB_Alvo)}</b>` : '<span class="todo">A preencher</span>'}</div>
    <div><small>MOQ alvo</small>${p.MOQ_Alvo !== '' && p.MOQ_Alvo != null ? `<b class="num">${esc(p.MOQ_Alvo)} pcs</b>` : '<span class="todo">A preencher</span>'}</div>
    <div><small>CMV 12M</small><b class="num">${num(p.CMV_12M) ? brl(num(p.CMV_12M)) : 'Sem dado'}</b></div><div><small>SKUs</small><b class="num">${p.SKUs !== '' && p.SKUs != null ? esc(p.SKUs) : 'Sem dado'}</b></div></div></div>
   ${LARGO() && ps.length > 1 ? `<div class="duas"><button class="addp" data-go="novoproj">Adicionar produto encontrado</button><button class="addp out" data-go="comparar">Comparar os ${ps.length} achados</button></div>` : '<button class="addp" data-go="novoproj">Adicionar produto encontrado</button>'}
   <div class="sec">Produtos encontrados na feira<span>${ps.length}</span></div>
   ${ps.map((x, i) => rowProduto(x, { semProjeto: true, melhor: i === 0 && ps.length > 1 })).join('') || '<div class="empty">Nenhum ainda.</div>'}<div style="height:24px"></div></div></div>`;
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
  return timesOrdenados().map((t) => { const a = ps.filter((p) => p.Time === t); return a.length ? `<div class="ghead">${esc(t)}<span>${a.length}</span></div><div class="list">${a.map((x) => rowProduto(x)).join('')}</div>` : ''; }).join('') + '<div style="height:90px"></div>' + fab();
}
function podeApagar(x) { return !!x && (x._pend || S.email === ADMIN || String(x.Registrado_Por || '').toLowerCase() === S.email); }
function urlsProduto(x) { return [1, 2, 3, 4].map((k) => x['Foto_' + k] || ''); }
// cada foto do produto: alta (se já está no celular), miniatura (enquanto a alta não chega) e endereço no Drive
function slotsProduto(x) {
  if (x._pend) return (x.fotos || []).filter(Boolean).map((u, k) => ({ k, full: u }));
  const c = FOTOS[x.ID_Produto]; const us = urlsProduto(x); const out = [];
  for (let k = 0; k < 4; k++) { const full = c && c.f[k] && (!c.u[k] || !us[k] || c.u[k] === us[k]) ? c.f[k] : ''; if (us[k] || full) out.push({ k, url: us[k], full }); }
  if (!out.length && x.thumb) out.push({ k: 0, full: '' });
  if (out[0] && !out[0].full) out[0].th = x.thumb;
  return out;
}
const TENTOU = new Set(); const BAIXANDO = new Set();
async function garanteFotos(id, urls, deOutro) {
  if (BAIXANDO.has(id)) return; BAIXANDO.add(id);
  try {
    const c = (await fotosLocais(id)) || { u: [], f: [] };
    const falta = urls.map((u, k) => (u && !(c.f[k] && (!c.u[k] || c.u[k] === u)) ? k : -1)).filter((k) => k >= 0);
    if (falta.length && navigator.onLine && S.token) {
      let veio = false;
      await Promise.all(falta.map(async (k) => { try { const r = await api('foto', { id: urls[k] }); c.f[k] = r.foto; c.u[k] = urls[k]; veio = true; } catch (e) {} }));
      if (veio) await guardaFotos(id, c, deOutro);
    }
  } finally { BAIXANDO.delete(id); }
  const v = LARGO() ? baseLarga() : cur(); if ((v.id === id || v.sel === id) && !lb && !anotEl) render($('scr').scrollTop);
}
let galAtual = [];
function galeria(slots, vazio) {
  galAtual = slots.map((s) => s.full || s.th || '');
  if (!slots.length) return `<div class="refimg refnone">${I.img}${vazio}</div>`;
  const on = navigator.onLine;
  return `<div class="gal">${slots.map((s, i) => { const src = s.full || s.th;
    return src ? `<button class="gimg" data-zoom="${i}"><img src="${src}" alt="">${!s.full && s.url ? `<span class="gload">${on ? 'Carregando a foto em alta…' : 'Sem internet: mostrando a miniatura'}</span>` : `<span class="gzoom">${I.zoom}</span>`}</button>`
      : `<div class="gimg gph">${I.img}<span>${on ? 'Carregando foto…' : 'A foto aparece quando houver internet'}</span></div>`; }).join('')}</div>
   <div class="galnote">${slots.length > 1 ? slots.length + ' fotos · deslize para o lado · ' : ''}toque para ampliar</div>`;
}
function acoes(tipo, x) {
  return `<div class="acts"><button type="button" data-go="edit${tipo}">${I.edit}Editar</button>${podeApagar(x) ? `<button type="button" class="del" data-go="del${tipo}">${I.del}Apagar</button>` : ''}</div>`;
}
function vProduto(id) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x) return '<div class="empty">Produto não encontrado. Ele pode ter sido apagado.</div>';
  const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor);
  if (!x._pend && !TENTOU.has(id)) { TENTOU.add(id); setTimeout(() => garanteFotos(id, urlsProduto(x), String(x.Registrado_Por || '').toLowerCase() !== S.email)); }
  const fld = (l, v, data) => `<div class="field" ${data || ''}><div class="l">${l}</div><div class="v ${v ? '' : 'muted'}">${v || 'Não informado'}</div></div>`;
  const alvo = faixaAlvo(p); const fob = num(x.FOB_USD);
  return `<div class="split"><div class="sl">${galeria(slotsProduto(x), 'Sem foto')}</div><div class="sr">
   <div class="hero"><div class="k">${esc([x.Time, x.Subcategoria].filter(Boolean).join(' · '))}</div><div class="v">${esc(p ? p.Projeto : 'Achado livre')}</div>
    <div class="g"><div><small>FOB</small><b class="num">${usd(fob)}</b></div><div><small>MOQ</small><b class="num">${x.MOQ !== '' && x.MOQ != null ? esc(x.MOQ) + ' pcs' : '<span class="todo">Não informado</span>'}</b></div>
    ${alvo ? `<div><small>FOB alvo</small><b class="num">${esc(p.FOB_Alvo)}</b></div>` : ''}<div><small>Interesse</small><b>${esc(x.Interesse || 'Não informado')}</b></div></div></div>
   ${fld('Fornecedor', f ? esc(f.Empresa) : '', f ? `data-forn="${esc(f.ID_Fornecedor)}" role="button"` : '')}
   ${fld('Anotações', esc(x.Anotacoes))}
   ${fld('Registrado por', x._pend ? 'Você · aguardando envio' : esc(nomeDe(x.Registrado_Por)) + (x.Data_Hora ? ' · ' + esc(quando(x.Data_Hora)) : ''))}
   ${p ? `<button class="addp out" data-proj="${esc(p.ID_Projeto)}">Ver projeto na buylist</button>` : ''}
   ${acoes('prod', x)}<div style="height:20px"></div></div></div>`;
}
function vFornecedores() {
  const fs = todosFornecedores().slice().sort((a, b) => String(a.Empresa).localeCompare(String(b.Empresa)));
  if (!fs.length) return '<div class="empty">Nenhum fornecedor ainda. Eles entram aqui quando você registra um produto e cria o fornecedor.</div>' + fab();
  const ps = todosProdutos();
  return `<div class="gallery">${fs.map((f) => { const n = ps.filter((p) => p.ID_Fornecedor === f.ID_Fornecedor).length; const im = f.thumb || '';
    return `<button class="gcard" data-forn="${esc(f.ID_Fornecedor)}">${im ? `<img class="im" src="${im}" alt="">` : `<div class="im">${I.store}</div>`}<div class="c"><b>${esc(f.Empresa)}</b><span>${n} produto${n !== 1 ? 's' : ''}${f.Contato ? ' · ' + esc(f.Contato) : ''}${f._pend ? ' · na fila' : ''}</span></div></button>`; }).join('')}</div><div style="height:90px"></div>${fab()}`;
}
function vFornecedor(id) {
  const f = forn(id); if (!f) return '<div class="empty">Fornecedor não encontrado. Ele pode ter sido apagado.</div>';
  const ps = todosProdutos().filter((p) => p.ID_Fornecedor === id);
  const fld = (l, v) => `<div class="field"><div class="l">${l}</div><div class="v ${v ? '' : 'muted'}">${v ? esc(v) : 'Preencher depois'}</div></div>`;
  let slots;
  if (f._pend) slots = f.cartao ? [{ full: f.cartao }] : (f.thumb ? [{ th: f.thumb }] : []);
  else {
    if (!TENTOU.has(id)) { TENTOU.add(id); setTimeout(() => garanteFotos(id, [f.Foto_Cartao || ''], String(f.Registrado_Por || '').toLowerCase() !== S.email)); }
    const c = FOTOS[id]; const full = c && c.f[0] && (!c.u[0] || !f.Foto_Cartao || c.u[0] === f.Foto_Cartao) ? c.f[0] : '';
    slots = full ? [{ full }] : (f.Foto_Cartao || f.thumb ? [{ url: f.Foto_Cartao, th: f.thumb }] : []);
  }
  return `<div class="split"><div class="sl">${galeria(slots, 'Sem foto do cartão').replace('<div class="gal">', '<div class="gal card">')}</div><div class="sr">
   ${fld('Empresa', f.Empresa)}${fld('Contato', f.Contato)}${fld('E-mail', f.Email)}${fld('Telefone / WeChat', f.Telefone_WeChat)}${fld('Estande', f.Estande)}
   ${acoes('forn', f)}
   ${LARGO() ? `<div class="sec">Caderno<span>${paginasTodas().filter((g) => g.ID_Fornecedor === id).length}</span></div>${paginasTodas().filter((g) => g.ID_Fornecedor === id).map((g) => `<button type="button" class="row pgrow" data-pag="${esc(g.ID_Pagina)}">${g.thumb ? `<img class="th pg" src="${g.thumb}" alt="">` : '<span class="th pg folhinha"></span>'}<div class="t"><div class="t1">${esc(tituloPag(g))}</div><div class="t2">${esc(nomeDe(g.Registrado_Por))}${g.Criada_Em ? ' · ' + esc(quando(g.Criada_Em)) : ''}</div></div></button>`).join('')}<button type="button" class="lnk pad" data-go="novapagforn">+ Nova página do caderno para este fornecedor</button>` : ''}
   <div class="sec">Produtos<span>${ps.length}</span></div>${ps.map((x) => rowProduto(x)).join('') || '<div class="empty">Nenhum produto ligado a este fornecedor.</div>'}<div style="height:24px"></div></div></div>`;
}

/* ---------- formulário de produto ---------- */
function novoForm(projId, time) {
  const p = projId ? proj(projId) : null;
  st.form = { fixed: !!p, proj: p ? p.ID_Projeto : null, time: p ? p.Time : (time || null), sub: p ? p.Subcategoria : null, forn: null, fob: '', moq: '', int: null, nota: '', ph: [], th: [], tem: [], mud: [] };
  go({ v: 'form' });
}
function vForm() {
  const f = st.form; const p = f.proj ? proj(f.proj) : null; const s = f.forn ? forn(f.forn) : null;
  const subs = f.time ? [...new Set(S.projetos.filter((x) => x.Time === f.time).map((x) => x.Subcategoria))].sort() : [];
  const sugg = (!f.fixed && f.time && f.sub) ? S.projetos.filter((x) => x.Time === f.time && x.Subcategoria === f.sub) : [];
  return `<div class="form">
  <div class="fi"><span class="lab">Fotos do produto</span><div class="imgf">${[0, 1, 2, 3].map((k) => { const tem = f.th[k] || f.tem[k];
    return `<div class="slot"><label class="imgbtn ${k === 0 && !tem ? 'first' : ''}">${f.th[k] ? `<img src="${f.th[k]}" alt="">` : f.tem[k] ? I.img + 'Foto salva' : I.cam + (k === 0 ? 'Foto' : '+')}<input type="file" accept="image/*" capture="environment" data-ph="${k}" hidden></label>${tem ? `<button type="button" class="rm" data-rm="${k}" aria-label="Tirar foto">${I.x}</button>` : ''}</div>`; }).join('')}</div>
   ${f.edit ? '<div class="hint">Toque numa foto para trocar, ou no x para tirar.</div>' : ''}</div>
  ${f.fixed ? `<div class="fi"><span class="lab">Projeto da buylist</span><div class="ro">${esc(p.Projeto)}<small>${esc(p.Time)} · ${esc(p.Subcategoria)}${p.FOB_Alvo ? ' · alvo ' + esc(p.FOB_Alvo) : ''}</small></div></div>` : `
  <div class="fi"><span class="lab req">Time</span><div class="enum">${timesOrdenados().map((t) => `<button type="button" data-ftime="${esc(t)}" aria-pressed="${f.time === t}">${esc(t)}</button>`).join('')}</div></div>
  ${f.time ? `<div class="fi"><span class="lab req">Subcategoria</span><div class="enum">${subs.map((x) => `<button type="button" data-fsub="${esc(x)}" aria-pressed="${f.sub === x}">${esc(x)}</button>`).join('')}</div></div>` : ''}
  ${sugg.length ? `<div class="fi"><span class="lab">Atende algum projeto da buylist?</span><div class="sugg">${sugg.map((x) => `<button type="button" data-fproj="${esc(x.ID_Projeto)}" aria-pressed="${f.proj === x.ID_Projeto}">${esc(x.Projeto)}<small>${x.FOB_Alvo ? 'alvo ' + esc(x.FOB_Alvo) : ''}</small></button>`).join('')}<button type="button" data-fproj="" aria-pressed="${!!f.sub && !f.proj}">Nenhum, é um achado novo</button></div></div>` : ''}`}
  <div class="fi"><span class="lab req">Fornecedor</span><button type="button" class="sel ${s ? '' : 'ph'}" data-go="dd">${s ? esc(s.Empresa) : 'Escolher ou criar novo'}${I.down}</button></div>
  <div class="fi"><label for="fFob" class="req">FOB (USD)</label><input id="fFob" inputmode="decimal" value="${esc(f.fob)}" placeholder="0,00" autocomplete="off"><div class="delta" id="dl">${deltaTxt()}</div></div>
  <div class="fi"><label for="fMoq">MOQ (pcs)</label><input id="fMoq" inputmode="numeric" value="${esc(f.moq)}" placeholder="0" autocomplete="off"></div>
  <div class="fi"><span class="lab">Interesse</span><div class="enum">${['Alto', 'Médio', 'Baixo'].map((x) => `<button type="button" data-fint="${x}" aria-pressed="${f.int === x}">${x}</button>`).join('')}</div></div>
  <div class="fi"><label for="fNote">Anotações</label><textarea id="fNote" placeholder="MOQ por cor, material, prazo…">${esc(f.nota)}</textarea><div class="hint">Dá para ditar pelo microfone do teclado.</div></div>
  ${LARGO() ? '<div class="dica"><b>Escreva com a Pencil direto nos campos.</b> O iPad converte a letra em texto na hora (Rabisco), e o FOB já compara com o alvo da buylist.</div>' : ''}
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
  <div class="fi"><span class="lab">Cartão de visita</span><label class="imgbtn first big">${n.th ? `<img src="${n.th}" alt="">` : I.cam + 'Fotografar cartão'}${n.edit && n.th ? '<span class="gload">Toque para trocar a foto</span>' : ''}<input type="file" accept="image/*" capture="environment" id="nsCard" hidden></label>
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

/* ================= iPad (tela larga) =================
   O iPhone continua com as telas acima. A partir de 768px de largura o app usa menu lateral,
   lista e detalhe lado a lado, painel de formulário, anotação com a Pencil, caderno e comparação. */
const LARGO = () => window.innerWidth >= 768;
const PATH = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  produtos: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  forn: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  caderno: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z',
  'Móveis': 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z',
  'Cozinha': 'M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 0 0 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z',
  'Têxtil': 'M21 10.78V8c0-1.65-1.35-3-3-3h-4c-.77 0-1.47.3-2 .78-.53-.48-1.23-.78-2-.78H6C4.35 5 3 6.35 3 8v2.78c-.61.55-1 1.34-1 2.22v6h2v-2h16v2h2v-6c0-.88-.39-1.67-1-2.22zM14 7h4c.55 0 1 .45 1 1v2h-6V8c0-.55.45-1 1-1zM5 8c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v2H5V8z',
  'Decor': 'M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zM9 21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1z',
  hl: 'M6 14l3 3v5h6v-5l3-3V9H6v5zm5-12h2v3h-2V2zM3.5 5.88l1.41-1.41 2.12 2.12-1.41 1.41L3.5 5.88zm13.46.71l2.12-2.12 1.41 1.41-2.12 2.12-1.41-1.41z',
  er: 'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z',
  move: 'M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z',
  undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0 1 12.5 10.5c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  redo: 'M18.4 10.6A10.4 10.4 0 0 0 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
  star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  starO: 'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'
};
const svgI = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const alvo = () => cur().sel || cur().id;
const iniciais = (e) => nomeDe(e).split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('');
function agoraSP() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
}
function favoritosDe(x) { return String((x && x.Favoritos) || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean); }
function anotacaoDe(id, k) {
  const pend = S.outbox.filter((o) => o.kind === 'anot' && o.payload.ID_Produto === id && +o.payload.Foto === k + 1).pop();
  if (pend) return pend.payload.json ? { key: id + '_' + (k + 1), json: pend.payload.json } : null;
  const a = S.anotacoes.find((r) => r.ID_Produto === id && +r.Foto === k + 1);
  return a ? { key: a.ID_Anotacao, url: a.Tracos } : null;
}
function paginasTodas() {
  const fora = new Set(S.outbox.filter((o) => o.kind === 'dpag').map((o) => o.ref));
  const out = S.paginas.filter((g) => !fora.has(g.ID_Pagina)).map((g) => Object.assign({}, g));
  S.outbox.filter((o) => o.kind === 'pag').forEach((o) => {
    const m = { ID_Pagina: o.ref, Titulo: o.payload.Titulo, ID_Fornecedor: o.payload.ID_Fornecedor, ID_Produto: o.payload.ID_Produto, thumb: o.payload.thumb, Criada_Em: o.payload.Criada_Em, _pend: true };
    const i = out.findIndex((g) => g.ID_Pagina === o.ref);
    if (i >= 0) Object.assign(out[i], m); else out.push(Object.assign({ Registrado_Por: S.email }, m));
  });
  return out.sort((a, b) => String(b.Criada_Em || b.Data_Hora).localeCompare(String(a.Criada_Em || a.Data_Hora)));
}
const tituloPag = (g) => g.Titulo || (forn(g.ID_Fornecedor) || {}).Empresa || 'Página sem título';

function lado() {
  const base = st.stack[0]; const ativo = base.v === 'time' ? 'time:' + base.time : base.v;
  const cont = contaPorProjeto(); const n = S.outbox.length;
  const it = (key, ic, label, extra, attrs) => `<button type="button" class="nv ${ativo === key ? 'on' : ''}" ${attrs} aria-label="${esc(label)}">${svgI(ic)}<span class="lbl">${esc(label)}</span>${extra != null ? `<span class="c">${esc(extra)}</span>` : ''}</button>`;
  const times = timesOrdenados().map((t) => { const ps = S.projetos.filter((p) => p.Time === t); const f = ps.filter((p) => cont[p.ID_Projeto]).length;
    return it('time:' + t, PATH[t] || PATH.Decor, t, `${f} de ${ps.length}`, `data-ltime="${esc(t)}"`); }).join('');
  return `<aside class="side">${it('home', PATH.home, 'Início', null, 'data-tab="home"')}<div class="sb">Times</div>${times}<div class="sb">Na feira</div>
   ${it('produtos', PATH.produtos, 'Produtos', todosProdutos().length, 'data-tab="produtos"')}${it('forn', PATH.forn, 'Fornecedores', todosFornecedores().length, 'data-tab="forn"')}${it('caderno', PATH.caderno, 'Caderno', paginasTodas().length + ' pág.', 'data-tab="caderno"')}
   <div style="flex:1"></div><div class="eu"><div class="av">${esc(iniciais(S.email))}</div><div class="lbl"><b>${esc(nomeDe(S.email))}</b><small>${n ? n + ' na fila para enviar' : (navigator.onLine ? 'Tudo enviado' : 'Sem internet')}</small></div></div></aside>`;
}

function baseLarga() { return [...st.stack].reverse().find((x) => x.v !== 'form' && x.v !== 'novoforn') || st.stack[0]; }
function guardaRolagem() { if (!LARGO()) return; const v = baseLarga(); v.sc = v.sc || {}; ['pl', 'pd', 'pu'].forEach((id) => { const e = $(id); if (e) v.sc[id] = e.scrollTop; }); }
function selec(id) { guardaRolagem(); const v = cur(); v.sel = id; v.foto = 0; v.semAnot = false; v.sc = v.sc || {}; v.sc.pd = 0; render(); }

function renderLargo() {
  salvaPaginaJa();
  guardaRolagem();
  $('app').classList.add('largo'); $('nav').classList.add('hidden');
  const top = cur(); const v = baseLarga(); let painel = '';
  if (top.v === 'form' || top.v === 'novoforn') {
    const tt = top.v === 'form' ? (st.form.edit ? 'Editar produto' : (st.form.fixed && proj(st.form.proj) ? 'Novo produto · ' + proj(st.form.proj).Projeto : 'Produto livre')) : (st.ns.edit ? 'Editar fornecedor' : 'Novo fornecedor');
    painel = `<div class="veu"></div><aside class="painel"><div class="phd">${esc(tt)}</div>${top.v === 'form' ? vForm() : vNovoForn()}</aside>`;
  }
  let t = 'Canton Fair 2026', h = '';
  const vazio = (txt) => `<div class="vazio">${txt}</div>`;
  const dois = (lista, det, txt) => `<div class="pane lista" id="pl">${lista}</div><div class="pane det" id="pd">${det || vazio(txt)}</div>`;
  if (v.v === 'home') h = `<div class="pane uno" id="pu">${vHome()}</div>`;
  else if (v.v === 'time') { t = v.time; h = dois(vTime(v.time), v.sel && proj(v.sel) ? vProjeto(v.sel) : '', 'Escolha um projeto da lista para ver a referência e os achados.'); }
  else if (v.v === 'projeto') { const p = proj(v.id); t = p ? p.Projeto : 'Projeto'; h = `<div class="pane uno" id="pu">${vProjeto(v.id)}</div>`; }
  else if (v.v === 'produtos') { t = 'Produtos'; h = dois(vProdutos(), v.sel ? vProdutoLargo(v.sel, false) : '', 'Escolha um produto da lista.'); }
  else if (v.v === 'produto') { const x = todosProdutos().find((p) => p.ID_Produto === v.id); const p = x && proj(x.ID_Projeto); t = (p ? p.Projeto : 'Achado livre') + (x && forn(x.ID_Fornecedor) ? ' · ' + forn(x.ID_Fornecedor).Empresa : ''); h = `<div class="pane uno" id="pu">${vProdutoLargo(v.id, true)}</div>`; }
  else if (v.v === 'forn') { t = 'Fornecedores'; h = dois(vFornecedores(), v.sel ? vFornecedor(v.sel) : '', 'Escolha um fornecedor.'); }
  else if (v.v === 'fornecedor') { const f = forn(v.id); t = f ? f.Empresa : 'Fornecedor'; h = `<div class="pane uno" id="pu">${vFornecedor(v.id)}</div>`; }
  else if (v.v === 'comparar') { const p = proj(v.id); t = 'Comparar · ' + (p ? p.Projeto : ''); h = `<div class="pane uno" id="pu">${vComparar(v.id)}</div>`; }
  else if (v.v === 'caderno') { t = 'Caderno'; h = vCaderno(v.sel); }
  const podeVoltar = st.stack.indexOf(v) > 0;
  render.lastBar = [t, podeVoltar]; bar(t, podeVoltar);
  // o editor do caderno não é recriado (a Pencil pode estar no meio de um traço)
  const ed = st.cad && st.cad.el && v.v === 'caderno' && st.cad.id === v.sel ? st.cad.el : null;
  if (ed) ed.remove();
  $('scr').innerHTML = `<div class="lg">${lado()}<div class="lgm">${h}</div></div>${painel}`;
  $('scr').scrollTop = 0;
  const sc = v.sc || {}; ['pl', 'pd', 'pu'].forEach((id) => { const e = $(id); if (e && sc[id]) e.scrollTop = sc[id]; });
  if (v.sel) document.querySelectorAll(`#pl [data-proj="${CSS.escape(v.sel)}"], #pl [data-prod="${CSS.escape(v.sel)}"], #pl [data-forn="${CSS.escape(v.sel)}"], #pl [data-pag="${CSS.escape(v.sel)}"]`).forEach((e) => e.classList.add('sel'));
  if (v.v === 'caderno') montaCaderno(v.sel, ed);
  else if (st.cad) st.cad = null;
  montaAnotacaoTela();
  wire();
}

/* ---------- produto (iPad) ---------- */
function vProdutoLargo(id, lado) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x) return '<div class="vazio">Produto não encontrado. Ele pode ter sido apagado.</div>';
  const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor); const v = baseLarga();
  if (!x._pend && !TENTOU.has(id)) { TENTOU.add(id); setTimeout(() => garanteFotos(id, urlsProduto(x), String(x.Registrado_Por || '').toLowerCase() !== S.email)); }
  const slots = slotsProduto(x); const i = Math.min(v.foto || 0, Math.max(0, slots.length - 1)); const s = slots[i];
  galAtual = slots.map((z) => z.full || z.th || '');
  const an = s ? anotacaoDe(id, s.k) : null; const mostra = an && !v.semAnot;
  const ps = p ? prodsDoProjeto(p.ID_Projeto) : []; const fob = num(x.FOB_USD);
  const ord = ps.filter((y) => num(y.FOB_USD) != null).sort((a, b) => num(a.FOB_USD) - num(b.FOB_USD)); const pos = ord.findIndex((y) => y.ID_Produto === id);
  const comp = ps.length > 1 && pos >= 0 ? (pos === 0 ? `<b style="color:#A5D6A7">Melhor FOB de ${ps.length}</b>` : `<b>${pos + 1}º menor FOB de ${ps.length}</b>`) : '<b>Único achado</b>';
  const favs = favoritosDe(x); const meu = favs.includes(S.email);
  const pags = paginasTodas().filter((g) => g.ID_Produto === id);
  const fld = (l, val, data) => `<div class="field" ${data || ''}><div class="l">${l}</div><div class="v ${val ? '' : 'muted'}">${val || 'Não informado'}</div></div>`;
  const foto = s ? `<button class="gimg big" data-zoom="${i}"><img id="fotoG" src="${s.full || s.th}" alt="">${mostra ? '<div class="anotov" id="anotov" data-key="' + esc(an.key) + '"></div>' : ''}${!s.full && s.url ? `<span class="gload">${navigator.onLine ? 'Carregando a foto em alta…' : 'Sem internet: mostrando a miniatura'}</span>` : ''}</button>
     <button type="button" class="pill anotar" data-go="anotar">${I.edit}${an ? 'Editar anotação' : 'Anotar foto'}</button>${an ? `<button type="button" class="pill ocultar" data-go="toganot">${mostra ? 'Ocultar anotações' : 'Mostrar anotações'}</button>` : ''}`
    : `<div class="gimg big gph">${I.img}<span>Sem foto</span></div>`;
  return `<div class="pdl ${lado ? 'lado' : ''}"><div class="pdf"><div class="pdfoto">${foto}</div>
    ${slots.length > 1 ? `<div class="strip">${slots.map((z, j) => `<button type="button" data-foto="${j}" class="${j === i ? 'on' : ''}" aria-label="Foto ${j + 1}"><img src="${z.full || z.th || ''}" alt=""></button>`).join('')}<span>Foto ${i + 1} de ${slots.length} · toque para ampliar</span></div>` : ''}</div>
   <div class="pdi">
    <div class="hero"><div class="k">${esc([x.Time, x.Subcategoria].filter(Boolean).join(' · '))}</div><div class="v">${esc(p ? p.Projeto : 'Achado livre')}</div>
     <button type="button" class="favb ${meu ? 'on' : ''}" data-fav="${esc(id)}" aria-label="${meu ? 'Tirar dos favoritos' : 'Marcar como favorito'}">${svgI(meu ? PATH.star : PATH.starO)}</button>
     <div class="g"><div><small>FOB</small><b class="num">${usd(fob)}</b></div><div><small>MOQ</small><b class="num">${x.MOQ !== '' && x.MOQ != null ? esc(x.MOQ) + ' pcs' : '<span class="todo">Não informado</span>'}</b></div>
     <div><small>Interesse</small><b>${esc(x.Interesse || 'Não informado')}</b></div><div><small>Comparado aos outros achados</small>${comp}</div></div></div>
    ${fld('Fornecedor', f ? esc(f.Empresa) + (f.Estande ? ' · Estande ' + esc(f.Estande) : '') : '', f ? `data-forn="${esc(f.ID_Fornecedor)}" role="button"` : '')}
    ${fld('Anotações', esc(x.Anotacoes))}
    ${favs.length ? fld('Favorito de', esc(favs.map(nomeDe).join(', '))) : ''}
    <div class="field"><div class="l">Caderno</div>${pags.map((g) => `<button type="button" class="pgmini" data-pag="${esc(g.ID_Pagina)}">${g.thumb ? `<img src="${g.thumb}" alt="">` : '<span class="folhinha"></span>'}<span><b>${esc(tituloPag(g))}</b><small>${esc(nomeDe(g.Registrado_Por))}${g.Criada_Em ? ' · ' + esc(quando(g.Criada_Em)) : ''}</small></span></button>`).join('')}
     <button type="button" class="lnk" data-go="novapagprod">+ Abrir uma página do caderno para este produto</button></div>
    ${fld('Registrado por', x._pend ? 'Você · aguardando envio' : esc(nomeDe(x.Registrado_Por)) + (x.Data_Hora ? ' · ' + esc(quando(x.Data_Hora)) : ''))}
    ${acoes('prod', x)}
    ${p ? `<button class="addp out" data-proj="${esc(p.ID_Projeto)}">Ver projeto na buylist</button>` : ''}<div style="height:20px"></div>
   </div></div>`;
}
// desenho por cima da foto (só leitura), alinhado à área real da imagem
async function montaAnotacaoTela() {
  const box = $('anotov'); const im = $('fotoG'); if (!box || !im) return;
  const key = box.dataset.key; const v = baseLarga(); const id = v.v === 'produto' ? v.id : v.sel;
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x) return;
  const s = slotsProduto(x)[Math.min(v.foto || 0, 99)]; const an = s && anotacaoDe(id, s.k); if (!an) return;
  const texto = an.json || await pegaJson('anot:' + an.key, an.url); const d = texto && Lousa.ler(texto);
  if (!d || !document.body.contains(box)) return;
  const posiciona = () => {
    const W = im.clientWidth, H = im.clientHeight; if (!W || !im.naturalWidth) return;
    const r = Math.min(W / im.naturalWidth, H / im.naturalHeight); const w = im.naturalWidth * r, h = im.naturalHeight * r;
    Object.assign(box.style, { left: (W - w) / 2 + 'px', top: (H - h) / 2 + 'px', width: w + 'px', height: h + 'px' });
  };
  if (im.complete) posiciona(); else im.addEventListener('load', posiciona, { once: true });
  new ResizeObserver(posiciona).observe(im);
  box.innerHTML = ''; Lousa.cria(box, { w: d.w, h: d.h, dados: d, editavel: false });
}
async function compoe(src, d) {
  const im = await loadImg(src); const W = Math.min(2000, im.naturalWidth); const H = Math.round(im.naturalHeight * W / im.naturalWidth);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
  Lousa.pinta(x, d, W / d.w, {}); return c.toDataURL('image/jpeg', 0.88);
}

/* ---------- anotar a foto com a Pencil ---------- */
let anotEl = null;
async function abreAnotar() {
  const v = baseLarga(); const id = v.v === 'produto' ? v.id : v.sel; if (ocupado(id)) return;
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x) return;
  const s = slotsProduto(x)[Math.min(v.foto || 0, 99)]; if (!s) return;
  if (!s.full) return toast(navigator.onLine ? 'Aguarde a foto em alta carregar e toque de novo.' : 'Sem internet: a foto em alta ainda não está no iPad. Abra o produto com internet uma vez.');
  const an = anotacaoDe(id, s.k); let d = null;
  if (an) { const t = an.json || await pegaJson('anot:' + an.key, an.url); d = t && Lousa.ler(t); if (!d) return toast('Não consegui abrir a anotação. Tente com internet.'); }
  const im = await loadImg(s.full); const W = 1000, H = Math.round(1000 * im.naturalHeight / im.naturalWidth);
  const cores = ['#E53935', '#262422', '#1E5BD8', '#FFFFFF']; const larg = [2.5, 5, 9];
  anotEl = document.createElement('div'); anotEl.className = 'anot';
  anotEl.innerHTML = `<header><button type="button" class="txt" data-a="cancelar">Cancelar</button><div class="ferr">
    <button type="button" class="tl on" data-t="pen" aria-label="Caneta">${I.edit}</button><button type="button" class="tl" data-t="hl" aria-label="Marca-texto">${svgI(PATH.hl)}</button><button type="button" class="tl" data-t="er" aria-label="Borracha">${svgI(PATH.er)}</button><i></i>
    ${cores.map((c, j) => `<button type="button" class="cl ${j ? '' : 'on'}" data-c="${c}" style="background:${c}" aria-label="Cor ${j + 1}"></button>`).join('')}<i></i>
    ${larg.map((w, j) => `<button type="button" class="tl ${j === 1 ? 'on' : ''}" data-w="${w}" aria-label="Espessura ${j + 1}"><span style="width:${6 + j * 6}px;height:${6 + j * 6}px"></span></button>`).join('')}<i></i>
    <button type="button" class="tl" data-a="undo" aria-label="Desfazer">${svgI(PATH.undo)}</button><button type="button" class="tl" data-a="redo" aria-label="Refazer">${svgI(PATH.redo)}</button></div>
    <button type="button" class="ok" data-a="ok">Concluir</button></header>
   <div class="palco"><div class="quadro"><img alt="" src="${s.full}"><div class="tela"></div></div></div>
   <footer>${Lousa.temPen() ? 'Só a Pencil desenha. Com dois dedos você amplia e move a foto.' : 'Desenhe com a Pencil ou com o dedo. Quando a Pencil for usada, o dedo passa a só ampliar e mover a foto.'}</footer>`;
  document.body.appendChild(anotEl);
  const palco = anotEl.querySelector('.palco'), quadro = anotEl.querySelector('.quadro');
  const enc = () => { const mw = palco.clientWidth - 40, mh = palco.clientHeight - 40; const r = Math.min(mw / W, mh / H); quadro.style.width = W * r + 'px'; quadro.style.height = H * r + 'px'; L && L.ajusta(); };
  let L = null; enc();
  L = Lousa.cria(anotEl.querySelector('.tela'), { w: W, h: H, dados: d, editavel: true, ferramenta: { t: 'pen', c: cores[0], w: larg[1] }, aoPen: () => { anotEl.querySelector('footer').textContent = 'Só a Pencil desenha. Com dois dedos você amplia e move a foto.'; } });
  window.addEventListener('resize', enc);
  // dois dedos ampliam e movem (quando a Pencil está em uso)
  let z = 1, tx = 0, ty = 0, g = null;
  const aplica = () => { quadro.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; };
  const dist = (a) => Math.hypot(a[0].clientX - a[1].clientX, a[0].clientY - a[1].clientY);
  const meio = (a) => [(a[0].clientX + a[1].clientX) / 2, (a[0].clientY + a[1].clientY) / 2];
  const dedos = (e) => [...e.touches].filter((t) => t.touchType !== 'stylus');
  palco.addEventListener('touchstart', (e) => { const f = dedos(e); if (!Lousa.temPen() || f.length !== 2) return; e.preventDefault(); g = { d: dist(f), m: meio(f), z, tx, ty }; }, { passive: false });
  palco.addEventListener('touchmove', (e) => { const f = dedos(e); if (!g || f.length !== 2) return; e.preventDefault(); const m = meio(f); z = Math.min(4, Math.max(1, g.z * dist(f) / g.d)); tx = g.tx + m[0] - g.m[0]; ty = g.ty + m[1] - g.m[1]; if (z === 1) { tx = 0; ty = 0; } aplica(); }, { passive: false });
  palco.addEventListener('touchend', () => { g = null; });
  const fecha = () => { window.removeEventListener('resize', enc); anotEl.remove(); anotEl = null; render(); };
  anotEl.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { L.ferramenta.t = b.dataset.t; anotEl.querySelectorAll('[data-t]').forEach((y) => y.classList.toggle('on', y === b)); }
    else if (b.dataset.c) { L.ferramenta.c = b.dataset.c; if (L.ferramenta.t === 'er') { L.ferramenta.t = 'pen'; anotEl.querySelectorAll('[data-t]').forEach((y) => y.classList.toggle('on', y.dataset.t === 'pen')); } anotEl.querySelectorAll('[data-c]').forEach((y) => y.classList.toggle('on', y === b)); }
    else if (b.dataset.w) { L.ferramenta.w = +b.dataset.w; anotEl.querySelectorAll('[data-w]').forEach((y) => y.classList.toggle('on', y === b)); }
    else if (b.dataset.a === 'undo') L.desfazer();
    else if (b.dataset.a === 'redo') L.refazer();
    else if (b.dataset.a === 'cancelar') { if (!L.mudou || await confirmar('Sair sem salvar?', 'O que você desenhou agora será descartado.', 'Descartar')) fecha(); }
    else if (b.dataset.a === 'ok') {
      if (!L.mudou) return fecha();
      const json = L.vazio() ? '' : L.json(); const key = id + '_' + (s.k + 1);
      const imagem = json ? await compoe(s.full, L.dados) : '';
      S.outbox = S.outbox.filter((o) => !(o.kind === 'anot' && o.payload.ID_Produto === id && +o.payload.Foto === s.k + 1 && emEnvio !== id));
      S.outbox.push({ kind: 'anot', id: uid('OP'), ref: id, payload: { ID_Produto: id, Foto: s.k + 1, json, imagem } });
      if (json) await guardaJson('anot:' + key, '', json); else await apagaJson('anot:' + key);
      await saveOutbox(); fecha();
      toast(json ? (navigator.onLine ? 'Anotação salva. Enviando…' : 'Anotação salva no iPad. Envia quando voltar a internet.') : 'Anotação apagada.'); sync();
    }
  });
}

/* ---------- favoritos ---------- */
async function alternaFav(id) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x || ocupado(id)) return;
  const favs = favoritosDe(x); const on = !favs.includes(S.email);
  const novo = (on ? favs.concat(S.email) : favs.filter((e) => e !== S.email)).join(', ');
  const pend = S.outbox.find((o) => o.kind === 'prod' && o.id === id);
  if (pend) pend.payload.Favoritos = novo; else { const y = S.produtos.find((p) => p.ID_Produto === id); if (y) y.Favoritos = novo; }
  S.outbox = S.outbox.filter((o) => !(o.kind === 'fav' && o.ref === id));
  S.outbox.push({ kind: 'fav', id: uid('OP'), ref: id, payload: { on } });
  await Promise.all([saveOutbox(), saveCore()]); render(); sync();
}

/* ---------- comparar achados ---------- */
function vComparar(pid) {
  const p = proj(pid); if (!p) return '<div class="vazio">Projeto não encontrado.</div>';
  const im = projImg(p); const ps = prodsDoProjeto(pid).slice().sort((a, b) => (num(a.FOB_USD) ?? 9e9) - (num(b.FOB_USD) ?? 9e9));
  const pags = paginasTodas();
  const ref = `<div class="cd ref">${im ? `<img class="cimg" src="${im}" alt="Referência da buylist">` : `<div class="cimg gph">${I.img}</div>`}<div class="bd">
    <div class="k2">REFERÊNCIA BUYLIST</div><div class="v2">${esc(p.Projeto)}</div>
    <div><small>FOB alvo</small>${p.FOB_Alvo ? `<b>${esc(p.FOB_Alvo)}</b>` : '<i>A preencher</i>'}</div><div><small>MOQ alvo</small>${p.MOQ_Alvo !== '' && p.MOQ_Alvo != null ? `<b>${esc(p.MOQ_Alvo)}</b>` : '<i>A preencher</i>'}</div>
    <div><small>CMV 12M</small><b>${num(p.CMV_12M) ? brl(num(p.CMV_12M)) : 'Sem dado'}</b></div><div><small>SKUs</small><b>${p.SKUs !== '' && p.SKUs != null ? esc(p.SKUs) : 'Sem dado'}</b></div></div></div>`;
  const cards = ps.map((x, i) => { const f = forn(x.ID_Fornecedor); const favs = favoritosDe(x); const meu = favs.includes(S.email); const n = pags.filter((g) => g.ID_Produto === x.ID_Produto).length;
    const c = FOTOS[x.ID_Produto]; const src = (x._pend && x.fotos && x.fotos[0]) || (c && c.f && c.f.find(Boolean)) || x.thumb;
    return `<div class="cd ${meu ? 'meu' : ''}"><div class="cph">${src ? `<img class="cimg" src="${src}" alt="">` : `<div class="cimg gph">${I.img}</div>`}${i === 0 && ps.length > 1 && num(x.FOB_USD) != null ? '<span class="tag">Melhor FOB</span>' : ''}
      <button type="button" class="favb ${meu ? 'on' : ''}" data-fav="${esc(x.ID_Produto)}" aria-label="${meu ? 'Tirar dos favoritos' : 'Marcar como favorito'}">${svgI(meu ? PATH.star : PATH.starO)}</button></div>
     <button type="button" class="bd" data-prod="${esc(x.ID_Produto)}"><div class="v2">${esc(f ? f.Empresa : 'Fornecedor')}</div>
      <div class="dup"><div><small>FOB</small><b class="${i === 0 && ps.length > 1 ? 'bom' : ''}">${usd(num(x.FOB_USD)) || '·'}</b></div><div><small>MOQ</small><b>${x.MOQ !== '' && x.MOQ != null ? esc(x.MOQ) : '·'}</b></div></div>
      <div><small>Interesse</small><b>${esc(x.Interesse || 'Não informado')}</b></div>
      ${x.Anotacoes ? `<p>${esc(x.Anotacoes)}</p>` : ''}
      <small>${n ? n + ' página' + (n > 1 ? 's' : '') + ' no caderno' : 'Sem página no caderno'}</small>
      ${favs.length ? `<small class="fv">Favorito de ${esc(favs.map(nomeDe).join(', '))}</small>` : ''}</button></div>`; }).join('');
  return `<div class="cmp">${ref}${cards || '<div class="vazio">Nenhum produto achado ainda.</div>'}</div>`;
}

/* ---------- caderno do estande ---------- */
function vCaderno(sel) {
  const gs = paginasTodas(); const grupos = {};
  gs.forEach((g) => { const d = String(g.Criada_Em || g.Data_Hora || '').slice(0, 10); (grupos[d] = grupos[d] || []).push(g); });
  const dia = (d) => { const m = d.match(/(\d{4})-(\d\d)-(\d\d)/); if (!m) return 'Sem data'; const dt = new Date(+m[1], m[2] - 1, +m[3]); return dt.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '') + ', ' + m[3] + '/' + m[2]; };
  const lista = `<button type="button" class="addp" data-go="novapag">Nova página</button>${Object.keys(grupos).sort().reverse().map((d) => `<div class="ghead">${esc(dia(d))}<span>${grupos[d].length}</span></div>${grupos[d].map((g) => { const f = forn(g.ID_Fornecedor); const x = g.ID_Produto && todosProdutos().find((p) => p.ID_Produto === g.ID_Produto); const pp = x && proj(x.ID_Projeto);
    return `<button type="button" class="row pgrow" data-pag="${esc(g.ID_Pagina)}">${g.thumb ? `<img class="th pg" src="${g.thumb}" alt="">` : '<span class="th pg folhinha"></span>'}<div class="t"><div class="t1">${esc(tituloPag(g))}</div><div class="t2">${esc(f ? (f.Estande ? 'Estande ' + f.Estande : f.Empresa) : 'Sem fornecedor')}</div><div class="t2">${pp ? 'Ligada a ' + esc(pp.Projeto) : x ? 'Ligada a um achado livre' : 'Só no caderno'}${g._pend ? ' · na fila' : ''}</div></div></button>`; }).join('')}`).join('') || '<div class="empty">Nenhuma página ainda. Toque em Nova página para escrever e desenhar com a Pencil.</div>'}`;
  const g = sel && gs.find((y) => y.ID_Pagina === sel);
  let det = '<div class="vazio">Escolha uma página ou crie uma nova.</div>';
  if (g) {
    const f = forn(g.ID_Fornecedor); const cores = ['#1E3A8A', '#262422', '#E53935', '#2E7D32']; const fe = (st.cad && st.cad.fer) || { t: 'pen', c: cores[0], w: 3 };
    det = `<div class="cbar">
      ${[['pen', I.edit, 'Caneta'], ['hl', svgI(PATH.hl), 'Marca-texto'], ['er', svgI(PATH.er), 'Borracha'], ['move', svgI(PATH.move), 'Mover e redimensionar fotos']].map(([t, ic, l]) => `<button type="button" class="tb ${fe.t === t ? 'on' : ''}" data-cad="t:${t}" aria-label="${l}">${ic}</button>`).join('')}<i></i>
      ${cores.map((c) => `<button type="button" class="dot ${fe.c === c ? 'on' : ''}" data-cad="c:${c}" style="background:${c}" aria-label="Cor"></button>`).join('')}<i></i>
      ${[2, 3, 6].map((w, j) => `<button type="button" class="tb ${fe.w === w ? 'on' : ''}" data-cad="w:${w}" aria-label="Espessura ${j + 1}"><span class="esp" style="width:${5 + j * 5}px;height:${5 + j * 5}px"></span></button>`).join('')}<i></i>
      <label class="tb" aria-label="Colar foto da câmera">${I.cam}<input type="file" accept="image/*" capture="environment" id="cadFoto" hidden></label>
      <button type="button" class="tb" data-cad="undo" aria-label="Desfazer">${svgI(PATH.undo)}</button><button type="button" class="tb" data-cad="redo" aria-label="Refazer">${svgI(PATH.redo)}</button>
</div>
     <div class="folhawrap" id="pd"><div class="fmeta"><button type="button" class="ligar" data-go="ligarpag">${svgI(PATH.link)}Título e ligação</button>
      ${podeApagar(Object.assign({}, g, { _pend: g._pend && !S.paginas.some((y) => y.ID_Pagina === g.ID_Pagina) })) ? `<button type="button" class="ligar cinza" data-go="delpag">${I.del}Apagar página</button>` : ''}</div><div class="folha"><div class="fcab"><span>${esc(tituloPag(g))}${f && f.Estande ? ' · Estande ' + esc(f.Estande) : ''}</span><span>${esc(nomeDe(g.Registrado_Por))}${g.Criada_Em ? ' · ' + esc(quando(g.Criada_Em)) : ''}</span></div><div id="cadEd"></div></div></div>`;
  }
  return `<div class="pane lista estreita" id="pl">${lista}</div><div class="pane det cad">${det}</div>`;
}
let salvaT = null;
async function montaCaderno(sel, existente) {
  const holder = $('cadEd'); if (!holder) return;
  if (existente) { holder.replaceWith(existente); return; }
  const g = paginasTodas().find((y) => y.ID_Pagina === sel); if (!g) return;
  holder.innerHTML = '<div class="vazio">Abrindo a página…</div>';
  const pend = S.outbox.filter((o) => o.kind === 'pag' && o.ref === sel).pop();
  const texto = (pend && pend.payload.json) || await pegaJson('pag:' + sel, g.Tracos);
  if (!document.body.contains(holder) || baseLarga().sel !== sel) return;
  if (texto == null && g.Tracos) { holder.innerHTML = `<div class="vazio">${navigator.onLine ? 'Não consegui abrir a página. Toque em sincronizar e tente de novo.' : 'Esta página abre quando houver internet.'}</div>`; return; }
  const d = texto ? Lousa.ler(texto) : null;
  holder.innerHTML = '';
  const el = document.createElement('div'); el.className = 'ed'; holder.appendChild(el);
  const fer = (st.cad && st.cad.fer) || { t: 'pen', c: '#1E3A8A', w: 3 };
  const L = Lousa.cria(el, { w: 1000, h: 1414, dados: d, editavel: true, ferramenta: Object.assign({}, fer), aoMudar: () => { clearTimeout(salvaT); salvaT = setTimeout(() => salvaPagina(sel), 2000); } });
  st.cad = { id: sel, L, el: holder, fer: L.ferramenta };
}
function salvaPaginaJa() { if (salvaT && st.cad) { clearTimeout(salvaT); salvaT = null; salvaPagina(st.cad.id); } }
async function salvaPagina(id, meta) {
  salvaT = null;
  const g = paginasTodas().find((y) => y.ID_Pagina === id); if (!g) return;
  const L = st.cad && st.cad.id === id ? st.cad.L : null;
  const pend = S.outbox.filter((o) => o.kind === 'pag' && o.ref === id && emEnvio !== id).pop();
  let json = L ? L.json() : (pend && pend.payload.json) || ((await jsonLocal('pag:' + id)) || {}).t || '';
  let imagem = '', thumb = g.thumb || '';
  if (L) { imagem = Lousa.exporta(L.dados, 900, { pontos: true }, 0.82); thumb = Lousa.exporta(L.dados, 160, { pontos: true }, 0.7); L.mudou = false; }
  else if (!json && !pend) json = '';
  const payload = Object.assign({ ID_Pagina: id, Titulo: g.Titulo || '', ID_Fornecedor: g.ID_Fornecedor || '', ID_Produto: g.ID_Produto || '', Criada_Em: g.Criada_Em || agoraSP() }, meta || {});
  if (json) payload.json = json; if (imagem) payload.imagem = imagem; if (thumb) payload.thumb = thumb;
  if (pend) { if (!payload.imagem && pend.payload.imagem) payload.imagem = pend.payload.imagem; pend.payload = payload; }
  else S.outbox.push({ kind: 'pag', id: uid('OP'), ref: id, payload });
  if (json) await guardaJson('pag:' + id, '', json);
  await saveOutbox(); refreshBar();
  const lbl = document.querySelector(`#pl [data-pag="${CSS.escape(id)}"] img`); if (lbl && thumb) lbl.src = thumb;
  clearTimeout(salvaPagina.t); salvaPagina.t = setTimeout(() => sync(), 4000);
}
function novaPagina(meta) {
  const id = uid('PG'); const payload = Object.assign({ ID_Pagina: id, Titulo: '', ID_Fornecedor: '', ID_Produto: '', Criada_Em: agoraSP() }, meta || {});
  S.outbox.push({ kind: 'pag', id: uid('OP'), ref: id, payload }); saveOutbox();
  st.cad = null; st.stack = [{ v: 'caderno', sel: id }]; render();
}
async function apagarPagina(id) {
  const g = paginasTodas().find((y) => y.ID_Pagina === id); if (!g || ocupado(id)) return;
  const noServidor = S.paginas.some((y) => y.ID_Pagina === id);
  if (noServidor && !podeApagar(g)) return toast('Só quem criou a página pode apagar.');
  if (!(await confirmar('Apagar página?', 'A página sai do caderno de todos. Não dá para desfazer.', 'Apagar'))) return;
  clearTimeout(salvaT); salvaT = null; st.cad = null;
  S.outbox = S.outbox.filter((o) => o.ref !== id);
  if (noServidor) { S.paginas = S.paginas.filter((y) => y.ID_Pagina !== id); S.outbox.push({ kind: 'dpag', id: uid('OP'), ref: id }); await saveCore(); }
  await saveOutbox(); apagaJson('pag:' + id);
  cur().sel = null; render(); toast('Página apagada.'); sync();
}
function ligarPagina(id) {
  const g = paginasTodas().find((y) => y.ID_Pagina === id); if (!g) return;
  const el = document.createElement('div'); el.className = 'dd conf ligar';
  let fo = g.ID_Fornecedor || '', pr = g.ID_Produto || '', q = '';
  const desenha = () => {
    const fs = todosFornecedores().filter((f) => String(f.Empresa).toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(a.Empresa).localeCompare(String(b.Empresa)));
    const ps = todosProdutos().filter((x) => !fo || x.ID_Fornecedor === fo);
    el.querySelector('.fl').innerHTML = `<button type="button" class="op ${!fo ? 'on' : ''}" data-fo="">Nenhum fornecedor</button>` + fs.map((f) => `<button type="button" class="op ${fo === f.ID_Fornecedor ? 'on' : ''}" data-fo="${esc(f.ID_Fornecedor)}">${esc(f.Empresa)}${f.Estande ? `<small>Estande ${esc(f.Estande)}</small>` : ''}</button>`).join('');
    el.querySelector('.pl').innerHTML = `<button type="button" class="op ${!pr ? 'on' : ''}" data-pr="">Nenhum produto</button>` + ps.map((x) => { const p = proj(x.ID_Projeto); return `<button type="button" class="op ${pr === x.ID_Produto ? 'on' : ''}" data-pr="${esc(x.ID_Produto)}">${esc(p ? p.Projeto : 'Achado livre · ' + (x.Subcategoria || ''))}<small>${usd(num(x.FOB_USD))}${forn(x.ID_Fornecedor) ? ' · ' + esc(forn(x.ID_Fornecedor).Empresa) : ''}</small></button>`; }).join('');
  };
  el.innerHTML = `<div class="box"><div class="h">Título e ligação da página</div>
    <div class="lg2"><label class="lb2" for="lgT">Título</label><input id="lgT" value="${esc(g.Titulo || '')}" placeholder="${esc(tituloPag(Object.assign({}, g, { Titulo: '' })))}">
    <div class="cols"><div><span class="lb2">Fornecedor</span><input id="lgQ" placeholder="Buscar fornecedor" autocomplete="off"><div class="fl"></div></div><div><span class="lb2">Produto</span><div class="pl"></div></div></div></div>
    <div class="cb"><button type="button" data-r="0">Cancelar</button><button type="button" data-r="1">Salvar</button></div></div>`;
  document.body.appendChild(el); desenha();
  el.querySelector('#lgQ').oninput = (e) => { q = e.target.value; desenha(); };
  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (e.target === el || (b && b.dataset.r === '0')) { el.remove(); return; }
    if (!b) return;
    if (b.dataset.fo !== undefined) { fo = b.dataset.fo; const x = todosProdutos().find((y) => y.ID_Produto === pr); if (x && fo && x.ID_Fornecedor !== fo) pr = ''; desenha(); }
    else if (b.dataset.pr !== undefined) { pr = b.dataset.pr; const x = todosProdutos().find((y) => y.ID_Produto === pr); if (x && x.ID_Fornecedor) fo = x.ID_Fornecedor; desenha(); }
    else if (b.dataset.r === '1') { const Titulo = el.querySelector('#lgT').value.trim(); el.remove(); salvaPagina(id, { Titulo, ID_Fornecedor: fo, ID_Produto: pr }).then(() => render()); }
  };
}
function cadAcao(a) {
  const c = st.cad; if (!c || !c.L) return;
  const [k, val] = a.split(':');
  if (k === 't') { c.L.ferramenta.t = val; c.L.sel = -1; c.L.redesenha(); }
  else if (k === 'c') { c.L.ferramenta.c = val; if (c.L.ferramenta.t === 'er' || c.L.ferramenta.t === 'move') c.L.ferramenta.t = 'pen'; }
  else if (k === 'w') c.L.ferramenta.w = +val;
  else if (k === 'undo') return c.L.desfazer();
  else if (k === 'redo') return c.L.refazer();
  const f = c.L.ferramenta;
  document.querySelectorAll('[data-cad]').forEach((b) => { const [kk, vv] = b.dataset.cad.split(':'); if (kk === 't') b.classList.toggle('on', f.t === vv); if (kk === 'c') b.classList.toggle('on', f.c === vv); if (kk === 'w') b.classList.toggle('on', f.w === +vv); });
}

/* ================= render ================= */
function render(scroll) {
  if (LARGO()) return renderLargo();
  $('app').classList.remove('largo'); st.cad = null;
  const v = cur(); const tabOf = { home: 'home', time: 'home', projeto: 'home', produtos: 'produtos', produto: 'produtos', forn: 'forn', fornecedor: 'forn' };
  let h = '', t = 'Canton Fair 2026', b = st.stack.length > 1;
  if (v.v === 'home') h = vHome();
  else if (v.v === 'time') { t = v.time; h = vTime(v.time); }
  else if (v.v === 'projeto') { const p = proj(v.id); t = p ? p.Projeto : 'Projeto'; h = vProjeto(v.id); }
  else if (v.v === 'produtos') { t = 'Produtos'; h = vProdutos(); }
  else if (v.v === 'produto') { t = 'Produto'; h = vProduto(v.id); }
  else if (v.v === 'forn') { t = 'Fornecedores'; h = vFornecedores(); }
  else if (v.v === 'fornecedor') { const f = forn(v.id); t = f ? f.Empresa : 'Fornecedor'; h = vFornecedor(v.id); }
  else if (v.v === 'form') { t = st.form.edit ? 'Editar produto' : st.form.fixed ? 'Novo produto' : 'Produto livre'; h = vForm(); }
  else if (v.v === 'novoforn') { t = st.ns.edit ? 'Editar fornecedor' : 'Novo fornecedor'; h = vNovoForn(); }
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
    try { const full = await compress(file, 1400, 0.74); st.form.ph[k] = full; st.form.th[k] = await reduz(full, 320, 0.7); st.form.tem[k] = true; st.form.mud[k] = true; render($('scr').scrollTop); }
    catch (err) { toast('Não consegui ler a foto. Tente de novo.'); }
  });
  const cf = $('cadFoto'); if (cf) cf.onchange = async (e) => {
    const file = e.target.files[0]; if (!file || !st.cad) return;
    try { const u = await compress(file, 1000, 0.72); const im = await loadImg(u); st.cad.L.colaImagem(u, im.naturalWidth, im.naturalHeight); cadAcao('t:move'); }
    catch (err) { toast('Não consegui ler a foto. Tente de novo.'); }
  };
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
let emEnvio = null; // id do registro que está subindo agora
const ocupado = (id) => { if (emEnvio === id) { toast('Este registro está sendo enviado agora. Tente de novo em alguns segundos.'); return true; } return false; };
function camposForm(f) {
  return { ID_Projeto: f.proj || '', ID_Fornecedor: f.forn, Time: f.time, Subcategoria: f.sub, FOB_USD: num(f.fob), MOQ: num(f.moq) == null ? '' : num(f.moq), Interesse: f.int || '', Anotacoes: f.nota.trim() };
}
function validaForm(f) {
  if (!f.fixed && !f.time) return 'Escolha o time.';
  if (!f.fixed && !f.sub) return 'Escolha a subcategoria.';
  if (!f.forn) return 'Escolha ou crie o fornecedor.';
  if (num(f.fob) == null) return 'Preencha o FOB em dólar.';
  return '';
}
async function salvarProduto() {
  keep(); const f = st.form; const erro = validaForm(f); if (erro) return toast(erro);
  if (f.edit) return salvarEdicaoProduto();
  const fotos = f.ph.filter(Boolean); const thumbs = f.th.filter(Boolean);
  const p = Object.assign({ ID_Produto: uid('PR') }, camposForm(f), { fotos, thumb: thumbs[0] || '', Data_Hora: new Date().toISOString() });
  S.outbox.push({ kind: 'prod', id: p.ID_Produto, payload: p }); S.lastSup = f.forn;
  await saveOutbox(); kvSet('lastSup', S.lastSup);
  st.form = null; st.stack.pop();
  render(cur().scroll || 0);
  toast(navigator.onLine ? 'Produto salvo. Enviando…' : 'Produto salvo no celular. Envia sozinho quando voltar a internet.');
  sync();
}
async function abreEdicaoProduto(id) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x || ocupado(id)) return;
  const ph = ['', '', '', ''], th = ['', '', '', ''], tem = [false, false, false, false];
  if (x._pend) { for (let k = 0; k < 4; k++) if (x.fotos && x.fotos[k]) { ph[k] = x.fotos[k]; th[k] = await reduz(ph[k], 320, 0.7); tem[k] = true; } }
  else {
    const c = await fotosLocais(id); const us = urlsProduto(x);
    for (let k = 0; k < 4; k++) { const full = c && c.f[k]; tem[k] = !!(us[k] || full); if (full) th[k] = await reduz(full, 320, 0.7); }
    if (!tem.some(Boolean) && x.thumb) tem[0] = true;
    const j = tem.indexOf(true); if (j >= 0 && !th[j] && x.thumb) th[j] = x.thumb;
  }
  st.form = { edit: id, pend: !!x._pend, fixed: false, proj: x.ID_Projeto || null, time: x.Time || null, sub: x.Subcategoria || null, forn: x.ID_Fornecedor || null,
    fob: x.FOB_USD === '' || x.FOB_USD == null ? '' : String(x.FOB_USD).replace('.', ','), moq: x.MOQ === '' || x.MOQ == null ? '' : String(x.MOQ), int: x.Interesse || null, nota: String(x.Anotacoes || ''), ph, th, tem, mud: [], j0: tem.indexOf(true) };
  go({ v: 'form' });
}
async function salvarEdicaoProduto() {
  const f = st.form; const id = f.edit; if (ocupado(id)) return;
  const campos = camposForm(f);
  const pend = S.outbox.find((o) => o.kind === 'prod' && o.id === id);
  if (pend) {
    Object.assign(pend.payload, campos, { fotos: f.ph.filter(Boolean), thumb: f.th.filter(Boolean)[0] || '' });
  } else {
    const x = S.produtos.find((p) => p.ID_Produto === id); if (!x) { toast('Este produto foi apagado.'); return; }
    const novas = {}; f.mud.forEach((m, k) => { if (m) novas[k + 1] = f.ph[k] || ''; });
    const payload = Object.assign({ ID_Produto: id }, campos, { novasFotos: novas });
    if (Object.keys(novas).length) {
      const j = [0, 1, 2, 3].find((k) => f.th[k] || f.tem[k]);
      if (j == null || j !== f.j0 || f.mud[j]) { const nt = j == null ? '' : (f.th[j] || x.thumb || ''); payload.thumb = nt; x.thumb = nt; }
      const c = (await fotosLocais(id)) || { u: [], f: [] };
      Object.keys(novas).forEach((k) => { c.f[k - 1] = novas[k]; c.u[k - 1] = ''; x['Foto_' + k] = novas[k] ? (x['Foto_' + k] || 'novo') : '';
        if (anotacaoDe(id, k - 1)) S.outbox.push({ kind: 'anot', id: uid('OP'), ref: id, payload: { ID_Produto: id, Foto: +k, json: '' } }); });
      await guardaFotos(id, c, false);
    }
    Object.assign(x, campos);
    S.outbox.push({ kind: 'eprod', id: uid('OP'), ref: id, payload }); await saveCore();
  }
  S.lastSup = f.forn; kvSet('lastSup', S.lastSup); await saveOutbox();
  st.form = null; st.stack.pop(); render(cur().scroll || 0);
  toast(navigator.onLine ? 'Alterações salvas. Enviando…' : 'Alterações salvas no celular. Envia sozinho quando voltar a internet.');
  sync();
}
async function apagarProduto(id) {
  const x = todosProdutos().find((p) => p.ID_Produto === id); if (!x || ocupado(id)) return;
  if (!podeApagar(x)) return toast('Só quem registrou o produto pode apagar.');
  if (!(await confirmar('Apagar produto?', 'O registro e as fotos saem da planilha e do app de todos. Não dá para desfazer.', 'Apagar'))) return;
  if (emEnvio === id) return toast('Este registro está sendo enviado agora. Tente de novo em alguns segundos.');
  const eraPend = S.outbox.some((o) => o.kind === 'prod' && o.id === id);
  S.outbox = S.outbox.filter((o) => o.id !== id && o.ref !== id);
  if (!eraPend) { S.produtos = S.produtos.filter((p) => p.ID_Produto !== id); S.outbox.push({ kind: 'dprod', id: uid('OP'), ref: id }); await saveCore(); }
  await saveOutbox(); apagaFotos(id);
  if (cur().sel === id) { cur().sel = null; render(); } else back();
  toast('Produto apagado.'); sync();
}
async function salvarFornecedor() {
  keep(); const n = st.ns;
  if (!n.n.trim() && !n.card && !n.th) return toast('Fotografe o cartão ou informe a empresa.');
  const campos = { Empresa: n.n.trim() || 'Novo fornecedor (ver cartão)', Contato: n.ct.trim(), Email: n.em.trim(), Telefone_WeChat: n.ph.trim(), Estande: n.st.trim() };
  if (n.edit) {
    const id = n.edit; if (ocupado(id)) return;
    const pend = S.outbox.find((o) => o.kind === 'forn' && o.id === id);
    if (pend) { Object.assign(pend.payload, campos); if (n.card) Object.assign(pend.payload, { cartao: n.card, thumb: n.th }); }
    else {
      const f = S.fornecedores.find((x) => x.ID_Fornecedor === id); if (!f) return toast('Este fornecedor foi apagado.');
      const payload = Object.assign({ ID_Fornecedor: id }, campos);
      if (n.card) { payload.cartao = n.card; payload.thumb = n.th; f.thumb = n.th; await guardaFotos(id, { u: [''], f: [n.card] }, false); }
      Object.assign(f, campos); S.outbox.push({ kind: 'eforn', id: uid('OP'), ref: id, payload }); await saveCore();
    }
    await saveOutbox(); st.ns = null; st.stack.pop(); render(cur().scroll || 0);
    toast(navigator.onLine ? 'Alterações salvas. Enviando…' : 'Alterações salvas no celular. Envia sozinho quando voltar a internet.');
    return sync();
  }
  const igual = n.n.trim() && !n.confirmado ? fornecedorIgual(n.n) : null;
  if (igual) {
    const r = await escolha('Fornecedor já existe', `${igual.Empresa}${igual.Estande ? ' · estande ' + igual.Estande : ''}${igual.Registrado_Por ? ' · cadastrado por ' + nomeDe(igual.Registrado_Por) : ''}`, 'Cadastrar outro', 'Usar este');
    if (r === 'b') { st.ns = null; st.stack.pop(); if (st.form) st.form.forn = igual.ID_Fornecedor; S.lastSup = igual.ID_Fornecedor; kvSet('lastSup', S.lastSup); render(cur().scroll || 0); return; }
    if (r !== 'a') return;
    n.confirmado = true;
  }
  const fo = Object.assign({ ID_Fornecedor: uid('FO') }, campos, { cartao: n.card || '', thumb: n.th || '' });
  S.outbox.push({ kind: 'forn', id: fo.ID_Fornecedor, payload: fo }); // na sincronização, fornecedores novos sobem antes dos produtos
  await saveOutbox();
  st.ns = null; st.stack.pop();
  if (st.form) st.form.forn = fo.ID_Fornecedor; S.lastSup = fo.ID_Fornecedor; kvSet('lastSup', S.lastSup);
  render(cur().scroll || 0); sync();
}
async function abreEdicaoFornecedor(id) {
  const f = forn(id); if (!f || ocupado(id)) return;
  let th = f.thumb || '';
  if (!f._pend) { const c = await fotosLocais(id); if (c && c.f[0]) th = await reduz(c.f[0], 720, 0.75); }
  st.ns = { edit: id, card: null, th, n: f.Empresa || '', ct: f.Contato || '', em: f.Email || '', ph: f.Telefone_WeChat || '', st: f.Estande || '' };
  go({ v: 'novoforn' });
}
async function apagarFornecedor(id) {
  const f = forn(id); if (!f || ocupado(id)) return;
  if (!podeApagar(f)) return toast('Só quem cadastrou o fornecedor pode apagar.');
  const n = todosProdutos().filter((p) => p.ID_Fornecedor === id).length;
  if (n) return confirmar('Não dá para apagar ainda', `Este fornecedor tem ${n} produto${n > 1 ? 's' : ''}. Troque o fornecedor desse${n > 1 ? 's' : ''} produto${n > 1 ? 's' : ''} ou apague-o${n > 1 ? 's' : ''} antes.`, '');
  if (!(await confirmar('Apagar fornecedor?', 'O cadastro e a foto do cartão saem da planilha e do app de todos. Não dá para desfazer.', 'Apagar'))) return;
  if (emEnvio === id) return toast('Este registro está sendo enviado agora. Tente de novo em alguns segundos.');
  const eraPend = S.outbox.some((o) => o.kind === 'forn' && o.id === id);
  S.outbox = S.outbox.filter((o) => o.id !== id && o.ref !== id);
  if (!eraPend) { S.fornecedores = S.fornecedores.filter((x) => x.ID_Fornecedor !== id); S.outbox.push({ kind: 'dforn', id: uid('OP'), ref: id }); await saveCore(); }
  if (S.lastSup === id) { S.lastSup = null; kvSet('lastSup', null); }
  await saveOutbox(); apagaFotos(id);
  if (cur().sel === id) { cur().sel = null; render(); } else back();
  toast('Fornecedor apagado.'); sync();
}

/* ================= confirmação e foto ampliada ================= */
// nomes de empresa comparados sem pontuação, acentos e termos como Co., Ltd., Factory
const normEmp = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(co|ltd|limited|company|corp|corporation|inc|factory|trading|industrial|industry|group|manufacturing|mfg|international|intl|import|export|imp|exp)\b/g, '').replace(/[^a-z0-9]/g, '');
function fornecedorIgual(nome) {
  const n = normEmp(nome); if (n.length < 3) return null;
  return todosFornecedores().find((f) => { const m = normEmp(f.Empresa); return m && (m === n || (Math.min(m.length, n.length) >= 5 && (m.includes(n) || n.includes(m)))); }) || null;
}
// janela com duas escolhas: devolve 'a', 'b' ou null (fechou)
function escolha(titulo, texto, a, b) {
  return new Promise((res) => {
    const el = document.createElement('div'); el.className = 'dd conf';
    el.innerHTML = `<div class="box"><div class="h">${esc(titulo)}</div><p>${esc(texto)}</p><div class="cb"><button type="button" data-r="a">${esc(a)}</button><button type="button" data-r="b" class="danger">${esc(b)}</button></div></div>`;
    el.onclick = (e) => { const bt = e.target.closest('[data-r]'); if (bt || e.target === el) { el.remove(); res(bt ? bt.dataset.r : null); } };
    document.body.appendChild(el);
  });
}
function confirmar(titulo, texto, botao) {
  return new Promise((res) => {
    const el = document.createElement('div'); el.className = 'dd conf';
    el.innerHTML = `<div class="box"><div class="h">${esc(titulo)}</div><p>${esc(texto)}</p><div class="cb">${botao ? `<button type="button" data-r="0">Cancelar</button><button type="button" data-r="1" class="danger">${esc(botao)}</button>` : '<button type="button" data-r="0">Entendi</button>'}</div></div>`;
    el.onclick = (e) => { const b = e.target.closest('[data-r]'); if (b || e.target === el) { el.remove(); res(!!b && b.dataset.r === '1'); } };
    document.body.appendChild(el);
  });
}
let lb = null;
function fechaLb() { if (lb) { lb.remove(); lb = null; render($('scr').scrollTop); } }
function abreLb(imgs, i) {
  if (!imgs.length) return;
  lb = document.createElement('div'); lb.className = 'lb';
  lb.innerHTML = `<div class="lbs"><img alt=""></div><button type="button" class="lbx" aria-label="Fechar">${I.x}</button>
   ${imgs.length > 1 ? `<button type="button" class="lbp" aria-label="Anterior">${I.back}</button><button type="button" class="lbp nx" aria-label="Próxima">${I.back}</button><div class="lbn"></div>` : ''}
   <div class="lbh">Pinça ou toque duas vezes para ampliar</div>`;
  const box = lb.querySelector('.lbs'), img = lb.querySelector('img'), n = lb.querySelector('.lbn');
  let idx = i, s = 1, tx = 0, ty = 0, d0 = 0, s0 = 1, p0 = null, moved = false, lastTap = 0;
  const apply = (anim) => { img.style.transition = anim ? 'transform .2s' : 'none'; img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; };
  const show = (k) => { idx = (k + imgs.length) % imgs.length; img.src = imgs[idx]; s = 1; tx = 0; ty = 0; apply(false); if (n) n.textContent = `${idx + 1} de ${imgs.length}`; };
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const zoomToggle = () => { if (s > 1) { s = 1; tx = 0; ty = 0; } else s = 2.5; apply(true); };
  box.addEventListener('touchstart', (e) => { e.preventDefault(); moved = false;
    if (e.touches.length === 2) { d0 = dist(e.touches); s0 = s; p0 = null; } else p0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx, ty }; }, { passive: false });
  box.addEventListener('touchmove', (e) => { e.preventDefault(); moved = true;
    if (e.touches.length === 2 && d0) { s = Math.min(5, Math.max(1, s0 * dist(e.touches) / d0)); apply(false); }
    else if (p0) { const dx = e.touches[0].clientX - p0.x, dy = e.touches[0].clientY - p0.y; tx = p0.tx + dx; ty = s > 1 ? p0.ty + dy : 0; apply(false); } }, { passive: false });
  box.addEventListener('touchend', (e) => {
    if (e.touches.length) { if (e.touches.length === 1) p0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx, ty }; d0 = 0; return; }
    if (s <= 1.03) { s = 1; if (Math.abs(tx) > 60 && imgs.length > 1) { show(idx + (tx < 0 ? 1 : -1)); return; } tx = 0; ty = 0; apply(true); }
    if (!moved) { const now = Date.now(); if (now - lastTap < 320) { zoomToggle(); lastTap = 0; } else lastTap = now; }
    p0 = null;
  });
  box.addEventListener('dblclick', zoomToggle);
  lb.querySelector('.lbx').onclick = fechaLb;
  lb.querySelectorAll('.lbp').forEach((b) => b.onclick = () => show(idx + (b.classList.contains('nx') ? 1 : -1)));
  document.body.appendChild(lb); show(i);
}

/* ================= sincronização ================= */
const ACAO = { forn: 'salvarFornecedor', prod: 'salvarProduto', eprod: 'editarProduto', dprod: 'excluirProduto', eforn: 'editarFornecedor', dforn: 'excluirFornecedor',
  pag: 'salvarPagina', dpag: 'excluirPagina', anot: 'salvarAnotacao', fav: 'favorito' };
const ORDEM = { forn: 0, prod: 1 };
function corpo(item) {
  if (item.kind === 'forn' || item.kind === 'eforn') return { f: item.payload };
  if (item.kind === 'prod' || item.kind === 'eprod') return { p: item.payload };
  if (item.kind === 'pag') return { g: item.payload };
  if (item.kind === 'anot') return { a: item.payload };
  if (item.kind === 'fav') return { id: item.ref, on: item.payload.on };
  return { id: item.ref };
}
async function aplicaRetorno(item, r) {
  const k = item.kind;
  if (k === 'pag' && r.linha) {
    const i = S.paginas.findIndex((g) => g.ID_Pagina === item.ref); const o = Object.assign({}, r.linha, { thumb: item.payload.thumb || (i >= 0 ? S.paginas[i].thumb : '') });
    if (i >= 0) S.paginas[i] = o; else S.paginas.push(o);
    const c = await jsonLocal('pag:' + item.ref); if (c) await guardaJson('pag:' + item.ref, o.Tracos, c.t);
    return;
  }
  if (k === 'anot') {
    const id = item.payload.ID_Produto + '_' + item.payload.Foto; S.anotacoes = S.anotacoes.filter((a) => a.ID_Anotacao !== id);
    if (r.linha) { S.anotacoes.push(r.linha); const c = await jsonLocal('anot:' + id); if (c) await guardaJson('anot:' + id, r.linha.Tracos, c.t); }
    return;
  }
  if (k === 'fav') { const x = S.produtos.find((p) => p.ID_Produto === item.ref); if (x) x.Favoritos = r.favoritos; return; }
  if (k === 'forn' || k === 'prod') {
    const leve = Object.assign({}, item.payload); delete leve.fotos; delete leve.cartao; leve.Registrado_Por = S.email;
    if (k === 'forn') { S.fornecedores.push(leve); if (item.payload.cartao) await guardaFotos(item.id, { u: [''], f: [item.payload.cartao] }, false); }
    else { S.produtos.push(leve); const fs = item.payload.fotos || []; if (fs.length) await guardaFotos(item.id, { u: [], f: fs.slice(0, 4) }, false); }
  } else if (k === 'eprod' || k === 'eforn') {
    const lista = k === 'eprod' ? S.produtos : S.fornecedores; const key = k === 'eprod' ? 'ID_Produto' : 'ID_Fornecedor';
    const x = lista.find((o) => o[key] === item.ref);
    if (x && r.linha) { const th = x.thumb; Object.assign(x, r.linha); x.thumb = th; }
    const c = FOTOS[item.ref];
    if (c && r.linha) {
      if (k === 'eprod') Object.keys(item.payload.novasFotos || {}).forEach((n) => { c.u[n - 1] = r.linha['Foto_' + n] || ''; });
      else if (item.payload.cartao) c.u[0] = r.linha.Foto_Cartao || '';
      await guardaFotos(item.ref, c, false);
    }
  }
}
async function sync(manual, completo) {
  if (syncing || !S.token) return;
  if (!navigator.onLine) { if (manual) toast(S.outbox.length ? `Sem internet. ${S.outbox.length} registro${S.outbox.length > 1 ? 's' : ''} guardado${S.outbox.length > 1 ? 's' : ''} no celular; envia sozinho quando a conexão voltar.` : 'Sem internet no momento.'); refreshBar(); return; }
  syncing = true; refreshBar(); let mudou = false, erroRede = false; const avisos = [];
  try {
    const fila = S.outbox.slice().sort((a, b) => (ORDEM[a.kind] ?? 2) - (ORDEM[b.kind] ?? 2));
    for (const item of fila) {
      if (!S.outbox.includes(item)) continue; // apagado enquanto a fila andava
      emEnvio = item.ref || item.id;
      try {
        const r = await api(ACAO[item.kind], corpo(item));
        S.outbox = S.outbox.filter((o) => o !== item); await saveOutbox();
        await aplicaRetorno(item, r); mudou = true;
      } catch (e) {
        if (e instanceof LoginErr) throw e;
        if (!e.servidor) { erroRede = true; break; }
        if (item.kind === 'forn' || item.kind === 'prod' || item.kind === 'pag') item.erro = e.message; // segue com os próximos
        else { S.outbox = S.outbox.filter((o) => o !== item); await saveOutbox(); avisos.push(e.message); completo = true; mudou = true; }
      } finally { emEnvio = null; }
    }
    if (!erroRede) {
      const r = await api('dados', { desde: completo ? '' : S.agora });
      const merge = (lista, novos, key) => { novos.forEach((n) => { const i = lista.findIndex((x) => x[key] === n[key]); if (i >= 0) lista[i] = Object.assign(lista[i], n); else lista.push(n); }); };
      if (completo) {
        // lista inteira do servidor: o que foi apagado na planilha some do celular
        S.produtos = r.produtos; S.fornecedores = r.fornecedores;
        if (r.projetos && r.projetos.length) { S.projetos = r.projetos; S.times = r.times; await Promise.all([kvSet('projetos', S.projetos), kvSet('times', S.times)]); }
        mudou = true;
      } else {
        const ap = r.apagados || { produtos: [], fornecedores: [] };
        if (r.produtos.length || r.fornecedores.length || ap.produtos.length || ap.fornecedores.length) mudou = true;
        merge(S.produtos, r.produtos, 'ID_Produto'); merge(S.fornecedores, r.fornecedores, 'ID_Fornecedor');
        if (ap.produtos.length) S.produtos = S.produtos.filter((x) => !ap.produtos.includes(x.ID_Produto));
        if (ap.fornecedores.length) S.fornecedores = S.fornecedores.filter((x) => !ap.fornecedores.includes(x.ID_Fornecedor));
      }
      if (r.paginas) S.paginas = r.paginas;
      if (r.anotacoes) S.anotacoes = r.anotacoes;
      S.agora = r.agora; await saveCore();
      if (!S.img || !S.img.app || !S.img.app.capa) { try { await baixaImagens(); mudou = true; } catch (e) {} }
    }
  } catch (e) {
    if (e instanceof LoginErr) { S.token = null; await kvSet('token', null); mostraLogin('Sua sessão expirou. Entre de novo: os registros guardados no celular não se perdem.'); }
  } finally {
    syncing = false;
    const v = cur().v;
    if (avisos.length) toast(avisos[0]);
    if (mudou && v !== 'form' && v !== 'novoforn' && !lb) render($('scr').scrollTop); else refreshBar();
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
        loginEl.innerHTML = `<div class="k">WESTWING · GUANGZHOU</div><div class="rule"></div><h1>Canton Fair</h1><div class="y">2026</div>
         <p><b>Preparando o roteiro…</b><br>Baixando os projetos e as fotos da buylist para o app funcionar sem internet. Leva alguns segundos e só acontece no primeiro acesso.</p>`;
        await inicia(); if (loginEl) { loginEl.remove(); loginEl = null; }
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
      S.projetos = r.projetos; S.times = r.times; S.produtos = r.produtos; S.fornecedores = r.fornecedores; S.agora = r.agora; S.paginas = r.paginas || []; S.anotacoes = r.anotacoes || [];
      await Promise.all([kvSet('projetos', S.projetos), kvSet('times', S.times), saveCore()]);
      try { await baixaImagens(); } catch (e) {}
    } catch (e) {
      if (e instanceof LoginErr) { S.token = null; await kvSet('token', null); return mostraLogin(); }
      $('scr').innerHTML = '<div class="load"><b>Sem conexão</b>O primeiro acesso precisa de internet para baixar o roteiro. Conecte e toque em sincronizar.</div>';
      return;
    }
    $('nav').classList.remove('hidden');
  }
  render(0); sync(false, true);
}

/* ================= eventos ================= */
let toastT;
function toast(m) { document.querySelectorAll('.toast').forEach((t) => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3200); }

document.addEventListener('click', (e) => {
  let el;
  if ((el = e.target.closest('#app [data-tab]'))) { tab(el.dataset.tab); return; }
  if (!e.target.closest('#app')) return;
  if ((el = e.target.closest('[data-ltime]'))) { st.stack = [{ v: 'time', time: el.dataset.ltime }]; st.q = ''; render(); return; }
  if ((el = e.target.closest('[data-cad]'))) { cadAcao(el.dataset.cad); return; }
  if ((el = e.target.closest('[data-fav]'))) { alternaFav(el.dataset.fav); return; }
  if ((el = e.target.closest('[data-foto]'))) { const v = baseLarga(); v.foto = +el.dataset.foto; render(); return; }
  if ((el = e.target.closest('[data-pag]'))) { const id = el.dataset.pag; if (cur().v === 'caderno') selec(id); else { st.stack = [{ v: 'caderno', sel: id }]; render(); } return; }
  if ((el = e.target.closest('[data-pick]'))) { keep(); st.form.forn = el.dataset.pick; st.dd = false; st.ddq = ''; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-ftime]'))) { keep(); const f = st.form; if (f.time !== el.dataset.ftime) { f.time = el.dataset.ftime; f.sub = null; f.proj = null; } render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fsub]'))) { keep(); st.form.sub = el.dataset.fsub; st.form.proj = null; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fproj]'))) { keep(); st.form.proj = el.dataset.fproj || null; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-fint]'))) { keep(); st.form.int = st.form.int === el.dataset.fint ? null : el.dataset.fint; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-time]'))) { if (LARGO()) { st.stack = [{ v: 'time', time: el.dataset.time }]; render(); } else go({ v: 'time', time: el.dataset.time }); return; }
  if ((el = e.target.closest('[data-proj]'))) { const id = el.dataset.proj;
    if (LARGO()) { const p = proj(id); if (cur().v === 'time' && p && p.Time === cur().time) selec(id); else if (p) go({ v: 'time', time: p.Time, sel: id }); return; }
    go({ v: 'projeto', id }); return; }
  if ((el = e.target.closest('[data-rm]'))) { keep(); const k = +el.dataset.rm; const f = st.form; f.ph[k] = ''; f.th[k] = ''; f.tem[k] = false; f.mud[k] = true; render($('scr').scrollTop); return; }
  if ((el = e.target.closest('[data-zoom]'))) {
    const imgs = galAtual.filter(Boolean); const i = galAtual.slice(0, +el.dataset.zoom).filter(Boolean).length;
    if ($('anotov') && LARGO()) { // desenho visível: a foto ampliada já vem com a anotação
      const v = baseLarga(); const id = v.v === 'produto' ? v.id : v.sel; const x = todosProdutos().find((p) => p.ID_Produto === id); const sl = x && slotsProduto(x)[+el.dataset.zoom]; const an = sl && anotacaoDe(id, sl.k);
      if (an && imgs[i]) { (async () => { const t = an.json || await pegaJson('anot:' + an.key, an.url); const d = t && Lousa.ler(t); if (d) { try { imgs[i] = await compoe(imgs[i], d); } catch (er) {} } abreLb(imgs, i); })(); return; } }
    abreLb(imgs, i); return; }
  if ((el = e.target.closest('[data-prod]'))) { const id = el.dataset.prod; TENTOU.delete(id); if (LARGO() && cur().v === 'produtos') selec(id); else go({ v: 'produto', id }); return; }
  if ((el = e.target.closest('[data-forn]'))) { const id = el.dataset.forn; TENTOU.delete(id); if (LARGO() && cur().v === 'forn') selec(id); else go({ v: 'fornecedor', id }); return; }
  if (!(el = e.target.closest('[data-go]'))) return;
  const a = el.dataset.go;
  if (a === 'ddclose') { if (e.target === el) { st.dd = false; st.ddq = ''; render($('scr').scrollTop); } return; }
  if (a === 'back') { if (cur().v === 'form') { st.form = null; st.dd = false; } if (cur().v === 'novoforn') st.ns = null; back(); return; }
  if (a === 'sync') { sync(true, true); return; }
  if (a === 'editprod') { abreEdicaoProduto(alvo()); return; }
  if (a === 'delprod') { apagarProduto(alvo()); return; }
  if (a === 'editforn') { abreEdicaoFornecedor(alvo()); return; }
  if (a === 'delforn') { apagarFornecedor(alvo()); return; }
  if (a === 'novo') { const v = cur(); novoForm(null, v.v === 'time' ? v.time : null); return; }
  if (a === 'novoproj') { novoForm(alvo()); return; }
  if (a === 'comparar') { go({ v: 'comparar', id: alvo() }); return; }
  if (a === 'anotar') { abreAnotar(); return; }
  if (a === 'toganot') { const v = baseLarga(); v.semAnot = !v.semAnot; render(); return; }
  if (a === 'novapag') { novaPagina(); return; }
  if (a === 'novapagprod') { const x = todosProdutos().find((p) => p.ID_Produto === alvo()); if (x) { const p = proj(x.ID_Projeto); novaPagina({ ID_Produto: x.ID_Produto, ID_Fornecedor: x.ID_Fornecedor || '', Titulo: p ? p.Projeto : 'Achado livre' }); } return; }
  if (a === 'novapagforn') { const f = forn(alvo()); if (f) novaPagina({ ID_Fornecedor: f.ID_Fornecedor, Titulo: f.Empresa }); return; }
  if (a === 'ligarpag') { salvaPaginaJa(); ligarPagina(cur().sel); return; }
  if (a === 'delpag') { apagarPagina(cur().sel); return; }
  if (a === 'dd') { keep(); st.dd = true; st.ddq = ''; render($('scr').scrollTop); return; }
  if (a === 'novoforn') { keep(); st.dd = false; st.ns = { card: null, th: null, n: st.ddq || '', ct: '', em: '', ph: '', st: '' }; st.ddq = ''; go({ v: 'novoforn' }); return; }
  if (a === 'salvar') { salvarProduto(); return; }
  if (a === 'salvarforn') { salvarFornecedor(); return; }
});
window.addEventListener('online', () => { refreshBar(); sync(); });
let eraLargo = null;
window.addEventListener('resize', () => { const l = LARGO(); if (eraLargo !== null && l !== eraLargo && S.token && S.projetos.length && !loginEl) render(); eraLargo = l; });
window.addEventListener('offline', refreshBar);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
setInterval(() => sync(), 30000);

/* ================= partida ================= */
(async function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  db = await openDB();
  const ks = ['token', 'email', 'projetos', 'times', 'produtos', 'fornecedores', 'paginas', 'anotacoes', 'outbox', 'img', 'agora', 'lastSup'];
  const vs = await Promise.all(ks.map(kvGet));
  ks.forEach((k, i) => { if (vs[i] !== undefined && vs[i] !== null) S[k] = vs[i]; });
  S.outbox = S.outbox || [];
  if (!S.token) { bar('Canton Fair 2026', false); mostraLogin(); return; }
  inicia();
})();
})();
