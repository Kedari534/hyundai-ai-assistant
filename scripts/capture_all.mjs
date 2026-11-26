import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const artifactDir = 'C:\\Users\\kedar\\.gemini\\antigravity\\brain\\a5a28100-c3ec-43db-b8f3-493b2366fc76'

const viewports = [
  { name: '1536', width: 1536, height: 960 },
  { name: '1280', width: 1280, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '360', width: 360, height: 780 },
]

const pages = [
  { route: '/login', name: 'login' },
  { route: '/dashboard', name: 'dashboard' },
  { route: '/chat', name: 'chat' },
  { route: '/compare', name: 'compare' },
  { route: '/recommend', name: 'recommend' },
  { route: '/documents', name: 'documents' },
  { route: '/design-system', name: 'design_system' },
]

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  })

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    })

    // Mock auth & API data so pages render full realistic UI deterministically
    await context.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          fullName: 'Hyundai Sales Consultant',
          email: 'consultant@hyundai.in',
          role: 'DEALER',
        }),
      })
    })

    await context.route('**/api/documents/models', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['Alcazar', 'Creta', 'i20', 'Aura']),
      })
    })

    await context.route('**/api/documents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-1',
            displayName: 'Hyundai Alcazar 2024 Product Guide & Technical Specs',
            vehicleModel: 'Alcazar',
            totalPages: 14,
            chunksCount: 16,
            status: 'COMPLETED',
            uploadedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'doc-2',
            displayName: 'Hyundai Creta 2024 Official Brochure',
            vehicleModel: 'Creta',
            totalPages: 12,
            chunksCount: 12,
            status: 'COMPLETED',
            uploadedAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'doc-3',
            displayName: 'Hyundai i20 2024 Specification Guide',
            vehicleModel: 'i20',
            totalPages: 8,
            chunksCount: 8,
            status: 'COMPLETED',
            uploadedAt: new Date(Date.now() - 14400000).toISOString(),
          },
          {
            id: 'doc-4',
            displayName: 'Hyundai Aura 2024 Strategic Family Sedan Guide',
            vehicleModel: 'Aura',
            totalPages: 10,
            chunksCount: 10,
            status: 'COMPLETED',
            uploadedAt: new Date(Date.now() - 28800000).toISOString(),
          },
        ]),
      })
    })

    await context.route('**/api/chat/sessions', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sess-1',
            title: 'Alcazar vs Creta Comparison',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 'sess-2',
            title: 'i20 vs Aura Engine & Boot Space Inquiry',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'sess-3',
            title: 'Family 6-seater Recommendation',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]),
      })
    })

    const page = await context.newPage()

    // Inject session into localStorage so Protected routes allow access
    await page.goto('http://localhost:4173/login')
    await page.evaluate(() => {
      localStorage.setItem(
        'hyundai.session',
        JSON.stringify({
          token: 'valid-test-token',
          user: {
            id: 'user-1',
            fullName: 'Hyundai Sales Consultant',
            email: 'consultant@hyundai.in',
            role: 'DEALER',
          },
        })
      )
    })

    for (const p of pages) {
      const url = `http://localhost:4173${p.route}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400) // allow Framer motion route transition to complete

      const screenshotPath = path.join(artifactDir, `screenshot_${p.name}_${vp.name}.png`)
      await page.screenshot({ path: screenshotPath })
      console.log(`Saved: ${p.name} @ ${vp.name}px -> ${screenshotPath}`)
    }

    await context.close()
  }

  await browser.close()
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
