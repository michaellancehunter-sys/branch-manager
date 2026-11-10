import { useState } from 'react'
import Chat from './components/Chat.jsx'

export default function App() {
  const [chatKey, setChatKey] = useState(0)

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="text-center pt-6 pb-2 px-4">
        <h1 className="text-2xl font-bold text-green-900 tracking-tight">Leaf a Message</h1>
        <p className="text-sm text-stone-500 mt-1">
          Missed-call text-back for Tri-Valley Tree Care (Phase 1 prototype)
        </p>
      </header>
      <main className="flex-1 flex justify-center px-4 py-6">
        <Chat key={chatKey} onReset={() => setChatKey(k => k + 1)} />
      </main>
    </div>
  )
}
