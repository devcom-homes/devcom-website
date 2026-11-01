/**
 * YardSuite leads -> Google Sheet + thank-you email.
 *
 * Set up once, signed in to the DevCom Google account (info@devcomhomes.ca):
 *  1. Create a Google Sheet called "YardSuite Leads".
 *  2. Extensions > Apps Script. Paste this file. Save.
 *  3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *  4. Copy the web app URL and give it to Frank. He puts it in LEAD_HOOK in yardsuite.html.
 *
 * Every YardSuite form (waitlist, builder intro, plan request, report request) then adds a
 * row here, sends the person a short thank-you from DevCom, and emails info@devcomhomes.ca.
 * Netlify Forms keeps its own copy as a backup.
 */
var NOTIFY = 'info@devcomhomes.ca';
var SHEET = 'Leads';
var FIELDS = ['form', 'firstName', 'lastName', 'email', 'phone', 'address', 'town', 'lotSize', 'timeline', 'goal', 'source', 'design', 'fit', 'costRange', 'financing', 'serviceArea', 'project', 'calculator'];

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p['bot-field']) return out_({ ok: true });                       // spam honeypot
  var email = String(p.email || '').trim().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out_({ ok: false, error: 'email' });

  // basic flood protection: one submission per email per form every 2 minutes
  var cache = CacheService.getScriptCache(), key = (p['form-name'] || 'form') + ':' + email.toLowerCase();
  if (cache.get(key)) return out_({ ok: true, duplicate: true });
  cache.put(key, '1', 120);

  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(['Received'].concat(FIELDS, ['Status', 'Notes'])); sh.setFrozenRows(1); }
    var row = [new Date()].concat(FIELDS.map(function (f) {
      var v = f === 'form' ? (p['form-name'] || '') : (p[f] || '');
      v = String(v).slice(0, 2000);
      return /^[=+\-@]/.test(v) ? "'" + v : v;                         // stop formula injection
    }), ['New', '']);
    sh.appendRow(row);
  } finally { lock.releaseLock(); }

  var first = String(p.firstName || '').trim();
  var design = String(p.design || '').trim();
  var body = 'Hi' + (first ? ' ' + first : '') + ',\n\n' +
    'Thanks for looking into a garden suite with YardSuite. We have your details' + (design ? ' and your design:\n' + design + '\n\n' : '.\n\n') +
    'Someone from our team will look at your property and get back to you within 2 to 3 business days to set up a free consult, where we firm up the size, siting, price and financing.\n\n' +
    'If you have a survey or photos of your yard, just reply to this email.\n\n' +
    'The DevCom team\ninfo@devcomhomes.ca · (705) 242-7323';
  try { MailApp.sendEmail({ to: email, subject: 'Your YardSuite request', body: body, name: 'DevCom Homes', replyTo: NOTIFY }); } catch (err) { /* keep the row even if mail fails */ }
  try {
    MailApp.sendEmail({ to: NOTIFY, subject: 'New YardSuite lead: ' + (first || email) + (p.town ? ' (' + p.town + ')' : ''),
      body: FIELDS.map(function (f) { return f + ': ' + (f === 'form' ? p['form-name'] : (p[f] || '')); }).join('\n') });
  } catch (err) { /* noop */ }
  return out_({ ok: true });
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
