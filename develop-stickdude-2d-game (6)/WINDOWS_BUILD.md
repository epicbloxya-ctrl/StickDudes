# StickDude for Windows

The Windows packaging script targets a **portable, single-file `StickDude.exe`**,
not an installer or ZIP. Electron's portable target embeds the game and its
runtime in the executable. Its internal HTML is not a separate file to distribute.

## Build online without installing Node.js

1. Put the entire StickDude project in a GitHub repository, including
   `.github/workflows/build-windows-exe.yml`, `desktop/`, `scripts/`, `src/`,
   `package.json`, and `vite.config.ts`. GitHub Desktop can publish the folder;
   don't upload only a preview or `dist/index.html`.
2. On GitHub open **Actions > Build StickDude.exe > Run workflow**. The workflow
   needs to be present on the repository's default branch for the button to appear.
3. After the run succeeds, open **Releases** and download **StickDude.exe** from
   the newest release. That asset is directly an EXE, not a ZIP or installer.

GitHub builds it on a Windows machine; your PC does not need Node.js. If release
publishing reports a permission error, enable **Settings > Actions > General >
Workflow permissions > Read and write permissions** for the repository and run
it again. An unsigned EXE may trigger a Windows SmartScreen warning.

## Build locally on Windows

1. Install Node.js 22.12 or newer.
2. Double-click `build-windows.cmd` in this project folder.
3. When it finishes, take **only `StickDude.exe`** from the project folder.

If it fails, keep the command window open and send the exact error, or send
`build-windows.log` from the project folder. The script now checks Node's
version and that the full project files are present before downloading anything.
If the script says it cannot find Node.js, first close **all** Windows Terminal
windows and open a new Command Prompt. Run `where node.exe` and `node -v`.
The build script also checks `C:\Program Files\nodejs\node.exe`, the usual
Windows installer location, even if Node was not added to PATH. If the file is
there but an older copy of `build-windows.cmd` still says Node is missing, use
the updated batch file from this project. If Node is in a custom folder, run
`set "STICKDUDE_NODE_DIR=C:\path\to\node-folder"` in Command Prompt and run
`build-windows.cmd` from that same Command Prompt. If the file is not there
and `where node.exe` finds nothing, install the Windows Node.js package (not
just an editor extension or npm tools). The preview alone is not the project.

The game is configured to work offline. Fonts are bundled and Web Audio
footsteps are generated locally; it does not need a server. `F11` toggles
fullscreen. Saves use the app's local data on that Windows account.

StickDude's deliberately held, hand-drawn poses run at roughly six animation
frames per second while movement remains responsive. The background has no
trees: it uses the Ritual, Spell, and Sacrifice marks from the story pages.
In game, `R` switches between those three staff Workings and `Q` uses one.
The failed creations are drawn as crooked, overfilled Stickmen rather than bugs;
the Ancients have four eyes and the Creator is a plain two-eyed Stickman.
An ink-dark Absorber appears as a memory in the Ruins, not a regular enemy.

An unsigned executable may trigger a Windows SmartScreen warning. Signing it
requires a Windows code-signing certificate, which this project does not have.

The executable is not artificially padded to 1 GB. Its size reflects the
actual game and Electron runtime, not filler. The build script reports the
real file size.

The original uploaded images are not in this project's files; the game
currently draws the logo and character based on the images in the conversation.