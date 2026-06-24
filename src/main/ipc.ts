import * as path from 'path'
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import { app, BrowserWindow } from 'electron'
import type { IpcMain, Dialog } from 'electron'
import type { AppSettings, FileEntry } from '../shared/types'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  ollamaUrl: 'http://localhost:11434',
  selectedModel: '',
  workingDirectory: app.getPath('home'),
  theme: 'dark',
  fontSize: 14,
  autoUpdate: true,
}

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

/**
 * Make an HTTP/HTTPS GET request and return the response body as a string.
 * Uses only built-in Node modules to avoid bundling extra network libs.
 */
function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })
        res.on('end', () => resolve(data))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

/**
 * Stream an HTTP/HTTPS POST request and call onChunk for each streamed line.
 */
function httpPostStream(
  url: string,
  body: string,
  onChunk: (line: string) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === 'https:' ? https : http
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = lib.request(options, (res) => {
      let buffer = ''
      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) onChunk(line)
        }
      })
      res.on('end', () => {
        if (buffer.trim()) onChunk(buffer)
        resolve()
      })
      res.on('error', reject)
    })

    req.on('error', reject)

    signal.addEventListener('abort', () => {
      req.destroy()
      resolve()
    })

    req.write(body)
    req.end()
  })
}

export function registerIpcHandlers(
  ipcMain: IpcMain,
  dialog: Dialog,
): void {
  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => loadSettings())

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    const current = loadSettings()
    const updated = { ...current, ...settings }
    saveSettings(updated)
    return updated
  })

  // ── Ollama: list models ───────────────────────────────────────────────────
  ipcMain.handle('ollama:list-models', async () => {
    const settings = loadSettings()
    const url = `${settings.ollamaUrl}/api/tags`
    const body = await httpGet(url)
    return JSON.parse(body)
  })

  // ── Ollama: chat (streaming) ──────────────────────────────────────────────
  const abortControllers = new Map<string, AbortController>()

  ipcMain.handle(
    'ollama:chat',
    async (event, { chatId, model, messages, ollamaUrl }: {
      chatId: string
      model: string
      messages: Array<{ role: string; content: string }>
      ollamaUrl: string
    }) => {
      const controller = new AbortController()
      abortControllers.set(chatId, controller)

      const url = `${ollamaUrl}/api/chat`
      const body = JSON.stringify({ model, messages, stream: true })

      try {
        await httpPostStream(
          url,
          body,
          (line) => {
            try {
              const parsed = JSON.parse(line)
              event.sender.send(`ollama:stream:${chatId}`, parsed)
            } catch {
              // skip malformed lines
            }
          },
          controller.signal,
        )
      } finally {
        abortControllers.delete(chatId)
        event.sender.send(`ollama:stream:${chatId}`, { done: true })
      }
    },
  )

  ipcMain.handle('ollama:abort', (_event, chatId: string) => {
    abortControllers.get(chatId)?.abort()
    abortControllers.delete(chatId)
  })

  // ── File: list directory ──────────────────────────────────────────────────
  ipcMain.handle('file:list-directory', async (_event, dirPath: string): Promise<FileEntry[]> => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const fullPath = path.join(dirPath, e.name)
        let size: number | undefined
        let modified: number | undefined
        try {
          const stat = fs.statSync(fullPath)
          size = stat.size
          modified = stat.mtimeMs
        } catch {
          // skip inaccessible files
        }
        return {
          name: e.name,
          path: fullPath,
          isDirectory: e.isDirectory(),
          size,
          modified,
        }
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  })

  // ── File: open folder dialog ──────────────────────────────────────────────
  ipcMain.handle('file:open-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Select Working Directory',
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // ── File: read file content ───────────────────────────────────────────────
  ipcMain.handle('file:read-file', async (_event, filePath: string): Promise<string> => {
    const MAX_SIZE = 1024 * 1024 // 1 MB guard
    const stat = fs.statSync(filePath)
    if (stat.size > MAX_SIZE) {
      throw new Error(`File too large (${(stat.size / 1024).toFixed(0)} KB). Max 1 MB.`)
    }
    return fs.readFileSync(filePath, 'utf-8')
  })
}
