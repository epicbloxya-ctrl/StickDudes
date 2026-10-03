# Build StickDude.dmg on a Mac

This makes a macOS DMG containing StickDude.app. It is not a Windows EXE.
You must run this build on a Mac with the complete project folder and
Node.js 22.12 or newer installed. The first run needs internet access.

1. Open **Terminal** on the Mac.
2. Type `cd `, drag the **StickDude project folder** onto the Terminal window,
   and press Return. The folder must contain `build-mac.command` and `src/`.
3. Enter `bash build-mac.command` and wait for it to finish.
4. Double-click `StickDude.dmg` in the project folder. Drag `StickDude.app`
   into Applications, then launch StickDude from Applications.

Share only `StickDude.dmg`; no ZIP or separate HTML file is needed to run the
app from inside it.

By default the DMG is built for the Mac you used to build it: Apple Silicon
or Intel. To make one DMG for **both** types, instead use
`bash build-mac.command --universal` (this takes longer and is larger).

This is ad-hoc signed for local testing, **not** signed with an Apple Developer
ID or notarized. On first launch macOS may block it; open **System Settings >
Privacy & Security > Open Anyway**, then confirm. For frictionless distribution
to other people's Macs, you need an Apple Developer ID and notarization.