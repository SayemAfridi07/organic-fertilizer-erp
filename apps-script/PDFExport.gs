/**
 * Organic Fertilizer ERP
 * File: PDFExport.gs
 * Adds a custom spreadsheet menu to export month-filtered PDF reports
 * to Google Drive, organised into one folder per sheet.
 *
 * ACI activity and ACI billing are exported as separate PDFs because
 * they live in different column regions of the same sheet.
 */

// Sheets exported with the standard layout (date in column B, headers in row 3).
var EXPORT_SHEETS = ['Sale', 'Raw Material', 'Production', 'Investment', 'ACI Company'];

// Build the custom menu whenever the spreadsheet opens.
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('📄 PDF Reports');

  EXPORT_SHEETS.forEach(function(name) {
    var sub = ui.createMenu(name);
    sub.addItem('This Month', 'pdf_' + safeId(name) + '_this');
    sub.addItem('Last Month', 'pdf_' + safeId(name) + '_last');
    sub.addItem('Choose Month...', 'pdf_' + safeId(name) + '_choose');
    menu.addSubMenu(sub);
  });

  // ACI Billing is a separate export (different columns).
  var billSub = ui.createMenu('ACI Billing');
  billSub.addItem('This Month', 'pdfBilling_this');
  billSub.addItem('Last Month', 'pdfBilling_last');
  billSub.addItem('Choose Month...', 'pdfBilling_choose');
  menu.addSubMenu(billSub);

  var allSub = ui.createMenu('ALL Sheets');
  allSub.addItem('This Month', 'pdfAll_this');
  allSub.addItem('Last Month', 'pdfAll_last');
  allSub.addItem('Choose Month...', 'pdfAll_choose');
  menu.addSubMenu(allSub);

  menu.addToUi();
}

// Menu item names can't contain spaces, so strip them for the function ids.
function safeId(name) {
  return name.replace(/ /g, '');
}

// ---------- Menu actions (one set per sheet) ----------
function pdf_Sale_this()   { runOne('Sale', 'this'); }
function pdf_Sale_last()   { runOne('Sale', 'last'); }
function pdf_Sale_choose() { runOne('Sale', 'choose'); }
function pdf_RawMaterial_this()   { runOne('Raw Material', 'this'); }
function pdf_RawMaterial_last()   { runOne('Raw Material', 'last'); }
function pdf_RawMaterial_choose() { runOne('Raw Material', 'choose'); }
function pdf_Production_this()   { runOne('Production', 'this'); }
function pdf_Production_last()   { runOne('Production', 'last'); }
function pdf_Production_choose() { runOne('Production', 'choose'); }
function pdf_Investment_this()   { runOne('Investment', 'this'); }
function pdf_Investment_last()   { runOne('Investment', 'last'); }
function pdf_Investment_choose() { runOne('Investment', 'choose'); }
function pdf_ACICompany_this()   { runOne('ACI Company', 'this'); }
function pdf_ACICompany_last()   { runOne('ACI Company', 'last'); }
function pdf_ACICompany_choose() { runOne('ACI Company', 'choose'); }
function pdfBilling_this()   { runBilling('this'); }
function pdfBilling_last()   { runBilling('last'); }
function pdfBilling_choose() { runBilling('choose'); }
function pdfAll_this()   { runAll('this'); }
function pdfAll_last()   { runAll('last'); }
function pdfAll_choose() { runAll('choose'); }

// ---------- Runners ----------
function runOne(sheetName, when) {
  var ym = resolveMonth(when);
  if (!ym) return;
  var folder = getSheetFolder(sheetName);
  var monthDate = new Date(ym.year, ym.month - 1, 1);
  exportSheetForMonth(sheetName, monthDate, folder);
  SpreadsheetApp.getUi().alert('✅ ' + sheetName + ' PDF created for ' +
    Utilities.formatDate(monthDate, 'GMT+6', 'MMMM yyyy') +
    '\n\nDrive: Organic Fertilizer Records → ' + sheetName);
}

function runBilling(when) {
  var ym = resolveMonth(when);
  if (!ym) return;
  var folder = getSheetFolder('ACI Billing');
  var monthDate = new Date(ym.year, ym.month - 1, 1);
  exportBillingForMonth(monthDate, folder);
  SpreadsheetApp.getUi().alert('✅ ACI Billing PDF created for ' +
    Utilities.formatDate(monthDate, 'GMT+6', 'MMMM yyyy') +
    '\n\nDrive: Organic Fertilizer Records → ACI Billing');
}

function runAll(when) {
  var ym = resolveMonth(when);
  if (!ym) return;
  var monthDate = new Date(ym.year, ym.month - 1, 1);
  EXPORT_SHEETS.forEach(function(sheetName) {
    exportSheetForMonth(sheetName, monthDate, getSheetFolder(sheetName));
  });
  exportBillingForMonth(monthDate, getSheetFolder('ACI Billing'));
  SpreadsheetApp.getUi().alert('✅ ALL PDFs created for ' +
    Utilities.formatDate(monthDate, 'GMT+6', 'MMMM yyyy'));
}

// Work out which year/month to export based on the menu choice.
function resolveMonth(when) {
  var now = new Date();
  if (when === 'this') {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  if (when === 'last') {
    var d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  // "Choose Month" — prompt for YYYY-MM.
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Generate PDF', 'Enter month as YYYY-MM (example: 2026-06):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return null;
  var parts = resp.getResponseText().trim().split('-');
  if (parts.length !== 2) { ui.alert('Invalid format. Use YYYY-MM, like 2026-06.'); return null; }
  var year = parseInt(parts[0], 10), month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    ui.alert('Invalid month. Use YYYY-MM, like 2026-06.'); return null;
  }
  return { year: year, month: month };
}

// ---------- Drive folders (one per sheet) ----------
function getSheetFolder(folderName) {
  var main = getOrCreateFolder(DriveApp.getRootFolder(), 'Organic Fertilizer Records');
  return getOrCreateFolder(main, folderName);
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

// ---------- Standard export (date in column B, headers row 3) ----------
function exportSheetForMonth(sheetName, monthDate, folder) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName(sheetName);

  // Build a clean temp sheet holding only this month's rows.
  var tempName = '_temp_' + sheetName;
  var existing = ss.getSheetByName(tempName);
  if (existing) ss.deleteSheet(existing);
  var temp = ss.insertSheet(tempName);

  // For ACI Company, only export the activity columns (A–E), not the billing log.
  var lastCol = (sheetName === 'ACI Company') ? 5 : source.getLastColumn();

  var monthLabel = Utilities.formatDate(monthDate, 'GMT+6', 'MMMM yyyy');
  temp.getRange(1, 1, 1, lastCol).merge();
  temp.getRange('A1')
      .setValue(sheetName + ' — ' + monthLabel)
      .setFontWeight('bold').setFontSize(14)
      .setHorizontalAlignment('center')
      .setBackground('#1e7145').setFontColor('white');
  temp.setRowHeight(1, 30);

  var headers = source.getRange(3, 1, 1, lastCol).getValues();
  temp.getRange(3, 1, 1, lastCol).setValues(headers)
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setBackground('#d9d9d9').setBorder(true, true, true, true, true, true);

  // Copy only the rows whose date (column B) falls in the chosen month.
  var lastRow = source.getLastRow();
  var outRow = 4, copiedRows = 0;
  if (lastRow >= 4) {
    var data = source.getRange(4, 1, lastRow - 3, lastCol).getValues();
    var tM = monthDate.getMonth(), tY = monthDate.getFullYear();
    for (var i = 0; i < data.length; i++) {
      var rowDate = data[i][1];
      if (rowDate instanceof Date && rowDate.getMonth() === tM && rowDate.getFullYear() === tY) {
        temp.getRange(outRow, 1, 1, lastCol).setValues([data[i]]);
        outRow++; copiedRows++;
      }
    }
  }

  if (copiedRows > 0) {
    temp.getRange(4, 1, copiedRows, lastCol)
        .setHorizontalAlignment('center').setBorder(true, true, true, true, true, true);
    temp.getRange(4, 2, copiedRows, 1).setNumberFormat('dd/mm/yyyy');
  } else {
    temp.getRange(4, 1).setValue('No records for this month.').setFontStyle('italic');
  }

  for (var c = 1; c <= lastCol; c++) temp.autoResizeColumn(c);

  SpreadsheetApp.flush();
  folder.createFile(createPDFBlob(ss, temp, sheetName + ' - ' + monthLabel));
  ss.deleteSheet(temp);
}

// ---------- ACI billing export (columns J–O, filtered by Date Completed in K) ----------
function exportBillingForMonth(monthDate, folder) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName('ACI Company');

  var tempName = '_temp_ACIBilling';
  var existing = ss.getSheetByName(tempName);
  if (existing) ss.deleteSheet(existing);
  var temp = ss.insertSheet(tempName);

  var numCols = 6; // J..O

  var monthLabel = Utilities.formatDate(monthDate, 'GMT+6', 'MMMM yyyy');
  temp.getRange(1, 1, 1, numCols).merge();
  temp.getRange('A1')
      .setValue('ACI Billing — ' + monthLabel)
      .setFontWeight('bold').setFontSize(14)
      .setHorizontalAlignment('center')
      .setBackground('#7030a0').setFontColor('white');
  temp.setRowHeight(1, 30);

  var headers = source.getRange(3, 10, 1, numCols).getValues();
  temp.getRange(3, 1, 1, numCols).setValues(headers)
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setBackground('#d9d9d9').setBorder(true, true, true, true, true, true);

  var lastRow = source.getLastRow();
  var outRow = 4, copiedRows = 0;
  if (lastRow >= 4) {
    var data = source.getRange(4, 10, lastRow - 3, numCols).getValues();
    var tM = monthDate.getMonth(), tY = monthDate.getFullYear();
    for (var i = 0; i < data.length; i++) {
      var billNo = data[i][0];   // J
      var dateDone = data[i][1]; // K
      if (billNo === '' || billNo === null) continue;
      if (dateDone instanceof Date && dateDone.getMonth() === tM && dateDone.getFullYear() === tY) {
        temp.getRange(outRow, 1, 1, numCols).setValues([data[i]]);
        outRow++; copiedRows++;
      }
    }
  }

  if (copiedRows > 0) {
    temp.getRange(4, 1, copiedRows, numCols)
        .setHorizontalAlignment('center').setBorder(true, true, true, true, true, true);
    temp.getRange(4, 2, copiedRows, 1).setNumberFormat('dd/mm/yyyy'); // K: Date Completed
    temp.getRange(4, 5, copiedRows, 1).setNumberFormat('dd/mm/yyyy'); // N: Due Date
  } else {
    temp.getRange(4, 1).setValue('No bills for this month.').setFontStyle('italic');
  }

  for (var c = 1; c <= numCols; c++) temp.autoResizeColumn(c);

  SpreadsheetApp.flush();
  folder.createFile(createPDFBlob(ss, temp, 'ACI Billing - ' + monthLabel));
  ss.deleteSheet(temp);
}

// Convert a single sheet to a PDF blob via the spreadsheet export endpoint.
function createPDFBlob(ss, sheet, fileName) {
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?';
  var params = 'format=pdf' +
               '&gid=' + sheet.getSheetId() +
               '&size=A4' +
               '&portrait=true' +
               '&fitw=true' +
               '&gridlines=false' +
               '&printtitle=false' +
               '&sheetnames=false';
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url + params, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  return response.getBlob().setName(fileName + '.pdf');
}
