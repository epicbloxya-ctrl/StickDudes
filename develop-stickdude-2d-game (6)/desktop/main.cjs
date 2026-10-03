const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.stickstudios.stickdude');
    Menu.setApplicationMenu(null);

    const window = new BrowserWindow({
      title: 'StickDude',
      width: 1280,
      height: 720,
      minWidth: 960,
      minHeight: 540,
      backgroundColor: '#000000',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // The packaged app includes the game and its self-hosted fonts.
    window.loadFile(path.join(__dirname, 'dist', 'index.html'));
    window.once('ready-to-show', () => window.show());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F11' && input.type === 'keyDown' && !input.isAutoRepeat) {
        event.preventDefault();
        window.setFullScreen(!window.isFullScreen());
      }
    });
  });

  app.on('window-all-closed', () => app.quit());
}