/**
 * Organic Fertilizer ERP
 * File: FormSync.gs
 * Moves Google Form submissions into clean data sheets, then fires alerts.
 *
 * Design note: a spreadsheet "on form submit" trigger fires for EVERY linked
 * form, not just one. So instead of one trigger per form (which would run all
 * handlers on every submission and scramble the data), I use a single router
 * that checks which Responses tab received the data and dispatches to the
 * correct handler. One trigger -> this router -> the right handler only.
 */

// ===================== ROUTER =====================
// The single entry point. Wrapped in try/catch so any failure emails me
// instead of failing silently.
function onAnyFormSubmit(e) {
  try {
    var sheetName = e.range.getSheet().getName();

    if (sheetName === 'Sale Responses') {
      onSaleFormSubmit(e);
    } else if (sheetName === 'Raw Material Responses') {
      onRawMaterialFormSubmit(e);
    } else if (sheetName === 'Production Responses') {
      onProductionFormSubmit(e);
    } else if (sheetName === 'Investment Responses') {
      onInvestmentFormSubmit(e);
    } else if (sheetName === 'ACI Responses') {
      onACIFormSubmit(e);
    } else if (sheetName === 'ACI Bill Responses') {
      onACIBillFormSubmit(e);
    }

    checkSmartAlerts(); // after any new data, re-check stock + ACI conditions
  } catch (err) {
    notifyError('onAnyFormSubmit', err);
  }
}

// Find the next empty row by locating the last real ID in column A.
// I can't use getLastRow() here because the formula columns are filled down
// to row 1000, which would make new rows land past the actual data.
function findNewRow(sheet) {
  var ids = sheet.getRange('A4:A1000').getValues();
  var lastDataRow = 3; // data starts at row 4
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] !== '' && ids[i][0] !== null) {
      lastDataRow = i + 4;
    }
  }
  return lastDataRow + 1;
}

// ===================== SALE =====================
function onSaleFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sale');
  var v = e.values; // [Timestamp, Date, Customer, Address, Product, PackSize, Quantity, Rate, Collection]
  var newRow = findNewRow(sheet);
  var newId = newRow - 3;

  sheet.getRange(newRow, 1).setValue(newId);   // A: ID
  sheet.getRange(newRow, 2).setValue(v[1]);    // B: Date
  sheet.getRange(newRow, 3).setValue(v[2]);    // C: Customer
  sheet.getRange(newRow, 4).setValue(v[3]);    // D: Address
  sheet.getRange(newRow, 5).setValue(v[4]);    // E: Product
  sheet.getRange(newRow, 6).setValue(v[5]);    // F: Pack Size
  sheet.getRange(newRow, 7).setValue(v[6]);    // G: Quantity
  sheet.getRange(newRow, 9).setValue(v[7]);    // I: Rate
  sheet.getRange(newRow, 11).setValue(v[8]);   // K: Collection

  // Copy the calculation formulas (Weight, Total, Due) down from the row 4 template.
  sheet.getRange('H4').copyTo(sheet.getRange(newRow, 8));
  sheet.getRange('J4').copyTo(sheet.getRange(newRow, 10));
  sheet.getRange('L4').copyTo(sheet.getRange(newRow, 12));

  SpreadsheetApp.flush(); // force the formulas to calculate before I read them
  var total = sheet.getRange(newRow, 10).getValue();
  var due = sheet.getRange(newRow, 12).getValue();
  var msg = '🛒 <b>New Sale</b>\n' +
            'Customer: ' + v[2] + '\n' +
            'Amount: ৳' + total.toLocaleString() + '\n' +
            'Due: ৳' + due.toLocaleString();
  sendToAll(msg);
}

// ===================== RAW MATERIAL =====================
function onRawMaterialFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Raw Material');
  var v = e.values; // [Timestamp, Date, Supplier, Product, BagWeight, NoOfBags, TotalAmount, Payment]
  var newRow = findNewRow(sheet);
  var newId = newRow - 3;

  sheet.getRange(newRow, 1).setValue(newId);   // A: ID
  sheet.getRange(newRow, 2).setValue(v[1]);    // B: Date
  sheet.getRange(newRow, 3).setValue(v[2]);    // C: Supplier
  sheet.getRange(newRow, 4).setValue(v[3]);    // D: Product
  sheet.getRange(newRow, 5).setValue(v[4]);    // E: Bag Weight
  sheet.getRange(newRow, 6).setValue(v[5]);    // F: No. of Bags
  sheet.getRange(newRow, 8).setValue(v[6]);    // H: Total Amount
  sheet.getRange(newRow, 9).setValue(v[7]);    // I: Payment

  sheet.getRange('G4').copyTo(sheet.getRange(newRow, 7));  // G: Total Weight
  sheet.getRange('J4').copyTo(sheet.getRange(newRow, 10)); // J: Due

  SpreadsheetApp.flush();
  var amount = v[6];
  var due = sheet.getRange(newRow, 10).getValue();
  var msg = '📦 <b>New Raw Material</b>\n' +
            'Supplier: ' + v[2] + '\n' +
            'Product: ' + v[3] + '\n' +
            'Amount: ৳' + Number(amount).toLocaleString() + '\n' +
            'Due: ৳' + due.toLocaleString();
  sendToAll(msg);
}

// ===================== PRODUCTION =====================
function onProductionFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Production');
  var v = e.values; // [Timestamp, Date, BagsProduced, Note]
  var newRow = findNewRow(sheet);
  var newId = newRow - 3;

  sheet.getRange(newRow, 1).setValue(newId);   // A: ID
  sheet.getRange(newRow, 2).setValue(v[1]);    // B: Date
  sheet.getRange(newRow, 3).setValue(v[2]);    // C: Bags Produced
  sheet.getRange(newRow, 5).setValue(v[3]);    // E: Note

  sheet.getRange('D4').copyTo(sheet.getRange(newRow, 4)); // D: Total Weight (bags × 40)

  SpreadsheetApp.flush();
  var bags = v[2];
  var weight = sheet.getRange(newRow, 4).getValue();
  var msg = '🏭 <b>New Production</b>\n' +
            'Bags: ' + bags + '\n' +
            'Weight: ' + weight + ' kg';
  sendToAll(msg);
}

// ===================== INVESTMENT =====================
function onInvestmentFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Investment');
  var v = e.values; // [Timestamp, Date, ItemName, Type, Value]
  var newRow = findNewRow(sheet);
  var newId = newRow - 3;

  sheet.getRange(newRow, 1).setValue(newId);   // A: ID
  sheet.getRange(newRow, 2).setValue(v[1]);    // B: Date
  sheet.getRange(newRow, 3).setValue(v[2]);    // C: Item Name
  sheet.getRange(newRow, 4).setValue(v[3]);    // D: Type
  sheet.getRange(newRow, 5).setValue(v[4]);    // E: Value

  SpreadsheetApp.flush();
  var msg = '💵 <b>New Investment</b>\n' +
            'Item: ' + v[2] + '\n' +
            'Type: ' + v[3] + '\n' +
            'Value: ৳' + Number(v[4]).toLocaleString();
  sendToAll(msg);
}

// ===================== ACI ACTIVITY =====================
function onACIFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACI Company');
  var v = e.values; // [Timestamp, Date, Activity, Quantity, Note]
  var newRow = findNewRow(sheet);
  var newId = newRow - 3;

  sheet.getRange(newRow, 1).setValue(newId);   // A: ID
  sheet.getRange(newRow, 2).setValue(v[1]);    // B: Date
  sheet.getRange(newRow, 3).setValue(v[2]);    // C: Activity (Received/Filled/Delivered)
  sheet.getRange(newRow, 4).setValue(v[3]);    // D: Quantity
  sheet.getRange(newRow, 5).setValue(v[4]);    // E: Note

  SpreadsheetApp.flush();
  var msg = '🚚 <b>New ACI Activity</b>\n' +
            'Activity: ' + v[2] + '\n' +
            'Quantity: ' + v[3] + ' bags';
  sendToAll(msg);
}

// ===================== ACI BILL =====================
// Two actions share one form: submitting a new bill, or recording a payment.
function onACIBillFormSubmit(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aci = ss.getSheetByName('ACI Company');
  var settings = ss.getSheetByName('Settings');
  var v = e.values; // [Timestamp, Activity, BillNo, Date, Tons]

  var activity = v[1];
  var billNo = String(v[2]).trim();
  var date = v[3];
  var tons = Number(v[4]) || 50;

  if (activity === 'Bill Submitted') {
    createBill(aci, settings, billNo, date, tons);
  } else if (activity === 'Payment Received') {
    markBillPaid(aci, billNo);
  }
}

// Create a new bill row (status Pending) with an auto 45-day due date.
function createBill(aci, settings, billNo, date, tons) {
  // Find the next empty billing row by the last Bill No. in column J.
  var bills = aci.getRange('J4:J1000').getValues();
  var lastRow = 3;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i][0] !== '' && bills[i][0] !== null) {
      lastRow = i + 4;
    }
  }
  var newRow = lastRow + 1;

  var rate = settings.getRange('B7').getValue();         // net rate per ton (from Settings)
  var paymentDays = settings.getRange('B10').getValue(); // payment terms in days
  var billAmount = Math.round(tons * rate);              // round to avoid float noise

  aci.getRange(newRow, 10).setValue(billNo);     // J: Bill No.
  aci.getRange(newRow, 11).setValue(date);       // K: Date Completed
  aci.getRange(newRow, 12).setValue(billAmount); // L: Bill amount
  aci.getRange(newRow, 13).setValue('Pending');  // M: Status

  // Due date = completion date + the payment window.
  var dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + Number(paymentDays));
  aci.getRange(newRow, 14).setValue(dueDate);    // N: Due Date

  // Days-left formula. TRIM guards against a stray space in the status value.
  aci.getRange(newRow, 15).setFormula(
    '=IF(N' + newRow + '="","",IF(TRIM(M' + newRow + ')="Complete","Paid ✅",N' + newRow + '-TODAY()))'
  ); // O: Days Left

  var msg = '🧾 <b>ACI Bill Created</b>\n' +
            'Bill No: ' + billNo + '\n' +
            'Tons: ' + tons + '\n' +
            'Amount: ৳' + billAmount.toLocaleString() + '\n' +
            'Due in ' + paymentDays + ' days';
  sendToAll(msg);
}

// Find a bill by its number and mark it Complete. Warn if it isn't found.
function markBillPaid(aci, billNo) {
  var bills = aci.getRange('J4:J1000').getValues();
  var foundRow = -1;
  for (var i = 0; i < bills.length; i++) {
    if (String(bills[i][0]).trim() === billNo) {
      foundRow = i + 4;
      break;
    }
  }

  if (foundRow === -1) {
    sendToAll('⚠️ <b>Bill Not Found</b>\n' +
              'Could not find Bill No: ' + billNo + '\n' +
              'Please check the number.');
    return;
  }

  aci.getRange(foundRow, 13).setValue('Complete'); // M: Status

  var amount = aci.getRange(foundRow, 12).getValue();
  var msg = '💰 <b>ACI Payment Received</b>\n' +
            'Bill No: ' + billNo + '\n' +
            'Amount: ৳' + Number(amount).toLocaleString() + '\n' +
            'Status: Complete ✅';
  sendToAll(msg);
}
