import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[1m\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[1m\x1b[36m%s\x1b[0m', '    CivicPulse — Dual Engine (Backend + Frontend) Starting     ');
console.log('\x1b[1m\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '  🚀 Backend API:   http://localhost:5000');
console.log('\x1b[35m%s\x1b[0m', '  🌐 Frontend App:  http://localhost:5173');
console.log('\x1b[90m%s\x1b[0m', '  ⚡ Press Ctrl+C at any time to stop both servers.\n');

const serverDir = path.join(__dirname, 'server');
const clientDir = path.join(__dirname, 'client');

// Start backend
const serverProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: serverDir,
  shell: isWindows,
  stdio: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' },
});

// Start frontend
const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: clientDir,
  shell: isWindows,
  stdio: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' },
});

function prefixStream(stream, prefix, colorCode) {
  if (!stream) return;
  let remainder = '';
  stream.on('data', (chunk) => {
    const text = remainder + chunk.toString();
    const lines = text.split('\n');
    remainder = lines.pop() || '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`\x1b[${colorCode}m${prefix}\x1b[0m ${line}`);
      }
    }
  });
  stream.on('end', () => {
    if (remainder.trim().length > 0) {
      console.log(`\x1b[${colorCode}m${prefix}\x1b[0m ${remainder}`);
    }
  });
}

prefixStream(serverProcess.stdout, '[SERVER]', '36'); // Cyan
prefixStream(serverProcess.stderr, '[SERVER]', '31'); // Red
prefixStream(clientProcess.stdout, '[CLIENT]', '35'); // Magenta
prefixStream(clientProcess.stderr, '[CLIENT]', '33'); // Yellow

let isShuttingDown = false;

function terminateAll() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[33m[CivicPulse] Shutting down both services cleanly...\x1b[0m');

  const killTree = (proc) => {
    if (!proc || !proc.pid) return;
    if (isWindows) {
      try {
        exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
      } catch (e) {
        // ignore
      }
    } else {
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        // ignore
      }
    }
  };

  killTree(serverProcess);
  killTree(clientProcess);

  setTimeout(() => {
    process.exit(0);
  }, 400);
}

process.on('SIGINT', terminateAll);
process.on('SIGTERM', terminateAll);
process.on('exit', terminateAll);
