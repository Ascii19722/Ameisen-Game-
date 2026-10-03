'use strict';
// Startet die Ameisen-Sim als eigenes Programm (Electron): ein Fenster im Vollbild, ohne Menüleiste.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Wo liegen Bilder- und Desktop-Ordner? (für preload.js, das eigene Bilder sucht)
ipcMain.on('ameisen-pfade', e => {
  e.returnValue = { pictures: app.getPath('pictures'), desktop: app.getPath('desktop'), app: path.join(__dirname, '..') };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#140d08',
    title: 'Ameisen-Sim',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,           // preload.js darf Ordner lesen (nur dort, das Spiel selbst nicht)
      contextIsolation: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  // Esc beendet den Vollbildmodus (F schaltet im Spiel um)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) win.setFullScreen(false);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
