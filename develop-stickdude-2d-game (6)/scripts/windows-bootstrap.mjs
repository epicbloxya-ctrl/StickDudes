import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = createWriteStream(path.join(root, 'build-windows.log'), { flags: 'w' });

function report(message) {
  process.stdout.write(`${message}\n`);
  log.write(`${message}\n`);
}

function run(label, command, args, shell = false) {
  report(`\n--- ${label} ---`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      shell,
      windowsHide: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout.on('data', data => {
      process.stdout.write(data);
      log.write(data);
    });
    child.stderr.on('data', data => {
      process.stderr.write(data);
      log.write(data);
    });
    child.once('error', reject);
    child.once('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (exit code ${code ?? 'unknown'}).`));
    });
  });
}

async function main() {
  report(`StickDude Windows build | Node ${process.version} | ${process.platform} ${process.arch}`);
  if (process.platform !== 'win32') {
    throw new Error('This builder must be run on Windows. No EXE was produced.');
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error('Node.js 22.12 or newer is required. Update Node.js and reopen Command Prompt.');
  }
  for (const file of ['package.json', 'desktop/main.cjs', 'scripts/build-windows.mjs', 'src/App.tsx']) {
    if (!existsSync(path.join(root, file))) {
      throw new Error(`Missing ${file}. You need the full StickDude project folder, not just the preview.`);
    }
  }

  await run('Check npm', 'npm.cmd', ['--version'], true);
  await run('Install build dependencies (requires internet)', 'npm.cmd', ['install', '--no-audit', '--no-fund'], true);
  await run('Compile game and package portable EXE', process.execPath, [path.join(root, 'scripts/build-windows.mjs')]);

  if (!existsSync(path.join(root, 'StickDude.exe'))) {
    throw new Error('Packaging exited without creating StickDude.exe. See the build output above.');
  }
  report('\nSuccess: StickDude.exe is in the project folder. The EXE is the only file to distribute.');
}

try {
  await main();
} catch (error) {
  report(`\nBUILD FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  log.end();
}