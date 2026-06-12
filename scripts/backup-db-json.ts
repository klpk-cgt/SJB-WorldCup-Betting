/**
 * 数据库备份脚本
 * 用法：npx tsx scripts/backup-db-json.ts
 */

import { createBackup, listBackups, BACKUP_PATHS, getDbFileSize } from '../src/server/backup';
import logger from '../src/server/logger';

const args = process.argv.slice(2);
const wantList = args.includes('--list') || args.includes('-l');

function main() {
  logger.info('=== 数据库备份工具 ===');
  logger.info(`db.json 路径: ${BACKUP_PATHS.DB_FILE_PATH}`);
  logger.info(`备份目录: ${BACKUP_PATHS.BACKUP_DIR}`);

  const sizeInfo = getDbFileSize();
  if (!sizeInfo.exists) {
    logger.error('db.json 不存在，请先运行项目让 db.json 初始化。');
    process.exit(1);
  }
  logger.info(`db.json 大小: ${(sizeInfo.size / 1024).toFixed(2)} KB`);

  if (wantList) {
    const backups = listBackups();
    logger.info(`当前共有 ${backups.length} 个备份文件：`);
    for (const b of backups) {
      logger.info(`  - ${b.name} (${(b.size / 1024).toFixed(2)} KB) - ${b.createdAt}`);
    }
    return;
  }

  const result = createBackup('cli-script');
  if (result.ok) {
    logger.info(`✅ 备份成功: ${result.filePath}`);
    logger.info(`   文件大小: ${(result.size! / 1024).toFixed(2)} KB`);
  } else {
    logger.error(`❌ 备份失败: ${result.error}`);
    process.exit(1);
  }
}

main();
