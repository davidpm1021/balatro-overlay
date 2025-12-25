import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let fileWatcher: fs.FSWatcher | null = null;
let isClickThrough = true;

// Path to the game state JSON file
const getGameStatePath = (): string => {
  const appData = process.env.APPDATA || '';
  return path.join(appData, 'Balatro', 'Mods', 'BalatroOverlay', 'overlay_state.json');
};

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 400,
    height: height,
    x: width - 400,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Enable click-through by default
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load Angular app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/overlay-app/browser/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopFileWatcher();
  });

  // Start watching the game state file
  startFileWatcher();
}

function startFileWatcher(): void {
  const gameStatePath = getGameStatePath();
  const dir = path.dirname(gameStatePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    console.log('Game state directory does not exist yet:', dir);
    // Retry periodically
    setTimeout(startFileWatcher, 5000);
    return;
  }

  try {
    fileWatcher = fs.watch(dir, (eventType, filename) => {
      if (filename === 'overlay_state.json') {
        readAndSendGameState();
      }
    });

    // Initial read
    readAndSendGameState();
  } catch (error) {
    console.error('Failed to start file watcher:', error);
    setTimeout(startFileWatcher, 5000);
  }
}

function stopFileWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

function readAndSendGameState(): void {
  const gameStatePath = getGameStatePath();

  if (!fs.existsSync(gameStatePath)) {
    return;
  }

  try {
    const data = fs.readFileSync(gameStatePath, 'utf-8');
    const gameState = JSON.parse(data);
    mainWindow?.webContents.send('game-state:update', gameState);
  } catch (error) {
    console.error('Failed to read game state:', error);
  }
}

// IPC Handlers
ipcMain.on('overlay:toggle-clickthrough', () => {
  if (!mainWindow) return;

  isClickThrough = !isClickThrough;
  mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
});

ipcMain.on('overlay:set-opacity', (_event, opacity: number) => {
  if (!mainWindow) return;
  mainWindow.setOpacity(Math.max(0.1, Math.min(1, opacity)));
});

ipcMain.on('overlay:minimize', () => {
  if (!mainWindow) return;
  // Collapse to minimal bar (adjust height)
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ ...bounds, height: 50 });
});

ipcMain.on('overlay:restore', () => {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ ...bounds, height });
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
