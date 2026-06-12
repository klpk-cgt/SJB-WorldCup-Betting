import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function countByStatus(matches) {
  return matches.reduce((acc, match) => {
    acc[match.status] = (acc[match.status] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const [
    teams,
    matches,
    playersCount,
    teamHistoryCount,
    usersCount,
    predictionsCount,
    walletsCount,
    transactionsCount,
    syncLogs,
  ] = await Promise.all([
    prisma.team.findMany({ select: { id: true, code: true, nameZh: true } }),
    prisma.match.findMany({
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        startTimeUtc: true,
        status: true,
        homeScore: true,
        awayScore: true,
        providerMeta: true,
      },
      orderBy: { startTimeUtc: 'asc' },
    }),
    prisma.player.count(),
    prisma.teamHistory.count(),
    prisma.user.count(),
    prisma.prediction.count(),
    prisma.wallet.count(),
    prisma.transaction.count(),
    prisma.syncLog.findMany({
      select: {
        id: true,
        source: true,
        syncType: true,
        status: true,
        targetDate: true,
        responseSummary: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const teamIds = new Set(teams.map((team) => team.id));
  const orphanMatches = matches.filter((match) => !teamIds.has(match.homeTeamId) || !teamIds.has(match.awayTeamId));
  const scoredMatches = matches.filter(
    (match) => typeof match.homeScore === 'number' || typeof match.awayScore === 'number',
  );
  const fixtureSyncedMatches = matches.filter((match) => match.providerMeta?.apiFootballFixtureId).length;
  const dateRange =
    matches.length > 0
      ? {
          first: matches[0].startTimeUtc,
          last: matches[matches.length - 1].startTimeUtc,
        }
      : null;

  const summary = {
    generatedAt: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      storageMode: process.env.APP_STORAGE_MODE || 'json',
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    },
    counts: {
      teams: teams.length,
      matches: matches.length,
      players: playersCount,
      teamHistory: teamHistoryCount,
      users: usersCount,
      predictions: predictionsCount,
      wallets: walletsCount,
      transactions: transactionsCount,
      scoredMatches: scoredMatches.length,
      fixtureSyncedMatches,
    },
    matches: {
      byStatus: countByStatus(matches),
      dateRange,
      orphanTeamRefs: orphanMatches.length,
      orphanMatchIds: orphanMatches.slice(0, 20).map((match) => match.id),
    },
    recentSyncLogs: syncLogs,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error('production diagnostics failed');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
