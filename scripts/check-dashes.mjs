import { readFileSync, existsSync } from 'fs'
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const EM_DASH = '—'
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')

function collectFiles(dir) {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      results.push(...collectFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}

const dirs = ['src', 'api', 'scripts', 'prompts', 'evals', 'apps-script'].map(d => join(ROOT, d))
const singles = ['CLAUDE.md', 'README.md'].map(f => join(ROOT, f)).filter(existsSync)

const allFiles = [
  ...dirs.flatMap(collectFiles),
  ...singles,
]

let found = 0
for (const file of allFiles) {
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(EM_DASH)) {
      console.log(`${relative(ROOT, file)}:${i + 1}`)
      found++
    }
  }
}

if (found > 0) {
  console.error(`\n${found} em dash(es) found. Remove them before committing.`)
  process.exit(1)
} else {
  console.log('No em dashes found.')
}
