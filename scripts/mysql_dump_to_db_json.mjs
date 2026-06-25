/**
 * MySQL dump → db.json 转换器
 * 将 mysqldump 导出的 SQL 文件转换为本地 SQLite 使用的 db.json 格式
 * 用法: node scripts/mysql_dump_to_db_json.mjs <sql文件路径>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SQL_PATH = process.argv[2];
if (!SQL_PATH) {
  console.log('用法: node scripts/mysql_dump_to_db_json.mjs <sql文件路径>');
  process.exit(1);
}

// ====== 表结构定义（列顺序与 MySQL dump 对应） ======

const TABLE_SCHEMAS = {
  rooms: ['id', 'name', 'slug', 'inviteCode', 'description', 'isActive', 'createdAt'],
  users: ['id', 'groupId', 'displayName', 'avatarUrl', 'loginCode', 'pinHash', 'status', 'claimedAt', 'lastLoginAt', 'createdAt'],
  wallets: ['userId', 'balance', 'initialPoints'],
  transactions: ['id', 'userId', 'type', 'amount', 'balanceBefore', 'balanceAfter', 'relatedPredictionId', 'relatedMatchId', 'note', 'createdAt'],
  teams: ['id', 'name', 'nameZh', 'code', 'logoUrl', 'groupName', 'fifaRank', 'confederation', 'coachName', 'coachNationality', 'formation', 'worldCupAppearances', 'bestResult', 'bestResultYear', 'qualificationStatus', 'qualificationMethod', 'qualificationGroup', 'qualificationRecord', 'qualificationKeyPlayers', 'profileSummary', 'heroPlayerNames', 'primaryColor', 'secondaryColor', 'marketValueMillion'],
  matches: ['id', 'homeTeamId', 'awayTeamId', 'stage', 'roundName', 'venueName', 'venueCity', 'startTimeUtc', 'startTimeBeijing', 'status', 'homeScore', 'awayScore', 'homePenaltyScore', 'awayPenaltyScore', 'winnerTeamId', 'isOddsFrozen', 'oddsFrozenAt', 'isPredictionLocked', 'predictionLockedAt', 'isSettled', 'settledAt', 'statistics', 'lineups', 'events', 'providerMeta', 'scoreUnknown', 'operationalStatus', 'settlementStatus', 'autoLockAt', 'lastStatusComputedAt'],
  match_odds: ['matchId', 'h2hHomeWin', 'h2hDraw', 'h2hAwayWin', 'correctScore', 'correctScoreSource', 'totalGoalsOver25', 'totalGoalsUnder25', 'qualifyHome', 'qualifyAway', 'lastUpdated', 'source', 'syncStatus', 'lastSyncedAt'],
  predictions: ['id', 'userId', 'groupId', 'matchId', 'market', 'optionKey', 'optionLabel', 'stakePoints', 'oddsDecimal', 'potentialReturn', 'status', 'settledReturn', 'settledProfit', 'placedAt', 'settledAt', 'oddsSnapshot', 'usedCard', 'cardEffectNotes'],
  tournament_bets: ['id', 'userId', 'roomId', 'type', 'targetId', 'targetLabel', 'targetSubLabel', 'stakePoints', 'oddsDecimal', 'potentialReturn', 'status', 'openedAt', 'lockedAt', 'placedAt', 'settledAt', 'settledReturn', 'settledProfit'],
  ai_contents: ['id', 'type', 'matchId', 'predictionId', 'title', 'content', 'model', 'createdAt', 'provider', 'summary', 'bullets', 'riskWarning', 'fallbackUsed', 'contentType', 'scopeType', 'scopeId', 'promptVersion', 'dataVersion', 'enhancementMode', 'predictionJson', 'outputJson', 'inputSnapshotJson', 'searchEnhanced', 'multimodalEnhanced', 'status', 'expiresAt', 'cacheKey', 'headline', 'highlights', 'funTags', 'roomId'],
  share_cards: ['id', 'userId', 'predictionId', 'matchId', 'mode', 'text', 'imageDataUrl', 'provider', 'model', 'fallbackUsed', 'createdAt', 'debugMeta'],
  sync_logs: ['id', 'source', 'action', 'status', 'requestSummary', 'responseSummary', 'errorMessage', 'createdAt', 'syncType', 'targetMatchId', 'targetDate', 'startedAt', 'finishedAt'],
  admin_overrides: ['id', 'adminUser', 'targetType', 'targetId', 'action', 'beforeJson', 'afterJson', 'reason', 'createdAt'],
  players: ['id', 'teamId', 'name', 'nameZh', 'shirtNumber', 'position', 'club', 'age', 'heightCm', 'weightKg', 'preferredFoot', 'marketValue', 'avatarUrl', 'isCaptain', 'bioSummary'],
  team_history: ['id', 'teamId', 'year', 'host', 'result', 'matchesPlayed', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'note'],
  activities: ['id', 'type', 'userId', 'displayName', 'avatarUrl', 'message', 'relatedMatchId', 'relatedPredictionId', 'relatedTournamentBetId', 'deltaPoints', 'badgeId', 'badgeLabel', 'groupId', 'createdAt'],
  user_badges: ['userId', 'badgeId', 'unlocked', 'progress', 'target', 'unlockedAt', 'updatedAt'],
  user_titles: ['userId', 'title', 'updatedAt'],
  card_inventories: ['userId', 'cards', 'updatedAt'],
  admin_sessions: ['token', 'expiresAt'],
  checkin_logs: ['id', 'userId', 'date', 'createdAt'],
  quiz_logs: ['id', 'userId', 'date', 'questionIds', 'selectedIndex', 'correctCount', 'pointsEarned', 'createdAt'],
};

// ====== 类型转换函数 ======

function parseValue(val, colName) {
  if (val === 'NULL') return null;

  // 字符串值
  if (val.startsWith("'") && val.endsWith("'")) {
    const inner = val.slice(1, -1);
    // 处理转义
    return inner.replace(/\\"/g, '"').replace(/''/g, "'").replace(/\\\\/g, '\\');
  }

  // 数字
  const num = Number(val);
  if (!isNaN(num)) return num;

  // 布尔值 (MySQL 用 0/1)
  if (val === '1' || val === '0') {
    // 某些字段应该是布尔
    const boolFields = ['isActive', 'isOddsFrozen', 'isPredictionLocked', 'isSettled', 'scoreUnknown', 'fallbackUsed', 'searchEnhanced', 'multimodalEnhanced', 'isCaptain', 'unlocked'];
    if (boolFields.includes(colName)) return val === '1';
    return num;
  }

  return val;
}

function parseRow(rawRow, columns) {
  const obj = {};
  const values = splitRow(rawRow);
  for (let i = 0; i < columns.length; i++) {
    if (i >= values.length) {
      obj[columns[i]] = null;
      continue;
    }
    const val = parseValue(values[i], columns[i]);
    // JSON 字段特殊处理
    const jsonFields = ['heroPlayerNames', 'statistics', 'lineups', 'events', 'providerMeta', 'correctScore',
      'oddsSnapshot', 'bullets', 'predictionJson', 'outputJson', 'inputSnapshotJson', 'highlights', 'funTags',
      'debugMeta', 'cards', 'questionIds'];
    if (jsonFields.includes(columns[i]) && typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try { obj[columns[i]] = JSON.parse(val); } catch { obj[columns[i]] = val; }
    } else {
      obj[columns[i]] = val;
    }
  }
  return obj;
}

/**
 * 分割一行 VALUES 为多个值，正确处理引号内的逗号
 */
function splitRow(row) {
  const vals = [];
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === "'") {
      inQuote = !inQuote;
      current += ch;
      continue;
    }
    if (ch === ',' && !inQuote) {
      vals.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) vals.push(current.trim());
  return vals;
}

/**
 * 提取 INSERT 语句中的所有值行
 */
function extractValues(insertSql) {
  // 找到 VALUES 关键字后的内容
  const valuesMatch = insertSql.match(/VALUES\s+/i);
  if (!valuesMatch) return [];

  const valuesPart = insertSql.slice(valuesMatch.index + valuesMatch[0].length);
  // 移除末尾分号
  const clean = valuesPart.replace(/;\s*$/, '');

  // 分割多个 (..),(..) 元组
  const rows = [];
  let depth = 0;
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (escaped) { current += ch; escaped = false; continue; }
    if (ch === '\\') { current += ch; escaped = true; continue; }
    if (ch === "'" && !escaped) { inQuote = !inQuote; current += ch; continue; }
    if (ch === '(' && !inQuote) {
      if (depth === 0) current = '';
      else current += ch;
      depth++;
      continue;
    }
    if (ch === ')' && !inQuote) {
      depth--;
      if (depth === 0) {
        rows.push(current.trim());
        current = '';
        // 跳过逗号
        continue;
      }
      current += ch;
      continue;
    }
    if (depth > 0) current += ch;
  }

  return rows;
}

// ====== 主转换逻辑 ======

function convert(sqlContent) {
  const result = {};

  // 去掉 CREATE TABLE 和 DROP TABLE 等非 INSERT 语句
  // 提取每个 INSERT INTO 语句
  const tableRegex = /INSERT INTO `(\w+)`\s+VALUES\s+([\s\S]*?);\s*(?:\/\*|UNLOCK|$)/g;
  let match;

  while ((match = tableRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const valuesSql = match[0]; // 完整 INSERT 语句

    const columns = TABLE_SCHEMAS[tableName];
    if (!columns) {
      console.warn(`警告：未知表名 "${tableName}"，跳过`);
      continue;
    }

    const rawRows = extractValues(valuesSql);
    console.log(`  解析 ${tableName}: ${rawRows.length} 行`);

    const parsedRows = rawRows.map(row => parseRow(row, columns));

    // match_odds 转为对象格式 (keyed by matchId)
    if (tableName === 'match_odds') {
      result.matchOdds = {};
      for (const row of parsedRows) {
        const { matchId, ...rest } = row;
        result.matchOdds[matchId] = { matchId, ...rest };
      }
    } else {
      // 蛇形转驼峰
      const camelKey = tableName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = parsedRows;
    }
  }

  return result;
}

// ====== 字段名映射（MySQL snake_case → JS camelCase） ======
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys(obj) {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
      newObj[toCamelCase(k)] = convertKeys(v);
    }
    return newObj;
  }
  return obj;
}

// ====== 主程序 ======

const sqlContent = fs.readFileSync(SQL_PATH, 'utf-8');
console.log(`读取 SQL 文件: ${SQL_PATH} (${(sqlContent.length / 1024).toFixed(1)} KB)`);
console.log();

const db = convert(sqlContent);

// 添加辅助字段（如果缺失）
db.tournamentBets = db.tournamentBets || [];
db.shareCards = db.shareCards || [];
db.adminOverrides = db.adminOverrides || [];
db.cardInventories = db.cardInventories || [];
db.userTitles = db.userTitles || [];
db.adminSessions = db.adminSessions || [];
db.checkinLog = db.checkinLog || [];
db.quizLogs = db.quizLogs || [];
db.postMatchReports = db.postMatchReports || [];
db.worldCupStandings = db.worldCupStandings || {};
db.bracketState = db.bracketState || { generatedAt: new Date().toISOString(), rounds: [] };

console.log();
console.log('===== 转换完成 =====');
console.log(`rooms:            ${db.rooms?.length || 0}`);
console.log(`users:            ${db.users?.length || 0}`);
console.log(`wallets:          ${db.wallets?.length || 0}`);
console.log(`transactions:     ${db.transactions?.length || 0}`);
console.log(`teams:            ${db.teams?.length || 0}`);
console.log(`matches:          ${db.matches?.length || 0}`);
console.log(`matchOdds:        ${Object.keys(db.matchOdds || {}).length}`);
console.log(`predictions:      ${db.predictions?.length || 0}`);
console.log(`aiContents:       ${db.aiContents?.length || 0}`);
console.log(`syncLogs:         ${db.syncLogs?.length || 0}`);
console.log(`activities:       ${db.activities?.length || 0}`);
console.log(`userBadges:       ${db.userBadges?.length || 0}`);
console.log(`players:          ${db.players?.length || 0}`);
console.log(`teamHistory:      ${db.teamHistory?.length || 0}`);

// 输出到项目根目录的 db.json
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const finalPath = path.join(projectDir, 'db.json');
fs.writeFileSync(finalPath, JSON.stringify(db, null, 2), 'utf-8');
console.log();
console.log(`已写入: ${finalPath} (${(fs.statSync(finalPath).size / 1024).toFixed(1)} KB)`);
