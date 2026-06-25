// 从 SQL 备份提取用户账号信息（id/groupId/displayName/avatarUrl/loginCode/pinHash/status）
// 用法: node extract_users.cjs
const fs = require('fs');

const SQL_PATH = 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_11-22-04_mysql_data_uPRhP.sql';
const OUT_PATH = 'H:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/scripts/extracted_users.json';

const sql = fs.readFileSync(SQL_PATH, 'utf8');

// 定位 users INSERT 语句
const startMarker = 'INSERT INTO `users` VALUES';
const startIdx = sql.indexOf(startMarker);
if (startIdx < 0) {
  console.error('未找到 users INSERT 语句');
  process.exit(1);
}
// 找到该行结束的分号（VALUES 后第一个 ;\n）
const lineEnd = sql.indexOf(';\n', startIdx);
const insertSQL = sql.substring(startIdx, lineEnd + 1);

// 提取 VALUES (...) 部分
const valuesIdx = insertSQL.indexOf('VALUES');
const valuesPart = insertSQL.substring(valuesIdx + 6).trim();

// 解析每行记录：每条记录形如 (v1,v2,...)
// 字段顺序（按 schema）：id, groupId, displayName, avatarUrl, loginCode, pinHash, status, claimedAt, lastLoginAt, createdAt
// 注意 avatarUrl 可能是 base64，包含特殊字符，需用状态机解析
function parseRecords(text) {
  const records = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    // 跳过到第一个 '('
    while (i < n && text[i] !== '(') i++;
    if (i >= n) break;
    i++; // 跳过 '('
    const fields = [];
    while (i < n) {
      // 跳过前导空白
      while (i < n && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) i++;
      if (i >= n) break;
      if (text[i] === ')') {
        i++; // 跳过 ')'
        records.push(fields);
        // 跳过可能的逗号
        while (i < n && (text[i] === ',' || text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t' || text[i] === ';')) i++;
        break;
      }
      if (text[i] === ',') { i++; continue; }
      if (text[i] === '\'') {
        // 字符串字面量
        i++;
        let val = '';
        while (i < n) {
          if (text[i] === '\\' && i + 1 < n) {
            // 转义字符
            const next = text[i + 1];
            if (next === 'n') val += '\n';
            else if (next === 'r') val += '\r';
            else if (next === 't') val += '\t';
            else if (next === '0') val += '\0';
            else if (next === '\\') val += '\\';
            else if (next === '\'') val += '\'';
            else if (next === '"') val += '"';
            else val += next;
            i += 2;
          } else if (text[i] === '\'') {
            i++;
            break;
          } else {
            val += text[i];
            i++;
          }
        }
        fields.push(val);
      } else {
        // 非字符串（数字、NULL 等）
        let val = '';
        while (i < n && text[i] !== ',' && text[i] !== ')') {
          val += text[i];
          i++;
        }
        val = val.trim();
        if (val.toUpperCase() === 'NULL') fields.push(null);
        else fields.push(val);
      }
    }
  }
  return records;
}

const records = parseRecords(valuesPart);
console.log(`共解析 ${records.length} 条用户记录`);

// 转换为对象
const users = records.map((r) => ({
  id: r[0],
  groupId: r[1] || 'room-1',
  displayName: r[2],
  avatarUrl: r[3] || '',
  loginCode: r[4],
  pinHash: r[5] || '',
  status: r[6] || 'CLAIMED',
  claimedAt: r[7] || null,
  lastLoginAt: r[8] || null,
  createdAt: r[9] || new Date().toISOString(),
}));

// 输出摘要
console.log('\n=== 用户列表 ===');
users.forEach((u) => {
  const avatarDesc = u.avatarUrl.startsWith('data:') || u.avatarUrl.length > 50
    ? `[base64 len=${u.avatarUrl.length}]`
    : u.avatarUrl;
  console.log(`${u.loginCode} | ${u.displayName} | avatar: ${avatarDesc}`);
});

fs.writeFileSync(OUT_PATH, JSON.stringify(users, null, 2), 'utf8');
console.log(`\n已保存到: ${OUT_PATH}`);
