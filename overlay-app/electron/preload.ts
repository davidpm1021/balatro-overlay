import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
  // Receive game state updates from main process
  onGameStateUpdate: (callback: (gameState: unknown) => void) => void;

  // Overlay controls
  toggleClickThrough: () => void;
  setOpacity: (opacity: number) => void;
  minimize: () => void;
  restore: () => void;
}

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Game state updates
  onGameStateUpdate: (callback: (gameState: unknown) => void) => {
    ipcRenderer.on('game-state:update', (_event, gameState) => {
      callback(gameState);
    });
  },

  // Overlay controls
  toggleClickThrough: () => {
    ipcRenderer.send('overlay:toggle-clickthrough');
  },

  setOpacity: (opacity: number) => {
    ipcRenderer.send('overlay:set-opacity', opacity);
  },

  minimize: () => {
    ipcRenderer.send('overlay:minimize');
  },

  restore: () => {
    ipcRenderer.send('overlay:restore');
  },
} as ElectronAPI);
