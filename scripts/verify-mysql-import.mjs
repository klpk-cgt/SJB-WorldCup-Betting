import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function buildSummary(snapshot) {
  return {
    rooms: Array.isArray(snapshot.rooms) ? snapshot.rooms.length : 0,
    users: Array.isArray(snapshot.users) ? snapshot.users.length : 0,
    wallets: Array.isArray(snapshot.wallets) ? snapshot.wallets.length : 0,
    transactions: Array.isArray(snapshot.transactions) ? snapshot.transactions.length : 0,
    teams: Array.isArray(snapshot.teams) ? snapshot.teams.length : 0,
    matches: Array.isArray(snapshot.matches) ? snapshot.matches.length : 0,
    matchOdds: snapshot.matchOdds ? Object.keys(snapshot.matchOdds).length : 0,
    predictions: Array.isArray(snapshot.predictions) ? snapshot.predictions.length : 0,
    tournamentBets: Array.isArray(snapshot.tournamentBets) ? snapshot.tournamentBets.length : 0,
    aiContents: Array.isArray(snapshot.aiContents) ? snapshot.aiContents.length : 0,
    shareCards: Array.isArray(snapshot.shareCards) ? snapshot.shareCards.length : 0,
    syncLogs: Array.isArray(snapshot.syncLogs) ? snapshot.syncLogs.length : 0,
    adminOverrides: Array.isArray(snapshot.adminOverrides) ? snapshot.adminOverrides.length : 0,
    players: Array.isArray(snapshot.players) ? snapshot.players.length : 0,
    teamHistory: Array.isArray(snapshot.teamHistory) ? snapshot.teamHistory.length : 0,
    activities: Array.isArray(snapshot.activities) ? snapshot.activities.length : 0,
    userBadges: Array.isArray(snapshot.userBadges) ? snapshot.userBadges.length : 0,
    cardInventories: Array.isArray(snapshot.cardInventories) ? snapshot.cardInventories.length : 0,
    userTitles: Array.isArray(snapshot.userTitles) ? snapshot.userTitles.length : 0,
    adminSessions: Array.isArray(snapshot.adminSessions) ? snapshot.adminSessions.length : 0,
    checkinLog: Array.isArray(snapshot.checkinLog) ? snapshot.checkinLog.length : 0,
  };
}

const projectRoot = process.cwd();
const dataDir = process.env.APP_DATA_DIR
  ? path.resolve(projectRoot, process.env.APP_DATA_DIR)
  : projectRoot;
const dbJsonPath = process.env.IMPORT_DB_JSON_PATH
  ? path.resolve(projectRoot, process.env.IMPORT_DB_JSON_PATH)
  : path.join(dataDir, 'db.json');
const storageScript = path.join(projectRoot, 'scripts', 'db-storage.mjs');

if (!fs.existsSync(dbJsonPath)) {
  throw new Error(`db.json not found: ${dbJsonPath}`);
}

const fileSummary = buildSummary(JSON.parse(fs.readFileSync(dbJsonPath, 'utf8')));
const mysqlResult = spawnSync(process.execPath, [storageScript, 'summary'], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (mysqlResult.status !== 0) {
  process.stderr.write(mysqlResult.stderr || mysqlResult.stdout || 'Unable to read MySQL summary.\n');
  process.exit(mysqlResult.status ?? 1);
}

const mysqlSummary = JSON.parse(mysqlResult.stdout);
const mismatches = Object.keys(fileSummary).filter((key) => fileSummary[key] !== mysqlSummary[key]);

process.stdout.write(JSON.stringify({
  ok: mismatches.length === 0,
  fileSummary,
  mysqlSummary,
  mismatches,
}, null, 2));

if (mismatches.length > 0) {
  process.exit(1);
}
