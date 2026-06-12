// Install npm using Node.js built-in modules
// Downloads npm from the official registry and extracts it
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NODE_MODULES = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const BIN_DIR = 'C:/Users/22670/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';

// Download from npmmirror which provides a tarball
const NPM_TARBALL_URL = 'https://registry.npmmirror.com/npm/-/npm-11.4.2.tgz';
const TEMP_FILE = path.join(NODE_MODULES, 'npm-download.tgz');

function download(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(reqUrl, { headers: { 'User-Agent': 'node' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirect -> ${res.headers.location}`);
          doRequest(res.headers.location, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

// Parse tar format from buffer
function extractTar(buffer, destDir) {
  let offset = 0;
  let fileCount = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.slice(offset, offset + 512);

    // End of archive check
    if (header.every(b => b === 0)) break;

    // Parse header fields
    const nameBytes = header.slice(0, 100);
    const name = nameBytes.toString('utf8').replace(/\0/g, '');
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

async function main() {
  console.log('Downloading npm tarball...');
  const rawBuffer = await download(NPM_TARBALL_URL);
  console.log(`Downloaded ${rawBuffer.length} bytes`);

  console.log('Decompressing gzip...');
  const tarBuffer = zlib.gunzipSync(rawBuffer);
  console.log(`Decompressed to ${tarBuffer.length} bytes`);

  console.log('Extracting tar...');
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
  const npmCmd = `@echo off\r\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npm-cli.js" %*\r\n`;
  fs.writeFileSync(path.join(BIN_DIR, 'npm.cmd'), npmCmd);
  console.log('Created npm.cmd');

  // Create npx.cmd
  const npxCmd = `@echo off\r\nnode "%~dp0\\..\\node_modules\\npm\\bin\\npx-cli.js" %*\r\n`;
  fs.writeFileSync(path.join(BIN_DIR, 'npx.cmd'), npxCmd);
  console.log('Created npx.cmd');

  console.log('npm installation complete!');
}

main().catch(err => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
