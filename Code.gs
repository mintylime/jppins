/**
 * Trip Pins — Google Sheet backend
 * ---------------------------------------------------------------
 * Paste this whole file into Extensions → Apps Script on a new
 * Google Sheet. Then:
 *   1. Choose the function "setup" in the toolbar and press Run.
 *      Approve the permissions. Open "Execution log" to copy your KEY.
 *   2. Deploy → New deployment → Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the Web app URL (ends in /exec).
 *      Check: open that URL on your phone. It should say "Your Sheet is reachable".
 *      (A Google sign-in page instead means access isn't set to "Anyone".)
 *   3. Paste the URL and KEY into the app's settings.
 *
 * After editing this code later: Deploy → Manage deployments →
 * pencil icon → Version: "New version" → Deploy. (Same URL.)
 */

var SHEET_NAME = 'Places';
// "day" is the trip date a place is planned for (yyyy-mm-dd, or blank);
// "dayOrder" is its position in that day's route.
var COLUMNS = ['id', 'added', 'name', 'category', 'about', 'why', 'address',
               'lat', 'lng', 'placeId', 'link', 'been', 'day', 'dayOrder'];
var TEXT_COLUMNS = ['id', 'day'];   // stop Sheets turning ids into numbers and days into dates
// Notes: free text for the trip ("Buy souvenirs at the market"), optionally on a day,
// linked to any number of places (their ids, comma-separated).
var NOTES_SHEET = 'Notes';
var NOTE_COLUMNS = ['id', 'added', 'title', 'text', 'day', 'links'];
var CATEGORIES = ['eat', 'drink', 'see', 'shop', 'outdoors', 'other'];

// ---------------------------------------------------------------- setup

function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    props.setProperty('KEY', key);
  }
  var sheet = getSheet_();
  sheet.setFrozenRows(1);
  // Touch the Maps and UrlFetch services so their permissions get approved now.
  try { Maps.newGeocoder().geocode('Osaka Castle'); } catch (err) {}
  try { UrlFetchApp.fetch('https://www.google.com/robots.txt', { muteHttpExceptions: true }); } catch (err) {}
  Logger.log('Your KEY is:  ' + key);
  Logger.log('Now: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).');
  Logger.log('Then open the Web app URL on your phone: it should say "Your Sheet is reachable".');
}

/** Run this if you ever want a new key (old phones/shortcuts stop working). */
function resetKey() {
  PropertiesService.getScriptProperties().deleteProperty('KEY');
  setup();
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
    PropertiesService.getScriptProperties().deleteProperty('COLUMNS');
  }
  addMissingColumns_(sheet);
  return sheet;
}

// Sheets made by older versions lack newer columns: add them at the end, once.
function addMissingColumns_(sheet) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('COLUMNS') === COLUMNS.join(',')) return;
  var width = Math.max(sheet.getLastColumn(), 1);
  var head = sheet.getRange(1, 1, 1, width).getValues()[0];
  var missing = COLUMNS.filter(function (c) { return head.indexOf(c) < 0; });
  if (missing.length) {
    var start = head[0] === '' ? 1 : width + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
    head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  TEXT_COLUMNS.forEach(function (c) {
    var i = head.indexOf(c);
    if (i >= 0) sheet.getRange(1, i + 1, sheet.getMaxRows(), 1).setNumberFormat('@');
  });
  props.setProperty('COLUMNS', COLUMNS.join(','));
}

// ---------------------------------------------------------------- web entry points

// GET is used two ways:
//  - you open the /exec URL in a browser to check it works (shows a status page);
//  - the app sends requests as ?p=<json>&callback=<name> ("JSONP"). Browsers
//    load that like a script, which dodges the cross-site rules that make
//    Safari report "Load failed".
function doGet(e) {
  var params = (e && e.parameter) || {};
  var req = {};
  if (params.p) { try { req = JSON.parse(params.p); } catch (err) { req = {}; } }
  for (var k in params) if (k !== 'p' && k !== 'callback' && req[k] === undefined) req[k] = params[k];
  if (!req.action && !req.k) req.action = 'ping';
  return respond_(handle_(req), params.callback);
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { body = {}; }
  var params = (e && e.parameter) || {};
  for (var k in params) if (body[k] === undefined) body[k] = params[k];
  return respond_(handle_(body), params.callback);
}

function respond_(obj, callback) {
  var text = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/** A health check that needs no key and shows no data. */
function ping_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (err) {}
  var keySet = !!PropertiesService.getScriptProperties().getProperty('KEY');
  var ready = keySet && !!ss;
  return {
    ok: true, app: 'Trip Pins', version: 8,
    attachedToSheet: !!ss, setupDone: keySet,
    message: ready
      ? 'Your Sheet is reachable. Paste this page\'s address (ending in /exec) and your key into the app.'
      : !ss ? 'This script is not attached to a Google Sheet. Create it from the Sheet: Extensions → Apps Script.'
            : 'Run setup() in the Apps Script editor, then deploy a New version.'
  };
}

function handle_(req) {
  var out;
  try {
    if (req.action === 'ping') return ping_();
    var key = PropertiesService.getScriptProperties().getProperty('KEY');
    if (!key) throw new Error('Run setup() in the Apps Script editor first.');
    if (String(req.k || req.key || '') !== key) {
      return { ok: false, auth: true, error: 'Wrong key.' };
    }

    var action = String(req.action || 'list');
    if (action === 'list') out = { ok: true, items: listItems_(), notes: listNotes_(), settings: getSettings_() };
    else if (action === 'resolve') out = { ok: true, place: resolve_(req.q, req.near || getSettings_().near) };
    else if (action === 'settings') out = { ok: true, settings: saveSettings_(req) };
    else if (action === 'add') out = addItem_(req);
    else if (action === 'update') out = updateItem_(req);
    else if (action === 'delete') out = deleteItem_(req);
    else if (action === 'plan') out = planItems_(req);
    else if (action === 'noteAdd') out = addNote_(req);
    else if (action === 'noteUpdate') out = updateNote_(req);
    else if (action === 'noteDelete') out = deleteNote_(req);
    else throw new Error('Unknown action: ' + action);
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return out;
}

// ---------------------------------------------------------------- shared settings
// Trip name and area live here, so every phone (and the iPhone Shortcut) uses the same ones.

function getSettings_() {
  var p = PropertiesService.getScriptProperties();
  var trip = p.getProperty('TRIP'), near = p.getProperty('NEAR');
  return {
    trip: trip || '', near: near || '',
    start: p.getProperty('START') || '', end: p.getProperty('END') || '',
    // "set" tells a blank value someone chose apart from one nobody has set yet.
    set: trip !== null || near !== null,
    plan: true,   // tells the app this script can store a trip plan
    notes: true   // … and notes
  };
}

function saveSettings_(req) {
  var p = PropertiesService.getScriptProperties();
  if (req.trip !== undefined) p.setProperty('TRIP', String(req.trip).slice(0, 80));
  if (req.near !== undefined) p.setProperty('NEAR', String(req.near).slice(0, 80));
  if (req.start !== undefined) p.setProperty('START', day_(req.start));
  if (req.end !== undefined) p.setProperty('END', day_(req.end));
  return getSettings_();
}

/** A trip date as yyyy-mm-dd, or '' for anything else. */
function day_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v) ? '' : Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  v = String(v == null ? '' : v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

// ---------------------------------------------------------------- data

function listItems_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var head = values.shift() || [];
  return values.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    return clean_(o);
  });
}

function clean_(o) {
  o.id = String(o.id);
  o.lat = o.lat === '' || o.lat == null ? null : Number(o.lat);
  o.lng = o.lng === '' || o.lng == null ? null : Number(o.lng);
  o.been = o.been === true || String(o.been).toUpperCase() === 'TRUE';
  if (o.added instanceof Date) o.added = o.added.toISOString();
  ['name', 'category', 'about', 'why', 'address', 'placeId', 'link'].forEach(function (k) {
    o[k] = o[k] == null ? '' : String(o[k]);
  });
  o.day = day_(o.day);
  o.dayOrder = o.day && o.dayOrder !== '' && o.dayOrder != null ? Number(o.dayOrder) : null;
  return o;
}

function addItem_(req) {
  // The app sends fields it already resolved; a Shortcut sends just q (+ why).
  var place = {};
  if (req.name || req.lat != null && req.lat !== '') {
    place = {
      name: req.name || '', address: req.address || '', about: req.about || '',
      lat: num_(req.lat), lng: num_(req.lng), placeId: req.placeId || '',
      link: req.link || '', category: req.category || ''
    };
  } else if (req.q) {
    place = resolve_(req.q, req.near || getSettings_().near);
  } else {
    throw new Error('Nothing to add: send q (a link or place name).');
  }
  var cat = String(req.category || place.category || 'other').toLowerCase();
  if (CATEGORIES.indexOf(cat) < 0) cat = 'other';

  var item = {
    id: 'p' + Utilities.getUuid().slice(0, 8),  // the letter stops Sheets turning ids into numbers
    added: new Date().toISOString(),
    name: place.name || String(req.q || 'Untitled').slice(0, 80),
    category: cat,
    about: place.about || '',
    why: String(req.why || '').trim(),
    address: place.address || '',
    lat: place.lat, lng: place.lng,
    placeId: place.placeId || '',
    link: place.link || '',
    been: false
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var head = values[0];

    // Two phones (or a phone and the Shortcut) saving the same place: keep one row,
    // and add the new note to it instead of making a duplicate pin.
    for (var r = 1; r < values.length; r++) {
      var o = {};
      head.forEach(function (h, i) { o[h] = values[r][i]; });
      if (o.id === '' || !samePlace_(clean_(o), item)) continue;
      o = clean_(o);
      if (item.why && o.why.indexOf(item.why) < 0) {
        o.why = o.why ? o.why + '\n' + item.why : item.why;
        sheet.getRange(r + 1, head.indexOf('why') + 1).setValue(o.why);
      }
      return { ok: true, item: o, name: o.name, duplicate: true };
    }

    // Write by column name, so reordering or adding columns in the Sheet is safe.
    sheet.appendRow(head.map(function (h) {
      var v = item[h];
      return v == null ? '' : v;
    }));
  } finally { lock.releaseLock(); }
  return { ok: true, item: item, name: item.name };  // "name" at top level helps iOS Shortcuts
}

// Merge only when we're sure: same Google place, or same name and within 100 m,
// or same name and the same shared link. Two "FamilyMart"s without pins stay separate.
function samePlace_(a, b) {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); };
  if (!norm(a.name) || norm(a.name) !== norm(b.name)) return false;
  if (a.lat != null && b.lat != null) return metres_(a, b) < 100;
  return !!a.link && a.link === b.link;
}

function metres_(a, b) {
  var R = 6371e3, rad = Math.PI / 180;
  var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  var h = Math.pow(Math.sin(dLat / 2), 2) +
          Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.pow(Math.sin(dLng / 2), 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function updateItem_(req) {
  var id = String(req.id || '');
  var fields = req.fields || {};
  if (typeof fields === 'string') fields = JSON.parse(fields);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var head = values[0];
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) !== id) continue;
      head.forEach(function (h, i) {
        if (h === 'id' || h === 'added' || !(h in fields)) return;
        var v = fields[h];
        if (h === 'lat' || h === 'lng' || h === 'dayOrder') v = num_(v);
        if (h === 'been') v = v === true || v === 'true';
        if (h === 'day') v = day_(v);
        values[r][i] = v == null ? '' : v;
      });
      sheet.getRange(r + 1, 1, 1, head.length).setValues([values[r]]);
      var o = {};
      head.forEach(function (h, i) { o[h] = values[r][i]; });
      return { ok: true, item: clean_(o) };
    }
  } finally { lock.releaseLock(); }
  return { ok: false, gone: true, error: 'That place was deleted on another phone.' };
}

/**
 * Plan changes in one go: [{ id, day, dayOrder }, …]. A blank day takes the place
 * off the plan. Only the day and dayOrder columns are written, so a note someone
 * is editing on another phone at the same moment is left alone.
 */
function planItems_(req) {
  var changes = req.changes || [];
  if (typeof changes === 'string') changes = JSON.parse(changes);
  var byId = {};
  changes.forEach(function (c) { if (c && c.id != null) byId[String(c.id)] = c; });
  var out = [];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var head = values[0];
    var di = head.indexOf('day'), oi = head.indexOf('dayOrder');
    if (di < 0 || oi < 0) throw new Error('The Sheet has no day columns yet. Reload the app.');
    var dayCol = [], orderCol = [];
    for (var r = 1; r < values.length; r++) {
      var c = byId[String(values[r][0])];
      if (c) {
        values[r][di] = day_(c.day);
        values[r][oi] = values[r][di] ? num_(c.dayOrder) : '';
        if (values[r][oi] == null) values[r][oi] = '';
        var o = {};
        head.forEach(function (h, i) { o[h] = values[r][i]; });
        out.push(clean_(o));
        delete byId[String(values[r][0])];
      }
      dayCol.push([values[r][di]]);
      orderCol.push([values[r][oi]]);
    }
    if (dayCol.length) {
      sheet.getRange(2, di + 1, dayCol.length, 1).setValues(dayCol);
      sheet.getRange(2, oi + 1, orderCol.length, 1).setValues(orderCol);
    }
  } finally { lock.releaseLock(); }
  // Ids left over were deleted on another phone.
  return { ok: true, items: out, gone: Object.keys(byId) };
}

// ---------------------------------------------------------------- notes

function getNotesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(NOTES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(NOTES_SHEET);
    sheet.getRange(1, 1, 1, NOTE_COLUMNS.length).setValues([NOTE_COLUMNS]).setFontWeight('bold');
    ['id', 'day'].forEach(function (c) {
      sheet.getRange(1, NOTE_COLUMNS.indexOf(c) + 1, sheet.getMaxRows(), 1).setNumberFormat('@');
    });
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function listNotes_() {
  var values = getNotesSheet_().getDataRange().getValues();
  var head = values.shift() || [];
  return values.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    return cleanNote_(o);
  });
}

function cleanNote_(o) {
  o.id = String(o.id);
  if (Object.prototype.toString.call(o.added) === '[object Date]') o.added = o.added.toISOString();
  o.added = o.added == null ? '' : String(o.added);
  o.title = o.title == null ? '' : String(o.title);
  o.text = o.text == null ? '' : String(o.text);
  o.day = day_(o.day);
  o.links = links_(o.links);
  return o;
}

// Place ids, comma-separated, no duplicates or junk.
function links_(v) {
  var seen = {};
  return String(v == null ? '' : v).split(',').map(function (s) { return s.trim(); })
    .filter(function (s) { return /^[\w-]{1,40}$/.test(s) && !seen[s] && (seen[s] = true); })
    .join(',').slice(0, 4000);
}

function noteFields_(f) {
  var out = {};
  if (f.title !== undefined) out.title = String(f.title).trim().slice(0, 120);
  if (f.text !== undefined) out.text = String(f.text).trim().slice(0, 4000);
  if (f.day !== undefined) out.day = day_(f.day);
  if (f.links !== undefined) out.links = links_(f.links);
  return out;
}

function addNote_(req) {
  var f = noteFields_(req);
  if (!f.title) throw new Error('A note needs a title.');
  var note = { id: 'n' + Utilities.getUuid().slice(0, 8), added: new Date().toISOString(), text: '', day: '', links: '' };
  for (var k in f) note[k] = f[k];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getNotesSheet_();
    var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(head.map(function (h) { return note[h] == null ? '' : note[h]; }));
  } finally { lock.releaseLock(); }
  return { ok: true, note: note };
}

// Send only the fields that changed, so two phones editing different parts don't clash.
function updateNote_(req) {
  var id = String(req.id || '');
  var fields = req.fields || {};
  if (typeof fields === 'string') fields = JSON.parse(fields);
  var f = noteFields_(fields);
  if (f.title === '') throw new Error('A note needs a title.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getNotesSheet_();
    var values = sheet.getDataRange().getValues();
    var head = values[0];
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) !== id) continue;
      head.forEach(function (h, i) { if (h in f) values[r][i] = f[h]; });
      sheet.getRange(r + 1, 1, 1, head.length).setValues([values[r]]);
      var o = {};
      head.forEach(function (h, i) { o[h] = values[r][i]; });
      return { ok: true, note: cleanNote_(o) };
    }
  } finally { lock.releaseLock(); }
  return { ok: false, gone: true, error: 'That note was deleted on another phone.' };
}

function deleteNote_(req) {
  var id = String(req.id || '');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getNotesSheet_();
    var ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    for (var r = ids.length - 1; r >= 1; r--) {
      if (String(ids[r][0]) === id) { sheet.deleteRow(r + 1); return { ok: true }; }
    }
  } finally { lock.releaseLock(); }
  return { ok: true, alreadyGone: true };
}

function deleteItem_(req) {
  var id = String(req.id || '');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    for (var r = ids.length - 1; r >= 1; r--) {
      if (String(ids[r][0]) === id) { sheet.deleteRow(r + 1); return { ok: true }; }
    }
  } finally { lock.releaseLock(); }
  return { ok: true, alreadyGone: true };
}

/**
 * Run once from the Apps Script editor (pick "repairPins", press Run) to fix places
 * already saved with a wrong pin, such as one in the US on a Japan trip, or with no pin.
 * Each is looked up again from its link, or its name and address. Places it still can't
 * pin lose the wrong pin, so Go searches by name instead. The log lists every change.
 */
function repairPins() {
  var near = getSettings_().near;
  var area = area_(near);
  if (!area) { Logger.log('Set "Where you\'re travelling" in the app\'s Settings first.'); return; }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var head = values[0], col = {};
    head.forEach(function (h, i) { col[h] = i; });
    var fixed = 0;
    for (var r = 1; r < values.length; r++) {
      var o = {};
      head.forEach(function (h, i) { o[h] = values[r][i]; });
      if (o.id === '') continue;
      o = clean_(o);
      if (o.lat != null && !tooFar_(o, area)) continue;
      var src = o.link || [o.name, o.address].filter(String).join('\n');
      if (!src) continue;
      var p = resolve_(src, near);
      var row = values[r];
      row[col.lat] = p.lat == null ? '' : p.lat;
      row[col.lng] = p.lng == null ? '' : p.lng;
      row[col.placeId] = p.placeId || '';          // Go prefers the place ID, so a wrong one must go too
      if (p.address) row[col.address] = p.address;
      var badName = !o.name || /^〒?\d{3}[-−]\d{4}/.test(o.name) ||
                    (o.address && o.address.split(',').pop().trim() === o.name);
      if (p.name && badName) row[col.name] = p.name;
      sheet.getRange(r + 1, 1, 1, head.length).setValues([row]);
      fixed++;
      Logger.log((p.lat == null ? 'No pin found, cleared: ' : 'Fixed: ') + row[col.name] + ' → ' + row[col.address]);
    }
    Logger.log(fixed ? fixed + ' place(s) updated.' : 'Every pin is already near ' + near + '.');
  } finally { lock.releaseLock(); }
}

function num_(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- resolving links & names

/**
 * Turn whatever was shared (a Google Maps link, a Google Search link,
 * shared text, a typed place name, or "lat, lng") into a place.
 */
function resolve_(input, near) {
  input = String(input || '').trim();
  var out = { name: '', address: '', about: '', lat: null, lng: null, placeId: '', link: '', category: '' };
  if (!input) return out;

  var urls = input.match(/https?:\/\/[^\s<>"]+/g) || [];
  var text = input.replace(/https?:\/\/[^\s<>"]+/g, ' ')
                  .split(/\n/).map(function (s) { return s.trim(); })
                  .filter(function (s) { return s && !/^(shared|via|check out)\b/i.test(s); });

  // Typed coordinates: "34.6873, 135.5262"
  var ll = input.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (ll) { out.lat = +ll[1]; out.lng = +ll[2]; }

  if (urls.length) {
    out.link = urls[0];
    var hop = follow_(urls[0]);
    // Every hop can carry clues (name, address, coordinates), so read them all.
    for (var h = hop.hops.length - 1; h >= 0; h--) fromUrl_(hop.hops[h], out);
    if (hop.html) fromHtml_(hop.html, out);
    if (/google\.[^/]+\/maps|maps\.google|goo\.gl|maps\.app/.test(hop.url + urls[0])) {
      // Keep the expanded link: it opens the exact place in Google Maps.
      if (hop.url && hop.url.indexOf('consent.') < 0) out.link = hop.url;
    }
  }

  // Shared text usually starts with the place name.
  if (!out.name && text.length && !ll) out.name = text[0].replace(/^["“]|["”]$/g, '');
  if (!out.address && text.length > 1) out.address = text.slice(1).join(', ');

  // A pin hundreds of km from the trip is a wrong guess, not a place. Drop it and look again.
  var area = area_(near);
  if (out.lat != null && tooFar_(out, area)) { out.lat = null; out.lng = null; }

  // Fill gaps with Google's free Apps Script geocoder, kept inside the trip's country.
  // The address alone pins the exact building; the name is a backup.
  if (out.lat == null && (out.name || out.address)) {
    var nearText = String(near || '').split(',')[0].trim().toLowerCase();
    var withNear = function (q) { return near && q.toLowerCase().indexOf(nearText) < 0 ? q + ', ' + near : q; };
    var tries = [];
    if (out.address) tries.push({ q: out.address, exact: true });
    tries.push({ q: withNear([out.name, out.address].filter(String).join(', ')), exact: !out.name });
    for (var t = 0; t < tries.length; t++) {
      var g = geocode_(tries[t].q, area);
      if (!g) continue;
      out.lat = g.lat; out.lng = g.lng;
      // Google's own wording of the address (e.g. "2-chōme-18-32 Yūnagi, …"), not the share label's.
      if (tries[t].exact || !out.address) out.address = g.address;
      if (!out.placeId) out.placeId = g.placeId;
      out._types = g.types;
      break;
    }
  } else if (out.lat != null && !out.address) {
    var rg = reverseGeocode_(out.lat, out.lng);
    if (rg) out.address = rg;
  }

  // Last resort: the map view of the page Google served. Only trusted near the trip.
  if (out.lat == null && out._approx && area && !tooFar_(out._approx, area)) {
    out.lat = out._approx.lat; out.lng = out._approx.lng;
  }
  delete out._approx;

  if (!out.name && out.address) out.name = out.address.split(',')[0];
  out.category = guessCategory_([out.name, out.about, (out._types || []).join(' ')].join(' '));
  delete out._types;
  return out;
}

/**
 * Where the trip is, from the "Where you're travelling" setting: its centre,
 * its country code (to keep lookups in that country) and its size.
 * Cached for 6 hours, so it costs one geocoder call.
 */
function area_(near) {
  near = String(near || '').trim();
  if (!near) return null;
  var cache = CacheService.getScriptCache(), key = 'area:' + near.toLowerCase().slice(0, 200);
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  try {
    var r = Maps.newGeocoder().setLanguage('en').geocode(near);
    if (r.status !== 'OK' || !r.results.length) return null;
    var g = r.results[0];
    var country = (g.address_components || []).filter(function (c) { return c.types.indexOf('country') >= 0; })[0];
    var vp = g.geometry.viewport;
    var a = {
      lat: g.geometry.location.lat, lng: g.geometry.location.lng,
      region: country ? String(country.short_name).toLowerCase() : '',
      vp: vp || null,
      // A city allows 300 km (day trips); a whole country allows its own size.
      reach: Math.max(300000, vp ? metres_({ lat: vp.southwest.lat, lng: vp.southwest.lng },
                                           { lat: vp.northeast.lat, lng: vp.northeast.lng }) : 0)
    };
    cache.put(key, JSON.stringify(a), 21600);
    return a;
  } catch (err) { return null; }
}

function tooFar_(p, area) {
  return !!area && p.lat != null && metres_(p, area) > area.reach;
}

/** Follow redirects by hand (max 6 hops). Returns the final URL and any HTML. */
function follow_(url) {
  var html = '', hops = [url];
  for (var i = 0; i < 6; i++) {
    // A consent page wraps the real URL in ?continue= — unwrap it and stop.
    if (/consent\.google\./.test(url)) {
      var c = param_(url, 'continue');
      if (c) { url = c; hops.push(url); }
      break;
    }
    var resp;
    try {
      resp = UrlFetchApp.fetch(url, {
        followRedirects: false, muteHttpExceptions: true,
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      });
    } catch (err) { break; }
    var code = resp.getResponseCode();
    if (code >= 300 && code < 400) {
      var h = resp.getAllHeaders();
      var loc = h.Location || h.location;
      if (!loc) break;
      if (Array.isArray(loc)) loc = loc[0];
      if (loc.indexOf('http') !== 0) loc = url.match(/^https?:\/\/[^/]+/)[0] + (loc[0] === '/' ? '' : '/') + loc;
      url = loc;
      hops.push(url);
      continue;
    }
    if (code === 200) html = resp.getContentText().slice(0, 400000);
    break;
  }
  return { url: url, html: html, hops: hops };
}

function fromUrl_(u, out) {
  var d = u;
  try { d = decodeURIComponent(u.replace(/\+/g, ' ')); } catch (err) {}

  // Exact pin: ...!3d34.6652!4d135.5068
  var pins = d.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g);
  if (pins) {
    var m = pins[pins.length - 1].match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    out.lat = +m[1]; out.lng = +m[2];
  }
  // /maps/place/Name/...
  var p = d.match(/\/maps\/place\/([^/@?]+)/);
  if (p && !out.name) {
    var parts = p[1].split(',');
    out.name = parts.shift().trim();
    if (parts.length && !out.address) out.address = parts.join(',').trim();
  }
  // Map centre: /@34.66,135.50,17z (approximate, only if no exact pin)
  if (out.lat == null) {
    var at = d.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) { out.lat = +at[1]; out.lng = +at[2]; }
  }
  // ?q= / ?query= / ?destination= / ?daddr= / ?ll=
  ['q', 'query', 'destination', 'daddr', 'll'].forEach(function (k) {
    var v = param_(u, k);
    if (!v) return;
    var c = v.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (c) { if (out.lat == null) { out.lat = +c[1]; out.lng = +c[2]; } return; }
    if (k === 'll') return;
    var label = splitLabel_(v);
    if (!out.name && label.name) out.name = label.name;
    if (!out.address && label.address && (!label.name || label.name === out.name)) out.address = label.address;
  });
  var pid = param_(u, 'query_place_id') || param_(u, 'destination_place_id');
  if (pid && !out.placeId) out.placeId = pid;
}

/**
 * Split a Google Maps label into name and address. Two shapes turn up:
 *   "Kura Sushi, 2 Chome-18-32 Yunagi, Minato Ward, Osaka, 552-0004, Japan"   (name first)
 *   "552-0021 Osaka, Minato Ward, Chikko, 3 Chome−7−15 9 Borden Coffee"      (Japanese order:
 *    postcode first, the name tacked on after the block number with no comma)
 */
function splitLabel_(label) {
  label = String(label || '').replace(/[‐-―−－]/g, '-').replace(/\s+/g, ' ').trim();
  if (/^〒?\d{3}-\d{4}\b/.test(label)) {
    // Everything up to the last block number ("7-15") is address; what follows (no commas) is the name.
    var m = label.match(/^(.*\d+(?:-\d+)+)\s+([^,]+)$/);
    return m ? { name: m[2].trim(), address: m[1].trim() } : { name: '', address: label };
  }
  var bits = label.split(',');
  return { name: bits.shift().trim(), address: bits.join(',').trim() };
}

function fromHtml_(html, out) {
  // Place pages title themselves "Name · Address". A bare title ("Japan", "Google Maps")
  // describes the map view, not the place, so it's no use as a name.
  var title = meta_(html, 'og:title');
  if (title && title.indexOf(' · ') > 0) {
    var t = title.split(' · ');
    if (!out.name) out.name = t[0].trim();
    if (!out.address) out.address = t.slice(1).join(' · ').trim();
  }
  var desc = meta_(html, 'og:description');
  if (desc && !out.about && desc.length < 140 && desc !== out.address && !/Find local businesses/i.test(desc)) {
    out.about = desc.trim();
  }
  var img = meta_(html, 'og:image') || '';
  var mk = img.match(/markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  if (out.lat == null && mk) { out.lat = +mk[1]; out.lng = +mk[2]; }
  // The map's centre is only where the view happens to be. Apps Script runs on US servers,
  // so a page with no place in it centres on the US. Keep it as a last resort only.
  var ctr = img.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
  var st = html.match(/APP_INITIALIZATION_STATE=\[\[\[-?[\d.]+,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (!out._approx && ctr) out._approx = { lat: +ctr[1], lng: +ctr[2] };
  if (!out._approx && st) out._approx = { lat: +st[2], lng: +st[1] };
}

function meta_(html, prop) {
  var re1 = new RegExp('<meta[^>]+property="' + prop + '"[^>]+content="([^"]*)"', 'i');
  var re2 = new RegExp('<meta[^>]+content="([^"]*)"[^>]+property="' + prop + '"', 'i');
  var m = html.match(re1) || html.match(re2);
  return m ? unescapeHtml_(m[1]) : '';
}

function unescapeHtml_(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); });
}

function param_(url, name) {
  var m = String(url).match(new RegExp('[?&#]' + name + '=([^&#]*)'));
  if (!m) return '';
  try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (err) { return m[1]; }
}

// Without a region, "Kura Sushi" finds the US chain. The region and bounds steer Google
// to the trip's country, and anything still far away is skipped.
function geocode_(q, area) {
  try {
    var gc = Maps.newGeocoder().setLanguage('en');
    if (area && area.region) gc.setRegion(area.region);
    if (area && area.vp) gc.setBounds(area.vp.southwest.lat, area.vp.southwest.lng,
                                      area.vp.northeast.lat, area.vp.northeast.lng);
    var r = gc.geocode(q);
    if (r.status !== 'OK' || !r.results.length) return null;
    for (var i = 0; i < r.results.length; i++) {
      var g = r.results[i];
      var p = { lat: g.geometry.location.lat, lng: g.geometry.location.lng };
      if (tooFar_(p, area)) continue;
      return { lat: p.lat, lng: p.lng, address: g.formatted_address, placeId: g.place_id, types: g.types || [] };
    }
    return null;
  } catch (err) { return null; }
}

function reverseGeocode_(lat, lng) {
  try {
    var r = Maps.newGeocoder().setLanguage('en').reverseGeocode(lat, lng);
    return r.status === 'OK' && r.results.length ? r.results[0].formatted_address : '';
  } catch (err) { return ''; }
}

function guessCategory_(s) {
  s = String(s || '').toLowerCase();
  var rules = [
    ['drink', /\b(bar|pub|izakaya|brewery|brewing|beer|wine|sake|cocktail|coffee|caf[eé]|kissaten|tea ?house|teahouse|roastery|night_club)\b|居酒屋|バー|カフェ|喫茶/],
    ['eat', /\b(restaurant|ramen|sushi|udon|soba|okonomiyaki|takoyaki|kushikatsu|yakitori|yakiniku|tempura|tonkatsu|gyoza|curry|bakery|bistro|diner|food|eatery|kitchen|grill|noodle|dumpling|street food|meal_takeaway|market)\b|ラーメン|寿司|食堂|市場/],
    ['see', /\b(temple|shrine|castle|museum|gallery|tower|palace|monument|observatory|aquarium|theatre|theater|tourist_attraction|place_of_worship|landmark|historic|jinja|dera|ji)\b|寺|神社|城|美術館|博物館/],
    ['outdoors', /\b(park|garden|beach|trail|hike|mountain|lake|river|onsen|hot spring|forest|zoo|viewpoint|natural_feature)\b|公園|庭園|温泉/],
    ['shop', /\b(shop|store|mall|arcade|shotengai|boutique|department|outlet|bookstore|books|record|vintage|shopping_mall|clothing_store)\b|商店街|店/]
  ];
  for (var i = 0; i < rules.length; i++) if (rules[i][1].test(s)) return rules[i][0];
  return 'other';
}
