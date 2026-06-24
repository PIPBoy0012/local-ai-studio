import React, { useState, useEffect } from 'react'
import type { FileEntry } from '@shared/types'

interface Props {
  workingDirectory: string
  onDirectoryChange: (dir: string) => void
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(entry: FileEntry): string {
  if (entry.isDirectory) return '📁'
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
  const iconMap: Record<string, string> = {
    ts: '📘', tsx: '📘', js: '📙', jsx: '📙', json: '📄',
    md: '📝', txt: '📄', py: '🐍', rs: '🦀', go: '🐹',
    html: '🌐', css: '🎨', scss: '🎨', yaml: '⚙️', yml: '⚙️',
    toml: '⚙️', sh: '⚡', bash: '⚡', env: '🔒', gitignore: '🔒',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼',
    pdf: '📕', zip: '📦', tar: '📦', gz: '📦',
  }
  return iconMap[ext] ?? '📄'
}

export default function FileExplorer({ workingDirectory, onDirectoryChange }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState(workingDirectory)
  const [selected, setSelected] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [viewingFile, setViewingFile] = useState<FileEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([workingDirectory])
  const [historyIndex, setHistoryIndex] = useState(0)

  useEffect(() => {
    loadDirectory(workingDirectory)
  }, [workingDirectory])

  async function loadDirectory(path: string) {
    try {
      setError(null)
      const result = await window.electronAPI.listDirectory(path)
      setEntries(result)
      setCurrentPath(path)
      setSelected(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function openBrowseDialog() {
    const dir = await window.electronAPI.openDirectoryDialog()
    if (dir) {
      onDirectoryChange(dir)
      pushHistory(dir)
      loadDirectory(dir)
    }
  }

  function pushHistory(path: string) {
    const newHistory = [...history.slice(0, historyIndex + 1), path]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  function navigateBack() {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      loadDirectory(prev)
    }
  }

  function navigateForward() {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      loadDirectory(next)
    }
  }

  async function handleEntryClick(entry: FileEntry) {
    if (entry.isDirectory) {
      pushHistory(entry.path)
      loadDirectory(entry.path)
    } else {
      setSelected(entry.path)
      try {
        setError(null)
        const content = await window.electronAPI.readFile(entry.path)
        setFileContent(content)
        setViewingFile(entry)
      } catch (err) {
        setError((err as Error).message)
      }
    }
  }

  function handleNavigateUp() {
    const parent = currentPath.split(/[\\/]/).slice(0, -1).join('/')
    if (parent) {
      pushHistory(parent)
      loadDirectory(parent)
    }
  }

  return (
    <div className="file-explorer">
      {/* Header */}
      <div className="panel-header">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <h1>File Explorer</h1>
        <div className="panel-header-actions">
          <button className="btn btn-primary" onClick={openBrowseDialog}>
            📂 Open Folder
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="file-explorer-toolbar">
        <button
          className="btn btn-ghost"
          onClick={navigateBack}
          disabled={historyIndex === 0}
          title="Back"
        >
          ←
        </button>
        <button
          className="btn btn-ghost"
          onClick={navigateForward}
          disabled={historyIndex === history.length - 1}
          title="Forward"
        >
          →
        </button>
        <button className="btn btn-ghost" onClick={handleNavigateUp} title="Up">
          ↑
        </button>
        <span className="file-path-display" title={currentPath}>
          {currentPath}
        </span>
        <button className="btn btn-ghost" onClick={() => loadDirectory(currentPath)} title="Refresh">
          ↺
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 20px', color: 'var(--color-error)', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* File list */}
      <div className="file-list">
        {entries.length === 0 && !error && (
          <div style={{ padding: 20, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Empty directory
          </div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.path}
            className={`file-entry ${selected === entry.path ? 'selected' : ''}`}
            onClick={() => handleEntryClick(entry)}
            title={entry.name}
          >
            <span className="file-icon">{fileIcon(entry)}</span>
            <span className="file-name">{entry.name}</span>
            {!entry.isDirectory && (
              <span className="file-size">{formatSize(entry.size)}</span>
            )}
          </div>
        ))}
      </div>

      {/* File viewer modal */}
      {viewingFile && fileContent !== null && (
        <div className="file-viewer" onClick={() => setViewingFile(null)}>
          <div
            className="file-viewer-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="file-viewer-header">
              <span>{fileIcon(viewingFile)}</span>
              <h3>{viewingFile.path}</h3>
              <button
                className="btn btn-ghost"
                onClick={() => setViewingFile(null)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                ✕ Close
              </button>
            </div>
            <div className="file-viewer-content selectable">
              {fileContent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
