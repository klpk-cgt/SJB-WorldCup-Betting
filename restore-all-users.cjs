/**
 * 从备份文件恢复所有用户数据到 MySQL
 * 用法: node restore-all-users.cjs
 * 
 * 需要在项目根目录运行，且 .env 中配置了正确的 DATABASE_URL
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const BACKUP_FILE = 'runtime/backups/db.backup.2026-06-13-120800.json';

async function main() {
  // 1. 读取 .env 获取数据库连接
  let dbConfig;
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!dbUrlMatch) {
      console.error('ERROR: Cannot parse DATABASE_URL from .env');
      process.exit(1);
    }
    dbConfig = {
      host: dbUrlMatch[3],
      port: parseInt(dbUrlMatch[4]),
      user: dbUrlMatch[1],
      password: dbUrlMatch[2],
      database: dbUrlMatch[5],
      charset: 'utf8mb4',
    };
    console.log(`[DB] Connecting to: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  } catch (e) {
    console.error('ERROR reading .env:', e.message);
    process.exit(1);
  }

  // 2. 读取备份
  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    console.log(`[Backup] Loaded: ${BACKUP_FILE}`);
  } catch (e) {
    console.error('ERROR reading backup:', e.message);
    process.exit(1);
  }

  const backupUsers = backup.users || [];
  console.log(`[Backup] Users found: ${backupUsers.map(u => u.displayName).join(', ')}`);

  // 3. 连接数据库
  const pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();

  try {
    // 4. 查看现有用户
    const [existingRows] = await conn.query('SELECT id, displayName FROM users');
    const existingIds = new Set(existingRows.map(r => r.id));
    console.log(`[DB] Existing users: ${existingRows.map(r => r.displayName).join(', ') || '(none)'}`);

    // 5. 恢复 users
    let userCount = 0;
    for (const u of backupUsers) {
      if (existingIds.has(u.id)) {
        console.log(`  [SKIP] User ${u.displayName} (${u.id}) already exists`);
        continue;
      }
      await conn.execute(
        'INSERT INTO users (id, groupId, displayName, avatarUrl, loginCode, pinHash, status, claimedAt, lastLoginAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.groupId, u.displayName, u.avatarUrl || '', u.loginCode, u.pinHash, u.status, u.claimedAt || null, u.lastLoginAt || null, u.createdAt]
      );
      console.log(`  [INSERT] User: ${u.displayName} (${u.id})`);
      userCount++;
    }
    console.log(`[Users] Restored: ${userCount}`);

    // 6. 恢复 wallets
    const backupWallets = backup.wallets || [];
    let walletCount = 0;
    for (const w of backupWallets) {
      const userIds = new Set(backupUsers.map(u => u.id));
      if (!userIds.has(w.userId)) continue; // 只恢复备份中的用户
      try {
        await conn.execute(
          'INSERT IGNORE INTO wallets (userId, balance, initialPoints) VALUES (?, ?, ?)',
          [w.userId, w.balance, w.initialPoints]
        );
        walletCount++;
        console.log(`  [INSERT] Wallet: ${w.userId} balance=${w.balance}`);
      } catch (e) {
        console.log(`  [SKIP] Wallet ${w.userId}: ${e.message}`);
      }
    }
    console.log(`[Wallets] Restored: ${walletCount}`);

    // 7. 恢复 transactions
    const backupTransactions = backup.transactions || [];
    let txCount = 0;
    const backupUserIds = new Set(backupUsers.map(u => u.id));
    for (const t of backupTransactions) {
      if (!backupUserIds.has(t.userId)) continue;
      try {
        await conn.execute(
          'INSERT IGNORE INTO transactions (id, userId, type, amount, balanceBefore, balanceAfter, relatedPredictionId, relatedMatchId, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.userId, t.type, t.amount, t.balanceBefore, t.balanceAfter, t.relatedPredictionId || null, t.relatedMatchId || null, t.note, t.createdAt]
        );
        txCount++;
      } catch (e) {
        console.log(`  [SKIP] Transaction ${t.id}: ${e.message}`);
      }
    }
    console.log(`[Transactions] Restored: ${txCount}`);

    // 8. 恢复 predictions
    const backupPredictions = backup.predictions || [];
    let predCount = 0;
    for (const p of backupPredictions) {
      if (!backupUserIds.has(p.userId)) continue;
      try {
        await conn.execute(
          `INSERT IGNORE INTO predictions (id, userId, groupId, matchId, market, optionKey, optionLabel, stakePoints, oddsDecimal, potentialReturn, status, settledReturn, settledProfit, placedAt, settledAt, oddsSnapshot, usedCard, cardEffectNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.userId, p.groupId, p.matchId, p.market, p.optionKey, p.optionLabel, p.stakePoints, p.oddsDecimal, p.potentialReturn, p.status, p.settledReturn ?? null, p.settledProfit ?? null, p.placedAt, p.settledAt || null, JSON.stringify(p.oddsSnapshot || null), p.usedCard || null, p.cardEffectNotes || null]
        );
        predCount++;
      } catch (e) {
        console.log(`  [SKIP] Prediction ${p.id}: ${e.message}`);
      }
    }
    console.log(`[Predictions] Restored: ${predCount}`);

    // 9. 恢复 card_inventories
    const backupCards = backup.cardInventories || [];
    let cardCount = 0;
    for (const c of backupCards) {
      if (!backupUserIds.has(c.userId)) continue;
      try {
        await conn.execute(
          'INSERT IGNORE INTO card_inventories (userId, cards, updatedAt) VALUES (?, ?, ?)',
          [c.userId, JSON.stringify(c.cards), c.updatedAt]
        );
        cardCount++;
      } catch (e) {
        console.log(`  [SKIP] CardInventory ${c.userId}: ${e.message}`);
      }
    }
    console.log(`[CardInventories] Restored: ${cardCount}`);

    // 10. 恢复 user_badges
    const backupBadges = backup.userBadges || [];
    let badgeCount = 0;
    for (const b of backupBadges) {
      if (!backupUserIds.has(b.userId)) continue;
      try {
        await conn.execute(
          'INSERT IGNORE INTO user_badges (userId, badgeId, unlocked, progress, target, unlockedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [b.userId, b.badgeId, b.unlocked ? 1 : 0, b.progress, b.target, b.unlockedAt || null, b.updatedAt]
        );
        badgeCount++;
      } catch (e) {
        console.log(`  [SKIP] Badge ${b.userId}/${b.badgeId}: ${e.message}`);
      }
    }
    console.log(`[UserBadges] Restored: ${badgeCount}`);

    // 11. 恢复 user_titles
    const backupTitles = backup.userTitles || [];
    let titleCount = 0;
    for (const t of backupTitles) {
      if (!backupUserIds.has(t.userId)) continue;
      try {
        await conn.execute(
          'INSERT IGNORE INTO user_titles (userId, title, updatedAt) VALUES (?, ?, ?)',
          [t.userId, t.title, t.updatedAt]
        );
        titleCount++;
      } catch (e) {
        console.log(`  [SKIP] Title ${t.userId}: ${e.message}`);
      }
    }
    console.log(`[UserTitles] Restored: ${titleCount}`);

    // 12. 恢复 checkin_logs
    const backupCheckins = backup.checkinLogs || [];
    let checkinCount = 0;
    for (const c of backupCheckins) {
      if (!backupUserIds.has(c.userId)) continue;
      try {
        await conn.execute(
          'INSERT IGNORE INTO checkin_logs (id, userId, date, createdAt) VALUES (?, ?, ?, ?)',
          [c.id, c.userId, c.date, c.createdAt]
        );
        checkinCount++;
      } catch (e) {
        console.log(`  [SKIP] Checkin ${c.id}: ${e.message}`);
      }
    }
    console.log(`[CheckinLogs] Restored: ${checkinCount}`);

    // 13. 恢复 activities
    const backupActivities = backup.activities || [];
    let actCount = 0;
    for (const a of backupActivities) {
      if (!backupUserIds.has(a.userId)) continue;
      try {
        await conn.execute(
          `INSERT IGNORE INTO activities (id, type, userId, displayName, avatarUrl, message, relatedMatchId, relatedPredictionId, relatedTournamentBetId, deltaPoints, badgeId, badgeLabel, groupId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.type, a.userId, a.displayName, a.avatarUrl || null, a.message, a.relatedMatchId || null, a.relatedPredictionId || null, a.relatedTournamentBetId || null, a.deltaPoints ?? null, a.badgeId || null, a.badgeLabel || null, a.groupId || null, a.createdAt]
        );
        actCount++;
      } catch (e) {
        console.log(`  [SKIP] Activity ${a.id}: ${e.message}`);
      }
    }
    console.log(`[Activities] Restored: ${actCount}`);

    // 14. 恢复 tournament_bets
    const backupBets = backup.tournamentBets || [];
    let betCount = 0;
    for (const b of backupBets) {
      if (!backupUserIds.has(b.userId)) continue;
      try {
        await conn.execute(
          `INSERT IGNORE INTO tournament_bets (id, userId, roomId, type, targetId, targetLabel, targetSubLabel, stakePoints, oddsDecimal, potentialReturn, status, openedAt, lockedAt, placedAt, settledAt, settledReturn, settledProfit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.userId, b.roomId, b.type, b.targetId, b.targetLabel, b.targetSubLabel || null, b.stakePoints, b.oddsDecimal, b.potentialReturn, b.status, b.openedAt, b.lockedAt || null, b.placedAt, b.settledAt || null, b.settledReturn ?? null, b.settledProfit ?? null]
        );
        betCount++;
      } catch (e) {
        console.log(`  [SKIP] TournamentBet ${b.id}: ${e.message}`);
      }
    }
    console.log(`[TournamentBets] Restored: ${betCount}`);

    // 15. 处理现有用户 user-eda01677 (L) 和备份中 user-55f4c47c (L) 的冲突
    const [existingL] = await conn.query('SELECT id, displayName FROM users WHERE id = ?', ['user-eda01677']);
    if (existingL.length > 0) {
      console.log('\n[CONFLICT] Existing user "L" (user-eda01677) found in DB.');
      console.log('  Backup also has "L" (user-55f4c47c). Both will exist with different IDs.');
      console.log('  You can delete user-eda01677 if it was just a test account:');
      console.log('  DELETE FROM users WHERE id = "user-eda01677";');
    }

    // 最终确认
    const [finalUsers] = await conn.query('SELECT id, displayName, status FROM users');
    console.log('\n=== FINAL STATE ===');
    for (const u of finalUsers) {
      const [w] = await conn.query('SELECT balance FROM wallets WHERE userId = ?', [u.id]);
      const bal = w.length > 0 ? w[0].balance : 'N/A';
      console.log(`  ${u.displayName} (${u.id}) - balance: ${bal} - status: ${u.status}`);
    }

    console.log('\n✅ Restore complete!');

  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
