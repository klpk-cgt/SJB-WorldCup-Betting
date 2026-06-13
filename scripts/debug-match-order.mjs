import 'dotenv/config';

function computeLockTime(startTimeUtc, predictionLockMinutes) {
  return new Date(new Date(startTimeUtc).getTime() - predictionLockMinutes * 60 * 1000);
}

function deriveOperationalStatus(match, predictionLockMinutes = 5) {
  if (match.status === 'CANCELLED') return 'CANCELLED';
  if (match.isSettled || match.settlementStatus === 'SETTLED') return 'SETTLED';
  if (['FT', 'AET', 'PEN'].includes(match.status)) return 'WAITING_SETTLEMENT';
  if (match.isPredictionLocked) return 'LOCKED';

  const now = Date.now();
  const lockTime = computeLockTime(match.startTimeUtc, predictionLockMinutes).getTime();
  const startTime = new Date(match.startTimeUtc).getTime();
  if (now >= lockTime || match.status !== 'NS') return 'LOCKED';
  if (startTime - now <= 30 * 60 * 1000) return 'LOCKING_SOON';
  return 'BETTABLE';
}

function formatMatchRow(match, teamMap, predictionLockMinutes) {
  return {
    id: match.id,
    home: teamMap.get(match.homeTeamId)?.nameZh || match.homeTeamId,
    away: teamMap.get(match.awayTeamId)?.nameZh || match.awayTeamId,
    startTimeUtc: match.startTimeUtc,
    status: match.status,
    operationalStatus: match.operationalStatus || deriveOperationalStatus(match, predictionLockMinutes),
    isPredictionLocked: Boolean(match.isPredictionLocked),
    isSettled: Boolean(match.isSettled),
  };
}

async function main() {
  const limit = Math.max(1, Number(process.argv[2] || 20));
  const predictionLockMinutes = Math.max(1, Number(process.env.PREDICTION_LOCK_MINUTES || 5));
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe('SET NAMES utf8mb4');

    const [teams, databaseOrderMatches, sortedMatches] = await Promise.all([
      prisma.team.findMany(),
      prisma.match.findMany({ take: limit }),
      prisma.match.findMany({
        orderBy: { startTimeUtc: 'asc' },
        take: limit,
      }),
    ]);

    const teamMap = new Map(teams.map((team) => [team.id, team]));

    const payload = {
      limit,
      databaseOrderTopMatches: databaseOrderMatches.map((match) =>
        formatMatchRow(match, teamMap, predictionLockMinutes),
      ),
      sortedByStartTimeTopMatches: sortedMatches.map((match) =>
        formatMatchRow(match, teamMap, predictionLockMinutes),
      ),
    };

    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
