import { execFileSync } from 'node:child_process';
import { copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electronBuilder from 'electron-builder';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { build, Platform, Arch } = electronBuilder;

async function main() {
  if (process.platform !== 'darwin') {
    throw new Error('A Mac is required to make StickDude.dmg. Run this on macOS, not Windows.');
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error('Install Node.js 22.12 or newer on the Mac before building.');
  }

  const universal = process.argv.includes('--universal');
  if (process.argv.slice(2).some(arg => arg !== '--universal')) {
    throw new Error('The only supported option is --universal.');
  }
  if (!universal && !['arm64', 'x64'].includes(process.arch)) {
    throw new Error(`Unsupported Mac architecture: ${process.arch}`);
  }
  const arch = universal ? Arch.universal : process.arch === 'arm64' ? Arch.arm64 : Arch.x64;
  const stageDir = path.join(root, '.stickdude-mac-build-app');
  const outputDir = path.join(root, 'release-mac');
  const dmgPath = path.join(root, 'StickDude.dmg');

  // The renderer uses relative URLs because Electron loads it from file://.
  execFileSync('npm', ['run', 'build', '--', '--base', './'], { cwd: root, stdio: 'inherit' });
  await rm(stageDir, { recursive: true, force: true });
  await rm(outputDir, { recursive: true, force: true });
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
      targets: Platform.MAC.createTarget('dmg', arch),
      config: {
        appId: 'com.stickstudios.stickdude',
        productName: 'StickDude',
        directories: { app: '.stickdude-mac-build-app', output: 'release-mac' },
        files: ['main.cjs', 'dist/**/*'],
        asar: true,
        npmRebuild: false,
        mac: {
          target: 'dmg',
          category: 'public.app-category.games',
          identity: '-',
          entitlements: 'build/entitlements.mac.plist',
          entitlementsInherit: 'build/entitlements.mac.inherit.plist',
          notarize: false,
        },
        dmg: { artifactName: 'StickDude.dmg' },
      },
    });

    const builtDmg = artifacts.find(file => path.basename(file) === 'StickDude.dmg');
    if (!builtDmg) throw new Error('Packaging finished without StickDude.dmg.');

    // macOS verifies the disk image before we give the user a copy.
    execFileSync('hdiutil', ['verify', builtDmg], { stdio: 'inherit' });
    await copyFile(builtDmg, dmgPath);
    const { size } = await stat(dmgPath);
    await rm(outputDir, { recursive: true, force: true });
    console.log(`\nCreated ${dmgPath} (${(size / 1024 / 1024).toFixed(1)} MB, ${universal ? 'Intel + Apple Silicon' : process.arch}).`);
    console.log('Open the DMG, drag StickDude.app into Applications, and open the app.');
    console.log('This is an ad-hoc signed local build, not a notarized public release.');
  } finally {
    await rm(stageDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});