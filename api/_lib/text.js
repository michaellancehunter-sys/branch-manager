export function sanitize(text) {
  if (!text) return text
  let s = text
    .replace(/;/g, '.')
    .replace(/:(?!\d)/g, '.')
  s = s.replace(/\.\s+([a-z])/g, (_, ch) => '. ' + ch.toUpperCase())
  s = s.replace(/\.{2,}/g, '.').replace(/ {2,}/g, ' ')
  return s.trim()
}
