import { BACKUP_PATHS, createBackup, getDbFileSize, listBackups } from '../src/server/backup';
import logger from '../src/server/logger';

const args = process.argv.slice(2);
const wantList = args.includes('--list') || args.includes('-l');

function main() {
  logger.info('=== MySQL structured backup tool ===');
  logger.info(`Backup directory: ${BACKUP_PATHS.BACKUP_DIR}`);

  const sizeInfo = getDbFileSize();
  if (!sizeInfo.exists) {
    logger.error('Unable to read the current MySQL snapshot export.');
    process.exit(1);
  }
  logger.info(`Current export size: ${(sizeInfo.size / 1024).toFixed(2)} KB`);

  if (wantList) {
    const backups = listBackups();
    logger.info(`Found ${backups.length} backup files:`);
    for (const backup of backups) {
      logger.info(`  - ${backup.name} (${(backup.size / 1024).toFixed(2)} KB) - ${backup.createdAt}`);
    }
    return;
  }

  const result = createBackup('cli-script');
  if (result.ok) {
    logger.info(`Backup created: ${result.filePath}`);
    logger.info(`File size: ${(result.size! / 1024).toFixed(2)} KB`);
  } else {
    logger.error(`Backup failed: ${result.error}`);
    process.exit(1);
  }
}

main();
