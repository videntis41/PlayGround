import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = dirname(fileURLToPath(import.meta.url))
const runtime = join(process.env.HOME || '', '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR

function fail(message, exitCode = 1) {
  const error = new Error(message)
  error.exitCode = exitCode
  throw error
}

function timing(label, started) {
  console.error(`[timing] capture ${label}: ${Date.now() - started} ms`)
}

if (!url || !output) fail('Set CAPTURE_URL and CAPTURE_DIR.')
const target = resolve(output)
if (target === project || target.startsWith(project + sep)) {
  fail('CAPTURE_DIR must be outside the project source directory.')
}

let config
try {
  config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
} catch (error) {
  console.error(error)
  process.exit(75)
}
if (process.platform === 'linux') {
  try {
    process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
  } catch (error) {
    console.error(error)
    process.exit(75)
  }
}

mkdirSync(target, { recursive: true })

const transient = error => {
  error.exitCode = 75
  return error
}

let browser
let failure
try {
  const launchStarted = Date.now()
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => {
    throw transient(error)
  })
  timing('launch', launchStarted)

  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const pageErrors = []
    const pageStarted = Date.now()
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce'
    }).catch(error => {
      throw transient(error)
    })
    const page = await context.newPage().catch(error => {
      throw transient(error)
    })
    page.setDefaultTimeout(30000)
    page.on('pageerror', error => pageErrors.push(error.message))

    const navStarted = Date.now()
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
      throw transient(error)
    })
    if (!response) throw transient(new Error(`No response loading ${url}`))
    if (!response.ok()) {
      const code = [408, 429, 502, 503, 504].includes(response.status()) ? 75 : 1
      fail(`HTTP ${response.status()} loading ${url}`, code)
    }
    timing(`${name} navigation`, navStarted)

    const readyStarted = Date.now()
    await page.waitForSelector('#app[data-ready="true"]', { state: 'attached', timeout: 30000 }).catch(error => {
      error.exitCode = 1
      throw error
    })
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {})
    timing(`${name} render ready`, readyStarted)

    const startStarted = Date.now()
    const startControl = page.locator('[data-capture-start]').first()
    if (await startControl.isVisible().catch(() => false)) {
      await startControl.click({ timeout: 5000 }).catch(error => {
        error.exitCode = 1
        throw error
      })
    }
    await page.waitForSelector('#studio:not([hidden])', { state: 'visible', timeout: 10000 }).catch(error => {
      error.exitCode = 1
      throw error
    })
    await page.waitForFunction(() => document.body.dataset.studioReady === 'true', null, { timeout: 10000 }).catch(error => {
      error.exitCode = 1
      throw error
    })
    await page.waitForTimeout(900)
    timing(`${name} start`, startStarted)

    if (pageErrors.length) {
      fail(`Page error during ${name} capture: ${pageErrors.join(' | ')}`, 1)
    }

    const shotStarted = Date.now()
    await page.screenshot({ path: join(target, `final-${name}.png`), timeout: 30000 }).catch(error => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) throw transient(error)
      error.exitCode = 1
      throw error
    })
    timing(`${name} screenshot`, shotStarted)
    timing(`${name} total`, pageStarted)
    console.log(`Captured ${name} ${width}x${height} to ${join(target, `final-${name}.png`)}`)
    await context.close().catch(() => {})
  }
} catch (error) {
  failure = error
  console.error(error)
} finally {
  await browser?.close().catch(error => {
    console.error(error)
    failure ||= transient(error)
  })
  process.exitCode = failure ? failure.exitCode || 1 : 0
}
