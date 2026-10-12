// Ponte Canton Fair 26 (TESTE): recebe registros do app e grava na planilha + foto no Drive.
const SHEET_ID  = '12_9J-PV8CeyGZkRfi04xpHTqjZ0-Lkk1ZhMa7M7E64w'; // CF26_Teste_Offline
const FOLDER_ID = '1BZSBd3H5oIOyYK_ksrDf4rOEw_5n8Kwn';            // Fotos_Teste_Offline
const KEY       = '4r18JS6Jb8vf3vdBhgtUj3ns';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KEY) return out({ ok: false, error: 'chave invalida' });
    lock.waitLock(20000);
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const n = sh.getLastRow();
    const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().flat() : [];
    if (ids.indexOf(d.id) >= 0) return out({ ok: true, duplicado: true }); // reenvio: não duplica
    let url = '';
    if (d.foto) {
      const blob = Utilities.newBlob(Utilities.base64Decode(d.foto), 'image/jpeg', d.id + '.jpg');
      url = DriveApp.getFolderById(FOLDER_ID).createFile(blob).getUrl();
    }
    sh.appendRow([d.id, d.criado, new Date(), d.fob, d.nota || '', url, d.ua || '']);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out({ ok: true, ping: 'cf26' }); }

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
