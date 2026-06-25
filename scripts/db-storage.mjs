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
  return sortByKey(Array.from(unique.values()), 'userId', 'date');
}

function normalizeQuizLog(rows) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.userId || !row.date) continue;
    unique.set(`${row.userId}::${row.date}`, row);
  }
  return sortByKey(Array.from(unique.values()), 'userId', 'date');
}

function sortByKey(rows, ...keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const a = String(left?.[key] ?? '');
      const b = String(right?.[key] ?? '');
      const cmp = a.localeCompare(b);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

async function createPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe('SET NAMES utf8mb4');
  return prisma;
}

function normalizeSnapshot(snapshot) {
  return {
    rooms: Array.isArray(snapshot.rooms) ? sortByKey(snapshot.rooms, 'id') : [],
    users: Array.isArray(snapshot.users) ? sortByKey(snapshot.users, 'id') : [],
    wallets: Array.isArray(snapshot.wallets)
      ? sortByKey(snapshot.wallets, 'userId').map((wallet) => ({
          ...wallet,
          balance: roundPoints(wallet.balance),
          initialPoints: roundPoints(wallet.initialPoints),
        }))
      : [],
    transactions: Array.isArray(snapshot.transactions)
      ? sortByKey(snapshot.transactions, 'createdAt', 'id').map((transaction) => ({
          ...transaction,
          amount: roundPoints(transaction.amount),
          balanceBefore: roundPoints(transaction.balanceBefore),
          balanceAfter: roundPoints(transaction.balanceAfter),
        }))
      : [],
    teams: Array.isArray(snapshot.teams) ? sortByKey(snapshot.teams, 'id') : [],
    matches: Array.isArray(snapshot.matches)
      ? sortByKey(snapshot.matches, 'startTimeUtc', 'id')
      : [],
    matchOdds: snapshot.matchOdds && typeof snapshot.matchOdds === 'object' ? snapshot.matchOdds : {},
    predictions: Array.isArray(snapshot.predictions)
      ? sortByKey(snapshot.predictions, 'placedAt', 'id').map((prediction) => ({
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
      ? sortByKey(snapshot.tournamentBets, 'placedAt', 'id').map((bet) => ({
          ...bet,
          stakePoints: roundPoints(bet.stakePoints),
          potentialReturn: roundPoints(bet.potentialReturn),
          settledReturn: typeof bet.settledReturn === 'number' ? roundPoints(bet.settledReturn) : bet.settledReturn,
          settledProfit: typeof bet.settledProfit === 'number' ? roundPoints(bet.settledProfit) : bet.settledProfit,
        }))
      : [],
    aiContents: Array.isArray(snapshot.aiContents) ? sortByKey(snapshot.aiContents, 'createdAt', 'id') : [],
    shareCards: Array.isArray(snapshot.shareCards) ? sortByKey(snapshot.shareCards, 'createdAt', 'id') : [],
    bracketState: snapshot.bracketState || { generatedAt: new Date().toISOString(), rounds: [] },
    syncLogs: Array.isArray(snapshot.syncLogs) ? sortByKey(snapshot.syncLogs, 'createdAt', 'id').reverse() : [],
    adminOverrides: Array.isArray(snapshot.adminOverrides) ? sortByKey(snapshot.adminOverrides, 'createdAt', 'id') : [],
    players: Array.isArray(snapshot.players) ? sortByKey(snapshot.players, 'teamId', 'id') : [],
    teamHistory: Array.isArray(snapshot.teamHistory) ? sortByKey(snapshot.teamHistory, 'teamId', 'year', 'id') : [],
    activities: Array.isArray(snapshot.activities) ? sortByKey(snapshot.activities, 'createdAt', 'id').reverse() : [],
    userBadges: Array.isArray(snapshot.userBadges) ? sortByKey(snapshot.userBadges, 'userId', 'badgeId') : [],
    cardInventories: Array.isArray(snapshot.cardInventories) ? sortByKey(snapshot.cardInventories, 'userId') : [],
    userTitles: Array.isArray(snapshot.userTitles) ? sortByKey(snapshot.userTitles, 'userId') : [],
    adminSessions: Array.isArray(snapshot.adminSessions) ? sortByKey(snapshot.adminSessions, 'token') : [],
    checkinLog: normalizeCheckinLog(snapshot.checkinLog),
    quizLogs: normalizeQuizLog(snapshot.quizLogs),
    worldCupStandings: snapshot.worldCupStandings || undefined,
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
    quizLogs: snapshot.quizLogs.length,
    standingsGroups: Object.keys(snapshot.worldCupStandings?.groups || {}).length,
  };
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function normalizeMatchOddsRows(matchOdds) {
  return Object.values(matchOdds).map((item) => ({
    matchId: item.matchId,
    h2hHomeWin: item.h2h?.homeWin ?? null,
    h2hDraw: item.h2h?.draw ?? null,
    h2hAwayWin: item.h2h?.awayWin ?? null,
    correctScore: item.correctScore || [],
    correctScoreSource: item.correctScoreSource ?? null,
    totalGoalsOver25: item.totalGoalsLegacy?.over25 ?? item.totalGoals?.find((entry) => entry.goals === '3+')?.odds ?? null,
    totalGoalsUnder25: item.totalGoalsLegacy?.under25 ?? item.totalGoals?.find((entry) => entry.goals === '3-')?.odds ?? null,
    qualifyHome: item.qualify?.homeQualify ?? null,
    qualifyAway: item.qualify?.awayQualify ?? null,
    lastUpdated: item.lastUpdated,
    source: item.source ?? null,
    syncStatus: item.syncStatus ?? null,
    lastSyncedAt: item.lastSyncedAt ?? null,
  }));
}

function getSnapshotTables(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return {
    rooms: normalized.rooms,
    users: normalized.users,
    wallets: normalized.wallets,
    transactions: normalized.transactions,
    teams: normalized.teams,
    matches: normalized.matches,
    matchOddsRows: normalizeMatchOddsRows(normalized.matchOdds),
    predictions: normalized.predictions,
    tournamentBets: normalized.tournamentBets,
    aiContents: normalized.aiContents,
    shareCards: normalized.shareCards,
    syncLogs: normalized.syncLogs,
    adminOverrides: normalized.adminOverrides,
    players: normalized.players,
    teamHistory: normalized.teamHistory,
    activities: normalized.activities,
    userBadges: normalized.userBadges,
    userTitles: normalized.userTitles,
    cardInventories: normalized.cardInventories,
    adminSessions: normalized.adminSessions.map((item) => ({
      token: item.token,
      expiresAt: String(item.expiresAt),
    })),
    checkinLog: normalized.checkinLog,
    quizLogs: normalized.quizLogs,
    systemStates: normalized.worldCupStandings
      ? [
          {
            key: 'worldCupStandings',
            value: normalized.worldCupStandings,
            updatedAt: normalized.worldCupStandings.lastUpdated || new Date().toISOString(),
          },
        ]
      : [],
  };
}

function getChangedTables(currentSnapshot, nextSnapshot) {
  const currentTables = getSnapshotTables(currentSnapshot);
  const nextTables = getSnapshotTables(nextSnapshot);
  const changed = [];

  for (const key of Object.keys(nextTables)) {
    const currentValue = currentTables[key] ?? [];
    const nextValue = nextTables[key] ?? [];
    if (stableStringify(currentValue) !== stableStringify(nextValue)) {
      changed.push(key);
    }
  }

  return { changed, nextTables };
}

async function loadSnapshot() {
  const prisma = await createPrisma();
  try {
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
        quizLogs,
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
        tx.quizLog.findMany(),
      ]);

      let systemStates = [];
      try {
        systemStates = await tx.systemState.findMany();
      } catch {
        systemStates = [];
      }

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
          totalGoals: [],
          totalGoalsLegacy:
            row.totalGoalsOver25 != null || row.totalGoalsUnder25 != null
              ? {
                  over25: row.totalGoalsOver25 ?? undefined,
                  under25: row.totalGoalsUnder25 ?? undefined,
                }
              : undefined,
          qualify:
            row.qualifyHome != null || row.qualifyAway != null
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

      const standingsState = systemStates.find((item) => item.key === 'worldCupStandings');

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
        quizLogs,
        worldCupStandings: standingsState?.value || undefined,
      });
    });

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

async function replaceTable(tx, tableName, tableRows) {
  switch (tableName) {
    case 'rooms':
      await tx.room.deleteMany();
      if (tableRows.length > 0) await tx.room.createMany({ data: tableRows });
      return;
    case 'users':
      await tx.user.deleteMany();
      if (tableRows.length > 0) await tx.user.createMany({ data: tableRows });
      return;
    case 'wallets':
      await tx.wallet.deleteMany();
      if (tableRows.length > 0) await tx.wallet.createMany({ data: tableRows });
      return;
    case 'transactions':
      await tx.transaction.deleteMany();
      if (tableRows.length > 0) await tx.transaction.createMany({ data: tableRows });
      return;
    case 'teams':
      await tx.team.deleteMany();
      if (tableRows.length > 0) await tx.team.createMany({ data: tableRows });
      return;
    case 'matches':
      await tx.match.deleteMany();
      for (const row of tableRows) {
        await tx.match.create({ data: row });
      }
      return;
    case 'matchOddsRows':
      await tx.matchOdds.deleteMany();
      for (const row of tableRows) {
        await tx.matchOdds.create({ data: row });
      }
      return;
    case 'predictions':
      await tx.prediction.deleteMany();
      for (const row of tableRows) {
        await tx.prediction.create({ data: row });
      }
      return;
    case 'tournamentBets':
      await tx.tournamentBet.deleteMany();
      if (tableRows.length > 0) await tx.tournamentBet.createMany({ data: tableRows });
      return;
    case 'aiContents':
      await tx.aiContent.deleteMany();
      for (const row of tableRows) {
        await tx.aiContent.create({ data: row });
      }
      return;
    case 'shareCards':
      await tx.shareCard.deleteMany();
      for (const row of tableRows) {
        await tx.shareCard.create({ data: row });
      }
      return;
    case 'syncLogs': {
      await tx.syncLog.deleteMany();
      const validSyncLogs = tableRows
        .map((log) => {
          const { detail, ...clean } = log;
          return {
            ...clean,
            responseSummary: clean.responseSummary || '-',
          };
        })
        .filter((log) => log.id && log.requestSummary && log.createdAt);
      if (validSyncLogs.length > 0) {
        await tx.syncLog.createMany({ data: validSyncLogs });
      }
      return;
    }
    case 'adminOverrides':
      await tx.adminOverride.deleteMany();
      if (tableRows.length > 0) await tx.adminOverride.createMany({ data: tableRows });
      return;
    case 'players':
      await tx.player.deleteMany();
      if (tableRows.length > 0) await tx.player.createMany({ data: tableRows });
      return;
    case 'teamHistory':
      await tx.teamHistory.deleteMany();
      if (tableRows.length > 0) await tx.teamHistory.createMany({ data: tableRows });
      return;
    case 'activities':
      await tx.activity.deleteMany();
      if (tableRows.length > 0) await tx.activity.createMany({ data: tableRows });
      return;
    case 'userBadges':
      await tx.userBadge.deleteMany();
      if (tableRows.length > 0) await tx.userBadge.createMany({ data: tableRows });
      return;
    case 'userTitles':
      await tx.userTitle.deleteMany();
      if (tableRows.length > 0) await tx.userTitle.createMany({ data: tableRows });
      return;
    case 'cardInventories':
      await tx.cardInventory.deleteMany();
      for (const row of tableRows) {
        await tx.cardInventory.create({ data: row });
      }
      return;
    case 'adminSessions':
      await tx.adminSession.deleteMany();
      if (tableRows.length > 0) await tx.adminSession.createMany({ data: tableRows });
      return;
    case 'checkinLog':
      await tx.checkinLog.deleteMany();
      if (tableRows.length > 0) await tx.checkinLog.createMany({ data: tableRows });
      return;
    case 'quizLogs':
      await tx.quizLog.deleteMany();
      if (tableRows.length > 0) await tx.quizLog.createMany({ data: tableRows });
      return;
    case 'systemStates':
      try {
        await tx.systemState.deleteMany();
        if (tableRows.length > 0) {
          await tx.systemState.createMany({ data: tableRows });
        }
      } catch {
        // system_states may not exist until prisma db push runs on the server
      }
      return;
    default:
      throw new Error(`Unsupported table replacement: ${tableName}`);
  }
}

async function saveSnapshot(snapshot) {
  const prisma = await createPrisma();
  const nextSnapshot = normalizeSnapshot(snapshot);

  try {
    const currentSnapshot = await loadSnapshot();
    const { changed, nextTables } = getChangedTables(currentSnapshot, nextSnapshot);

    if (changed.length === 0) {
      return { ok: true, changedTables: [] };
    }

    const deleteOrder = [
      'checkinLog',
      'quizLogs',
      'adminSessions',
      'cardInventories',
      'userTitles',
      'userBadges',
      'activities',
      'teamHistory',
      'players',
      'adminOverrides',
      'syncLogs',
      'shareCards',
      'aiContents',
      'tournamentBets',
      'predictions',
      'matchOddsRows',
      'matches',
      'transactions',
      'wallets',
      'users',
      'teams',
      'rooms',
      'systemStates',
    ];

    const orderedChanged = deleteOrder.filter((item) => changed.includes(item));

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET NAMES utf8mb4');
      for (const tableName of orderedChanged) {
        await replaceTable(tx, tableName, nextTables[tableName] || []);
      }
    });

    return { ok: true, changedTables: orderedChanged };
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
    writeStdoutJson(await saveSnapshot(readJson(path.resolve(process.cwd(), inputPath))));
    return;
  }

  throw new Error(`Unsupported command: ${command || '(empty)'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
