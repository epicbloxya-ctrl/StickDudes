import { execSync } from 'node:child_process';
import { copyFile, cp, mkdir, open, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electronBuilder from 'electron-builder';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { build, Platform, Arch } = electronBuilder;

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Build StickDude.exe on Windows. This script does not produce a Windows executable on this host.');
  }

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error('Node.js 22.12 or newer is needed for the Windows packaging dependencies.');
  }

  // Relative URLs let the app and its bundled fonts load from file:// without a web server.
  execSync('npm run build -- --base ./', { cwd: root, stdio: 'inherit' });

  const stageDir = path.join(root, '.stickdude-build-app');
  const outputDir = path.join(root, 'release');
  const exePath = path.join(root, 'StickDude.exe');
  await rm(stageDir, { recursive: true, force: true });
  await rm(outputDir, { recursive: true, force: true });
  await rm(exePath, { force: true });

  await mkdir(stageDir, { recursive: true });
  await copyFile(path.join(root, 'desktop', 'main.cjs'), path.join(stageDir, 'main.cjs'));
  await cp(path.join(root, 'dist'), path.join(stageDir, 'dist'), { recursive: true });
  await writeFile(path.join(stageDir, 'package.json'), JSON.stringify({
    name: 'stickdude',
    version: '1.0.0',
    main: 'main.cjs',
    author: 'Stick Studios',
    description: 'StickDude - an animated 2D adventure',
  }, null, 2));

  try {
    const artifacts = await build({
      projectDir: root,
      targets: Platform.WINDOWS.createTarget('portable', Arch.x64),
      config: {
        appId: 'com.stickstudios.stickdude',
        productName: 'StickDude',
        directories: { app: '.stickdude-build-app', output: 'release' },
        files: ['main.cjs', 'dist/**/*'],
        asar: true,
        npmRebuild: false,
        win: { target: 'portable' },
        portable: { artifactName: 'StickDude.exe' },
      },
    });

    const builtExe = artifacts.find(file => path.basename(file).toLowerCase() === 'stickdude.exe');
    if (!builtExe) throw new Error('Packaging did not produce StickDude.exe.');

    const handle = await open(builtExe, 'r');
    const header = Buffer.alloc(2);
    try {
      await handle.read(header, 0, 2, 0);
    } finally {
      await handle.close();
    }
    if (header.toString('ascii') !== 'MZ') throw new Error('The output is not a Windows PE executable.');

    await copyFile(builtExe, exePath);
    const { size } = await stat(exePath);
    await rm(outputDir, { recursive: true, force: true });
    console.log(`\nCreated ${exePath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    console.log('Distribute StickDude.exe alone. No installer or ZIP is required.');
    if (size < 1024 ** 3) {
      console.warn('This executable is under 1 GB. No dummy data was added to misrepresent game content.');
    }
  } finally {
    await rm(stageDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});