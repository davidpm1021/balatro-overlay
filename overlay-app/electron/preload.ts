// preload.ts - Use contextBridge, never expose raw Node APIs
import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Setting up electronAPI bridge');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game state updates from main process
  onGameStateUpdate: (callback: (state: unknown) => void) => {
    console.log('[Preload] Registering game-state:update listener');
    ipcRenderer.on('game-state:update', (_, state) => {
      console.log('[Preload] Received game-state:update', state ? 'with data' : 'empty');
      callback(state);
    });
  },

  // Overlay controls
  toggleClickThrough: () => {
    ipcRenderer.send('overlay:toggle-clickthrough');
  },

  setOpacity: (opacity: number) => {
    ipcRenderer.send('overlay:set-opacity', opacity);
  },

  minimizeOverlay: () => {
    ipcRenderer.send('overlay:minimize');
  },

  restoreOverlay: () => {
    ipcRenderer.send('overlay:restore');
  },
});
