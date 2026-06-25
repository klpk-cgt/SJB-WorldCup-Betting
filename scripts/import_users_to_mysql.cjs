// 清空 MySQL users 等表并导入真实用户（从 seed_users.json）
// 用法: node scripts/import_users_to_mysql.cjs
//
// 此脚本会：
// 1. 清空 users / wallets / transactions / predictions / tournamentBets / shareCards 表
// 2. 从 src/db/seed_users.json 读取真实用户
// 3. 通过 Prisma 导入用户 + 钱包 + 初始交易记录
//
// 用于：本地开发重置 / 云服务器迁移
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const seedPath = path.resolve(__dirname, '..', 'src', 'db', 'seed_users.json');
  console.log('读取种子用户:', seedPath);
  const seedUsers = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`共 ${seedUsers.length} 个真实用户`);

  console.log('\n[1/3] 清空关联表...');
  // 按外键依赖顺序删除（Prisma 模型名为 PascalCase）
  const models = [
    'shareCard',
    'tournamentBet',
    'prediction',
    'transaction',
    'wallet',
    'user',
  ];
  for (const m of models) {
    const r = await prisma[m].deleteMany({});
    console.log(`  - ${m}: 删除 ${r.count} 条`);
  }

  console.log('\n[2/3] 导入用户 + 钱包 + 初始交易...');
  let imported = 0;
  for (const u of seedUsers) {
    // 用户
    await prisma.user.create({
      data: {
        id: u.id,
        groupId: u.groupId || 'room-1',
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        loginCode: u.loginCode,
        pinHash: u.pinHash || '',
        status: u.status || 'CLAIMED',
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    // 钱包
    await prisma.wallet.create({
      data: {
        userId: u.id,
        balance: u.balance ?? 10000,
        initialPoints: 10000,
      },
    });

    // 初始交易记录
    await prisma.transaction.create({
      data: {
        id: `t-init-${u.id}`,
        userId: u.id,
        type: 'INITIAL_GRANT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
        note: '系统初始娱乐积分赠送',
        createdAt: new Date(Date.now() - 36000000).toISOString(),
      },
    });

    imported++;
    console.log(`  [${imported}/${seedUsers.length}] ${u.loginCode} | ${u.displayName} | avatar: ${u.avatarUrl.length} chars`);
  }

  console.log('\n[3/3] 验证...');
  const userCount = await prisma.user.count();
  const walletCount = await prisma.wallet.count();
  const txCount = await prisma.transaction.count();
  console.log(`  users: ${userCount}, wallets: ${walletCount}, transactions: ${txCount}`);

  if (userCount === seedUsers.length && walletCount === seedUsers.length) {
    console.log('\n✅ 导入成功！');
  } else {
    console.log('\n⚠️ 数量不匹配，请检查');
  }
}

main()
  .catch((e) => {
    console.error('❌ 导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
