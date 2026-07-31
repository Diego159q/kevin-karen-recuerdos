import { useEffect, useState } from 'react'

export function useBeforeInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function handlePrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    function handleInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  return { canInstall: Boolean(installPrompt) && !installed, promptInstall, installed }
}
