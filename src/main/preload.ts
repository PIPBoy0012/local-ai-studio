import { contextBridge, ipcRenderer } from 'electron'

// Expose a type-safe API to the renderer via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:set', settings),

  // Ollama
  listModels: () => ipcRenderer.invoke('ollama:list-models'),
  chat: (payload: {
    chatId: string
    model: string
    messages: Array<{ role: string; content: string }>
    ollamaUrl: string
  }) => ipcRenderer.invoke('ollama:chat', payload),
  abortChat: (chatId: string) => ipcRenderer.invoke('ollama:abort', chatId),
  onStream: (chatId: string, cb: (data: unknown) => void) => {
    const channel = `ollama:stream:${chatId}`
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => cb(data)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  // Files
  listDirectory: (dirPath: string) =>
    ipcRenderer.invoke('file:list-directory', dirPath),
  openDirectoryDialog: () => ipcRenderer.invoke('file:open-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read-file', filePath),

  // App
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  onUpdaterEvent: (cb: (event: string, data?: unknown) => void) => {
    const events = [
      'updater:checking',
      'updater:available',
      'updater:not-available',
      'updater:progress',
      'updater:downloaded',
      'updater:error',
    ]
    const listeners: Array<() => void> = events.map((ch) => {
      const fn = (_e: Electron.IpcRendererEvent, data?: unknown) => cb(ch, data)
      ipcRenderer.on(ch, fn)
      return () => ipcRenderer.removeListener(ch, fn)
    })
    return () => listeners.forEach((off) => off())
  },
})
