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

  // 筛选有比分的比赛：
  // 1. result 不为空且匹配 X:Y 格式
  // 2. spf 不为"待定"——竞彩官方未确认结果时 result 可能是占位符(如0:0)
  // 3. postMatch 非空——证明比赛已实际进行(双重保险)
  const withResult = data.matches.filter(
    (m) =>
      m.result &&
      !String(m.result).includes('待') &&
      String(m.result).match(/^\d+:\d+$/) &&
      m.spf &&
      !String(m.spf).includes('待定') &&
      m.postMatch &&
      String(m.postMatch).trim().length > 0
  );
  console.log(`Matches with confirmed result (spf+postMatch verified): ${withResult.length}`);

  // 诊断：有 result 但 spf="待定" 的比赛（可能 result 是占位符）
  const suspicious = data.matches.filter(
    (m) =>
      m.result &&
      String(m.result).match(/^\d+:\d+$/) &&
      (!m.spf || String(m.spf).includes('待定'))
  );
  if (suspicious.length > 0) {
    console.log(`WARNING: ${suspicious.length} matches have result but spf="待定" (skipped, result may be placeholder):`);
    for (const s of suspicious) {
      console.log(`  id=${s.id}: ${s.home} vs ${s.away} result="${s.result}" spf="${s.spf}" postMatch="${String(s.postMatch || '').slice(0, 40)}..."`);
    }
  }

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
