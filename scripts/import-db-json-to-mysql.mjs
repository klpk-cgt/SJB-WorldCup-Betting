import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const projectRoot = process.cwd();
const dataDir = process.env.APP_DATA_DIR
  ? path.resolve(projectRoot, process.env.APP_DATA_DIR)
  : projectRoot;
const dbJsonPath = process.env.IMPORT_DB_JSON_PATH
  ? path.resolve(projectRoot, process.env.IMPORT_DB_JSON_PATH)
  : path.join(dataDir, 'db.json');
const storageScript = path.join(projectRoot, 'scripts', 'db-storage.mjs');

if (!fs.existsSync(dbJsonPath)) {
  throw new Error(`db.json not found: ${dbJsonPath}`);
}

const saveResult = spawnSync(process.execPath, [storageScript, 'save', dbJsonPath], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (saveResult.status !== 0) {
  process.stderr.write(saveResult.stderr || saveResult.stdout || 'MySQL import failed.\n');
  process.exit(saveResult.status ?? 1);
}

const summaryResult = spawnSync(process.execPath, [storageScript, 'summary'], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (summaryResult.status !== 0) {
  process.stderr.write(summaryResult.stderr || summaryResult.stdout || 'MySQL summary failed.\n');
  process.exit(summaryResult.status ?? 1);
}

process.stdout.write(summaryResult.stdout);
