import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/hello')
      .then(r => r.json())
      .then(setResult)
      .catch(e => setError(e.message))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-green-800 mb-6">
        Tri-Valley Tree Care text-back demo
      </h1>
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">/api/hello</h2>
        {error && <p className="text-red-600">{error}</p>}
        {!error && !result && <p className="text-gray-400">Loading...</p>}
        {result && (
          <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  )
}

export default App
