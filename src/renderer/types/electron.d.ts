import type { AppSettings, FileEntry, OllamaListResponse } from '@shared/types'

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>

  // Ollama
  listModels: () => Promise<OllamaListResponse>
  chat: (payload: {
    chatId: string
    model: string
    messages: Array<{ role: string; content: string }>
    ollamaUrl: string
  }) => Promise<void>
  abortChat: (chatId: string) => Promise<void>
  onStream: (chatId: string, cb: (data: unknown) => void) => () => void

  // Files
  listDirectory: (dirPath: string) => Promise<FileEntry[]>
  openDirectoryDialog: () => Promise<string | null>
  readFile: (filePath: string) => Promise<string>

  // App
  getVersion: () => Promise<string>
  checkUpdate: () => Promise<{ available: boolean; version?: string }>
  installUpdate: () => Promise<void>
  onUpdaterEvent: (cb: (event: string, data?: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
