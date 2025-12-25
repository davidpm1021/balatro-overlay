import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';

let mainWindow: BrowserWindow | null = null;
let fileWatcher: chokidar.FSWatcher | null = null;
let isClickThrough = true;
let debounceTimer: NodeJS.Timeout | null = null;

// Path to the game state JSON file
const getGameStatePath = (): string => {
  const appData = process.env.APPDATA || '';
  return path.join(appData, 'Balatro', 'overlay_state.json');
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

  console.log('Starting file watcher for:', gameStatePath);

  // Use chokidar for reliable cross-platform file watching
  fileWatcher = chokidar.watch(gameStatePath, {
    persistent: true,
    ignoreInitial: false,  // Trigger on initial file if it exists
    awaitWriteFinish: {
      stabilityThreshold: 50,  // Wait for file to be stable
      pollInterval: 20
    },
    usePolling: false  // Use native events when possible
  });

  fileWatcher.on('add', () => {
    console.log('Game state file detected');
    debouncedReadAndSend();
  });

  fileWatcher.on('change', () => {
    debouncedReadAndSend();
  });

  fileWatcher.on('error', (error) => {
    console.error('File watcher error:', error);
  });

  fileWatcher.on('ready', () => {
    console.log('File watcher ready');
  });
}

function stopFileWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

// Debounce reads to prevent flooding (game writes every 100ms)
function debouncedReadAndSend(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    readAndSendGameState();
  }, 50);  // 50ms debounce - responsive but not excessive
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
    // Silently ignore read errors (file may be mid-write)
    // Chokidar's awaitWriteFinish should minimize these
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
