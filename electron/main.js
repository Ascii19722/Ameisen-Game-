'use strict';
// Startet die Ameisen-Sim als eigenes Programm (Electron): ein Fenster im Vollbild, ohne Menüleiste.
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#140d08',
    title: 'Ameisen-Sim',
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
