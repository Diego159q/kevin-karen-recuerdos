import { useEffect, useState } from 'react'

export function SplashScreen({ coupleName, weddingDate }) {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => setLeaving(true), 1600)
    const removeTimer = setTimeout(() => setGone(true), 2100)
    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (gone) return null

  return (
    <div className={`splash-screen${leaving ? ' exit' : ''}`}>
      <div>
        <div className="splash-brand">K&K</div>
        <p className="splash-caption">{coupleName} · {weddingDate}</p>
      </div>
    </div>
  )
}
