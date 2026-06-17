import React from 'react'
import type { AppSettings } from '@shared/types'

interface Props {
  settings: AppSettings
  onChange: (s: Partial<AppSettings>) => void
}

export default function Settings({ settings, onChange }: Props) {
  return (
    <div className="settings-panel">
      <div className="panel-header">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <h1>Settings</h1>
      </div>

      <div className="settings-body">
        {/* Ollama section */}
        <div className="settings-section">
          <h2>Ollama Connection</h2>

          <div className="settings-row">
            <label htmlFor="ollama-url">Ollama API URL</label>
            <input
              id="ollama-url"
              className="input"
              type="url"
              value={settings.ollamaUrl}
              onChange={(e) => onChange({ ollamaUrl: e.target.value })}
              placeholder="http://localhost:11434"
            />
            <span className="hint">
              Default: http://localhost:11434. Change if Ollama runs on a different host or port.
            </span>
          </div>
        </div>

        {/* Appearance section */}
        <div className="settings-section">
          <h2>Appearance</h2>

          <div className="settings-row">
            <label htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              className="select"
              value={settings.theme}
              onChange={(e) =>
                onChange({ theme: e.target.value as AppSettings['theme'] })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="settings-row">
            <label htmlFor="font-size">Font Size: {settings.fontSize}px</label>
            <input
              id="font-size"
              type="range"
              min={11}
              max={20}
              value={settings.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
            />
          </div>
        </div>

        {/* Updates section */}
        <div className="settings-section">
          <h2>Updates</h2>

          <div className="settings-row">
            <div className="toggle-row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.autoUpdate}
                  onChange={(e) => onChange({ autoUpdate: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
              <span>Enable automatic update checks</span>
            </div>
            <span className="hint">
              When enabled, the app checks for updates every 4 hours. You still choose
              when to install.
            </span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => window.electronAPI.checkUpdate()}
          >
            🔄 Check for Updates Now
          </button>
        </div>

        {/* About section */}
        <div className="settings-section">
          <h2>About</h2>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            <p>
              <strong style={{ color: 'var(--color-text)' }}>Local AI Studio</strong> is an
              open-source GUI for running local AI coding assistants via Ollama.
            </p>
            <p style={{ marginTop: 8 }}>
              Your conversations and files never leave your machine.
            </p>
            <p style={{ marginTop: 8 }}>
              <a
                href="https://github.com/PIPBoy0012/local-ai-studio"
                style={{ color: 'var(--color-accent-soft)' }}
                onClick={(e) => {
                  e.preventDefault()
                  // In Electron, links are handled by the shell via preload
                }}
              >
                github.com/PIPBoy0012/local-ai-studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
