import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';

let mainWindow: BrowserWindow | null = null;
let fileWatcher: chokidar.FSWatcher | null = null;
let isClickThrough = true;
let isVisible = true;
let debounceTimer: NodeJS.Timeout | null = null;

// Window dimensions
const WINDOW_WIDTH = 280;
const COLLAPSED_HEIGHT = 32;

// Path to the game state JSON file
const getGameStatePath = (): string => {
  const appData = process.env.APPDATA || '';
  return path.join(appData, 'Balatro', 'overlay_state.json');
};

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: height,
    x: width - WINDOW_WIDTH,
    y: 0,
    frame: false,
    transparent: true,
    skipTaskbar: false,
    resizable: true,
    opacity: 0.75,
    type: 'toolbar',  // Helps stay above fullscreen apps
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set always on top with highest priority to stay above fullscreen games
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Make visible on all workspaces including fullscreen
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Fight-back #1: Re-assert alwaysOnTop when window loses focus
  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.moveTop();
      }
    }, 50);
  });

  // Fight-back #2: Re-show if hidden
  mainWindow.on('hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Fight-back #3: Periodic re-assertion every 500ms
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.moveTop();
    }
  }, 500);

  // Enable click-through by default
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load Angular app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    // Don't auto-open devtools in production-like testing
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/overlay-app/browser/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopFileWatcher();
  });

  // Start watching the game state file
  startFileWatcher();

  // Register global shortcut
  registerGlobalShortcuts();
}

function registerGlobalShortcuts(): void {
  // Toggle visibility with Ctrl+Shift+B
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    toggleVisibility();
  });
}

function toggleVisibility(): void {
  if (!mainWindow) return;

  isVisible = !isVisible;
  if (isVisible) {
    mainWindow.show();
  } else {
    mainWindow.hide();
  }
  mainWindow.webContents.send('visibility-changed', isVisible);
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

// IPC Handlers - using consistent channel names matching preload.ts
ipcMain.on('set-click-through', (_event, enabled: boolean) => {
  if (!mainWindow) return;
  isClickThrough = enabled;
  mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
});

ipcMain.on('set-opacity', (_event, opacity: number) => {
  if (!mainWindow) return;
  mainWindow.setOpacity(Math.max(0.1, Math.min(1, opacity)));
});

ipcMain.on('minimize-overlay', () => {
  if (!mainWindow) return;
  // Collapse to minimal bar (adjust height)
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ ...bounds, height: COLLAPSED_HEIGHT });
});

ipcMain.on('restore-overlay', () => {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ ...bounds, height });
});

ipcMain.on('toggle-visibility', () => {
  toggleVisibility();
});

// Window dragging
let dragOffset = { x: 0, y: 0 };

ipcMain.on('start-drag', (_event, mouseX: number, mouseY: number) => {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  dragOffset = {
    x: mouseX,
    y: mouseY
  };
});

ipcMain.on('drag-move', (_event, screenX: number, screenY: number) => {
  if (!mainWindow) return;
  mainWindow.setPosition(
    Math.round(screenX - dragOffset.x),
    Math.round(screenY - dragOffset.y)
  );
});

ipcMain.handle('get-window-position', () => {
  if (!mainWindow) return { x: 0, y: 0 };
  const [x, y] = mainWindow.getPosition();
  return { x, y };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
