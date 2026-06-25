import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LOG_DIR = path.resolve(process.env.APP_DATA_DIR || './runtime', 'logs');

function countByStatus(matches) {
  return matches.reduce((acc, match) => {
    acc[match.status] = (acc[match.status] || 0) + 1;
    return acc;
  }, {});
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value || 'UNKNOWN'] = (acc[value || 'UNKNOWN'] || 0) + 1;
    return acc;
  }, {});
}

function getDirectorySize(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.size;

  return fs.readdirSync(targetPath).reduce((sum, entry) => {
    return sum + getDirectorySize(path.join(targetPath, entry));
  }, 0);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

async function queryMysqlDiagnostics(databaseName) {
  const result = {
    variables: {},
    binaryLogs: null,
    topTableSizes: [],
  };

  const variableNames = [
    'log_bin',
    'binlog_expire_logs_seconds',
    'general_log',
    'slow_query_log',
    'innodb_redo_log_capacity',
  ];

  try {
    const variables = await prisma.$queryRawUnsafe(`SHOW VARIABLES WHERE Variable_name IN (${variableNames.map((name) => `'${name}'`).join(',')})`);
    result.variables = Object.fromEntries(
      (variables || []).map((row) => [row.Variable_name || row.variable_name, row.Value || row.value]),
    );
  } catch (error) {
    result.variables = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const logs = await prisma.$queryRawUnsafe('SHOW BINARY LOGS');
    result.binaryLogs = {
      count: Array.isArray(logs) ? logs.length : 0,
      totalBytes: Array.isArray(logs)
        ? logs.reduce((sum, row) => sum + Number(row.File_size || row.file_size || 0), 0)
        : 0,
      files: Array.isArray(logs)
        ? logs.slice(0, 20).map((row) => ({
            name: row.Log_name || row.log_name,
            size: Number(row.File_size || row.file_size || 0),
          }))
        : [],
    };
  } catch (error) {
    result.binaryLogs = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const tableSizes = await prisma.$queryRawUnsafe(
      `
        SELECT
          table_name AS tableName,
          ROUND((data_length + index_length) / 1024 / 1024, 2) AS sizeMb
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY (data_length + index_length) DESC
        LIMIT 10
      `,
      databaseName,
    );
    result.topTableSizes = Array.isArray(tableSizes) ? tableSizes : [];
  } catch (error) {
    result.topTableSizes = [
      {
        error: error instanceof Error ? error.message : String(error),
      },
    ];
  }

  return result;
}

async function main() {
  const [
    teams,
    matches,
    playersCount,
    teamHistoryCount,
    usersCount,
    predictions,
    walletsCount,
    transactionsCount,
    syncLogs,
    unsettledMatchesCount,
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
        isSettled: true,
        scoreUnknown: true,
        providerMeta: true,
      },
      orderBy: { startTimeUtc: 'asc' },
    }),
    prisma.player.count(),
    prisma.teamHistory.count(),
    prisma.user.count(),
    prisma.prediction.findMany({
      select: {
        id: true,
        status: true,
        usedCard: true,
      },
    }),
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
    prisma.match.count({
      where: {
        isSettled: false,
        status: { in: ['FT', 'AET', 'PEN'] },
      },
    }),
  ]);

  const databaseUrl = process.env.DATABASE_URL || '';
  const dbNameMatch = databaseUrl.match(/\/([^/?]+)(?:\?|$)/);
  const databaseName = dbNameMatch?.[1] || process.env.MYSQL_DATABASE || '';

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

  const scoreUnknownMatches = matches.filter((match) => Boolean(match.scoreUnknown)).length;
  const oddsSourceCounts = await prisma.matchOdds.findMany({
    select: { source: true, syncStatus: true },
  });

  const logDirectorySize = getDirectorySize(LOG_DIR);
  const mysqlDiagnostics = await queryMysqlDiagnostics(databaseName);

  const summary = {
    generatedAt: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      storageMode: 'mysql',
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      databaseName,
    },
    counts: {
      teams: teams.length,
      matches: matches.length,
      players: playersCount,
      teamHistory: teamHistoryCount,
      users: usersCount,
      predictions: predictions.length,
      wallets: walletsCount,
      transactions: transactionsCount,
      unsettledMatches: unsettledMatchesCount,
      scoredMatches: scoredMatches.length,
      fixtureSyncedMatches,
    },
    matches: {
      byStatus: countByStatus(matches),
      dateRange,
      orphanTeamRefs: orphanMatches.length,
      orphanMatchIds: orphanMatches.slice(0, 20).map((match) => match.id),
      scoreUnknownMatches,
    },
    predictions: {
      byStatus: countBy(predictions.map((prediction) => prediction.status)),
      usedCards: countBy(predictions.map((prediction) => prediction.usedCard || 'NONE')),
    },
    odds: {
      bySource: countBy(oddsSourceCounts.map((row) => row.source || 'UNKNOWN')),
      bySyncStatus: countBy(oddsSourceCounts.map((row) => row.syncStatus || 'UNKNOWN')),
    },
    recentSyncLogs: syncLogs,
    runtime: {
      logDirectory: LOG_DIR,
      logDirectorySizeBytes: logDirectorySize,
      logDirectorySize: formatBytes(logDirectorySize),
    },
    mysql: {
      ...mysqlDiagnostics,
      binaryLogs:
        mysqlDiagnostics.binaryLogs && 'totalBytes' in mysqlDiagnostics.binaryLogs
          ? {
              ...mysqlDiagnostics.binaryLogs,
              totalSize: formatBytes(mysqlDiagnostics.binaryLogs.totalBytes),
            }
          : mysqlDiagnostics.binaryLogs,
    },
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
