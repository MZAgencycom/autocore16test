import { useState, useEffect } from 'react'

const LoadingFallback = () => {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(timer)
  }, [])

  if (!timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-4 text-center">
      <p className="text-sm text-muted-foreground">Le chargement prend plus de temps que prévu.</p>
      <button onClick={() => window.location.reload()} className="btn-primary px-4 py-2">
        Relancer
      </button>
    </div>
  )
}

export default LoadingFallback

