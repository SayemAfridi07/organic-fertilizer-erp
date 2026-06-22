/**
 * Organic Fertilizer ERP
 * File: ScheduledAlerts.gs
 * Time-based alerts that run once a day via a daily trigger.
 */

// Daily entry point (wrapped so any failure emails me).
function dailyCheck() {
  try {
    checkACIPaymentDue();    // any bill with exactly 7 days left?
    checkMonthlyReminders(); // on the 1st: customer + supplier dues
  } catch (err) {
    notifyError('dailyCheck', err);
  }
}

// ---------- ACI PAYMENT DUE (fires once when 7 days remain) ----------
function checkACIPaymentDue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aci = ss.getSheetByName('ACI Company');

  // Billing log: J=BillNo, K=Date, L=Amount, M=Status, N=DueDate
  var data = aci.getRange('J4:N1000').getValues();
  var props = PropertiesService.getScriptProperties();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 0; i < data.length; i++) {
    var billNo = data[i][0];   // J
    var status = data[i][3];   // M
    var dueDate = data[i][4];  // N

    if (billNo === '' || billNo === null) continue; // empty row
    if (status === 'Complete') continue;            // already paid
    if (!(dueDate instanceof Date)) continue;       // no valid due date

    var due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    var daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));

    // One reminder per bill, exactly at the 7-day mark.
    if (daysLeft === 7) {
      var flagKey = 'aciDue7_' + billNo;
      if (props.getProperty(flagKey) !== 'sent') {
        var amount = data[i][2]; // L
        var msg = '⏰ <b>ACI Payment Due Soon</b>\n' +
                  'Bill No: ' + billNo + '\n' +
                  'Amount: ৳' + Number(amount).toLocaleString() + '\n' +
                  'Due in 7 days (' + Utilities.formatDate(due, 'GMT+6', 'dd MMM yyyy') + ')';
        sendToAll(msg);
        props.setProperty(flagKey, 'sent');
      }
    }
  }
}

// ---------- MONTHLY REMINDERS (only on the 1st of the month) ----------
function checkMonthlyReminders() {
  var today = new Date();
  if (today.getDate() !== 1) return; // skip on every other day

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // What customers still owe (sum of the Sale "Due" column).
  var sale = ss.getSheetByName('Sale');
  var customerDue = 0;
  var saleDue = sale.getRange('L4:L1000').getValues();
  for (var i = 0; i < saleDue.length; i++) {
    customerDue += Number(saleDue[i][0]) || 0;
  }

  // What we still owe suppliers (sum of the Raw Material "Due" column).
  var raw = ss.getSheetByName('Raw Material');
  var supplierDue = 0;
  var rawDue = raw.getRange('J4:J1000').getValues();
  for (var i = 0; i < rawDue.length; i++) {
    supplierDue += Number(rawDue[i][0]) || 0;
  }

  if (customerDue > 0) {
    sendToAll('💰 <b>Customer Due Reminder</b>\n' +
              'Customers owe you: ৳' + customerDue.toLocaleString() + '\n' +
              'Time to collect!');
  }

  if (supplierDue > 0) {
    sendToAll('💳 <b>Supplier Due Reminder</b>\n' +
              'You owe suppliers: ৳' + supplierDue.toLocaleString() + '\n' +
              'Time to pay!');
  }
}
