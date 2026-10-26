import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { performance } from 'node:perf_hooks'

const project = resolve(process.env.PROJECT_DIR || process.cwd())
const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR

function fail(message, exitCode) {
  throw Object.assign(new Error(message), { exitCode })
}

if (!url) fail('Set CAPTURE_URL to the exact preview URL.', 1)
if (!output) fail('Set CAPTURE_DIR to an output directory outside the project.', 1)
const outputDirectory = resolve(output)
if (outputDirectory === project || outputDirectory.startsWith(project + sep)) {
  fail('CAPTURE_DIR must be outside the project source tree.', 1)
}

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (process.platform === 'linux' && !process.env.DISPLAY) {
  process.env.DISPLAY = ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
}

mkdirSync(outputDirectory, { recursive: true })

const views = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
]

let browser
let exitCode = 0
const started = performance.now()
const elapsed = () => `${Math.round(performance.now() - started)}ms`

try {
  const launchStarted = performance.now()
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => {
    fail(`Browser launch failed: ${error.message}`, 75)
  })
  console.log(`Browser launched in ${Math.round(performance.now() - launchStarted)}ms`)

  for (const view of views) {
    const pageStarted = performance.now()
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: 1,
      isMobile: view.mobile,
      hasTouch: view.mobile
    }).catch(error => fail(`Could not create ${view.name} page: ${error.message}`, 75))

    page.setDefaultTimeout(30000)
    const pageErrors = []
    const failedRequests = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('requestfailed', request => {
      if (request.url().startsWith('http')) failedRequests.push(`${request.url()} (${request.failure()?.errorText || 'failed'})`)
    })
    page.on('response', response => {
      if (response.url().startsWith('http') && response.status() >= 400) {
        failedRequests.push(`${response.url()} (HTTP ${response.status()})`)
      }
    })

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
      fail(`Navigation to ${url} failed: ${error.message}`, 75)
    })
    if (!response) fail(`No HTTP response from ${url}.`, 75)
    if (!response.ok()) {
      const transient = response.status() >= 500 || [408, 429].includes(response.status())
      fail(`HTTP ${response.status()} loading ${url}.`, transient ? 75 : 1)
    }

    await page.waitForSelector('[data-app-ready="true"]', { state: 'attached', timeout: 20000 }).catch(error => {
      fail(`Rendered app marker did not appear: ${error.message}`, 1)
    })
    await page.waitForFunction(() => document.fonts?.status === 'loaded', null, { timeout: 10000 }).catch(() => {})
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1100)

    if (pageErrors.length) fail(`Page rendered with JavaScript errors: ${pageErrors.join('; ')}`, 1)
    if (failedRequests.length) fail(`Page requested missing resources: ${failedRequests.slice(0, 4).join('; ')}`, 1)

    const screenshotPath = join(outputDirectory, `final-${view.name}.png`)
    await page.screenshot({ path: screenshotPath, timeout: 30000 }).catch(error => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) {
        fail(`Screenshot timed out for ${view.name}: ${error.message}`, 75)
      }
      fail(`Screenshot failed for ${view.name}: ${error.message}`, 1)
    })

    const size = statSync(screenshotPath).size
    const header = readFileSync(screenshotPath).subarray(0, 8).toString('hex')
    if (header !== '89504e470d0a1a0a') fail(`Screenshot is not a PNG: ${screenshotPath}`, 1)
    if (size < 15000) fail(`Screenshot looks empty (${size} bytes): ${screenshotPath}`, 1)

    console.log(`Captured ${view.name} ${view.width}x${view.height} -> ${screenshotPath} (${size} bytes, ${Math.round(performance.now() - pageStarted)}ms)`)
    await page.close()
  }
} catch (error) {
  console.error(error.stack || error.message)
  exitCode = error.exitCode || 1
} finally {
  if (browser) {
    await browser.close().catch(error => {
      console.error(`Browser close failed: ${error.message}`)
      if (!exitCode) exitCode = 75
    })
  }
  console.log(`Capture finished in ${elapsed()} with exit code ${exitCode}`)
}

process.exitCode = exitCode
