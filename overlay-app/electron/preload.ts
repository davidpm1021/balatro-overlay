// preload.ts - Use contextBridge, never expose raw Node APIs
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Game state updates from main process (channel fixed to match main.ts)
  onGameStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('game-state:update', (_, state) => callback(state));
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

  // Visibility toggle (for hotkey feedback)
  toggleVisibility: () => {
    ipcRenderer.send('toggle-visibility');
  },

  onVisibilityChange: (callback: (isVisible: boolean) => void) => {
    ipcRenderer.on('visibility-changed', (_, isVisible) => callback(isVisible));
  },

  // Window dragging
  startDrag: (mouseX: number, mouseY: number) => {
    ipcRenderer.send('start-drag', mouseX, mouseY);
  },

  dragMove: (screenX: number, screenY: number) => {
    ipcRenderer.send('drag-move', screenX, screenY);
  },

  getWindowPosition: (): Promise<{ x: number; y: number }> => {
    return ipcRenderer.invoke('get-window-position');
  },
});
