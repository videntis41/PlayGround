import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = dirname(fileURLToPath(import.meta.url))
const root = resolve(project, 'dist')
const port = Number(process.env.PORT || 3000)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
}

if (!existsSync(resolve(root, 'index.html'))) {
  console.error(`Missing build output: ${resolve(root, 'index.html')}`)
  process.exit(1)
}

function sendFile(req, res, file) {
  const stats = statSync(file)
  const head = req.method === 'HEAD'
  res.writeHead(200, {
    'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stats.size,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  })
  if (head) {
    res.end()
    return
  }
  createReadStream(file).pipe(res)
}

const server = createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      res.end('Method not allowed')
      return
    }
    const url = new URL(req.url || '/', 'http://localhost')
    let pathname
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      res.writeHead(400)
      res.end('Bad request')
      return
    }
    const candidate = resolve(root, `.${pathname}`)
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      sendFile(req, res, candidate)
      return
    }
    const fallback = resolve(root, 'index.html')
    sendFile(req, res, fallback)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal server error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Sole Mate serving ${root} on http://0.0.0.0:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000).unref()
  })
}
