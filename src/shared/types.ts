// Shared types between main and renderer processes

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string
}

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
  details?: {
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaListResponse {
  models: OllamaModel[]
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modified?: number
}

export interface AppSettings {
  ollamaUrl: string
  selectedModel: string
  workingDirectory: string
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  autoUpdate: boolean
}

export interface SecurityReminder {
  id: string
  category: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  codeExample?: string
  fixExample?: string
}

export type IpcChannel =
  | 'ollama:list-models'
  | 'ollama:chat'
  | 'ollama:abort'
  | 'file:list-directory'
  | 'file:open-dialog'
  | 'file:read-file'
  | 'settings:get'
  | 'settings:set'
  | 'app:get-version'
  | 'app:check-update'
  | 'app:install-update'
