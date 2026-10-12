/**
 * Canton Fair 26 - Ponte entre o app (GitHub Pages) e as planilhas/Drive da Westwing.
 * Acoes (POST, corpo JSON em text/plain):
 *   pedirCodigo  {email}                      -> envia codigo de 6 digitos por e-mail
 *   entrar       {email, codigo}              -> {token}
 *   dados        {token, desde}               -> projetos, times, fornecedores, produtos (e miniaturas)
 *   imagens      {token}                      -> capa, times e fotos de referencia (base64), versao
 *   salvarFornecedor {token, f}               -> grava fornecedor (idempotente pelo ID)
 *   salvarProduto    {token, p}               -> grava produto + fotos no Drive (idempotente pelo ID)
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
  DIAS_TOKEN: 60,
  TZ: 'America/Sao_Paulo'
};

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const acoes = { pedirCodigo, entrar, dados, imagens, salvarFornecedor, salvarProduto };
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
  const prod = tabela_(CFG.PRODUTOS).filter(r => r.ID_Produto && (!desde || String(r.Data_Hora) > desde))
    .map(r => Object.assign(r, { thumb: thumbs[r.ID_Produto] || '' }));
  const forn = tabela_(CFG.FORNECEDORES).filter(r => r.ID_Fornecedor && (!desde || String(r.Data_Hora) > desde))
    .map(r => Object.assign(r, { thumb: thumbs[r.ID_Fornecedor] || '' }));
  const res = { ok: true, agora: fmt_(new Date()), produtos: prod, fornecedores: forn };
  if (!desde) { res.projetos = tabela_(CFG.PROJETOS); res.times = tabela_(CFG.TIMES); }
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

// Rode uma vez pelo editor para autorizar planilhas, Drive e e-mail.
function autorizar() {
  SpreadsheetApp.openById(CFG.PROJETOS).getName();
  DriveApp.getFolderById(CFG.PASTA_APP).getName();
  MailApp.getRemainingDailyQuota();
}
