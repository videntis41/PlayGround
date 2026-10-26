import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const project = resolve(process.env.PROJECT_DIR || process.cwd())
const root = resolve(project, 'dist')
const port = Number(process.env.PORT || 3000)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary'
}

function fileFor(url) {
  const pathname = decodeURIComponent(url.pathname)
  const requested = resolve(root, '.' + pathname)
  if (requested !== root && !requested.startsWith(root + sep)) return null
  try {
    const stats = statSync(requested)
    if (stats.isDirectory()) return join(requested, 'index.html')
    return requested
  } catch {
    if (!extname(pathname)) return join(root, 'index.html')
    return null
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (url.pathname === '/__health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ ok: true, service: 'sole-mate' }))
    return
  }

  const file = fileFor(url)
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  let stats
  try {
    stats = statSync(file)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stats.size,
    'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(file).on('error', () => response.destroy()).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Sole Mate listening on http://0.0.0.0:${port} serving ${root}`)
})

function shutdown(signal) {
  console.log(`Received ${signal}, closing server`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 4000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
