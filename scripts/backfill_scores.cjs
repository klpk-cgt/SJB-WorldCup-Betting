// 从 data.json 回填比赛比分和状态到 MySQL
// data.json 来源：竞彩官方API实时赔率(自动抓取)
// data.json id (1-based) 映射到 match id "m-1", "m-2", etc.
//
// 用法: node scripts/backfill_scores.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA_URL = 'https://cdn.jsdelivr.net/gh/shimenghan6/worldcup-2026@main/data.json';

async function main() {
  console.log('Fetching data.json...');
  const r = await fetch(DATA_URL);
  const data = await r.json();
  console.log(`Got ${data.matches.length} matches, updated: ${data.updated}`);

  // 筛选有比分的比赛（result 不为空且不为"待定"）
  const withResult = data.matches.filter(
    (m) => m.result && !String(m.result).includes('待') && String(m.result).match(/^\d+:\d+$/)
  );
  console.log(`Matches with result: ${withResult.length}`);

  let updated = 0;
  let skipped = 0;

  for (const item of withResult) {
    const matchId = `m-${item.id}`;
    const parts = String(item.result).split(':');
    const homeScore = parseInt(parts[0], 10);
    const awayScore = parseInt(parts[1], 10);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      console.log(`  SKIP ${matchId}: invalid score "${item.result}"`);
      skipped++;
      continue;
    }

    // 查询当前比赛
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      console.log(`  SKIP ${matchId}: not found in DB`);
      skipped++;
      continue;
    }

    // 只更新状态仍为 NS 或比分缺失的比赛
    if (match.status === 'NS' || match.homeScore === null || match.awayScore === null) {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'FT',
          homeScore,
          awayScore,
          scoreUnknown: null, // 清除 scoreUnknown 标记
          operationalStatus: 'WAITING_SETTLEMENT',
          providerMeta: {
            ...(match.providerMeta || {}),
            scoreSource: 'data.json (竞彩官方API)',
            scoreSyncedAt: new Date().toISOString(),
          },
        },
      });
      updated++;
      console.log(`  UPDATED ${matchId}: ${homeScore} - ${awayScore} (was ${match.status})`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: updated=${updated}, skipped=${skipped}`);

  // 验证
  const total = await prisma.match.count();
  const ftCount = await prisma.match.count({ where: { status: 'FT' } });
  const nsCount = await prisma.match.count({ where: { status: 'NS' } });
  const withScore = await prisma.match.count({
    where: { AND: [{ homeScore: { not: null } }, { awayScore: { not: null } }] },
  });
  console.log(`\nDB status: total=${total}, FT=${ftCount}, NS=${nsCount}, withScore=${withScore}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
