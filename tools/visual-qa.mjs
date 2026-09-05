import { access, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('C:/Users/AA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium } = require('playwright');
const root = path.resolve('.');
const output = path.join(root, 'docs', 'ui-qa');
const baseUrl = process.env.QA_BASE_URL ?? 'http://localhost:3006';
const routes = [
  { name: 'home', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'products-page-2', path: '/products?page=2' },
  { name: 'products-page-3', path: '/products?page=3' },
  { name: 'brands', path: '/brands' },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'checkout-failed', path: '/checkout/failed' },
  { name: 'admin', path: '/admin/dashboard' },
];

async function browserPath() {
  for (const candidate of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]) {
    try { await access(candidate); return candidate; } catch {}
  }
  return undefined;
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: await browserPath() });
const errors = [];

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const label = `${route.name}-${viewport.name}`;
    page.on('console', (message) => {
      const expectedGuestResponse = ['admin', 'checkout'].includes(route.name) && message.text().includes('401');
      if (message.type() === 'error' && !expectedGuestResponse) errors.push(`${label}: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
    const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    const productCards = page.locator('.editorial-product-card, .catalog-product-card');
    for (let index = 0; index < await productCards.count(); index += 1) {
      await productCards.nth(index).scrollIntoViewIfNeeded();
      const cardImages = productCards.nth(index).locator('img');
      for (let imageIndex = 0; imageIndex < await cardImages.count(); imageIndex += 1) {
        await cardImages.nth(imageIndex).evaluate((element) => {
          const image = element;
          if (image.complete && image.naturalWidth) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        });
      }
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const brokenImages = await page.evaluate(() => [...document.images].filter((image) => !image.complete || !image.naturalWidth).map((image) => image.currentSrc || image.src));
    await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true });
    console.log(`${label}: status=${response?.status()} overflow=${overflow} brokenImages=${brokenImages.length} title="${await page.title()}"`);
    if (overflow) errors.push(`${label}: horizontal overflow detected`);
    if (brokenImages.length) errors.push(`${label}: broken images: ${brokenImages.join(', ')}`);
    await page.close();
  }
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('console-errors=0');
}
