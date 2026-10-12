// Bridge between the Lapwall window and the main process. Exposes only what the page needs:
// whether this is the locked wall display, who the licence belongs to, and the PIN pad.
const { contextBridge, ipcRenderer } = require('electron');
const info = ipcRenderer.sendSync('lapwall-info') || {};
contextBridge.exposeInMainWorld('lapwall', {
  display: !!info.display,
  hasPin: !!info.hasPin,
  licence: info.licence ? { name: String(info.licence.name), id: String(info.licence.id) } : null,
  onAskPin: cb => ipcRenderer.on('ask-pin', () => cb()),
  submitPin: pin => ipcRenderer.invoke('lapwall-pin', String(pin).slice(0, 12)),
  setPin: (current, next) => ipcRenderer.invoke('lapwall-set-pin', String(current).slice(0, 12), String(next).slice(0, 12))
});
