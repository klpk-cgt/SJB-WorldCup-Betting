const fs = require('fs');

// Check all backup files for the target users
const files = [
  'backups/db.backup.2026-06-11-225941.json',
  'backups/db.backup.2026-06-12-210727.json',
  'backups/db.backup.2026-06-12-210938.json',
  'prediction-data.json',
];

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const users = data.users || [];
    const names = users.map(u => `${u.id}:${u.displayName}`).join(', ');
    console.log(`${f} => users: ${names || '(empty)'}`);
    
    // Check for specific users
    for (const u of users) {
      if (u.displayName && (u.displayName.includes('白米饭') || u.displayName.includes('林学楠') || u.id === 'user-52d9aa8c')) {
        console.log(`  FOUND: ${JSON.stringify(u)}`);
      }
    }
  } catch (e) {
    console.log(`${f} => ERROR: ${e.message}`);
  }
}
