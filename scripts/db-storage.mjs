import fs from 'fs';
import path from 'path';
import process from 'process';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeStdoutJson(value) {
  process.stdout.write(JSON.stringify(value, null, 2));
}

function roundPoints(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function normalizeCheckinLog(rows) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.userId || !row.date) continue;
    unique.set(`${row.userId}::${row.date}`, row);
  }
  return Array.from(unique.values());
}

async function createPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  // 确保 MySQL 连接使用 utf8mb4 字符集
  await prisma.$executeRawUnsafe('SET NAMES utf8mb4');
  return prisma;
}

function normalizeSnapshot(snapshot) {
  return {
    rooms: Array.isArray(snapshot.rooms) ? snapshot.rooms : [],
    users: Array.isArray(snapshot.users) ? snapshot.users : [],
    wallets: Array.isArray(snapshot.wallets)
      ? snapshot.wallets.map((wallet) => ({
          ...wallet,
          balance: roundPoints(wallet.balance),
          initialPoints: roundPoints(wallet.initialPoints),
        }))
      : [],
    transactions: Array.isArray(snapshot.transactions)
      ? snapshot.transactions.map((transaction) => ({
          ...transaction,
          amount: roundPoints(transaction.amount),
          balanceBefore: roundPoints(transaction.balanceBefore),
          balanceAfter: roundPoints(transaction.balanceAfter),
        }))
      : [],
    teams: Array.isArray(snapshot.teams) ? snapshot.teams : [],
    matches: Array.isArray(snapshot.matches)
      ? [...snapshot.matches].sort((a, b) => String(a.startTimeUtc || '').localeCompare(String(b.startTimeUtc || '')))
      : [],
    matchOdds: snapshot.matchOdds && typeof snapshot.matchOdds === 'object' ? snapshot.matchOdds : {},
    predictions: Array.isArray(snapshot.predictions)
      ? snapshot.predictions.map((prediction) => ({
          ...prediction,
          stakePoints: roundPoints(prediction.stakePoints),
          potentialReturn: roundPoints(prediction.potentialReturn),
          settledReturn:
            typeof prediction.settledReturn === 'number' ? roundPoints(prediction.settledReturn) : prediction.settledReturn,
          settledProfit:
            typeof prediction.settledProfit === 'number' ? roundPoints(prediction.settledProfit) : prediction.settledProfit,
        }))
      : [],
    tournamentBets: Array.isArray(snapshot.tournamentBets)
      ? snapshot.tournamentBets.map((bet) => ({
          ...bet,
          stakePoints: roundPoints(bet.stakePoints),
          potentialReturn: roundPoints(bet.potentialReturn),
          settledReturn: typeof bet.settledReturn === 'number' ? roundPoints(bet.settledReturn) : bet.settledReturn,
          settledProfit: typeof bet.settledProfit === 'number' ? roundPoints(bet.settledProfit) : bet.settledProfit,
        }))
      : [],
    aiContents: Array.isArray(snapshot.aiContents) ? snapshot.aiContents : [],
    shareCards: Array.isArray(snapshot.shareCards) ? snapshot.shareCards : [],
    bracketState: snapshot.bracketState || { generatedAt: new Date().toISOString(), rounds: [] },
    syncLogs: Array.isArray(snapshot.syncLogs) ? snapshot.syncLogs : [],
    adminOverrides: Array.isArray(snapshot.adminOverrides) ? snapshot.adminOverrides : [],
    players: Array.isArray(snapshot.players) ? snapshot.players : [],
    teamHistory: Array.isArray(snapshot.teamHistory) ? snapshot.teamHistory : [],
    activities: Array.isArray(snapshot.activities) ? snapshot.activities : [],
    userBadges: Array.isArray(snapshot.userBadges) ? snapshot.userBadges : [],
    cardInventories: Array.isArray(snapshot.cardInventories) ? snapshot.cardInventories : [],
    userTitles: Array.isArray(snapshot.userTitles) ? snapshot.userTitles : [],
    adminSessions: Array.isArray(snapshot.adminSessions) ? snapshot.adminSessions : [],
    checkinLog: normalizeCheckinLog(snapshot.checkinLog),
  };
}

function buildSummary(snapshot) {
  return {
    rooms: snapshot.rooms.length,
    users: snapshot.users.length,
    wallets: snapshot.wallets.length,
    transactions: snapshot.transactions.length,
    teams: snapshot.teams.length,
    matches: snapshot.matches.length,
    matchOdds: Object.keys(snapshot.matchOdds).length,
    predictions: snapshot.predictions.length,
    tournamentBets: snapshot.tournamentBets.length,
    aiContents: snapshot.aiContents.length,
    shareCards: snapshot.shareCards.length,
    syncLogs: snapshot.syncLogs.length,
    adminOverrides: snapshot.adminOverrides.length,
    players: snapshot.players.length,
    teamHistory: snapshot.teamHistory.length,
    activities: snapshot.activities.length,
    userBadges: snapshot.userBadges.length,
    cardInventories: snapshot.cardInventories.length,
    userTitles: snapshot.userTitles.length,
    adminSessions: snapshot.adminSessions.length,
    checkinLog: snapshot.checkinLog.length,
  };
}

async function loadSnapshot() {
  const prisma = await createPrisma();
  try {
    // 使用事务确保所有读取操作使用同一个 utf8mb4 连接
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET NAMES utf8mb4');

      const [
        rooms,
        users,
        wallets,
        transactions,
        teams,
        matches,
        matchOddsRows,
        predictions,
        tournamentBets,
        aiContents,
        shareCards,
        syncLogs,
        adminOverrides,
        players,
        teamHistory,
        activities,
        userBadges,
        userTitles,
        cardInventories,
        adminSessions,
        checkinLog,
      ] = await Promise.all([
        tx.room.findMany(),
        tx.user.findMany(),
        tx.wallet.findMany(),
        tx.transaction.findMany(),
        tx.team.findMany(),
        tx.match.findMany({
          orderBy: {
            startTimeUtc: 'asc',
          },
        }),
        tx.matchOdds.findMany(),
        tx.prediction.findMany(),
        tx.tournamentBet.findMany(),
        tx.aiContent.findMany(),
        tx.shareCard.findMany(),
        tx.syncLog.findMany(),
        tx.adminOverride.findMany(),
        tx.player.findMany(),
        tx.teamHistory.findMany(),
        tx.activity.findMany(),
        tx.userBadge.findMany(),
        tx.userTitle.findMany(),
        tx.cardInventory.findMany(),
        tx.adminSession.findMany(),
        tx.checkinLog.findMany(),
      ]);

      const matchOdds = {};
      for (const row of matchOddsRows) {
        matchOdds[row.matchId] = {
          matchId: row.matchId,
          h2h: {
            homeWin: row.h2hHomeWin,
            draw: row.h2hDraw,
            awayWin: row.h2hAwayWin,
          },
          correctScore: row.correctScore || [],
          correctScoreSource: row.correctScoreSource ?? undefined,
          totalGoals: {
            over25: row.totalGoalsOver25,
            under25: row.totalGoalsUnder25,
          },
          qualify: row.qualifyHome != null || row.qualifyAway != null
            ? {
                homeQualify: row.qualifyHome ?? undefined,
                awayQualify: row.qualifyAway ?? undefined,
              }
            : undefined,
          lastUpdated: row.lastUpdated,
          source: row.source ?? undefined,
          syncStatus: row.syncStatus ?? undefined,
          lastSyncedAt: row.lastSyncedAt ?? undefined,
        };
      }

      return normalizeSnapshot({
        rooms,
        users,
        wallets,
        transactions,
        teams,
        matches,
        matchOdds,
        predictions,
        tournamentBets,
        aiContents,
        shareCards,
        bracketState: { generatedAt: new Date().toISOString(), rounds: [] },
        syncLogs,
        adminOverrides,
        players,
        teamHistory,
        activities,
        userBadges,
        userTitles,
        cardInventories,
        adminSessions: adminSessions.map((item) => ({
          token: item.token,
          expiresAt: Number(item.expiresAt),
        })),
        checkinLog,
      });
    });

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

async function saveSnapshot(snapshot) {
  const prisma = await createPrisma();
  const db = normalizeSnapshot(snapshot);
  const matchOddsRows = Object.values(db.matchOdds).map((item) => ({
    matchId: item.matchId,
    h2hHomeWin: item.h2h.homeWin,
    h2hDraw: item.h2h.draw,
    h2hAwayWin: item.h2h.awayWin,
    correctScore: item.correctScore,
    correctScoreSource: item.correctScoreSource ?? null,
    totalGoalsOver25: item.totalGoals.over25,
    totalGoalsUnder25: item.totalGoals.under25,
    qualifyHome: item.qualify?.homeQualify ?? null,
    qualifyAway: item.qualify?.awayQualify ?? null,
    lastUpdated: item.lastUpdated,
    source: item.source ?? null,
    syncStatus: item.syncStatus ?? null,
    lastSyncedAt: item.lastSyncedAt ?? null,
  }));

  try {
    await prisma.$transaction(async (tx) => {
      // 确保事务连接使用 utf8mb4 字符集（必须在事务内部设置，否则可能使用连接池中未设置字符集的连接）
      await tx.$executeRawUnsafe('SET NAMES utf8mb4');

      await tx.checkinLog.deleteMany();
      await tx.adminSession.deleteMany();
      await tx.cardInventory.deleteMany();
      await tx.userTitle.deleteMany();
      await tx.userBadge.deleteMany();
      await tx.activity.deleteMany();
      await tx.teamHistory.deleteMany();
      await tx.player.deleteMany();
      await tx.adminOverride.deleteMany();
      await tx.syncLog.deleteMany();
      await tx.shareCard.deleteMany();
      await tx.aiContent.deleteMany();
      await tx.tournamentBet.deleteMany();
      await tx.prediction.deleteMany();
      await tx.matchOdds.deleteMany();
      await tx.match.deleteMany();
      await tx.transaction.deleteMany();
      await tx.wallet.deleteMany();
      await tx.user.deleteMany();
      await tx.team.deleteMany();
      await tx.room.deleteMany();

      if (db.rooms.length > 0) await tx.room.createMany({ data: db.rooms });
      if (db.users.length > 0) await tx.user.createMany({ data: db.users });
      if (db.wallets.length > 0) await tx.wallet.createMany({ data: db.wallets });
      if (db.transactions.length > 0) await tx.transaction.createMany({ data: db.transactions });
      if (db.teams.length > 0) await tx.team.createMany({ data: db.teams });

      for (const match of db.matches) {
        await tx.match.create({ data: match });
      }

      if (matchOddsRows.length > 0) {
        for (const row of matchOddsRows) {
          await tx.matchOdds.create({ data: row });
        }
      }

      if (db.predictions.length > 0) {
        for (const prediction of db.predictions) {
          await tx.prediction.create({ data: prediction });
        }
      }

      if (db.tournamentBets.length > 0) await tx.tournamentBet.createMany({ data: db.tournamentBets });

      for (const content of db.aiContents) {
        await tx.aiContent.create({ data: content });
      }

      for (const shareCard of db.shareCards) {
        await tx.shareCard.create({ data: shareCard });
      }

      if (db.syncLogs.length > 0) await tx.syncLog.createMany({ data: db.syncLogs });
      if (db.adminOverrides.length > 0) await tx.adminOverride.createMany({ data: db.adminOverrides });
      if (db.players.length > 0) await tx.player.createMany({ data: db.players });
      if (db.teamHistory.length > 0) await tx.teamHistory.createMany({ data: db.teamHistory });
      if (db.activities.length > 0) await tx.activity.createMany({ data: db.activities });
      if (db.userBadges.length > 0) await tx.userBadge.createMany({ data: db.userBadges });
      if (db.userTitles.length > 0) await tx.userTitle.createMany({ data: db.userTitles });

      for (const inventory of db.cardInventories) {
        await tx.cardInventory.create({ data: inventory });
      }

      if (db.adminSessions.length > 0) {
        await tx.adminSession.createMany({
          data: db.adminSessions.map((item) => ({
            token: item.token,
            expiresAt: String(item.expiresAt),
          })),
        });
      }

      if (db.checkinLog.length > 0) await tx.checkinLog.createMany({ data: db.checkinLog });
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const command = process.argv[2];

  if (command === 'load') {
    writeStdoutJson(await loadSnapshot());
    return;
  }

  if (command === 'summary') {
    writeStdoutJson(buildSummary(await loadSnapshot()));
    return;
  }

  if (command === 'save') {
    const inputPath = process.argv[3];
    if (!inputPath) {
      throw new Error('Missing snapshot path for save command.');
    }
    await saveSnapshot(readJson(path.resolve(process.cwd(), inputPath)));
    writeStdoutJson({ ok: true, savedFrom: inputPath });
    return;
  }

  throw new Error(`Unsupported command: ${command || '(empty)'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
