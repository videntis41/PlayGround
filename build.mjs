import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = dirname(fileURLToPath(import.meta.url))
const source = resolve(project, 'src')
const output = resolve(project, 'dist')

if (!existsSync(resolve(source, 'index.html'))) {
  throw new Error(`Missing source entry: ${resolve(source, 'index.html')}`)
}

rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
cpSync(source, output, { recursive: true })
console.log(`Built ${output}`)
