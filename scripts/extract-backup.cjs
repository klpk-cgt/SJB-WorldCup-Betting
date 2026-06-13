const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backups/db.backup.2026-06-12-210938.json', 'utf8'));

const sections = [
  ['USERS', data.users],
  ['WALLETS', data.wallets],
  ['CARD_INVENTORIES', data.cardInventories],
  ['TRANSACTIONS', data.transactions],
  ['USER_BADGES', data.userBadges],
  ['USER_TITLES', data.userTitles],
  ['CHECKIN_LOGS', data.checkinLogs],
  ['PREDICTIONS', data.predictions],
];

for (const [label, arr] of sections) {
  console.log(`=== ${label} ===`);
  if (!arr || arr.length === 0) {
    console.log('(empty)');
  } else {
    for (const item of arr) {
      console.log(JSON.stringify(item));
    }
  }
}
