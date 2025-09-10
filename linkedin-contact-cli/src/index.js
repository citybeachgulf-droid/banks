#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser as CsvParser } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readLines(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function extractEmails(text) {
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  return Array.from(new Set(text.match(emailRegex) || []));
}

function extractPhones(text) {
  const phoneRegex = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
  return Array.from(new Set((text.match(phoneRegex) || []).map((p) => p.trim())));
}

function toAbsoluteUrl(url) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `https://www.linkedin.com${url}`;
}

function isProfileUrl(url) {
  return /linkedin\.com\/in\//.test(url);
}

function isPeopleCollectionUrl(url) {
  return /linkedin\.com\/(company|school)\/[^/]+\/people\/?/.test(url) || /linkedin\.com\/search\/results\/people/.test(url);
}

async function autoScrollPage(page, maxIterations = 20, delayMs = 800) {
  for (let i = 0; i < maxIterations; i++) {
    await page.evaluate(() => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      scrollingElement.scrollTo(0, scrollingElement.scrollHeight);
    });
    await page.waitForTimeout(delayMs);
  }
}

async function expandPeopleCollectionToProfiles(page, url, maxProfiles = 20) {
  const collected = new Set();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Try initial harvest + progressive scroll
    for (let i = 0; i < 15; i++) {
      const hrefs = await page.$$eval('a[href*="/in/"]', (anchors) => anchors.map((a) => a.href));
      for (const href of hrefs) {
        if (!href) continue;
        const clean = href.split('#')[0].split('?')[0];
        if (isProfileUrl(clean)) collected.add(clean);
        if (collected.size >= maxProfiles) break;
      }
      if (collected.size >= maxProfiles) break;
      await page.evaluate(() => {
        const scrollingElement = document.scrollingElement || document.documentElement;
        scrollingElement.scrollTo(0, scrollingElement.scrollHeight);
      });
      await page.waitForTimeout(1000 + Math.floor(Math.random() * 400));
    }
  } catch (_) {
    // Swallow and return what we have
  }
  return Array.from(collected);
}

async function applyEnvCookies(context) {
  const cookies = [];
  if (process.env.LI_COOKIES_JSON) {
    try {
      const parsed = JSON.parse(process.env.LI_COOKIES_JSON);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          cookies.push({
            name: c.name,
            value: c.value,
            domain: c.domain || '.linkedin.com',
            path: c.path || '/',
            httpOnly: Boolean(c.httpOnly),
            secure: Boolean(c.secure ?? true),
            sameSite: c.sameSite || 'Lax'
          });
        }
      }
    } catch (_) {}
  }
  if (process.env.LI_AT && !cookies.find((c) => c.name === 'li_at')) {
    cookies.push({ name: 'li_at', value: process.env.LI_AT, domain: '.linkedin.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' });
  }
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }
}

async function ensureLoggedIn(page) {
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  // If redirected to login, allow user to login once, or use cookies from env
  const needsLogin = await page.locator('input[name="session_key"], #username').first().isVisible().catch(() => false);
  if (needsLogin) {
    console.log('Please log in to LinkedIn in the opened browser window. You have 90 seconds...');
    await sleep(90000);
  }
}

async function scrapeProfile(page, url) {
  const result = { url, name: '', headline: '', emails: [], phones: [], links: [] };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Name and headline
    result.name = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';
    result.headline = (await page.locator('[data-test-id="hero-summary__headline"], .pv-text-details__left-panel div.text-body-medium').first().textContent().catch(() => ''))?.trim() || '';

    // Try to open Contact info modal
    const contactButton = page.locator('a[href*="contact-info"], a[aria-label*="Contact info" i], a[data-control-name*="contact_see_more" i]').first();
    if (await contactButton.isVisible().catch(() => false)) {
      await contactButton.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Gather visible text from page and modal
    const fullText = (await page.content()) || '';
    result.emails = extractEmails(fullText);
    result.phones = extractPhones(fullText);

    // Collect links from the Contact section
    const linkLocators = page.locator('a[href]');
    const linkCount = await linkLocators.count();
    const links = [];
    for (let i = 0; i < linkCount; i++) {
      const href = await linkLocators.nth(i).getAttribute('href');
      if (!href) continue;
      const clean = toAbsoluteUrl(href);
      if (
        /mailto:|tel:/.test(clean) ||
        /linkedin\.com\/in\//.test(clean) ||
        /twitter\.com|github\.com|facebook\.com|instagram\.com|youtube\.com|medium\.com|personal|portfolio|site|blog/i.test(clean)
      ) {
        links.push(clean);
      }
    }
    result.links = Array.from(new Set(links));
  } catch (err) {
    result.error = String(err.message || err);
  }
  return result;
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('input', { alias: 'i', type: 'string', describe: 'Path to file with LinkedIn profile URLs (one per line)' })
    .option('url', { alias: 'u', type: 'array', describe: 'One or more LinkedIn profile URLs' })
    .option('output', { alias: 'o', type: 'string', default: 'output.json', describe: 'Output file (json or csv)' })
    .option('headful', { type: 'boolean', default: true, describe: 'Show browser window (recommended for login)' })
    .option('timeout', { type: 'number', default: 30000, describe: 'Navigation timeout per profile in ms' })
    .demandOption(['output'])
    .help()
    .parse();

  let urls = [];
  if (argv.input) {
    const inputPath = path.isAbsolute(argv.input) ? argv.input : path.join(process.cwd(), argv.input);
    urls = await readLines(inputPath);
  }
  if (argv.url) {
    urls.push(...argv.url.map(String));
  }
  urls = Array.from(new Set(urls.map(String)));
  const directProfileUrls = urls.filter((u) => isProfileUrl(u));
  const collectionUrls = urls.filter((u) => isPeopleCollectionUrl(u));

  const browserPre = await chromium.launch({ headless: !argv.headful });
  const contextPre = await browserPre.newContext({ viewport: { width: 1280, height: 900 } });
  await applyEnvCookies(contextPre);
  const pagePre = await contextPre.newPage();
  await ensureLoggedIn(pagePre);

  let expandedFromCollections = [];
  for (const colUrl of collectionUrls) {
    const expanded = await expandPeopleCollectionToProfiles(pagePre, colUrl, 30);
    expandedFromCollections.push(...expanded);
  }

  await browserPre.close();

  urls = Array.from(new Set([...directProfileUrls, ...expandedFromCollections])).filter((u) => isProfileUrl(u));
  if (urls.length === 0) {
    console.error('No valid LinkedIn profile URLs provided. Use --input or --url.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: !argv.headful });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await applyEnvCookies(context);
  const page = await context.newPage();
  await ensureLoggedIn(page);

  const results = [];
  for (const url of urls) {
    page.setDefaultNavigationTimeout(argv.timeout);
    const res = await scrapeProfile(page, url);
    results.push(res);
    await sleep(1000 + Math.floor(Math.random() * 1500));
  }

  await browser.close();

  const outPath = path.isAbsolute(argv.output) ? argv.output : path.join(process.cwd(), argv.output);
  if (outPath.toLowerCase().endsWith('.csv')) {
    const csvFields = ['url', 'name', 'headline', 'emails', 'phones', 'links', 'error'];
    const csvParser = new CsvParser({ fields: csvFields, transforms: [(obj) => ({
      ...obj,
      emails: (obj.emails || []).join('; '),
      phones: (obj.phones || []).join('; '),
      links: (obj.links || []).join('; '),
    })] });
    const csv = csvParser.parse(results);
    await fs.writeFile(outPath, csv, 'utf8');
  } else {
    await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
  }

  console.log(`Saved ${results.length} records to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

