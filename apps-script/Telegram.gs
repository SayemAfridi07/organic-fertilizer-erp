/**
 * Organic Fertilizer ERP
 * File: Telegram.gs
 * Handles all Telegram notifications and developer error reporting.
 *
 * Credentials (bot token + chat IDs) are NOT hard-coded here — they live
 * in the Settings sheet so they stay out of the codebase and can be changed
 * without touching the script.
 */

// Pull the bot token and chat IDs from the Settings sheet.
// Keeping them in one place means I never have secrets sitting in the code.
function getTelegramSettings() {
  var settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  return {
    token: settings.getRange('J4').getValue(),
    chatIdYou: settings.getRange('J5').getValue(),
    chatIdDad: settings.getRange('J6').getValue()
  };
}

// Send a single message to one chat.
// Using HTML parse mode so I can bold the headings in alerts.
function sendTelegram(chatId, message) {
  var s = getTelegramSettings();
  var url = 'https://api.telegram.org/bot' + s.token + '/sendMessage';
  var options = {
    'method': 'post',
    'payload': {
      'chat_id': String(chatId),
      'text': message,
      'parse_mode': 'HTML'
    },
    'muteHttpExceptions': true
  };
  UrlFetchApp.fetch(url, options);
}

// Broadcast to everyone who should get alerts (owner + optionally his dad).
// The dad's chat ID may be blank, so I guard each send.
function sendToAll(message) {
  var s = getTelegramSettings();
  if (s.chatIdYou) sendTelegram(s.chatIdYou, message);
  if (s.chatIdDad) sendTelegram(s.chatIdDad, message);
}

// Quick manual test to confirm the bot is wired up correctly.
function testTelegram() {
  var s = getTelegramSettings();
  sendTelegram(s.chatIdYou, '✅ Test successful! The alert system is working. 🌱');
}

// If anything in the automation ever crashes, email me the details
// so I can fix it before the owner even notices something went wrong.
function notifyError(functionName, error) {
  var devEmail = 'sayemafridi110abc@gmail.com';
  var subject = '⚠️ Organic Fertilizer ERP — Script Error: ' + functionName;
  var body = 'An error occurred in the system.\n\n' +
             'Function: ' + functionName + '\n' +
             'Error: ' + error.toString() + '\n' +
             'Time: ' + new Date() + '\n\n' +
             'Check the Apps Script execution logs for details.';
  MailApp.sendEmail(devEmail, subject, body);
}
