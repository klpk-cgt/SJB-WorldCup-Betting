// Bootstrap npm installation from tgz
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const tgzPath = 'C:/Users/22670/npm.tgz';
const nodeModulesDir = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const binDir = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';

// Simple tar extractor using Node.js built-in modules
// We'll use a streaming approach to parse the tar format
function extractTarGz(tgzPath, destDir) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(tgzPath);
    const gunzip = zlib.createGunzip();

    let buffer = Buffer.alloc(0);

    gunzip.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    gunzip.on('end', () => {
      try {
        // Parse tar format: each entry is 512-byte header + data padded to 512 bytes
        let offset = 0;
        while (offset < buffer.length) {
          const header = buffer.slice(offset, offset + 512);
          if (header.length < 512) break;

          // Check for end of archive (two zero blocks)
          if (header.every(b => b === 0)) break;

          const name = header.slice(0, 100).toString('utf8').replace(/\0/g, '');
          const sizeStr = header.slice(124, 136).toString('utf8').replace(/\0/g, '').trim();
          const size = parseInt(sizeStr, 8) || 0;
          const type = header.slice(156, 157).toString('utf8');

          offset += 512; // Move past header

          if (size > 0 && type !== '5') { // Not a directory
            const data = buffer.slice(offset, offset + size);
            const filePath = path.join(destDir, name);

            // Ensure directory exists
            const dir = path.dirname(filePath);
            fs.mkdirSync(dir, { recursive: true });

            // Write file
            fs.writeFileSync(filePath, data);
          }

          // Move to next entry (data is padded to 512-byte boundary)
          offset += Math.ceil(size / 512) * 512;
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });

    gunzip.on('error', reject);
    input.pipe(gunzip);
  });
}

async function main() {
  console.log('Extracting npm from tgz...');
  await extractTarGz(tgzPath, nodeModulesDir);
  console.log('Extraction complete.');

  // The extracted folder will be "package" - rename to "npm"
  const extractedPath = path.join(nodeModulesDir, 'package');
  const npmPath = path.join(nodeModulesDir, 'npm');

  if (fs.existsSync(extractedPath) && !fs.existsSync(npmPath)) {
    fs.renameSync(extractedPath, npmPath);
    console.log('Renamed package -> npm');
  }

  // Create npm.cmd in bin directory
  const npmCmdPath = path.join(binDir, 'npm.cmd');
  const npmCmdContent = `@echo off\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npm-cli.js" %*\n`;
  fs.writeFileSync(npmCmdPath, npmCmdContent);
  console.log('Created npm.cmd');

  // Also create npx.cmd
  const npxCmdPath = path.join(binDir, 'npx.cmd');
  const npxCmdContent = `@echo off\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npx-cli.js" %*\n`;
  fs.writeFileSync(npxCmdPath, npxCmdContent);
  console.log('Created npx.cmd');

  // Create npm shell script for git bash etc
  const npmShPath = path.join(binDir, 'npm');
  const npmShContent = `#!/bin/sh\nnode "$(dirname "$0")/../node_modules/npm/bin/npm-cli.js" "$@"\n`;
  fs.writeFileSync(npmShPath, npmShContent);
  console.log('Created npm shell script');

  console.log('npm installation complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
