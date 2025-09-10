## LinkedIn Contact Info CLI (Zero-cost)

Extract visible contact info (emails, phones, links) from provided LinkedIn profile URLs using Playwright.

### Requirements
- Node.js 18+
- A LinkedIn account (you log in manually once in the opened browser), or cookies via `.env`.

### Install
```bash
cd /workspace/linkedin-contact-cli
npm install
```

Playwright Chromium is already installed by the setup; if not:
```bash
npx playwright install --with-deps chromium
```

### Auth options
Copy `.env.example` to `.env` and set one of:
- `LI_AT` cookie value, or
- `LI_COOKIES_JSON` with an array of cookies.

If not set, the script opens a browser window so you can sign in manually.

### Usage
Run with a list of profile URLs (must contain `linkedin.com/in/`).

From file:
```bash
node src/index.js --input profiles.txt --output output.csv --headful
```

Inline URLs:
```bash
node src/index.js -u https://www.linkedin.com/in/someone -u https://www.linkedin.com/in/another --output out.json
```

Options:
- `--input, -i`: text file with one URL per line
- `--url, -u`: provide one or more URLs inline
- `--output, -o`: output file path (.json or .csv)
- `--headful`: show browser window (default true)
- `--timeout`: per-profile navigation timeout (ms)

### Input example
See `profiles.txt` created in this project; add your own.

### Notes
- Be gentle: add delays, avoid bulk scraping, and follow LinkedIn TOS and local laws.
- This extracts only what is visible to your account (no bypassing privacy).

