// Tri-Valley Tree Care lead intake: receives one completed chat per POST and appends one row.
// Deploy as a web app: Execute as Me, Who has access: Anyone.
// Requires Script Property SHEET_TOKEN (shared secret, also set in Vercel as SHEET_TOKEN).

const SHEET_NAME = 'Leads';
const HEADERS = [
  'Timestamp', 'Name', 'Phone', 'Address', 'Job Details', 'Urgency',
  'Preferred Date/Time', 'Optional Fields', 'Summary', 'Missing Fields',
  'Completed By', 'Full Transcript', 'Chat ID'
];

// Run once from the editor to create the header row and grant permissions.
function setup() {
  getSheet_();
}

function doGet() {
  return json_({ ok: true, service: 'lead-intake' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    const token = PropertiesService.getScriptProperties().getProperty('SHEET_TOKEN');
    if (!token || body.token !== token) return json_({ ok: false, error: 'unauthorized' });
    if (!body.chatId) return json_({ ok: false, error: 'missing chatId' });

    lock.waitLock(10000);
    const sheet = getSheet_();

    // Idempotency: one row per chat, even if the agent and the button both fire.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ids = sheet.getRange(2, HEADERS.length, lastRow - 1, 1).getValues().flat();
      if (ids.indexOf(body.chatId) !== -1) return json_({ ok: true, duplicate: true });
    }

    const timestamp = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      timestamp,
      body.name,
      body.phone,
      body.address,
      body.jobDetails,
      body.urgency,
      body.preferredDatetime,
      body.optionalFields,
      body.summary,
      body.missingFields,
      body.completedBy,
      body.transcript,
      body.chatId
    ].map(safe_));

    return json_({ ok: true, duplicate: false });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// Blank for missing values; prefix values that Sheets would treat as formulas.
function safe_(value) {
  if (value === undefined || value === null) return '';
  const s = String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
