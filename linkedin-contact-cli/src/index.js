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
  const normalizeArabicDigits = (input) => {
    if (!input) return input;
    const arabicIndicZero = '٠'.charCodeAt(0);
    const easternArabicIndicZero = '۰'.charCodeAt(0);
    let out = '';
    for (const ch of input) {
      const code = ch.charCodeAt(0);
      // Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
      if (code >= 0x0660 && code <= 0x0669) {
        out += String(code - 0x0660);
        continue;
      }
      // Eastern Arabic-Indic digits ۰۱۲۳۴۵۶۷۸۹
      if (code >= 0x06F0 && code <= 0x06F9) {
        out += String(code - 0x06F0);
        continue;
      }
      out += ch;
    }
    return out;
  };

  const normalized = normalizeArabicDigits(text);
  const phoneRegex = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
  const raw = normalized.match(phoneRegex) || [];
  const cleaned = raw.map((p) => p.trim());
  const unique = Array.from(new Set(cleaned));
  return unique.sort((a, b) => a.localeCompare(b, 'en'));
}

function toAbsoluteUrl(url) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `https://www.linkedin.com${url}`;
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
    .option('locale', { type: 'string', choices: ['en', 'ar', 'both'], default: 'both', describe: 'CSV header language: en, ar, or both' })
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
  urls = Array.from(new Set(urls)).filter((u) => /linkedin\.com\/in\//.test(u));
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
    // Normalize row lists for consistent ordering
    res.emails = Array.from(new Set((res.emails || []).map((e) => String(e).trim()))).sort((a, b) => a.localeCompare(b, 'en'));
    res.phones = Array.from(new Set((res.phones || []).map((p) => String(p).trim()))).sort((a, b) => a.localeCompare(b, 'en'));
    res.links = Array.from(new Set((res.links || []).map((l) => String(l).trim()))).sort((a, b) => a.localeCompare(b, 'en'));
    results.push(res);
    await sleep(1000 + Math.floor(Math.random() * 1500));
  }

  await browser.close();

  const outPath = path.isAbsolute(argv.output) ? argv.output : path.join(process.cwd(), argv.output);
  if (outPath.toLowerCase().endsWith('.csv')) {
    const labelFor = (en, ar) => {
      if (argv.locale === 'en') return en;
      if (argv.locale === 'ar') return ar;
      return `${en} / ${ar}`;
    };
    const csvFields = [
      { label: labelFor('URL', 'الرابط'), value: 'url' },
      { label: labelFor('Name', 'الاسم'), value: 'name' },
      { label: labelFor('Headline', 'المسمى الوظيفي'), value: 'headline' },
      { label: labelFor('Emails', 'البريد الإلكتروني'), value: 'emails' },
      { label: labelFor('Phones', 'الهاتف'), value: 'phones' },
      { label: labelFor('Links', 'الروابط'), value: 'links' },
      { label: labelFor('Error', 'خطأ'), value: 'error' },
    ];
    const csvParser = new CsvParser({
      fields: csvFields,
      transforms: [
        (obj) => ({
          ...obj,
          emails: (obj.emails || []).join('; '),
          phones: (obj.phones || []).join('; '),
          links: (obj.links || []).join('; '),
        }),
      ],
      withBOM: false, // we add BOM manually for consistent behavior
    });
    const csv = csvParser.parse(results);
    const csvWithBom = `\uFEFF${csv}`; // UTF-8 BOM for Excel Arabic support
    await fs.writeFile(outPath, csvWithBom, 'utf8');
  } else {
    await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
  }

  console.log(`Saved ${results.length} records to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

