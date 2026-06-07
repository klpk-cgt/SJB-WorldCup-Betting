const { execSync } = require('child_process');
const fs = require('fs');

// Get all staged files
const files = execSync('git ls-files -s', { encoding: 'utf8' });
const lines = files.split('\n');

for (const line of lines) {
  if (line.includes('api key')) {
    const parts = line.split('\t');
    const name = parts[1];
    console.log('Found file to remove:', name);
    
    // Write the exact filename to a temp file
    fs.writeFileSync('temp_filename.txt', name);
    
    // Use git update-index with the file
    try {
      execSync(`git update-index --force-remove "${name}"`, { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
    } catch (e) {
      console.log('First attempt failed, trying alternative...');
      // Try with stdin
      const proc = require('child_process').spawn('git', ['update-index', '--force-remove', '--stdin'], {
        stdio: ['pipe', 'inherit', 'inherit']
      });
      proc.stdin.write(name + '\n');
      proc.stdin.end();
      proc.on('exit', (code) => {
        console.log('Exit code:', code);
        fs.unlinkSync('temp_filename.txt');
      });
    }
    break;
  }
}
