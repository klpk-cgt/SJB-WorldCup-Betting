/**
 * JSON → MySQL 数据迁移脚本
 * 用法: node migrate-json-to-mysql.cjs
 */
const fs = require('fs');

// 读取 .env.production 获取数据库连接信息
const envContent = fs.readFileSync('.env.production', 'utf-8');
const databaseUrl = envContent.match(/DATABASE_URL="(.+)"/)?.[1];
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found in .env.production');
  process.exit(1);
}

// 解析 DATABASE_URL: mysql://user:pass@host:port/db
const match = databaseUrl.match(/mysql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error('ERROR: Cannot parse DATABASE_URL');
  process.exit(1);
}
const [, user, password, host, port, db] = match;

console.log('========================================');
console.log('  JSON → MySQL Migration');
console.log('========================================');
console.log(`  DB: ${db} @ ${host}:${port}`);
console.log(`  User: ${user}`);
console.log('========================================\n');

// 读取 JSON 数据
const dbFile = './db.json';
if (!fs.existsSync(dbFile)) {
  console.error(`ERROR: ${dbFile} not found`);
  process.exit(1);
}

let rawData;
try {
  rawData = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  console.log(`Loaded ${dbFile} successfully`);
} catch (e) {
  console.error('ERROR: Failed to parse db.json:', e.message);
  process.exit(1);
}

// 数据分组
const collections = {
  rooms: rawData.rooms || [],
  users: rawData.users || [],
  wallets: rawData.wallets || [],
  transactions: rawData.transactions || [],
  teams: rawData.teams || [],
  players: rawData.players || [],
  team_histories: rawData.teamHistories || [],
  matches: rawData.matches || [],
  match_odds: Object.values(rawData.matchOdds || {}),
  predictions: rawData.predictions || [],
  tournament_bets: rawData.tournamentBets || [],
  ai_contents: rawData.aiContents || [],
  share_cards: rawData.shareCards || [],
  sync_logs: rawData.syncLogs || [],
  admin_overrides: rawData.adminOverrides || [],
  activities: rawData.activities || [],
  user_badges: rawData.userBadges || [],
  user_titles: rawData.userTitles || [],
  card_inventories: rawData.cardInventories || [],
  admin_sessions: [],
  checkin_logs: rawData.checkinLogs || [],
};

// MySQL 转义函数
function escapeStr(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function escapeJson(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return `'${val.replace(/'/g, "''")}'`;
    } catch {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    }
  }
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
}

// 表字段映射
const tableColumns = {
  rooms: ['id', 'name', 'slug', 'inviteCode', 'description', 'isActive', 'createdAt'],
  users: ['id', 'groupId', 'displayName', 'avatarUrl', 'loginCode', 'pinHash', 'status', 'claimedAt', 'lastLoginAt', 'createdAt'],
  wallets: ['userId', 'balance', 'initialPoints'],
  transactions: ['id', 'userId', 'type', 'amount', 'balanceBefore', 'balanceAfter', 'relatedPredictionId', 'relatedMatchId', 'note', 'createdAt'],
  teams: ['id', 'name', 'nameZh', 'code', 'logoUrl', 'groupName', 'fifaRank', 'confederation', 'coachName', 'coachNationality', 'formation', 'worldCupAppearances', 'bestResult', 'bestResultYear', 'qualificationStatus', 'qualificationMethod', 'qualificationGroup', 'qualificationRecord', 'qualificationKeyPlayers', 'profileSummary', 'heroPlayerNames', 'primaryColor', 'secondaryColor', 'marketValueMillion'],
  players: ['id', 'teamId', 'name', 'nameZh', 'shirtNumber', 'position', 'club', 'age', 'heightCm', 'weightKg', 'preferredFoot', 'marketValue', 'avatarUrl', 'isCaptain', 'bioSummary'],
  team_histories: ['id', 'teamId', 'year', 'host', 'result', 'matchesPlayed', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'note'],
  matches: ['id', 'homeTeamId', 'awayTeamId', 'stage', 'roundName', 'venueName', 'venueCity', 'startTimeUtc', 'startTimeBeijing', 'status', 'homeScore', 'awayScore', 'homePenaltyScore', 'awayPenaltyScore', 'winnerTeamId', 'isOddsFrozen', 'oddsFrozenAt', 'isPredictionLocked', 'predictionLockedAt', 'isSettled', 'settledAt', 'statistics', 'lineups', 'events', 'providerMeta', 'operationalStatus', 'settlementStatus', 'autoLockAt', 'lastStatusComputedAt'],
  match_odds: ['matchId', 'h2hHomeWin', 'h2hDraw', 'h2hAwayWin', 'correctScore', 'totalGoalsOver25', 'totalGoalsUnder25', 'qualifyHome', 'qualifyAway', 'lastUpdated', 'source', 'syncStatus', 'lastSyncedAt'],
  predictions: ['id', 'userId', 'groupId', 'matchId', 'market', 'optionKey', 'optionLabel', 'stakePoints', 'oddsDecimal', 'potentialReturn', 'status', 'settledReturn', 'settledProfit', 'placedAt', 'settledAt', 'oddsSnapshot', 'usedCard', 'cardEffectNotes'],
  tournament_bets: ['id', 'userId', 'roomId', 'type', 'targetId', 'targetLabel', 'targetSubLabel', 'stakePoints', 'oddsDecimal', 'potentialReturn', 'status', 'openedAt', 'lockedAt', 'placedAt', 'settledAt', 'settledReturn', 'settledProfit'],
  ai_contents: ['id', 'type', 'matchId', 'predictionId', 'title', 'content', 'model', 'createdAt', 'provider', 'summary', 'bullets', 'riskWarning', 'fallbackUsed', 'contentType', 'scopeType', 'scopeId', 'promptVersion', 'dataVersion', 'enhancementMode', 'predictionJson', 'outputJson', 'inputSnapshotJson', 'searchEnhanced', 'multimodalEnhanced', 'status', 'expiresAt', 'cacheKey', 'headline', 'highlights', 'funTags', 'roomId'],
  share_cards: ['id', 'userId', 'predictionId', 'matchId', 'mode', 'text', 'imageDataUrl', 'provider', 'model', 'fallbackUsed', 'createdAt', 'debugMeta'],
  sync_logs: ['id', 'source', 'action', 'status', 'requestSummary', 'responseSummary', 'errorMessage', 'createdAt', 'syncType', 'targetMatchId', 'targetDate', 'startedAt', 'finishedAt'],
  admin_overrides: ['id', 'adminUser', 'targetType', 'targetId', 'action', 'beforeJson', 'afterJson', 'reason', 'createdAt'],
  activities: ['id', 'type', 'userId', 'displayName', 'avatarUrl', 'message', 'relatedMatchId', 'relatedPredictionId', 'relatedTournamentBetId', 'deltaPoints', 'badgeId', 'badgeLabel', 'groupId', 'createdAt'],
  user_badges: ['userId', 'badgeId', 'unlocked', 'progress', 'target', 'unlockedAt', 'updatedAt'],
  user_titles: ['userId', 'title', 'updatedAt'],
  card_inventories: ['userId', 'cards', 'updatedAt'],
  admin_sessions: ['token', 'expiresAt'],
  checkin_logs: ['id', 'userId', 'date', 'createdAt'],
};

const jsonFields = new Set([
  'statistics', 'lineups', 'events', 'providerMeta',
  'correctScore', 'oddsSnapshot', 'debugMeta',
  'bullets', 'predictionJson', 'outputJson', 'inputSnapshotJson', 'highlights', 'funTags',
  'heroPlayerNames', 'cards'
]);

// 生成 SQL
const sqlLines = [];
sqlLines.push('-- World Cup Betting Platform - JSON to MySQL Migration');
sqlLines.push('-- Generated: ' + new Date().toISOString());
sqlLines.push('');
sqlLines.push('SET NAMES utf8mb4;');
sqlLines.push('SET FOREIGN_KEY_CHECKS=0;');
sqlLines.push('');

let totalRows = 0;

for (const [table, rows] of Object.entries(collections)) {
  if (rows.length === 0) {
    console.log(`  SKIP ${table} (empty)`);
    continue;
  }

  const columns = tableColumns[table];
  if (!columns) {
    console.log(`  WARN ${table} - no column mapping, skipping`);
    continue;
  }

  console.log(`  Processing ${table}: ${rows.length} rows`);

  sqlLines.push(`TRUNCATE TABLE \`${table}\`;`);

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesList = batch.map(row => {
      const vals = columns.map(col => {
        const val = row[col];
        if (jsonFields.has(col)) return escapeJson(val);
        return escapeStr(val);
      });
      return `(${vals.join(',')})`;
    });

    const colList = columns.map(c => `\`${c}\``).join(',');
    sqlLines.push(`INSERT INTO \`${table}\` (${colList}) VALUES`);
    sqlLines.push(valuesList.join(',\n') + ';');
    sqlLines.push('');
  }

  totalRows += rows.length;
}

sqlLines.push('SET FOREIGN_KEY_CHECKS=1;');

const sqlFile = './migration_data.sql';
fs.writeFileSync(sqlFile, sqlLines.join('\n'), 'utf-8');

console.log('\n========================================');
console.log(`  Migration SQL generated: ${sqlFile}`);
console.log(`  Total rows: ${totalRows}`);
console.log(`  File size: ${(fs.statSync(sqlFile).size / 1024 / 1024).toFixed(2)} MB`);
console.log('========================================');
console.log('\nNext steps:');
console.log('1. Upload migration_data.sql to your server');
console.log('2. Run: mysql -u SJB_1 -p SJB < migration_data.sql');
console.log('3. On server: npx prisma db push');
