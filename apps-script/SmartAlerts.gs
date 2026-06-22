/**
 * Organic Fertilizer ERP
 * File: SmartAlerts.gs
 * Condition-based alerts that run after every form submission.
 *
 * These use PropertiesService as persistent "flags" so each alert fires
 * once per event instead of repeating on every submission.
 */

// Called by the router after each new entry.
function checkSmartAlerts() {
  checkLowStock();
  checkACIBillReady();
}

// ---------- LOW STOCK (fires once, re-arms when stock recovers) ----------
function checkLowStock() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var production = ss.getSheetByName('Production');
  var settings = ss.getSheetByName('Settings');

  var available = production.getRange('H6').getValue(); // available fertilizer (kg)
  var limit = settings.getRange('B8').getValue();       // low-stock threshold

  var props = PropertiesService.getScriptProperties();
  var alreadyWarned = props.getProperty('lowStockWarned');

  if (available <= limit) {
    // Only alert once while we stay below the limit.
    if (alreadyWarned !== 'yes') {
      var bags = Math.round(available / 40);
      var msg = '⚠️ <b>LOW FERTILIZER STOCK</b>\n' +
                'Available: ' + available + ' kg (' + bags + ' bags)\n' +
                'Time to produce more!';
      sendToAll(msg);
      props.setProperty('lowStockWarned', 'yes');
    }
  } else {
    // Stock recovered — clear the flag so it can warn again next time.
    props.deleteProperty('lowStockWarned');
  }
}

// ---------- ACI BILL READY (fires once per new 50-ton batch) ----------
function checkACIBillReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aci = ss.getSheetByName('ACI Company');
  var settings = ss.getSheetByName('Settings');

  // Total delivered bags -> tons -> how many full 50-ton batches exist.
  var data = aci.getRange('C4:D1000').getValues();
  var deliveredBags = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'Delivered') {
      deliveredBags += Number(data[i][1]) || 0;
    }
  }
  var tons = deliveredBags * 40 / 1000;
  var batches = Math.floor(tons / 50);

  var props = PropertiesService.getScriptProperties();
  var lastBatch = Number(props.getProperty('aciBatchCount')) || 0;

  if (batches > lastBatch) {
    // A new batch crossed the 50-ton line — time to bill ACI.
    var rate = settings.getRange('B7').getValue();
    var billAmount = Math.round(50 * rate);
    var msg = '🚚 <b>ACI BILL READY!</b>\n' +
              'Batch #' + batches + ' complete (50 tons)\n' +
              'Bill: ৳' + billAmount.toLocaleString() + '\n' +
              'Submit bill to ACI for payment.';
    sendToAll(msg);
    props.setProperty('aciBatchCount', String(batches));
  } else if (batches < lastBatch) {
    // Safety: if data was reduced, keep the stored count in sync.
    props.setProperty('aciBatchCount', String(batches));
  }
}
