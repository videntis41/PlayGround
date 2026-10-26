import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

const project = resolve(process.env.PROJECT_DIR || process.cwd())
const source = join(project, 'src')
const output = join(project, 'dist')
const started = performance.now()

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(source, output, { recursive: true })

const files = await readdir(output, { recursive: true, withFileTypes: true })
const assets = files.filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort()
const digest = createHash('sha256')
for (const file of assets) digest.update(file.replace(project, ''))

await writeFile(join(output, 'build.json'), JSON.stringify({
  builtAt: new Date().toISOString(),
  source: 'src',
  files: assets.length,
  digest: digest.digest('hex').slice(0, 16)
}, null, 2))

console.log(`Built ${assets.length} static files into ${output} in ${Math.round(performance.now() - started)}ms`)
