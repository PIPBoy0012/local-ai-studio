import React from 'react'

interface Props {
  downloaded: boolean
  onInstall: () => void
  onDismiss: () => void
}

export default function UpdateBanner({ downloaded, onInstall, onDismiss }: Props) {
  return (
    <div className="update-banner" role="alert">
      <span className="update-banner-msg">
        {downloaded
          ? '✅ Update downloaded — restart to apply the latest version.'
          : '⬆️ A new version of Local AI Studio is available.'}
      </span>
      <div className="update-banner-actions">
        {downloaded && (
          <button className="btn btn-ghost" onClick={onInstall}>
            Restart & Install
          </button>
        )}
        <button className="btn btn-ghost" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
