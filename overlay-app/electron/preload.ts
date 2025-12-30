// preload.ts - Use contextBridge, never expose raw Node APIs
import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Setting up electronAPI bridge');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game state updates from main process (channel fixed to match main.ts)
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

  setClickThrough: (enabled: boolean) => {
    ipcRenderer.send('set-click-through', enabled);
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

  // Quit app completely
  quitApp: () => {
    ipcRenderer.send('app:quit');
  },
});
