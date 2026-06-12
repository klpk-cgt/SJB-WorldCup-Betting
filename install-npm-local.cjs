// Install npm from local tgz file
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TGZ_PATH = 'C:/Users/22670/npm-new.tgz';
const NODE_MODULES = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const BIN_DIR = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';

function extractTar(buffer, destDir) {
  let offset = 0;
  let fileCount = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.slice(offset, offset + 512);
    if (header.every(b => b === 0)) break;

    const name = header.slice(0, 100).toString('utf8').replace(/\0/g, '');
    const sizeOctal = header.slice(124, 136).toString('utf8').replace(/\0/g, '').trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);

    offset += 512;

    if (size > 0 && typeFlag !== '5' && typeFlag !== 'L') {
      const data = buffer.slice(offset, offset + size);
      const filePath = path.join(destDir, name);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, data);
      fileCount++;
    }

    offset += Math.ceil(size / 512) * 512;
  }
  return fileCount;
}

console.log('Reading tgz file...');
const raw = fs.readFileSync(TGZ_PATH);
console.log(`Read ${raw.length} bytes`);

console.log('Decompressing...');
const tarBuffer = zlib.gunzipSync(raw);
console.log(`Decompressed to ${tarBuffer.length} bytes`);

console.log('Extracting...');
const fileCount = extractTar(tarBuffer, NODE_MODULES);
console.log(`Extracted ${fileCount} files`);

// Rename package -> npm
const extractedPath = path.join(NODE_MODULES, 'package');
const npmPath = path.join(NODE_MODULES, 'npm');
if (fs.existsSync(extractedPath)) {
  if (fs.existsSync(npmPath)) {
    fs.rmSync(npmPath, { recursive: true, force: true });
  }
  fs.renameSync(extractedPath, npmPath);
  console.log('Renamed package -> npm');
}

// Create npm.cmd
fs.writeFileSync(path.join(BIN_DIR, 'npm.cmd'),
  '@echo off\r\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npm-cli.js" %*\r\n');
console.log('Created npm.cmd');

// Create npx.cmd
fs.writeFileSync(path.join(BIN_DIR, 'npx.cmd'),
  '@echo off\r\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npx-cli.js" %*\r\n');
console.log('Created npx.cmd');

console.log('npm installation complete!');
