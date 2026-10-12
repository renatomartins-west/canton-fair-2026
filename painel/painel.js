/* Canton Fair 26 · Painel web (computador)
   Mesmos dados e mesmo login do app. Lê tudo da ponte e grava interesse, destaque, notas do time e correções. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
const usd = (v) => v == null || v === '' ? '' : 'US$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = (v) => !v ? 'Sem dado' : v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
const n0 = (v) => Number(v).toLocaleString('pt-BR');
const uid = (p) => p + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const nomeDe = (e) => String(e || '').split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
const iniciais = (e) => nomeDe(e).split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('');
const pl = (n, s, p) => n + ' ' + (n === 1 ? s : (p || s + 's'));
const hora = (s) => { const m = String(s || '').match(/T(\d\d):(\d\d)/); return m ? m[1] + ':' + m[2] : ''; };
const diaDe = (s) => String(s || '').slice(0, 10);
const quando = (s) => { const m = String(s || '').match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)/); return m ? `${m[3]}/${m[2]} às ${m[4]}:${m[5]}` : ''; };
const nomeDia = (d) => { const m = d.match(/(\d{4})-(\d\d)-(\d\d)/); if (!m) return d; const dt = new Date(+m[1], m[2] - 1, +m[3]); const w = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); return w.charAt(0).toUpperCase() + w.slice(1) + ' ' + m[3] + '/' + m[2]; };
const nomeDiaLongo = (d) => { const m = d.match(/(\d{4})-(\d\d)-(\d\d)/); if (!m) return d; const dt = new Date(+m[1], m[2] - 1, +m[3]); const w = dt.toLocaleDateString('pt-BR', { weekday: 'long' }); return w.charAt(0).toUpperCase() + w.slice(1) + ', ' + m[3] + '/' + m[2]; };
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#C4161E" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
const STARO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#B5ADA4" d="m22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>';
const CHEV = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6E6862" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const XIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#262422" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/* ---------------- armazenamento (o mesmo do app: o login vale para os dois) ---------------- */
let db;
const openDB = () => new Promise((res, rej) => { const r = indexedDB.open('cf26app', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const kvGet = (k) => new Promise((res) => { try { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); } catch (e) { res(undefined); } });
const kvSet = (k, v) => new Promise((res) => { try { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; } catch (e) { res(); } });

/* ---------------- servidor ---------------- */
const S = { token: null, email: null, projetos: [], times: [], produtos: [], fornecedores: [], paginas: [], anotacoes: [], comentarios: [], quando: 0 };
class LoginErr extends Error {}
async function api(acao, body) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000);
  try {
    const r = await fetch(window.CF26.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ acao, token: S.token }, body || {})), signal: ctl.signal });
    const j = await r.json();
    if (!j.ok) { if (j.erro === 'LOGIN') throw new LoginErr('LOGIN'); let m = j.erro || 'erro'; if (/permiss|authoriz|https?:\/\/|Exception|TypeError/i.test(m)) m = 'O servidor do app está em manutenção. Tente de novo em alguns minutos.'; const e = new Error(m); e.servidor = true; throw e; }
    return j;
  } finally { clearTimeout(tm); }
}
let carregando = false;
async function carrega(silencioso) {
  if (carregando) return; carregando = true; $('upd').textContent = 'Atualizando…';
  try {
    const r = await api('dados', { desde: '' });
    Object.assign(S, { projetos: r.projetos || [], times: r.times || [], produtos: r.produtos || [], fornecedores: r.fornecedores || [], paginas: r.paginas || [], anotacoes: r.anotacoes || [], comentarios: r.comentarios || [], quando: Date.now() });
    if (!silencioso || !$('modal').firstChild) render(); else renderSoModal();
  } catch (e) {
    if (e instanceof LoginErr) { S.token = null; await kvSet('token', null); return login('Sua sessão expirou. Entre de novo.'); }
    toast(e.servidor ? e.message : 'Sem conexão com o servidor. Tentando de novo em instantes.');
  } finally { carregando = false; atualizado(); }
}
function atualizado() {
  if (!S.quando) return; const m = Math.floor((Date.now() - S.quando) / 60000);
  $('upd').textContent = m < 1 ? 'Atualizado agora' : 'Atualizado há ' + m + ' min';
}
setInterval(atualizado, 30000);
setInterval(() => { if (S.token && !document.hidden) carrega(true); }, 120000);

/* ---------------- dados derivados ---------------- */
const proj = (id) => S.projetos.find((p) => p.ID_Projeto === id);
const forn = (id) => S.fornecedores.find((f) => f.ID_Fornecedor === id);
const prod = (id) => S.produtos.find((p) => p.ID_Produto === id);
const timesOrd = () => S.times.slice().sort((a, b) => (a.Ordem || 0) - (b.Ordem || 0)).map((t) => t.Time);
const faixa = (p) => { const ns = String(p && p.FOB_Alvo || '').match(/\d+([.,]\d+)?/g); return ns ? ns.map(num) : null; };
const favs = (x) => String(x && x.Favoritos || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const ehDestaque = (x) => favs(x).length > 0;
const intVal = (x) => ({ Alto: 3, 'Médio': 2, Baixo: 1 })[x.Interesse] || 0;
const dots = (n) => `<span class="dots">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'f' : ''}"></i>`).join('')}</span>`;
const nf = (v) => Number.isInteger(v) ? n0(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function alvoTxt(p) { const a = faixa(p); if (!a) return ''; const mn = Math.min(...a), mx = Math.max(...a); return mn === mx ? nf(mx) : `${nf(mn)} a ${nf(mx)}`; }
// situação do FOB de um produto contra o target do projeto
function statusFob(x) {
  const p = proj(x.ID_Projeto); const a = faixa(p); const v = num(x.FOB_USD);
  if (!a || v == null) return { k: 'no', t: 'Sem target' };
  const mx = Math.max(...a); if (v <= mx) return { k: 'ok', t: 'Dentro do target' };
  return { k: 'up', t: Math.round((v / mx - 1) * 100) + '% acima do target', pct: Math.round((v / mx - 1) * 100) };
}
const prodsDe = (pid) => S.produtos.filter((x) => x.ID_Projeto === pid);
function melhorDe(pid) { return prodsDe(pid).filter((x) => num(x.FOB_USD) != null).sort((a, b) => num(a.FOB_USD) - num(b.FOB_USD))[0]; }
const notasDe = (id) => S.comentarios.filter((c) => c.ID_Produto === id).sort((a, b) => String(a.Data_Hora).localeCompare(String(b.Data_Hora)));
const pagsDe = (id) => S.paginas.filter((g) => g.ID_Produto === id);
const urls = (x) => [1, 2, 3, 4].map((k) => x['Foto_' + k] || '').map((u, k) => ({ k, u })).filter((s) => s.u);
function pendencias() {
  const out = [];
  S.produtos.forEach((x) => { const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor); const nome = (p ? p.Projeto : 'Produto fora da buylist · ' + (x.Subcategoria || x.Time || '')) + (f ? ' · ' + f.Empresa : '');
    if (!x.Foto_1 && !x.thumb) out.push({ tipo: 'Sem foto', o: 'foto', id: x.ID_Produto, nome, quem: x.Registrado_Por, dh: x.Data_Hora });
    if (x.MOQ === '' || x.MOQ == null) out.push({ tipo: 'Sem MOQ', o: 'moq', id: x.ID_Produto, nome, quem: x.Registrado_Por, dh: x.Data_Hora }); });
  S.fornecedores.forEach((f) => { const nome = f.Empresa + (f.Estande ? ' · estande ' + f.Estande : '');
    if (!f.Email && !f.Telefone_WeChat && !f.Contato) out.push({ tipo: 'Sem contato', o: 'contato', id: f.ID_Fornecedor, nome, quem: f.Registrado_Por, dh: f.Data_Hora, obs: 'Sem e-mail, telefone nem WeChat' });
    else if (!f.Email && !f.Telefone_WeChat) out.push({ tipo: 'Sem e-mail', o: 'contato', id: f.ID_Fornecedor, nome, quem: f.Registrado_Por, dh: f.Data_Hora, obs: 'Só o nome do contato' }); });
  return out;
}

/* ---------------- fotos (baixadas sob demanda e guardadas) ---------------- */
const MINI = {}, FULL = {}; const fila = []; let ativos = 0;
function pedeFoto(url, cb) {
  if (FULL[url]) return cb(FULL[url], MINI[url]);
  fila.push({ url, cb }); roda();
}
async function roda() {
  while (ativos < 3 && fila.length) {
    const { url, cb } = fila.shift(); ativos++;
    (async () => {
      try {
        if (!FULL[url]) { const r = await api('foto', { id: url }); FULL[url] = r.foto || r.texto; }
        if (!MINI[url] && FULL[url] && FULL[url].startsWith('data:image')) { MINI[url] = await reduz(FULL[url], 220); kvSet('pm:' + url, MINI[url]); }
        cb(FULL[url], MINI[url]);
      } catch (e) { cb(null, null); } finally { ativos--; roda(); }
    })();
  }
}
function reduz(src, max) { return new Promise((res) => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)); const c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.75)); }; i.onerror = () => res(null); i.src = src; }); }
// miniaturas das listas: liga as <img data-mini="url"> quando aparecem na tela
let obs = null;
function ligaMinis() {
  if (obs) obs.disconnect();
  obs = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return; const im = en.target; obs.unobserve(im); const u = im.dataset.mini;
    if (MINI[u]) { im.src = MINI[u]; return; }
    kvGet('pm:' + u).then((m) => { if (m) { MINI[u] = m; im.src = m; } else pedeFoto(u, (f, mi) => { if (mi) im.src = mi; }); });
  }), { rootMargin: '300px' });
  document.querySelectorAll('img[data-mini]').forEach((im) => obs.observe(im));
}
const imgMini = (u, fallback, cls) => `<img ${cls ? `class="${cls}"` : ''} data-mini="${esc(u)}" src="${fallback || MINI[u] || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}" alt="">`;

/* ---------------- rotas ---------------- */
const st = { r: 'visao', fTime: '', fDia: '', fQuem: '', trilha: [], abrir: null, fornSel: null, fornQ: '', fornOrd: 'proj', dia: null, pop: null, semAnot: false, foto: 0 };
function rota() { const h = location.hash.replace(/^#\/?/, '') || 'visao'; st.r = ['visao', 'cobertura', 'produtos', 'fornecedores', 'resumo'].includes(h) ? h : 'visao'; render(); window.scrollTo(0, 0); }
window.addEventListener('hashchange', rota);
function render() {
  if (!S.token) return;
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.r === st.r));
  const v = { visao: vVisao, cobertura: vCobertura, produtos: vProdutos, fornecedores: vFornecedores, resumo: vResumo }[st.r];
  $('main').innerHTML = v(); ligaMinis(); renderSoModal();
}
function renderSoModal() { if (st.pop) popup(st.pop, true); }

/* ---------------- 1. visão geral ---------------- */
function vVisao() {
  const T = timesOrd();
  const dias = [...new Set(S.produtos.map((x) => diaDe(x.Data_Hora)).filter(Boolean))].sort();
  const quem = [...new Set(S.produtos.map((x) => String(x.Registrado_Por || '').toLowerCase()).filter(Boolean))].sort();
  const ps = S.produtos.filter((x) => (!st.fTime || x.Time === st.fTime) && (!st.fDia || diaDe(x.Data_Hora) <= st.fDia) && (!st.fQuem || String(x.Registrado_Por).toLowerCase() === st.fQuem));
  const projs = S.projetos.filter((p) => !st.fTime || p.Time === st.fTime);
  const atend = new Set(ps.map((x) => x.ID_Projeto).filter((id) => proj(id)));
  const cmvT = projs.reduce((s, p) => s + (num(p.CMV_12M) || 0), 0); const cmvA = projs.filter((p) => atend.has(p.ID_Projeto)).reduce((s, p) => s + (num(p.CMV_12M) || 0), 0);
  const stt = { ok: 0, up: 0, no: 0 }; let pior = null;
  atend.forEach((pid) => { const m = ps.filter((x) => x.ID_Projeto === pid && num(x.FOB_USD) != null).sort((a, b) => num(a.FOB_USD) - num(b.FOB_USD))[0]; if (!m) { stt.no++; return; } const s = statusFob(m); stt[s.k]++; if (s.k === 'up' && (!pior || s.pct > pior.s.pct)) pior = { x: m, s }; });
  const comT = stt.ok + stt.up; const fs = new Set(ps.map((x) => x.ID_Fornecedor)); const fsDest = new Set(ps.filter(ehDestaque).map((x) => x.ID_Fornecedor));
  const hoje = dias[dias.length - 1]; const nHoje = ps.filter((x) => diaDe(x.Data_Hora) === hoje).length;
  const pend = pendencias().length;
  const barras = (st.fTime ? [st.fTime] : T).map((t) => { const pt = S.projetos.filter((p) => p.Time === t); const a = pt.filter((p) => atend.has(p.ID_Projeto)); const c = pt.reduce((s, p) => s + (num(p.CMV_12M) || 0), 0); const ca = a.reduce((s, p) => s + (num(p.CMV_12M) || 0), 0);
    const pct = pt.length ? Math.round(a.length / pt.length * 100) : 0;
    return `<div class="bar"><b style="font-weight:500">${esc(t)}</b><div class="trk" title="${a.length} de ${pt.length} projetos"><i style="width:${pct}%"></i></div><span style="font-size:13.5px"><b style="font-weight:500">${a.length} de ${pt.length}</b> · CMV ${c ? Math.round(ca / c * 100) : 0}%</span></div>`; }).join('');
  const semProd = projs.filter((p) => !atend.has(p.ID_Projeto)).sort((a, b) => (num(b.CMV_12M) || 0) - (num(a.CMV_12M) || 0)).slice(0, 5);
  const dest = ps.filter(ehDestaque).sort((a, b) => String(b.Data_Hora).localeCompare(String(a.Data_Hora))).slice(0, 3);
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(t)}</option>`;
  const tot = stt.ok + stt.up + stt.no || 1;
  return `<div class="head"><div><div class="kl">${hoje ? esc(nomeDiaLongo(hoje)) : 'Antes da feira'}</div><h1 class="ttl">Visão geral da feira</h1></div>
    <div class="chips"><button type="button" class="chip ${!st.fTime ? 'on' : ''}" data-ft="">Todos os times</button>${T.map((t) => `<button type="button" class="chip ${st.fTime === t ? 'on' : ''}" data-ft="${esc(t)}">${esc(t)}</button>`).join('')}
     <select class="sel" id="fDia" aria-label="Até o dia">${opt('', 'Todos os dias', !st.fDia)}${dias.map((d) => opt(d, 'Até ' + nomeDia(d), st.fDia === d)).join('')}</select>
     <select class="sel" id="fQuem" aria-label="Quem registrou">${opt('', 'Todas as pessoas', !st.fQuem)}${quem.map((q) => opt(q, nomeDe(q), st.fQuem === q)).join('')}</select></div></div>
   <div class="stack">
   <div class="grid6">
    <div class="card kpi"><div class="kl">Produtos coletados</div><div class="big">${ps.length}</div><div class="sub">${nHoje ? '+' + nHoje + ' no último dia' : 'nenhum ainda'}</div></div>
    <div class="card kpi"><div class="kl">Projetos atendidos</div><div class="big">${atend.size} <span>de ${projs.length}</span></div><div class="sub">${projs.length ? Math.round(atend.size / projs.length * 100) : 0}% da buylist</div></div>
    <div class="card kpi dark"><div class="kl">CMV coberto</div><div class="big">${cmvT ? Math.round(cmvA / cmvT * 100) : 0}%</div><div class="sub">${brl(cmvA)} de ${brl(cmvT)}</div></div>
    <div class="card kpi"><div class="kl">Target</div><div class="big">${stt.ok} <span>de ${comT}</span></div><div class="sub">projetos dentro do FOB Target</div></div>
    <div class="card kpi"><div class="kl">Fornecedores</div><div class="big">${fs.size}</div><div class="sub">${pl(fsDest.size, 'com produto em destaque', 'com produto em destaque')}</div></div>
    <a class="card kpi ${pend ? 'warn' : ''}" href="#/resumo" style="text-decoration:none;color:inherit"><div class="kl">Pendências</div><div class="big">${pend}</div><div class="sub">${pend ? 'corrigir à noite' : 'tudo em ordem'}</div></a>
   </div>
   <div class="g2">
    <section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="h3">Cobertura por time</h2><a href="#/cobertura" style="font-size:13.5px">Ver por subcategoria</a></div>
     <div class="sub" style="margin-bottom:18px">Projetos da buylist com pelo menos um produto coletado. Ao lado, quanto do CMV 12M do time já tem opção.</div><div style="display:flex;flex-direction:column;gap:18px">${barras}</div></section>
    <section class="card"><h2 class="h3">FOB Target</h2><div class="sub" style="margin-bottom:16px">Melhor FOB de cada projeto comparado ao FOB Target da buylist.</div>
     <div class="stk" role="img" aria-label="${stt.ok} dentro do target, ${stt.up} acima, ${stt.no} sem target">${stt.ok ? `<div style="flex:${stt.ok};background:#2E7D32"></div>` : ''}${stt.up ? `<div style="flex:${stt.up};background:#E65100"></div>` : ''}${stt.no ? `<div style="flex:${stt.no};background:#D9D3CC"></div>` : ''}${!atend.size ? '<div style="flex:1;background:#EEEAE5"></div>' : ''}</div>
     <div style="display:flex;flex-direction:column;gap:12px;margin-top:18px">
      <div class="leg"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2E7D32"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="flex:1">Dentro do target</span><b>${pl(stt.ok, 'projeto')}</b></div>
      <div class="leg"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#E65100"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg><span style="flex:1">Acima do target, negociar</span><b>${pl(stt.up, 'projeto')}</b></div>
      <div class="leg"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#D9D3CC"/><path d="M8 12h8" stroke="#6E6862" stroke-width="2.4" stroke-linecap="round"/></svg><span style="flex:1">Sem target definido</span><b>${pl(stt.no, 'projeto')}</b></div></div>
     ${pior ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid #EEEAE5;font-size:13px;color:#6E6862">Mais acima do target: <b style="color:#262422;font-weight:500">${esc(proj(pior.x.ID_Projeto).Projeto)}</b>, melhor FOB ${usd(num(pior.x.FOB_USD))} para target de US$ ${esc(alvoTxt(proj(pior.x.ID_Projeto)))} (+${pior.s.pct}%).</div>` : ''}</section>
   </div>
   <div class="g2e">
    <section class="card"><h2 class="h3">Maior CMV ainda sem produto</h2><div class="sub" style="margin-bottom:12px">Onde procurar primeiro.</div>
     <ol class="ol">${semProd.map((p, i) => `<li><span style="color:#6E6862;font-size:13px">${i + 1}</span><span><b style="font-weight:500">${esc(p.Projeto)}</b><br><small>${esc([p.Time, p.Subcategoria].join(' · '))}${p.SKUs ? ' · ' + esc(p.SKUs) + ' SKUs' : ''}</small></span><b style="font-weight:500">${num(p.CMV_12M) ? brl(num(p.CMV_12M)) : 'Sem CMV'}</b></li>`).join('') || '<li><span></span><span>Todos os projetos têm produto.</span><span></span></li>'}</ol></section>
    <section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="h3">Destaques recentes</h2><a href="#/produtos" data-a="sodest" style="font-size:13.5px">Abrir produtos</a></div><div class="sub" style="margin-bottom:14px">Produtos que alguém marcou com estrela.</div>
     ${dest.length ? `<div class="fav3">${dest.map((x) => { const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor); return `<a href="#/produtos" data-pop="${esc(x.ID_Produto)}">${x.Foto_1 ? imgMini(x.Foto_1, x.thumb) : x.thumb ? `<img src="${x.thumb}" alt="">` : '<span class="ph"></span>'}<b>${esc(p ? p.Projeto : 'Fora da buylist')}</b><small>${usd(num(x.FOB_USD))}${f ? ' · ' + esc(f.Empresa) : ''}</small><small style="color:#1F6F68;margin-top:2px">${esc(favs(x).map((e) => nomeDe(e).split(' ')[0]).join(' e '))}</small></a>`; }).join('')}</div>` : '<div class="vazio" style="padding:20px">Ninguém marcou destaque ainda.</div>'}</section>
   </div></div>`;
}

/* ---------------- 2. cobertura ---------------- */
function vCobertura() {
  const T = timesOrd(); const cont = {}; S.produtos.forEach((x) => { cont[x.ID_Projeto] = (cont[x.ID_Projeto] || 0) + 1; });
  const dest = new Set(S.produtos.filter(ehDestaque).map((x) => x.ID_Projeto));
  const cols = T.map((t) => {
    const pt = S.projetos.filter((p) => p.Time === t); const a = pt.filter((p) => cont[p.ID_Projeto]);
    const c = pt.reduce((s, p) => s + (num(p.CMV_12M) || 0), 0); const ca = a.reduce((s, p) => s + (num(p.CMV_12M) || 0), 0); const pc = c ? Math.round(ca / c * 100) : 0;
    const subs = {}; pt.forEach((p) => (subs[p.Subcategoria] = subs[p.Subcategoria] || []).push(p));
    const ord = Object.entries(subs).sort((x, y) => y[1].reduce((s, p) => s + (num(p.CMV_12M) || 0), 0) - x[1].reduce((s, p) => s + (num(p.CMV_12M) || 0), 0));
    return `<section class="col" aria-label="${esc(t)}"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:19px;font-weight:500">${esc(t)}</b><span style="font-size:13px;color:#6E6862">${a.length} de ${pt.length} · CMV ${pc}%</span></div>
      <div style="height:6px;background:#EEEAE5;border-radius:3px;overflow:hidden"><div style="width:${pc}%;height:100%;background:#2A8A80"></div></div>
      ${ord.map(([s, ps]) => `<div class="sc"><span>${esc(s)}</span><span>${ps.filter((p) => cont[p.ID_Projeto]).length} de ${ps.length}</span></div>${ps.sort((x, y) => (num(y.CMV_12M) || 0) - (num(x.CMV_12M) || 0)).map((p) => {
        const n = cont[p.ID_Projeto] || 0; const cmv = num(p.CMV_12M) || 0;
        const cls = dest.has(p.ID_Projeto) ? 'esc' : n ? 'ok' : cmv >= 150000 ? 'top' : '';
        const r = dest.has(p.ID_Projeto) ? 'Destaque' : n ? pl(n, 'produto') : cmv >= 150000 ? brl(cmv) : '';
        return `<button type="button" class="tl ${cls}" data-cproj="${esc(p.ID_Projeto)}"><span>${esc(p.Projeto)}</span><small>${esc(r)}</small></button>`; }).join('')}`).join('')}</section>`; }).join('');
  return `<div class="head"><div><div class="kl">${S.projetos.length} projetos · buylist e control chart 2027</div><h1 class="ttl">Cobertura da buylist</h1></div>
    <div class="lgd"><span><i style="border:1px solid #E6E1DA;background:#fff"></i>Sem produto</span><span><i style="background:#DDF3F0;border:1px solid #BDE7E1"></i>Com produto</span><span><i style="background:#1F6F68"></i>Com destaque</span><span><i style="border:1px solid #E6E1DA;box-shadow:inset 3px 0 0 #E65100"></i>CMV alto sem produto</span></div></div>
   <div class="cob">${cols}</div>`;
}

/* ---------------- 3. produtos (trilha + linhas) ---------------- */
const CHAVES = { time: 'Time', sub: 'Subcategoria', proj: 'Projeto', forn: 'Fornecedor', int: 'Interesse', dest: 'Destaque', target: 'FOB Target', quem: 'Quem registrou' };
function valorDe(k, x) {
  if (k === 'time') return x.Time; if (k === 'sub') return x.Subcategoria; if (k === 'proj') return x.ID_Projeto || '__livre';
  if (k === 'forn') return x.ID_Fornecedor; if (k === 'int') return x.Interesse || 'Sem interesse'; if (k === 'dest') return ehDestaque(x) ? 'sim' : 'nao';
  if (k === 'target') return statusFob(x).k; if (k === 'quem') return String(x.Registrado_Por || '').toLowerCase();
}
function rotulo(k, v) {
  if (k === 'proj') return v === '__livre' ? 'Fora da buylist' : (proj(v) || {}).Projeto || v; if (k === 'forn') return (forn(v) || {}).Empresa || 'Sem fornecedor';
  if (k === 'dest') return v === 'sim' ? 'Só destaques' : 'Sem destaque'; if (k === 'target') return { ok: 'Dentro do target', up: 'Acima do target', no: 'Sem target' }[v];
  if (k === 'quem') return nomeDe(v); return v;
}
function filtrados(ate) { const t = st.trilha.slice(0, ate == null ? st.trilha.length : ate); return S.produtos.filter((x) => t.every((s) => s.v == null || valorDe(s.k, x) === s.v)); }
function ordemProdutos(ps) {
  const T = timesOrd(); const g = {};
  ps.forEach((x) => { const key = x.ID_Projeto && proj(x.ID_Projeto) ? x.ID_Projeto : '__livre:' + (x.Time || '') + ':' + (x.Subcategoria || ''); (g[key] = g[key] || []).push(x); });
  return Object.entries(g).sort((a, b) => { const pa = proj(a[0]), pb = proj(b[0]); const ta = T.indexOf(a[1][0].Time), tb = T.indexOf(b[1][0].Time); if (ta !== tb) return ta - tb; return (num(pb && pb.CMV_12M) || 0) - (num(pa && pa.CMV_12M) || 0); })
    .map(([k, xs]) => [k, xs.sort((a, b) => (num(a.FOB_USD) ?? 9e9) - (num(b.FOB_USD) ?? 9e9))]);
}
function vProdutos() {
  const ps = filtrados(); const grupos = ordemProdutos(ps); st.lista = grupos.flatMap((g) => g[1].map((x) => x.ID_Produto));
  const passos = st.trilha.map((s, i) => `<span class="sep" aria-hidden="true">›</span><span class="stp ${s.v != null ? 'on' : ''}"><button type="button" data-tstep="${i}" style="border:none;background:none;padding:0;color:inherit;display:flex;gap:8px;align-items:center">${esc(CHAVES[s.k])}${s.v != null ? ` <small>${esc(rotulo(s.k, s.v))}</small>` : ''}</button><button type="button" class="x" data-trm="${i}" aria-label="Tirar este filtro">×</button></span>`).join('');
  // linha de opções: escolhendo o valor do último passo, ou o próximo filtro
  const ult = st.trilha[st.trilha.length - 1]; let opts = '';
  const ed = st.editando != null ? st.editando : (ult && ult.v == null ? st.trilha.length - 1 : null);
  if (ed != null) {
    const s = st.trilha[ed]; const base = filtrados(ed); const cnt = {}; base.forEach((x) => { const v = valorDe(s.k, x); cnt[v] = (cnt[v] || 0) + 1; });
    let vals = Object.keys(cnt); if (s.k === 'time') vals = timesOrd().filter((t) => cnt[t]); else if (s.k === 'int') vals = ['Alto', 'Médio', 'Baixo', 'Sem interesse'].filter((v) => cnt[v]); else vals.sort((a, b) => rotulo(s.k, a).localeCompare(rotulo(s.k, b)));
    const lbl = { time: 'o time', sub: 'a subcategoria', proj: 'o projeto', forn: 'o fornecedor', int: 'o interesse', target: 'a situação do FOB', quem: 'quem registrou', dest: 'o destaque' }[s.k];
    opts = `<div class="opts"><span class="lb">Escolha ${lbl}:</span>${vals.map((v) => `<button type="button" class="opt" data-tval="${esc(v)}">${esc(rotulo(s.k, v))} · ${cnt[v]}</button>`).join('') || '<span class="lb">Nada para escolher com os filtros atuais.</span>'}</div>`;
  } else {
    const usados = new Set(st.trilha.map((s) => s.k)); const ks = Object.keys(CHAVES).filter((k) => !usados.has(k));
    opts = ks.length ? `<div class="opts"><span class="lb">${st.trilha.length ? 'Filtrar também por:' : 'Filtrar por:'}</span>${ks.map((k) => `<button type="button" class="opt" data-tkey="${k}">${k === 'dest' ? 'Só destaques' : esc(CHAVES[k])}</button>`).join('')}</div>` : '';
  }
  const linhas = grupos.map(([k, xs]) => { const p = proj(k); const tit = p ? p.Projeto : 'Fora da buylist · ' + (xs[0].Subcategoria || xs[0].Time || '');
    return `<div class="gh"><b>${esc(tit)}</b><span>${esc(p ? p.Subcategoria : xs[0].Time || '')} · ${pl(xs.length, 'produto')}</span></div>${xs.map(linhaProduto).join('')}`; }).join('');
  return `<div class="head"><div><div class="kl">${pl(S.produtos.length, 'produto coletado', 'produtos coletados')}</div><h1 class="ttl">Produtos</h1></div><span style="font-size:13.5px;color:#6E6862">Mostrando <b style="color:#262422;font-weight:500">${pl(ps.length, 'produto')}</b></span></div>
   <section class="card trail" aria-label="Filtro em trilha"><div class="trl"><button type="button" class="stp base" data-a="tlimpa">Todos os produtos</button>${passos}${!ult || ult.v != null ? `<span class="sep" aria-hidden="true">›</span><button type="button" class="stp nx" data-a="tmais">+ Filtro</button>` : ''}${st.trilha.length ? '<button type="button" data-a="tlimpa" style="margin-left:auto;border:none;background:none;color:#1F6F68;text-decoration:underline;font-size:13.5px">Limpar</button>' : ''}</div>${opts}</section>
   ${ps.length ? `<section class="lista" aria-label="Lista de produtos"><div class="lhd"><span></span><span>Produto e fornecedor</span><span>FOB</span><span>Interesse</span><span style="text-align:right">Fotos</span><span></span></div>${linhas}</section>` : '<div class="card vazio">Nenhum produto com esses filtros.</div>'}`;
}
function linhaProduto(x) {
  const f = forn(x.ID_Fornecedor); const s = statusFob(x); const n = notasDe(x.ID_Produto).length; const g = pagsDe(x.ID_Produto).length; const d = ehDestaque(x);
  const fotos = urls(x); const meta = [x.MOQ !== '' && x.MOQ != null ? 'MOQ ' + n0(x.MOQ) : 'MOQ não informado', n ? pl(n, 'nota do time', 'notas do time') : 'sem notas', g ? pl(g, 'página no caderno', 'páginas no caderno') : ''].filter(Boolean).join(' · ');
  return `<div class="row" data-pop="${esc(x.ID_Produto)}" role="button" tabindex="0">
    <button type="button" class="star" data-fav="${esc(x.ID_Produto)}" aria-label="${d ? 'Tirar destaque' : 'Marcar destaque'}">${d ? STAR : STARO}</button>
    <span><span class="nm">${esc(f ? f.Empresa : 'Sem fornecedor')}</span><span class="mt">${esc(meta)}</span></span>
    <span><span class="fob">${usd(num(x.FOB_USD)) || 'Sem FOB'}</span><br><span class="tg ${s.k}">${esc(s.t)}</span></span>
    <span style="font-size:13.5px">${esc(x.Interesse || 'Sem interesse')}${dots(intVal(x))}</span>
    <span class="fs">${fotos.length ? fotos.map((z, i) => imgMini(z.u, i === 0 ? x.thumb : '')).join('') : (x.thumb ? `<img src="${x.thumb}" alt="">` : '<span class="ph"></span>')}</span>${CHEV}</div>`;
}

/* ---------------- popup do produto ---------------- */
function popup(id, refaz) {
  const x = prod(id); if (!x) { fechaModal(); return; }
  if (!refaz) { st.foto = 0; st.semAnot = false; }
  st.pop = id; const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor); const s = statusFob(x); const d = favs(x); const meu = d.includes(S.email);
  const fotos = urls(x); const i = Math.min(st.foto, Math.max(0, fotos.length - 1)); const z = fotos[i];
  const an = z && S.anotacoes.find((a) => a.ID_Produto === id && +a.Foto === z.k + 1);
  // a lista do popup é congelada ao abrir: mudar o interesse não tira o produto da navegação
  if (!(st.popLista || []).includes(id)) st.popLista = (st.lista || []).includes(id) ? st.lista.slice() : [id];
  const lista = st.popLista; const pos = lista.indexOf(id);
  const outros = p ? prodsDe(p.ID_Projeto).filter((y) => y.ID_Produto !== id).sort((a, b) => (num(a.FOB_USD) ?? 9e9) - (num(b.FOB_USD) ?? 9e9)) : [];
  const ns = notasDe(id); const gs = pagsDe(id);
  const filtroTxt = st.trilha.filter((t) => t.v != null).map((t) => rotulo(t.k, t.v)).join(' · ');
  const mostra = an && !st.semAnot;
  $('modal').innerHTML = `<div class="veu" data-a="fechafundo"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="pn">
   <div class="dbar"><span class="kl" style="flex:1">Produto ${pos + 1} de ${lista.length}${filtroTxt ? ' · ' + esc(filtroTxt) : ''}</span>
    <button type="button" class="nav2" data-pnav="-1" ${pos <= 0 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#262422" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Anterior</button>
    <button type="button" class="nav2" data-pnav="1" ${pos >= lista.length - 1 ? 'disabled' : ''}>Próximo<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#262422" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
    <button type="button" class="fx" data-a="fecha" aria-label="Fechar">${XIC}</button></div>
   <div class="pop"><div class="pf"><div class="pfm">${z ? `<img id="pfoto" src="${FULL[z.u] || MINI[z.u] || (i === 0 ? x.thumb || '' : '')}" alt="Foto do produto" data-zoom="1">${mostra ? '<div class="anov" id="anov"></div>' : ''}${!FULL[z.u] ? '<span class="ld" id="pld">Carregando a foto em alta…</span>' : ''}${an ? `<button type="button" class="pill" data-a="toganot">${mostra ? 'Ocultar anotação' : 'Mostrar anotação'}</button>` : ''}` : (x.thumb ? `<img src="${x.thumb}" alt="">` : '<div class="gph">Sem foto</div>')}</div>
     ${fotos.length > 1 ? `<div class="strip">${fotos.map((y, j) => `<button type="button" class="${j === i ? 'on' : ''}" data-pf="${j}" aria-label="Foto ${j + 1}">${imgMini(y.u, j === 0 ? x.thumb : '')}</button>`).join('')}<span>${pl(fotos.length, 'foto')}${S.anotacoes.some((a) => a.ID_Produto === id) ? ' · com anotação' : ''}</span></div>` : ''}</div>
    <div class="pi"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><div class="kl">${esc([x.Time, x.Subcategoria].filter(Boolean).join(' · '))}${p ? ' · projeto da buylist' : ' · fora da buylist'}</div>
      <h1 id="pn" class="ttl" style="font-size:30px">${esc(p ? p.Projeto : 'Produto fora da buylist')}</h1><div style="font-size:13.5px;color:#6E6862;margin-top:4px">${esc([f && f.Empresa, f && f.Estande && 'estande ' + f.Estande, f && f.Contato].filter(Boolean).join(' · ') || 'Sem fornecedor')}</div></div>
      <button type="button" class="dest ${meu ? 'on' : ''}" data-fav="${esc(id)}">${meu ? STAR : STARO}${meu ? 'Destaque' : 'Marcar destaque'}</button></div>
     ${d.length ? `<div style="font-size:12.5px;color:#C4161E;margin-top:-8px">Destaque de ${esc(d.map(nomeDe).join(', '))}</div>` : ''}
     <div class="nums"><div>FOB<b>${usd(num(x.FOB_USD)) || '·'}</b></div><div>MOQ<b>${x.MOQ !== '' && x.MOQ != null ? n0(x.MOQ) + ' pcs' : '·'}</b></div><div>FOB Target<b style="color:${s.k === 'ok' ? '#1E5E22' : s.k === 'up' ? '#A33A00' : '#262422'}">${p && alvoTxt(p) ? esc(alvoTxt(p)) : 'Sem target'}</b></div></div>
     <div><div class="kl" style="margin-bottom:6px">Interesse</div><div class="seg" role="group" aria-label="Interesse">${['Alto', 'Médio', 'Baixo'].map((v) => `<button type="button" class="${x.Interesse === v ? 'on' : ''}" data-int="${v}">${v}</button>`).join('')}</div></div>
     <div><div class="kl" style="margin-bottom:4px">Anotações de quem registrou</div><div style="font-size:14px;line-height:1.5">${x.Anotacoes ? esc(x.Anotacoes) : '<span style="color:#6E6862">Sem anotações.</span>'}</div><small style="color:#6E6862">${esc(nomeDe(x.Registrado_Por))}${x.Data_Hora ? ' · ' + esc(quando(x.Data_Hora)) : ''}</small></div>
     <div style="border-top:1px solid #EEEAE5;padding-top:14px;display:flex;flex-direction:column;gap:12px"><div class="kl">Notas do time</div>
      ${ns.map((c) => `<div class="cm"><span class="av">${esc(iniciais(c.Registrado_Por))}</span><div><b style="font-weight:500">${esc(nomeDe(c.Registrado_Por))}</b> <small style="color:#6E6862">${esc(quando(c.Data_Hora))}</small>${String(c.Registrado_Por).toLowerCase() === S.email || S.email === 'renato.martins@westwing.com.br' ? `<button type="button" class="rm" data-rmnota="${esc(c.ID_Comentario)}">apagar</button>` : ''}<br>${esc(c.Texto)}</div></div>`).join('') || '<div style="font-size:13px;color:#6E6862">Ninguém escreveu ainda.</div>'}
      <form class="nota" data-nota="${esc(id)}"><input name="t" aria-label="Nova nota" placeholder="Escreva uma nota para o time" autocomplete="off" maxlength="2000"><button type="submit" class="btn">Enviar</button></form></div></div></div>
   <div class="pb"><div><div class="kl" style="margin-bottom:10px">Página do caderno</div>
     ${gs.length ? gs.map((g) => `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:12px">${g.Imagem ? `<img class="cad" ${'data-mini'}="${esc(g.Imagem)}" src="${g.thumb || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}" alt="Página do caderno" data-zoomurl="${esc(g.Imagem)}">` : '<span class="cad"></span>'}<div style="font-size:13.5px;line-height:1.5"><b style="font-weight:500">${esc(g.Titulo || 'Página sem título')}</b><br><span style="color:#6E6862">${esc(nomeDe(g.Registrado_Por))}${g.Criada_Em ? ' · ' + esc(quando(g.Criada_Em)) : ''}</span>${g.Imagem ? `<br><button type="button" data-zoomurl="${esc(g.Imagem)}" style="border:none;background:none;padding:0;color:#1F6F68;text-decoration:underline">Abrir a página inteira</button>` : ''}</div></div>`).join('') : '<div style="font-size:13.5px;color:#6E6862">Nenhuma página do caderno ligada a este produto.</div>'}</div>
    <div><div class="kl" style="margin-bottom:10px">Outros produtos deste projeto</div><div style="display:flex;flex-direction:column;gap:10px">
     ${outros.map((y) => { const fy = forn(y.ID_Fornecedor); const sy = statusFob(y); return `<button type="button" class="outro" data-pop="${esc(y.ID_Produto)}">${y.Foto_1 ? imgMini(y.Foto_1, y.thumb) : y.thumb ? `<img src="${y.thumb}" alt="">` : '<span class="ph"></span>'}<span style="flex:1">${esc(fy ? fy.Empresa : 'Sem fornecedor')}<small style="display:block;color:#6E6862">${y.MOQ !== '' && y.MOQ != null ? 'MOQ ' + n0(y.MOQ) : 'MOQ não informado'}</small></span><b style="font-weight:500;color:${sy.k === 'up' ? '#A33A00' : '#262422'}">${usd(num(y.FOB_USD))}</b></button>`; }).join('') || '<div style="font-size:13.5px;color:#6E6862">Nenhum outro produto neste projeto.</div>'}</div></div></div>
  </div></div>`;
  ligaMinis();
  if (z && !FULL[z.u]) pedeFoto(z.u, (full) => { const im = $('pfoto'); if (im && st.pop === id && full) { im.src = full; const l = $('pld'); if (l) l.remove(); montaAnot(an); } });
  else montaAnot(an);
}
async function montaAnot(an) {
  const box = $('anov'); const im = $('pfoto'); if (!box || !im || !an) return;
  let t = FULL[an.Tracos]; if (!t) { try { const r = await api('foto', { id: an.Tracos }); t = FULL[an.Tracos] = r.texto; } catch (e) { return; } }
  const d = window.Lousa && Lousa.ler(t); if (!d || !document.body.contains(box)) return;
  const pos = () => { const W = im.clientWidth, H = im.clientHeight; if (!W || !im.naturalWidth) return; const r = Math.min(W / im.naturalWidth, H / im.naturalHeight); const w = im.naturalWidth * r, h = im.naturalHeight * r; Object.assign(box.style, { left: (W - w) / 2 + 'px', top: (H - h) / 2 + 'px', width: w + 'px', height: h + 'px' }); };
  if (im.complete) pos(); im.addEventListener('load', pos); new ResizeObserver(pos).observe(im);
  box.innerHTML = ''; Lousa.cria(box, { w: d.w, h: d.h, dados: d, editavel: false });
}
function fechaModal() { st.pop = null; st.popLista = null; $('modal').innerHTML = ''; }
function zoom(src) { if (!src) return; const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${src}" alt="">`; z.onclick = () => z.remove(); document.body.appendChild(z); }

/* ---------------- 4. fornecedores ---------------- */
function linhaForn(f) {
  const ps = S.produtos.filter((x) => x.ID_Fornecedor === f.ID_Fornecedor); const prj = [...new Set(ps.map((x) => x.ID_Projeto).filter((id) => proj(id)))].map((id) => proj(id).Projeto);
  const m = ps.filter((x) => num(x.FOB_USD) != null).sort((a, b) => num(a.FOB_USD) - num(b.FOB_USD))[0]; const sm = m && statusFob(m);
  const iv = ps.length ? Math.round(ps.reduce((s, x) => s + intVal(x), 0) / ps.length) : 0;
  const cad = !f.Email && !f.Telefone_WeChat && !f.Contato ? 'Sem contato' : !f.Email && !f.Telefone_WeChat ? 'Sem e-mail' : !f.Foto_Cartao && !f.thumb ? 'Sem foto do cartão' : 'Completo';
  return { f, ps, prj, m, sm, iv, dest: ps.filter(ehDestaque).length, cad };
}
function vFornecedores() {
  const q = st.fornQ.toLowerCase();
  let ls = S.fornecedores.map(linhaForn).filter((l) => !q || [l.f.Empresa, l.f.Estande, l.f.Contato].join(' ').toLowerCase().includes(q));
  ls.sort(st.fornOrd === 'nome' ? (a, b) => String(a.f.Empresa).localeCompare(String(b.f.Empresa)) : st.fornOrd === 'prod' ? (a, b) => b.ps.length - a.ps.length : (a, b) => b.prj.length - a.prj.length || b.ps.length - a.ps.length);
  const sel = ls.find((l) => l.f.ID_Fornecedor === st.fornSel) || ls[0]; if (sel) st.fornSel = sel.f.ID_Fornecedor;
  const tr = ls.map((l) => `<tr class="${sel && l === sel ? 'on' : ''}" data-fsel="${esc(l.f.ID_Fornecedor)}"><td><b style="font-weight:500">${esc(l.f.Empresa)}</b><br><small style="color:#6E6862">${esc(l.f.Contato || 'Sem contato')}</small></td><td class="nw">${esc(l.f.Estande || '·')}</td><td>${l.prj.map((n) => `<span class="pc">${esc(n)}</span>`).join('') || '<span style="color:#6E6862">Fora da buylist</span>'}</td><td>${l.ps.length}</td>
    <td class="nw">${l.m ? `<span style="color:${l.sm.k === 'ok' ? '#2E7D32' : l.sm.k === 'up' ? '#A33A00' : '#6E6862'}">${usd(num(l.m.FOB_USD))} ${l.sm.k === 'ok' ? 'no target' : l.sm.k === 'up' ? 'acima do target' : 'sem target'}</span>` : '·'}</td><td>${l.iv ? dots(l.iv) : '·'}</td><td>${l.dest}</td><td style="color:${l.cad === 'Completo' ? '#2E7D32' : '#A33A00'}">${l.cad}</td></tr>`).join('');
  let side = '';
  if (sel) { const f = sel.f;
    side = `<aside class="card side" style="flex:1 1 300px;max-width:360px" aria-label="Fornecedor selecionado">${f.Foto_Cartao ? imgMini(f.Foto_Cartao, f.thumb, 'cart').replace('<img', `<img data-zoomurl="${esc(f.Foto_Cartao)}"`) : f.thumb ? `<img class="cart" src="${f.thumb}" alt="">` : '<div class="cart" style="display:flex;align-items:center;justify-content:center;color:#8E877F">Sem foto do cartão</div>'}
     <div><b style="font-size:18px;font-weight:500">${esc(f.Empresa)}</b><div style="color:#6E6862;font-size:13px">${esc([f.Estande && 'Estande ' + f.Estande, f.Registrado_Por && 'cadastrado por ' + nomeDe(f.Registrado_Por)].filter(Boolean).join(' · '))}</div></div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px"><div><span style="color:#6E6862">Contato</span><br>${esc(f.Contato || '·')}</div><div><span style="color:#6E6862">Telefone / WeChat</span><br>${esc(f.Telefone_WeChat || '·')}</div><div style="grid-column:1/-1"><span style="color:#6E6862">E-mail</span><br>${esc(f.Email || '·')}</div></div>
     <div class="kl" style="margin-top:6px">Produtos deste fornecedor</div>
     ${sel.ps.map((x) => { const p = proj(x.ID_Projeto); return `<button type="button" class="pl" data-pop="${esc(x.ID_Produto)}">${x.Foto_1 ? imgMini(x.Foto_1, x.thumb) : x.thumb ? `<img src="${x.thumb}" alt="">` : '<span class="ph"></span>'}<span style="flex:1">${esc(p ? p.Projeto : 'Fora da buylist')}<small style="display:block;color:#6E6862">${usd(num(x.FOB_USD))}${x.MOQ ? ' · MOQ ' + n0(x.MOQ) : ''}</small></span>${ehDestaque(x) ? '<span style="font-size:11px;font-weight:700;background:#1F6F68;color:#fff;border-radius:8px;padding:2px 7px">Destaque</span>' : `<span style="font-size:11px;color:#6E6862">${esc(x.Interesse ? 'Interesse ' + x.Interesse.toLowerCase() : '')}</span>`}</button>`; }).join('') || '<div style="font-size:13px;color:#6E6862">Nenhum produto ainda.</div>'}
     <button type="button" class="btn out" data-corr="contato" data-id="${esc(f.ID_Fornecedor)}" style="margin-top:4px">Editar contato</button></aside>`; }
  return `<div class="head"><div><div class="kl">${pl(S.fornecedores.length, 'fornecedor', 'fornecedores')} · ${pl(S.produtos.length, 'produto')}</div><h1 class="ttl">Fornecedores</h1></div>
    <div class="chips"><label class="busca"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E6862" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="fq" aria-label="Buscar fornecedor" placeholder="Buscar fornecedor ou estande" value="${esc(st.fornQ)}"></label>
     <span style="font-size:13px;color:#6E6862">Ordenar por</span><select class="sel" id="ford" aria-label="Ordenar"><option value="proj" ${st.fornOrd === 'proj' ? 'selected' : ''}>Projetos atendidos</option><option value="prod" ${st.fornOrd === 'prod' ? 'selected' : ''}>Produtos</option><option value="nome" ${st.fornOrd === 'nome' ? 'selected' : ''}>Nome</option></select></div></div>
   ${S.fornecedores.length ? `<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start"><div class="card" style="flex:999 1 720px;min-width:0;overflow-x:auto;padding:0"><table><thead><tr><th>Fornecedor</th><th>Estande</th><th>Projetos</th><th>Produtos</th><th>Melhor FOB</th><th>Interesse</th><th>Destaques</th><th>Cadastro</th></tr></thead><tbody>${tr || '<tr><td colspan="8" style="color:#6E6862">Nada encontrado.</td></tr>'}</tbody></table></div>${side}</div>` : '<div class="card vazio">Nenhum fornecedor cadastrado ainda.</div>'}`;
}

/* ---------------- 5. resumo do dia ---------------- */
function eventos() {
  const ev = [];
  S.produtos.forEach((x) => { const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor); ev.push({ dh: x.Data_Hora, quem: x.Registrado_Por, tipo: 'prod', x, txt: p ? p.Projeto : 'um produto fora da buylist em ' + (x.Subcategoria || x.Time), det: [f && f.Empresa, usd(num(x.FOB_USD)), x.MOQ ? 'MOQ ' + n0(x.MOQ) : ''].filter(Boolean).join(' · ') }); });
  S.fornecedores.forEach((f) => ev.push({ dh: f.Data_Hora, quem: f.Registrado_Por, tipo: 'forn', txt: 'cadastrou o fornecedor ' + f.Empresa, det: f.Estande ? 'estande ' + f.Estande : '' }));
  S.paginas.forEach((g) => ev.push({ dh: g.Criada_Em || g.Data_Hora, quem: g.Registrado_Por, tipo: 'pag', txt: 'escreveu uma página no caderno', det: [g.Titulo, forn(g.ID_Fornecedor) && forn(g.ID_Fornecedor).Estande && 'estande ' + forn(g.ID_Fornecedor).Estande].filter(Boolean).join(' · ') }));
  S.comentarios.forEach((c) => { const x = prod(c.ID_Produto); const p = x && proj(x.ID_Projeto); ev.push({ dh: c.Data_Hora, quem: c.Registrado_Por, tipo: 'nota', x, pre: 'deixou uma nota em', txt: p ? p.Projeto : 'um produto', det: '"' + String(c.Texto).slice(0, 140) + '"' }); });
  S.anotacoes.forEach((a) => { const x = prod(a.ID_Produto); const p = x && proj(x.ID_Projeto); ev.push({ dh: a.Data_Hora, quem: a.Registrado_Por, tipo: 'anot', x, pre: 'anotou a foto de', txt: p ? p.Projeto : 'um produto', det: '' }); });
  return ev.filter((e) => e.dh).sort((a, b) => String(b.dh).localeCompare(String(a.dh)));
}
function vResumo() {
  const ev = eventos(); const dias = [...new Set(ev.map((e) => diaDe(e.dh)))].sort();
  if (!st.dia || !dias.includes(st.dia)) st.dia = dias[dias.length - 1] || null;
  const dia = st.dia; const evd = ev.filter((e) => diaDe(e.dh) === dia);
  const pd = S.produtos.filter((x) => diaDe(x.Data_Hora) === dia); const pend = pendencias();
  const porQuem = {}; pd.forEach((x) => { const q = String(x.Registrado_Por || '').toLowerCase(); porQuem[q] = (porQuem[q] || 0) + 1; });
  const qs = Object.entries(porQuem).sort((a, b) => b[1] - a[1]); const mx = qs.length ? qs[0][1] : 1;
  const tl = (st.tudo ? evd : evd.slice(0, 12)).map((e) => {
    const cls = e.tipo === 'pag' ? 'cad' : (e.tipo === 'prod' && e.x && (!e.x.Foto_1 && !e.x.thumb)) ? 'wr' : '';
    const fotos = e.tipo === 'prod' && e.x ? urls(e.x).slice(0, 3) : [];
    const alvo = (e.pre ? esc(e.pre) + ' ' : '') + (e.x ? `<button type="button" class="lk" data-pop="${esc(e.x.ID_Produto)}">${esc(e.txt)}</button>` : esc(e.txt));
    return `<div class="tm"><span class="h">${hora(e.dh)}</span><span class="d ${cls}"></span><span><b style="font-weight:500">${esc(nomeDe(e.quem))}</b> ${e.tipo === 'prod' ? 'registrou ' : ''}${alvo}${cls === 'wr' ? ' <span class="tagp">sem foto</span>' : ''}${e.det ? `<br><small>${esc(e.det)}</small>` : ''}${fotos.length ? `<span class="ph2">${fotos.map((z, i) => imgMini(z.u, i === 0 ? e.x.thumb : '').replace('<img', `<img data-pop="${esc(e.x.ID_Produto)}"`)).join('')}</span>` : ''}</span></div>`; }).join('');
  const dest = pd.filter(ehDestaque).slice(0, 4);
  const pendHtml = pend.map((p) => `<div class="pd"><span class="tagp">${esc(p.tipo)}</span><span style="flex:1">${esc(p.nome)}<small>${esc(p.obs || [nomeDe(p.quem), quando(p.dh)].filter(Boolean).join(' · '))}</small></span><button type="button" class="fix" data-corr="${p.o}" data-id="${esc(p.id)}">Corrigir</button></div>`).join('');
  return `<div class="head"><div><div class="kl">${dia ? esc(nomeDiaLongo(dia)) : 'Nenhum registro ainda'}</div><h1 class="ttl">Resumo do dia</h1></div>
    <div class="chips" role="group" aria-label="Dia">${dias.slice(-6).map((d) => `<button type="button" class="dy ${d === dia ? 'on' : ''}" data-dia="${d}">${esc(nomeDia(d))}</button>`).join('')}</div></div>
   <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start"><div class="stack" style="flex:999 1 640px;min-width:0">
    <section class="card"><div class="dnum"><div><div class="kl">Produtos</div><div>${pd.length}</div></div><div><div class="kl">Fornecedores novos</div><div>${S.fornecedores.filter((f) => diaDe(f.Data_Hora) === dia).length}</div></div><div><div class="kl">Destaques</div><div>${pd.filter(ehDestaque).length}</div></div><div><div class="kl">Páginas do caderno</div><div>${S.paginas.filter((g) => diaDe(g.Criada_Em || g.Data_Hora) === dia).length}</div></div><div><div class="kl">Notas do time</div><div>${S.comentarios.filter((c) => diaDe(c.Data_Hora) === dia).length}</div></div></div>
     <h2 class="h3" style="margin-bottom:16px">Linha do tempo</h2>${evd.length ? `<div class="tline">${tl}</div>${evd.length > 12 && !st.tudo ? `<button type="button" data-a="tudo" style="margin-left:92px;border:none;background:none;color:#1F6F68;text-decoration:underline;font-size:13.5px;padding:0">Ver o dia inteiro (${evd.length} registros)</button>` : ''}` : '<div class="vazio" style="padding:20px">Nada registrado neste dia.</div>'}</section>
    <section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="h3">Pendências</h2><span style="font-size:13px;color:${pend.length ? '#A33A00' : '#2E7D32'};font-weight:500">${pend.length ? pl(pend.length, 'para corrigir', 'para corrigir') : 'Tudo em ordem'}</span></div>
     <div class="sub" style="margin-bottom:6px">Dá para resolver à noite, enquanto o fornecedor ainda está na feira.</div>${pendHtml}</section></div>
   <aside class="stack" style="flex:1 1 300px;max-width:380px"><section class="card"><div class="kl" style="margin-bottom:12px">Produtos registrados no dia por pessoa</div><div style="display:flex;flex-direction:column;gap:10px">${qs.map(([q, n]) => `<div class="pp"><span>${esc(nomeDe(q))}</span><div class="t"><i style="width:${Math.round(n / mx * 100)}%"></i></div><b style="font-weight:500">${n}</b></div>`).join('') || '<div style="font-size:13px;color:#6E6862">Ninguém registrou neste dia.</div>'}</div></section>
    <section class="card"><div class="kl" style="margin-bottom:12px">Destaques do dia</div>${dest.length ? `<div class="d2">${dest.map((x) => { const p = proj(x.ID_Projeto); return `<button type="button" data-pop="${esc(x.ID_Produto)}">${x.Foto_1 ? imgMini(x.Foto_1, x.thumb) : x.thumb ? `<img src="${x.thumb}" alt="">` : '<span class="ph"></span>'}${esc(p ? p.Projeto : 'Fora da buylist')}<small style="display:block;color:#6E6862">${usd(num(x.FOB_USD))}</small></button>`; }).join('')}</div>` : '<div style="font-size:13px;color:#6E6862">Nenhum destaque neste dia.</div>'}</section></aside></div>`;
}

/* ---------------- gravações ---------------- */
async function grava(acao, body, local) {
  try { if (local) local(); render(); const r = await api(acao, body); carrega(true); return r; }
  catch (e) { toast(e.servidor ? e.message : 'Não consegui salvar. Confira a internet e tente de novo.'); carrega(true); throw e; }
}
function alternaFav(id) {
  const x = prod(id); if (!x) return; const f = favs(x); const on = !f.includes(S.email);
  grava('favorito', { id, on }, () => { x.Favoritos = (on ? f.concat(S.email) : f.filter((e) => e !== S.email)).join(', '); }).catch(() => {});
}
function mudaInteresse(id, v) { const x = prod(id); if (!x || x.Interesse === v) return; grava('editarProduto', { p: { ID_Produto: id, Interesse: v } }, () => { x.Interesse = v; }).catch(() => {}); }
function novaNota(id, texto) {
  texto = texto.trim(); if (!texto) return;
  const c = { ID_Comentario: uid('NT'), ID_Produto: id, Texto: texto };
  grava('comentar', { c }, () => { S.comentarios.push(Object.assign({ Registrado_Por: S.email, Data_Hora: agoraSP() }, c)); }).catch(() => {});
}
function apagaNota(cid) { if (!confirm('Apagar esta nota?')) return; grava('apagarComentario', { id: cid }, () => { S.comentarios = S.comentarios.filter((c) => c.ID_Comentario !== cid); }).catch(() => {}); }
function agoraSP() { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {}); return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`; }
// corrigir pendências: MOQ, foto e contato do fornecedor
function corrigir(o, id) {
  st.pop = null;
  if (o === 'moq' || o === 'foto') {
    const x = prod(id); if (!x) return; const p = proj(x.ID_Projeto);
    $('modal').innerHTML = `<div class="veu"><form class="dlg xs" data-corrform="${o}" data-id="${esc(id)}"><div class="kl">Corrigir pendência</div><b style="font-size:18px;font-weight:500">${esc(p ? p.Projeto : 'Produto fora da buylist')}</b>
      ${o === 'moq' ? `<label class="fld">MOQ (pcs)<input name="moq" inputmode="numeric" required autofocus></label>` : `<label class="fld">Foto do produto<input name="foto" type="file" accept="image/*" required></label>`}
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn out" data-a="fecha">Cancelar</button><button type="submit" class="btn">Salvar</button></div></form></div>`;
  } else {
    const f = forn(id); if (!f) return;
    $('modal').innerHTML = `<div class="veu"><form class="dlg xs" data-corrform="contato" data-id="${esc(id)}"><div class="kl">Contato do fornecedor</div><b style="font-size:18px;font-weight:500">${esc(f.Empresa)}</b>
      <label class="fld">Contato<input name="Contato" value="${esc(f.Contato || '')}"></label><label class="fld">E-mail<input name="Email" type="email" value="${esc(f.Email || '')}"></label><label class="fld">Telefone / WeChat<input name="Telefone_WeChat" value="${esc(f.Telefone_WeChat || '')}"></label><label class="fld">Estande<input name="Estande" value="${esc(f.Estande || '')}"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn out" data-a="fecha">Cancelar</button><button type="submit" class="btn">Salvar</button></div></form></div>`;
  }
}
async function salvaCorrecao(form) {
  const o = form.dataset.corrform, id = form.dataset.id; const b = form.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Salvando…';
  try {
    if (o === 'moq') { const v = num(form.moq.value); if (v == null) throw Object.assign(new Error('Digite o MOQ em números.'), { servidor: true }); await api('editarProduto', { p: { ID_Produto: id, MOQ: v } }); }
    else if (o === 'foto') { const file = form.foto.files[0]; const u = URL.createObjectURL(file); const full = await reduz(u, 1400); const th = await reduz(full, 320); URL.revokeObjectURL(u); await api('editarProduto', { p: { ID_Produto: id, novasFotos: { 1: full }, thumb: th } }); }
    else { const f = forn(id); const campos = {}; ['Contato', 'Email', 'Telefone_WeChat', 'Estande'].forEach((k) => campos[k] = form[k].value.trim()); await api('editarFornecedor', { f: Object.assign({ ID_Fornecedor: id, Empresa: f.Empresa }, campos) }); }
    fechaModal(); toast('Corrigido.'); carrega();
  } catch (e) { b.disabled = false; b.textContent = 'Salvar'; toast(e.servidor ? e.message : 'Não consegui salvar. Tente de novo.'); }
}

/* ---------------- exportar para Excel ---------------- */
const EXP = { o: 'dest', times: null, fotos: true, notas: true };
function linhasExport() {
  const T = EXP.times || timesOrd(); const notasTxt = (id) => notasDe(id).map((c) => nomeDe(c.Registrado_Por) + ': ' + c.Texto).join(' | ');
  if (EXP.o === 'forn') return { abas: { Fornecedores: S.fornecedores.map((f) => { const l = linhaForn(f); return { Fornecedor: f.Empresa, Estande: f.Estande || '', Contato: f.Contato || '', 'E-mail': f.Email || '', 'Telefone / WeChat': f.Telefone_WeChat || '', Produtos: l.ps.length, Projetos: l.prj.join(', '), Destaques: l.dest, ...(EXP.fotos ? { 'Foto do cartão': f.Foto_Cartao || '' } : {}), 'Cadastrado por': nomeDe(f.Registrado_Por) }; }) } };
  if (EXP.o === 'sem') { const ab = {}; T.forEach((t) => { ab[t] = S.projetos.filter((p) => p.Time === t && !S.produtos.some((x) => x.ID_Projeto === p.ID_Projeto)).sort((a, b) => (num(b.CMV_12M) || 0) - (num(a.CMV_12M) || 0)).map((p) => ({ Subcategoria: p.Subcategoria, Projeto: p.Projeto, 'Coleção': p['Coleção'] || '', SKUs: p.SKUs || '', 'CMV 12M (R$)': num(p.CMV_12M) || '', 'FOB Target': p.FOB_Alvo || '', 'MOQ Target': p.MOQ_Alvo || '', Origem: p.Origem || '' })); }); return { abas: ab }; }
  const ab = {}; T.forEach((t) => { ab[t] = S.produtos.filter((x) => x.Time === t && (EXP.o === 'todos' || ehDestaque(x))).sort((a, b) => String((proj(a.ID_Projeto) || {}).Projeto || 'zz').localeCompare(String((proj(b.ID_Projeto) || {}).Projeto || 'zz'))).map((x) => { const p = proj(x.ID_Projeto); const f = forn(x.ID_Fornecedor) || {};
    return { Subcategoria: x.Subcategoria || '', Projeto: p ? p.Projeto : 'Fora da buylist', Fornecedor: f.Empresa || '', Estande: f.Estande || '', Contato: f.Contato || '', 'E-mail': f.Email || '', 'Telefone / WeChat': f.Telefone_WeChat || '', 'FOB (USD)': num(x.FOB_USD) ?? '', 'FOB Target': p ? p.FOB_Alvo || '' : '', 'Situação': statusFob(x).t, MOQ: x.MOQ ?? '', 'MOQ Target': p ? p.MOQ_Alvo || '' : '', Interesse: x.Interesse || '', 'Destaque de': favs(x).map(nomeDe).join(', '), 'Anotações': x.Anotacoes || '', ...(EXP.notas ? { 'Notas do time': notasTxt(x.ID_Produto) } : {}), ...(EXP.fotos ? { Fotos: urls(x).map((z) => z.u).join(' ') } : {}), 'Registrado por': nomeDe(x.Registrado_Por), Data: quando(x.Data_Hora) }; }); });
  return { abas: ab };
}
function exportar() {
  st.pop = null;
  if (!EXP.times) EXP.times = timesOrd();
  const d = linhasExport(); const todas = Object.values(d.abas).flat(); const cols = todas[0] ? Object.keys(todas[0]).slice(0, 9) : [];
  const op = (v, t, s) => `<label class="op ${EXP.o === v ? 'on' : ''}"><input type="radio" name="o" value="${v}" ${EXP.o === v ? 'checked' : ''} style="margin-top:3px;accent-color:#1F6F68"><span><b style="font-weight:500">${t}</b><small>${s}</small></span></label>`;
  $('modal').innerHTML = `<div class="veu" data-a="fechafundo"><div class="dlg sm" role="dialog" aria-modal="true" aria-labelledby="exp">
   <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px"><div><div class="kl">Exportar</div><h1 id="exp" class="ttl" style="font-size:30px">Levar para o Excel</h1></div><button type="button" class="fx" data-a="fecha" aria-label="Fechar">${XIC}</button></div>
   <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" role="radiogroup" aria-label="O que exportar">
    ${op('dest', 'Destaques para o pós-feira', 'Os produtos com estrela, com fornecedor, contato, FOB, MOQ e notas do time. É a lista para pedir amostra e cotação.')}
    ${op('todos', 'Todos os produtos', 'Tudo o que foi coletado, com interesse, destaque e notas.')}
    ${op('forn', 'Fornecedores', 'Contatos, estande, projetos atendidos e link da foto do cartão.')}
    ${op('sem', 'Projetos sem produto', 'O que da buylist ficou sem opção na feira, com o CMV de cada um.')}</div>
   <div style="display:flex;gap:28px;flex-wrap:wrap;align-items:center">${EXP.o !== 'forn' ? `<div style="display:flex;gap:14px;flex-wrap:wrap"><span class="kl" style="align-self:center">Times</span>${timesOrd().map((t) => `<label class="ck"><input type="checkbox" data-ext="${esc(t)}" ${EXP.times.includes(t) ? 'checked' : ''} style="accent-color:#1F6F68">${esc(t)}</label>`).join('')}</div>` : ''}
    ${EXP.o !== 'sem' ? `<div style="display:flex;gap:14px;flex-wrap:wrap"><label class="ck"><input type="checkbox" data-exf="fotos" ${EXP.fotos ? 'checked' : ''} style="accent-color:#1F6F68">Links das fotos no Drive</label>${EXP.o !== 'forn' ? `<label class="ck"><input type="checkbox" data-exf="notas" ${EXP.notas ? 'checked' : ''} style="accent-color:#1F6F68">Notas do time</label>` : ''}</div>` : ''}</div>
   <div><div class="kl" style="margin-bottom:8px">Prévia · ${Math.min(3, todas.length)} de ${pl(todas.length, 'linha')}</div><div class="prev">${todas.length ? `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${todas.slice(0, 3).map((r) => `<tr>${cols.map((c) => `<td>${esc(String(r[c]).slice(0, 40))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<div style="padding:16px;color:#6E6862;font-size:13px">Nada para exportar com essas opções.</div>'}</div></div>
   <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;border-top:1px solid #EEEAE5;padding-top:18px"><span style="font-size:13px;color:#6E6862">${EXP.o === 'forn' ? 'O arquivo sai com todos os fornecedores.' : 'O arquivo sai com uma aba por time e já filtrado.'}</span>
    <div style="display:flex;gap:10px"><button type="button" class="btn out" data-a="fecha">Cancelar</button><button type="button" class="btn" data-a="baixar" ${todas.length ? '' : 'disabled'}>Baixar Excel (.xlsx)</button></div></div></div></div>`;
}
function carregaXlsx() { return new Promise((res, rej) => { if (window.XLSX) return res(); const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function baixar() {
  try {
    await carregaXlsx(); const d = linhasExport(); const wb = XLSX.utils.book_new();
    Object.entries(d.abas).forEach(([nome, rows]) => { if (!rows.length) return; const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.min(48, Math.max(k.length + 2, ...rows.map((r) => String(r[k] ?? '').length + 1))) })); XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31)); });
    const nm = { dest: 'Destaques', todos: 'Produtos', forn: 'Fornecedores', sem: 'Projetos sem produto' }[EXP.o];
    XLSX.writeFile(wb, `Canton Fair 2026 - ${nm} - ${agoraSP().slice(0, 10)}.xlsx`); fechaModal(); toast('Arquivo baixado.');
  } catch (e) { toast('Não consegui gerar o arquivo. Confira a internet e tente de novo.'); }
}

/* ---------------- eventos ---------------- */
let toastT;
function toast(m) { document.querySelectorAll('.toast').forEach((t) => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3500); }
document.addEventListener('click', (e) => {
  let el;
  if ((el = e.target.closest('[data-fav]'))) { e.stopPropagation(); alternaFav(el.dataset.fav); return; }
  if ((el = e.target.closest('[data-rmnota]'))) { apagaNota(el.dataset.rmnota); return; }
  if ((el = e.target.closest('[data-zoomurl]'))) { const u = el.dataset.zoomurl; if (FULL[u]) zoom(FULL[u]); else { toast('Abrindo…'); pedeFoto(u, (f) => zoom(f)); } return; }
  if ((el = e.target.closest('[data-zoom]'))) { zoom(el.src); return; }
  if ((el = e.target.closest('[data-pf]'))) { st.foto = +el.dataset.pf; popup(st.pop, true); return; }
  if ((el = e.target.closest('[data-pnav]'))) { const l = st.popLista || []; const i = l.indexOf(st.pop) + (+el.dataset.pnav); if (l[i]) popup(l[i]); return; }
  if ((el = e.target.closest('[data-int]'))) { mudaInteresse(st.pop, el.dataset.int); return; }
  if ((el = e.target.closest('[data-pop]'))) { const id = el.dataset.pop; const dentro = !!el.closest('.dlg');
    if (!dentro) { st.popLista = null; if (st.r !== 'produtos' || !(st.lista || []).includes(id)) { const x = prod(id); st.popLista = x && x.ID_Projeto ? prodsDe(x.ID_Projeto).map((y) => y.ID_Produto) : [id]; } }
    else if (!(st.popLista || []).includes(id)) { const x = prod(id); st.popLista = x && x.ID_Projeto ? prodsDe(x.ID_Projeto).map((y) => y.ID_Produto) : [id]; }
    popup(id); return; }
  if ((el = e.target.closest('[data-ft]'))) { st.fTime = el.dataset.ft; render(); return; }
  if ((el = e.target.closest('[data-cproj]'))) { const p = proj(el.dataset.cproj); st.trilha = [{ k: 'time', v: p.Time }, { k: 'proj', v: p.ID_Projeto }]; st.editando = null; location.hash = '#/produtos'; return; }
  if ((el = e.target.closest('[data-tkey]'))) { const k = el.dataset.tkey; st.trilha.push({ k, v: k === 'dest' ? 'sim' : null }); st.editando = null; render(); return; }
  if ((el = e.target.closest('[data-tval]'))) { const i = st.editando != null ? st.editando : st.trilha.length - 1; st.trilha[i].v = el.dataset.tval; st.trilha = st.trilha.slice(0, i + 1).concat(st.trilha.slice(i + 1).filter((s) => filtrados(i + 1).some((x) => s.v == null || valorDe(s.k, x) === s.v))); st.editando = null; render(); return; }
  if ((el = e.target.closest('[data-tstep]'))) { const i = +el.dataset.tstep; st.editando = st.editando === i ? null : i; render(); return; }
  if ((el = e.target.closest('[data-trm]'))) { st.trilha.splice(+el.dataset.trm, 1); st.editando = null; render(); return; }
  if ((el = e.target.closest('[data-fsel]'))) { st.fornSel = el.dataset.fsel; render(); return; }
  if ((el = e.target.closest('[data-dia]'))) { st.dia = el.dataset.dia; st.tudo = false; render(); return; }
  if ((el = e.target.closest('[data-corr]'))) { corrigir(el.dataset.corr, el.dataset.id); return; }
  if ((el = e.target.closest('[data-ext]'))) { const t = el.dataset.ext; EXP.times = el.checked ? EXP.times.concat(t) : EXP.times.filter((x) => x !== t); exportar(); return; }
  if ((el = e.target.closest('[data-exf]'))) { EXP[el.dataset.exf] = el.checked; exportar(); return; }
  if ((el = e.target.closest('input[name=o]'))) { EXP.o = el.value; exportar(); return; }
  if (!(el = e.target.closest('[data-a]'))) return;
  const a = el.dataset.a;
  if (a === 'fechafundo') { if (e.target === el) fechaModal(); return; }
  if (a === 'fecha') { fechaModal(); return; }
  if (a === 'toganot') { st.semAnot = !st.semAnot; popup(st.pop, true); return; }
  if (a === 'atualizar') { carrega(); return; }
  if (a === 'exportar') { exportar(); return; }
  if (a === 'baixar') { baixar(); return; }
  if (a === 'tlimpa') { st.trilha = []; st.editando = null; render(); return; }
  if (a === 'tmais') { st.editando = null; render(); return; }
  if (a === 'tudo') { st.tudo = true; render(); return; }
  if (a === 'sodest') { st.trilha = [{ k: 'dest', v: 'sim' }]; return; }
  if (a === 'sair') { if (confirm('Sair do painel neste computador?')) { kvSet('token', null).then(() => location.reload()); } return; }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('modal').firstChild) { document.querySelector('.zoom') ? document.querySelector('.zoom').remove() : fechaModal(); }
  if (st.pop && !e.target.closest('input,textarea') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const b = document.querySelector(`[data-pnav="${e.key === 'ArrowRight' ? 1 : -1}"]`); if (b && !b.disabled) b.click(); }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.row')) e.target.click();
});
document.addEventListener('submit', (e) => {
  const f = e.target; e.preventDefault();
  if (f.dataset.nota) { novaNota(f.dataset.nota, f.t.value); return; }
  if (f.dataset.corrform) salvaCorrecao(f);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'fDia') { st.fDia = e.target.value; render(); }
  if (e.target.id === 'fQuem') { st.fQuem = e.target.value; render(); }
  if (e.target.id === 'ford') { st.fornOrd = e.target.value; render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'fq') { st.fornQ = e.target.value; const pos = e.target.selectionStart; render(); const n = $('fq'); n.focus(); n.setSelectionRange(pos, pos); }
});

/* ---------------- login (o mesmo código por e-mail do app) ---------------- */
function login(msg) {
  let el = document.querySelector('.login'); if (el) el.remove();
  el = document.createElement('div'); el.className = 'login'; document.body.appendChild(el);
  const passo1 = () => {
    el.innerHTML = `<div class="bx"><div class="k">WESTWING · CANTON FAIR 2026</div><h1>Painel da feira</h1><p>${msg ? esc(msg) : 'Entre com o seu e-mail da Westwing. Vamos mandar um código de 6 dígitos.'}</p>
      <input id="lgE" type="email" autocomplete="email" placeholder="nome.sobrenome@westwing.com.br" value="${esc(S.email || '')}"><button class="go" id="lgB">Receber código</button><div class="err" id="lgX"></div></div>`;
    el.querySelector('#lgB').onclick = async () => { const email = el.querySelector('#lgE').value.trim().toLowerCase(); const x = el.querySelector('#lgX'); const b = el.querySelector('#lgB');
      if (!/@westwing\.com\.br$/.test(email)) { x.textContent = 'Use o seu e-mail @westwing.com.br'; return; }
      b.disabled = true; b.textContent = 'Enviando…'; x.textContent = '';
      try { await api('pedirCodigo', { email }); passo2(email); } catch (e) { x.textContent = e.servidor ? e.message : 'Não consegui conectar. Tente de novo.'; b.disabled = false; b.textContent = 'Receber código'; } };
    el.querySelector('#lgE').onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('#lgB').click(); };
  };
  const passo2 = (email) => {
    el.innerHTML = `<div class="bx"><div class="k">WESTWING · CANTON FAIR 2026</div><h1>Painel da feira</h1><p>Mandamos um código para <b>${esc(email)}</b>. Confira também o spam.</p>
      <input id="lgC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="letter-spacing:8px;font-size:22px;text-align:center"><button class="go" id="lgB">Entrar</button><div class="err" id="lgX"></div><button class="lnk" id="lgV">Usar outro e-mail</button></div>`;
    el.querySelector('#lgV').onclick = passo1;
    const entrar = async () => { const codigo = el.querySelector('#lgC').value.trim(); const x = el.querySelector('#lgX'); const b = el.querySelector('#lgB');
      if (codigo.length !== 6) { x.textContent = 'Digite os 6 números do código.'; return; }
      b.disabled = true; b.textContent = 'Entrando…';
      try { const r = await api('entrar', { email, codigo }); S.token = r.token; S.email = r.email; await kvSet('token', S.token); await kvSet('email', S.email); el.remove(); inicia(); }
      catch (e) { x.textContent = e.servidor ? e.message : 'Não consegui conectar. Tente de novo.'; b.disabled = false; b.textContent = 'Entrar'; } };
    el.querySelector('#lgB').onclick = entrar; el.querySelector('#lgC').oninput = (e) => { if (e.target.value.trim().length === 6) entrar(); };
  };
  passo1();
}
async function inicia() {
  $('eu').textContent = iniciais(S.email); $('eu').title = nomeDe(S.email) + ' · sair';
  $('main').innerHTML = '<div class="carreg">Carregando o painel…</div>';
  await carrega(); rota();
}
(async function () {
  db = await openDB();
  S.token = await kvGet('token'); S.email = String((await kvGet('email')) || '').toLowerCase();
  if (!S.token) return login();
  inicia();
})();
})();
