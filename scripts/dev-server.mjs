import http from 'http'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { URL } from 'url'

const ROOT = join(import.meta.dirname, '..')

const envPath = join(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}

const { default: chatHandler } = await import('../api/chat.js')
const { default: openingHandler } = await import('../api/opening.js')
const { default: helloHandler } = await import('../api/hello.js')

const PORT = process.env.PORT || 3000

function wrapRes(raw) {
  return {
    _code: 200,
    status(code) { this._code = code; return this },
    json(data) {
      raw.writeHead(this._code, { 'Content-Type': 'application/json' })
      raw.end(JSON.stringify(data))
    },
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost`)
  const path = u.pathname

  let body = {}
  if (req.method !== 'GET') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString()
    if (raw) { try { body = JSON.parse(raw) } catch {} }
  }

  req.query = Object.fromEntries(u.searchParams)
  req.body = body

  const mockRes = wrapRes(res)

  try {
    if (path === '/api/chat') {
      await chatHandler(req, mockRes)
    } else if (path === '/api/opening') {
      openingHandler(req, mockRes)
    } else if (path === '/api/hello') {
      helloHandler(req, mockRes)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  } catch (err) {
    console.error(err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`)
})
