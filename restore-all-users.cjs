/**
 * 从备份文件恢复所有用户数据到 MySQL (使用 Prisma)
 * 用法: node restore-all-users.cjs
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const BACKUP_FILE = 'runtime/backups/db.backup.2026-06-13-120800.json';
const prisma = new PrismaClient();

function esc(val) {
  if (val === undefined || val === null) return null;
  return String(val);
}

async function main() {
  // 1. 读取备份
  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    console.log(`[Backup] Loaded: ${BACKUP_FILE}`);
  } catch (e) {
    console.error('ERROR reading backup:', e.message);
    process.exit(1);
  }

  const backupUsers = backup.users || [];
  const backupUserIds = new Set(backupUsers.map(u => u.id));
  console.log(`[Backup] Users: ${backupUsers.map(u => u.displayName).join(', ')}`);

  // 2. 查看现有用户
  const existingUsers = await prisma.user.findMany({ select: { id: true, displayName: true } });
  const existingIds = new Set(existingUsers.map(u => u.id));
  console.log(`[DB] Existing users: ${existingUsers.map(u => u.displayName).join(', ') || '(none)'}`);

  // 3. 恢复 users
  let userCount = 0;
  for (const u of backupUsers) {
    if (existingIds.has(u.id)) {
      console.log(`  [SKIP] User ${u.displayName} already exists`);
      continue;
    }
    await prisma.user.create({
      data: {
        id: u.id,
        groupId: u.groupId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl || '',
        loginCode: u.loginCode,
        pinHash: u.pinHash,
        status: u.status,
        claimedAt: esc(u.claimedAt),
        lastLoginAt: esc(u.lastLoginAt),
        createdAt: u.createdAt,
      }
    });
    console.log(`  [INSERT] User: ${u.displayName} (${u.id})`);
    userCount++;
  }
  console.log(`[Users] Restored: ${userCount}`);

  // 4. 恢复 wallets
  let walletCount = 0;
  for (const w of (backup.wallets || [])) {
    if (!backupUserIds.has(w.userId)) continue;
    try {
      await prisma.wallet.create({
        data: { userId: w.userId, balance: w.balance, initialPoints: w.initialPoints }
      });
      walletCount++;
      console.log(`  [INSERT] Wallet: ${w.userId} balance=${w.balance}`);
    } catch (e) {
      console.log(`  [SKIP] Wallet ${w.userId}: ${e.message}`);
    }
  }
  console.log(`[Wallets] Restored: ${walletCount}`);

  // 5. 恢复 transactions
  let txCount = 0;
  for (const t of (backup.transactions || [])) {
    if (!backupUserIds.has(t.userId)) continue;
    try {
      await prisma.transaction.create({
        data: {
          id: t.id, userId: t.userId, type: t.type, amount: t.amount,
          balanceBefore: t.balanceBefore, balanceAfter: t.balanceAfter,
          relatedPredictionId: esc(t.relatedPredictionId),
          relatedMatchId: esc(t.relatedMatchId),
          note: t.note, createdAt: t.createdAt,
        }
      });
      txCount++;
    } catch (e) {
      console.log(`  [SKIP] TX ${t.id}: ${e.message}`);
    }
  }
  console.log(`[Transactions] Restored: ${txCount}`);

  // 6. 恢复 predictions
  let predCount = 0;
  for (const p of (backup.predictions || [])) {
    if (!backupUserIds.has(p.userId)) continue;
    try {
      await prisma.prediction.create({
        data: {
          id: p.id, userId: p.userId, groupId: p.groupId, matchId: p.matchId,
          market: p.market, optionKey: p.optionKey, optionLabel: p.optionLabel,
          stakePoints: p.stakePoints, oddsDecimal: p.oddsDecimal,
          potentialReturn: p.potentialReturn, status: p.status,
          settledReturn: p.settledReturn ?? null,
          settledProfit: p.settledProfit ?? null,
          placedAt: p.placedAt, settledAt: esc(p.settledAt),
          oddsSnapshot: p.oddsSnapshot || null,
          usedCard: esc(p.usedCard), cardEffectNotes: esc(p.cardEffectNotes),
        }
      });
      predCount++;
    } catch (e) {
      console.log(`  [SKIP] Pred ${p.id}: ${e.message}`);
    }
  }
  console.log(`[Predictions] Restored: ${predCount}`);

  // 7. 恢复 card_inventories
  let cardCount = 0;
  for (const c of (backup.cardInventories || [])) {
    if (!backupUserIds.has(c.userId)) continue;
    try {
      await prisma.cardInventory.create({
        data: { userId: c.userId, cards: c.cards, updatedAt: c.updatedAt }
      });
      cardCount++;
    } catch (e) {
      console.log(`  [SKIP] Card ${c.userId}: ${e.message}`);
    }
  }
  console.log(`[CardInventories] Restored: ${cardCount}`);

  // 8. 恢复 user_badges
  let badgeCount = 0;
  for (const b of (backup.userBadges || [])) {
    if (!backupUserIds.has(b.userId)) continue;
    try {
      await prisma.userBadge.create({
        data: {
          userId: b.userId, badgeId: b.badgeId, unlocked: b.unlocked,
          progress: b.progress, target: b.target,
          unlockedAt: esc(b.unlockedAt), updatedAt: b.updatedAt,
        }
      });
      badgeCount++;
    } catch (e) {
      console.log(`  [SKIP] Badge ${b.userId}/${b.badgeId}: ${e.message}`);
    }
  }
  console.log(`[UserBadges] Restored: ${badgeCount}`);

  // 9. 恢复 user_titles
  let titleCount = 0;
  for (const t of (backup.userTitles || [])) {
    if (!backupUserIds.has(t.userId)) continue;
    try {
      await prisma.userTitle.create({
        data: { userId: t.userId, title: t.title, updatedAt: t.updatedAt }
      });
      titleCount++;
    } catch (e) {
      console.log(`  [SKIP] Title ${t.userId}: ${e.message}`);
    }
  }
  console.log(`[UserTitles] Restored: ${titleCount}`);

  // 10. 恢复 checkin_logs
  let checkinCount = 0;
  for (const c of (backup.checkinLogs || [])) {
    if (!backupUserIds.has(c.userId)) continue;
    try {
      await prisma.checkinLog.create({
        data: { id: c.id, userId: c.userId, date: c.date, createdAt: c.createdAt }
      });
      checkinCount++;
    } catch (e) {
      console.log(`  [SKIP] Checkin ${c.id}: ${e.message}`);
    }
  }
  console.log(`[CheckinLogs] Restored: ${checkinCount}`);

  // 11. 恢复 activities
  let actCount = 0;
  for (const a of (backup.activities || [])) {
    if (!backupUserIds.has(a.userId)) continue;
    try {
      await prisma.activity.create({
        data: {
          id: a.id, type: a.type, userId: a.userId, displayName: a.displayName,
          avatarUrl: esc(a.avatarUrl), message: a.message,
          relatedMatchId: esc(a.relatedMatchId),
          relatedPredictionId: esc(a.relatedPredictionId),
          relatedTournamentBetId: esc(a.relatedTournamentBetId),
          deltaPoints: a.deltaPoints ?? null,
          badgeId: esc(a.badgeId), badgeLabel: esc(a.badgeLabel),
          groupId: esc(a.groupId), createdAt: a.createdAt,
        }
      });
      actCount++;
    } catch (e) {
      console.log(`  [SKIP] Activity ${a.id}: ${e.message}`);
    }
  }
  console.log(`[Activities] Restored: ${actCount}`);

  // 12. 恢复 tournament_bets
  let betCount = 0;
  for (const b of (backup.tournamentBets || [])) {
    if (!backupUserIds.has(b.userId)) continue;
    try {
      await prisma.tournamentBet.create({
        data: {
          id: b.id, userId: b.userId, roomId: b.roomId, type: b.type,
          targetId: b.targetId, targetLabel: b.targetLabel,
          targetSubLabel: esc(b.targetSubLabel),
          stakePoints: b.stakePoints, oddsDecimal: b.oddsDecimal,
          potentialReturn: b.potentialReturn, status: b.status,
          openedAt: b.openedAt, lockedAt: esc(b.lockedAt),
          placedAt: b.placedAt, settledAt: esc(b.settledAt),
          settledReturn: b.settledReturn ?? null,
          settledProfit: b.settledProfit ?? null,
        }
      });
      betCount++;
    } catch (e) {
      console.log(`  [SKIP] Bet ${b.id}: ${e.message}`);
    }
  }
  console.log(`[TournamentBets] Restored: ${betCount}`);

  // 最终确认
  const finalUsers = await prisma.user.findMany({ select: { id: true, displayName: true } });
  console.log('\n=== FINAL STATE ===');
  for (const u of finalUsers) {
    const w = await prisma.wallet.findUnique({ where: { userId: u.id } });
    console.log(`  ${u.displayName} (${u.id}) - balance: ${w ? w.balance : 'N/A'}`);
  }

  console.log('\n✅ Restore complete!');
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
