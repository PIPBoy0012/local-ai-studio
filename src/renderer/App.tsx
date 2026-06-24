import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import ChatPanel from './components/Chat/ChatPanel'
import FileExplorer from './components/FileExplorer/FileExplorer'
import SecurityReminders from './components/SecurityReminders/SecurityReminders'
import Settings from './components/Settings/Settings'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import type { AppSettings } from '@shared/types'

export type ActivePanel = 'chat' | 'files' | 'security' | 'settings'

export default function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    // Load settings on mount
    window.electronAPI.getSettings().then(setSettings).catch(console.error)

    // Listen for updater events
    const off = window.electronAPI.onUpdaterEvent((event) => {
      if (event === 'updater:available') setUpdateAvailable(true)
      if (event === 'updater:downloaded') setUpdateDownloaded(true)
    })
    return off
  }, [])

  const handleSettingsChange = async (updated: Partial<AppSettings>) => {
    const saved = await window.electronAPI.setSettings(updated)
    setSettings(saved as AppSettings)
  }

  if (!settings) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading Local AI Studio…</p>
      </div>
    )
  }

  return (
    <div className="app-root">
      {(updateAvailable || updateDownloaded) && (
        <UpdateBanner
          downloaded={updateDownloaded}
          onInstall={() => window.electronAPI.installUpdate()}
          onDismiss={() => {
            setUpdateAvailable(false)
            setUpdateDownloaded(false)
          }}
        />
      )}
      <div className="app-main">
        <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
        <main className="app-content">
          {activePanel === 'chat' && (
            <ChatPanel settings={settings} onSettingsChange={handleSettingsChange} />
          )}
          {activePanel === 'files' && (
            <FileExplorer
              workingDirectory={settings.workingDirectory}
              onDirectoryChange={(dir) => handleSettingsChange({ workingDirectory: dir })}
            />
          )}
          {activePanel === 'security' && <SecurityReminders />}
          {activePanel === 'settings' && (
            <Settings settings={settings} onChange={handleSettingsChange} />
          )}
        </main>
      </div>
    </div>
  )
}
