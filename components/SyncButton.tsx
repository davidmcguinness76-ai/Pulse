'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { lastSyncedAt: Date | null; compact?: boolean }

export function SyncButton({ lastSyncedAt, compact = false }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    const res = await fetch('/api/sync', { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (data.skipped) {
      setResult('Recently synced')
    } else if (data.ok) {
      setResult('Synced!')
      router.refresh()
    } else {
      setResult('Failed')
    }
  }

  const lastSyncText = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
    : 'Never synced'

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          {syncing ? 'Syncing...' : '↻ Sync'}
        </button>
        <span className="text-[10px] text-gray-400">{result ?? lastSyncText}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black font-semibold py-2 rounded-lg transition-colors"
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      <p className="text-xs text-gray-500 text-center">{result ?? lastSyncText}</p>
    </div>
  )
}
