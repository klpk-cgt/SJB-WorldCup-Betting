/**
 * 从 SQL dump 导入用户到本地 MySQL
 * 仅导入账号信息（id/name/avatar/loginCode/pinHash），不导入预测/交易
 */
const fs = require('fs');

const SQL_PATH = 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_11-22-04_mysql_data_uPRhP.sql';

const sql = fs.readFileSync(SQL_PATH, 'utf8');

// 提取 users INSERT
const userStart = sql.indexOf("INSERT INTO `users` VALUES");
const userEnd = sql.indexOf(";\n", userStart) + 1;
const userSQL = sql.substring(userStart, userEnd);

// 解析 VALUES 元组
function splitRows(valuesPart) {
  const rows = [];
  let depth = 0, current = '', inQ = false, esc = false;
  for (let i = 0; i < valuesPart.length; i++) {
    const c = valuesPart[i];
    if (esc) { current += c; esc = false; continue; }
    if (c === '\\') { current += c; esc = true; continue; }
    if (c === "'" && !esc) { inQ = !inQ; current += c; continue; }
    if (c === '(' && !inQ) {
      if (depth === 0) current = '';
      else current += c;
      depth++;
      continue;
    }
    if (c === ')' && !inQ) {
      depth--;
      if (depth === 0) { rows.push(current); }
      continue;
    }
    if (depth > 0) current += c;
  }
  return rows;
}

function splitCols(row) {
  const cols = [];
  let cur = '', inQ = false, esc = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (esc) { cur += c; esc = false; continue; }
    if (c === '\\') { cur += c; esc = true; continue; }
    if (c === "'") { inQ = !inQ; cur += c; continue; }
    if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) cols.push(cur.trim());
  return cols;
}

function parseVal(v) {
  if (v === 'NULL') return null;
  if (v.startsWith("'") && v.endsWith("'")) {
    const inner = v.slice(1, -1);
    return inner.replace(/\\"/g, '"').replace(/''/g, "'").replace(/\\\\/g, '\\');
  }
  const n = Number(v);
  if (!isNaN(n)) return n;
  return v;
}

const COLUMNS = ['id', 'groupId', 'displayName', 'avatarUrl', 'loginCode', 'pinHash', 'status', 'claimedAt', 'lastLoginAt', 'createdAt'];

const valuesMatch = userSQL.match(/VALUES\s+(.+)/s);
if (!valuesMatch) { console.log('Cannot find VALUES'); process.exit(1); }

const valuesPart = valuesMatch[1].replace(/;\s*$/, '').trim();
const rawRows = splitRows(valuesPart);
console.log(`Found ${rawRows.length} users in SQL dump`);

const users = rawRows.map(row => {
  const vals = splitCols(row);
  const obj = {};
  COLUMNS.forEach((col, i) => {
    obj[col] = parseVal(vals[i]);
  });
  return obj;
});

// 过滤掉 seed 用户 (u1-u5)
const realUsers = users.filter(u => !u.id.match(/^u[1-5]$/i));
console.log(`Real users (non-seed): ${realUsers.length}`);
realUsers.forEach(u => {
  console.log(`  ${u.id} | ${u.loginCode} | ${u.displayName} | avatar:${u.avatarUrl ? (u.avatarUrl.length > 30 ? 'base64(' + u.avatarUrl.length + ')' : u.avatarUrl) : 'emoji'}`);
});

// 生成 SQL 插入语句
async function importUsers() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // 1. 删除旧 seed 用户 (u1-u5) 及其关联数据
    console.log('\n--- Cleaning old seed users ---');
    const seedIds = ['u1', 'u2', 'u3', 'u4', 'u5'];
    for (const id of seedIds) {
      await prisma.prediction.deleteMany({ where: { userId: id } });
      await prisma.transaction.deleteMany({ where: { userId: id } });
      await prisma.activity.deleteMany({ where: { userId: id } });
      await prisma.userBadge.deleteMany({ where: { userId: id } });
      await prisma.checkinLog.deleteMany({ where: { userId: id } });
      await prisma.quizLog.deleteMany({ where: { userId: id } });
      await prisma.wallet.deleteMany({ where: { userId: id } });
      await prisma.userTitle.deleteMany({ where: { userId: id } });
      await prisma.cardInventory.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
      console.log(`  Deleted seed user: ${id}`);
    }

    // 2. 导入真实用户（仅用户信息 + 钱包初始化10000积分）
    console.log('\n--- Importing real users ---');
    let imported = 0;
    for (const u of realUsers) {
      // 检查用户是否已存在
      const existing = await prisma.user.findUnique({ where: { id: u.id } });
      if (existing) {
        console.log(`  Skip existing: ${u.id} (${u.displayName})`);
        continue;
      }

      await prisma.user.create({
        data: {
          id: u.id,
          groupId: u.groupId || 'room-1',
          displayName: u.displayName,
          avatarUrl: u.avatarUrl || '⚽',
          loginCode: u.loginCode,
          pinHash: u.pinHash,
          status: 'CLAIMED',
          claimedAt: u.claimedAt || new Date().toISOString(),
          createdAt: u.createdAt || new Date().toISOString(),
        },
      });

      // 创建钱包（10000初始积分）
      await prisma.wallet.create({
        data: {
          userId: u.id,
          balance: 10000,
          initialPoints: 10000,
        },
      });

      // 创建初始交易记录
      await prisma.transaction.create({
        data: {
          id: `t-init-${u.id}`,
          userId: u.id,
          type: 'INITIAL_GRANT',
          amount: 10000,
          balanceBefore: 0,
          balanceAfter: 10000,
          note: '系统初始娱乐积分赠送',
          createdAt: new Date().toISOString(),
        },
      });

      imported++;
      console.log(`  Imported: ${u.id} | ${u.loginCode} | ${u.displayName}`);
    }

    console.log(`\nDone! Imported ${imported} users.`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

importUsers();
