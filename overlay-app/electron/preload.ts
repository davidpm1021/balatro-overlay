// preload.ts - Use contextBridge, never expose raw Node APIs
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Game state updates from main process
  onGameStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('game-state-update', (_, state) => callback(state));
  },

  // Overlay controls
  setClickThrough: (enabled: boolean) => {
    ipcRenderer.send('set-click-through', enabled);
  },

  setOpacity: (opacity: number) => {
    ipcRenderer.send('set-opacity', opacity);
  },

  minimizeOverlay: () => {
    ipcRenderer.send('minimize-overlay');
  },

  restoreOverlay: () => {
    ipcRenderer.send('restore-overlay');
  },
});
