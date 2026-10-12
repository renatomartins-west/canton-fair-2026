/**
 * Canton Fair 26 - Ponte entre o app (GitHub Pages) e as planilhas/Drive da Westwing.
 * Acoes (POST, corpo JSON em text/plain):
 *   pedirCodigo  {email}                      -> envia codigo de 6 digitos por e-mail
 *   entrar       {email, codigo}              -> {token}
 *   dados        {token, desde}               -> projetos, times, fornecedores, produtos (e miniaturas)
 *   imagens      {token}                      -> capa, times e fotos de referencia (base64), versao
 *   salvarFornecedor {token, f}               -> grava fornecedor (idempotente pelo ID)
 *   salvarProduto    {token, p}               -> grava produto + fotos no Drive (idempotente pelo ID)
 *   editarProduto    {token, p}               -> altera campos e/ou troca fotos de um produto
 *   excluirProduto   {token, id}              -> apaga (so quem registrou ou o administrador)
 *   editarFornecedor {token, f} / excluirFornecedor {token, id}
 *   foto             {token, id}              -> foto em alta (base64) ou arquivo JSON (caderno/anotacoes)
 *   salvarPagina {token, g} / excluirPagina {token, id}  -> caderno do estande (iPad)
 *   salvarAnotacao {token, a}                 -> desenho da Pencil sobre uma foto do produto
 *   favorito {token, id, on}                  -> marca/desmarca o produto como favorito do usuario
 *   comentar {token, c} / apagarComentario {token, id}  -> notas do time (painel web)
 */

const CFG = {
  PROJETOS: '1KKnSIvGv0fbLwLZ3wHqNL-8htOPmnHiQoeccp0-6DiQ',
  TIMES: '13pQI5XikFvlm9BdfKiY-5Lc85apPZIwJUNFgF2Dc18Q',
  PRODUTOS: '1t6j4V7Y-qANtrD3ic0x7yTo5oKBkV_mvnBKUDX9MVmU',
  FORNECEDORES: '1XjEfCM_tZP78WophRC-WNpH8AaMA6sNr2IiYqTVl8Yg',
  PASTA_APP: '1R1txeBW9AtOnCBClGc0QZjbjvNnv4_sb',          // pasta Canton Fair 2026
  IMG_APP: '1wN99pnSr5YA09HuvIbrzm8vLXSKWsoSA',            // capa e times
  IMG_PROJ: '1mSFqqQLXMm5I3Aa-QoWEjSql7zrdVL_l',           // fotos de referencia P0xx.jpg
  DOMINIO: '@westwing.com.br',
  ADMIN: 'renato.martins@westwing.com.br',
  DIAS_TOKEN: 60,
  TZ: 'America/Sao_Paulo'
};

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const acoes = { pedirCodigo, entrar, dados, imagens, salvarFornecedor, salvarProduto,
      editarProduto, excluirProduto, editarFornecedor, excluirFornecedor, foto,
      salvarPagina, excluirPagina, salvarAnotacao, favorito, comentar, apagarComentario };
    const fn = acoes[d.acao];
    if (!fn) return out({ ok: false, erro: 'acao desconhecida' });
    return out(fn(d));
  } catch (err) {
    return out({ ok: false, erro: String(err && err.message || err) });
  }
}
function doGet() { return out({ ok: true, app: 'cf26' }); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------------- login por codigo ----------------
function segredo_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SEGREDO', s); }
  return s;
}
function emailOk_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@westwing\.com\.br$/.test(email)) throw new Error('Use seu e-mail ' + CFG.DOMINIO);
  return email;
}
function pedirCodigo(d) {
  const email = emailOk_(d.email);
  const cache = CacheService.getScriptCache();
  const tent = Number(cache.get('t:' + email) || 0);
  if (tent >= 5) throw new Error('Muitas tentativas. Aguarde 15 minutos.');
  cache.put('t:' + email, String(tent + 1), 900);
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('c:' + email, codigo, 900);
  MailApp.sendEmail({
    to: email,
    subject: 'Canton Fair 26 · seu código de acesso: ' + codigo,
    name: 'Canton Fair 26 · Westwing',
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#262422">' +
      '<p style="font-size:15px">Seu código para entrar no app Canton Fair 26:</p>' +
      '<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#C4161E;margin:12px 0">' + codigo + '</p>' +
      '<p style="font-size:13px;color:#7A746E">Vale por 15 minutos. Se não foi você, ignore este e-mail.</p></div>'
  });
  return { ok: true };
}
function entrar(d) {
  const email = emailOk_(d.email);
  const cache = CacheService.getScriptCache();
  const certo = cache.get('c:' + email);
  if (!certo || String(d.codigo || '').trim() !== certo) throw new Error('Código inválido ou expirado');
  cache.remove('c:' + email); cache.remove('t:' + email);
  const exp = Date.now() + CFG.DIAS_TOKEN * 864e5;
  const corpo = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, x: exp }));
  return { ok: true, token: corpo + '.' + assina_(corpo), email: email, expira: exp };
}
function assina_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, segredo_()));
}
function usuario_(token) {
  const p = String(token || '').split('.');
  if (p.length !== 2 || assina_(p[0]) !== p[1]) throw new Error('LOGIN');
  const j = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString());
  if (Date.now() > j.x) throw new Error('LOGIN');
  return j.e;
}

// ---------------- leitura ----------------
function tabela_(id) {
  const v = SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getValues();
  const h = v.shift().map(String);
  return v.filter(r => r.some(c => c !== '' && c !== null)).map(r => {
    const o = {}; h.forEach((k, i) => o[k] = r[i] instanceof Date ? fmt_(r[i]) : r[i]); return o;
  });
}
function fmt_(dt) { return Utilities.formatDate(dt, CFG.TZ, "yyyy-MM-dd'T'HH:mm:ss"); }

function dados(d) {
  usuario_(d.token);
  const desde = String(d.desde || '');
  const thumbs = miniaturas_();
  // edicoes e exclusoes recentes (registro leve nas propriedades do script, sem mexer nas planilhas)
  const log = desde ? mudancas_().filter(m => m.t >= desde) : [];
  const edP = {}, edF = {}; log.forEach(m => { if (!m.d) (m.k === 'p' ? edP : edF)[m.id] = 1; });
  const prod = tabela_(CFG.PRODUTOS).filter(r => r.ID_Produto && (!desde || String(r.Data_Hora) > desde || edP[r.ID_Produto]))
    .map(r => Object.assign(r, { thumb: thumbs[r.ID_Produto] || '' }));
  const forn = tabela_(CFG.FORNECEDORES).filter(r => r.ID_Fornecedor && (!desde || String(r.Data_Hora) > desde || edF[r.ID_Fornecedor]))
    .map(r => Object.assign(r, { thumb: thumbs[r.ID_Fornecedor] || '' }));
  const res = { ok: true, agora: fmt_(new Date()), produtos: prod, fornecedores: forn,
    apagados: { produtos: log.filter(m => m.d && m.k === 'p').map(m => m.id), fornecedores: log.filter(m => m.d && m.k === 'f').map(m => m.id) } };
  if (!desde) { res.projetos = tabela_(CFG.PROJETOS); res.times = tabela_(CFG.TIMES); }
  // caderno e anotacoes: listas pequenas, vao sempre inteiras
  const cad = caderno_();
  res.paginas = linhas_(cad.getSheetByName('Paginas')).map(r => Object.assign(r, { thumb: thumbs[r.ID_Pagina] || '' }));
  res.anotacoes = linhas_(cad.getSheetByName('Anotacoes'));
  res.comentarios = linhas_(abaComentarios_(cad));
  return res;
}

function imagens(d) {
  usuario_(d.token);
  const pasta = DriveApp.getFolderById(CFG.PASTA_APP);
  const it = pasta.getFilesByName('cf26_pacote_imagens.json');
  if (it.hasNext()) return { ok: true, pacote: JSON.parse(it.next().getBlob().getDataAsString()) };
  const pacote = { versao: fmt_(new Date()), app: {}, projetos: {} };
  const b64 = f => 'data:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
  let fs = DriveApp.getFolderById(CFG.IMG_APP).getFiles();
  while (fs.hasNext()) { const f = fs.next(); if (/^(capa|time_)/.test(f.getName())) pacote.app[f.getName().replace(/\.\w+$/, '')] = b64(f); }
  fs = DriveApp.getFolderById(CFG.IMG_PROJ).getFiles();
  while (fs.hasNext()) { const f = fs.next(); pacote.projetos[f.getName().replace(/\.\w+$/, '')] = b64(f); }
  pasta.createFile('cf26_pacote_imagens.json', JSON.stringify(pacote), 'application/json');
  return { ok: true, pacote: pacote };
}

// ---------------- gravacao ----------------
function planilhaMini_() {
  const pasta = DriveApp.getFolderById(CFG.PASTA_APP);
  const it = pasta.getFilesByName('CF26_Miniaturas');
  if (it.hasNext()) return SpreadsheetApp.open(it.next()).getSheets()[0];
  const ss = SpreadsheetApp.create('CF26_Miniaturas');
  DriveApp.getFileById(ss.getId()).moveTo(pasta);
  const sh = ss.getSheets()[0]; sh.appendRow(['ID', 'Miniatura']); return sh;
}
function miniaturas_() {
  const sh = planilhaMini_(); const o = {};
  const n = sh.getLastRow(); if (n < 2) return o;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(r => o[r[0]] = r[1]);
  return o;
}
function pastaFotos_(nome) {
  const pasta = DriveApp.getFolderById(CFG.PASTA_APP);
  const it = pasta.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pasta.createFolder(nome);
}
function salvaFoto_(pasta, nome, dataUrl) {
  if (!dataUrl) return '';
  const b = Utilities.newBlob(Utilities.base64Decode(String(dataUrl).split(',').pop()), 'image/jpeg', nome + '.jpg');
  return pasta.createFile(b).getUrl();
}
function existe_(sh, id) {
  const n = sh.getLastRow(); if (n < 2) return false;
  return sh.getRange(2, 1, n - 1, 1).getValues().some(r => r[0] === id);
}
function porCabecalho_(sh, o) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return h.map(k => (o[k] === undefined || o[k] === null) ? '' : o[k]);
}

function salvarFornecedor(d) {
  const email = usuario_(d.token); const f = d.f || {};
  if (!f.ID_Fornecedor) throw new Error('sem ID');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.FORNECEDORES).getSheets()[0];
    if (existe_(sh, f.ID_Fornecedor)) return { ok: true, repetido: true };
    const url = salvaFoto_(pastaFotos_('Fotos_Cartoes'), f.ID_Fornecedor, f.cartao);
    const linha = Object.assign({}, f, { Foto_Cartao: url, Registrado_Por: email, Data_Hora: fmt_(new Date()) });
    sh.appendRow(porCabecalho_(sh, linha));
    if (f.thumb) planilhaMini_().appendRow([f.ID_Fornecedor, f.thumb]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function salvarProduto(d) {
  const email = usuario_(d.token); const p = d.p || {};
  if (!p.ID_Produto) throw new Error('sem ID');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.PRODUTOS).getSheets()[0];
    if (existe_(sh, p.ID_Produto)) return { ok: true, repetido: true };
    const pasta = pastaFotos_('Fotos_Produtos');
    const linha = Object.assign({}, p, { Registrado_Por: email, Data_Hora: fmt_(new Date()) });
    (p.fotos || []).slice(0, 4).forEach((u, i) => linha['Foto_' + (i + 1)] = salvaFoto_(pasta, p.ID_Produto + '_' + (i + 1), u));
    sh.appendRow(porCabecalho_(sh, linha));
    if (p.thumb) planilhaMini_().appendRow([p.ID_Produto, p.thumb]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

// ---------------- edicao e exclusao ----------------
function linhaDe_(sh, id) {
  const n = sh.getLastRow(); if (n < 2) return -1;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}
function objeto_(sh, row) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const v = sh.getRange(row, 1, 1, h.length).getValues()[0]; const o = {};
  h.forEach((k, i) => o[k] = v[i] instanceof Date ? fmt_(v[i]) : v[i]); return o;
}
function gravaObjeto_(sh, row, o) { sh.getRange(row, 1, 1, sh.getLastColumn()).setValues([porCabecalho_(sh, o)]); }
function miniatura_(id, thumb) {
  const sh = planilhaMini_(); const row = linhaDe_(sh, id);
  if (!thumb) { if (row > 0) sh.deleteRow(row); return; }
  if (row > 0) sh.getRange(row, 2).setValue(thumb); else sh.appendRow([id, thumb]);
}
function idDaUrl_(u) { const m = String(u || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }
function lixo_(u) { const id = idDaUrl_(u); if (id) try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
function mudancas_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('LOG_MUDANCAS') || '[]'); } catch (e) { return []; } }
function registraMudanca_(k, id, apagado) {
  let log = mudancas_(); log.push({ t: fmt_(new Date()), k: k, id: id, d: apagado ? 1 : 0 });
  if (log.length > 120) log = log.slice(-120);
  PropertiesService.getScriptProperties().setProperty('LOG_MUDANCAS', JSON.stringify(log));
}
function podeApagar_(email, autor) { return email === CFG.ADMIN || String(autor || '').toLowerCase() === email; }

function editarProduto(d) {
  usuario_(d.token); const p = d.p || {};
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.PRODUTOS).getSheets()[0];
    const row = linhaDe_(sh, p.ID_Produto); if (row < 0) throw new Error('Produto não encontrado (pode ter sido apagado).');
    const o = objeto_(sh, row);
    ['ID_Projeto', 'ID_Fornecedor', 'Time', 'Subcategoria', 'FOB_USD', 'MOQ', 'Interesse', 'Anotacoes'].forEach(k => { if (p[k] !== undefined) o[k] = p[k]; });
    const pasta = pastaFotos_('Fotos_Produtos');
    Object.keys(p.novasFotos || {}).forEach(k => {
      const col = 'Foto_' + k; if (!/^Foto_[1-4]$/.test(col)) return;
      if (o[col]) lixo_(o[col]);
      o[col] = p.novasFotos[k] ? salvaFoto_(pasta, p.ID_Produto + '_' + k + '_' + Date.now(), p.novasFotos[k]) : '';
    });
    gravaObjeto_(sh, row, o);
    if (p.thumb !== undefined) miniatura_(p.ID_Produto, p.thumb);
    registraMudanca_('p', p.ID_Produto, false);
    return { ok: true, linha: o };
  } finally { lock.releaseLock(); }
}
function excluirProduto(d) {
  const email = usuario_(d.token);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.PRODUTOS).getSheets()[0];
    const row = linhaDe_(sh, d.id); if (row < 0) return { ok: true, jaApagado: true };
    const o = objeto_(sh, row);
    if (!podeApagar_(email, o.Registrado_Por)) throw new Error('Só quem registrou o produto pode apagar.');
    [1, 2, 3, 4].forEach(i => lixo_(o['Foto_' + i]));
    sh.deleteRow(row); miniatura_(d.id, '');
    registraMudanca_('p', d.id, true);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function editarFornecedor(d) {
  usuario_(d.token); const f = d.f || {};
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.FORNECEDORES).getSheets()[0];
    const row = linhaDe_(sh, f.ID_Fornecedor); if (row < 0) throw new Error('Fornecedor não encontrado (pode ter sido apagado).');
    const o = objeto_(sh, row);
    ['Empresa', 'Contato', 'Email', 'Telefone_WeChat', 'Estande'].forEach(k => { if (f[k] !== undefined) o[k] = f[k]; });
    if (f.cartao) { if (o.Foto_Cartao) lixo_(o.Foto_Cartao); o.Foto_Cartao = salvaFoto_(pastaFotos_('Fotos_Cartoes'), f.ID_Fornecedor + '_' + Date.now(), f.cartao); }
    gravaObjeto_(sh, row, o);
    if (f.thumb) miniatura_(f.ID_Fornecedor, f.thumb);
    registraMudanca_('f', f.ID_Fornecedor, false);
    return { ok: true, linha: o };
  } finally { lock.releaseLock(); }
}
function excluirFornecedor(d) {
  const email = usuario_(d.token);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.FORNECEDORES).getSheets()[0];
    const row = linhaDe_(sh, d.id); if (row < 0) return { ok: true, jaApagado: true };
    const o = objeto_(sh, row);
    if (!podeApagar_(email, o.Registrado_Por)) throw new Error('Só quem cadastrou o fornecedor pode apagar.');
    const n = tabela_(CFG.PRODUTOS).filter(r => r.ID_Fornecedor === d.id).length;
    if (n) throw new Error('Este fornecedor tem ' + n + ' produto(s). Troque o fornecedor deles ou apague-os antes.');
    lixo_(o.Foto_Cartao); sh.deleteRow(row); miniatura_(d.id, '');
    registraMudanca_('f', d.id, true);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function foto(d) {
  usuario_(d.token);
  const f = DriveApp.getFileById(idDaUrl_(d.id) || d.id);
  const pais = []; const it = f.getParents(); while (it.hasNext()) pais.push(it.next().getName());
  if (!pais.some(n => ['Fotos_Produtos', 'Fotos_Cartoes', 'Caderno', 'Anotacoes'].indexOf(n) >= 0)) throw new Error('Foto não permitida.');
  if (/json/.test(f.getMimeType()) || /\.json$/.test(f.getName())) return { ok: true, texto: f.getBlob().getDataAsString() };
  return { ok: true, foto: 'data:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes()) };
}

// ---------------- caderno, anotacoes e favoritos (iPad) ----------------
// Planilha propria do app (CF26_Caderno), criada uma vez; o ID fica nas propriedades do script.
function caderno_() {
  const pr = PropertiesService.getScriptProperties();
  let id = pr.getProperty('CADERNO_ID'); let ss = null;
  if (id) try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create('CF26_Caderno');
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(CFG.PASTA_APP));
    const a = ss.getSheets()[0]; a.setName('Paginas');
    a.appendRow(['ID_Pagina', 'Titulo', 'ID_Fornecedor', 'ID_Produto', 'Imagem', 'Tracos', 'Registrado_Por', 'Data_Hora', 'Criada_Em']);
    const b = ss.insertSheet('Anotacoes');
    b.appendRow(['ID_Anotacao', 'ID_Produto', 'Foto', 'Imagem', 'Tracos', 'Registrado_Por', 'Data_Hora']);
    pr.setProperty('CADERNO_ID', ss.getId());
  }
  return ss;
}
function abaComentarios_(ss) {
  let sh = ss.getSheetByName('Comentarios');
  if (!sh) { sh = ss.insertSheet('Comentarios'); sh.appendRow(['ID_Comentario', 'ID_Produto', 'Texto', 'Registrado_Por', 'Data_Hora']); }
  return sh;
}
function comentar(d) {
  const email = usuario_(d.token); const c = d.c || {};
  if (!c.ID_Comentario || !c.ID_Produto || !String(c.Texto || '').trim()) throw new Error('Nota vazia.');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = abaComentarios_(caderno_());
    if (linhaDe_(sh, c.ID_Comentario) > 0) return { ok: true, repetido: true };
    const o = { ID_Comentario: c.ID_Comentario, ID_Produto: c.ID_Produto, Texto: String(c.Texto).trim().slice(0, 2000), Registrado_Por: email, Data_Hora: fmt_(new Date()) };
    sh.appendRow(porCabecalho_(sh, o));
    return { ok: true, linha: o };
  } finally { lock.releaseLock(); }
}
function apagarComentario(d) {
  const email = usuario_(d.token);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = abaComentarios_(caderno_()); const row = linhaDe_(sh, d.id);
    if (row < 0) return { ok: true, jaApagado: true };
    const o = objeto_(sh, row);
    if (!podeApagar_(email, o.Registrado_Por)) throw new Error('Só quem escreveu a nota pode apagar.');
    sh.deleteRow(row); return { ok: true };
  } finally { lock.releaseLock(); }
}
function linhas_(sh) {
  const v = sh.getDataRange().getValues(); const h = v.shift().map(String);
  return v.filter(r => r[0] !== '' && r[0] !== null).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i] instanceof Date ? fmt_(r[i]) : r[i]); return o; });
}
function salvaArquivo_(pasta, nome, conteudo, tipo) {
  return pasta.createFile(Utilities.newBlob(conteudo, tipo, nome)).getUrl();
}
function salvarPagina(d) {
  const email = usuario_(d.token); const g = d.g || {};
  if (!g.ID_Pagina) throw new Error('sem ID');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = caderno_().getSheetByName('Paginas'); const row = linhaDe_(sh, g.ID_Pagina);
    const o = row > 0 ? objeto_(sh, row) : { ID_Pagina: g.ID_Pagina, Registrado_Por: email, Criada_Em: g.Criada_Em || fmt_(new Date()) };
    ['Titulo', 'ID_Fornecedor', 'ID_Produto'].forEach(k => { if (g[k] !== undefined) o[k] = g[k]; });
    const pasta = pastaFotos_('Caderno'); const marca = Date.now();
    if (g.json) { lixo_(o.Tracos); o.Tracos = salvaArquivo_(pasta, g.ID_Pagina + '_' + marca + '.json', g.json, 'application/json'); }
    if (g.imagem) { lixo_(o.Imagem); o.Imagem = salvaFoto_(pasta, g.ID_Pagina + '_' + marca, g.imagem); }
    o.Data_Hora = fmt_(new Date());
    if (row > 0) gravaObjeto_(sh, row, o); else sh.appendRow(porCabecalho_(sh, o));
    if (g.thumb) miniatura_(g.ID_Pagina, g.thumb);
    return { ok: true, linha: o };
  } finally { lock.releaseLock(); }
}
function excluirPagina(d) {
  const email = usuario_(d.token);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = caderno_().getSheetByName('Paginas'); const row = linhaDe_(sh, d.id);
    if (row < 0) return { ok: true, jaApagado: true };
    const o = objeto_(sh, row);
    if (!podeApagar_(email, o.Registrado_Por)) throw new Error('Só quem criou a página pode apagar.');
    lixo_(o.Tracos); lixo_(o.Imagem); sh.deleteRow(row); miniatura_(d.id, '');
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function salvarAnotacao(d) {
  const email = usuario_(d.token); const a = d.a || {};
  if (!a.ID_Produto || !a.Foto) throw new Error('sem ID');
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = caderno_().getSheetByName('Anotacoes'); const id = a.ID_Produto + '_' + a.Foto;
    const row = linhaDe_(sh, id); const o = row > 0 ? objeto_(sh, row) : { ID_Anotacao: id, ID_Produto: a.ID_Produto, Foto: a.Foto };
    if (o.Tracos) lixo_(o.Tracos); if (o.Imagem) lixo_(o.Imagem);
    if (!a.json) { if (row > 0) sh.deleteRow(row); return { ok: true, apagada: true }; }
    const pasta = pastaFotos_('Anotacoes'); const marca = Date.now();
    o.Tracos = salvaArquivo_(pasta, id + '_' + marca + '.json', a.json, 'application/json');
    o.Imagem = a.imagem ? salvaFoto_(pasta, id + '_' + marca, a.imagem) : '';
    o.Registrado_Por = email; o.Data_Hora = fmt_(new Date());
    if (row > 0) gravaObjeto_(sh, row, o); else sh.appendRow(porCabecalho_(sh, o));
    return { ok: true, linha: o };
  } finally { lock.releaseLock(); }
}
function favorito(d) {
  const email = usuario_(d.token);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const sh = SpreadsheetApp.openById(CFG.PRODUTOS).getSheets()[0];
    let h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    let col = h.indexOf('Favoritos') + 1;
    if (!col) { col = h.length + 1; sh.getRange(1, col).setValue('Favoritos'); }
    const row = linhaDe_(sh, d.id); if (row < 0) throw new Error('Produto não encontrado (pode ter sido apagado).');
    const atual = String(sh.getRange(row, col).getValue() || '').split(',').map(x => x.trim()).filter(Boolean).filter(x => x !== email);
    if (d.on) atual.push(email);
    sh.getRange(row, col).setValue(atual.join(', '));
    registraMudanca_('p', d.id, false);
    return { ok: true, favoritos: atual.join(', ') };
  } finally { lock.releaseLock(); }
}

// Rode uma vez pelo editor para autorizar planilhas, Drive e e-mail.
function autorizar() {
  SpreadsheetApp.openById(CFG.PROJETOS).getName();
  DriveApp.getFolderById(CFG.PASTA_APP).getName();
  MailApp.getRemainingDailyQuota();
}
