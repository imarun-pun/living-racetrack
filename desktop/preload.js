// Bridge between the Zoom-by overlay and the main process.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pitwall', {
  onDrive: cb => ipcRenderer.on('drive', (_e, opts) => cb(opts)),
  done: () => ipcRenderer.send('driveby-done')
});
